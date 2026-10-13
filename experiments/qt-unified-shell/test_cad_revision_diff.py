"""No ezdxf/PySide dependencies: verify CAD change report contract."""
import unittest

from cad_revision_diff import compare_layers, describe_changes, scan_document


class FakeDxf:
    def __init__(self, **attributes):
        self.attributes = dict(attributes)

    def get(self, name, default=None):
        return self.attributes.get(name, default)

    def all_existing_dxf_attribs(self):
        return dict(self.attributes)


class FakeEntity:
    def __init__(self, kind="LINE", **attributes):
        self.kind = kind
        self.dxf = FakeDxf(**attributes)

    def dxftype(self):
        return self.kind


class FakePolyline(FakeEntity):
    def __init__(self, layer="Paredes", handle="10", points=None):
        super().__init__("LWPOLYLINE", layer=layer, handle=handle)
        self.points = points or [(0, 0, 0, 0, 0), (4, 0, 0, 0, 0)]
        self.closed = True

    def get_points(self, _format):
        return self.points


class FakeDoc:
    def __init__(self, *entities):
        self.entities = entities

    def modelspace(self):
        return self.entities


class CadChangesTests(unittest.TestCase):
    def test_unchanged_drawing_with_new_handles_and_order(self):
        first = scan_document(FakeDoc(
            FakeEntity(layer="Muros", handle="1", start=(0, 0, 0), end=(2, 0, 0)),
            FakeEntity(layer="Puertas", handle="2", start=(1, 1, 0), end=(1, 2, 0)),
        ))
        second = scan_document(FakeDoc(
            FakeEntity(layer="Puertas", handle="999", start=(1, 1, 0), end=(1, 2, 0)),
            FakeEntity(layer="Muros", handle="998", start=(0, 0, 0), end=(2, 0, 0)),
        ))
        self.assertEqual(first, second)
        self.assertEqual(compare_layers(first, second)["changed"], [])

    def test_changed_wall_length_is_flagged(self):
        before = scan_document(FakeDoc(FakeEntity(layer="Muros", start=(0, 0, 0), end=(3, 0, 0))))
        after = scan_document(FakeDoc(FakeEntity(layer="Muros", start=(0, 0, 0), end=(4, 0, 0))))
        difference = compare_layers(before, after)
        self.assertEqual(difference["changed"], ["Muros"])
        self.assertIn("Revisa el modelo 3D", describe_changes(difference))

    def test_polyline_vertex_movement_is_detected(self):
        before = scan_document(FakeDoc(FakePolyline()))
        after = scan_document(FakeDoc(FakePolyline(
            points=[(0, 0, 0, 0, 0), (5, 0, 0, 0, 0)])))
        self.assertEqual(compare_layers(before, after)["changed"], ["Paredes"])

    def test_added_and_removed_layers(self):
        before = scan_document(FakeDoc(FakeEntity(layer="Ventanas")))
        after = scan_document(FakeDoc(FakeEntity(layer="Puertas")))
        delta = compare_layers(before, after)
        self.assertEqual(delta["added"], ["Puertas"])
        self.assertEqual(delta["removed"], ["Ventanas"])
        self.assertEqual(delta["changed"], [])

    def test_initial_loaded_report(self):
        snapshot = scan_document(FakeDoc(FakeEntity(layer="Paredes")))
        self.assertEqual(compare_layers(None, snapshot)["added"], ["Paredes"])
        self.assertIn("1 capas reconocidas", describe_changes(compare_layers(None, snapshot)))

    def test_status_is_capped(self):
        delta = {"initial": False, "added": ["A", "B", "C", "D"],
                 "removed": [], "changed": []}
        self.assertIn("y 2 más", describe_changes(delta, max_names=2))

    def test_same_layer_entity_count(self):
        snapshot = scan_document(FakeDoc(
            FakeEntity("LINE", layer="Muros"),
            FakeEntity("ARC", layer="Muros"),
        ))
        self.assertEqual(snapshot["Muros"]["entities"], 2)
        self.assertEqual(snapshot["Muros"]["types"], {"ARC": 1, "LINE": 1})

    def test_empty_drawing(self):
        self.assertEqual(scan_document(FakeDoc()), {})
        self.assertEqual(describe_changes(compare_layers({}, {})),
                         "NEXO CAD: guardado sin cambios detectables por capa.")


if __name__ == "__main__":
    unittest.main()
