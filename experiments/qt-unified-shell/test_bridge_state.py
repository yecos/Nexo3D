"""Exercise real file revisions and the localhost read-only preview server."""
from __future__ import annotations

import json
import struct
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError
from urllib.request import urlopen

from bridge_state import BridgeState, start_server, valid_glb


def glb() -> bytes:
    raw = b'{"asset":{"version":"2.0"}}'
    raw += b" " * ((4 - len(raw) % 4) % 4)
    return struct.pack("<5I", 0x46546C67, 2, 20 + len(raw),
                       len(raw), 0x4E4F534A) + raw


class BridgeStateTests(unittest.TestCase):
    def test_stable_revisions_and_no_partial_glb(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            cad = root / "house.dxf"
            model = root / "house.glb"
            state = BridgeState(cad, model)
            cad.write_text("DXF A", encoding="ascii")
            model.write_bytes(b"partial")
            self.assertFalse(state.poll())
            self.assertEqual(state.poll(), {"cad"})
            self.assertIsNone(state.snapshot()["model"])
            model.write_bytes(glb())
            self.assertFalse(state.poll())
            self.assertEqual(state.poll(), {"model"})
            self.assertEqual(state.model_data(), glb())
            for _ in range(3):
                self.assertFalse(state.poll())
            cad.write_text("DXF B changed", encoding="ascii")
            self.assertFalse(state.poll())
            self.assertEqual(state.poll(), {"cad"})
            self.assertEqual(state.snapshot()["cad"]["revision"], 2)
            self.assertEqual(state.snapshot()["model"]["revision"], 1)
            state.configure(plan=None, model=model)
            self.assertIsNone(state.snapshot()["cad"])

    def test_read_only_same_origin_preview(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            site = root / "site"
            site.mkdir()
            (site / "index.html").write_text("NEXO", encoding="utf8")
            model = root / "scene.glb"
            model.write_bytes(glb())
            state = BridgeState(model=model)
            state.poll()
            self.assertEqual(state.poll(), {"model"})
            server, url = start_server(state, site)
            try:
                with urlopen(url + "v1/state", timeout=4) as res:
                    data = json.loads(res.read())
                    self.assertEqual(data["schema"], "nexo-bridge/1")
                    self.assertEqual(data["model"]["revision"], 1)
                    self.assertIsNone(res.headers.get("Access-Control-Allow-Origin"))
                with urlopen(url + "v1/model.glb", timeout=4) as res:
                    self.assertEqual(res.read(), glb())
                with urlopen(url, timeout=4) as res:
                    self.assertEqual(res.read(), b"NEXO")
                with self.assertRaises(HTTPError) as problem:
                    urlopen(url + "no-such-file", timeout=4)
                self.assertEqual(problem.exception.code, 404)
            finally:
                server.shutdown()
                server.server_close()

    def test_reject_bad_glb_header(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "bad.glb"
            path.write_bytes(b"not a GLB")
            self.assertFalse(valid_glb(path))


if __name__ == "__main__":
    unittest.main()
