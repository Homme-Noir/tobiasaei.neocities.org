#!/usr/bin/env python3
"""Fetch Neocities public stats and write JSON for same-origin load on home.html.

Neocities blocks browser fetch() to neocities.org and many third-party proxies (CSP).
GitHub Actions can call the API server-side; we deploy the snapshot with the site.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "neocities-site-stats.json"


def main() -> None:
    site = os.environ.get("NEOCITIES_SITENAME", "tobiasaei").strip()
    if not site:
        print("[neocities-stats] NEOCITIES_SITENAME empty", file=sys.stderr)
        raise SystemExit(1)

    url = "https://neocities.org/api/info?sitename=" + urllib.parse.quote(site)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; site-deploy-stats/1.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
    except Exception as exc:
        print(f"[neocities-stats] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    info = data.get("info") if isinstance(data.get("info"), dict) else {}
    views = info.get("views")
    ok = data.get("result") == "success" and views is not None

    payload = {
        "result": "success" if ok else "error",
        "info": {"views": views, "sitename": info.get("sitename") or site},
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"[neocities-stats] Wrote {OUT.relative_to(ROOT)} views={views}")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
