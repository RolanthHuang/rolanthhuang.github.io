import * as THREE from 'three';
import { ExtrudeGeometry } from 'three';
import { rng, sweep, moulding, boxUV, planarUV, pointedArch, tudorArch, shapeFrom, resample, loft, lathe, rep, roundRectPath, patchMaterial, softSprite, U, GLSL_UTIL } from './common.js';

// Hexagonal study. Metres. Wall k spans hex vertices k..k+1 (angles k*60deg). Wall frames: +z into the room, +x to the right seen from inside.
export const A = 4.8, RV = A / Math.cos(Math.PI / 6), WW = RV, HW = 5.4, HV = 7.6, WAIN = 2.2;
export const K = { RIGHT: 0, FRONT: 1, LEFT: 2, BL: 3, BACK: 4, BR: 5 };
export const DOOR = { w: 1.45, spring: 2.1 };
export const WIN = { wIn: 2.3, yIn: 0.55, wOut: 1.75, yOut: 0.55, spring: 3.3, sharp: 0.75, depth: 0.62 };

export function makeMaterials(tex) {
  const M = {};
  M.stone = new THREE.MeshStandardMaterial({ map: rep(tex.stone, 0.5), normalMap: rep(tex.stone_n, 0.5), normalScale: new THREE.Vector2(1, 1), roughnessMap: rep(tex.stone_orm, 0.5), aoMap: rep(tex.stone_orm, 0.5), aoMapIntensity: 0.7, roughness: 1, color: 0xd6c6ae });
  M.stoneTrim = new THREE.MeshStandardMaterial({ map: rep(tex.rock, 1.2), normalMap: rep(tex.rock_n, 1.2), normalScale: new THREE.Vector2(0.45, 0.45), roughness: 0.78, color: 0xcbb89c });
  M.soot = new THREE.MeshStandardMaterial({ map: rep(tex.rock, 1.5), normalMap: rep(tex.rock_n, 1.5), color: 0x16110d, roughness: 0.97 });
  const oak = (color, rough = 0.45, coat = 0.3, sx = 0.5, sy = 1) => new THREE.MeshPhysicalMaterial({ map: rep(tex.oak, sx, sy), normalMap: rep(tex.oak_n, sx, sy), normalScale: new THREE.Vector2(0.55, 0.55), color, roughness: rough, clearcoat: coat, clearcoatRoughness: 0.32 });
  M.oak = oak(0xffffff);
  M.oakDark = oak(0x9a8070, 0.55, 0.15);
  M.oakBeam = oak(0x7a6252, 0.62, 0.05);
  M.walnut = new THREE.MeshPhysicalMaterial({ map: rep(tex.walnut, 1.6), normalMap: rep(tex.walnut_n, 1.6), normalScale: new THREE.Vector2(0.4, 0.4), color: 0xffffff, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.25 });
  M.floor = new THREE.MeshPhysicalMaterial({ map: rep(tex.floor, 0.85), normalMap: rep(tex.floor_n, 0.85), normalScale: new THREE.Vector2(0.7, 0.7), color: 0xa88a74, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.28 });
  M.boards = new THREE.MeshStandardMaterial({ map: rep(tex.floor, 0.7), normalMap: rep(tex.floor_n, 0.7), color: 0x9a7a66, roughness: 0.72 });
  M.brass = new THREE.MeshPhysicalMaterial({ color: 0xd9ad5c, metalness: 1, roughness: 1, roughnessMap: tex.brass_orm, clearcoat: 0.15, clearcoatRoughness: 0.4 });
  M.brassDark = new THREE.MeshPhysicalMaterial({ color: 0xa77a38, metalness: 1, roughness: 1, roughnessMap: tex.brass_orm });
  M.gilt = new THREE.MeshPhysicalMaterial({ color: 0xc69a45, metalness: 1, roughness: 0.42, roughnessMap: tex.brass_orm, clearcoat: 0.2 });
  M.iron = new THREE.MeshStandardMaterial({ color: 0x1e1b18, metalness: 0.7, roughness: 0.62, roughnessMap: tex.brass_orm });
  M.velvet = new THREE.MeshPhysicalMaterial({ color: 0x5c0f16, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color(0xd04a5a), sheenRoughness: 0.42, normalMap: rep(tex.leather_n, 3), normalScale: new THREE.Vector2(0.15, 0.15) });
  M.velvetGreen = M.velvet.clone(); M.velvetGreen.color.set(0x173a2c); M.velvetGreen.sheenColor.set(0x4a9a7a);
  M.leather = (color) => new THREE.MeshStandardMaterial({ map: rep(tex.leather, 2), normalMap: rep(tex.leather_n, 2), color, roughness: 0.58 });
  M.wax = new THREE.MeshPhysicalMaterial({ color: 0xe6d6b4, roughness: 0.42, sheen: 0.6, sheenColor: new THREE.Color(0xffd8a0), emissive: 0x5a2a08, emissiveIntensity: 0.25 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0c0907, roughness: 0.9 });
  // clear glass without a transmission pass: black body, additive, so only reflections show
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  return M;
}

export function wallFrame(k) {
  const a0 = k * Math.PI / 3, a1 = (k + 1) * Math.PI / 3;
  const g = new THREE.Group();
  g.position.set((Math.cos(a0) + Math.cos(a1)) * RV / 2, 0, (Math.sin(a0) + Math.sin(a1)) * RV / 2);
  g.lookAt(0, 0, 0);
  g.updateMatrixWorld(true);
  g.userData.k = k;
  return g;
}

const add = (parent, geo, mat, x = 0, y = 0, z = 0, { cast = true, recv = true, rx = 0, ry = 0, rz = 0 } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m;
};
const box = (sx, sy, sz, grain = 'long') => boxUV(new THREE.BoxGeometry(sx, sy, sz), { grain });

function stoneUV(geo, ox = 0) { return planarUV(geo, 0, 1, 1, 1, ox, 0); }

