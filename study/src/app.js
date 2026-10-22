import * as THREE from 'three';
import { clamp, lerp } from './common.js';
import { engrave, K } from './room.js';
import { buildWorld } from './world.js';
import { Pipeline } from './post.js';
import { state as S, t, L, projectList, loadPinned, projectCardHTML, demosHTML, aboutHTML, makePanel, setLang, applyStatic, site } from './ui.js';

/* The study, live. Look around, click the portrait / bookcase / Klein bottle / doors.
   Quality adapts: a tier is picked from the device, then lowered while the frame rate stays poor. */
const qs = new URLSearchParams(location.search);
if (qs.has('notrans')) document.documentElement.classList.add('notrans');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');
const DEG = Math.PI / 180;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = (s) => document.querySelector(s);
const canvas = $('#study'), poster = $('#poster'), loader = $('#loader'), intro = $('#intro'), fadeEl = $('#fade'), hsRoot = $('#hotspots');
await loadPinned();
const PROJECTS = projectList();
// The room opens on the ship in its bottle; the first turn of the portrait lands on the risk work.
const START = Math.max(0, PROJECTS.findIndex((p) => p.door.id === 'ship-in-bottle'));
const panel = makePanel(() => back());

const TIERS = {
  high: { dpr: 1.5, mp: 3.4, samples: 4, ao: true, aoSamples: 12, vol: true, volSteps: 40, dof: true, dofTaps: 32, tex: 'hi', shadow: { moon: 2048, lamp: 1024, fire: 1024 }, transmission: true, minorLights: true, clearcoat: true, envSize: 256, dust: 900, grain: 1 },
  medium: { dpr: 1.25, mp: 2.3, samples: 2, ao: true, aoSamples: 8, vol: true, volSteps: 26, dof: true, dofTaps: 18, tex: 'hi', shadow: { moon: 1024, lamp: 1024, fire: 512 }, transmission: false, minorLights: true, clearcoat: true, envSize: 256, dust: 700, grain: 1 },
  low: { dpr: 1, mp: 1.15, samples: 0, ao: false, aoSamples: 6, vol: false, volSteps: 16, dof: false, dofTaps: 12, tex: 'lo', shadow: { moon: 1024, lamp: 512, fire: 512 }, transmission: false, minorLights: false, clearcoat: false, envSize: 128, dust: 400, grain: 0.7 },
};
const TEX = {
  srgb: ['stone', 'oak', 'walnut', 'floor', 'desk', 'leather', 'paper', 'sheet', 'rock', 'bark', 'quarry', 'rug', 'books', 'p_hall', 'p_all', ...new Set(PROJECTS.map((p) => p.paint))],
  lin: ['stone_n', 'stone_orm', 'oak_n', 'walnut_n', 'floor_n', 'desk_n', 'desk_orm', 'leather_n', 'brass_orm', 'paper_n', 'rock_n', 'bark_n', 'bark_e', 'quarry_n', 'rug_n', 'canvas_n'],
};

let renderer = null, W = null, pipe = null, camera = null, Q = null, tierName = 'none', tex = null;
let ready = false, mode = 'home', cur = START, threeD = false;

/* ---------------------------------------------------------------- language */
function hintText() { return t(coarse.matches ? L.hintTouch : L.hintMouse); }
function zhPlaqueText() { return PROJECTS.map((p) => (p.door.plate.zh || '') + (p.room.plate.zh || '')).join('') + L.doorPlates.map((d) => d.zh.join('')).join(''); }
async function fontsReady(withZh) {
  const fonts = ['600 40px Cinzel', 'italic 40px "IM Fell English"', '40px "IM Fell English"'];
  const jobs = fonts.map((f) => document.fonts.load(f, 'Aa'));
  if (withZh) ['700 40px "Noto Serif TC"', '500 40px "Noto Serif TC"'].forEach((f) => jobs.push(document.fonts.load(f, zhPlaqueText())));
  try { await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 4500))]); } catch (e) { /* fonts are a nicety */ }
}
function engraveAll() {
  if (!W) return;
  const zh = S.lang === 'zh', p = PROJECTS[cur];
  engrave(W.RU.plaque, t(p.door.plate), t(p.room.plate), zh);
  W.RU.doors.forEach((d, i) => { const pl = L.doorPlates[i][S.lang] || L.doorPlates[i].en; engrave(d.plaque, pl[0], pl[1], zh); });
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', async () => {
  const l = b.getAttribute('data-lang'); if (l === S.lang) return;
  setLang(l);
  intro.querySelector('[data-hint]').textContent = hintText();
  hotspotLabels();
  if (panel.open) refreshPanel(false);
  if (l === 'zh') await fontsReady(true);
  engraveAll();
}));

