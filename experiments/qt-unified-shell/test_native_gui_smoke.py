"""Exercise native shell construction without launching third-party EXEs."""
from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import Mock


@unittest.skipUnless(sys.platform == "win32", "The native host uses Win32 HWNDs")
class NativeShellSmokeTests(unittest.TestCase):
    def test_three_workspaces_and_preserved_editors(self):
        os.environ["QT_QPA_PLATFORM"] = "offscreen"
        from PySide6.QtWidgets import QApplication
        from nexo_shell import NexoShell

        app = QApplication.instance() or QApplication([])
        window = NexoShell()
        try:
            window.show()
            app.processEvents()
            self.assertEqual(window.stack.count(), 3)
            self.assertIn("cad", window.panes)
            self.assertIn("model", window.panes)
            self.assertTrue(all(p.process is None for p in window.panes.values()))

            cad_visibility = Mock()
            model_visibility = Mock()
            window.panes["cad"].host.set_native_visible = cad_visibility
            window.panes["model"].host.set_native_visible = model_visibility

            window._switch("model")
            self.assertIs(window.stack.currentWidget(), window.panes["model"])
            cad_visibility.assert_any_call(False)
            model_visibility.assert_any_call(True)

            window._switch("render")
            self.assertIs(window.stack.currentWidget(), window.render_pane)
            model_visibility.assert_any_call(False)

            window._switch("cad")
            self.assertIs(window.stack.currentWidget(), window.panes["cad"])
            cad_visibility.assert_any_call(True)
        finally:
            window.close()
            app.processEvents()

    def test_editor_paths_autodetect_and_running_guard(self):
        os.environ["QT_QPA_PLATFORM"] = "offscreen"
        from pathlib import Path
        from tempfile import TemporaryDirectory
        from unittest.mock import Mock, patch

        from PySide6.QtWidgets import QApplication
        from nexo_shell import NexoShell

        app = QApplication.instance() or QApplication([])
        with TemporaryDirectory() as raw:
            root = Path(raw)
            cad = root / "ingecad.exe"
            model = root / "ingetrazo.exe"
            cad.touch()
            model.touch()

            class FakeSettings:
                def __init__(self, *_):
                    self.values = {}

                def value(self, key, default=""):
                    return self.values.get(key, default)

                def setValue(self, key, value):
                    self.values[key] = value

            def candidates(workspace):
                return [cad if workspace == "cad" else model]

            with patch("nexo_shell.QSettings", FakeSettings):
                with patch.object(NexoShell, "_editor_candidates", side_effect=candidates):
                    window = NexoShell()
            try:
                self.assertEqual(window.settings.value("cad/exe"), str(cad.resolve()))
                self.assertEqual(window.settings.value("model/exe"), str(model.resolve()))
                with patch(
                    "nexo_shell.subprocess.run",
                    return_value=Mock(stdout='"ingecad.exe","1234","Console","1","12 K"'),
                ):
                    self.assertTrue(window._editor_process_running(cad))
            finally:
                window.close()
                app.processEvents()


if __name__ == "__main__":
    unittest.main()
