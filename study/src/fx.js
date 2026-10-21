import * as THREE from 'three';
import { U, GLSL_UTIL, patchMaterial, softSprite, rng } from './common.js';
import { WIN } from './room.js';

// ---------------------------------------------------------------- night sky seen through the leaded glass
export const SKY_GLSL = /* glsl */`
uniform vec3 uMoonDir; uniform vec3 uWinN; uniform vec3 uWinT;
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f); return mix(mix(hs(i),hs(i+vec2(1,0)),u.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),u.x), u.y); }
float fb2(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn2(p); p=p*2.03+1.7; a*=.5; } return s; }
float towerMask(float az, float el, float cx, float w, float h, float roof, out float win){
  float dx = abs(az - cx);
  float body = step(dx, w) * step(el, h);
  float r = step(dx, w * 1.25 * (1.0 - clamp((el - h) / roof, 0.0, 1.0))) * step(h, el) * step(el, h + roof);
  vec2 g = vec2((az - cx) / (w * 0.5), el / 0.012);
  float lit = step(0.72, hs(floor(g) + cx * 13.0)) * step(abs(fract(g.x) - 0.5), 0.22) * step(abs(fract(g.y) - 0.5), 0.2) * step(el, h - 0.01) * step(0.02, el);
  win = lit * body;
  return max(body, r);
}
vec3 skyCol(vec3 V, float t){
  vec3 up = vec3(0., 1., 0.);
  float el = asin(clamp(V.y, -1., 1.));
  float az = atan(dot(V, uWinT), dot(V, uWinN));
  vec3 zen = vec3(0.006, 0.010, 0.032), hor = vec3(0.05, 0.07, 0.14);
  vec3 col = mix(hor, zen, smoothstep(-0.02, 0.75, el));
  // moon glow + disc
  float md = acos(clamp(dot(V, uMoonDir), -1., 1.));
  col += vec3(0.55, 0.62, 0.8) * (exp(-md * 7.0) * 0.32 + exp(-md * 26.0) * 0.6);
  float disc = 1.0 - smoothstep(0.034, 0.038, md);
  col = mix(col, vec3(3.4, 3.4, 3.2) * (0.85 + 0.15 * vn2(V.xy * 300.0)), disc);
  // clouds lit from the moon
  float cl = fb2(vec2(az * 3.0 + t * 0.006, el * 9.0));
  float cm = smoothstep(0.52, 0.78, cl) * smoothstep(0.02, 0.15, el);
  col = mix(col, vec3(0.07, 0.08, 0.12) + vec3(0.5, 0.55, 0.7) * exp(-md * 3.0) * 0.6, cm * 0.85);
  // stars
  vec2 sg = vec2(az, el) * 220.0; vec2 si = floor(sg);
  float st = step(0.985, hs(si)) * smoothstep(0.25, 0.0, length(fract(sg) - 0.5)) * (0.6 + 0.4 * sin(t * 3.0 + hs(si + 7.0) * 40.0));
  col += vec3(1.4, 1.45, 1.6) * st * smoothstep(0.06, 0.2, el) * (1.0 - cm);
  // far hills + castle towers across the courtyard
  float hill = 0.035 + 0.045 * fb2(vec2(az * 3.5, 1.3)) - 0.02;
  vec3 sil = vec3(0.010, 0.012, 0.022);
  float w1, w2, w3, w4, w5;
  float tw = towerMask(az, el, -0.30, 0.040, 0.20, 0.10, w1) + towerMask(az, el, -0.18, 0.028, 0.15, 0.08, w2) + towerMask(az, el, 0.08, 0.05, 0.11, 0.06, w3) + towerMask(az, el, 0.24, 0.032, 0.24, 0.12, w4) + towerMask(az, el, 0.34, 0.022, 0.13, 0.07, w5);
  float wall = step(abs(az + 0.05), 0.42) * step(el, 0.075);
  float solid = clamp(tw + wall + step(el, hill), 0., 1.);
  col = mix(col, sil + vec3(0.02, 0.025, 0.045) * exp(-md * 2.0), solid);
  col += vec3(1.6, 0.9, 0.35) * (w1 + w2 + w3 + w4 + w5) * 0.55;
  // lake below the horizon with a moon path
  if (el < -0.005) {
    vec3 R = reflect(V, up);
    float mdR = acos(clamp(dot(R, uMoonDir), -1., 1.));
    float ripple = vn2(vec2(az * 160.0, el * 900.0 / (0.02 - el * 3.0)) + t * 0.4);
    col = vec3(0.004, 0.007, 0.014) + vec3(0.9, 0.95, 1.1) * exp(-mdR * 9.0) * smoothstep(0.55, 0.9, ripple) * 0.5;
  }
  return col;
}`;

