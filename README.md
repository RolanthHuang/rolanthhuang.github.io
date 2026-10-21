# rolanthhuang.github.io

The hall of doors: the portfolio of Yi-Hsuan Huang (黃一玄), Senior Risk / ML Systems Engineer.
Live at **https://rolanthhuang.github.io/**

Each door in the hall opens onto a room of projects, and each of those doors opens onto a project.
Production work that belongs to a client is a locked door with a plaque; open demos have a keyhole you can look through.
The golden key on the table opens every door at once.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The page shell |
| `assets/projects.js` | Every text, link and project, in English and Traditional Chinese. **Edit this file.** |
| `assets/app.js` | Draws the rooms and moves between them |
| `assets/style.css` | The look |
| `assets/img/` | Screenshots: `name.jpg` (1280 × 800) and `name-sm.jpg` (640 × 400) |
| `assets/og.jpg` | The preview image shown when the link is shared |
| `cv/` | The two CV PDFs |
| `study/` | The study: a candlelit 3D room (see below) |
| `404.html` | Shown for any address that doesn't exist |

Plain HTML, CSS and JavaScript. No build step, no dependencies. Opening `index.html` straight from disk works too.

## The study

`study/` is a hexagonal library drawn live with three.js, reached from the **Study** link in the top bar, the hall's welcome card and the All doors page.

- Drag (or use the arrow keys) to look around, scroll to zoom.
- **The portrait over the fire** turns to the next project, with its card: demo, plaque, source. The projects are every demo door in `assets/projects.js`, in room order.
- **The bookcase** swings open onto a passage and the list of every live demo.
- **The Klein bottle on the desk** holds the About text and both CVs.
- **The two doors** lead back to the hall (left) and to all doors at once (right).

All its words come from `assets/projects.js`, so editing that file updates the study too.
To give a new project its painting, put `p_<image>.webp` (1024 × 672) in `study/tex/` and a half-size copy in `study/tex/lo/`, where `<image>` is the last part of the door's `image` path; without one, the portrait shows the painting of every door.

Quality adapts to the device: phones get half-size textures and fewer effects, and if the frame rate stays low the room lowers its resolution and switches effects off one by one. Without WebGL 2 the study shows a still picture with the same three panels. Add `?q=low`, `?q=medium` or `?q=high` to the address to force a level.

| Path | What it is |
|---|---|
| `study/index.html`, `study/study.css` | The page and its look |
| `study/src/app.js` | Loading, quality levels, camera, clicks, the render loop |
| `study/src/ui.js` | Every word in the study and the three panels |
| `study/src/world.js`, `room.js`, `props.js`, `fx.js` | The room, its furniture, fire, moonlight and candles |
| `study/src/post.js` | Ambient occlusion, moonbeam, bloom, depth of field, colour grade |
| `study/tex/`, `study/tex/lo/` | Baked textures and paintings (desktop and phone sizes) |
| `study/img/hero.jpg` | The picture shown while it loads, and without WebGL 2 |
| `study/vendor/` | three.js r186 (MIT), bundled with two of its add-ons into one file |

The study uses JavaScript modules, so it needs a web server: GitHub Pages, or `python3 -m http.server` in this folder, then open `http://localhost:8000/study/`. Opened straight from disk it can't load.

## The hall

On browsers with WebGL 2 the home page is a photographic hall (`assets/hall.js`, pictures in `assets/hall/`).
Move the mouse or drag to look around, press W/S or scroll to walk, A/D to choose a door, Enter or a click to step inside.
Without WebGL 2 the drawn hall from `assets/app.js` is shown instead.

The four brass plaques follow the repositories pinned on your GitHub profile:

1. Pin up to six repositories on your profile (Customize your pins).
2. `.github/workflows/pinned-doors.yml` reads them every six hours and writes `assets/pinned.json`. Run it by hand from the Actions tab to update at once.
3. The hall engraves their names on the plaques. A project that has its own page here opens that page; any other repository opens on GitHub.
4. Each of the four doors has a gilt frame inside showing that project's picture (its screenshot from `assets/img/`, the repository's custom social preview, or a painted title card). Stepping through the door leads into a room (`assets/hall/room-*.jpg`) where the picture hangs large: click it to open the demo, or go through the far door to the project's own page.
5. Fewer than four pins: the empty doors use `SITE.hall.defaults` in `assets/projects.js`. Pins five and six are listed behind the All projects door.

If the workflow can't read your pins with the built-in token, add a personal access token (no scopes needed) as the repository secret `PINS_TOKEN`.

## Put it online (GitHub Pages)

1. Create a **public** repository named exactly `rolanthhuang.github.io` (all lowercase).
2. Upload everything in this folder, keeping the folder structure.
3. Settings → Pages → Build and deployment → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
4. About a minute later the site is at https://rolanthhuang.github.io/. Your existing project pages keep their addresses, for example `https://rolanthhuang.github.io/hurst-spike-risk-demo/...`.

`.nojekyll` tells GitHub to serve the files as they are. It's optional; if your file browser hides it, the site still works.

## Change things

- **Add a project:** copy one door object in `assets/projects.js`, give it a new `id`, change the texts and links. `kind: "demo"` is an open door; `kind: "case"` is a locked door for work you can describe but not show.
- **Replace a CV:** overwrite the PDF in `cv/` and keep the same file name.
- **Share the Chinese version:** `https://rolanthhuang.github.io/?lang=zh`
- **Link to one door:** `#/risk`, `#/risk/hurst-spike`, `#/decisions/balancing`, `#/simulations/market-terrain`, `#/who`, `#/doors`, `#/garden`
- The "Updated" dates and the list behind the curtain are read live from the GitHub API; if GitHub can't be reached, the dates in `projects.js` are shown.

## 中文說明

1. 建一個 **public** repo，名稱必須是 `rolanthhuang.github.io`（全小寫）。
2. 把這個資料夾裡的全部內容上傳（保留資料夾結構）。
3. Settings → Pages → Source 選 *Deploy from a branch*，`main`、`/ (root)`。
4. 約一分鐘後網址就是 https://rolanthhuang.github.io/，原本各專案的 demo 網址不受影響。

要新增或修改內容，只改 `assets/projects.js`；換履歷就用同檔名覆蓋 `cv/` 裡的 PDF。

書房（`study/`）是一個 3D 房間：壁爐上的肖像會轉到下一件作品，書櫃打開是所有 demo，桌上的克萊因瓶是關於我與履歷，兩扇門通回門廳與「所有門」。文字同樣來自 `assets/projects.js`；畫質會依裝置自動調整，網址加 `?q=low` / `?q=high` 可強制指定。

## Credits

*Alice's Adventures in Wonderland* (1865) and *Through the Looking-Glass* (1871) by Lewis Carroll are in the public domain; the hall of doors, the golden key, the little door behind the curtain and the Caterpillar's question come from them.
Fonts: IM Fell English, Cabin, Cinzel, Noto Serif TC and Noto Sans TC, served by Google Fonts under the SIL Open Font License.
The study is drawn with [three.js](https://threejs.org/) (MIT License, `study/vendor/LICENSE-three.txt`); its textures, paintings and models are made for this site.
