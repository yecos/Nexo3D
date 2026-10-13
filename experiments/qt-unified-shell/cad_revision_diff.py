"""Review *saved* CAD revisions per DXF layer without modifying source files.

This is a diagnostic fingerprint, NOT parametric object identity or a live
geometry engine. Geometry-bearing DXF attributes and common polyline vertices
are included. Unknown/custom DXF entities should be visually verified.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path


def _plain(value):
    """Turn ezdxf Vec3, built-in values and other DXF attribute data into JSON."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): _plain(v) for k, v in sorted(value.items(), key=lambda p: str(p[0]))}
    if isinstance(value, (list, tuple, set)):
        seq = [_plain(v) for v in value]
        return sorted(seq, key=repr) if isinstance(value, set) else seq
    if hasattr(value, "__iter__") and not isinstance(value, (bytes, bytearray)):
        try:
            return [_plain(v) for v in value]
        except (TypeError, ValueError):
            pass
    return str(value)


def _entity_record(entity):
    kind = entity.dxftype()
    dxf = getattr(entity, "dxf", None)
    attrs = dxf.all_existing_dxf_attribs() if dxf is not None else {}
    # Entity handles must NOT be the geometry identity: some CAD programs
    # regenerate handles on each save without changing the drawing.
    attrs = {k: v for k, v in attrs.items() if k not in {"handle", "owner"}}
    result = {"type": kind, "attributes": _plain(attrs)}
    if kind == "LWPOLYLINE":
        result["points"] = _plain(list(entity.get_points("xyseb")))
        result["closed"] = bool(entity.closed)
    elif kind == "POLYLINE":
        result["vertices"] = [
            _plain(vertex.dxf.all_existing_dxf_attribs())
            for vertex in entity.vertices
        ]
        # vertex handles/owners do not affect geometry
        for vertex in result["vertices"]:
            vertex.pop("handle", None)
            vertex.pop("owner", None)
    elif kind == "SPLINE":
        result["control_points"] = _plain(entity.control_points)
        result["fit_points"] = _plain(entity.fit_points)
        result["knots"] = _plain(entity.knots())
        result["weights"] = _plain(entity.weights())
    elif kind == "INSERT":
        # A block insertion can carry text attribute values.
        result["attribs"] = [
            {"tag": getattr(item.dxf, "tag", ""),
             "text": getattr(item.dxf, "text", ""),
             "insert": _plain(getattr(item.dxf, "insert", None))}
            for item in getattr(entity, "attribs", [])
        ]
    return result


def scan_document(doc):
    """Return a stable, layer-keyed snapshot from an opened ezdxf document."""
    layer_entities = defaultdict(list)
    counts = defaultdict(Counter)
    for entity in doc.modelspace():
        layer = str(entity.dxf.get("layer", "0"))
        record = _entity_record(entity)
        fingerprint = sha256(json.dumps(
            record, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")).hexdigest()
        layer_entities[layer].append(fingerprint)
        counts[layer][entity.dxftype()] += 1
    return {
        name: {
            "entities": len(digests),
            "types": dict(sorted(counts[name].items())),
            "fingerprint": sha256("|".join(sorted(digests)).encode("ascii")).hexdigest(),
        }
        for name, digests in sorted(layer_entities.items())
    }


def snapshot_dxf(path: Path, max_bytes: int = 100 * 1024 * 1024):
    """Load a closed/saved DXF. The caller should run this off the Qt UI thread."""
    path = Path(path)
    if path.suffix.lower() != ".dxf":
        raise ValueError("El informe de capas requiere DXF.")
    if not path.is_file() or not 0 < path.stat().st_size <= max_bytes:
        raise ValueError("DXF ausente, vacío o demasiado grande.")
    try:
        import ezdxf
    except ImportError as exc:
        raise RuntimeError("Falta ezdxf para analizar cambios por capas.") from exc
    return scan_document(ezdxf.readfile(str(path)))


def compare_layers(before, after):
    """Compare two layer snapshots. Missing baseline means initial loading."""
    if before is None:
        return {"initial": True, "added": sorted(after), "removed": [], "changed": []}
    old = set(before)
    new = set(after)
    return {
        "initial": False,
        "added": sorted(new - old),
        "removed": sorted(old - new),
        "changed": sorted(
            name for name in old & new
            if before[name]["fingerprint"] != after[name]["fingerprint"]
        ),
    }


def describe_changes(delta, max_names: int = 3):
    """Short status-bar text; never claim automatic reconstruction of 3D solids."""
    if delta["initial"]:
        return f"NEXO CAD: {len(delta['added'])} capas reconocidas. Referencia enlazada."
    names = {"added": "nuevas", "removed": "eliminadas", "changed": "modificadas"}
    entries = []
    for key in ("added", "removed", "changed"):
        layers = delta[key]
        if layers:
            shown = ", ".join(layers[:max_names])
            if len(layers) > max_names:
                shown += f" y {len(layers) - max_names} más"
            entries.append(f"{len(layers)} capas {names[key]} ({shown})")
    if not entries:
        return "NEXO CAD: guardado sin cambios detectables por capa."
    return "NEXO CAD: " + "; ".join(entries) + ". Revisa el modelo 3D."