// ------------------------------------------------------------------ wainscot (raised panels)
function wainscot(w, x0, x1, M, { top = WAIN, rows = [[0.33, 0.95], [1.07, 2.0]], seed = 1 } = {}) {
  const g = new THREE.Group(); w.add(g);
  const R = rng(seed);
  const back = new THREE.PlaneGeometry(x1 - x0, top); planarUV(back, 1, 0, 1, 1, R(), 0);
  add(g, back, M.oakDark, (x0 + x1) / 2, top / 2, 0.004, { cast: false });
  // skirting + rails + cap
  add(g, moulding(x0, x1, [[0, 0], [0.034, 0], [0.034, 0.16], [0.026, 0.175], [0.03, 0.19], [0.016, 0.205], [0.012, 0.215], [0, 0.22]]), M.oakDark);
  const railH = 0.12, sd = 0.026;
  const rail = (y) => add(g, box(x1 - x0, railH, sd, 'x'), M.oak, (x0 + x1) / 2, y + railH / 2, sd / 2);
  rail(0.21); rows.forEach(([, yb]) => { if (yb < top - 0.1) rail(yb); });
  add(g, moulding(x0 - 0.01, x1 + 0.01, [[0, 0], [0.03, 0], [0.034, 0.012], [0.03, 0.03], [0.05, 0.05], [0.07, 0.066], [0.07, 0.085], [0.0, 0.085]]), M.oak, 0, top - 0.08, 0);
  const n = Math.max(1, Math.round((x1 - x0) / 0.6)), pw = (x1 - x0) / n, sw = 0.1;
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * pw;
    const xs = Math.min(Math.max(x, x0 + sw / 2), x1 - sw / 2);
    add(g, box(sw, top - 0.08 - 0.21, sd, 'y'), M.oak, xs, 0.21 + (top - 0.08 - 0.21) / 2, sd / 2);
  }
  for (const [ya, yb] of rows) {
    for (let i = 0; i < n; i++) {
      const xa = x0 + i * pw + sw / 2, xb = x0 + (i + 1) * pw - sw / 2;
      const w_ = xb - xa - 0.03, h_ = yb - ya - 0.03;
      const sh = new THREE.Shape(); sh.moveTo(-w_ / 2, -h_ / 2); sh.lineTo(w_ / 2, -h_ / 2); sh.lineTo(w_ / 2, h_ / 2); sh.lineTo(-w_ / 2, h_ / 2); sh.closePath();
      const bev = Math.min(0.045, w_ * 0.2, h_ * 0.2);
      const geo = new ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.011, bevelSize: bev, bevelSegments: 2, curveSegments: 4 });
      planarUV(geo, 1, 0, 1, 1, R() * 3, R());
      add(g, geo, M.oak, (xa + xb) / 2, (ya + yb) / 2, 0.012);
    }
  }
  return g;
}

// ------------------------------------------------------------------ a stone wall plane with openings
function stoneWall(w, M, holes = [], { x0 = -WW / 2, x1 = WW / 2, y1 = HW + 0.05 } = {}) {
  const sh = new THREE.Shape(); sh.moveTo(x0, 0); sh.lineTo(x1, 0); sh.lineTo(x1, y1); sh.lineTo(x0, y1); sh.closePath();
  holes.forEach(h => sh.holes.push(shapeFrom(h, THREE.Path)));
  const geo = new THREE.ShapeGeometry(sh, 12);
  stoneUV(geo, w.userData.k * 0.37);
  return add(w, geo, M.stone, 0, 0, 0, { cast: false });
}

function archRing(outline, off, depth, M, bevel = 0.02) {
  // ring between the opening outline and an outward offset of it
  const outer = outline.map((p, i) => {
    const a = outline[Math.max(0, i - 1)], b = outline[Math.min(outline.length - 1, i + 1)];
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    const nrm = new THREE.Vector2(-t.y, t.x); // left normal (outward for clockwise outline)
    return new THREE.Vector2(p.x + nrm.x * off, p.y + nrm.y * off);
  });
  outer[0].y = outline[0].y; outer[outer.length - 1].y = outline[outline.length - 1].y;
  const pts = [...outer, ...outline.slice().reverse()];
  const s = shapeFrom(pts);
  const geo = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  planarUV(geo, 0, 1, 1, 1);
  return new THREE.Mesh(geo, M.stoneTrim);
}

// ------------------------------------------------------------------ gilt picture frame
export function gildedFrame(w, h, M, prof = [[0.0, 0.012], [0.008, 0.026], [0.016, 0.03], [0.024, 0.026], [0.03, 0.036], [0.044, 0.058], [0.06, 0.064], [0.075, 0.06], [0.082, 0.05], [0.09, 0.054], [0.1, 0.05], [0.112, 0.036], [0.124, 0.02], [0.13, 0.008], [0.13, 0.0]]) {
  const path = roundRectPath(-w / 2, w / 2, -h / 2, h / 2, 0.004, 1);
  const geo = sweep(path, prof);
  const m = new THREE.Mesh(geo, M.gilt); m.rotation.x = Math.PI / 2; m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  return g;
}

/* Brass plaques are canvases that can be engraved again (new project, other language). */
export function makePlaque() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 220;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { c, t, key: '' };
}
export function engrave(p, title, sub = '', zh = false) {
  const key = title + '|' + sub + '|' + zh; if (p.key === key) return; p.key = key;
  const x = p.c.getContext('2d'), W = 1024, H = 220;
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d9b467'); gr.addColorStop(0.5, '#b88a3e'); gr.addColorStop(1, '#8a6428');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.06; for (let i = 0; i < H; i += 3) { x.fillStyle = i % 2 ? '#fff6dc' : '#3a2508'; x.fillRect(0, i, W, 1); } x.globalAlpha = 1;
  x.strokeStyle = 'rgba(60,40,10,0.8)'; x.lineWidth = 6; x.strokeRect(14, 14, W - 28, H - 28);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const fit = (font, size, text, maxW) => { let s = size; for (; s > 28; s -= 3) { x.font = font.replace('$', s); if (x.measureText(text).width <= maxW) break; } };
  const cut = (text, y) => { x.fillStyle = 'rgba(255,236,190,0.55)'; x.fillText(text, W / 2 + 1.5, y + 2.5); x.fillStyle = '#3a2508'; x.fillText(text, W / 2, y); };
  const T = zh ? title : title.toUpperCase();
  fit(zh ? '700 $px "Noto Serif TC", "Noto Serif CJK TC", serif' : '600 $px Cinzel, serif', zh ? 84 : 86, T, 920);
  cut(T, sub ? 90 : 112);
  if (sub) { fit(zh ? '500 $px "Noto Serif TC", "Noto Serif CJK TC", serif' : 'italic $px "IM Fell English", serif', zh ? 38 : 42, sub, 900); cut(sub, 166); }
  p.t.needsUpdate = true;
}

function portrait(M, tex, img, w, h, plaque) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: img, normalMap: tex.canvas_n, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.38 });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); pic.position.z = 0.012; pic.receiveShadow = true; g.add(pic);
  const fr = gildedFrame(w, h, M); g.add(fr);
  const backing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.02), M.black); backing.position.z = -0.005; g.add(backing);
  if (plaque) {
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.006), [M.brass, M.brass, M.brass, M.brass, new THREE.MeshStandardMaterial({ map: plaque.t, metalness: 0.85, roughness: 0.35 }), M.brass]);
    pl.position.set(0, -h / 2 - 0.16, 0.01); g.add(pl);
  }
  g.userData.pic = pic;
  return g;
}

/* A dim vestibule behind a door, with the place it leads to painted on its far wall:
   what you see as the door swings open. */
