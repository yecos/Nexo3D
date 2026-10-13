"""Exercise native shell construction without launching third-party EXEs."""
from __future__ import annotations

import os
import sys
import unittest


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
            window._switch("model")
            self.assertIs(window.stack.currentWidget(), window.panes["model"])
            window._switch("render")
            self.assertIs(window.stack.currentWidget(), window.render_pane)
        finally:
            window.close()
            app.processEvents()


if __name__ == "__main__":
    unittest.main()
