"""NEXO Bridge: revisioned, localhost-only CAD → Model → Render file handshake.

This transport never writes to the CAD or IngeTrazo working documents.
The IngeTrazo plugin is responsible for non-destructive CAD references
and exporting GLB; the renderer reads coherent, validated snapshots here.
"""
from __future__ import annotations

import hashlib
import json
import mimetypes
import threading
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

MAX_DXF = 100 * 1024 * 1024
MAX_GLB = 350 * 1024 * 1024


def file_digest(path: Path, limit: int) -> str:
    """Content identity: unchanged timestamps alone are not reliable."""
    if path.stat().st_size > limit:
        raise ValueError("Archivo de intercambio demasiado grande.")
    sha = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            sha.update(chunk)
    return sha.hexdigest()


def valid_glb(path: Path) -> bool:
    """Reject a partially-written file before publishing a new model revision."""
    import struct
    with path.open("rb") as stream:
        header = stream.read(20)
        if len(header) < 20:
            return False
        magic, version, byte_length, json_length, chunk_type = struct.unpack("<5I", header)
    return (magic == 0x46546C67 and version == 2 and
            byte_length == path.stat().st_size and
            0 < json_length <= byte_length - 20 and
            json_length % 4 == 0 and chunk_type == 0x4E4F534A)


@dataclass(frozen=True)
class AssetRevision:
    path: Path
    sha256: str
    revision: int


class BridgeState:
    """Only publishes files that remained stable across two polling ticks."""

    def __init__(self, plan: Path | None = None, model: Path | None = None):
        self.plan = Path(plan).resolve() if plan else None
        self.model = Path(model).resolve() if model else None
        self.cad: AssetRevision | None = None
        self.mesh: AssetRevision | None = None
        self._candidate: dict[str, tuple[tuple[int, int], int]] = {}
        self._lock = threading.RLock()

    def configure(self, *, plan: Path | None, model: Path | None):
        with self._lock:
            self.plan = Path(plan).resolve() if plan else None
            self.model = Path(model).resolve() if model else None
            self.cad = self.mesh = None
            self._candidate.clear()

    def poll(self) -> set[str]:
        changed: set[str] = set()
        with self._lock:
            for key, path, ext, limit in (
                ("cad", self.plan, ".dxf", MAX_DXF),
                ("model", self.model, ".glb", MAX_GLB),
            ):
                if not path or path.suffix.lower() != ext:
                    continue
                try:
                    stat = path.stat()
                    if not stat.st_size or stat.st_size > limit:
                        continue
                    signature = (stat.st_size, stat.st_mtime_ns)
                    candidate, count = self._candidate.get(key, (None, 0))
                    count = (count + 1) if candidate == signature else 1
                    self._candidate[key] = (signature, count)
                    if count < 2:
                        continue
                    if key == "model" and not valid_glb(path):
                        continue
                    digest = file_digest(path, limit)
                except (OSError, ValueError):
                    continue
                current = self.cad if key == "cad" else self.mesh
                if current is not None and current.sha256 == digest:
                    continue
                item = AssetRevision(path=path, sha256=digest,
                                     revision=1 if current is None else current.revision + 1)
                if key == "cad":
                    self.cad = item
                else:
                    self.mesh = item
                changed.add(key)
        return changed

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "schema": "nexo-bridge/1",
                "cad": None if self.cad is None else {
                    "revision": self.cad.revision,
                    "sha256": self.cad.sha256,
                    "name": self.cad.path.name,
                    "ready": True,
                },
                "model": None if self.mesh is None else {
                    "revision": self.mesh.revision,
                    "sha256": self.mesh.sha256,
                    "name": self.mesh.path.name,
                    "ready": True,
                    "url": "/v1/model.glb",
                },
                "cad_to_model": "live-reference-plugin" if self.plan else "no-plan",
                "model_to_render": "automatic-glb-export" if self.model else "no-model",
            }

    def model_data(self) -> bytes | None:
        """Re-check identity so a concurrent save is not served half-written."""
        with self._lock:
            item = self.mesh
            if item is None:
                return None
            try:
                data = item.path.read_bytes()
                if hashlib.sha256(data).hexdigest() != item.sha256:
                    return None
                return data
            except OSError:
                return None


def start_server(state: BridgeState, site: Path) -> tuple[ThreadingHTTPServer, str]:
    """Read-only HTTP preview bound to loopback; cannot access arbitrary files."""
    root = site.resolve()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            path = urlsplit(self.path).path
            if path == "/v1/state":
                raw = json.dumps(state.snapshot()).encode("utf-8")
                return self._send(200, raw, "application/json; charset=utf-8", no_cache=True)
            if path == "/v1/model.glb":
                raw = state.model_data()
                if raw is None:
                    return self._send(404, b"Model not yet available", "text/plain")
                return self._send(200, raw, "model/gltf-binary", no_cache=True)
            requested = "/index.html" if path == "/" else path
            if not requested.startswith("/") or "\x00" in requested:
                return self._send(404, b"", "text/plain")
            target = (root / requested.lstrip("/")).resolve()
            if not target.is_relative_to(root) or not target.is_file():
                return self._send(404, b"", "text/plain")
            try:
                return self._send(200, target.read_bytes(),
                                  mimetypes.guess_type(target.name)[0] or
                                  "application/octet-stream")
            except OSError:
                return self._send(404, b"", "text/plain")

        def _send(self, status: int, data: bytes, mime: str, no_cache: bool = False):
            self.send_response(status)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-store" if no_cache else "public, max-age=3600")
            self.send_header("Access-Control-Allow-Origin", "null")
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *_):
            pass  # The native UI reports revisions, not private filesystem paths.

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True,
                              name="nexo-bridge-http")
    thread.start()
    return server, f"http://127.0.0.1:{server.server_port}/"