function vestibule(w, h, d, farTex) {
  const grp = new THREE.Group();
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, -d / 2);
  const box = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.075, 0.045, 0.022), side: THREE.BackSide }));
  box.castShadow = false; box.receiveShadow = false; grp.add(box);
  if (farTex) {
    const fw = w - 0.02, fh = h * 0.92, t = farTex.clone();
    const ia = (t.image && t.image.width) ? t.image.width / t.image.height : 1.52, pa = fw / fh;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(pa / ia, 1); t.offset.set((1 - pa / ia) / 2, 0); t.needsUpdate = true;
    const far = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.25, 1.12, 1.0) }));
    far.position.set(0, fh / 2 + 0.02, -d + 0.01); far.castShadow = far.receiveShadow = false; grp.add(far);
  }
  return grp;
}

// ------------------------------------------------------------------ the room
export function makeRoom(tex, M) {
  const room = new THREE.Group();
  const ud = { walls: [], lights: {}, anim: {} };
  // floor
  const hex = new THREE.Shape(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; k ? hex.lineTo(Math.cos(a) * RV, Math.sin(a) * RV) : hex.moveTo(Math.cos(a) * RV, Math.sin(a) * RV); } hex.closePath();
  const fg = new THREE.ShapeGeometry(hex); fg.rotateX(-Math.PI / 2); planarUV(fg, 0, 2, 1, 1);
  add(room, fg, M.floor, 0, 0, 0, { cast: false });

  const walls = []; for (let k = 0; k < 6; k++) { const w = wallFrame(k); room.add(w); walls.push(w); }
  ud.walls = walls;

  // ---------------- corner columns (clustered shafts) + capitals
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3; const r = RV - 0.21;
    const col = new THREE.Group(); col.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); col.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); room.add(col);
    const shaft = (rad, ox, oz) => { const g = new THREE.CylinderGeometry(rad, rad, HW - 0.75, 20, 1, true); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * rad + k * 0.3, uv.getY(i) * (HW - 0.75)); add(col, g, M.stoneTrim, ox, 0.35 + (HW - 0.75) / 2, oz); };
    shaft(0.15, 0, 0); shaft(0.06, 0.17, 0.08); shaft(0.06, -0.17, 0.08);
    add(col, lathe([[0, 0], [0.27, 0], [0.27, 0.16], [0.24, 0.2], [0.25, 0.25], [0.2, 0.3], [0.18, 0.35], [0, 0.35]], 28), M.stoneTrim);
    add(col, lathe([[0, 0], [0.17, 0], [0.2, 0.12], [0.27, 0.26], [0.3, 0.3], [0.3, 0.38], [0, 0.38]], 28), M.stoneTrim, 0, HW - 0.4, 0);
  }

  // ---------------- string course at the top of every wall
  for (let k = 0; k < 6; k++) {
    const w = walls[k];
    add(w, moulding(-WW / 2, WW / 2, [[0, 0], [0.05, 0], [0.06, 0.03], [0.09, 0.06], [0.14, 0.09], [0.14, 0.13], [0.0, 0.13]]), M.stoneTrim, 0, HW - 0.13, 0);
  }

  // ---------------- vault: six boarded sectors, hip + ridge ribs, purlin ring, boss
  const apex = new THREE.Vector3(0, HV, 0);
  for (let k = 0; k < 6; k++) {
    const a0 = k * Math.PI / 3, a1 = (k + 1) * Math.PI / 3;
    const P0 = new THREE.Vector3(Math.cos(a0) * RV, HW, Math.sin(a0) * RV), P1 = new THREE.Vector3(Math.cos(a1) * RV, HW, Math.sin(a1) * RV);
    const mid = P0.clone().add(P1).multiplyScalar(0.5), along = P1.clone().sub(P0).normalize(), up = apex.clone().sub(mid).normalize();
    const g = new THREE.BufferGeometry();
    const pos = [P0, apex, P1].flatMap(p => [p.x, p.y, p.z]);
    const uv = [P0, apex, P1].flatMap(p => [p.clone().sub(mid).dot(along), p.clone().sub(mid).dot(up)]);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    add(room, g, M.boards, 0, 0, 0, { cast: false });
  }
  const rib = (p, q, w_ = 0.16, d_ = 0.24, mat = M.oakBeam) => {
    const len = p.distanceTo(q); const g = box(w_, d_, len, 'z');
    const m = add(room, g, mat); m.position.copy(p).add(q).multiplyScalar(0.5); m.lookAt(q);
    // push slightly below the ceiling plane
    const n = new THREE.Vector3(0, -1, 0).applyQuaternion(m.quaternion); m.position.addScaledVector(n, -d_ * 0.0);
    m.translateY(-d_ / 2 + 0.03);
    return m;
  };
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3, am = a + Math.PI / 6;
    const pc = new THREE.Vector3(Math.cos(a) * (RV - 0.21), HW, Math.sin(a) * (RV - 0.21));
    rib(pc, apex, 0.2, 0.3);
    const pm = new THREE.Vector3(Math.cos(am) * (A - 0.1), HW, Math.sin(am) * (A - 0.1));
    rib(pm, apex, 0.13, 0.2);
    // wall plate beam
    const p0 = new THREE.Vector3(Math.cos(a) * (RV - 0.12), HW + 0.02, Math.sin(a) * (RV - 0.12)), p1 = new THREE.Vector3(Math.cos(a + Math.PI / 3) * (RV - 0.12), HW + 0.02, Math.sin(a + Math.PI / 3) * (RV - 0.12));
    rib(p0, p1, 0.2, 0.22);
    // purlin ring at 45 % up the slope
    const t = 0.45, q0 = pc.clone().lerp(apex, t), q1 = new THREE.Vector3(Math.cos(a + Math.PI / 3) * (RV - 0.21), HW, Math.sin(a + Math.PI / 3) * (RV - 0.21)).lerp(apex, t);
    rib(q0, q1, 0.12, 0.16);
  }
  add(room, lathe([[0, 0], [0.12, 0], [0.2, 0.05], [0.3, 0.12], [0.34, 0.2], [0.3, 0.28], [0.18, 0.34], [0, 0.36]], 6), M.oakBeam, 0, HV - 0.52, 0);
  add(room, lathe([[0, 0], [0.05, 0.02], [0.09, 0.1], [0.07, 0.2], [0.03, 0.26], [0.035, 0.32], [0, 0.34]], 16), M.gilt, 0, HV - 0.82, 0);

  // ================================================================ BACK: fireplace
  {
    const w = walls[K.BACK];
    stoneWall(w, M, []);
    wainscot(w, -WW / 2 + 0.36, -1.48, M, { seed: 11 });
    wainscot(w, 1.48, WW / 2 - 0.36, M, { seed: 12 });
    const BW = 2.8, BD = 0.55;
    const open = tudorArch(1.62, 0, 0.82, 0.42, 14);
    const front = new THREE.Shape(); front.moveTo(-BW / 2, 0); front.lineTo(BW / 2, 0); front.lineTo(BW / 2, HW); front.lineTo(-BW / 2, HW); front.closePath();
    front.holes.push(shapeFrom(open, THREE.Path));
    const fgeo = new THREE.ShapeGeometry(front, 12); stoneUV(fgeo, 0.7);
    add(w, fgeo, M.stone, 0, 0, BD, { cast: false });
    [-1, 1].forEach(s => { const g = new THREE.PlaneGeometry(BD, HW); planarUV(g, 0, 1, 1, 1, s * 0.3, 0); add(w, g, M.stone, s * BW / 2, HW / 2, BD / 2, { ry: s * Math.PI / 2, cast: false }); });
    // firebox: reveal of the arch + soot-dark interior
    add(w, loft(resample(open, 60), resample(open, 60).map(p => new THREE.Vector2(p.x * 0.86, p.y * 0.94)), BD, 0.03), M.soot, 0, 0, 0, { cast: false });
    add(w, new THREE.PlaneGeometry(1.5, 1.2), M.soot, 0, 0.6, 0.025, { cast: false });
    { const fb = new THREE.Shape(); fb.moveTo(-0.5, 0); fb.lineTo(0.5, 0); fb.lineTo(0.5, 0.62); fb.quadraticCurveTo(0.5, 0.86, 0, 0.92); fb.quadraticCurveTo(-0.5, 0.86, -0.5, 0.62); fb.closePath();
      const fbg = new ExtrudeGeometry(fb, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.02, bevelSegments: 2 }); planarUV(fbg, 0, 1);
      add(w, fbg, M.iron, 0, 0.02, 0.04, { cast: false });
      const em = new THREE.Shape(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; k ? em.lineTo(Math.cos(a) * 0.16, Math.sin(a) * 0.16) : em.moveTo(Math.cos(a) * 0.16, Math.sin(a) * 0.16); } em.closePath();
      const eh = new THREE.Path(); for (let k = 0; k < 6; k++) { const a = -k * Math.PI / 3 + Math.PI / 6; k ? eh.lineTo(Math.cos(a) * 0.12, Math.sin(a) * 0.12) : eh.moveTo(Math.cos(a) * 0.12, Math.sin(a) * 0.12); } eh.closePath(); em.holes.push(eh);
      add(w, new ExtrudeGeometry(em, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 }), M.iron, 0, 0.6, 0.07, { cast: false }); }
    add(w, box(1.7, 0.04, 0.95), M.soot, 0, 0.02, 0.15, { cast: false });
    // arch surround moulding + hearth slab
    const ring = archRing(open, 0.13, 0.05, M, 0.018); ring.position.z = BD; ring.castShadow = true; w.add(ring);
    add(w, box(2.6, 0.06, 0.62), M.stoneTrim, 0, 0.03, BD + 0.3);
    // mantel: corbels + moulded shelf
    const mantelY = 1.58;
    [-1, 1].forEach(s => {
      const sc = new THREE.Shape(); sc.moveTo(0, 0); sc.lineTo(0.2, 0); sc.quadraticCurveTo(0.2, -0.12, 0.1, -0.2); sc.quadraticCurveTo(0.02, -0.3, 0.06, -0.42); sc.lineTo(0, -0.46); sc.closePath();
      const cg = new ExtrudeGeometry(sc, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 }); planarUV(cg, 2, 1);
      add(w, cg, M.stoneTrim, s * 1.18 - 0.08, mantelY, BD, { ry: -Math.PI / 2 });
    });
    add(w, moulding(-1.62, 1.62, [[0, 0], [0.22, 0], [0.24, 0.02], [0.3, 0.05], [0.34, 0.09], [0.34, 0.13], [0.0, 0.13]]), M.stoneTrim, 0, mantelY, BD);
    [-1, 1].forEach(s => { const g = new THREE.PlaneGeometry(0.34, 0.13); add(w, g, M.stoneTrim, s * 1.62, mantelY + 0.065, BD + 0.17, { ry: s * Math.PI / 2 }); });
    // logs, andirons, embers bed placeholder positions (fx module adds the fire)
    const fireO = new THREE.Vector3(0, 0.05, 0.24);
    ud.fireLocal = fireO; ud.fireWall = w;
    const logM = new THREE.MeshStandardMaterial({ map: tex.bark, normalMap: tex.bark_n, emissiveMap: tex.bark_e, emissive: new THREE.Color(1.0, 0.32, 0.06), emissiveIntensity: 2.2, roughness: 0.95 });
    ud.logMat = logM;
    [[0, 0.11, 0.3, 0.12, 0.9, 0.2], [-0.12, 0.12, 0.19, 0.1, 0.8, -0.35], [0.14, 0.24, 0.24, 0.09, 0.75, 0.5]].forEach(([x, y, z, r, L, ry]) => {
      const g = new THREE.CylinderGeometry(r, r * 1.08, L, 14, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 1.5);
      add(w, g, logM, x, y, z, { rz: Math.PI / 2, ry });
    });
    [-0.55, 0.55].forEach(x => {
      add(w, box(0.04, 0.04, 0.5), M.iron, x, 0.12, 0.24);
      add(w, box(0.04, 0.3, 0.04), M.iron, x, 0.15, 0.36);
      add(w, lathe([[0, 0], [0.035, 0], [0.05, 0.04], [0.035, 0.08], [0.02, 0.1], [0.04, 0.14], [0, 0.18]], 16), M.brass, x, 0.3, 0.36);
      add(w, box(0.12, 0.02, 0.03), M.iron, x, 0.01, 0.36);
    });
    // overmantel: the turning portrait (two faces; the hidden one is repainted before each turn)
    const pv = new THREE.Group(); pv.position.set(0, 2.95, BD + 0.08); w.add(pv);
    const pf = portrait(M, tex, tex.p_woodweave, 1.62, 1.06, null); pv.add(pf);
    const pb = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 1.06), new THREE.MeshStandardMaterial({ map: tex.p_ship, normalMap: tex.canvas_n, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.38 }));
    pb.rotation.y = Math.PI; pb.position.z = -0.016; pv.add(pb);
    const fb2 = gildedFrame(1.62, 1.06, M); fb2.rotation.y = Math.PI; fb2.position.z = -0.022; pv.add(fb2);
    ud.anim.portrait = pv; ud.anim.faceA = pf.userData.pic.material; ud.anim.faceB = pb.material;
    const plaque = makePlaque();
    const plq = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.008), [M.brass, M.brass, M.brass, M.brass, new THREE.MeshStandardMaterial({ map: plaque.t, metalness: 0.6, roughness: 0.5 }), M.brass]);
    plq.position.set(0, 2.12, BD + 0.01); w.add(plq);
    ud.anim.plaque = plq; ud.plaque = plaque;
    ud.mantel = { wall: w, y: mantelY + 0.13, z: BD + 0.16 };
    // brass picture light over the frame, so the painting reads when you walk up to it
    {
      const py = 3.8;
      add(w, box(0.1, 0.07, 0.02), M.brass, 0, py, BD + 0.01);
      const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(0, py, BD + 0.02), new THREE.Vector3(0, py + 0.06, BD + 0.14), new THREE.Vector3(0, py + 0.05, BD + 0.3)]);
      add(w, new THREE.TubeGeometry(arm, 12, 0.008, 8), M.brass);
      const hood = new THREE.CylinderGeometry(0.032, 0.032, 0.62, 24); hood.rotateZ(Math.PI / 2);
      add(w, hood, M.brass, 0, py + 0.03, BD + 0.32);
      add(w, new THREE.CylinderGeometry(0.01, 0.01, 0.56, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 4.2, 2.6) }), 0, py + 0.002, BD + 0.345, { rz: Math.PI / 2, cast: false, recv: false });
      const pl = new THREE.SpotLight(0xffe0b0, 2.2, 0, 0.8, 0.85, 2); pl.position.set(0, py - 0.01, BD + 0.36); pl.target.position.set(0, 2.82, BD + 0.08);
      w.add(pl, pl.target); ud.lights.picture = pl;
    }
  }

  // ================================================================ BL: bookcases with a secret bay
  {
    const w = walls[K.BL];
    const passX = 0.66, passW = 1.1, passH = 2.75;
    stoneWall(w, M, [[new THREE.Vector2(passX - passW / 2, 0.02), new THREE.Vector2(passX - passW / 2, passH), new THREE.Vector2(passX + passW / 2, passH), new THREE.Vector2(passX + passW / 2, 0.02)]]);
    ud.books = buildBookcase(w, M, tex, passX);
    // the passage behind: stone corridor rising into warm light
    const pg = new THREE.Group(); pg.position.set(passX, 0, 0); w.add(pg);
    const D = 3.2;
    add(pg, (() => { const g = new THREE.PlaneGeometry(passW, D); g.rotateX(-Math.PI / 2); planarUV(g, 0, 2); return g; })(), M.stoneTrim, 0, 0.01, -D / 2, { cast: false });
    [-1, 1].forEach(s => { const g = new THREE.PlaneGeometry(D, passH); planarUV(g, 0, 1); add(pg, g, M.stone, s * passW / 2, passH / 2, -D / 2, { ry: -s * Math.PI / 2, cast: false }); });
    add(pg, (() => { const g = new THREE.PlaneGeometry(passW, D); g.rotateX(Math.PI / 2); return g; })(), M.stone, 0, passH, -D / 2, { cast: false });
    for (let i = 0; i < 6; i++) add(pg, box(passW, 0.17, 0.3), M.stoneTrim, 0, 0.085 + i * 0.17, -1.4 - i * 0.3);
    const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 2.8, 1.2) });
    add(pg, new THREE.PlaneGeometry(passW, passH), M.stone, 0, passH / 2, -D + 0.005, { cast: false });
    const endArch = pointedArch(0.74, 1.02, 1.95, 16, 1.0);
    add(pg, new THREE.ShapeGeometry(shapeFrom(endArch)), glowM, 0, 0, -D + 0.012, { cast: false, recv: false });
    // a torch on the passage wall
    const tb = new THREE.Group(); tb.position.set(passW / 2 - 0.02, 1.75, -1.0); tb.rotation.y = -Math.PI / 2; pg.add(tb);
    add(tb, box(0.08, 0.16, 0.02), M.iron, 0, 0, 0.01);
    add(tb, new THREE.CylinderGeometry(0.025, 0.018, 0.3, 10), M.oakDark, 0, 0.08, 0.1, { rx: 0.5 });
    add(tb, new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 3.6, 1.0) }), 0, 0.22, 0.17, { cast: false, recv: false }).scale.set(1, 1.6, 1);
    const pl = new THREE.PointLight(0xffa860, 0, 0, 2); pl.position.set(passX, 1.9, -0.9); w.add(pl); ud.lights.passage = pl;
    const pl2 = new THREE.PointLight(0xffc080, 3, 0, 2); pl2.position.set(passX, 2.2, -2.6); w.add(pl2);
    ud.passageWall = w;
  }

  // ================================================================ BR: the lancet window with a seat
  {
    const w = walls[K.BR];
    const inner = pointedArch(WIN.wIn, WIN.yIn, WIN.spring, 26, WIN.sharp);
    stoneWall(w, M, [inner]);
    wainscot(w, -WW / 2 + 0.36, -WIN.wIn / 2 - 0.08, M, { seed: 21 });
    wainscot(w, WIN.wIn / 2 + 0.08, WW / 2 - 0.36, M, { seed: 22 });
    const outer = pointedArch(WIN.wOut, WIN.yOut, WIN.spring + 0.05, 26, WIN.sharp);
    const ni = resample(inner, 90), no = resample(outer, 90);
    add(w, loft(ni, no, 0, -WIN.depth), M.stone, 0, 0, 0, { cast: true });
    // seat board inside the embrasure + panelled front
    const seat = new THREE.Shape(); seat.moveTo(-WIN.wIn / 2, 0.06); seat.lineTo(WIN.wIn / 2, 0.06); seat.lineTo(WIN.wOut / 2, -WIN.depth); seat.lineTo(-WIN.wOut / 2, -WIN.depth); seat.closePath();
    const sg = new ExtrudeGeometry(seat, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }); sg.rotateX(Math.PI / 2); planarUV(sg, 0, 2);
    add(w, sg, M.oak, 0, WIN.yIn + 0.05, 0);
    wainscot(w, -WIN.wIn / 2 - 0.02, WIN.wIn / 2 + 0.02, M, { top: WIN.yIn + 0.02, rows: [[0.24, WIN.yIn - 0.06]], seed: 23 });
    // tracery plate with two lancets and an oculus
    const lanc = (cx) => pointedArch(0.6, 1.05, 3.08, 18, 0.9).map(p => new THREE.Vector2(p.x + cx, p.y));
    const ocu = []; for (let i = 0; i < 40; i++) { const a = -i / 40 * Math.PI * 2; ocu.push(new THREE.Vector2(Math.cos(a) * 0.25, 4.02 + Math.sin(a) * 0.25)); }
    const plate = shapeFrom(outer); [lanc(-0.4), lanc(0.4), ocu].forEach(h => plate.holes.push(shapeFrom(h, THREE.Path)));
    const pgeo = new ExtrudeGeometry(plate, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6 }); planarUV(pgeo, 0, 1);
    add(w, pgeo, M.stoneTrim, 0, 0, -WIN.depth - 0.06);
    // glass: one quad covering all openings, drawn with the window shader (fx assigns material)
    const glassGeo = new THREE.PlaneGeometry(WIN.wOut, 3.45, 1, 1);
    const gm = add(w, glassGeo, M.black, 0, 2.675, -WIN.depth - 0.11, { cast: true, recv: false });
    ud.glass = gm; ud.windowWall = w;
    // iron lattice saddle bars
    for (let y = 1.4; y < 3.6; y += 0.42) add(w, box(WIN.wOut, 0.014, 0.014, 'x'), M.iron, 0, y, -WIN.depth - 0.1);
    // cushions
    const cushion = (wd, dp, th, x, z, ry, mat) => {
      const s = new THREE.Shape(); const r = 0.05; s.moveTo(-wd / 2 + r, -dp / 2); s.lineTo(wd / 2 - r, -dp / 2); s.quadraticCurveTo(wd / 2, -dp / 2, wd / 2, -dp / 2 + r); s.lineTo(wd / 2, dp / 2 - r); s.quadraticCurveTo(wd / 2, dp / 2, wd / 2 - r, dp / 2); s.lineTo(-wd / 2 + r, dp / 2); s.quadraticCurveTo(-wd / 2, dp / 2, -wd / 2, dp / 2 - r); s.lineTo(-wd / 2, -dp / 2 + r); s.quadraticCurveTo(-wd / 2, -dp / 2, -wd / 2 + r, -dp / 2);
      const g = new ExtrudeGeometry(s, { depth: th * 0.3, bevelEnabled: true, bevelThickness: th * 0.35, bevelSize: 0.04, bevelSegments: 4, curveSegments: 6 }); g.rotateX(-Math.PI / 2); planarUV(g, 0, 2);
      return add(w, g, mat, x, WIN.yIn + 0.12, z, { ry });
    };
    cushion(1.66, 0.48, 0.1, 0, -0.27, 0, M.velvet);
    const pil = (x, ry, mat) => { const g = new THREE.SphereGeometry(0.2, 24, 16); g.scale(1, 0.55, 0.3); const m = add(w, g, mat, x, WIN.yIn + 0.36, -0.5, { ry }); m.rotation.x = -0.25; return m; };
    pil(-0.62, 0.35, M.velvetGreen); pil(0.66, -0.4, M.velvet);
    ud.seat = { wall: w, y: WIN.yIn + 0.2 };
  }

  // ================================================================ LEFT / RIGHT: arched oak doors under portraits
  // LEFT leads back to the hall, RIGHT to every door at once; the painting above each says where.
  ud.doors = [];
  [[K.LEFT, 'p_hall'], [K.RIGHT, 'p_all']].forEach(([k, img], di) => {
    const w = walls[k];
    const op = pointedArch(DOOR.w, 0, DOOR.spring, 22, 1.0);
    stoneWall(w, M, [op]);
    wainscot(w, -WW / 2 + 0.36, -DOOR.w / 2 - 0.26, M, { seed: 31 + di });
    wainscot(w, DOOR.w / 2 + 0.26, WW / 2 - 0.36, M, { seed: 33 + di });
    add(w, loft(resample(op, 70), resample(op, 70), 0, -0.5), M.stoneTrim, 0, 0, 0, { cast: false });
    const ring = archRing(op, 0.22, 0.06, M, 0.02); w.add(ring); ring.castShadow = true;
    const hinge = new THREE.Group(); hinge.position.set(-DOOR.w / 2 + 0.01, 0, -0.34); w.add(hinge);
    const leaf = oakDoor(op, M, tex, di); leaf.position.set(DOOR.w / 2 - 0.01, 0, 0); hinge.add(leaf);
    hinge.userData.dynamic = true;
    const ves = vestibule(DOOR.w + 0.5, 3.7, 1.4, tex[img]); ves.position.set(0, 0, -0.5); w.add(ves);
    const plaque = makePlaque();
    const p = portrait(M, tex, tex[img] || tex.p_terrain, 1.3, 0.85, plaque); p.position.set(0, 4.36, 0.04); w.add(p);
    ud.doors.push({ wall: w, hinge, plaque, vestibule: ves });
  });

  // ================================================================ FRONT: panelling, banner
  {
    const w = walls[K.FRONT];
    stoneWall(w, M, []);
    wainscot(w, -WW / 2 + 0.36, WW / 2 - 0.36, M, { seed: 41 });
  }
  // banners flanking the chimney breast
  [[-1, 0x6e1218, 0xc9a24a], [1, 0x14403a, 0xc9a24a]].forEach(([s, base, trim]) => {
    const w = walls[K.BACK];
    const b = banner(base, trim, s < 0 ? 'hex' : 'star');
    b.position.set(s * 2.06, 4.95, 0.12); w.add(b);
    add(w, new THREE.CylinderGeometry(0.014, 0.014, 0.95, 8), M.iron, s * 2.06, 4.98, 0.12, { rz: Math.PI / 2 });
    [-1, 1].forEach(e => add(w, new THREE.SphereGeometry(0.03, 12, 8), M.brass, s * 2.06 + e * 0.48, 4.98, 0.12));
  });

  room.userData = ud;
  return room;
}

