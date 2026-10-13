"""Report newer stable upstream releases. Never apply/download executable updates."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

LOCKFILE = Path(__file__).with_name("upstreams.json")


def compare_versions(pins: dict, releases: dict) -> list[dict]:
    """Compare upstream *published releases* with pinned NEXO references.

    Version strings need not be semver. A different tag triggers human review,
    rather than automatically changing dependencies in an installed product.
    """
    results = []
    for repo, info in pins.items():
        actual = releases[repo]
        tag = str(actual["tag_name"])
        pinned = str(info["pinned_stable_release"])
        results.append({
            "repo": repo,
            "name": info["name"],
            "pinned": pinned,
            "latest": tag,
            "changed": tag != pinned,
            "release_url": actual.get("html_url") or f"https://github.com/{repo}/releases/tag/{tag}",
        })
    return results


def latest_release(repo: str) -> dict:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "NEXO3D-upstream-review/0.1",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(f"https://api.github.com/repos/{repo}/releases/latest", headers=headers)
    with urlopen(req, timeout=20) as response:
        data = json.load(response)
    if not isinstance(data, dict) or not isinstance(data.get("tag_name"), str):
        raise ValueError(f"Invalid upstream release response for {repo}")
    return data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    pins = json.loads(LOCKFILE.read_text(encoding="utf-8"))
    releases = {repo: latest_release(repo) for repo in pins}
    results = compare_versions(pins, releases)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(results, indent=2), encoding="utf-8")
    for row in results:
        state = "REVIEW" if row["changed"] else "PINNED"
        print(f"{state}: {row['name']} {row['pinned']} → {row['latest']} ({row['release_url']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