/* ---------------------------------------------------------------- panels */
function refreshPanel(focus = true) {
  const k = panel.kind || mode;
  if (k === 'portrait') panel.show('portrait', projectCardHTML(PROJECTS[cur], cur, PROJECTS.length), { focus });
  else if (k === 'books') panel.show('books', demosHTML(), { focus });
  else if (k === 'about') panel.show('about', aboutHTML(), { focus });
}
panel.body.addEventListener('click', (e) => {
  const b = e.target.closest('[data-flip]'); if (!b) return;
  flip(+b.getAttribute('data-flip'), true);
});

/* ---------------------------------------------------------------- tiers */
function pickTier(gl) {
  const q = qs.get('q'); if (TIERS[q]) return q;
  let gpu = '';
  try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase(); } catch (e) { }
  const phone = coarse.matches && Math.min(screen.width, screen.height) < 820;
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(gpu) || phone) return 'low';
  if (/mali|adreno|powervr|apple gpu|intel|iris|uhd graphics|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics/.test(gpu) || (navigator.deviceMemory && navigator.deviceMemory <= 4)) return 'medium';
  return 'high';
}

/* ---------------------------------------------------------------- loading */
function progress(k, text) {
  const bar = loader.querySelector('[data-load-bar]'); if (bar) bar.style.width = Math.round(clamp(k, 0, 1) * 100) + '%';
  if (text) loader.querySelector('[data-load-text]').textContent = text;
}
async function loadTextures(set, onOne) {
  const base = set === 'lo' ? './tex/lo/' : './tex/';
  const ldr = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const out = {};
  const one = (name, srgb) => new Promise((res) => ldr.load(base + name + '.webp', (tx) => {
    tx.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = aniso; tx.name = name; out[name] = tx; onOne(); res();
  }, undefined, () => {
    // a missing painting falls back to the painting of every door; a missing material map to a flat colour
    if (!name.startsWith('p_')) { const d = new THREE.DataTexture(new Uint8Array(srgb ? [150, 140, 128, 255] : [128, 128, 255, 255]), 1, 1); d.needsUpdate = true; out[name] = d; }
    onOne(); res();
  }));
  await Promise.all([...TEX.srgb.map((n) => one(n, true)), ...TEX.lin.map((n) => one(n, false))]);
  return out;
}
const paint = (i) => tex[PROJECTS[i].paint] || tex.p_all;

