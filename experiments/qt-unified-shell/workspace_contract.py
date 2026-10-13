"""Dependency-free contract for NEXO's native Windows editor experiment.

NOTE: This does not yet implement a canonical CAD/3D document or live sync.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

SUPPORTED_PLANS = frozenset({'.dxf', '.dwg'})


@dataclass(frozen=True)
class EditorLaunch:
    name: str
    arguments: tuple[str, ...]


def selected_plan(path: str | Path | None) -> Path | None:
    if path is None or str(path).strip() == '':
        return None
    path = Path(path).expanduser().resolve()
    if not path.is_file():
        raise ValueError(f'No se encontró el plano: {path}')
    if path.suffix.lower() not in SUPPORTED_PLANS:
        raise ValueError('El plano debe ser DWG o DXF.')
    return path


def launch_for(workspace: str, plan: Path | None = None) -> EditorLaunch:
    if workspace not in {'cad', 'model'}:
        raise ValueError(f'Espacio desconocido: {workspace}')
    if workspace == 'cad':
        return EditorLaunch('IngeCAD', (str(plan),) if plan is not None else ())
    # IngeTrazo accepts DXF/DWG input; --new-window prevents handing a drawing
    # to a pre-existing independent instance via IngeTrazo's QLocalSocket.
    return EditorLaunch('IngeTrazo', ('--new-window', str(plan)) if plan else ('--new-window',))
