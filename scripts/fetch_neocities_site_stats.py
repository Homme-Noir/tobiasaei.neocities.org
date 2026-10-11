"""Fetch Neocities public stats and write JSON for same-origin load on home.html.

Neocities blocks browser fetch() to neocities.org and many third-party proxies (CSP).
GitHub Actions can call the API server-side; we deploy the snapshot with the site.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "neocities-site-stats.json"


def main() -> None:
    """Fetch public site stats and write a JSON snapshot for the site."""
    site = os.environ.get("NEOCITIES_SITENAME", "tobiasaei").strip()
    if not site:
        print("[neocities-stats] NEOCITIES_SITENAME empty", file=sys.stderr)
        raise SystemExit(1)

    query = urllib.parse.urlencode({"sitename": site})
    url = f"https://neocities.org/api/info?{query}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; site-deploy-stats/1.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
    except (
        urllib.error.URLError,
        TimeoutError,
        OSError,
        json.JSONDecodeError,
        UnicodeDecodeError,
    ) as exc:
        print(f"[neocities-stats] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    if not isinstance(data, dict):
        print("[neocities-stats] ERROR: Invalid API response", file=sys.stderr)
        raise SystemExit(1)

    info = data.get("info")
    if not isinstance(info, dict):
        info = {}
    views = info.get("views")
    valid_views = isinstance(views, int) and not isinstance(views, bool)
    if data.get("result") != "success" or not valid_views:
        print(
            "[neocities-stats] ERROR: API response did not include a valid view count",
            file=sys.stderr,
        )
        raise SystemExit(1)

    payload = {
        "result": "success",
        "info": {"views": views, "sitename": info.get("sitename") or site},
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"[neocities-stats] Wrote {OUT.relative_to(ROOT)} views={views}")


if __name__ == "__main__":
    main()
