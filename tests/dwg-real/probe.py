"""Attempt DWG -> DXF -> DWG -> DXF through actual IngeCAD LibreDWG bridge.

Fixture is supplied by IngeCAD upstream and not redistributed with NEXO.
Print truthful geometry-count comparisons even if the round-trip is lossy.
"""
from collections import Counter
from pathlib import Path
import sys
import tempfile
file = Path(sys.argv[1]).resolve()
repo = Path("upstream-ingecad").resolve()
sys.path.insert(0,str(repo))
from core.document import Document
from formats import dwg_bridge

assert file.exists(), f"Missing upstream DWG: {file}"
assert dwg_bridge.find_dwg2dxf() is not None, "dwg2dxf not available"
assert dwg_bridge.find_dxf2dwg() is not None, "dxf2dwg not available"

with tempfile.TemporaryDirectory(prefix="nexo-dwg-") as base:
    folder = Path(base)
    first = dwg_bridge.dwg_to_dxf(file)
    before = Document.load(first).doc
    originals = Counter(e.dxftype() for e in before.modelspace())
    assert sum(originals.values()) > 0, "DWG import yielded empty modelspace"
    copy = folder / "regenerated.dwg"
    dwg_bridge.dxf_to_dwg(first,copy)
    assert copy.is_file() and copy.stat().st_size>100, "DWG export empty"
    next_dxf = dwg_bridge.dwg_to_dxf(copy)
    after = Document.load(next_dxf).doc
    reproduced = Counter(e.dxftype() for e in after.modelspace())
    print("Input:",file.name,file.stat().st_size,"bytes")
    print("Roundtrip:",copy.name,copy.stat().st_size,"bytes")
    print("Before:",dict(sorted(originals.items())))
    print("After:",dict(sorted(reproduced.items())))
    print("Preservation ratio:",round(sum(reproduced.values())/sum(originals.values()),4))
    assert sum(reproduced.values())>0, "Converted DWG contains no entities"
    # Differences are reported as loss, not silently claimed as perfect.
    lost={kind:n-reproduced.get(kind,0) for kind,n in originals.items() if reproduced.get(kind,0)<n}
    print("Unpreserved entities:",lost or "none by type/count")
    print("RESULT: real DWG -> DXF -> DWG -> DXF pipeline completed; visual fidelity NOT verified")
