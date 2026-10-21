import * as THREE from 'three';
import { ExtrudeGeometry } from 'three';
import { ParametricGeometry } from 'three';
import { rng, makeNoise, sweep, roundRectPath, boxUV, planarUV, lathe, rep, softSprite, shapeFrom } from './common.js';
import { gildedFrame, HW, HV, RV, K, WIN } from './room.js';

const add = (parent, geo, mat, x = 0, y = 0, z = 0, { cast = true, recv = true, rx = 0, ry = 0, rz = 0 } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m;
};
const box = (sx, sy, sz, grain = 'long') => boxUV(new THREE.BoxGeometry(sx, sy, sz), { grain });
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const toTex = (c, aniso = 8) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

// ---------------------------------------------------------------- candles (shared flame registry)
export const FLAMES = [];
export function candle(M, { h = 0.22, r = 0.02, seed = 1, drip = true } = {}) {
  const g = new THREE.Group();
  const N = makeNoise(seed);
  const pts = []; for (let i = 0; i <= 18; i++) pts.push([r, i / 18 * h]);
  const geo = lathe([[0, 0], ...pts, [r * 0.9, h + 0.004], [r * 0.5, h - 0.003], [0, h - 0.004]], 24);
  if (drip) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const rr = Math.hypot(x, z); if (rr < 1e-4) continue; const a = Math.atan2(z, x); const d = Math.max(0, Math.sin(a * 5 + seed) * N.fbm(a * 2 + seed, y * 30, 3) - 0.22) * r * 0.35 * Math.min(1, (h - y) / (h * 0.6) + 0.2); const k = (rr + d) / rr; p.setX(i, x * k); p.setZ(i, z * k); }
    geo.computeVertexNormals();
  }
  add(g, geo, M.wax, 0, 0, 0);
  add(g, new THREE.CylinderGeometry(0.0012, 0.0012, 0.012, 5), M.black, 0, h + 0.004, 0, { cast: false });
  const fp = []; for (let i = 0; i <= 14; i++) { const t = i / 14; fp.push([Math.sin(t * Math.PI) * 0.0075 * (1 - t * 0.55), t * 0.036]); }
  const flame = add(g, lathe(fp, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(14, 6.2, 1.8) }), 0, h + 0.006, 0, { cast: false, recv: false }); flame.scale.setScalar(1.25);
  const core = add(g, lathe(fp.map(([a, b]) => [a * 0.45, b * 0.5]), 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.4, 6.0) }), 0, h + 0.004, 0, { cast: false, recv: false });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SPR(), color: new THREE.Color(1.0, 0.5, 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(0.16, 0.2, 1); glow.material.opacity = 0.6; glow.position.y = h + 0.024; g.add(glow);
  flame.userData.dynamic = core.userData.dynamic = true;
  FLAMES.push({ flame, core, glow, seed });
  g.userData.flameY = h + 0.024;
  return g;
}
let _spr = null; const SPR = () => (_spr = _spr || softSprite(64));

export function brassCandlestick(M, h = 0.26, seed = 1) {
  const g = new THREE.Group();
  add(g, lathe([[0, 0], [0.065, 0], [0.068, 0.008], [0.06, 0.016], [0.04, 0.024], [0.022, 0.034], [0.018, 0.05], [0.024, 0.06], [0.014, 0.075], [0.016, h * 0.55], [0.024, h * 0.6], [0.013, h * 0.68], [0.014, h - 0.03], [0.03, h - 0.02], [0.032, h - 0.008], [0.02, h], [0, h]], 32), M.brass);
  const c = candle(M, { h: 0.2, r: 0.0125, seed }); c.position.y = h - 0.004; g.add(c);
  g.userData.flameY = h + c.userData.flameY;
  return g;
}