// ------------------------------------------------------------------ banner with an original emblem
function bannerCanvas(base, trim, emblem) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1280; const x = c.getContext('2d');
  const b = '#' + new THREE.Color(base).getHexString(), t = '#' + new THREE.Color(trim).getHexString();
  x.fillStyle = b; x.fillRect(0, 0, 512, 1280);
  // swallow tail
  x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(0, 1280); x.lineTo(256, 1110); x.lineTo(512, 1280); x.closePath(); x.fill(); x.globalCompositeOperation = 'source-over';
  x.strokeStyle = t; x.lineWidth = 16; x.beginPath(); x.moveTo(30, 0); x.lineTo(30, 1230); x.lineTo(256, 1080); x.lineTo(482, 1230); x.lineTo(482, 0); x.stroke();
  x.lineWidth = 4; x.beginPath(); x.moveTo(52, 0); x.lineTo(52, 1190); x.lineTo(256, 1052); x.lineTo(460, 1190); x.lineTo(460, 0); x.stroke();
  x.save(); x.translate(256, 520); x.strokeStyle = t; x.fillStyle = t; x.lineWidth = 10;
  const hexP = (r) => { x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; k ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); };
  if (emblem === 'hex') {
    hexP(170); x.stroke(); hexP(140); x.lineWidth = 4; x.stroke();
    for (let k = 0; k < 7; k++) { const a = k * Math.PI / 3, r = k ? 62 : 0; x.save(); x.translate(Math.cos(a) * r, Math.sin(a) * r); hexP(30); x.lineWidth = 6; x.stroke(); x.restore(); }
  } else {
    x.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8 - Math.PI / 2, r = k % 2 ? 60 : 170; k ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill();
    x.fillStyle = b; x.beginPath(); x.arc(0, 0, 40, 0, Math.PI * 2); x.fill(); x.strokeStyle = t; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 200, 0, Math.PI * 2); x.stroke();
  }
  x.restore();
  x.fillStyle = t; x.font = '600 64px Cinzel, serif'; x.textAlign = 'center'; x.fillText(emblem === 'hex' ? 'YH' : 'MMXXVI', 256, 860);
  // woven noise
  const img = x.getImageData(0, 0, 512, 1280), d = img.data; const R = rng(9);
  for (let i = 0; i < d.length; i += 4) { const k = 0.9 + R() * 0.16 + ((i / 4) % 512 % 3 === 0 ? -0.04 : 0); d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
  x.putImageData(img, 0, 0);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
}

