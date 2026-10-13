"""Portable contract tests for explicit plugin installation and bridge launch."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from bridge_runtime import (
    bundled_path, install_plugin, model_environment, plugin_destination,
    plugin_status, preview_model_path,
)


class BridgeRuntimeTests(unittest.TestCase):
    def test_plugin_install_is_explicit_idempotent_and_safe(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "bundled.py"
            source.write_text("ORIGINAL", encoding="utf8")
            target = plugin_destination(root / "AppData")
            self.assertEqual(plugin_status(source, target), "missing")
            self.assertEqual(install_plugin(source, target), "installed")
            self.assertEqual(install_plugin(source, target), "installed")
            self.assertEqual(target.read_text(encoding="utf8"), "ORIGINAL")
            target.write_text("USER MODIFICATION", encoding="utf8")
            self.assertEqual(plugin_status(source, target), "conflict")
            with self.assertRaises(FileExistsError):
                install_plugin(source, target)
            self.assertEqual(target.read_text(encoding="utf8"), "USER MODIFICATION")

    def test_only_dxf_activates_live_cad_link(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            mesh = root / "render.glb"
            initial = {"NEXO_BRIDGE_DXF": "stale", "OTHER": "ok"}
            env = model_environment(root / "home.DXF", mesh, initial)
            self.assertEqual(env["NEXO_BRIDGE_DXF"], str((root / "home.DXF").resolve()))
            self.assertEqual(env["NEXO_BRIDGE_GLB"], str(mesh.resolve()))
            self.assertEqual(env["OTHER"], "ok")
            self.assertNotIn("NEXO_BRIDGE_DXF",
                             model_environment(root / "plan.dwg", mesh, initial))
            self.assertNotIn("NEXO_BRIDGE_DXF",
                             model_environment(None, mesh, initial))
            self.assertNotIn("NEXO_BRIDGE_GLB", initial)

    def test_session_paths_are_isolated(self):
        with TemporaryDirectory() as folder:
            first = preview_model_path(Path(folder))
            second = preview_model_path(Path(folder))
            self.assertNotEqual(first, second)
            self.assertTrue(first.parent.is_dir())
            self.assertEqual(first.name, "model.glb")
            self.assertEqual(bundled_path("plugins").name, "plugins")


if __name__ == "__main__":
    unittest.main()