// ---------------------------------------------------------------- canvases for paper props
function pageCanvas(paperImg, kind) {
  const W = 1024, H = 1400; const c = cv(W, H), x = c.getContext('2d');
  if (paperImg && paperImg.width) x.drawImage(paperImg, Math.random() * 0, 0, paperImg.width * 0.5, paperImg.height * 0.9, 0, 0, W, H); else { x.fillStyle = '#e6d6b0'; x.fillRect(0, 0, W, H); }
  x.globalCompositeOperation = 'multiply';
  const ink = 'rgba(48,30,16,';
  const R = rng(kind.length * 7 + 3);
  x.fillStyle = ink + '0.88)'; x.textBaseline = 'alphabetic';
  if (kind === 'notes') {
    x.fillStyle = 'rgba(40,22,10,0.95)'; x.font = 'italic 54px "IM Fell English", serif'; x.fillText('De lagena Kleiniana', 90, 140);
    x.font = 'italic 36px "IM Fell English", serif';
    const lines = ['A surface with no inside and no outside;', 'the neck passes through its own wall', 'and returns as the base. One side only.', '', 'Like a good portfolio, it folds back', 'into itself: every room leads to', 'another room, every door to a door.', '', 'Hurst H = 0.72  persistent, not random.', 'Risk is a shape before it is a number.', '', 'Note: try the bookcase, third bay.'];
    lines.forEach((l, i) => x.fillText(l, 90, 222 + i * 54));
    x.strokeStyle = ink + '0.7)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(90, 900); x.lineTo(930, 900); x.stroke();
    // little R/S plot
    x.lineWidth = 2.5; x.beginPath(); for (let i = 0; i <= 40; i++) { const px = 120 + i * 18, py = 1260 - i * 6.5 - Math.sin(i * 0.7) * 10 - R() * 14; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.lineWidth = 1.5; x.beginPath(); x.moveTo(120, 1300); x.lineTo(120, 960); x.moveTo(120, 1300); x.lineTo(900, 1300); x.stroke();
    x.font = 'italic 26px "IM Fell English", serif'; x.fillText('log R/S', 130, 990); x.fillText('log n', 840, 1290);
  } else if (kind === 'klein') {
    x.fillStyle = 'rgba(40,22,10,0.95)'; x.font = 'italic 46px "IM Fell English", serif'; x.fillText('Fig. III  the bottle that holds itself', 80, 120);
    x.strokeStyle = 'rgba(40,22,10,0.9)'; x.lineWidth = 5;
    x.beginPath(); x.ellipse(520, 760, 230, 330, 0, 0.35, Math.PI * 2 - 0.35); x.stroke();
    x.beginPath(); x.moveTo(700, 560); x.bezierCurveTo(900, 380, 860, 160, 640, 220); x.bezierCurveTo(470, 270, 470, 520, 540, 640); x.bezierCurveTo(580, 760, 560, 900, 520, 1040); x.stroke();
    x.setLineDash([10, 10]); x.beginPath(); x.moveTo(540, 640); x.bezierCurveTo(600, 800, 470, 980, 520, 1080); x.stroke(); x.setLineDash([]);
    x.font = 'italic 28px "IM Fell English", serif';
    ['neck', 'self-intersection', 'base'].forEach((t, i) => x.fillText(t, [830, 600, 300][i], [250, 700, 1150][i]));
    for (let i = 0; i < 9; i++) { x.globalAlpha = 0.5; x.fillText('—  ' + ['u ∈ [0, π]', 'v ∈ [0, 2π]', 'χ = 0', 'non-orientable', 'genus 2 (cross-caps)', 'immersed in R³', 'embedded in R⁴', '', 'see p. 117'][i], 90, 1220 + i * 0 + (i % 3) * 40 + Math.floor(i / 3) * 0); x.globalAlpha = 1; if (i > 1) break; }
  } else if (kind === 'chart') {
    x.font = '600 34px Cinzel, serif'; x.fillText('BTC · 1h · VOLUME TERRAIN', 70, 100);
    x.strokeStyle = ink + '0.25)'; x.lineWidth = 1;
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(70, 180 + i * 120); x.lineTo(960, 180 + i * 120); x.stroke(); }
    let p = 700;
    for (let i = 0; i < 44; i++) {
      const o = p, cl = p + (R() - 0.48) * 90; const hi = Math.min(o, cl) - R() * 50, lo = Math.max(o, cl) + R() * 50; p = cl;
      const px = 90 + i * 20; x.strokeStyle = ink + '0.85)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px, hi); x.lineTo(px, lo); x.stroke();
      x.fillStyle = cl < o ? ink + '0.85)' : 'rgba(150,40,30,0.85)'; x.fillRect(px - 6, Math.min(o, cl), 12, Math.max(3, Math.abs(cl - o)));
    }
    x.fillStyle = ink + '0.6)'; for (let i = 0; i < 44; i++) { const hh = 20 + R() * 120; x.fillRect(84 + i * 20, 1260 - hh, 12, hh); }
    x.font = 'italic 28px "IM Fell English", serif'; x.fillStyle = 'rgba(140,30,20,0.85)'; x.fillText('spike! H > 0.7 — hold the line', 420, 330);
    x.strokeStyle = 'rgba(140,30,20,0.8)'; x.lineWidth = 3; x.beginPath(); x.ellipse(560, 420, 90, 60, 0, 0, Math.PI * 2); x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
  return c;
}

function globeCanvas(w = 1024, h = 512) {
  const c = cv(w, h), x = c.getContext('2d');
  const N = makeNoise(17);
  const img = x.createImageData(w, h), d = img.data;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const lon = xx / w * Math.PI * 2, lat = (yy / h - 0.5) * Math.PI;
    const px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
    const n = N.fbm(px * 2 + 5, py * 2 + pz * 1.7 + 3, 5);
    const i = (yy * w + xx) * 4;
    if (n > 0.55) { const k = 0.85 + (n - 0.55) * 1.2; d[i] = 196 * k; d[i + 1] = 168 * k; d[i + 2] = 112 * k; } else { const k = 0.85 + 0.25 * n; d[i] = 70 * k; d[i + 1] = 98 * k; d[i + 2] = 96 * k; }
    if (Math.abs(n - 0.55) < 0.005) { d[i] = 60; d[i + 1] = 42; d[i + 2] = 26; }
    d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.strokeStyle = 'rgba(60,40,20,0.35)'; x.lineWidth = 1;
  for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo(i * w / 12, 0); x.lineTo(i * w / 12, h); x.stroke(); }
  for (let j = 0; j <= 6; j++) { x.beginPath(); x.moveTo(0, j * h / 6); x.lineTo(w, j * h / 6); x.stroke(); }
  x.fillStyle = 'rgba(40,24,10,0.65)'; x.font = 'italic 22px "IM Fell English", serif';
  [['Mare Incognitum', 0.1, 0.55], ['Terra Australis', 0.55, 0.78], ['Oceanus', 0.75, 0.4]].forEach(([t, u, v]) => x.fillText(t, u * w, v * h));
  return c;
}

const kleinFn = (u, v, target) => {
  u *= Math.PI; v *= 2 * Math.PI;
  const c = Math.cos(u), s = Math.sin(u), cv_ = Math.cos(v);
  target.set(-2 / 15 * c * (3 * cv_ - 30 * s + 90 * c ** 4 * s - 60 * c ** 6 * s + 5 * c * cv_ * s),
    -1 / 15 * s * (3 * cv_ - 3 * c ** 2 * cv_ - 48 * c ** 4 * cv_ + 48 * c ** 6 * cv_ - 60 * s + 5 * c * cv_ * s - 5 * c ** 3 * cv_ * s - 80 * c ** 5 * cv_ * s + 80 * c ** 7 * cv_ * s),
    2 / 15 * (3 + 5 * c * s) * Math.sin(v));
};

export function globe(M, r = 0.11, standH = 0.12, floor = false) {
  const g = new THREE.Group();
  const gt = toTex(globeCanvas());
  const s = add(g, new THREE.SphereGeometry(r, 64, 40), new THREE.MeshPhysicalMaterial({ map: gt, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.2 }), 0, standH + r, 0);
  s.rotation.z = 0.41;
  add(g, new THREE.TorusGeometry(r * 1.08, r * 0.045, 10, 64), M.brass, 0, standH + r, 0, { rz: 0.41, ry: 0 }).rotation.y = Math.PI / 2;
  const hor = add(g, new THREE.TorusGeometry(r * 1.16, r * 0.06, 8, 64), M.walnut, 0, standH + r, 0, { rx: Math.PI / 2 });
  if (floor) {
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const leg = add(g, new THREE.CylinderGeometry(r * 0.05, r * 0.07, standH + r * 0.4, 10), M.walnut, Math.cos(a) * r * 0.75, (standH + r * 0.4) / 2, Math.sin(a) * r * 0.75); leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18); }
    add(g, new THREE.TorusGeometry(r * 0.8, r * 0.035, 8, 48), M.walnut, 0, standH * 0.25, 0, { rx: Math.PI / 2 });
    [0, 1, 2, 3].forEach(i => { const a = i / 4 * Math.PI * 2; add(g, new THREE.CylinderGeometry(r * 0.035, r * 0.035, r * 0.35, 8), M.walnut, Math.cos(a) * r * 1.16, standH + r - r * 0.17, Math.sin(a) * r * 1.16); });
  } else {
    add(g, lathe([[0, 0], [r * 0.7, 0], [r * 0.72, r * 0.08], [r * 0.4, r * 0.14], [r * 0.12, r * 0.22], [r * 0.08, standH], [0, standH]], 32), M.walnut);
  }
  g.userData.sphere = s;
  return g;
}

