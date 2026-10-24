# SPDX-License-Identifier: AGPL-3.0-only
"""Integración real IFC4, con exportación, relectura y comprobación de relaciones."""
import importlib.util
import json
import math
import tempfile
import unittest
from pathlib import Path

import ifcopenshell
import ifcopenshell.util.element

THIS = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("nexo_export", THIS / "export_ifc.py")
export = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(export)

EXAMPLE = {
    "schemaVersion":1, "name":"Edificio prueba",
    "levels":[{"id":"nivel-1","name":"Piso 1","elevation":0,"height":2.8},
              {"id":"nivel-2","name":"Piso 2","elevation":2.8,"height":2.8}],
    "walls":[{"id":"muro-a","levelId":"nivel-1","a":[0,0],"b":[5,0],
              "thickness":.15,"height":2.8,
              "openings":[{"id":"puerta-a","kind":"door","offset":1.2,
                           "width":.9,"height":2.1,"sill":0},
                          {"id":"ventana-a","kind":"window","offset":3.3,
                           "width":1.2,"height":1.2,"sill":.9}]},
             {"id":"muro-b","levelId":"nivel-2","a":[0,0],"b":[4,0],
              "thickness":.20,"height":2.8,"openings":[]}]
}


class ExportIfcTest(unittest.TestCase):
    def test_actual_ifc4_roundtrip_with_openings(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/"building.ifc"
            source=Path(directory)/"source.json"
            source.write_text(json.dumps(EXAMPLE), encoding="utf-8")
            self.assertEqual(export.main(["export_ifc.py",str(source),str(path)]),0)
            self.assertTrue(path.exists())
            self.assertGreater(path.stat().st_size,1000)
            model=ifcopenshell.open(str(path))
            self.assertEqual(model.schema,"IFC4")
            self.assertEqual(len(model.by_type("IfcProject")),1)
            self.assertEqual(len(model.by_type("IfcBuildingStorey")),2)
            self.assertEqual(len(model.by_type("IfcWall")),2)
            self.assertEqual(len(model.by_type("IfcDoor")),1)
            self.assertEqual(len(model.by_type("IfcWindow")),1)
            self.assertEqual(len(model.by_type("IfcOpeningElement")),2)
            self.assertEqual(len(model.by_type("IfcRelVoidsElement")),2)
            self.assertEqual(len(model.by_type("IfcRelFillsElement")),2)
            for wall in model.by_type("IfcWall"):
                self.assertIsNotNone(wall.Representation)
                self.assertIsNotNone(wall.ContainedInStructure)
                props=ifcopenshell.util.element.get_psets(wall)
                self.assertIn("NexoBIM_Wall",props)
                self.assertEqual(props["NexoBIM_Wall"]["NexoId"],wall.Tag)
            root=model.by_type("IfcProject")[0]
            length=[u for u in root.UnitsInContext.Units if u.UnitType=="LENGTHUNIT"]
            self.assertEqual(len(length),1)
            self.assertEqual(length[0].Name,"METRE")
            self.assertEqual(root.Name,EXAMPLE["name"])

    def test_stable_identifiers_across_exports(self):
        one=export.convert(EXAMPLE)
        two=export.convert(EXAMPLE)
        self.assertEqual(
            sorted(x.GlobalId for x in one.by_type("IfcWall")),
            sorted(x.GlobalId for x in two.by_type("IfcWall")))

    def test_invalid_geometry_is_rejected(self):
        data=json.loads(json.dumps(EXAMPLE))
        data["walls"][0]["openings"][0]["offset"]=math.inf
        with self.assertRaises(ValueError):
            export.validate(data)
        data=json.loads(json.dumps(EXAMPLE))
        data["walls"][0]["levelId"]="muro-b"
        with self.assertRaises(ValueError):
            export.validate(data)


if __name__ == "__main__":
    unittest.main()
