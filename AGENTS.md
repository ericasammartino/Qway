# Qway

Static single-page marketing website for the band "Qway". Vanilla HTML/CSS/JS — no framework, no bundler, no package manager, no backend, and no database.

Source files: `index.html`, `styles.css`, `app.js` (IIFE handling the horizontally-sliding panel/rail navigation).

## Cursor Cloud specific instructions

- This is a zero-dependency static site. There is nothing to install or build; no `package.json`/lockfile exists.
- Run it with any static file server from the repo root, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/`. There is no `dev` script.
- Several media assets referenced in `index.html` (e.g. `QWAY_LOGO.png`, `solidus.jpg`, `*.mov` videos) are NOT tracked in the repo. The page renders and navigation works correctly, but those images/videos show as broken — this is expected, not a bug.
- The app is a hash-routed SPA: clicking rail tabs (HOME, NEW RELEASE, TOUR, WATCH, LISTEN, MERCH, CONTACT) slides panels horizontally and updates the URL hash (e.g. `#tour`).
- Font Awesome icons load from a CDN; without internet access icon glyphs may be missing, which does not affect functionality.
- There is no lint, test, or build tooling in this repo.