function bookClosed(M, tex, { w = 0.24, h = 0.045, d = 0.17, color = 0x4a1a14, seed = 1 } = {}) {
  const g = new THREE.Group();
  const cover = M.leather(color);
  const pagesC = cv(128, 128), pc = pagesC.getContext('2d'); pc.fillStyle = '#ddd0ac'; pc.fillRect(0, 0, 128, 128); for (let i = 0; i < 128; i += 2) { pc.fillStyle = `rgba(110,90,60,${0.15 + (i * 37 % 13) / 80})`; pc.fillRect(0, i, 128, 1); }
  const pageMat = new THREE.MeshStandardMaterial({ map: toTex(pagesC), roughness: 0.95 });
  const ct = 0.004;
  add(g, new THREE.BoxGeometry(w, ct, d), cover, 0, h - ct / 2, 0); add(g, new THREE.BoxGeometry(w, ct, d), cover, 0, ct / 2, 0);
  const sp = add(g, new THREE.CylinderGeometry(h / 2, h / 2, w, 16, 1, false, 0, Math.PI), cover, 0, h / 2, -d / 2 + 0.002, { rz: Math.PI / 2 }); sp.rotation.y = Math.PI; sp.scale.set(1, 1, 0.35);
  add(g, new THREE.BoxGeometry(w - 0.006, h - 2 * ct, d - 0.004), pageMat, 0, h / 2, 0.003);
  const gilt = M.gilt;
  for (const xx of [-w * 0.36, -w * 0.12, w * 0.12, w * 0.36]) add(g, new THREE.BoxGeometry(0.006, h * 0.95, 0.006), cover, xx, h / 2, -d / 2 - 0.007);
  for (const xx of [-w * 0.39, -w * 0.33, w * 0.33, w * 0.39]) add(g, new THREE.BoxGeometry(0.0015, h * 0.8, 0.002), gilt, xx, h / 2, -d / 2 - 0.009);
  add(g, new THREE.BoxGeometry(w * 0.16, h * 0.55, 0.002), new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.6 }), 0, h / 2, -d / 2 - 0.009);
  add(g, new THREE.BoxGeometry(w * 0.12, h * 0.12, 0.0025), gilt, 0, h / 2, -d / 2 - 0.0095);
  // gilt fillet frame on the top cover
  [[w - 0.03, 0.002, 0, d / 2 - 0.012], [w - 0.03, 0.002, 0, -d / 2 + 0.012], [0.002, d - 0.024, w / 2 - 0.016, 0], [0.002, d - 0.024, -w / 2 + 0.016, 0]].forEach(([a_, c_, x_, z_]) => add(g, new THREE.BoxGeometry(a_, 0.0006, c_), gilt, x_, h + 0.0003, z_, { cast: false }));
  return g;
}

