/* The photographic hall of doors.
   One photograph drawn with WebGL 2: a depth map gives it parallax when you look around or walk,
   door masks light up the door you choose, and the brass plaques are engraved live with the
   names of the repositories pinned on GitHub (assets/pinned.json). If a door's project changes,
   a picture of the new project is hung inside that room, so the room still matches its plaque. */
(function () {
  "use strict";

  const SITE = window.SITE;
  const IMG_W = 1672, IMG_H = 941, IA = IMG_W / IMG_H, OVER = 0.94;
  const BASE = "assets/hall/";

  /* Where things are in the photograph, in its own pixels. */
  const SLOTS = [
    { focus: [219, 420], hit: [[95, 72], [345, 72], [345, 612], [95, 612]],
      quad: [[163.1, 170.4], [270.9, 193.6], [271.4, 214.1], [162.6, 191.9]],
      cover: { quad: [[186, 376], [281, 371], [282, 500], [186, 502]], framed: true } },
    { focus: [500, 448], hit: [[398, 132], [630, 132], [630, 610], [398, 610]],
      quad: [[464.1, 226.8], [561.5, 232.8], [563.7, 252.0], [463.7, 245.4]],
      cover: { quad: [[452, 454], [510, 454], [510, 500], [452, 500]], framed: true } },
    { focus: [820, 447], hit: [[668, 150], [925, 150], [925, 640], [668, 640]],
      quad: [[748.2, 215.5], [849.6, 210.7], [850.0, 226.5], [747.2, 233.3]] },
    { focus: [1100, 463], hit: [[962, 140], [1218, 140], [1218, 668], [962, 668]],
      quad: [[1024.8, 205.5], [1138.4, 191.9], [1138.9, 214.7], [1024.9, 228.9]],
      cover: { quad: [[1082, 440], [1172, 436], [1173, 522], [1082, 524]], framed: true } },
    { focus: [1330, 496], hit: [[1222, 178], [1400, 178], [1400, 705], [1222, 705]],
      quad: [[1277.4, 249.1], [1367.8, 237.7], [1368.8, 257.4], [1277.0, 267.8]] },
    { focus: [1580, 440], hit: [[1448, 130], [1668, 130], [1668, 648], [1448, 648]],
      quad: [[1477.5, 178.0], [1608.3, 154.4], [1607.8, 176.0], [1477.4, 199.6]] }
  ];
  const COVER_SLOTS = [0, 1, 3];

  const L = {
    introTitle: { en: "The hall of doors", zh: "門廳" },
    introSub: { en: "Four doors follow my pinned GitHub repositories", zh: "四扇門跟著我在 GitHub 釘選的 repo" },
    introLine: { en: "Walk up to a door and step inside. Behind each door is another room, and usually another door.", zh: "走到門前，走進去。每扇門後都有另一個房間，通常還有另一扇門。" },
    touch: { en: "Drag to look around. Tap a door to choose it, tap it again to go in.", zh: "拖曳環顧四周。點一下門選取，再點一下走進去。" },
    steps: { en: "<kbd>W</kbd> <kbd>S</kbd> walk &nbsp; <kbd>A</kbd> <kbd>D</kbd> choose a door &nbsp; <kbd>Enter</kbd> step inside", zh: "<kbd>W</kbd> <kbd>S</kbd> 前後走 &nbsp; <kbd>A</kbd> <kbd>D</kbd> 選門 &nbsp; <kbd>Enter</kbd> 走進去" },
    hint: { en: "or scroll to walk, drag to look around, click a door", zh: "或滾輪前後走，拖曳環顧，點門走進去" },
    step: { en: "Step inside", zh: "走進去" },
    demo: { en: "Open the demo", zh: "開啟 demo" },
    site: { en: "Open the project", zh: "開啟專案" },
    github: { en: "GitHub", zh: "GitHub" },
    reset: { en: "Reset view", zh: "重設視角" },
    loading: { en: "Lighting the lamps…", zh: "正在點燈…" },
    failed: { en: "The hall couldn't load its pictures. Reload the page to try again.", zh: "門廳的圖片沒有載入，重新整理頁面再試一次。" },
    pinned: { en: "Pinned on GitHub", zh: "GitHub 釘選" },
    aboutTitle: { en: "About and CV", zh: "關於我與履歷" },
    aboutLine: { en: "Who I am, my CV in English and Chinese, and how to reach me.", zh: "關於我、中英文履歷與聯絡方式。" },
    allTitle: { en: "All projects", zh: "所有專案" },
    allSub: { en: "Every door at once", zh: "一次打開所有的門" },
    allLine: { en: "Risk and anomaly detection, decision systems, simulations and 3D works, all on one page.", zh: "風控與異常偵測、決策系統、情境模擬與 3D 作品，都在同一頁。" },
    alsoPinned: { en: "Also pinned: ", zh: "其他釘選：" },
    back: { en: "Back to the hall", zh: "回到門廳" },
    cvEn: { en: "CV in English", zh: "英文履歷" },
    cvZh: { en: "中文履歷", zh: "中文履歷" },
    profile: { en: "GitHub profile", zh: "GitHub 個人頁" },
    plateAbout: { en: "About & CV", zh: "關於與履歷" },
    plateAll: { en: "All Projects", zh: "所有專案" },
    doors: { en: "Doors", zh: "門" },
    canvas: { en: "The hall of doors. Choose a door with A and D or the arrow keys, walk with W and S, step inside with Enter.", zh: "門廳。用 A、D 或方向鍵選門，W、S 前後走，Enter 走進去。" }
  };

  /* ---------- small helpers ---------- */
  let lang = "en";
  const t = v => (v == null ? "" : typeof v === "string" ? v : (v[lang] != null ? v[lang] : v.en || ""));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = v => esc(t(v));
  const pretty = n => String(n).replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const user = SITE.person.githubUser;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ext = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 2h5v5M14 2 7.5 8.5M12 9.5V14H2V4h4.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  function quadSize(q) {
    return [(dist(q[0], q[1]) + dist(q[3], q[2])) / 2, (dist(q[0], q[3]) + dist(q[1], q[2])) / 2];
  }
  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  /* Maps a quad in the photograph onto the unit square; returned column-major for a GLSL mat3. */
  function homography(src) {
    const dst = [[0, 0], [1, 0], [1, 1], [0, 1]], A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const h = solve(A, b);
    return [h[0], h[3], h[6], h[1], h[4], h[7], h[2], h[5], 1];
  }
  function bbox(q, pad) {
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
    return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  }
  function inPoly(p, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  /* ---------- which project is behind which door ---------- */
  function findDoor(repo) {
    const r = String(repo || "").toLowerCase();
    for (const room of SITE.rooms) for (const door of room.doors) if (door.repo && door.repo.toLowerCase() === r) return { room, door };
    return null;
  }
  function assignSlots(pins) {
    const painted = SITE.hall.painted.map(x => x.toLowerCase());
    const slots = [null, null, null, null], used = new Set();
    const list = pins.map(p => p.repo).filter(Boolean);
    const take = (i, r) => { slots[i] = r; used.add(r.toLowerCase()); };
    // a pinned repository that a room was painted for goes behind that door
    list.forEach(r => { const i = painted.indexOf(r.toLowerCase()); if (i >= 0 && !slots[i] && !used.has(r.toLowerCase())) take(i, r); });
    // the other pinned repositories take the free doors in pin order
    const order = [2, 0, 3, 1];
    list.forEach(r => { if (used.has(r.toLowerCase())) return; const i = order.find(k => !slots[k]); if (i != null) take(i, r); });
    // doors nobody pinned keep their default project
    SITE.hall.defaults.forEach((r, i) => { if (!slots[i] && !used.has(r.toLowerCase())) take(i, r); });
    for (let i = 0; i < 4; i++) if (!slots[i]) { const r = SITE.hall.defaults.find(d => !used.has(d.toLowerCase())); if (r) take(i, r); }
    const extra = list.filter(r => !used.has(r.toLowerCase()));
    return { slots, extra };
  }
  function buildDoors(data) {
    const pins = (data && Array.isArray(data.pinned) ? data.pinned : []).filter(p => p && p.repo);
    const byRepo = {}; pins.forEach(p => { byRepo[p.repo.toLowerCase()] = p; });
    const { slots, extra } = assignSlots(pins);
    const painted = SITE.hall.painted.map(x => x.toLowerCase());
    const doors = slots.map((repo, i) => {
      const hit = findDoor(repo), pin = byRepo[String(repo).toLowerCase()] || {};
      const url = pin.url || `https://github.com/${user}/${repo}`;
      const base = { repo, painted: String(repo).toLowerCase() === painted[i], pinned: !!byRepo[String(repo).toLowerCase()] };
      if (hit) {
        const d = hit.door;
        return { ...base, plate: d.hall || d.plate, title: d.title, sub: hit.room.title, line: d.lede, target: `#/${hit.room.id}/${d.id}`,
          image: d.image ? d.image + ".jpg" : pin.preview || "", links: [[L.demo, d.demo || pin.homepage || url], [L.github, url]] };
      }
      const name = pin.name || pretty(repo);
      return { ...base, plate: name, title: name, sub: L.pinned, line: pin.description || "", target: null, image: pin.preview || "",
        links: [[pin.homepage ? L.site : L.github, pin.homepage || url], ...(pin.homepage ? [[L.github, url]] : [])] };
    });
    const extraNames = extra.map(r => { const h = findDoor(r); return h ? t(h.door.plate) : pretty(r); });
    doors.push({ plate: L.plateAbout, title: L.aboutTitle, sub: SITE.person.title, line: L.aboutLine, target: "#/who",
      links: [[L.cvEn, SITE.person.cv.en], [L.cvZh, SITE.person.cv.zh]] });
    doors.push({ plate: L.plateAll, title: L.allTitle, sub: L.allSub, target: "#/doors",
      line: { en: L.allLine.en + (extraNames.length ? " " + L.alsoPinned.en + extraNames.join(", ") + "." : ""),
              zh: L.allLine.zh + (extraNames.length ? L.alsoPinned.zh + extraNames.join("、") + "。" : "") },
      links: [[L.profile, SITE.person.github]] });
    return doors.map((d, i) => ({ ...d, slot: i, uv: [SLOTS[i].focus[0] / IMG_W, 1 - SLOTS[i].focus[1] / IMG_H] }));
  }

  /* ---------- WebGL ---------- */
  const VS = `#version 300 es
  in vec2 p; out vec2 vUv;
  void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 frag;
  uniform sampler2D uImg, uDepth, uMaskA, uMaskB, uAtlas, uCv0, uCv1, uCv2;
  uniform vec2 uRes, uPan, uPar, uFocus, uImgPx;
  uniform float uIA, uZoom, uOver, uTime, uFade, uAny, uEngrave;
  uniform vec3 uGA, uGB, uCOn;
  uniform mat3 uPH[6];
  uniform vec4 uPBox[6];
  uniform vec2 uPRow[6];
  uniform mat3 uCH[3];
  uniform vec4 uCBox[3];
  uniform vec4 uCFit[3];
  float dep(vec2 s){ return texture(uDepth, s).r; }
  vec3 hang(vec3 c, vec2 px, mat3 H, vec4 box, vec4 fit, sampler2D tex, float on, float light){
    if (on < 0.002) return c;
    if (px.x < box.x || px.y < box.y || px.x > box.z || px.y > box.w) return c;
    vec3 h = H * vec3(px, 1.0); vec2 u = h.xy / h.z;
    float outside = max(max(-u.x, u.x - 1.0), max(-u.y, u.y - 1.0));
    vec2 tu = vec2(0.5) + (vec2(u.x, 1.0 - u.y) - 0.5) * fit.xy;
    if (fit.w < 0.5) {
      if (outside > 0.0) return c;
      float edge = smoothstep(0.0, 0.07, min(min(u.x, 1.0 - u.x), min(u.y, 1.0 - u.y)));
      vec3 pic = texture(tex, tu).rgb * vec3(0.86, 0.93, 1.04) * (0.6 + 0.4 * light);
      return mix(c, pic, on * edge * 0.94);
    }
    if (outside > 0.0) return mix(c, c * (0.55 + 0.45 * smoothstep(0.0, 0.07, outside)), on);
    float bu = 0.085, bv = 0.085 * fit.z;
    float d = min(min(u.x / bu, (1.0 - u.x) / bu), min(u.y / bv, (1.0 - u.y) / bv));
    vec3 pic = pow(texture(tex, tu).rgb, vec3(1.12)) * vec3(0.95, 0.85, 0.7) * light * 0.88;
    pic *= 0.72 + 0.28 * smoothstep(1.0, 1.9, d);
    float bevel = clamp(1.0 - abs(d - 0.5) * 1.7, 0.0, 1.0);
    vec3 gold = mix(vec3(0.36, 0.24, 0.08), vec3(0.96, 0.78, 0.44), bevel) * light * 1.12;
    return mix(c, d < 1.0 ? gold : pic, on);
  }
  void main(){
    float va = uRes.x / uRes.y;
    vec2 q = vUv - 0.5;
    if (va > uIA) q.y *= uIA / va; else q.x *= va / uIA;
    q = q * uOver + 0.5;
    vec2 t = q - uPan;
    vec2 s = uFocus + (t - uFocus) / (1.0 + uZoom * 0.7);
    for (int i = 0; i < 6; i++) {
      float d = dep(s);
      float k = 1.0 + uZoom * (0.55 + 0.45 * d);
      s = uFocus + (t - uPar * (d - 0.45) - uFocus) / k;
    }
    s = clamp(s, vec2(0.001), vec2(0.999));
    vec3 c = texture(uImg, s).rgb;
    vec2 px = vec2(s.x * uImgPx.x, (1.0 - s.y) * uImgPx.y);
    float light = clamp(dot(textureLod(uImg, s, 5.0).rgb, vec3(0.3, 0.59, 0.11)) * 2.4, 0.4, 1.15);
    c = hang(c, px, uCH[0], uCBox[0], uCFit[0], uCv0, uCOn.x, light);
    c = hang(c, px, uCH[1], uCBox[1], uCFit[1], uCv1, uCOn.y, light);
    c = hang(c, px, uCH[2], uCBox[2], uCFit[2], uCv2, uCOn.z, light);
    for (int i = 0; i < 6; i++) {
      vec4 b = uPBox[i];
      if (px.x < b.x || px.y < b.y || px.x > b.z || px.y > b.w) continue;
      vec3 h = uPH[i] * vec3(px, 1.0);
      vec2 pu = h.xy / h.z;
      if (pu.x < 0.0 || pu.y < 0.0 || pu.x > 1.0 || pu.y > 1.0) continue;
      vec2 au = vec2(pu.x, 1.0 - mix(uPRow[i].x, uPRow[i].y, pu.y));
      float a = texture(uAtlas, au).a * uEngrave;
      float lip = texture(uAtlas, au + vec2(-0.0012, 0.0035)).a * uEngrave;
      c = mix(c, c * 0.1 + vec3(0.02, 0.012, 0.004), a * 0.96);
      c += vec3(1.0, 0.85, 0.58) * max(0.0, lip - a) * 0.2;
    }
    float g = dot(texture(uMaskA, s).rgb, uGA) + dot(texture(uMaskB, s).rgb, uGB);
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    c *= 1.0 + 0.03 * sin(uTime * 7.3 + s.x * 41.0) * sin(uTime * 3.1 + s.y * 23.0) * smoothstep(0.55, 0.95, lum);
    c *= 1.0 - 0.24 * uAny * (1.0 - g);
    c = c * (1.0 + g * 0.85) + g * vec3(0.12, 0.08, 0.03);
    vec2 v = vUv - 0.5;
    c *= mix(1.0, smoothstep(0.98, 0.32, length(v * vec2(1.0, 1.2))), 0.42);
    c = mix(c, vec3(0.035, 0.022, 0.014), uFade);
    frag = vec4(c, 1.0);
  }`;

  let canvas = null, gl = null, prog = null, U = {}, ready = null, failed = false;
  let depthCPU = null, DW = 0, DH = 0;
  const texUnits = {};

  function getGL() {
    if (gl || failed) return gl;
    canvas = document.getElementById("hall-canvas");
    if (!canvas) { failed = true; return null; }
    try { gl = canvas.getContext("webgl2", { antialias: false, alpha: false }); } catch (e) { gl = null; }
    if (!gl) { failed = true; return null; }
    return gl;
  }
  function supported() { return !!getGL(); }

  function compile() {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ["uImg", "uDepth", "uMaskA", "uMaskB", "uAtlas", "uCv0", "uCv1", "uCv2", "uRes", "uPan", "uPar", "uFocus", "uImgPx", "uIA", "uZoom", "uOver", "uTime",
     "uFade", "uAny", "uEngrave", "uGA", "uGB", "uCOn", "uPH", "uPBox", "uPRow", "uCH", "uCBox", "uCFit"].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
  }
  function upload(unit, source, mip = true) {
    let tex = texUnits[unit];
    if (!tex) { tex = texUnits[unit] = gl.createTexture(); }
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function blank(unit) {
    const c = document.createElement("canvas"); c.width = c.height = 2;
    upload(unit, c, false);
  }

  let pinsData = null, loaded = false;
  function init() {
    if (ready) return ready;
    ready = (async () => {
      compile();
      [4, 5, 6, 7].forEach(blank);
      const [img, dep, ma, mb] = await Promise.all(["hall.jpg", "depth.png", "maskA.png", "maskB.png"].map(f => loadImg(BASE + f)));
      upload(0, img); upload(1, dep); upload(2, ma); upload(3, mb);
      [["uImg", 0], ["uDepth", 1], ["uMaskA", 2], ["uMaskB", 3], ["uAtlas", 4], ["uCv0", 5], ["uCv1", 6], ["uCv2", 7]].forEach(([n, u]) => gl.uniform1i(U[n], u));
      gl.uniform1f(U.uIA, IA); gl.uniform1f(U.uOver, OVER); gl.uniform2f(U.uImgPx, IMG_W, IMG_H);
      const c = document.createElement("canvas"); DW = c.width = dep.naturalWidth; DH = c.height = dep.naturalHeight;
      const g = c.getContext("2d"); g.drawImage(dep, 0, 0);
      const px = g.getImageData(0, 0, DW, DH).data; depthCPU = new Uint8Array(DW * DH);
      for (let i = 0; i < DW * DH; i++) depthCPU[i] = px[i * 4];
      pinsData = await fetch("assets/pinned.json", { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null);
      loaded = true;
    })();
    ready.catch(() => { failed = true; });
    return ready;
  }

  /* ---------- engraving ---------- */
  const atlas = document.createElement("canvas");
  let engravedFor = "";
  async function engrave(doors) {
    const key = lang + "|" + doors.map(d => t(d.plate)).join("|");
    if (key === engravedFor) return;
    const family = lang === "zh" ? '700 64px "Noto Serif TC"' : "600 64px Cinzel";
    await Promise.race([document.fonts.load(family), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
    const RW = 1024, gap = 12;
    const heights = SLOTS.map(sl => { const [w, h] = quadSize(sl.quad); return Math.round(RW / (w / h)); });
    atlas.width = RW; atlas.height = heights.reduce((a, h) => a + h + gap, 0);
    const g = atlas.getContext("2d");
    g.clearRect(0, 0, atlas.width, atlas.height);
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    const rows = [], H = [], box = [];
    let y = 0;
    SLOTS.forEach((sl, i) => {
      const h = heights[i];
      rows.push(y / atlas.height, (y + h) / atlas.height);
      fitText(g, t(doors[i].plate), RW / 2, y + h * 0.54, RW * 0.88, h);
      y += h + gap;
      H.push(...homography(sl.quad));
      box.push(...bbox(sl.quad, 2));
    });
    upload(4, atlas);
    gl.useProgram(prog);
    gl.uniformMatrix3fv(U.uPH, false, new Float32Array(H));
    gl.uniform4fv(U.uPBox, new Float32Array(box));
    gl.uniform2fv(U.uPRow, new Float32Array(rows));
    engravedFor = key;
  }
  function fitText(g, text, cx, cy, maxW, h) {
    if (!text) return;
    const zh = lang === "zh";
    const font = sz => (zh ? `700 ${sz}px "Noto Serif TC", "Songti TC", serif` : `600 ${sz}px Cinzel, "Trajan Pro", Georgia, serif`);
    try { g.letterSpacing = zh ? "10px" : "2px"; } catch (e) {}
    const one = (s, size, y) => {
      g.font = font(size);
      const w = g.measureText(s).width, sx = Math.min(1, maxW / w);
      g.save(); g.translate(cx, y); g.scale(sx, 1); g.fillText(s, 0, 0); g.restore();
    };
    let size = Math.round(h * (zh ? 0.62 : 0.7)); g.font = font(size);
    while (size > h * 0.5 && g.measureText(text).width * 0.76 > maxW) { size -= 2; g.font = font(size); }
    if (g.measureText(text).width * 0.76 <= maxW || !text.includes(" ")) { one(text, size, cy); return; }
    const words = text.split(/\s+/); let best = 1, bestD = 1e9;
    for (let k = 1; k < words.length; k++) {
      const d = Math.abs(g.measureText(words.slice(0, k).join(" ")).width - g.measureText(words.slice(k).join(" ")).width);
      if (d < bestD) { bestD = d; best = k; }
    }
    const sz2 = Math.round(h * 0.4);
    one(words.slice(0, best).join(" "), sz2, cy - sz2 * 0.56);
    one(words.slice(best).join(" "), sz2, cy + sz2 * 0.6);
  }

  /* ---------- pictures hung in rooms whose project changed ---------- */
  const coverState = [0, 0, 0], coverTarget = [0, 0, 0], coverSrc = ["", "", ""];
  function hangPictures(doors) {
    const H = [], box = [], fit = [];
    COVER_SLOTS.forEach((slot, k) => {
      const sl = SLOTS[slot], cv = sl.cover, d = doors[slot];
      const [w, h] = quadSize(cv.quad);
      H.push(...homography(cv.quad));
      box.push(...bbox(cv.quad, cv.framed ? 8 : 0));
      fit.push(1, 1, w / h, cv.framed ? 1 : 0);
      const want = !d.painted && d.image ? d.image : "";
      if (want === coverSrc[k]) return;
      coverSrc[k] = want; coverTarget[k] = 0;
      if (!want) return;
      loadImg(want).then(img => {
        if (coverSrc[k] !== want) return;
        upload(5 + k, img);
        const ia = img.naturalWidth / img.naturalHeight, qa = w / h;
        const f = ia > qa ? [qa / ia, 1] : [1, ia / qa];
        fitCache[k] = f;
        gl.useProgram(prog);
        writeFit();
        coverTarget[k] = 1;
      }).catch(() => {});
    });
    gl.useProgram(prog);
    gl.uniformMatrix3fv(U.uCH, false, new Float32Array(H));
    gl.uniform4fv(U.uCBox, new Float32Array(box));
    coverGeom = fit;
    writeFit();
  }
  const fitCache = [[1, 1], [1, 1], [1, 1]];
  let coverGeom = [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0];
  function writeFit() {
    const f = [];
    for (let k = 0; k < 3; k++) f.push(fitCache[k][0], fitCache[k][1], coverGeom[k * 4 + 2], coverGeom[k * 4 + 3]);
    gl.uniform4fv(U.uCFit, new Float32Array(f));
  }

  /* ---------- the hall while it is on screen ---------- */
  let mounted = null;

  function mount(opts) {
    if (!getGL()) return null;
    lang = opts.lang === "zh" ? "zh" : "en";
    const root = opts.root;
    root.insertAdjacentHTML("beforeend", `
      <div class="ph-ui">
        <section class="ph-card" aria-live="polite">
          <h2 class="ph-card__title"><span data-title></span><small data-sub></small></h2>
          <p class="ph-card__line" data-line></p>
          <div class="ph-card__steps">${t(L.steps)}</div>
          <p class="ph-card__touch">${T(L.touch)}</p>
          <div class="ph-acts" data-acts></div>
        </section>
        <div class="ph-hint" aria-hidden="true"><kbd>W</kbd><kbd>S</kbd> ${T(L.hint)}</div>
        <div class="ph-corner">
          <button class="ph-pill" type="button" data-reset>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            ${T(L.reset)}
          </button>
        </div>
        <nav class="sr-only" aria-label="${T(L.doors)}" data-doorlist></nav>
        <div class="ph-room" data-room hidden>
          <div class="ph-room__inner">
            <span class="ph-room__plate" data-room-plate></span>
            <h2 data-room-title></h2>
            <p data-room-line></p>
            <div class="ph-acts" data-room-acts></div>
            <p><button class="ph-btn" type="button" data-room-back>${T(L.back)}</button></p>
          </div>
        </div>
        <div class="ph-loading${loaded ? " is-done" : ""}" data-loading>${T(L.loading)}</div>
      </div>`);
    const $ = sel => root.querySelector(sel);
    canvas.hidden = false;
    canvas.setAttribute("aria-label", t(L.canvas));
    document.body.classList.add("on-photo-hall");

    const st = {
      zoom: 0, zoomT: 0, pan: [0, 0], panT: [0, 0], par: [0, 0], parT: [0, 0],
      focus: [0.5, 0.52], focusT: [0.5, 0.52], glow: [0, 0, 0, 0, 0, 0],
      sel: -1, fade: 0, fadeT: 0, inside: false, busy: false, drag: null, lastMove: 0, held: {}, lock: false
    };
    let doors = [], raf = 0, alive = true, engraveT = 0, engraveV = 0;

    /* coming back out of a door: start inside it and step back */
    const cameFrom = opts.from || "";

    function screenToImage(cx, cy) {
      const r = canvas.getBoundingClientRect();
      const u = (cx - r.left) / r.width, v = 1 - (cy - r.top) / r.height, va = r.width / r.height;
      let qx = u - 0.5, qy = v - 0.5;
      if (va > IA) qy *= IA / va; else qx *= va / IA;
      qx = qx * OVER + 0.5; qy = qy * OVER + 0.5;
      const tx = qx - st.pan[0], ty = qy - st.pan[1], f = st.focus;
      let s = [f[0] + (tx - f[0]) / (1 + st.zoom * 0.7), f[1] + (ty - f[1]) / (1 + st.zoom * 0.7)];
      for (let i = 0; i < 6; i++) {
        const x = Math.min(DW - 1, Math.max(0, Math.round(s[0] * (DW - 1)))), y = Math.min(DH - 1, Math.max(0, Math.round((1 - s[1]) * (DH - 1))));
        const d = depthCPU[y * DW + x] / 255, k = 1 + st.zoom * (0.55 + 0.45 * d);
        s = [f[0] + (tx - st.par[0] * (d - 0.45) - f[0]) / k, f[1] + (ty - st.par[1] * (d - 0.45) - f[1]) / k];
      }
      return [s[0] * IMG_W, (1 - s[1]) * IMG_H];
    }
    const doorAt = (cx, cy) => { const p = screenToImage(cx, cy); return SLOTS.findIndex(sl => inPoly(p, sl.hit)); };
    function panLimits() {
      const va = innerWidth / innerHeight, fx = va > IA ? 1 : va / IA, fy = va > IA ? IA / va : 1;
      return [Math.max(0.04, (1 - fx * OVER) / 2 + 0.02), Math.max(0.03, (1 - fy * OVER) / 2 + 0.02)];
    }
    function centerOn(i) {
      const [lx, ly] = panLimits();
      st.panT = [Math.max(-lx, Math.min(lx, 0.5 - doors[i].uv[0])), Math.max(-ly, Math.min(ly, (0.5 - doors[i].uv[1]) * 0.4))];
    }

    function actsHTML(d, i, withStep) {
      const step = withStep ? `<button class="ph-btn ph-btn--brass" type="button" data-enter="${i}">${T(L.step)}</button>` : "";
      return step + d.links.filter(l => l[1]).map(([label, url]) => `<a class="ph-btn" href="${esc(url)}" target="_blank" rel="noopener">${T(label)}${ext}</a>`).join("");
    }
    function showCard(i) {
      const title = $("[data-title]"), sub = $("[data-sub]"), line = $("[data-line]"), acts = $("[data-acts]");
      if (i < 0) { title.textContent = t(L.introTitle); sub.textContent = t(L.introSub); line.textContent = t(L.introLine); acts.innerHTML = ""; return; }
      const d = doors[i];
      title.textContent = t(d.title); sub.textContent = t(d.sub); line.textContent = t(d.line);
      acts.innerHTML = actsHTML(d, i, true);
    }
    function select(i) {
      if (st.sel === i) return;
      st.sel = i; showCard(i);
      if (i >= 0) st.focusT = doors[i].uv.slice();
    }
    function enter(i) {
      if (st.busy || st.inside || i < 0) return;
      select(i); st.busy = true; st.lock = true;
      const d = doors[i];
      st.focusT = d.uv.slice(); centerOn(i);
      const start = performance.now(), z0 = st.zoom, dur = reduce.matches ? 1 : 1100;
      (function step(now) {
        if (!alive) return;
        const k = Math.min(1, (now - start) / dur), e = k * k * (3 - 2 * k);
        st.zoom = st.zoomT = z0 + (2.6 - z0) * e;
        st.fade = st.fadeT = Math.max(0, (k - 0.55) / 0.45) * 0.62;
        if (k < 1) { requestAnimationFrame(step); return; }
        if (d.target) { opts.navigate(d.target); return; }
        openRoom(i);
      })(start);
    }
    function openRoom(i) {
      const d = doors[i], room = $("[data-room]");
      $("[data-room-plate]").textContent = t(d.plate);
      $("[data-room-title]").textContent = t(d.title);
      $("[data-room-line]").textContent = t(d.line);
      $("[data-room-acts]").innerHTML = actsHTML(d, i, false);
      room.hidden = false; requestAnimationFrame(() => room.classList.add("is-on"));
      root.querySelector(".ph-ui").classList.add("is-inside");
      st.inside = true; st.busy = false;
      setTimeout(() => { const a = room.querySelector(".ph-btn"); if (a) a.focus(); }, 60);
    }
    function leaveRoom() {
      if (!st.inside) return;
      const room = $("[data-room]"); room.classList.remove("is-on");
      setTimeout(() => { room.hidden = true; }, reduce.matches ? 0 : 600);
      root.querySelector(".ph-ui").classList.remove("is-inside");
      st.inside = false; st.lock = false; st.zoomT = 0.35; st.fadeT = 0;
      canvas.focus({ preventScroll: true });
    }
    function reset() { if (st.inside) leaveRoom(); st.zoomT = 0; st.panT = [0, 0]; select(-1); st.focusT = [0.5, 0.52]; }

    /* data */
    function applyDoors(animate) {
      doors = buildDoors(pinsData);
      $("[data-doorlist]").innerHTML = doors.map((d, i) => `<button type="button" data-enter="${i}">${T(d.plate)}: ${T(d.title)}</button>`).join("");
      engrave(doors).then(() => { engraveT = 1; if (!animate) engraveV = 1; });
      hangPictures(doors);
      const keep = st.sel; st.sel = -2; select(keep < 0 ? -1 : keep);
    }

    /* input */
    const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
    const offs = [];
    on(canvas, "pointermove", e => {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5, my = (e.clientY - r.top) / r.height - 0.5;
      st.lastMove = performance.now();
      if (st.drag) {
        const dx = (e.clientX - st.drag.x) / r.width, dy = (e.clientY - st.drag.y) / r.height;
        const [lx, ly] = panLimits(), gain = innerWidth < 760 ? 1 : 0.35;
        st.panT = [Math.max(-lx, Math.min(lx, st.drag.pan[0] + dx * gain)), Math.max(-ly, Math.min(ly, st.drag.pan[1] - dy * gain))];
        if (Math.abs(dx) + Math.abs(dy) > 0.01) st.drag.moved = true;
        return;
      }
      st.parT = [-mx * 0.036, my * 0.024];
      if (st.inside || st.busy || !depthCPU) return;
      const i = doorAt(e.clientX, e.clientY);
      canvas.classList.toggle("on-door", i >= 0);
      if (i >= 0) select(i);
    });
    on(canvas, "pointerdown", e => {
      canvas.focus({ preventScroll: true });
      st.drag = { x: e.clientX, y: e.clientY, pan: st.panT.slice(), moved: false };
      canvas.classList.add("dragging");
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    on(canvas, "pointerup", e => {
      const d = st.drag; st.drag = null; canvas.classList.remove("dragging");
      if (d && !d.moved && !st.inside && depthCPU) {
        const i = doorAt(e.clientX, e.clientY);
        if (i >= 0) { if (e.pointerType === "touch" && st.sel !== i) { select(i); centerOn(i); } else enter(i); }
      }
    });
    on(canvas, "wheel", e => {
      e.preventDefault();
      if (st.inside || st.busy) return;
      st.zoomT = Math.max(0, Math.min(1.1, st.zoomT - e.deltaY * 0.0011));
    }, { passive: false });
    on(window, "keydown", e => {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.target.closest && e.target.closest("a, button") && (e.key === "Enter" || e.key === " ")) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { if (st.inside) leaveRoom(); else reset(); return; }
      if (st.inside || st.busy || e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === "w" || k === "arrowup") { st.held.f = true; e.preventDefault(); }
      else if (k === "s" || k === "arrowdown") { st.held.b = true; e.preventDefault(); }
      else if (k === "a" || k === "arrowleft") { const n = st.sel <= 0 ? doors.length - 1 : st.sel - 1; select(n); centerOn(n); e.preventDefault(); }
      else if (k === "d" || k === "arrowright") { const n = st.sel < 0 || st.sel >= doors.length - 1 ? 0 : st.sel + 1; select(n); centerOn(n); e.preventDefault(); }
      else if (k === "enter" || k === " ") { if (st.sel >= 0) { enter(st.sel); e.preventDefault(); } }
    });
    on(window, "keyup", e => { const k = e.key.toLowerCase(); if (k === "w" || k === "arrowup") st.held.f = false; if (k === "s" || k === "arrowdown") st.held.b = false; });
    on(root, "click", e => {
      const b = e.target.closest("[data-enter]"); if (b) { enter(+b.dataset.enter); return; }
      if (e.target.closest("[data-reset]")) { reset(); return; }
      if (e.target.closest("[data-room-back]")) leaveRoom();
    });
    on(root, "focusin", e => { const b = e.target.closest("[data-doorlist] [data-enter]"); if (b) select(+b.dataset.enter); });
    on(document, "visibilitychange", () => { if (!document.hidden && alive && !raf) raf = requestAnimationFrame(frame); });

    /* render loop */
    let last = performance.now();
    function frame(now) {
      raf = 0;
      if (!alive || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const ease = (a, b, r) => a + (b - a) * (1 - Math.exp(-r * dt));
      if (!st.lock) {
        if (st.held.f) st.zoomT = Math.min(1.1, st.zoomT + dt * 0.75);
        if (st.held.b) st.zoomT = Math.max(0, st.zoomT - dt * 0.75);
        st.zoom = ease(st.zoom, st.zoomT, 4.5);
        st.fade = ease(st.fade, st.fadeT, 4);
      }
      const idle = !reduce.matches && now - st.lastMove > 2500 && !st.drag;
      const drift = idle ? [Math.sin(now / 3300) * 0.012, Math.sin(now / 4700) * 0.008] : [0, 0];
      st.par = [ease(st.par[0], st.parT[0] + drift[0], 3), ease(st.par[1], st.parT[1] + drift[1], 3)];
      st.pan = [ease(st.pan[0], st.panT[0], 5), ease(st.pan[1], st.panT[1], 5)];
      st.focus = [ease(st.focus[0], st.focusT[0], 2.2), ease(st.focus[1], st.focusT[1], 2.2)];
      for (let i = 0; i < 6; i++) st.glow[i] = ease(st.glow[i], i === st.sel && !st.inside ? 1 : 0, 6);
      engraveV = ease(engraveV, engraveT, 6);
      for (let k = 0; k < 3; k++) coverState[k] = ease(coverState[k], coverTarget[k], 3);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.useProgram(prog);
      gl.uniform2f(U.uRes, w, h);
      gl.uniform2f(U.uPan, st.pan[0], st.pan[1]); gl.uniform2f(U.uPar, st.par[0], st.par[1]);
      gl.uniform2f(U.uFocus, st.focus[0], st.focus[1]); gl.uniform1f(U.uZoom, st.zoom);
      gl.uniform1f(U.uTime, reduce.matches ? 0 : now / 1000); gl.uniform1f(U.uFade, st.fade);
      gl.uniform3f(U.uGA, st.glow[0], st.glow[1], st.glow[2]); gl.uniform3f(U.uGB, st.glow[3], st.glow[4], st.glow[5]);
      gl.uniform1f(U.uAny, Math.max(...st.glow)); gl.uniform1f(U.uEngrave, engraveV);
      gl.uniform3f(U.uCOn, coverState[0], coverState[1], coverState[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    init().then(() => {
      if (!alive) return;
      applyDoors(false);
      const back = doors.findIndex(d => d.target && d.target === cameFrom);
      if (back >= 0 && !reduce.matches) {
        st.sel = -2; select(back);
        st.focus = doors[back].uv.slice(); st.focusT = st.focus.slice();
        st.zoom = 1.6; st.zoomT = 0; st.fade = 0.4; st.fadeT = 0;
        centerOn(back); st.pan = st.panT.slice();
      } else showCard(-1);
      $("[data-loading]").classList.add("is-done");
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }).catch(() => { const l = $("[data-loading]"); if (l) l.textContent = t(L.failed); });

    const cleanup = () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      offs.forEach(f => f());
      canvas.hidden = true;
      canvas.classList.remove("on-door", "dragging");
      document.body.classList.remove("on-photo-hall");
      mounted = null;
    };
    mounted = cleanup;
    return cleanup;
  }

  window.PhotoHall = { supported, mount };
})();
