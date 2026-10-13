"""Verify the Blender result without requiring Pillow."""
from pathlib import Path
import struct
import sys
image = Path(sys.argv[1]).read_bytes()
assert image[:8] == b"\x89PNG\r\n\x1a\n", "Not a PNG image"
width, height = struct.unpack_from(">II", image, 16)
assert (width, height) == (512,320), (width,height)
assert len(image) > 1024, "Image too small"
print(f"PASS: offline Cycles rendering {width}x{height}; {len(image)} bytes")