// ---------------------------------------------------------------- desk
export function makeDesk(M, tex) {
  const g = new THREE.Group();
  const TW = 1.8, TD = 1.1, TY = 0.78;
  const topGeo = new THREE.PlaneGeometry(TW - 0.012, TD - 0.012); topGeo.rotateX(-Math.PI / 2);
  const dt = tex.desk.clone(); dt.wrapS = dt.wrapT = THREE.ClampToEdgeWrapping; dt.needsUpdate = true;
  const dn = tex.desk_n.clone(); dn.wrapS = dn.wrapT = THREE.ClampToEdgeWrapping; dn.needsUpdate = true;
  const dorm = tex.desk_orm.clone(); dorm.wrapS = dorm.wrapT = THREE.ClampToEdgeWrapping; dorm.needsUpdate = true;
  const topMat = new THREE.MeshPhysicalMaterial({ map: dt, normalMap: dn, normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: dorm, metalnessMap: dorm, aoMap: dorm, roughness: 1, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.28 });
  add(g, topGeo, topMat, 0, TY, 0, { cast: false });
  const s = 0.05 * 0.55; // ShipInBottle units (5 cm) scaled to a slimmer top
  const prof = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 - i / 8 * Math.PI / 2; prof.push([(-0.08 + 0.08 * Math.cos(a)) * s, (-0.08 + 0.08 * Math.sin(a)) * s]); }
  prof.push([0, -0.3 * s], [0.02 * s, -0.32 * s], [0.02 * s, -0.34 * s], [-0.04 * s, -0.4 * s], [-0.1 * s, -0.46 * s], [-0.14 * s, -0.5 * s], [-0.9 * s, -0.5 * s]);
  const edge = sweep(roundRectPath(-TW / 2, TW / 2, -TD / 2, TD / 2, 0.012, 6), prof);
  { const uv = edge.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * 0.03); }
  add(g, edge, M.walnut, 0, TY, 0);
  add(g, box(TW - 0.04, 0.01, TD - 0.04), M.walnut, 0, TY - 0.03, 0, { cast: false });
  // pedestals
  const PW = 0.5, PD = 0.98, PH = TY - 0.035 - 0.07;
  const drawerFront = (w, h, x, y, z, parent, ry = 0) => {
    const dg = new THREE.Group(); dg.position.set(x, y, z); dg.rotation.y = ry; parent.add(dg);
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(-w / 2, h / 2); sh.closePath();
    const geo = new ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.008, bevelSize: Math.min(0.022, h * 0.18), bevelSegments: 2 }); planarUV(geo, 0, 1, 1, 1, x, y);
    add(dg, geo, M.walnut, 0, 0, 0);
    const pull = add(dg, new THREE.TorusGeometry(0.03, 0.0045, 10, 24, Math.PI), M.brass, 0, -0.012, 0.03, { rz: Math.PI }); pull.rotation.x = 0.35;
    [-0.03, 0.03].forEach(dx => add(dg, new THREE.CylinderGeometry(0.008, 0.008, 0.008, 16), M.brass, dx, -0.012, 0.018, { rx: Math.PI / 2 }));
    add(dg, new THREE.CylinderGeometry(0.013, 0.013, 0.003, 20), M.brass, 0, h * 0.28, 0.016, { rx: Math.PI / 2 });
    return dg;
  };
  [-1, 1].forEach(sx => {
    const x = sx * (TW / 2 - PW / 2 - 0.03);
    add(g, box(PW, PH, PD), M.walnut, x, 0.07 + PH / 2, 0);
    add(g, box(PW + 0.03, 0.07, PD + 0.03), M.walnut, x, 0.035, 0);
    add(g, moulding2(PW + 0.03, PD + 0.03), M.walnut, x, 0.07, 0);
    const hs = [0.17, 0.19, 0.22]; let y = 0.07 + PH - 0.02;
    hs.forEach(h => { y -= h / 2; drawerFront(PW - 0.06, h - 0.02, x, y, PD / 2, g); drawerFront(PW - 0.06, h - 0.02, x, y, -PD / 2, g, Math.PI); y -= h / 2 + 0.005; });
    // raised side panel on the outer side
    const side = new THREE.Shape(); const sw = PD - 0.14, shh = PH - 0.14; side.moveTo(-sw / 2, -shh / 2); side.lineTo(sw / 2, -shh / 2); side.lineTo(sw / 2, shh / 2); side.lineTo(-sw / 2, shh / 2); side.closePath();
    const sg = new ExtrudeGeometry(side, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.04, bevelSegments: 2 }); planarUV(sg, 1, 0);
    add(g, sg, M.walnut, x + sx * PW / 2, 0.07 + PH / 2, 0, { ry: sx * Math.PI / 2 });
  });
  // centre drawer + modesty panel
  drawerFront(0.62, 0.075, 0, TY - 0.07, PD / 2, g);
  add(g, box(TW - 2 * PW - 0.06, 0.1, PD), M.walnut, 0, TY - 0.085, 0);
  add(g, box(TW - 2 * PW - 0.06, PH - 0.1, 0.02), M.walnut, 0, 0.07 + (PH - 0.1) / 2, -PD / 2 + 0.06);
  const mp = new THREE.Shape(); const mw = 0.6, mh = 0.4; mp.moveTo(-mw / 2, -mh / 2); mp.lineTo(mw / 2, -mh / 2); mp.lineTo(mw / 2, mh / 2); mp.lineTo(-mw / 2, mh / 2); mp.closePath();
  const mg = new ExtrudeGeometry(mp, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.04, bevelSegments: 2 }); planarUV(mg, 1, 0);
  add(g, mg, M.walnut, 0, 0.36, -PD / 2 + 0.07);
  g.userData.topY = TY;
  return g;
}
function moulding2(w, d) {
  const path = roundRectPath(-w / 2, w / 2, -d / 2, d / 2, 0.004, 2);
  return sweep(path, [[0, 0], [0.012, 0.0], [0.014, 0.008], [0.008, 0.016], [0.0, 0.022]]);
}

// ---------------------------------------------------------------- gothic chair
export function makeChair(M, tex) {
  const g = new THREE.Group();
  const W = 0.58, D = 0.52, SY = 0.46;
  const legGeo = lathe([[0, 0], [0.026, 0], [0.028, 0.03], [0.02, 0.06], [0.024, 0.12], [0.018, 0.22], [0.024, 0.3], [0.02, 0.38], [0.026, SY - 0.03], [0.026, SY], [0, SY]], 16);
  [[-1, 1], [1, 1]].forEach(([sx, sz]) => add(g, legGeo, M.walnut, sx * (W / 2 - 0.03), 0, sz * (D / 2 - 0.03)));
  const postH = 1.32;
  [-1, 1].forEach(sx => {
    add(g, box(0.05, postH, 0.05, 'y'), M.walnut, sx * (W / 2 - 0.03), postH / 2, -(D / 2 - 0.03));
    add(g, lathe([[0, 0], [0.03, 0], [0.034, 0.02], [0.02, 0.05], [0.03, 0.08], [0.012, 0.13], [0.004, 0.16], [0, 0.17]], 16), M.gilt, sx * (W / 2 - 0.03), postH, -(D / 2 - 0.03));
    add(g, box(0.045, 0.24, 0.045, 'y'), M.walnut, sx * (W / 2 - 0.03), SY + 0.12, D / 2 - 0.03);
    add(g, box(0.05, 0.035, D + 0.04, 'z'), M.walnut, sx * (W / 2 - 0.03), SY + 0.25, 0.01);
    add(g, box(0.025, 0.025, D - 0.06, 'z'), M.walnut, sx * (W / 2 - 0.03), 0.12, 0);
  });
  add(g, box(W, 0.07, D, 'x'), M.walnut, 0, SY - 0.035, 0);
  add(g, box(W - 0.06, 0.025, 0.025, 'x'), M.walnut, 0, 0.12, D / 2 - 0.03);
  // velvet seat + back
  const pad = (w, d, t) => { const s = new THREE.Shape(); const r = 0.04; s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2); const geo = new ExtrudeGeometry(s, { depth: t * 0.4, bevelEnabled: true, bevelThickness: t * 0.3, bevelSize: 0.025, bevelSegments: 4, curveSegments: 6 }); planarUV(geo, 0, 1, 2, 2); return geo; };
  add(g, pad(W - 0.07, D - 0.06, 0.06), M.velvet, 0, SY + 0.01, 0, { rx: -Math.PI / 2 });
  add(g, pad(W - 0.1, 0.56, 0.05), M.velvet, 0, SY + 0.42, -(D / 2 - 0.045), { rx: -0.06 });
  add(g, box(W - 0.06, 0.05, 0.04, 'x'), M.walnut, 0, SY + 0.12, -(D / 2 - 0.03));
  // pointed cresting rail
  const cr = new THREE.Shape(); const cw = W - 0.06; cr.moveTo(-cw / 2, 0); cr.lineTo(cw / 2, 0); cr.lineTo(cw / 2, 0.06); cr.quadraticCurveTo(cw * 0.25, 0.08, 0, 0.2); cr.quadraticCurveTo(-cw * 0.25, 0.08, -cw / 2, 0.06); cr.closePath();
  const tr = new THREE.Path(); for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; i ? tr.lineTo(Math.cos(a) * 0.035, 0.085 + Math.sin(a) * 0.035) : tr.moveTo(Math.cos(a) * 0.035, 0.085 + Math.sin(a) * 0.035); } cr.holes.push(tr);
  const crg = new ExtrudeGeometry(cr, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }); planarUV(crg, 0, 1);
  add(g, crg, M.walnut, 0, SY + 0.72, -(D / 2 - 0.03) - 0.015);
  return g;
}

