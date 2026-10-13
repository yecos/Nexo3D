"""Network-free updater checks for safe review-only workflow."""
import unittest
from upstream_watch import compare_versions


class UpstreamWatchTests(unittest.TestCase):
    def setUp(self):
        self.pins = {
            "ingelibre/ingecad": {"name": "IngeCAD", "pinned_stable_release": "v0.6.7"},
            "ingelibre/ingetrazo": {"name": "IngeTrazo", "pinned_stable_release": "v0.5.8"},
        }

    def test_no_false_updates_when_releases_match(self):
        releases = {repo: {"tag_name": info["pinned_stable_release"]}
                    for repo, info in self.pins.items()}
        self.assertFalse(any(row["changed"] for row in compare_versions(self.pins, releases)))

    def test_new_release_proposes_review_without_installation(self):
        releases = {
            "ingelibre/ingecad": {"tag_name": "v0.6.8", "html_url": "https://example.test/0.6.8"},
            "ingelibre/ingetrazo": {"tag_name": "v0.5.8"},
        }
        changes = compare_versions(self.pins, releases)
        self.assertEqual([r["name"] for r in changes if r["changed"]], ["IngeCAD"])
        self.assertEqual(changes[0]["latest"], "v0.6.8")
        self.assertEqual(changes[0]["release_url"], "https://example.test/0.6.8")


if __name__ == "__main__":
    unittest.main()
