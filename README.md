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
| `404.html` | Shown for any address that doesn't exist |

Plain HTML, CSS and JavaScript. No build step, no dependencies. Opening `index.html` straight from disk works too.

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

## Credits

*Alice's Adventures in Wonderland* (1865) and *Through the Looking-Glass* (1871) by Lewis Carroll are in the public domain; the hall of doors, the golden key, the little door behind the curtain and the Caterpillar's question come from them.
Fonts: IM Fell English, Cabin, Noto Serif TC and Noto Sans TC, served by Google Fonts under the SIL Open Font License.