// ---------------------------------------------------------------- banker's lamp
export function bankersLamp(M) {
  const g = new THREE.Group();
  add(g, lathe([[0, 0], [0.085, 0], [0.09, 0.006], [0.088, 0.018], [0.07, 0.026], [0.03, 0.034], [0.016, 0.04], [0, 0.04]], 40), M.brass);
  add(g, new THREE.CylinderGeometry(0.009, 0.011, 0.3, 12), M.brass, 0, 0.19, 0);
  add(g, lathe([[0, 0], [0.016, 0], [0.02, 0.01], [0.012, 0.02], [0, 0.02]], 16), M.brass, 0, 0.13, 0);
  const arm = add(g, new THREE.CylinderGeometry(0.007, 0.007, 0.12, 10), M.brass, 0, 0.345, 0.05, { rx: Math.PI / 2 });
  void arm;
  const sh = new THREE.Group(); sh.position.set(0, 0.37, 0.1); sh.rotation.x = 0.12; g.add(sh);
  const outer = new THREE.CylinderGeometry(0.075, 0.075, 0.34, 40, 1, true, 0, Math.PI); outer.rotateZ(Math.PI / 2);
  const gcv = cv(256, 4), gx = gcv.getContext('2d'); const gg = gx.createLinearGradient(0, 0, 256, 0);
  [[0, '#4ad27c'], [0.1, '#24914c'], [0.3, '#0f5a2c'], [0.5, '#0a4420'], [0.7, '#0f5a2c'], [0.9, '#24914c'], [1, '#4ad27c']].forEach(([o, c]) => gg.addColorStop(o, c)); gx.fillStyle = gg; gx.fillRect(0, 0, 256, 4);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x0c3f20, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, emissive: new THREE.Color(0xffffff), emissiveMap: toTex(gcv), emissiveIntensity: 0.9, envMapIntensity: 1.8, side: THREE.FrontSide });
  add(sh, outer, glassM, 0, 0, 0);
  const inner = new THREE.CylinderGeometry(0.072, 0.072, 0.335, 40, 1, true, 0, Math.PI); inner.rotateZ(Math.PI / 2);
  const opal = new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: new THREE.Color(1.0, 0.86, 0.6), emissiveIntensity: 2.2, side: THREE.BackSide });
  add(sh, inner, opal, 0, 0, 0, { cast: false });
  [-1, 1].forEach(sx => { const cap = new THREE.CircleGeometry(0.075, 32, 0, Math.PI); add(sh, cap, glassM, sx * 0.17, 0, 0, { ry: sx * Math.PI / 2 }); add(sh, new THREE.TorusGeometry(0.075, 0.004, 6, 40, Math.PI), M.brass, sx * 0.17, 0, 0, { ry: Math.PI / 2 }); });
  add(sh, new THREE.CylinderGeometry(0.003, 0.003, 0.335, 6), M.brass, 0, 0.075, 0, { rz: Math.PI / 2 });
  const bulb = add(sh, new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.6, 2.6) }), 0, -0.01, 0, { cast: false });
  bulb.scale.set(2.6, 1, 1);
  // pull chain
  for (let i = 0; i < 8; i++) add(sh, new THREE.SphereGeometry(0.0028, 6, 4), M.brass, 0.1, -0.03 - i * 0.008, 0.05, { cast: false });
  g.userData.lightPos = new THREE.Vector3(0, 0.355, 0.1);
  return g;
}