/* ---------------------------------------------------------------- camera rig */
const rig = { eye: V3(1.15, 1.72, 4.42), yaw: 0, pitch: 0, fov: 54, focus: 5.2, ap: 0.00045, exp: 1, lim: [1.5, 0.55, 0.85], look: { yaw: 0, pitch: 0 }, lookT: { yaw: 0, pitch: 0 }, sway: { x: 0, y: 0 }, swayT: { x: 0, y: 0 }, zoom: 0, zoomT: 0, tween: null };
const HOME = { eye: V3(1.15, 1.72, 4.42), target: V3(-0.15, 2.35, -3.6), fov: 54, ap: 0.00045, exp: 1, lim: [1.5, 0.55, 0.85], panel: false, focus: 5.2 };
function fitFov(f) { const a = innerWidth / Math.max(1, innerHeight); if (a >= 1.3) return f; return Math.min(80, 2 * Math.atan(Math.tan(f * DEG / 2) * 1.3 / a) / DEG); }
function panelOffset() {
  const w = innerWidth, h = innerHeight;
  if (w > 760) return { x: -(Math.min(440, w * 0.4) + 20) / w, y: 0 };
  return { x: 0, y: (Math.min(h * 0.6, 560) - 40) / h };
}
function viewFor(name) {
  if (name === 'portrait') return { eye: V3(0.35, 2.05, -0.2), target: W.RU.anim.portrait.localToWorld(V3(0, -0.24, 0)), fov: 38, ap: 0.0011, exp: 0.95, lim: [0.38, 0.22, 0.25], panel: true };
  if (name === 'books') { const w = W.walls[K.BL]; return { eye: w.localToWorld(V3(-1.6, 1.62, 4.3)), target: w.localToWorld(V3(0.5, 1.45, 0.1)), fov: 42, ap: 0.0008, exp: 1.1, lim: [0.4, 0.22, 0.3], panel: true }; }
  if (name === 'about') return { eye: V3(0.98, 1.3, 1.86), target: W.dress.kleinGroup.localToWorld(V3(0, 0.12, 0)), fov: 30, ap: 0.0032, exp: 1.18, lim: [0.32, 0.2, 0.2], panel: true };
  return HOME;
}
function aim(v) {
  const d = v.target.clone().sub(v.eye); const dist = d.length(); d.normalize();
  let yaw = Math.atan2(d.x, -d.z), pitch = Math.asin(clamp(d.y, -1, 1));
  if (v.panel) {
    const o = panelOffset(), vf = fitFov(v.fov) * DEG / 2, hf = Math.atan(Math.tan(vf) * innerWidth / innerHeight);
    yaw -= Math.atan(o.x * Math.tan(hf)); pitch -= Math.atan(o.y * Math.tan(vf));
  }
  return { yaw, pitch, dist: v.focus || dist };
}
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function setView(v, { instant = false, dur = 1500 } = {}) {
  if (typeof v === 'string') v = viewFor(v);
  const a = aim(v);
  const to = { eye: v.eye.clone(), yaw: a.yaw, pitch: a.pitch, fov: v.fov, focus: a.dist, ap: v.ap, exp: v.exp || 1 };
  rig.lim = v.lim;
  const from = { eye: rig.eye.clone(), yaw: rig.yaw + rig.look.yaw, pitch: rig.pitch + rig.look.pitch, fov: rig.fov + rig.zoom, focus: rig.focus, ap: rig.ap, exp: rig.exp };
  rig.look.yaw = rig.lookT.yaw = 0; rig.look.pitch = rig.lookT.pitch = 0; rig.zoom = rig.zoomT = 0;
  if (instant || reduce.matches) { rig.tween = null; Object.assign(rig, { yaw: to.yaw, pitch: to.pitch, fov: to.fov, focus: to.focus, ap: to.ap, exp: to.exp }); rig.eye.copy(to.eye); if (!instant) dip(); return; }
  from.yaw = to.yaw + wrapA(from.yaw - to.yaw);
  rig.tween = { from, to, t0: performance.now(), dur: dur * clamp(from.eye.distanceTo(to.eye) / 4 + 0.55, 0.6, 1.15) };
}
function dip() { fadeEl.classList.add('is-on'); setTimeout(() => fadeEl.classList.remove('is-on'), 180); }
function updateRig(now, dt) {
  const tw = rig.tween;
  if (tw) {
    const k = clamp((now - tw.t0) / tw.dur, 0, 1), e = ease(k), a = tw.from, b = tw.to;
    rig.eye.lerpVectors(a.eye, b.eye, e); rig.eye.y += Math.sin(Math.PI * e) * Math.min(0.22, a.eye.distanceTo(b.eye) * 0.05);
    rig.yaw = lerp(a.yaw, b.yaw, e); rig.pitch = lerp(a.pitch, b.pitch, e); rig.fov = lerp(a.fov, b.fov, e);
    rig.focus = lerp(a.focus, b.focus, e); rig.ap = lerp(a.ap, b.ap, e); rig.exp = lerp(a.exp, b.exp, e);
    if (k >= 1) rig.tween = null;
  }
  const s = 1 - Math.exp(-dt * 9), s2 = 1 - Math.exp(-dt * 3);
  rig.look.yaw += (rig.lookT.yaw - rig.look.yaw) * s; rig.look.pitch += (rig.lookT.pitch - rig.look.pitch) * s;
  rig.zoom += (rig.zoomT - rig.zoom) * s;
  rig.sway.x += (rig.swayT.x - rig.sway.x) * s2; rig.sway.y += (rig.swayT.y - rig.sway.y) * s2;
  const yaw = rig.yaw + rig.look.yaw + rig.sway.x, pitch = clamp(rig.pitch + rig.look.pitch + rig.sway.y, -1.3, 1.3);
  camera.position.copy(rig.eye);
  camera.lookAt(rig.eye.x + Math.sin(yaw) * Math.cos(pitch), rig.eye.y + Math.sin(pitch), rig.eye.z - Math.cos(yaw) * Math.cos(pitch));
  camera.fov = fitFov(clamp(rig.fov + rig.zoom, 20, 80)); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/* ---------------------------------------------------------------- hotspots */
const HS = [
  { id: 'portrait', at: () => W.RU.anim.portrait.localToWorld(V3(0.86, -0.6, 0.16)) },
  { id: 'books', at: () => W.walls[K.BL].localToWorld(V3(0.63, 1.9, 0.5)) },
  { id: 'klein', at: () => W.dress.kleinGroup.localToWorld(V3(0, 0.31, 0)) },
  { id: 'hall', at: () => W.walls[K.LEFT].localToWorld(V3(0, 1.62, 0.1)) },
  { id: 'all', at: () => W.walls[K.RIGHT].localToWorld(V3(0, 1.62, 0.1)) },
];
function buildHotspots() {
  hsRoot.innerHTML = HS.map((h) => `<button class="hs is-off" type="button" data-hs="${h.id}"><span class="hs__dot"></span><span class="hs__label"></span></button>`).join('');
  HS.forEach((h) => { h.el = hsRoot.querySelector(`[data-hs="${h.id}"]`); h.el.addEventListener('click', () => go(h.id, h.el)); });
  hotspotLabels();
}
function hotspotLabels() {
  HS.forEach((h) => { if (!h.el) return; h.el.querySelector('.hs__label').textContent = t(L.hs[h.id]); h.el.setAttribute('aria-label', t(L.hsLong[h.id])); });
}
const _v = V3(0, 0, 0);
function updateHotspots() {
  const w = innerWidth, h = innerHeight, show = mode === 'home' && !rig.tween && ready;
  for (const s of HS) {
    if (!s.el) continue;
    let vis = show;
    if (vis) {
      _v.copy(s.at()).project(camera);
      const x = (_v.x + 1) / 2 * w, y = (1 - _v.y) / 2 * h;
      vis = _v.z < 1 && x > 16 && x < w - 16 && y > 64 && y < h - 16;
      if (vis) { s.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; s.el.classList.toggle('hs--left', x > w * 0.62); }
    }
    if (s.vis !== vis) { s.vis = vis; s.el.classList.toggle('is-off', !vis); s.el.tabIndex = vis ? 0 : -1; }
  }
}

/* ---------------------------------------------------------------- picking */
const proxies = [];
const raycaster = new THREE.Raycaster();
function addProxies() {
  const pm = new THREE.MeshBasicMaterial({ visible: false });
  const box = (parent, w, h, d, x, y, z, id) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pm); m.position.set(x, y, z); m.userData.hs = id; parent.add(m); proxies.push(m); };
  box(W.RU.anim.portrait, 1.95, 1.75, 0.16, 0, -0.18, 0, 'portrait');
  box(W.walls[K.BL], 5.2, 4.7, 0.6, 0, 2.35, 0.3, 'books');
  box(W.dress.kleinGroup, 0.26, 0.36, 0.26, 0, 0.18, 0, 'klein');
  box(W.walls[K.LEFT], 1.7, 3.5, 0.5, 0, 1.75, -0.2, 'hall');
  box(W.walls[K.RIGHT], 1.7, 3.5, 0.5, 0, 1.75, -0.2, 'all');
  box(W.desk, 1.86, 0.8, 1.16, 0, 0.4, 0, null);
  box(W.chair, 0.64, 1.45, 0.6, 0, 0.72, 0, null);
}
function pick(cx, cy) {
  const r = canvas.getBoundingClientRect();
  raycaster.setFromCamera({ x: (cx - r.left) / r.width * 2 - 1, y: -((cy - r.top) / r.height * 2 - 1) }, camera);
  const hit = raycaster.intersectObjects(proxies, false)[0];
  return hit ? hit.object.userData.hs : null;
}

