#!/usr/bin/env python3
"""Sync Spotify playlists into public/data/spotify-playlists.json."""

from __future__ import annotations

import base64
import datetime as dt
import html
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "public" / "data" / "spotify-playlists.json"
TOKEN_URL = "https://accounts.spotify.com/api/token"
PLAYLISTS_URL = "https://api.spotify.com/v1/me/playlists?limit=50"


def fail(message: str) -> None:
    print(f"[spotify-sync] ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        fail(f"Missing required environment variable: {name}")
    return value


def request_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, body: bytes | None = None) -> dict:
    req = urllib.request.Request(url=url, method=method, data=body)
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        fail(f"HTTP {exc.code} for {url}. {detail}")
    except urllib.error.URLError as exc:
        fail(f"Network error for {url}: {exc}")

    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        fail(f"Invalid JSON response from {url}")
    return {}


def get_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("ascii")
    form = urllib.parse.urlencode(
        {"grant_type": "refresh_token", "refresh_token": refresh_token}
    ).encode("utf-8")
    payload = request_json(
        TOKEN_URL,
        method="POST",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body=form,
    )
    token = str(payload.get("access_token", "")).strip()
    if not token:
        fail("Spotify token endpoint did not return access_token")
    return token


def fetch_all_playlists(access_token: str) -> list[dict]:
    out: list[dict] = []
    next_url = PLAYLISTS_URL
    headers = {"Authorization": f"Bearer {access_token}"}

    while next_url:
        page = request_json(next_url, headers=headers)
        items = page.get("items", [])
        if isinstance(items, list):
            out.extend(items)
        next_url = page.get("next") if isinstance(page.get("next"), str) else None

    return out


def normalize(playlists: list[dict]) -> list[dict]:
    clean: list[dict] = []
    now_iso = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()

    for playlist in playlists:
        if not isinstance(playlist, dict):
            continue

        owner = playlist.get("owner") if isinstance(playlist.get("owner"), dict) else {}
        owner_name = str(owner.get("display_name") or owner.get("id") or "").strip()
        owner_id = str(owner.get("id") or "").strip().lower()
        owner_name_lower = owner_name.lower()
        if owner_id == "spotify" or "spotify" in owner_name_lower:
            continue

        name = str(playlist.get("name") or "").strip()
        external_urls = (
            playlist.get("external_urls")
            if isinstance(playlist.get("external_urls"), dict)
            else {}
        )
        url = str(external_urls.get("spotify") or "").strip()
        if not name or not url:
            continue

        description = html.unescape(str(playlist.get("description") or "").strip())
        clean.append(
            {
                "name": name,
                "url": url,
                "description": description,
                "ownerName": owner_name,
                "ownerId": owner_id,
                "inLibrary": True,
                "syncedAt": now_iso,
            }
        )

    clean.sort(key=lambda item: item["name"].lower())
    return clean


def write_output(playlists: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(playlists, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    client_id = required_env("SPOTIFY_CLIENT_ID")
    client_secret = required_env("SPOTIFY_CLIENT_SECRET")
    refresh_token = required_env("SPOTIFY_REFRESH_TOKEN")

    access_token = get_access_token(client_id, client_secret, refresh_token)
    playlists = fetch_all_playlists(access_token)
    normalized = normalize(playlists)
    write_output(normalized)

    print(
        f"[spotify-sync] Saved {len(normalized)} playlist(s) to {OUTPUT_PATH.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