export function setupWindowGlass(mesh, tex, P) {
  const q = tex.quarry.clone(); q.wrapS = q.wrapT = THREE.RepeatWrapping; q.repeat.set(WIN.wOut / 0.28, 3.45 / 0.4); q.needsUpdate = true;
  const qn = tex.quarry_n.clone(); qn.wrapS = qn.wrapT = THREE.RepeatWrapping; qn.repeat.copy(q.repeat); qn.needsUpdate = true;
  const mat = new THREE.MeshPhysicalMaterial({ map: q, normalMap: qn, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.06, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.05 });
  patchMaterial(mat, 'winglass', (sh) => {
    sh.uniforms.uMoonDir = P.moonDir; sh.uniforms.uWinN = P.winN; sh.uniforms.uWinT = P.winT; sh.uniforms.uTime = U.time; sh.uniforms.uSkyI = P.skyI;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uTime; uniform float uSkyI;\n' + SKY_GLSL)
      .replace('#include <map_fragment>', `
        vec4 qtex = texture2D(map, vMapUv);
        float came = qtex.a;
        diffuseColor.rgb = mix(vec3(0.004), qtex.rgb * 0.6, came);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.04, 0.5, came);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 Vw = normalize(vWP - cameraPosition);
        vec3 nq = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
        Vw = normalize(Vw + (uWinT * nq.x + vec3(0., 1., 0.) * nq.y) * 0.045);
        totalEmissiveRadiance += skyCol(Vw, uTime) * qtex.rgb * 1.15 * (1.0 - came) * uSkyI;`);
  });
  mesh.material = mat;
  // only the lead cames cast the lattice shadow
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: q, alphaTest: 0.5 });
  mesh.castShadow = true;
  return mat;
}

// ---------------------------------------------------------------- fire: flames, ember bed, sparks
const FLAME_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FLAME_FS = /* glsl */`
uniform float uTime; uniform float uSeed; uniform float uI; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.1+1.3; a*=.5; } return s; }
void main(){
  vec2 uv = vUv; uv.x = (uv.x - 0.5) * 2.0;
  float n = fbm(vec2(uv.x * 2.2 + uSeed, uv.y * 2.6 - uTime * 2.4));
  float n2 = fbm(vec2(uv.x * 5.0 - uSeed, uv.y * 5.0 - uTime * 3.6));
  float wob = (n2 - 0.5) * 0.35 * uv.y;
  float shape = 1.0 - abs(uv.x + wob) / max(0.04, (1.0 - uv.y) * 0.85 + 0.04);
  float f = clamp(shape * 1.15 - uv.y * 1.05 + (n - 0.5) * 1.6, 0.0, 1.0);
  f *= smoothstep(0.0, 0.08, uv.y + 0.02);
  float core = smoothstep(0.55, 1.0, f) * (1.0 - smoothstep(0.0, 0.45, uv.y));
  vec3 c = mix(vec3(0.9, 0.12, 0.015), vec3(2.1, 0.75, 0.12), smoothstep(0.1, 0.7, f));
  c = mix(c, vec3(2.8, 1.8, 0.75), core);
  gl_FragColor = vec4(c * f * uI, f);
}`;

