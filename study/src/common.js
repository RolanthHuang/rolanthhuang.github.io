import * as THREE from 'three';
import { mergeGeometries } from 'three';

// Helpers adapted from ShipInBottle (same author, MIT). Units here are metres.
export const U = { time: { value: 0 } };
export const GLSL_UTIL = /* glsl */`
float ss(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
float fbm2(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+1.7; a*=.5; } return s; }
`;

export function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
export function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed = 1) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = r();
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const X = xi & 255, Y = yi & 255;
    const a = vals[perm[X + perm[Y]]], b = vals[perm[X + 1 + perm[Y]]];
    const c = vals[perm[X + perm[Y + 1]]], d = vals[perm[X + 1 + perm[Y + 1]]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 4) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }
  return { noise, fbm };
}

// Chainable onBeforeCompile helpers ------------------------------------------------
export function patchMaterial(mat, key, fn) {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
  mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); fn(sh, r); };
  mat.customProgramCacheKey = () => prevKey + '|' + key;
  return mat;
}

// Triplanar texturing for organic meshes without good UVs (island, rocks)
export function addTriplanar(mat, { map, normalMap, scale = 4, mapB = null, blendUp = 0, scaleB = 6, tintB = null }) {
  return patchMaterial(mat, 'tri' + scale + (mapB ? 'B' : ''), (sh) => {
    sh.uniforms.tTri = { value: map };
    sh.uniforms.tTriN = { value: normalMap };
    sh.uniforms.tTriB = { value: mapB || map };
    sh.uniforms.uTriS = { value: scale };
    sh.uniforms.uTriSB = { value: scaleB };
    sh.uniforms.uBlendUp = { value: blendUp };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriP; varying vec3 vTriN; varying vec3 vTV0; varying vec3 vTV1; varying vec3 vTV2;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTriP = position; vTriN = normal; mat4 tvm = viewMatrix * modelMatrix; vTV0 = (tvm * vec4(1.,0.,0.,0.)).xyz; vTV1 = (tvm * vec4(0.,1.,0.,0.)).xyz; vTV2 = (tvm * vec4(0.,0.,1.,0.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vTriP; varying vec3 vTriN; varying vec3 vTV0; varying vec3 vTV1; varying vec3 vTV2; uniform sampler2D tTri; uniform sampler2D tTriN; uniform sampler2D tTriB; uniform float uTriS; uniform float uTriSB; uniform float uBlendUp;
        vec3 triW(vec3 n){ vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z); }`)
      .replace('#include <map_fragment>', `
        vec3 tw = triW(normalize(vTriN));
        vec3 tcol = texture2D(tTri, vTriP.zy*uTriS).rgb*tw.x + texture2D(tTri, vTriP.xz*uTriS).rgb*tw.y + texture2D(tTri, vTriP.xy*uTriS).rgb*tw.z;
        ${mapB ? `vec3 tcolB = texture2D(tTriB, vTriP.xz*uTriSB).rgb; float upk = smoothstep(0.55, 0.85, normalize(vTriN).y) * uBlendUp * vColor.g; tcol = mix(tcol, tcolB, upk);` : ''}
        diffuseColor.rgb *= tcol * 1.6;`)
      .replace('#include <normal_fragment_maps>', `
        {
          vec3 n0 = normalize(vTriN);
          vec3 nx = texture2D(tTriN, vTriP.zy*uTriS).xyz*2.-1.;
          vec3 ny = texture2D(tTriN, vTriP.xz*uTriS).xyz*2.-1.;
          vec3 nz = texture2D(tTriN, vTriP.xy*uTriS).xyz*2.-1.;
          // whiteout blend in object space
          vec3 bx = vec3(nx.xy + n0.zy, abs(nx.z) * n0.x);
          vec3 by = vec3(ny.xy + n0.xz, abs(ny.z) * n0.y);
          vec3 bz = vec3(nz.xy + n0.xy, abs(nz.z) * n0.z);
          vec3 nObj = normalize(bx.zyx * tw.x + by.xzy * tw.y + bz * tw.z);
          normal = normalize(vTV0 * nObj.x + vTV1 * nObj.y + vTV2 * nObj.z);
        }`);
  });
}

export function enableLayers(obj, ...ls) { obj.traverse(o => ls.forEach(l => o.layers.enable(l))); }

export function shadowAll(obj, cast = true, receive = true) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
}

// Sweep a 2D profile along a closed (or open) path in the XZ plane.
// path: array of {p: Vector3 (y ignored), n: Vector3 outward normal in XZ}
// profile: array of [offset (outward), y]; returns BufferGeometry with uv (u along path length, v along profile)
export function sweep(path, profile, closed = true) {
  const pos = [], uv = [], idx = [];
  const np = path.length, nq = profile.length;
  const lens = [0];
  for (let i = 1; i < np; i++) lens.push(lens[i - 1] + path[i].p.distanceTo(path[i - 1].p));
  const total = lens[np - 1] + (closed ? path[np - 1].p.distanceTo(path[0].p) : 0);
  const plen = [0];
  for (let j = 1; j < nq; j++) plen.push(plen[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
  const ptot = plen[nq - 1] || 1;
  const ring = closed ? np + 1 : np;
  for (let i = 0; i < ring; i++) {
    const k = i % np; const P = path[k];
    const u = i === np ? total : lens[k];
    for (let j = 0; j < nq; j++) {
      const [o, y] = profile[j];
      pos.push(P.p.x + P.n.x * o, y, P.p.z + P.n.z * o);
      uv.push(u, plen[j] / ptot);
    }
  }
  for (let i = 0; i < ring - 1; i++) for (let j = 0; j < nq - 1; j++) {
    const a = i * nq + j, b = (i + 1) * nq + j;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function ellipsePath(rx, rz, n = 256, cx = 0, cz = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const p = new THREE.Vector3(cx + Math.cos(a) * rx, 0, cz + Math.sin(a) * rz);
    const nn = new THREE.Vector3(Math.cos(a) / rx, 0, Math.sin(a) / rz).normalize();
    out.push({ p, n: nn });
  }
  return out;
}

// Rounded rectangle path (counter-clockwise seen from above), outward normals
export function roundRectPath(x0, x1, z0, z1, r, nArc = 8) {
  const out = [];
  const corners = [[x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI], [x1 - r, z0 + r, Math.PI * 1.5]];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= nArc; i++) {
      const a = a0 + i / nArc * Math.PI / 2;
      out.push({ p: new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r), n: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) });
    }
  }
  return out;
}

// Merge static meshes under `root` by material (cuts draw calls). Kept objects (and their subtrees) stay untouched.
export function mergeStatic(root, keep = []) {
  const keepSet = new Set(keep.filter(Boolean));
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o === root) return;
    let a = o; while (a && a !== root) { if (keepSet.has(a) || a.userData.pickId || a.userData.dynamic) return; a = a.parent; }
    if (Array.isArray(o.material) || o.material.transparent || o.material.blending !== THREE.NormalBlending || !o.visible || o.renderOrder) return;
    const g0 = o.geometry;
    if (g0.morphAttributes && Object.keys(g0.morphAttributes).length) return;
    const g = g0.index ? g0.toNonIndexed() : g0.clone();
    const keepColor = !!o.material.vertexColors;
    for (const name of Object.keys(g.attributes)) if (!(name === 'position' || name === 'normal' || name === 'uv' || (keepColor && name === 'color'))) g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (keepColor && !g.attributes.color) return;
    g.clearGroups();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + '|' + o.castShadow + o.receiveShadow + '|' + o.layers.mask + '|' + keepColor;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [], cast: o.castShadow, recv: o.receiveShadow, mask: o.layers.mask });
    buckets.get(key).geos.push(g); remove.push(o);
  });
  remove.forEach(o => o.parent && o.parent.remove(o));
  let n = 0;
  for (const b of buckets.values()) {
    const mg = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos);
    if (!mg) continue;
    mg.computeBoundingSphere();
    const m = new THREE.Mesh(mg, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.layers.mask = b.mask; m.userData.merged = true;
    root.add(m); n++;
  }
  return { removed: remove.length, added: n };
}

// ---------------------------------------------------------------- study helpers
export const TAU = Math.PI * 2;

/** World-scale box-projected UVs (metres). grain: 'x'|'y'|'z'|'long' picks the axis mapped to u. */
export function boxUV(geo, { grain = 'long', su = 1, sv = 1, ou = 0, ov = 0 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeBoundingBox();
  const bb = g.boundingBox, ext = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  const gAxis = grain === 'x' ? 0 : grain === 'y' ? 1 : grain === 'z' ? 2 : ext.indexOf(Math.max(...ext));
  for (let i = 0; i < p.count; i++) {
    const nn = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
    const ax = nn.indexOf(Math.max(...nn));
    const inPlane = [0, 1, 2].filter(a => a !== ax);
    let ua = inPlane.includes(gAxis) ? gAxis : (ext[inPlane[0]] >= ext[inPlane[1]] ? inPlane[0] : inPlane[1]);
    const va = inPlane.find(a => a !== ua);
    const P = [p.getX(i), p.getY(i), p.getZ(i)];
    uv[i * 2] = P[ua] * su + ou; uv[i * 2 + 1] = P[va] * sv + ov;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Planar UVs from two position axes (0=x,1=y,2=z), metres * scale. */
export function planarUV(geo, au = 0, av = 1, su = 1, sv = 1, ou = 0, ov = 0) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const P = [p.getX(i), p.getY(i), p.getZ(i)]; uv[i * 2] = P[au] * su + ou; uv[i * 2 + 1] = P[av] * sv + ov; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Outline of a pointed (two-centred) arch opening: from bottom-left up, over, down to bottom-right. */
export function pointedArch(w, yBottom, ySpring, n = 24, sharp = 1.0) {
  const r = w * sharp, hw = w / 2, pts = [];
  // arc centres at (hw - r, ySpring) for the left half, (-(hw - r), ySpring) for the right
  const apexY = ySpring + Math.sqrt(Math.max(0, r * r - (r - hw) * (r - hw)));
  pts.push(new THREE.Vector2(-hw, yBottom));
  const aL = Math.atan2(apexY - ySpring, 0 - (hw - r) - (-0)) ; // unused guard
  const cxL = -hw + r, cxR = hw - r;
  const aEndL = Math.atan2(apexY - ySpring, 0 - cxL);
  for (let i = 0; i <= n; i++) { const a = Math.PI + (aEndL - Math.PI) * i / n; pts.push(new THREE.Vector2(cxL + Math.cos(a) * r, ySpring + Math.sin(a) * r)); }
  const aStartR = Math.atan2(apexY - ySpring, 0 - cxR);
  for (let i = 1; i <= n; i++) { const a = aStartR + (0 - aStartR) * i / n; pts.push(new THREE.Vector2(cxR + Math.cos(a) * r, ySpring + Math.sin(a) * r)); }
  pts.push(new THREE.Vector2(hw, yBottom));
  void aL;
  return pts;
}

/** Four-centred Tudor arch outline (bottom-left -> bottom-right). rise = height of arch above spring. */
export function tudorArch(w, yBottom, ySpring, rise, n = 16) {
  const hw = w / 2;
  let best = null;
  for (let r1f = 0.3; r1f <= 0.62 && !best; r1f += 0.02) {
    for (let a1 = 0.5; a1 <= 1.45; a1 += 0.025) {
      const r1 = hw * r1f;
      const c1 = new THREE.Vector2(-hw + r1, ySpring);
      const pA = new THREE.Vector2(c1.x - Math.cos(a1) * r1, ySpring + Math.sin(a1) * r1);
      const dir = new THREE.Vector2(Math.cos(a1), -Math.sin(a1));
      const ap = new THREE.Vector2(0, ySpring + rise), d0 = pA.clone().sub(ap);
      const den = 2 * d0.dot(dir); if (Math.abs(den) < 1e-6) continue;
      const R = -d0.lengthSq() / den;
      if (!(R > r1 * 1.4)) continue;
      const c2 = pA.clone().add(dir.clone().multiplyScalar(R));
      if (c2.x > hw * 0.08 && pA.y < ap.y) { best = { r1, c1, pA, a1, R, c2, ap }; break; }
    }
  }
  if (!best) return pointedArch(w, yBottom, ySpring, n);
  const { r1, c1, pA, a1, R, c2, ap } = best;
  const half = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI - a1 * i / n; half.push(new THREE.Vector2(c1.x + Math.cos(a) * r1, c1.y + Math.sin(a) * r1)); }
  const s0 = Math.atan2(pA.y - c2.y, pA.x - c2.x), s1 = Math.atan2(ap.y - c2.y, ap.x - c2.x);
  for (let i = 1; i <= n; i++) { const a = s0 + (s1 - s0) * i / n; half.push(new THREE.Vector2(c2.x + Math.cos(a) * R, c2.y + Math.sin(a) * R)); }
  const pts = [new THREE.Vector2(-hw, yBottom), ...half];
  for (let i = half.length - 2; i >= 0; i--) pts.push(new THREE.Vector2(-half[i].x, half[i].y));
  pts.push(new THREE.Vector2(hw, yBottom));
  return pts;
}

export function shapeFrom(pts, Cls = THREE.Shape) { const s = new Cls(); pts.forEach((p, i) => i ? s.lineTo(p.x, p.y) : s.moveTo(p.x, p.y)); s.closePath(); return s; }

/** Resample a polyline to n points evenly by arc length. */
export function resample(pts, n) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const out = [], tot = L[L.length - 1];
  for (let k = 0; k < n; k++) {
    const s = tot * k / (n - 1); let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const t = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); out.push(pts[i - 1].clone().lerp(pts[i], t));
  }
  return out;
}

/** Loft between two outlines (Vector2 lists of equal length) at z0 and z1 -> reveal surface. UV: u = arc length (m), v = depth (m). */
export function loft(a, b, z0, z1, flip = false) {
  const n = a.length, pos = [], uv = [], idx = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i) s += a[i].distanceTo(a[i - 1]);
    pos.push(a[i].x, a[i].y, z0, b[i].x, b[i].y, z1);
    uv.push(s, 0, s, Math.abs(z1 - z0));
  }
  for (let i = 0; i < n - 1; i++) { const p = i * 2; if (flip) idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3); else idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function lathe(pts, seg = 32) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); }

/** Straight sweep of a profile along local x from x0 to x1 (profile [outward z, y]). */
export function moulding(x0, x1, profile) {
  return sweep([{ p: new THREE.Vector3(x0, 0, 0), n: new THREE.Vector3(0, 0, 1) }, { p: new THREE.Vector3(x1, 0, 0), n: new THREE.Vector3(0, 0, 1) }], profile, false);
}

export function rep(t, x, y = x, rot = 0) { const c = t.clone(); c.repeat.set(x, y); c.rotation = rot; c.needsUpdate = true; return c; }

export function softSprite(size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,0.55)'); g.addColorStop(0.4, 'rgba(255,255,255,0.14)'); g.addColorStop(0.7, 'rgba(255,255,255,0.03)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