/* ---------------------------------------------------------------- what the room does */
const anim = { flip: null, books: { open: 0, from: 0, to: 0, t0: 0, dur: 1 }, spin: null, spinV: 0, door: null };
function go(id, from = null) {
  if (mode === 'leaving') return;
  hideIntro();
  if (!threeD) { // flat fallback: just the panels
    if (id === 'portrait') { mode = 'portrait'; panel.show('portrait', projectCardHTML(PROJECTS[cur], cur, PROJECTS.length), { from }); }
    else if (id === 'books') { mode = 'books'; panel.show('books', demosHTML(), { from }); }
    else if (id === 'klein') { mode = 'about'; panel.show('about', aboutHTML(), { from }); }
    else if (id === 'hall' || id === 'all') location.href = site(id === 'hall' ? '#/' : '#/doors');
    return;
  }
  if (id === 'portrait' || id === 'portrait-nav') {
    closeBooks();
    if (mode !== 'portrait') { mode = 'portrait'; setView('portrait'); }
    if (id === 'portrait') flip(+1, false, from); else panel.show('portrait', projectCardHTML(PROJECTS[cur], cur, PROJECTS.length), { from });
    return;
  }
  if (id === 'books') {
    if (mode === 'books') return;
    mode = 'books'; setView('books'); openBooks(true);
    panel.show('books', demosHTML(), { from });
    return;
  }
  if (id === 'klein') {
    if (mode !== 'about') { closeBooks(); mode = 'about'; setView('about'); anim.spin = { t0: performance.now(), dur: 1900 }; }
    panel.show('about', aboutHTML(), { from });
    return;
  }
  if (id === 'hall' || id === 'all') leave(id);
}
function back() {
  if (mode === 'leaving') return;
  panel.hide();
  if (!threeD) { mode = 'home'; return; }
  if (mode === 'home') return;
  closeBooks();
  mode = 'home'; setView('home');
}
function flip(dir, fromCard = false, from = null) {
  if (!threeD) { cur = (cur + dir + PROJECTS.length) % PROJECTS.length; panel.show('portrait', projectCardHTML(PROJECTS[cur], cur, PROJECTS.length), { focus: !fromCard }); return; }
  const pv = W.RU.anim.portrait;
  if (anim.flip) { pv.rotation.y = anim.flip.to; engraveAll(); anim.flip = null; }
  const n = PROJECTS.length; cur = (cur + dir + n) % n;
  const showingA = Math.cos(pv.rotation.y) > 0;
  (showingA ? W.RU.anim.faceB : W.RU.anim.faceA).map = paint(cur);
  anim.flip = { from: pv.rotation.y, to: pv.rotation.y + Math.PI * dir, t0: performance.now(), dur: reduce.matches ? 1 : 1150, engraved: false };
  panel.show('portrait', projectCardHTML(PROJECTS[cur], cur, PROJECTS.length), { focus: !fromCard, from });
  if (fromCard) { const b = panel.body.querySelector(`[data-flip="${dir}"]`); if (b) b.focus({ preventScroll: true }); }
}
function openBooks(open) {
  const b = anim.books, to = open ? 1.1 : 0;
  if (b.to === to) return;
  b.from = b.open; b.to = to; b.t0 = performance.now(); b.dur = reduce.matches ? 300 : (open ? 1500 : 1100);
}
function closeBooks() { openBooks(false); }
function leave(id) {
  mode = 'leaving'; panel.hide(); hideIntro();
  const d = W.RU.doors[id === 'hall' ? 0 : 1], w = d.wall, quick = reduce.matches;
  // walk up to the door, let it swing open onto the place it leads to, then go there
  if (!quick) setView({ eye: w.localToWorld(V3(0.12, 1.66, 2.4)), target: w.localToWorld(V3(0, 1.62, -1.2)), fov: 50, ap: 0.0004, exp: 1, lim: [0, 0, 0], panel: false }, { dur: 1100 });
  anim.door = { hinge: d.hinge, t0: performance.now() + (quick ? 0 : 700), dur: 1000 };
  setTimeout(() => fadeEl.classList.add('is-on'), quick ? 0 : 1450);
  setTimeout(() => { location.href = site(id === 'hall' ? '#/' : '#/doors'); }, quick ? 350 : 2050);
}
addEventListener('pageshow', (e) => {
  if (!e.persisted || mode !== 'leaving') return;
  fadeEl.classList.remove('is-on'); anim.door = null;
  if (W) W.RU.doors.forEach((d) => { d.hinge.rotation.y = 0; });
  mode = 'home'; if (threeD) setView('home', { instant: true });
});
function updateAnims(now, time) {
  const f = anim.flip;
  if (f) {
    const k = clamp((now - f.t0) / f.dur, 0, 1);
    W.RU.anim.portrait.rotation.y = lerp(f.from, f.to, ease(k));
    if (k >= 0.5 && !f.engraved) { f.engraved = true; engraveAll(); }
    if (k >= 1) { W.RU.anim.portrait.rotation.y = wrapA(f.to); anim.flip = null; }
  }
  const b = anim.books;
  if (b.open !== b.to) {
    const k = clamp((now - b.t0) / b.dur, 0, 1);
    b.open = lerp(b.from, b.to, ease(k));
    if (k >= 1) b.open = b.to;
    W.RU.books.pivot.rotation.y = b.open;
    W.lights.passage.intensity = 9 * Math.min(1, b.open / 0.4);
    if (tierName !== 'low' || b.open === b.to) renderer.shadowMap.needsUpdate = true;
  }
  let spin = 0;
  if (anim.spin) { const k = clamp((now - anim.spin.t0) / anim.spin.dur, 0, 1); spin = ease(k) * Math.PI * 2; if (k >= 1) anim.spin = null; }
  W.dress.klein.rotation.y = -0.35 + 0.3 * Math.sin(time * 0.35) + spin;
  if (anim.door) { const k = clamp((now - anim.door.t0) / anim.door.dur, 0, 1); anim.door.hinge.rotation.y = 1.35 * ease(k); }
}