function banner(base, trim, emblem) {
  const W = 0.86, H = 2.15;
  const g = new THREE.PlaneGeometry(W, H, 20, 40); g.translate(0, -H / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const v = -y / H; p.setZ(i, Math.sin(x * 14 + 0.5) * 0.018 * (0.3 + v) + Math.sin(x * 5) * 0.01); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: bannerCanvas(base, trim, emblem), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, sheen: 0.8, sheenColor: new THREE.Color(0xffd0a0), sheenRoughness: 0.5 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------ plank door with iron straps
function oakDoor(op, M, tex, seed) {
  const g = new THREE.Group(); g.position.z = -0.34;
  const hw = DOOR.w / 2 - 0.01, r = DOOR.w, cxL = -DOOR.w / 2 + r, cxR = DOOR.w / 2 - r;
  const top = (x) => x <= 0 ? DOOR.spring + Math.sqrt(Math.max(0, r * r - (x - cxL) ** 2)) : DOOR.spring + Math.sqrt(Math.max(0, r * r - (x - cxR) ** 2));
  const n = 6, pw = (2 * hw) / n, R = rng(77 + seed);
  for (let i = 0; i < n; i++) {
    const x0 = -hw + i * pw + 0.004, x1 = -hw + (i + 1) * pw - 0.004;
    const pts = [new THREE.Vector2(x0, 0), new THREE.Vector2(x1, 0)];
    for (let k = 0; k <= 8; k++) { const x = x1 - (x1 - x0) * k / 8; pts.push(new THREE.Vector2(x, top(x) - 0.012)); }
    const sh = shapeFrom(pts);
    const geo = new ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
    planarUV(geo, 1, 0, 1, 1, R() * 2, R());
    const m = new THREE.Mesh(geo, M.oakDark); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  // strap hinges with nails
  const nails = [];
  [0.42, 1.55, 2.55].forEach((y) => {
    const L = y > 2.4 ? 1.0 : 1.2;
    const s = new THREE.Mesh(boxUV(new THREE.BoxGeometry(L, 0.055, 0.01)), M.iron); s.position.set(-hw + L / 2, y, 0.072); s.castShadow = true; g.add(s);
    const tip = new THREE.Shape(); tip.moveTo(0, -0.05); tip.lineTo(0.09, 0); tip.lineTo(0, 0.05); tip.closePath();
    const tg = new THREE.Mesh(new ExtrudeGeometry(tip, { depth: 0.01, bevelEnabled: false }), M.iron); tg.position.set(-hw + L, y, 0.067); g.add(tg);
    for (let k = 0; k < 6; k++) nails.push(new THREE.Vector3(-hw + 0.08 + k * (L - 0.1) / 5, y, 0.08));
  });
  for (let i = 0; i < 6; i++) for (const y of [0.2, 1.1, 2.0]) nails.push(new THREE.Vector3(-hw + pw * (i + 0.5), y, 0.068));
  const ng = new THREE.SphereGeometry(0.012, 10, 6); ng.scale(1, 1, 0.6);
  const inst = new THREE.InstancedMesh(ng, M.iron, nails.length); const m4 = new THREE.Matrix4();
  nails.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); inst.setMatrixAt(i, m4); }); inst.castShadow = true; g.add(inst);
  // ring pull + escutcheon
  const esc = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 24), M.iron); esc.rotation.x = Math.PI / 2; esc.position.set(hw - 0.22, 1.12, 0.075); g.add(esc);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.011, 10, 32), M.iron); ringM.position.set(hw - 0.22, 1.04, 0.088); ringM.rotation.x = -0.25; ringM.castShadow = true; g.add(ringM);
  const kh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.008), M.brassDark); kh.position.set(hw - 0.22, 0.9, 0.072); g.add(kh);
  return g;
}