export function makeFire(wall, origin, logMat) {
  const g = new THREE.Group(); g.position.copy(origin); wall.add(g);
  const flames = [];
  const FL = [[-0.32, 0.12, 0.5, 0.3], [-0.12, 0.14, 0.66, 0.36], [0.08, 0.15, 0.72, 0.38], [0.27, 0.13, 0.56, 0.32], [-0.22, 0.2, 0.34, 0.2], [0.16, 0.22, 0.38, 0.22], [0.0, 0.24, 0.3, 0.18]];
  FL.forEach(([x, y, H, Wd], i) => {
    const fm = new THREE.ShaderMaterial({ uniforms: { uTime: U.time, uSeed: { value: i * 3.7 + 1 }, uI: { value: 0.55 } }, vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(Wd, H); geo.translate(0, H / 2, 0);
    [0, Math.PI / 2].forEach((r0, j) => { const f = new THREE.Mesh(geo, fm); f.position.set(x, y, 0.08 + (i % 3) * 0.04 - 0.04); f.rotation.y = r0 + 0.35 * i; f.renderOrder = 2; g.add(f); });
    flames.push(fm);
  });
  const emberMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uI: { value: 1 } }, vertexShader: FLAME_VS,
    fragmentShader: `uniform float uTime; uniform float uI; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); } float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      void main(){ vec2 c = vUv - 0.5; float edge = 1.0 - smoothstep(0.25, 0.5, length(c * vec2(1.0, 1.6)));
        float n = vn(vUv * vec2(26., 14.) + vec2(uTime * 0.3, 0.)) * vn(vUv * vec2(7., 5.) - uTime * 0.15);
        vec3 col = vec3(2.4, 0.5, 0.05) * pow(n, 1.3) * 2.0 * uI * edge + vec3(0.18, 0.03, 0.005) * edge;
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), emberMat); bed.rotation.x = -Math.PI / 2; bed.position.set(0, 0.06, 0.05); g.add(bed);
  // sparks rising: deterministic in time (renderable frame by frame)
  const N = 90, seeds = new Float32Array(N * 4); const R = rng(55);
  for (let i = 0; i < N; i++) seeds.set([R(), R(), R(), R()], i * 4);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const spark = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uScale: { value: 1400 }, tex: { value: softSprite(32) }, uI: { value: 1 } },
    vertexShader: `attribute vec4 seed; uniform float uTime; uniform float uScale; varying float vA;
      void main(){ float life = fract(uTime * (0.22 + seed.z * 0.25) + seed.w); vec3 p = vec3((seed.x - 0.5) * 0.7, 0.1 + life * (1.1 + seed.y * 0.9), (seed.y - 0.5) * 0.3);
        p.x += sin(uTime * 2.0 + seed.w * 30.0) * 0.08 * life; p.z += cos(uTime * 1.7 + seed.x * 20.0) * 0.06 * life;
        vA = (1.0 - life) * smoothstep(0.0, 0.08, life) * (0.5 + 0.5 * sin(uTime * 18.0 + seed.x * 50.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uScale * (0.006 + seed.y * 0.008) / -mv.z; }`,
    fragmentShader: `uniform sampler2D tex; uniform float uI; varying float vA; void main(){ float a = texture2D(tex, gl_PointCoord).a * vA; if(a < 0.01) discard; gl_FragColor = vec4(vec3(3.2, 1.3, 0.35) * a * uI, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, spark); pts.frustumCulled = false; g.add(pts);
  return { group: g, flames, emberMat, spark, logMat };
}

// ---------------------------------------------------------------- dust motes, lit only inside the moonbeam
export const WINDOW_MASK_GLSL = /* glsl */`
uniform vec3 uWinO; uniform vec3 uWinX; uniform vec3 uWinNrm; uniform vec3 uMoon;
float inArch(vec2 p, float cx){ vec2 q = vec2(p.x - cx, p.y); if (abs(q.x) > 0.3 || q.y < 1.05) return 0.0; if (q.y <= 3.08) return 1.0; return step(length(q - vec2(0.24, 3.08)), 0.54) * step(length(q - vec2(-0.24, 3.08)), 0.54); }
float windowMask(vec3 P){
  float den = dot(uMoon, uWinNrm); if (den < 0.05) return 0.0;
  float t = dot(uWinO - P, uWinNrm) / den; if (t < 0.0) return 0.0;
  vec3 Q = P + uMoon * t; float x = dot(Q - uWinO, uWinX); float y = Q.y;
  float open = max(max(inArch(vec2(x, y), -0.4), inArch(vec2(x, y), 0.4)), step(length(vec2(x, y - 4.02)), 0.25));
  vec2 tuv = vec2((x + 0.875) / 0.28, (y - 0.95) / 0.4);
  vec2 f = fract(tuv);
  float f1 = (f.x + f.y) * 2.0, f2 = (f.x - f.y) * 2.0;
  float dl = min(abs(f1 - floor(f1 + 0.5)), abs(f2 - floor(f2 + 0.5))) / 2.828;
  float came = 1.0 - smoothstep(0.009, 0.016, dl);
  float bar = 0.0; for (int k = 0; k < 6; k++) bar = max(bar, 1.0 - smoothstep(0.006, 0.01, abs(y - (1.4 + float(k) * 0.42))));
  return open * (1.0 - came) * (1.0 - bar);
}`;

export function makeDust(P, n = 900) {
  const R = rng(4242);
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos.set([(R() - 0.5) * 7.0, 0.2 + R() * 4.5, (R() - 0.5) * 7.0], i * 3); seed[i] = R(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, tex: { value: softSprite(32) }, uScale: { value: 2000 }, uWinO: P.winO, uWinX: P.winX, uWinNrm: P.winN, uMoon: P.moonDir, uI: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uScale; varying float vA; ${WINDOW_MASK_GLSL}
      void main(){ vec3 p = position + vec3(sin(uTime * 0.11 + seed * 40.0) * 0.25, sin(uTime * 0.07 + seed * 13.0) * 0.18 + fract(seed * 7.0 + uTime * 0.004) * 0.0, cos(uTime * 0.09 + seed * 25.0) * 0.25);
        vA = windowMask(p) * (0.35 + 0.65 * fract(seed * 91.0)) * (0.6 + 0.4 * sin(uTime * 1.3 + seed * 60.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uScale * (0.002 + fract(seed * 17.0) * 0.003) / -mv.z; }`,
    fragmentShader: `uniform sampler2D tex; uniform float uI; varying float vA; void main(){ float a = texture2D(tex, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * a * 1.6 * uI, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  return pts;
}