/* ---------------------------------------------------------------- intro */
let introTimer = 0;
function showIntro() {
  intro.querySelector('[data-hint]').textContent = hintText();
  intro.hidden = false; hsRoot.classList.add('is-intro');
  introTimer = setTimeout(() => hsRoot.classList.remove('is-intro'), 12000);
}
function hideIntro() {
  hsRoot.classList.remove('is-intro'); clearTimeout(introTimer);
  if (intro.hidden || intro.classList.contains('is-leaving')) return;
  intro.classList.add('is-leaving'); setTimeout(() => { intro.hidden = true; intro.classList.remove('is-leaving'); }, 600);
}
intro.querySelector('[data-intro-ok]').addEventListener('click', () => hideIntro());

/* ---------------------------------------------------------------- input */
let drag = null, hoverId = null, lastMove = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!ready || mode === 'leaving') return;
  if (e.button !== undefined && e.button > 0) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (er) { }
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
});
canvas.addEventListener('pointermove', (e) => {
  if (!ready) return;
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6) {
      if (!canvas.classList.contains('is-dragging')) { canvas.classList.add('is-dragging'); hideIntro(); }
      const k = 2 * Math.atan(Math.tan(camera.fov * DEG / 2) * camera.aspect) / innerWidth * 1.25;
      rig.lookT.yaw = clamp(rig.lookT.yaw - dx * k, -rig.lim[0], rig.lim[0]);
      rig.lookT.pitch = clamp(rig.lookT.pitch + dy * k, -rig.lim[1], rig.lim[2]);
    }
    return;
  }
  if (e.pointerType === 'mouse') lastMove = { x: e.clientX, y: e.clientY };
});
function endDrag(e, click) {
  if (!drag || e.pointerId !== drag.id) return;
  const wasClick = click && drag.moved <= 6; drag = null; canvas.classList.remove('is-dragging');
  if (wasClick) { const id = pick(e.clientX, e.clientY); if (id) go(id); }
}
canvas.addEventListener('pointerup', (e) => endDrag(e, true));
canvas.addEventListener('pointercancel', (e) => endDrag(e, false));
canvas.addEventListener('pointerleave', () => { lastMove = null; rig.swayT.x = rig.swayT.y = 0; setHover(null); });
canvas.addEventListener('wheel', (e) => {
  if (!ready) return; e.preventDefault();
  rig.zoomT = clamp(rig.zoomT + Math.sign(e.deltaY) * Math.min(4, Math.abs(e.deltaY) * 0.03), -22, 8);
}, { passive: false });
function setHover(id) {
  if (id === hoverId) return; hoverId = id;
  canvas.classList.toggle('is-hot', !!id);
  HS.forEach((h) => h.el && h.el.classList.toggle('is-hot', h.id === id));
}
function updateHover() {
  if (!lastMove || drag) return;
  const m = lastMove; lastMove = null;
  setHover(mode === 'leaving' ? null : pick(m.x, m.y));
  if (!reduce.matches) { rig.swayT.x = (m.x / innerWidth - 0.5) * 0.05; rig.swayT.y = -(m.y / innerHeight - 0.5) * 0.035; }
}
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (panel.open || mode !== 'home') { e.preventDefault(); back(); } else hideIntro(); return; }
  const tgt = e.target instanceof Element ? e.target : null;
  if (!ready || mode === 'leaving' || !threeD || (tgt && tgt.closest('input, textarea, #panel'))) return;
  const step = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
  if (step) { e.preventDefault(); hideIntro(); rig.lookT.yaw = clamp(rig.lookT.yaw + step[0], -rig.lim[0], rig.lim[0]); rig.lookT.pitch = clamp(rig.lookT.pitch + step[1], -rig.lim[1], rig.lim[2]); }
  if (e.key === '+' || e.key === '=') rig.zoomT = clamp(rig.zoomT - 4, -22, 8);
  if (e.key === '-') rig.zoomT = clamp(rig.zoomT + 4, -22, 8);
});
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  const g = b.getAttribute('data-go');
  go(g === 'portrait' ? 'portrait-nav' : g, b);
}));

