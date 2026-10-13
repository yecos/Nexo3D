"""Safe unit tests; runnable on Linux and Windows without GUI."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from workspace_contract import EditorLaunch, launch_for, selected_plan


class WorkspaceContractTests(unittest.TestCase):
    def test_plan_file_case_insensitive(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp, "CASA.DXF")
            path.write_text("0\nEOF\n", encoding="ascii")
            self.assertEqual(selected_plan(str(path)), path.resolve())

    def test_no_plan_is_allowed(self):
        self.assertIsNone(selected_plan(None))
        self.assertIsNone(selected_plan(""))

    def test_wrong_extension_and_missing_file_fail(self):
        with TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                selected_plan(Path(tmp, "missing.dxf"))
            path = Path(tmp, "run.exe")
            path.touch()
            with self.assertRaises(ValueError):
                selected_plan(path)

    def test_model_is_separate_instance(self):
        source = Path("plano.dxf")
        self.assertEqual(launch_for("model", source),
                         EditorLaunch("IngeTrazo", ("--new-window", str(source))))

    def test_cad_uses_original_file(self):
        source = Path("casa.dwg")
        self.assertEqual(launch_for("cad", source).arguments, (str(source),))

    def test_unknown_workspace_fails(self):
        with self.assertRaises(ValueError):
            launch_for("render")


if __name__ == "__main__":
    unittest.main()
