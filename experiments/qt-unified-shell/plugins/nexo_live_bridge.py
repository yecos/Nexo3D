# SPDX-License-Identifier: AGPL-3.0-only
"""Optional IngeTrazo plugin for NEXO: live CAD reference + live GLB rendering.

Installed in %APPDATA%/ingetrazo/plugins by explicit user action.
No patching IngeTrazo's core. Upstream's ExtensionApp setup(app) supplies the
viewport, history and scene; all scene edits stay on the Qt UI thread.

Env (set by NEXO launcher): NEXO_BRIDGE_DXF, NEXO_BRIDGE_GLB.
"""
from __future__ import annotations

import hashlib
import logging
import os
from pathlib import Path

from PySide6.QtCore import QTimer
from PySide6.QtWidgets import QApplication

log = logging.getLogger("nexo.live_bridge")
MARKER = "nexo_live_bridge"
MAX_CAD_BYTES = 40 * 1024 * 1024


def _sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(data)
    return digest.hexdigest()


def _is_reference(group) -> bool:
    return isinstance(getattr(group, "ext", None), dict) and MARKER in group.ext


class _LiveBridge:
    def __init__(self, app, source: Path | None, model: Path):
        self.app = app
        self.source = source
        self.model = model
        self._candidate = None
        self._candidate_count = 0
        self._last_import_sha = None
        self._last_import_scene_id = None
        self._last_export_scene = None
        self._cad_timer = QTimer(app.window)
        self._cad_timer.setInterval(1000)
        self._cad_timer.timeout.connect(self._check_cad)
        self._cad_timer.start()
        self._render_timer = QTimer(app.window)
        self._render_timer.setSingleShot(True)
        self._render_timer.setInterval(850)
        self._render_timer.timeout.connect(self._export_render)
        app.on_document_changed(self._schedule_render)
        self._schedule_render()

    def _schedule_render(self):
        self._render_timer.start()

    def _check_cad(self):
        path = self.source
        if path is None or not path.is_file():
            return
        if QApplication.mouseButtons():
            return  # Do not import while dragging or drawing.
        try:
            st = path.stat()
            if st.st_size <= 0 or st.st_size > MAX_CAD_BYTES:
                return
            sig = (st.st_size, st.st_mtime_ns)
            if sig == self._candidate:
                self._candidate_count += 1
            else:
                self._candidate = sig
                self._candidate_count = 1
            if self._candidate_count < 2:
                return
            digest = _sha(path)
            if (digest == self._last_import_sha and
                    id(self.app.scene) == self._last_import_scene_id):
                return

            # Parse into a separate scene BEFORE touching the real document.
            # IngeTrazo already handles units, blocks, arcs, layers and recentering.
            from core.scene import Scene
            from formats.dxf_in import load_dxf, open_document, suggest_unit_scale
            from core.history import Command

            doc = open_document(path)
            scale, _unit_code = suggest_unit_scale(doc)
            if scale is None or scale <= 0:
                # Unspecified/ambiguous DXF units require explicit handling,
                # not a guess that could scale a whole building 1000x.
                self.app.window.statusBar().showMessage(
                    "NEXO: unidades DXF ambiguas; define unidades antes de enlazar.", 6000)
                return
            scratch = Scene()
            summary = load_dxf(scratch, path, doc=doc, scale=scale)
            imported = list(scratch.groups)
            if not imported:
                return
            for group in imported:
                metadata = dict(group.ext or {})
                metadata[MARKER] = {"cad_sha256": digest, "source": path.name}
                group.ext = metadata
                group.name = "NEXO CAD · " + group.name
                # The source stays CAD; live references should not be edited.
                # Trace/copy geometry into independent 3D before Push/Pull.
                group.locked = True

            # SnapshotImport only tracks *added* groups and cannot undo a
            # reference replacement: removed old references would be lost.
            # Keep an explicit reversible command preserving all user groups.
            class ReplaceCadReference(Command):
                def __init__(self):
                    self.before_groups = None
                    self.before_layers = None

                def do(self, scene):
                    if self.before_groups is None:
                        self.before_groups = list(scene.groups)
                        self.before_layers = list(scene.layers)
                    scene.groups[:] = [
                        g for g in scene.groups if not _is_reference(g)
                    ] + imported
                    existing = {ly.name for ly in scene.layers}
                    for layer in scratch.layers:
                        if layer.name not in existing:
                            scene.layers.append(layer)
                            existing.add(layer.name)
                    scene.selection.clear()
                    scene.version += 1

                def undo(self, scene):
                    scene.groups[:] = self.before_groups
                    scene.layers[:] = self.before_layers
                    scene.selection.clear()
                    scene.version += 1

            vp = self.app.viewport
            vp.history.execute(ReplaceCadReference())
            # History.execute logs failures instead of raising. Do not mark a
            # revision imported unless the new reference actually exists.
            if not any(
                _is_reference(g) and g.ext[MARKER].get("cad_sha256") == digest
                for g in vp.scene.groups
            ):
                raise RuntimeError("IngeTrazo rejected the live CAD update")
            vp.notify_scene_changed()
            self._last_import_sha = digest
            self._last_import_scene_id = id(vp.scene)
            self.app.window.statusBar().showMessage(
                f"NEXO CAD enlazado: {summary['edges']} aristas · revisado.", 5000)
        except Exception as exc:
            log.exception("NEXO CAD import failed without touching existing model")
            self.app.window.statusBar().showMessage(
                f"NEXO: no se pudo actualizar el plano ({type(exc).__name__}).", 6000)

    def _export_render(self):
        scene = self.app.scene
        revision = (scene.version, getattr(scene, "view_version", 0), id(scene))
        if revision == self._last_export_scene and self.model.is_file():
            return
        if QApplication.mouseButtons():
            self._schedule_render()
            return
        try:
            from formats.gltf import save_glb
            self.model.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.model.with_suffix(".pending.glb")
            try:
                save_glb(scene, tmp)
                os.replace(tmp, self.model)  # Render never reads partial GLB.
            finally:
                tmp.unlink(missing_ok=True)
            self._last_export_scene = revision
        except Exception:
            log.exception("NEXO GLB export failed; previous render stays untouched")


# Hold timers/bridge for the window lifetime without a global instance that
# might outlive a reloaded plugin.
def setup(app):
    model_raw = os.environ.get("NEXO_BRIDGE_GLB", "").strip()
    source_raw = os.environ.get("NEXO_BRIDGE_DXF", "").strip()
    if not model_raw:
        return  # Normal IngeTrazo launch is unaffected.
    source = Path(source_raw).expanduser() if source_raw.lower().endswith(".dxf") else None
    bridge = _LiveBridge(app, source, Path(model_raw).expanduser())
    app.window._nexo_live_bridge = bridge
    app.add_menu_action("NEXO · Actualizar Render", bridge._export_render,
                        tip="Sincronizar modelo y materiales 3D con el espacio Render.")