/* ---------------------------------------------------------------- size and quality */
function resize() {
  if (!renderer) return;
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, Q.dpr);
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
  let iw = w * dpr * Q.scale, ih = h * dpr * Q.scale;
  const mp = iw * ih / 1e6; if (mp > Q.mp) { const k = Math.sqrt(Q.mp / mp); iw *= k; ih *= k; }
  pipe.setSize(iw, ih);
  if (ready && mode !== 'home' && mode !== 'leaving') setView(mode, { instant: true });
}
addEventListener('resize', () => resize());
const gov = { ema: 16.7, slow: 0, warm: 0, steps: 0 };
function governor(dtMs) {
  if (qs.has('nogov') || dtMs > 250 || document.hidden) return;
  if (gov.warm < 75) { gov.warm++; return; }
  gov.ema += (dtMs - gov.ema) * 0.06;
  gov.slow = gov.ema > 25 ? gov.slow + dtMs : Math.max(0, gov.slow - dtMs * 0.5);
  if (gov.slow < 1800) return;
  gov.slow = 0; gov.warm = 40; gov.ema = 16.7; gov.steps++;
  if (Q.ao) Q.ao = false;
  else if (Q.scale > 0.86) { Q.scale = 0.85; resize(); }
  else if (Q.vol) Q.vol = false;
  else if (pipe.samples > 0) pipe.setSamples(0);
  else if (Q.scale > 0.73) { Q.scale = 0.72; resize(); }
  else if (Q.dof) Q.dof = false;
  else if (Q.scale > 0.55) { Q.scale = Math.max(0.55, Q.scale * 0.85); resize(); }
}

