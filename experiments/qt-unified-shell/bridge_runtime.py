"""Safe, dependency-free host wiring for NEXO's experimental live bridge.

No implicit plugin installation or overwrite; native editors keep ownership of
their documents. The bridge output is a disposable GLB preview, not an IGZ file.
"""
from __future__ import annotations

import hashlib
import os
import sys
import tempfile
from pathlib import Path


def bundled_path(*parts: str) -> Path:
    """Supports source checkout and PyInstaller's extracted resource directory."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base.joinpath(*parts)


def preview_model_path(base: Path | None = None) -> Path:
    root = Path(base) if base else Path(tempfile.gettempdir()) / "NEXO" / "bridge"
    root.mkdir(parents=True, exist_ok=True)
    return Path(tempfile.mkdtemp(prefix="session-", dir=root)) / "model.glb"


def plugin_destination(appdata: Path | None = None) -> Path:
    if appdata is None:
        raw = os.environ.get("APPDATA")
        if not raw:
            raise RuntimeError("No se encontró APPDATA para la extensión de Windows.")
        appdata = Path(raw)
    return Path(appdata) / "ingetrazo" / "plugins" / "nexo_live_bridge.py"


def _digest(path: Path) -> bytes:
    with path.open("rb") as file:
        return hashlib.sha256(file.read()).digest()


def plugin_status(source: Path, destination: Path) -> str:
    """missing, installed, conflict; never replace an unexpected user plugin."""
    if not source.is_file():
        raise FileNotFoundError(f"No se encontró la extensión NEXO: {source}")
    if not destination.exists():
        return "missing"
    if not destination.is_file():
        return "conflict"
    return "installed" if _digest(source) == _digest(destination) else "conflict"


def install_plugin(source: Path, destination: Path) -> str:
    """Explicit, idempotent install; refuse to overwrite customized extensions."""
    status = plugin_status(source, destination)
    if status == "installed":
        return status
    if status == "conflict":
        raise FileExistsError(
            "Existe otra extensión NEXO en el perfil. No se sobrescribió."
        )
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive create avoids clobbering a plugin created between our checks.
    with destination.open("xb") as output, source.open("rb") as original:
        for part in iter(lambda: original.read(65536), b""):
            output.write(part)
    return "installed"


def model_environment(
    plan: Path | None, model: Path, environ: dict[str, str] | None = None
) -> dict[str, str]:
    result = dict(os.environ if environ is None else environ)
    result["NEXO_BRIDGE_GLB"] = str(model.resolve())
    result.pop("NEXO_BRIDGE_DXF", None)
    if plan and plan.suffix.lower() == ".dxf":
        result["NEXO_BRIDGE_DXF"] = str(plan.resolve())
    return result
