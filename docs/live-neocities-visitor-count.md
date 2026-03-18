# Live Neocities visitor count (optional)

## Why the built-in number isn’t “live”

On Neocities, **JavaScript `fetch()` to other domains is blocked** by Content Security Policy (`connect-src`). So the page cannot read `neocities.org/api/info` (or most proxies) in real time.

The **deploy snapshot** in `data/neocities-site-stats.json` avoids that by being **same-origin**—but it only updates when you deploy.

## Way to get a live number: `<img>` + a tiny backend

**Image requests** usually use `img-src`, not `connect-src`, so many Neocities sites can still load an image from a URL you control. That URL can be a **small serverless worker** that:

1. Server-side `GET https://neocities.org/api/info?sitename=YOURSITE`
2. Returns **SVG** (or PNG) with the current `views` text
3. Sends **`Cache-Control: no-store`** so browsers don’t cache stale counts

Each visitor’s browser loads the image → worker runs → number is current (within API/cache limits).

### Example: Cloudflare Worker

1. Create a Worker, paste something like:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const site = (url.searchParams.get("s") || "tobiasaei").replace(/[^a-z0-9_-]/gi, "");
    const r = await fetch("https://neocities.org/api/info?sitename=" + encodeURIComponent(site));
    const j = await r.json();
    const v = j?.info?.views ?? "—";
    const esc = String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="36"><text x="8" y="26" fill="#e8f7f8" font-family="system-ui,sans-serif" font-size="22" font-weight="600">${esc}</text></svg>`;
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
```

2. Deploy (e.g. `https://your-counter.YOUR_SUBDOMAIN.workers.dev`).

3. On `home.html`, you can **replace** the JSON-based count with an image, or show both:

```html
<img
  class="home-visitor-live"
  src="https://your-counter.YOUR_SUBDOMAIN.workers.dev?s=tobiasaei"
  width="160"
  height="36"
  alt=""
  decoding="async"
/>
```

Match `s=` to your Neocities username. Style with CSS (`.home-visitor-live { … }`).

### Caveats

- **Trust**: You depend on that worker staying up; rotate the URL if you revoke the Worker.
- **CSP**: If Neocities ever tightens `img-src`, this could break—unlikely for `https:` images today.
- **Neocities API**: Public `info` is rate-limited; a busy site might need caching in the Worker (then less than fully “live”).

There is **no way to get live views with HTML/JS alone on Neocities** without some **server-side** hop (Worker, Val, your own VPS, etc.) or an **image** service that does that hop for you.