/* ---------------------------------------------------------------- loop */
let last = 0; const t0 = performance.now();
const volCol = new THREE.Color(0.55, 0.66, 1.0);
let raf = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  try { step(now); } catch (e) { cancelAnimationFrame(raf); console.error('[study]', e); fallback('failed'); }
}
function step(now) {
  const dtMs = last ? now - last : 16.7; last = now;
  const dt = Math.min(0.1, dtMs / 1000), time = (now - t0) / 1000 + 3;
  W.tick(time);
  updateAnims(now, time);
  updateHover();
  updateRig(now, dt);
  updateHotspots();
  renderer.info.reset();
  pipe.render(W.scene, camera, {
    focus: rig.focus, aperture: rig.ap, dof: Q.dof, exposure: 1.5 * rig.exp, bloom: 0.42, bloomTh: 1.0, time,
    ao: Q.ao, aoRadius: 0.4, aoI: 1.0, aoMix: 0.8, sat: 0.94, grain: Q.grain,
    vol: Q.vol ? { density: 0.11, color: volCol, winO: W.vol.winO, winX: W.vol.winX, winN: W.vol.winN, moon: W.vol.moon } : null,
  });
  governor(dtMs);
}
document.addEventListener('visibilitychange', () => { last = 0; gov.warm = Math.min(gov.warm, 40); });