// ---------------------------------------------------------------- desk dressing
export function dressDesk(desk, M, tex, opts = {}) {
  const TY = desk.userData.topY;
  const ud = {};
  // lamp, back-left
  const lamp = bankersLamp(M); lamp.position.set(-0.58, TY, -0.32); lamp.rotation.y = 0.25; desk.add(lamp); ud.lamp = lamp;
  // open tome
  const tome = new THREE.Group(); tome.position.set(-0.08, TY, 0.12); tome.rotation.y = 0.06; desk.add(tome);
  const leftT = toTex(pageCanvas(tex.sheet.image, 'notes')), rightT = toTex(pageCanvas(tex.sheet.image, 'klein'));
  const coverM = M.leather(0x4a1610);
  add(tome, new THREE.BoxGeometry(0.62, 0.012, 0.42), coverM, 0, 0.006, 0);
  const pageY = (t) => 0.03 * Math.sin(Math.min(1, t * 3.0) * Math.PI / 2) * (1 - t * 0.45) + 0.004;
  const edgeM = new THREE.MeshStandardMaterial({ color: 0xd6c7a0, roughness: 0.95 });
  [-1, 1].forEach(s => {
    const pg = new THREE.PlaneGeometry(0.29, 0.39, 30, 4); pg.rotateX(-Math.PI / 2);
    const pa = pg.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); const u = (x + 0.145) / 0.29; const t = s < 0 ? 1 - u : u; pa.setY(i, pageY(t) + 0.0015); }
    pg.computeVertexNormals();
    const pm = new THREE.MeshStandardMaterial({ map: s < 0 ? leftT : rightT, normalMap: tex.paper_n, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.9, side: THREE.DoubleSide });
    add(tome, pg, pm, s * 0.148, 0.012, 0, { cast: true });
    // page block following the curl
    const prof = new THREE.Shape(); prof.moveTo(0, 0); prof.lineTo(0.284, 0);
    for (let k = 0; k <= 24; k++) { const t = 1 - k / 24; prof.lineTo(t * 0.284, pageY(t)); }
    prof.closePath();
    const bg = new ExtrudeGeometry(prof, { depth: 0.38, bevelEnabled: false, curveSegments: 2 }); bg.translate(0, 0, -0.19);
    const blk = add(tome, bg, edgeM, s < 0 ? -0.004 : 0.004, 0.012, 0); if (s < 0) blk.scale.x = -1;
  });
  // ribbon bookmark
  const rib = new THREE.PlaneGeometry(0.012, 0.3, 1, 12); rib.rotateX(-Math.PI / 2); const rp = rib.attributes.position; for (let i = 0; i < rp.count; i++) { const z = rp.getZ(i); rp.setY(i, z > 0.19 ? -(z - 0.19) * 0.9 : 0.02 * Math.cos(z * 6)); }
  rib.computeVertexNormals();
  add(tome, rib, new THREE.MeshStandardMaterial({ color: 0x8a1a1a, roughness: 0.6, side: THREE.DoubleSide }), 0.03, 0.03, 0.05, { cast: true });
  // parchment chart under the tome
  const ch = new THREE.PlaneGeometry(0.42, 0.56, 24, 30); ch.rotateX(-Math.PI / 2);
  const cp = ch.attributes.position; for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), z = cp.getZ(i); cp.setY(i, 0.002 + Math.max(0, (x - 0.12)) ** 2 * 0.25 + Math.max(0, z - 0.2) ** 2 * 0.3 + Math.sin(z * 9) * 0.0015); }
  ch.computeVertexNormals();
  add(desk, ch, new THREE.MeshStandardMaterial({ map: toTex(pageCanvas(tex.paper.image, 'chart')), normalMap: tex.paper_n, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.88, side: THREE.DoubleSide }), 0.42, TY, 0.08, { ry: -0.42 });
  // Klein bottle on a little plinth (About & CV)
  const kb = new THREE.Group(); kb.position.set(0.5, TY, 0.26); desk.add(kb);
  add(kb, lathe([[0, 0], [0.075, 0], [0.078, 0.008], [0.072, 0.014], [0.06, 0.018], [0.06, 0.03], [0, 0.03]], 40), M.walnut);
  const kg = new ParametricGeometry(kleinFn, 160, 48); kg.computeBoundingBox();
  const bb = kg.boundingBox, size = new THREE.Vector3(); bb.getSize(size);
  const kscale = 0.19 / Math.max(size.x, size.y, size.z);
  kg.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
  let km;
  if (opts.transmission) {
    const kMat = new THREE.MeshPhysicalMaterial({ color: 0xf6fffb, roughness: 0.02, metalness: 0, transmission: 1, thickness: 0.006, ior: 1.5, side: THREE.DoubleSide, attenuationColor: new THREE.Color(0xd8f4e6), attenuationDistance: 1.5, envMapIntensity: 2.0, specularIntensity: 1, clearcoat: 0.5 });
    km = add(kb, kg, kMat, 0, 0.03 + size.y * kscale / 2 + 0.002, 0, { cast: false });
  } else {
    // cheap glass: a faint body plus an additive layer that carries only the reflections
    km = add(kb, kg, new THREE.MeshStandardMaterial({ color: 0xd6f2e4, roughness: 0.1, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }), 0, 0.03 + size.y * kscale / 2 + 0.002, 0, { cast: false, recv: false });
    const shine = new THREE.Mesh(kg, M.glass); km.add(shine);
  }
  km.scale.setScalar(kscale);
  ud.klein = km; ud.kleinGroup = kb; ud.kleinH = size; ud.kleinScale = kscale;
  // desk globe, back-right
  const dg = globe(M, 0.1, 0.11); dg.position.set(0.66, TY, -0.3); desk.add(dg); ud.deskGlobe = dg;
  // brass chamberstick with candle
  const cs = new THREE.Group(); cs.position.set(0.28, TY, -0.38); desk.add(cs);
  add(cs, lathe([[0, 0], [0.07, 0], [0.074, 0.005], [0.072, 0.012], [0.066, 0.01], [0.02, 0.01], [0.016, 0.02], [0.017, 0.05], [0.026, 0.055], [0.024, 0.06], [0, 0.06]], 40), M.brass);
  add(cs, new THREE.TorusGeometry(0.02, 0.005, 8, 20), M.brass, 0.075, 0.012, 0, { ry: Math.PI / 2 });
  const cn = candle(M, { h: 0.12, r: 0.012, seed: 7 }); cn.position.y = 0.058; cs.add(cn);
  ud.candleLocal = new THREE.Vector3(0.28, TY + 0.058 + cn.userData.flameY, -0.38);
  // inkwell + quill, front-left
  const ink = new THREE.Group(); ink.position.set(-0.52, TY, 0.2); desk.add(ink);
  add(ink, box(0.07, 0.05, 0.07), new THREE.MeshPhysicalMaterial({ color: 0x0b1216, roughness: 0.04, clearcoat: 1, metalness: 0.1 }), 0, 0.025, 0);
  add(ink, lathe([[0.016, 0.05], [0.022, 0.052], [0.023, 0.062], [0.02, 0.066], [0, 0.067]], 24), M.brass);
  const fq = cv(128, 512), fx = fq.getContext('2d'); const gr = fx.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#f2ead8'); gr.addColorStop(1, '#cbbfa4'); fx.fillStyle = gr;
  fx.beginPath(); fx.moveTo(64, 512); fx.quadraticCurveTo(10, 300, 40, 40); fx.quadraticCurveTo(64, 0, 90, 40); fx.quadraticCurveTo(118, 300, 64, 512); fx.fill();
  fx.strokeStyle = 'rgba(120,100,70,0.5)'; for (let i = 0; i < 70; i++) { const y = 40 + i * 6.5; fx.beginPath(); fx.moveTo(64, y + 10); fx.lineTo(20 + (i % 3), y - 6); fx.moveTo(64, y + 10); fx.lineTo(108 - (i % 3), y - 6); fx.stroke(); }
  fx.strokeStyle = '#8a7a5a'; fx.lineWidth = 3; fx.beginPath(); fx.moveTo(64, 512); fx.lineTo(64, 30); fx.stroke();
  const qg = new THREE.PlaneGeometry(0.055, 0.3, 4, 16); qg.translate(0, 0.15, 0); const qp = qg.attributes.position; for (let i = 0; i < qp.count; i++) { const yy = qp.getY(i); qp.setZ(i, (yy / 0.3) ** 2 * 0.05); }
  qg.computeVertexNormals();
  add(ink, qg, new THREE.MeshStandardMaterial({ map: toTex(fq), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }), 0.0, 0.05, 0, { rx: -0.25, ry: 0.5, rz: 0.4 });
  // book stack, mid-right
  const st = new THREE.Group(); st.position.set(0.66, TY, 0.0); st.rotation.y = -0.3; desk.add(st);
  let y = 0; [[0.26, 0.05, 0.19, 0x2a3d2a], [0.23, 0.04, 0.17, 0x5a1a14], [0.2, 0.035, 0.15, 0x1b2440]].forEach(([w, h, d, c], i) => { const b = bookClosed(M, tex, { w, h, d, color: c, seed: i }); b.position.y = y; b.rotation.y = (i - 1) * 0.12; st.add(b); y += h; });
  // hourglass on the stack
  const hg = hourglass(M); hg.position.y = y; hg.scale.setScalar(0.75); st.add(hg);
  ud.stack = st;
  // magnifying glass, front-right
  const mag = new THREE.Group(); mag.position.set(0.18, TY + 0.012, 0.36); mag.rotation.y = 0.7; desk.add(mag);
  add(mag, new THREE.TorusGeometry(0.045, 0.006, 10, 40), M.brass, 0, 0, 0, { rx: Math.PI / 2 });
  add(mag, new THREE.CircleGeometry(0.044, 40), M.glass, 0, 0.001, 0, { rx: -Math.PI / 2, cast: false });
  add(mag, new THREE.CylinderGeometry(0.008, 0.01, 0.11, 12), M.walnut, 0.1, 0, 0, { rz: Math.PI / 2 });
  // sealed letter
  const lt = new THREE.Group(); lt.position.set(-0.36, TY + 0.002, 0.34); lt.rotation.y = 0.35; desk.add(lt);
  add(lt, (() => { const g = new THREE.PlaneGeometry(0.2, 0.13); g.rotateX(-Math.PI / 2); return g; })(), new THREE.MeshStandardMaterial({ map: tex.sheet, roughness: 0.9 }), 0, 0.001, 0, { cast: false });
  add(lt, new THREE.CylinderGeometry(0.012, 0.013, 0.004, 20), new THREE.MeshPhysicalMaterial({ color: 0x8e1a12, roughness: 0.35, clearcoat: 0.6 }), 0.04, 0.003, 0.02);
  desk.userData.dress = ud;
  return ud;
}

