# Tobias AEI — Neocities site

Static personal site (HTML, CSS, JS). Deploys to Neocities via GitHub Actions.

## Structure

- **`public/`** — All files that get deployed to Neocities (pages, styles, scripts, includes).
- **`.github/workflows/neocities.yml`** — Deploys `public/` to Neocities on every push to `main`.

## Deploy setup (one-time)

1. Create a repo on GitHub and push this project (see [petrapixel’s Git tutorial](https://petrapixel.neocities.org/coding/git-tutorial#neocities)).
2. Get your **Neocities API key**: [Neocities → Site Settings → API](https://neocities.org/settings#api_key).
3. In your GitHub repo: **Settings → Secrets and variables → Actions** → **New repository secret**  
   - Name: `NEOCITIES_API_TOKEN`  
   - Value: your API key

After that, every `git push` to `main` will deploy the contents of `public/` to your Neocities site.