/* ---------------------------------------------------------------- boot */
function fallback(reason) {
  threeD = false; ready = true;
  if (renderer) { try { renderer.dispose(); } catch (e) { } }
  canvas.hidden = true; loader.hidden = true; hsRoot.hidden = true; poster.classList.remove('is-gone'); poster.classList.add('is-fallback');
  intro.querySelector('[data-intro-line]').textContent = t(reason === 'nogl' ? L.fallback : L.failed);
  intro.querySelector('[data-hint]').textContent = '';
  intro.querySelector('[data-intro-ok]').hidden = true;
  intro.classList.add('intro--fallback'); intro.hidden = false;
}
async function boot() {
  applyStatic();
  progress(0.03);
  let gl = null;
  try { gl = canvas.getContext('webgl2', { antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
  if (!gl || qs.has('flat')) return fallback('nogl');
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, stencil: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return fallback('nogl'); }
  tierName = pickTier(gl);
  Q = { ...TIERS[tierName], scale: 1 };
  renderer.autoClear = false; renderer.setClearColor(0x050302, 1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NoToneMapping; renderer.transmissionResolutionScale = 0.5;
  renderer.info.autoReset = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fallback('failed'); });

  await fontsReady(S.lang === 'zh');
  progress(0.08);
  const total = TEX.srgb.length + TEX.lin.length; let done = 0;
  tex = await loadTextures(Q.tex, () => { done++; progress(0.08 + 0.62 * done / total); });
  progress(0.72, t(L.preparing));
  await new Promise((r) => setTimeout(r, 30));

  W = buildWorld(renderer, tex, Q);
  W.RU.anim.faceA.map = paint(cur); W.RU.anim.faceB.map = paint((cur + 1) % PROJECTS.length);
  engraveAll();
  addProxies();
  camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.05, 40);
  pipe = new Pipeline(renderer, { samples: Q.samples, dofTaps: Q.dofTaps, aoSamples: Q.aoSamples, volSteps: Q.volSteps });
  setView('home', { instant: true });
  updateRig(performance.now(), 0.016);
  resize();
  progress(0.8);
  try { await Promise.race([renderer.compileAsync(W.scene, camera), new Promise((r) => setTimeout(r, 12000))]); } catch (e) { /* compile on first frame instead */ }
  progress(0.92);
  W.refreshEnv();
  W.tick(3); updateAnims(performance.now(), 3); updateRig(performance.now(), 0.016);
  pipe.render(W.scene, camera, { focus: rig.focus, aperture: rig.ap, dof: Q.dof, exposure: 1.5, bloom: 0.42, bloomTh: 1, time: 3, ao: Q.ao, aoRadius: 0.4, aoI: 1, aoMix: 0.8, sat: 0.94, grain: Q.grain, vol: null });
  progress(1);
  threeD = true; ready = true;
  buildHotspots();
  requestAnimationFrame(frame);
  setTimeout(() => { poster.classList.add('is-gone'); loader.classList.add('is-done'); setTimeout(() => { loader.hidden = true; }, 700); showIntro(); }, 120);
  window.__study.tier = tierName;
}

window.__study = {
  get mode() { return mode; }, get ready() { return ready; }, get cur() { return cur; }, go, back,
  info: () => renderer && ({ tier: tierName, scale: Q.scale, ao: Q.ao, vol: Q.vol, dof: Q.dof, samples: pipe.samples, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, programs: renderer.info.programs.length, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, merged: W.merged, gov: { ...gov } }),
  pickAt: (x, y) => pick(x, y),
  debug: {
    door: (i, a) => { W.RU.doors[i].hinge.rotation.y = a; },
    look: (yaw, pitch) => { rig.lookT.yaw = rig.look.yaw = yaw; rig.lookT.pitch = rig.look.pitch = pitch; },
    view: (eye, target, fov = 40) => { setView({ eye: V3(...eye), target: V3(...target), fov, ap: 0.0004, exp: 1, lim: [1.5, 0.6, 0.8], panel: false }, { instant: true }); },
    wallPoint: (k, p) => W.walls[k].localToWorld(V3(...p)).toArray(),
    scene: () => W.scene,
  },
  screenOf: (id) => { const h = HS.find((s) => s.id === id); if (!h) return null; const v = h.at().project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, z: v.z }; },
};
boot().catch((e) => { console.error('[study]', e); fallback('failed'); });
