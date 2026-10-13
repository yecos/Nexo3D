"""Independent stdlib checks on actual Hew CLI outputs."""
from __future__ import annotations
import json
from pathlib import Path
import struct
import sys

root = Path(sys.argv[1])
native, glb, skp = (root / name for name in ("wall.hew", "wall.glb", "wall.skp"))
for file in (native, glb, skp):
    assert file.exists() and file.stat().st_size > 100, f"Missing or empty: {file}"
raw = glb.read_bytes()
magic, version, n = struct.unpack_from("<III", raw)
assert magic == 0x46546C67 and version == 2 and n == len(raw), "Not GLB 2.0"
json_size, chunk_type = struct.unpack_from("<II", raw, 12)
assert chunk_type == 0x4E4F534A, "Missing JSON chunk"
gltf = json.loads(raw[20:20 + json_size])
assert gltf["asset"]["version"] == "2.0"
assert gltf.get("meshes"), "Hew produced no meshes"
assert gltf.get("nodes"), "Hew produced no scene nodes"
assert native.read_bytes()[:2] == b"PK", "Native .hew file is not a zip"
# An .skp header alone is not equivalent to SketchUp round-trip validation.
print("PASS: Hew native document and binary GLB + SKP outputs exist")
print("GLB meshes:", len(gltf["meshes"]), "nodes:", len(gltf["nodes"]))
print("Bytes:", {f.name: f.stat().st_size for f in (native, glb, skp)})
