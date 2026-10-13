"""Experimental Windows native-window host for the existing IngeCAD/IngeTrazo EXEs.

This is a proof-of-concept, not a shared geometry kernel. Each editor runs in
an isolated process; NEXO does not inject code or modify its native files.
"""
from __future__ import annotations

import ctypes
import os
import subprocess
import sys
import time
from ctypes import wintypes
from pathlib import Path

from workspace_contract import launch_for, selected_plan
from bridge_state import BridgeState, start_server
from bridge_runtime import (
    bundled_path, install_plugin, model_environment,
    plugin_destination, plugin_status, preview_model_path,
)

if sys.platform != "win32":
    raise SystemExit("Esta prueba de ventanas nativas solo funciona en Windows.")

from PySide6.QtCore import QSettings, Qt, QTimer, QUrl
from PySide6.QtGui import QDesktopServices
from PySide6.QtWidgets import (
    QApplication, QFileDialog, QLabel, QMainWindow, QMessageBox,
    QPushButton, QStackedWidget, QToolBar, QVBoxLayout, QWidget,
)

user32 = ctypes.WinDLL("user32", use_last_error=True)
HWND = wintypes.HWND
GWL_STYLE, WS_CHILD, WS_POPUP, WS_VISIBLE = -16, 0x40000000, 0x80000000, 0x10000000
SWP_FRAMECHANGED, SWP_SHOWWINDOW = 0x0020, 0x0040
for name, argtypes, restype in (
    ("GetWindowThreadProcessId", [HWND, ctypes.POINTER(wintypes.DWORD)], wintypes.DWORD),
    ("IsWindowVisible", [HWND], wintypes.BOOL),
    ("IsWindow", [HWND], wintypes.BOOL),
    ("GetWindow", [HWND, wintypes.UINT], HWND),
    ("GetWindowTextLengthW", [HWND], ctypes.c_int),
    ("GetWindowTextW", [HWND, wintypes.LPWSTR, ctypes.c_int], ctypes.c_int),
    ("GetWindowLongPtrW", [HWND, ctypes.c_int], ctypes.c_ssize_t),
    ("SetWindowLongPtrW", [HWND, ctypes.c_int, ctypes.c_ssize_t], ctypes.c_ssize_t),
    ("SetParent", [HWND, HWND], HWND),
    ("MoveWindow", [HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.BOOL], wintypes.BOOL),
    ("SetWindowPos", [HWND, HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.UINT], wintypes.BOOL),
):
    fn = getattr(user32, name)
    fn.argtypes, fn.restype = argtypes, restype


def find_editor_hwnd(pid: int, title_hint: str) -> int | None:
    found: list[int] = []
    callback = ctypes.WINFUNCTYPE(wintypes.BOOL, HWND, wintypes.LPARAM)

    @callback
    def visit(hwnd, _):
        owner = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(owner))
        if owner.value != pid or not user32.IsWindowVisible(hwnd) or user32.GetWindow(hwnd, 4):
            return True
        n = user32.GetWindowTextLengthW(hwnd)
        if n:
            title = ctypes.create_unicode_buffer(n + 1)
            user32.GetWindowTextW(hwnd, title, n + 1)
            if title_hint.casefold() in title.value.casefold():
                found.append(int(hwnd))
                return False
        return True

    user32.EnumWindows.argtypes = [callback, wintypes.LPARAM]
    user32.EnumWindows.restype = wintypes.BOOL
    user32.EnumWindows(visit, 0)
    return found[0] if found else None


