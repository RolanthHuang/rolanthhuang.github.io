# Quiet Study · 光的書房

An interactive 3D portfolio for Yi-Hsuan Huang (黃一玄). [Open the study](https://rolanthhuang.github.io/).

Drag to look around, scroll to zoom, and select a screenshot on the wall to go directly to the demo. The Klein bottle opens the English and Traditional Chinese CVs. The header provides keyboard-accessible navigation to the pinned projects, demos and CVs.

The wall follows the pin order in `assets/pinned.json`, refreshed by the GitHub Actions workflow. Demo URLs and screenshots are matched from `assets/projects.js`. The study uses a repository's homepage or GitHub page when there is no separately listed demo. The Chinese UI is available at `/?lang=zh`.

The site is served as static files on GitHub Pages. Run `python3 -m http.server` in the repository root for local development. The WebGL room and its 360° fallback are in `study/quiet/`. Existing `/study/` links redirect to the homepage.
