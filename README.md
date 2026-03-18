# Tobias AEI — Neocities site

Static personal site (HTML, CSS, JS). Deploys to Neocities via GitHub Actions.

## Structure

- **`public/`** — All files that get deployed to Neocities (pages, styles, scripts, includes).
- **`.github/workflows/neocities.yml`** — Deploys `public/` to Neocities on every push to `main`.
- **`.github/workflows/sync-spotify-playlists.yml`** — Syncs Spotify playlists into `public/data/spotify-playlists.json` and **deploys `public/` to Neocities when that file changes** (needed because pushes from `github-actions[bot]` do not trigger the normal deploy-on-push workflow).
- **`scripts/`** — Automation scripts (playlist sync and other data generation helpers).

## Deploy setup (one-time)

1. Create a repo on GitHub and push this project (see [petrapixel’s Git tutorial](https://petrapixel.neocities.org/coding/git-tutorial#neocities)).
2. Get your **Neocities API key**: [Neocities → Site Settings → API](https://neocities.org/settings#api_key).
3. In your GitHub repo: **Settings → Secrets and variables → Actions** → **New repository secret**  
   - Name: `NEOCITIES_API_TOKEN`  
   - Value: your API key

After that, every `git push` to `main` will deploy the contents of `public/` to your Neocities site.

### Home page visitor counter

`home.html` shows **Neocities “views”** (session-based visitors—the same number as on your public profile), not raw page hits. The browser cannot call `https://neocities.org/api/info` directly (CORS), so the page uses the community proxy from [Dannarchy’s Neocities hit-counter tutorial](https://dannarchy.com/tut/tut_002): `weirdscifi.ratiosemper.com/neocities.php?sitename=…`. Set `NEOCITIES_SITE` in the inline script to your Neocities username.

## Spotify curated playlists sync (no visitor login)

`music.html` reads curated playlists from `public/data/spotify-playlists.json`.
That JSON is refreshed by GitHub Actions every 3 days using your private Spotify credentials in repo secrets.

### 1) Create Spotify app credentials

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Open your app and copy:
   - Client ID
   - Client Secret
3. Add a redirect URI in the app settings (example: `http://127.0.0.1:8080/callback`).

### 2) Generate a refresh token (one-time)

Open this URL in your browser (replace placeholders first):

`https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A8080%2Fcallback&scope=playlist-read-private%20playlist-read-collaborative`

After approving, copy the `code` query parameter from the redirected URL, then exchange it:

```bash
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=authorization_code&code=YOUR_CODE&redirect_uri=http://127.0.0.1:8080/callback"
```

Save `refresh_token` from the response.

### 3) Add GitHub Actions secrets

In your repository: **Settings → Secrets and variables → Actions**, add:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`

### 4) Run workflow

Run **Sync Spotify Playlists** manually once from GitHub Actions, then it will run every 3 days.

The same **`NEOCITIES_API_TOKEN`** secret used for normal deploys must be set so the sync workflow can upload the updated JSON to Neocities when playlists change.

### Optional local test run

Use environment variables (or `.env`) and run:

```bash
SPOTIFY_CLIENT_ID="..." \
SPOTIFY_CLIENT_SECRET="..." \
SPOTIFY_REFRESH_TOKEN="..." \
python scripts/sync_spotify_playlists.py
```

## Vault data files (journal + writings)

`journal.html` and `writings.html` load these files from `public/data/`:

- `vault-journal.json`
- `vault-poems.json`

These are generated from your Obsidian vault export process. Keep the JSON shape stable:

- `title` (string)
- `content` (string)
- `datetime` (string; optional/fallback allowed)
- `isIndex` (boolean for journal entries)

If either file is replaced, validate JSON before pushing:

```bash
python -c "import json,pathlib; json.loads(pathlib.Path('public/data/vault-journal.json').read_text(encoding='utf-8')); json.loads(pathlib.Path('public/data/vault-poems.json').read_text(encoding='utf-8'))"
```
