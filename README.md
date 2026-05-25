# Myrtavia — Interactive Atlas

A high-fidelity, interactive tabletop-RPG companion atlas. Pure HTML + JSX (Babel in-browser) — no build step.

## Local preview

Just open `index.html` (or `Myrtavia.html` — they are the same content) in a modern browser. For best results, serve it via any local HTTP server, e.g.:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to Vercel

This project deploys as a static site — no framework, no build, no install step.

### Option 1 — Drag & drop
1. Go to https://vercel.com → **New Project**
2. Drop the entire project folder
3. **Framework Preset:** Other
4. **Build Command:** leave empty
5. **Output Directory:** leave empty (uses project root)
6. Deploy

### Option 2 — GitHub + Vercel
1. `git init && git add . && git commit -m "init"`
2. Push to a GitHub repo
3. On Vercel: **Import Git Repository** → choose the repo
4. Accept the auto-detected static config
5. Deploy

Every push to the connected branch redeploys.

### Option 3 — Vercel CLI
```
npm i -g vercel
vercel
```
Follow the prompts. The included `vercel.json` sets sensible cache headers.

## File map

| File                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `index.html`        | Entry point (Vercel serves at `/`)                   |
| `Myrtavia.html`     | Same content — kept as canonical asset filename      |
| `app.jsx`           | Main React app, view switching, world map           |
| `region-view.jsx`   | Region detail view with hotspots + notes integration |
| `regions.jsx`       | Region data (polygons, POIs, lore, detail hotspots)  |
| `userhub.jsx`       | Auth (mock Google sign-in) + notes store             |
| `markers.jsx`       | User-placed custom markers + thematic icons          |
| `map.png`           | World map of Myrtavia                                |
| `regions/`          | Per-region detail maps (currently: Eldoria)          |
| `vercel.json`       | Cache headers config                                 |

## Notes

- Authentication is **mocked**: user data is stored in `localStorage` only, not on any server. To turn this into a real product, swap `userhub.jsx`'s `Store` for a backend (Supabase, Firebase, etc.) and use real Google OAuth via Google Identity Services.
- The `uploads/` folder contains source images and is **not required at runtime** — `map.png` and `regions/eldoria.png` are the runtime copies. Safe to delete before deploying.