// ------------------------------------------------------------------ bookcase + instanced books
export function bookMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.62, map: tex.leather, normalMap: tex.leather_n, normalScale: new THREE.Vector2(0.35, 0.35) });
  patchMaterial(mat, 'books', (sh) => {
    sh.uniforms.tAtlas = { value: tex.books };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCell; attribute vec3 aTint; varying vec2 vBUV; varying vec2 vFUV; varying float vFace; varying vec3 vTint;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        float cx = mod(aCell, 16.0), cy = floor(aCell / 16.0);
        vBUV = vec2((cx + uv.x) / 16.0, 1.0 - (cy + 1.0 - uv.y) / 4.0);
        vFUV = uv;
        vFace = normal.z > 0.5 ? 0.0 : (abs(normal.y) > 0.5 ? 1.0 : 2.0); vTint = aTint;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tAtlas; varying vec2 vBUV; varying vec2 vFUV; varying float vFace; varying vec3 vTint;')
      .replace('#include <map_fragment>', `
        vec3 bc;
        if (vFace < 0.5) { bc = texture2D(tAtlas, vBUV).rgb; }
        else if (vFace < 1.5) { float e = min(min(vFUV.x, 1.0 - vFUV.x), min(vFUV.y, 1.0 - vFUV.y)); float pg = 0.78 + 0.08 * sin(vFUV.x * 260.0); bc = mix(vTint * 0.8, vec3(0.80, 0.73, 0.58) * pg, smoothstep(0.03, 0.06, e)); }
        else { bc = vTint * (0.75 + 0.5 * texture2D(map, vFUV * 2.0).r); }
        diffuseColor.rgb *= bc;`);
  });
  return mat;
}