class NativeHost(QWidget):
    """Windows-only embedding; Qt OpenGL contexts may reject reparenting."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_NativeWindow, True)
        self.hwnd: int | None = None
        self.style: int | None = None

    def attach(self, hwnd: int):
        if self.hwnd is not None:
            raise RuntimeError("Ya hay una ventana en este espacio.")
        previous = int(user32.GetWindowLongPtrW(hwnd, GWL_STYLE))
        user32.SetWindowLongPtrW(hwnd, GWL_STYLE,
                                (previous | WS_CHILD | WS_VISIBLE) & ~WS_POPUP)
        ctypes.set_last_error(0)
        user32.SetParent(hwnd, HWND(int(self.winId())))
        error = ctypes.get_last_error()
        if error:
            user32.SetWindowLongPtrW(hwnd, GWL_STYLE, previous)
            raise OSError(error, ctypes.FormatError(error))
        self.hwnd, self.style = hwnd, previous
        self._fit()

    def _fit(self):
        if self.hwnd and user32.IsWindow(self.hwnd):
            user32.SetWindowPos(self.hwnd, None, 0, 0, max(1, self.width()),
                                max(1, self.height()), SWP_FRAMECHANGED | SWP_SHOWWINDOW)

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self._fit()

    def showEvent(self, event):
        super().showEvent(event)
        self._fit()

    def detach(self):
        hwnd, self.hwnd = self.hwnd, None
        if not hwnd or not user32.IsWindow(hwnd):
            return
        user32.SetParent(hwnd, None)
        if self.style is not None:
            user32.SetWindowLongPtrW(hwnd, GWL_STYLE, self.style)
        user32.SetWindowPos(hwnd, None, 80, 80, 1250, 800,
                            SWP_FRAMECHANGED | SWP_SHOWWINDOW)


class EditorPane(QWidget):
    def __init__(self, instructions: str):
        super().__init__()
        layout = QVBoxLayout(self)
        self.info = QLabel(instructions)
        self.info.setWordWrap(True)
        layout.addWidget(self.info)
        self.host = NativeHost(self)
        layout.addWidget(self.host, 1)
        self.process: subprocess.Popen | None = None
        self.started = 0.0
        self.timed_out = False


class NexoShell(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("NEXO 3D | CAD + Modelado (prototipo)")
        self.resize(1450, 900)
        self.settings = QSettings("NEXO", "NativeIntegrationPoC")
        self.plan: Path | None = None
        # A preview GLB is never the user's saved IGZ; each run gets its own path.
        self.bridge_model = preview_model_path()
        self.bridge = BridgeState(model=self.bridge_model)
        self.bridge_server = None
        self.bridge_url = None
        site = bundled_path("render_web")
        if (site / "index.html").is_file():
            self.bridge_server, self.bridge_url = start_server(self.bridge, site)
        self.panes = {
            "cad": EditorPane("Selecciona IngeCAD.exe para trabajar con todas sus herramientas CAD."),
            "model": EditorPane("Selecciona IngeTrazo.exe para usar Push/Pull, Offset y caras."),
        }
        self.stack = QStackedWidget()
        for pane in self.panes.values():
            self.stack.addWidget(pane)
        self.render_pane = self._make_render_pane()
        self.stack.addWidget(self.render_pane)
        self.setCentralWidget(self.stack)
        self._toolbar()
        self.statusBar().showMessage(
            "NEXO Bridge experimental: DXF guardado → referencia 3D → GLB/Render. "
            "No hay sincronización bidireccional.")
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._poll)
        self.timer.start(500)

    def _toolbar(self):
        tb = QToolBar("Espacios")
        tb.setMovable(False)
        self.addToolBar(tb)
        tb.addAction("CAD 2D", lambda: self._switch("cad"))
        tb.addAction("Modelado 3D", lambda: self._switch("model"))
        tb.addAction("Render Live", lambda: self._switch("render"))
        tb.addSeparator()
        tb.addAction("Abrir DWG / DXF", self._choose_plan)
        tb.addAction("Enviar plano a Modelado", self._send_to_model)
        tb.addAction("Instalar extensión NEXO", self._install_live_extension)
        tb.addSeparator()
        tb.addAction("IngeCAD.exe", lambda: self._choose_exe("cad"))
        tb.addAction("IngeTrazo.exe", lambda: self._choose_exe("model"))

    def _make_render_pane(self):
        pane = QWidget()
        layout = QVBoxLayout(pane)
        if not self.bridge_url:
            help_text = "Visor Render sin compilar. Construye los recursos web del prototipo."
        else:
            help_text = "Render se actualiza después de guardar el CAD o editar el modelo."
            if os.environ.get("QT_QPA_PLATFORM") != "offscreen":
                try:
                    from PySide6.QtWebEngineWidgets import QWebEngineView
                    view = QWebEngineView(pane)
                    view.setUrl(QUrl(self.bridge_url))
                    layout.addWidget(view, 1)
                except ImportError:
                    help_text = "Falta QtWebEngine: usa temporalmente el visor externo."
        label = QLabel(help_text)
        label.setWordWrap(True)
        layout.addWidget(label)
        if self.bridge_url:
            button = QPushButton("Abrir visor en navegador (alternativa)")
            button.clicked.connect(lambda: QDesktopServices.openUrl(QUrl(self.bridge_url)))
            layout.addWidget(button)
        return pane

    def _install_live_extension(self):
        source = bundled_path("plugins", "nexo_live_bridge.py")
        try:
            destination = plugin_destination()
            install_plugin(source, destination)
        except (FileExistsError, FileNotFoundError, OSError, RuntimeError) as exc:
            QMessageBox.warning(self, "Extensión NEXO", str(exc))
            return
        QMessageBox.information(self, "Extensión NEXO instalada",
            "Instalada en el perfil de IngeTrazo sin modificar su código base. "
            "Para activarla, inicia IngeTrazo desde NEXO. "
            "Si IngeTrazo ya está abierto, guarda tu IGZ y reinícialo manualmente.")

    def _choose_exe(self, workspace: str):
        key = f"{workspace}/exe"
        filename, _ = QFileDialog.getOpenFileName(
            self, "Seleccionar editor original",
            str(self.settings.value(key, "")), "Ejecutables de Windows (*.exe)")
        if filename:
            self.settings.setValue(key, filename)
            self.statusBar().showMessage(f"Ruta guardada: {filename}", 6000)

    def _choose_plan(self):
        filename, _ = QFileDialog.getOpenFileName(
            self, "Seleccionar plano", "", "Planos AutoCAD (*.dwg *.dxf)")
        if not filename:
            return
        try:
            picked = selected_plan(filename)
        except ValueError as exc:
            QMessageBox.warning(self, "Plano inválido", str(exc))
            return
        if (self.panes["model"].process is not None and picked != self.plan):
            QMessageBox.warning(self, "Modelado activo",
                "Guarda el IGZ y cierra IngeTrazo antes de cambiar de plano. "
                "La extensión enlaza el DXF al iniciar y no cambia de archivo en caliente.")
            return
        self.plan = picked
        self.bridge.configure(
            plan=self.plan if self.plan and self.plan.suffix.lower() == ".dxf" else None,
            model=self.bridge_model)
        message = (f"Plano DXF enlazable: {self.plan}" if self.plan.suffix.lower() == ".dxf"
                   else "DWG abierto para CAD: guarda una copia DXF antes del enlace en vivo.")
        self.statusBar().showMessage(message, 8000)
        if self.panes["cad"].process is None:
            self._switch("cad")
        else:
            QMessageBox.information(self, "Abrir plano",
                "IngeCAD ya está abierto. Usa Archivo > Abrir dentro del editor. "
                "La selección de NEXO no sustituye el dibujo abierto.")

    def _switch(self, workspace: str):
        if workspace == "render":
            self.stack.setCurrentWidget(self.render_pane)
            return
        pane = self.panes[workspace]
        self.stack.setCurrentWidget(pane)
        if pane.process is None:
            self._launch(workspace)

    def _launch(self, workspace: str):
        pane = self.panes[workspace]
        exe = str(self.settings.value(f"{workspace}/exe", "")).strip()
        if not exe or not Path(exe).is_file():
            pane.info.setText("Selecciona primero el ejecutable .exe del editor correspondiente.")
            return
        args = launch_for(workspace, self.plan).arguments
        child_env = None
        if workspace == "model":
            try:
                source = bundled_path("plugins", "nexo_live_bridge.py")
                enabled = plugin_status(source, plugin_destination()) == "installed"
            except (OSError, RuntimeError):
                enabled = False
            if enabled:
                child_env = model_environment(self.plan, self.bridge_model)
                if self.plan and self.plan.suffix.lower() == ".dxf":
                    # Plugin imports a linked reference into a blank document:
                    # do not import the same DXF twice via CLI arguments.
                    args = ("--new-window",)
            else:
                self.statusBar().showMessage(
                    "Instala la extensión NEXO para sincronizar CAD y Render; "
                    "el editor seguirá funcionando normalmente.", 9000)
        try:
            pane.process = subprocess.Popen(
                [exe, *args], cwd=str(Path(exe).parent), env=child_env)
        except OSError as exc:
            pane.process = None
            pane.info.setText(f"Error iniciando editor: {exc}")
            return
        pane.started = time.monotonic()
        pane.timed_out = False
        pane.info.setText("Iniciando editor original…")

    def _send_to_model(self):
        if self.plan is None:
            QMessageBox.information(self, "Falta plano",
                "Elige un DWG/DXF. Guarda los cambios en CAD antes de modelar.")
            return
        if self.panes["model"].process is not None:
            QMessageBox.information(self, "Modelado en uso",
                "IngeTrazo ya está abierto. Con la extensión NEXO activa, "
                "un DXF guardado se actualiza automáticamente; no se reinicia "
                "ni se sobrescribe el documento IGZ.")
            self._switch("model")
            return
        self._switch("model")

    def _poll(self):
        changed = self.bridge.poll()
        if changed:
            revisions = self.bridge.snapshot()
            updated = ", ".join(f"{key}: r{revisions[key]['revision']}"
                                for key in sorted(changed))
            self.statusBar().showMessage(f"NEXO Bridge · {updated}", 3500)
        for workspace, pane in self.panes.items():
            if pane.process is None:
                continue
            if pane.process.poll() is not None:
                pane.host.hwnd = None
                pane.process = None
                pane.info.setText(f"El proceso {workspace} terminó; revisa sus registros.")
                continue
            if pane.host.hwnd:
                if not user32.IsWindow(pane.host.hwnd):
                    pane.host.hwnd = None
                else:
                    continue
            hwnd = find_editor_hwnd(
                pane.process.pid, "IngeCAD" if workspace == "cad" else "IngeTrazo")
            if hwnd:
                try:
                    pane.host.attach(hwnd)
                except (OSError, RuntimeError) as exc:
                    pane.info.setText(f"No se pudo alojar la ventana: {exc}")
                else:
                    pane.info.setText("Editor completo integrado (prueba de Windows).")
            elif time.monotonic() - pane.started > 30 and not pane.timed_out:
                pane.timed_out = True
                pane.info.setText("No se detectó la ventana en 30 s. "
                                  "Revisa si hay un diálogo de inicio o un problema de Web/Qt/OpenGL.")

    def closeEvent(self, event):
        # Never force-terminate a modeler: the user may have unsaved work.
        for pane in self.panes.values():
            pane.host.detach()
        if self.bridge_server:
            self.bridge_server.shutdown()
            self.bridge_server.server_close()
        super().closeEvent(event)


def main() -> int:
    app = QApplication(sys.argv)
    window = NexoShell()
    window.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
