# evgeny-redekop.github.io

Personal website for Evgeny Redekop — a single static page, no build step.

Published at **https://evgeny-redekop.github.io** (GitHub Pages serves `main` at the root).

## Files
- `index.html` — the page (sections: Me, About, Projects, Research, CV & Contact).
- `style.css` — all styling (light/dark via CSS variables).
- `main.js` — footer year + dark-mode toggle.
- `assets/CV_Redekop.pdf` — downloadable CV.
- `assets/img/` — figures (curated, public-safe only).

## Edit & deploy
Edit the HTML/CSS directly, then:
```bash
git add -A && git commit -m "update" && git push
```
GitHub Pages rebuilds automatically within ~1 minute.

To preview locally, just open `index.html` in a browser (no server needed), or:
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```