function buildBookcase(w, M, tex, passX) {
  const BCW = 5.1, BCH = 4.7, BD = 0.42, upr = 0.07, nb = 4;
  const bayW = (BCW - (nb + 1) * upr) / nb;
  const g = new THREE.Group(); w.add(g);
  const shelvesY = [0.24, 0.8, 1.36, 1.92, 2.48, 3.04, 3.6, 4.16];
  const R = rng(1234);
  const books = [];
  const bayX = (i) => -BCW / 2 + upr + bayW / 2 + i * (bayW + upr);
  // secret bay index: the one in front of the passage
  let secret = 0; let best = 1e9; for (let i = 0; i < nb; i++) { const d = Math.abs(bayX(i) - passX); if (d < best) { best = d; secret = i; } }
  const pivot = new THREE.Group(); pivot.position.set(bayX(secret) + bayW / 2, 0, BD); w.add(pivot);
  const bayGroup = (i) => i === secret ? pivot : g;
  const ox = (i) => i === secret ? -(bayX(secret) + bayW / 2) : 0, oz = (i) => i === secret ? -BD : 0;
  for (let i = 0; i <= nb; i++) { const x = -BCW / 2 + upr / 2 + i * (bayW + upr); add(g, box(upr, BCH - 0.2, BD, 'y'), M.oak, x, 0.1 + (BCH - 0.2) / 2, BD / 2); }
  add(g, moulding(-BCW / 2 - 0.04, BCW / 2 + 0.04, [[0, 0], [BD + 0.03, 0], [BD + 0.03, 0.16], [BD + 0.01, 0.18], [BD, 0.2], [0, 0.2]]), M.oakDark);
  add(g, moulding(-BCW / 2 - 0.1, BCW / 2 + 0.1, [[0, 0], [BD + 0.0, 0], [BD + 0.02, 0.04], [BD + 0.06, 0.1], [BD + 0.1, 0.16], [BD + 0.14, 0.22], [BD + 0.14, 0.28], [0, 0.28]]), M.oak, 0, BCH - 0.18, 0);
  for (let i = 0; i < nb; i++) {
    const G = bayGroup(i), X = bayX(i) + ox(i), Z = oz(i);
    const back = new THREE.PlaneGeometry(bayW, BCH - 0.3); planarUV(back, 1, 0, 1, 1, i * 0.7, 0);
    add(G, back, M.oakDark, X, 0.2 + (BCH - 0.3) / 2, 0.012 + Z, { cast: false });
    if (i === secret) { const bk2 = back.clone(); add(G, bk2, M.oakDark, X, 0.2 + (BCH - 0.3) / 2, 0.006 + Z, { cast: false, ry: Math.PI }); [-1, 1].forEach(s => add(G, box(0.02, BCH - 0.3, BD, 'y'), M.oak, X + s * (bayW / 2 - 0.01), 0.2 + (BCH - 0.3) / 2, BD / 2 + Z)); }
    shelvesY.forEach((y) => add(G, box(bayW, 0.034, BD - 0.02, 'x'), M.oak, X, y, BD / 2 + Z));
    for (let s = 0; s < shelvesY.length - 1; s++) {
      const y0 = shelvesY[s] + 0.017, room = shelvesY[s + 1] - y0 - 0.02;
      let x = -bayW / 2 + 0.015;
      while (x < bayW / 2 - 0.03) {
        const roll = R();
        if (roll < 0.035) { x += 0.08 + R() * 0.12; continue; }
        if (roll < 0.09) {
          // a horizontal stack
          const n = 2 + Math.floor(R() * 4); let yy = y0; const wd = 0.2 + R() * 0.08;
          if (x + wd > bayW / 2 - 0.02) break;
          for (let k = 0; k < n; k++) { const th = 0.03 + R() * 0.04, dd = 0.18 + R() * 0.07; books.push({ g: G, x: X + x + wd / 2, y: yy + th / 2, z: BD - 0.035 - dd + Z + (R() - 0.5) * 0.02, t: wd, h: th, d: dd, flat: true, ry: (R() - 0.5) * 0.12 }); yy += th; }
          x += wd + 0.01; continue;
        }
        const t = 0.024 + R() * 0.055, h = Math.min(room - 0.01, 0.2 + R() * 0.22 + (s < 2 ? 0.06 : 0)), d = 0.16 + R() * 0.12;
        if (x + t > bayW / 2 - 0.012) break;
        books.push({ g: G, x: X + x + t / 2, y: y0 + h / 2, z: BD - 0.03 - d + Z - R() * 0.025, t, h, d, lean: 0 });
        x += t + 0.002 + R() * 0.004;
      }
    }
  }
  // instanced: one mesh per parent group
  const bookGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = bookMaterial(tex);
  const tints = [0x5a1712, 0x1b3a2a, 0x1b2440, 0x7a5a2e, 0x4a2c18, 0x1c1714, 0x3a1c30, 0x6a5420, 0x1e4a48, 0x6a1a1a];
  const groups = new Map(); books.forEach(b => { if (!groups.has(b.g)) groups.set(b.g, []); groups.get(b.g).push(b); });
  const meshes = [];
  for (const [G, list] of groups) {
    const inst = new THREE.InstancedMesh(bookGeo, mat, list.length);
    const aCell = new Float32Array(list.length), aTint = new Float32Array(list.length * 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach((b, i) => {
      if (b.flat) { e.set(0, b.ry, Math.PI / 2); q.setFromEuler(e); m4.compose(new THREE.Vector3(b.x, b.y, b.z + b.d / 2), q, new THREE.Vector3(b.h, b.t, b.d)); }
      else { q.identity(); m4.compose(new THREE.Vector3(b.x, b.y, b.z + b.d / 2), q, new THREE.Vector3(b.t, b.h, b.d)); }
      inst.setMatrixAt(i, m4); aCell[i] = Math.floor(R() * 64); const c = new THREE.Color(tints[Math.floor(R() * tints.length)]); aTint.set([c.r, c.g, c.b], i * 3);
    });
    inst.geometry = bookGeo.clone();
    inst.geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 1));
    inst.geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(aTint, 3));
    inst.castShadow = true; inst.receiveShadow = true; G.add(inst); meshes.push(inst);
  }
  // rolling ladder on a brass rail
  const railY = 4.32, railZ = BD + 0.1;
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, BCW, 12), M.brass); rail.rotation.z = Math.PI / 2; rail.position.set(0, railY, railZ); rail.castShadow = true; w.add(rail);
  [-BCW / 2 + 0.2, 0, BCW / 2 - 0.2].forEach(x => add(w, box(0.03, 0.03, railZ - BD + 0.05), M.brass, x, railY, (BD + railZ) / 2));
  const ladder = new THREE.Group(); ladder.position.set(-1.2, 0, 0); w.add(ladder);
  const foot = 0.95, len = Math.hypot(railY, foot);
  const tilt = Math.atan2(foot, railY);
  const lg = new THREE.Group(); lg.position.set(0, railY, railZ); lg.rotation.x = -tilt; ladder.add(lg);
  [-0.24, 0.24].forEach(x => add(lg, box(0.045, len, 0.07, 'y'), M.oak, x, -len / 2, 0.02));
  for (let i = 1; i < 14; i++) { const y = -len + i * (len / 14); add(lg, new THREE.CylinderGeometry(0.016, 0.016, 0.48, 10), M.brassDark, 0, y, 0.02, { rz: Math.PI / 2 }); }
  [-0.24, 0.24].forEach(x => { add(lg, new THREE.TorusGeometry(0.035, 0.008, 8, 16, Math.PI), M.brass, x, 0.0, -0.02, { ry: Math.PI / 2 }); add(lg, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), M.brass, x, -len + 0.03, 0.02, { rz: Math.PI / 2 }); });
  // a few curios on the shelves
  const curios = new THREE.Group(); w.add(curios);
  return { group: g, pivot, ladder, secretX: bayX(secret), bayW, meshes, BD, curios };
}