export function hourglass(M) {
  const g = new THREE.Group();
  [0, 0.2].forEach(y => add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.016, 6), M.walnut, 0, y + 0.008, 0));
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; add(g, new THREE.CylinderGeometry(0.005, 0.005, 0.19, 8), M.walnut, Math.cos(a) * 0.048, 0.108, Math.sin(a) * 0.048); }
  const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([0.004 + 0.036 * Math.pow(Math.sin(t * Math.PI), 1.3), 0.016 + t * 0.184]); }
  add(g, lathe(pts, 32), M.glass, 0, 0, 0, { cast: false });
  add(g, new THREE.ConeGeometry(0.028, 0.035, 24), new THREE.MeshStandardMaterial({ color: 0xd8b878, roughness: 0.9 }), 0, 0.034, 0);
  add(g, new THREE.ConeGeometry(0.02, 0.02, 24), new THREE.MeshStandardMaterial({ color: 0xd8b878, roughness: 0.9 }), 0, 0.15, 0, { rx: Math.PI });
  return g;
}

// ---------------------------------------------------------------- chandelier (hexagonal wrought iron)
export function chandelier(M) {
  const g = new THREE.Group();
  const Rr = 0.78, Y = 4.15;
  for (let k = 0; k < 6; k++) {
    const a0 = k * Math.PI / 3, a1 = (k + 1) * Math.PI / 3;
    const p0 = new THREE.Vector3(Math.cos(a0) * Rr, Y, Math.sin(a0) * Rr), p1 = new THREE.Vector3(Math.cos(a1) * Rr, Y, Math.sin(a1) * Rr);
    const m = add(g, new THREE.BoxGeometry(0.03, 0.05, p0.distanceTo(p1)), M.iron); m.position.copy(p0).add(p1).multiplyScalar(0.5); m.lookAt(p1);
    // scroll arm to the hub
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a0) * Rr, Y, Math.sin(a0) * Rr), new THREE.Vector3(Math.cos(a0) * Rr * 0.6, Y - 0.16, Math.sin(a0) * Rr * 0.6), new THREE.Vector3(Math.cos(a0) * Rr * 0.25, Y - 0.12, Math.sin(a0) * Rr * 0.25), new THREE.Vector3(0, Y - 0.02, 0)]);
    add(g, new THREE.TubeGeometry(curve, 24, 0.011, 8), M.iron);
    // cup + candle
    add(g, lathe([[0, 0], [0.025, 0], [0.04, 0.03], [0.045, 0.04], [0.02, 0.04], [0, 0.04]], 20), M.iron, Math.cos(a0) * Rr, Y + 0.02, Math.sin(a0) * Rr);
    const c = candle(M, { h: 0.2 + (k % 2) * 0.04, r: 0.016, seed: 30 + k }); c.position.set(Math.cos(a0) * Rr, Y + 0.05, Math.sin(a0) * Rr); g.add(c);
    // drip pan spike
    add(g, new THREE.ConeGeometry(0.012, 0.06, 8), M.iron, Math.cos(a0) * Rr, Y - 0.04, Math.sin(a0) * Rr, { rx: Math.PI });
  }
  add(g, lathe([[0, 0], [0.04, 0.0], [0.07, 0.06], [0.05, 0.12], [0.03, 0.2], [0.05, 0.3], [0.02, 0.36], [0, 0.38]], 20), M.iron, 0, Y - 0.22, 0);
  add(g, new THREE.ConeGeometry(0.025, 0.12, 12), M.iron, 0, Y - 0.28, 0, { rx: Math.PI });
  // three chains to the boss
  const top = HV - 1.18;
  const linkG = new THREE.TorusGeometry(0.018, 0.0045, 6, 12); linkG.scale(1.6, 1, 1);
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI * 2 / 3 + Math.PI / 6, from = new THREE.Vector3(Math.cos(a) * Rr * 0.86, Y + 0.02, Math.sin(a) * Rr * 0.86), to = new THREE.Vector3(0, top, 0);
    const n = Math.floor(from.distanceTo(to) / 0.05);
    for (let i = 0; i < n; i++) pts.push({ p: from.clone().lerp(to, i / n), d: to.clone().sub(from).normalize(), i });
  }
  for (let i = 0; i < 18; i++) pts.push({ p: new THREE.Vector3(0, top + i * 0.05, 0), d: new THREE.Vector3(0, 1, 0), i });
  const inst = new THREE.InstancedMesh(linkG, M.iron, pts.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), tq = new THREE.Quaternion();
  pts.forEach((o, i) => { q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), o.d); tq.setFromAxisAngle(o.d, o.i % 2 ? Math.PI / 2 : 0); q.premultiply(tq); m4.compose(o.p, q, new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(i, m4); });
  inst.castShadow = true; g.add(inst);
  g.userData.lightPos = new THREE.Vector3(0, Y + 0.3, 0);
  return g;
}

