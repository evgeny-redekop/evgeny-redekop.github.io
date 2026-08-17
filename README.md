# evgeny-redekop.github.io

Personal website for Evgeny Redekop: hand-written static HTML, no build step.

Published at **https://evgeny-redekop.github.io** (GitHub Pages serves `main` at the root).

## Files
- `index.html`: the home page (sections: Me, About, Projects, Research, CV & Contact).
- `style.css`: all styling for every page, light/dark via CSS variables.
- `main.js`: footer year, dark-mode toggle, and mounting the figures.
- `assets/js/`: the animated figures ported from the Episteme talk. `anim.js` is the shared
  scroll gate; the other three build one figure each and pause offscreen.
- `blog/index.html`: the post listing.
- `blog/<slug>/index.html`: one folder per post, so a post keeps its figures beside it.
- `blog/_template/`: starting point for a new post. The leading underscore keeps it out of
  the published site, because GitHub Pages builds this repo with Jekyll.
- `feed.xml`: RSS, maintained by hand alongside the listing.
- `assets/CV_Redekop.pdf`: downloadable CV.
- `assets/img/`: figures (curated, public-safe only).

## Add a blog post
```bash
cp -R blog/_template blog/my-slug
```
Then fill in every `REPLACE` marker in `blog/my-slug/index.html`, add one `<li>` at the top of
the list in `blog/index.html`, and one `<item>` at the top of `feed.xml` (`date -R` prints
today's date in the form RSS wants). The template's header comment spells this out, and its
body shows every element `style.css` knows how to style.

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