// ---------------------------------------------------------------- floating candles
export function floatingCandles(M, n = 14) {
  const g = new THREE.Group(); const R = rng(808); const list = [];
  for (let i = 0; i < n; i++) {
    let x, z, y; let tries = 0;
    do { const a = R() * Math.PI * 2, r = 1.2 + R() * 2.4; x = Math.cos(a) * r; z = Math.sin(a) * r; y = 3.2 + R() * 1.6; tries++; } while (tries < 40 && (Math.hypot(x, z) < 1.1 || list.some(o => Math.hypot(o.x - x, o.z - z) < 0.7)));
    const c = candle(M, { h: 0.18 + R() * 0.12, r: 0.014 + R() * 0.006, seed: 100 + i }); c.position.set(x, y, z); g.add(c);
    c.traverse(o => { if (o.isMesh) o.castShadow = false; }); c.userData.dynamic = true;
    list.push({ c, x, y, z, ph: R() * 6.28, sp: 0.5 + R() * 0.5 });
  }
  g.userData.list = list;
  return g;
}

// ---------------------------------------------------------------- telescope on a tripod
export function telescope(M) {
  const g = new THREE.Group();
  const hub = new THREE.Vector3(0, 1.12, 0);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.3; const foot = new THREE.Vector3(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
    const len = foot.distanceTo(hub); const m = add(g, boxUV(new THREE.BoxGeometry(0.03, 0.05, len), { grain: 'z' }), M.walnut); m.position.copy(foot).add(hub).multiplyScalar(0.5); m.lookAt(hub);
    add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10), M.brass, foot.x, 0.015, foot.z);
  }
  add(g, new THREE.CylinderGeometry(0.05, 0.06, 0.08, 16), M.brass, 0, 1.14, 0);
  const tg = new THREE.Group(); tg.position.set(0, 1.22, 0); tg.rotation.set(0, 0, 0); g.add(tg);
  const tube = new THREE.Group(); tube.rotation.z = 0.42; tg.add(tube);
  const seg = (r0, r1, l, x, mat) => add(tube, new THREE.CylinderGeometry(r1, r0, l, 40), mat, x, 0, 0, { rz: -Math.PI / 2 });
  seg(0.052, 0.05, 0.62, 0.12, M.brass); seg(0.058, 0.058, 0.04, 0.44, M.brassDark); seg(0.06, 0.056, 0.1, 0.48, M.brass);
  seg(0.04, 0.04, 0.3, -0.33, M.brass); seg(0.03, 0.03, 0.2, -0.56, M.brass); seg(0.022, 0.026, 0.06, -0.68, M.brassDark);
  seg(0.056, 0.056, 0.03, -0.17, M.brassDark);
  add(tube, new THREE.CircleGeometry(0.05, 32), new THREE.MeshPhysicalMaterial({ color: 0x6a8a96, roughness: 0.02, metalness: 0.4, clearcoat: 1 }), 0.53, 0, 0, { ry: Math.PI / 2 });
  add(tg, new THREE.TorusGeometry(0.06, 0.008, 8, 24, Math.PI), M.brass, 0, 0, 0, { rx: Math.PI / 2 });
  return g;
}

// ---------------------------------------------------------------- wall sconce
export function sconce(M, seed = 1) {
  const g = new THREE.Group();
  const bp = new THREE.Shape(); bp.moveTo(-0.06, -0.14); bp.lineTo(0.06, -0.14); bp.lineTo(0.06, 0.08); bp.quadraticCurveTo(0.03, 0.12, 0, 0.2); bp.quadraticCurveTo(-0.03, 0.12, -0.06, 0.08); bp.closePath();
  add(g, new ExtrudeGeometry(bp, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }), M.iron);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.08, 0.01), new THREE.Vector3(0, -0.12, 0.1), new THREE.Vector3(0, -0.06, 0.2), new THREE.Vector3(0, 0.0, 0.22)]);
  add(g, new THREE.TubeGeometry(curve, 20, 0.009, 8), M.iron);
  add(g, lathe([[0, 0], [0.035, 0], [0.05, 0.025], [0.052, 0.035], [0.02, 0.035], [0, 0.035]], 20), M.iron, 0, 0.0, 0.22);
  const c = candle(M, { h: 0.17, r: 0.016, seed }); c.position.set(0, 0.03, 0.22); g.add(c);
  g.userData.flame = new THREE.Vector3(0, 0.03 + c.userData.flameY, 0.22);
  return g;
}

// ---------------------------------------------------------------- crystal ball on a brass stand
export function crystalBall(M) {
  const g = new THREE.Group();
  add(g, lathe([[0, 0], [0.06, 0], [0.062, 0.01], [0.04, 0.03], [0.03, 0.05], [0.045, 0.06], [0.05, 0.07], [0, 0.07]], 32), M.brass);
  add(g, new THREE.SphereGeometry(0.075, 48, 32), new THREE.MeshStandardMaterial({ color: 0x9fb4d8, roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.18, depthWrite: false }), 0, 0.14, 0, { cast: false });
  add(g, new THREE.SphereGeometry(0.0755, 48, 32), M.glass, 0, 0.14, 0, { cast: false });
  return g;
}

export { bookClosed, toTex, cv, pageCanvas };
