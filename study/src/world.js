import * as THREE from 'three';
import { U, makeNoise, mergeStatic } from './common.js';
import { makeMaterials, makeRoom, K, WIN } from './room.js';
import { makeDesk, dressDesk, makeChair, chandelier, floatingCandles, telescope, globe, sconce, brassCandlestick, crystalBall, hourglass, bookClosed, FLAMES } from './props.js';
import { setupWindowGlass, makeFire, makeDust } from './fx.js';

/* Builds the hexagonal study once. Q carries the quality tier:
   { shadow: { moon, lamp, fire }, transmission, minorLights, clearcoat } */
export function buildWorld(renderer, tex, Q) {
  const scene = new THREE.Scene();
  const M = makeMaterials(tex);
  const room = makeRoom(tex, M); scene.add(room);
  const RU = room.userData;
  const walls = RU.walls;

  // ---------------- furniture
  const desk = makeDesk(M, tex); desk.position.set(-0.12, 0, 0.5); desk.rotation.y = -0.2; scene.add(desk);
  const dress = dressDesk(desk, M, tex, { transmission: Q.transmission });
  const chair = makeChair(M, tex); chair.position.set(1.42, 0, -0.18); chair.rotation.y = -1.0; scene.add(chair);
  const rugGeo = new THREE.PlaneGeometry(3.74, 2.5); rugGeo.rotateX(-Math.PI / 2);
  const rug = new THREE.Mesh(rugGeo, new THREE.MeshStandardMaterial({ map: tex.rug, normalMap: tex.rug_n, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.96, alphaTest: 0.5, side: THREE.DoubleSide }));
  rug.position.set(0.0, 0.011, 0.7); rug.rotation.y = -0.2; rug.receiveShadow = true; scene.add(rug);
  const rugEdge = new THREE.MeshStandardMaterial({ color: 0x3a1410, roughness: 1 });
  [[3.6, 0, 1.25], [3.6, 0, -1.25], [0, 1.8, 0], [0, -1.8, 0]].forEach(([l, x, z]) => { const s = new THREE.Mesh(new THREE.BoxGeometry(l || 0.004, 0.011, l ? 0.004 : 2.5), rugEdge); s.position.set(x, -0.0055, z); rug.add(s); });
  const chand = chandelier(M); scene.add(chand);
  const floaters = floatingCandles(M, 14); scene.add(floaters);
  const tele = telescope(M); { const w = walls[K.BR]; const p = w.localToWorld(new THREE.Vector3(-1.55, 0, 1.0)); tele.position.copy(p); tele.rotation.y = w.rotation.y + Math.PI / 2 + 0.35; } scene.add(tele);
  const fglobe = globe(M, 0.28, 0.62, true); { const w = walls[K.BL]; const p = w.localToWorld(new THREE.Vector3(-1.85, 0, 1.25)); fglobe.position.copy(p); } scene.add(fglobe);
  { const w = RU.mantel.wall, y = RU.mantel.y, z = RU.mantel.z;
    [-1.3, 1.3].forEach((x, i) => { const cs = brassCandlestick(M, 0.3, 50 + i); cs.position.set(x, y, z); w.add(cs); });
    const hg = hourglass(M); hg.position.set(-0.85, y, z); w.add(hg);
    const cb = crystalBall(M); cb.position.set(0.9, y, z); w.add(cb);
    const st = new THREE.Group(); st.position.set(-0.5, y, z - 0.02); w.add(st);
    let yy = 0; [[0.22, 0.045, 0.16, 0x1b3a2a], [0.2, 0.04, 0.15, 0x5a1712]].forEach(([bw, bh, bd, c], i) => { const b = bookClosed(M, tex, { w: bw, h: bh, d: bd, color: c }); b.position.y = yy; b.rotation.y = i * 0.2 - 0.1; st.add(b); yy += bh; });
    RU.mantelLight = w.localToWorld(new THREE.Vector3(0, y + 0.45, z + 0.1));
  }
  const sconceLights = [];
  [K.LEFT, K.RIGHT].forEach((k, j) => { const w = walls[k]; [-1, 1].forEach(s => { const sc = sconce(M, 60 + j * 2 + (s > 0 ? 1 : 0)); sc.position.set(s * 1.32, 2.55, 0.0); w.add(sc); }); sconceLights.push(w.localToWorld(new THREE.Vector3(0, 2.85, 0.45))); });

  // ---------------- window, moon, fire
  const bw = walls[K.BR]; bw.updateMatrixWorld(true);
  const q = new THREE.Quaternion(); bw.getWorldQuaternion(q);
  const winN = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();
  const winX = new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize();
  const winO = bw.localToWorld(new THREE.Vector3(0, 0, -WIN.depth - 0.06));
  const winC = bw.localToWorld(new THREE.Vector3(0, 2.6, -WIN.depth - 0.06));
  const moonEl = THREE.MathUtils.degToRad(28), moonAz = THREE.MathUtils.degToRad(19);
  const flat = winN.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), moonAz);
  const moonDir = flat.multiplyScalar(Math.cos(moonEl)).add(new THREE.Vector3(0, Math.sin(moonEl), 0)).normalize();
  const GP = { moonDir: { value: moonDir }, winN: { value: winN }, winT: { value: winX }, winO: { value: winO }, winX: { value: winX }, skyI: { value: 1 } };
  setupWindowGlass(RU.glass, tex, GP);
  RU.glass.userData.dynamic = true;
  const moon = new THREE.SpotLight(0x9fb4ff, 5.0, 0, 0.27, 0.25, 0);
  moon.position.copy(winC).addScaledVector(moonDir, 9); moon.target.position.copy(winC).addScaledVector(moonDir, -4);
  moon.castShadow = Q.shadow.moon > 0; moon.shadow.mapSize.set(Q.shadow.moon || 512, Q.shadow.moon || 512); moon.shadow.camera.near = 4; moon.shadow.camera.far = 24; moon.shadow.bias = -0.0003; moon.shadow.normalBias = 0.015; moon.shadow.radius = 2;
  scene.add(moon, moon.target);
  const dust = makeDust(GP, Q.dust ?? 900); scene.add(dust);

  const fire = makeFire(RU.fireWall, RU.fireLocal, RU.logMat);
  const fireW = RU.fireWall.localToWorld(new THREE.Vector3(0, 0.55, 0.85));
  const fireL = new THREE.PointLight(0xff8a3a, 22, 0, 2); fireL.position.copy(fireW);
  fireL.castShadow = Q.shadow.fire > 0; fireL.shadow.mapSize.set(Q.shadow.fire || 512, Q.shadow.fire || 512); fireL.shadow.camera.near = 0.15; fireL.shadow.bias = -0.002; fireL.shadow.radius = 3; scene.add(fireL);

  // ---------------- other lights (the minor ones are dropped on the lightest tier and the hemisphere lifted instead)
  desk.updateMatrixWorld(true);
  const lampPos = dress.lamp.localToWorld(dress.lamp.userData.lightPos.clone());
  const lampL = new THREE.SpotLight(0xffd9a0, 3.4, 0, 1.05, 0.75, 2); lampL.position.copy(lampPos); lampL.target.position.copy(lampPos).add(new THREE.Vector3(0.18, -1, 0.25));
  lampL.castShadow = Q.shadow.lamp > 0; lampL.shadow.mapSize.set(Q.shadow.lamp || 512, Q.shadow.lamp || 512); lampL.shadow.camera.near = 0.05; lampL.shadow.bias = -0.0005; lampL.shadow.radius = 3; scene.add(lampL, lampL.target);
  const chandL = new THREE.PointLight(0xffb070, 7, 0, 2); chandL.position.copy(chand.userData.lightPos); scene.add(chandL);
  const floatPos = [new THREE.Vector3(-1.6, 4.1, -1.2), new THREE.Vector3(1.8, 4.2, 0.6), new THREE.Vector3(-2.3, 2.7, 0.1)];
  const floatL = floatPos.slice(0, Q.minorLights ? 3 : 2).map(p => { const l = new THREE.PointLight(0xffb070, 3.0, 0, 2); l.position.copy(p); scene.add(l); return l; });
  const hemi = new THREE.HemisphereLight(0x2a2c3a, 0x1c1008, Q.minorLights ? 0.5 : 0.85); scene.add(hemi);
  let fireIn = null; const minor = [];
  if (Q.minorLights) {
    fireIn = new THREE.PointLight(0xff7020, 1.1, 0, 2); fireIn.position.copy(RU.fireWall.localToWorld(new THREE.Vector3(0, 0.45, 0.1))); scene.add(fireIn);
    const candleL = new THREE.PointLight(0xffa050, 0.35, 0, 2); candleL.position.copy(desk.localToWorld(dress.candleLocal.clone())); scene.add(candleL);
    const mantelL = new THREE.PointLight(0xffa050, 1.8, 0, 2); mantelL.position.copy(RU.mantelLight); scene.add(mantelL);
    sconceLights.forEach(p => { const l = new THREE.PointLight(0xffa860, 2.2, 0, 2); l.position.copy(p); scene.add(l); minor.push(l); });
    const vaultL = new THREE.PointLight(0xffb070, 2.6, 0, 2); vaultL.position.set(0.3, 5.9, 0.4); scene.add(vaultL);
    minor.push(candleL, mantelL, vaultL);
  } else {
    const fill = new THREE.PointLight(0xffb070, 4.2, 0, 2); fill.position.set(0.3, 5.2, 0.6); scene.add(fill); minor.push(fill);
  }

  // ---------------- what moves stays apart; everything else is merged by material
  const keep = [RU.anim.portrait, RU.anim.plaque, RU.books.pivot, RU.books.ladder, RU.glass, dress.kleinGroup, floaters, ...RU.doors.map(d => d.hinge)];
  scene.traverse(o => { if (o.isMesh && o.material && !o.material.transparent && o.material.blending === THREE.NormalBlending) o.receiveShadow = true; });
  walls[K.BR].traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'ShapeGeometry') o.castShadow = true; });
  const merged = mergeStatic(scene, keep);

  if (!Q.clearcoat) {
    const seen = new Set();
    scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(m => { if (seen.has(m)) return; seen.add(m); if (m.isMeshPhysicalMaterial && m.transmission === 0) { m.clearcoat = 0; m.sheen = 0; } }); });
  }

  // ---------------- environment probe (reflections), rendered once
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cubeRT = new THREE.WebGLCubeRenderTarget(Q.envSize || 256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(0.1, 30, cubeRT); cubeCam.position.set(0.2, 1.4, 0.8); scene.add(cubeCam);
  function refreshEnv() {
    dust.visible = false; dress.kleinGroup.visible = false;
    const ac = renderer.autoClear; renderer.autoClear = true; renderer.shadowMap.needsUpdate = true;
    cubeCam.update(renderer, scene); renderer.autoClear = ac;
    if (scene.environment) scene.environment.dispose();
    scene.environment = pmrem.fromCubemap(cubeRT.texture).texture; scene.environmentIntensity = 0.55;
    dust.visible = true; dress.kleinGroup.visible = true;
  }

  // ---------------- life: fire, candles, the bottle
  const N1 = makeNoise(3), N2 = makeNoise(9);
  const flick = [chandL, ...floatL];
  const flickBase = flick.map(l => l.intensity);
  function tick(time) {
    U.time.value = time;
    const fk = 0.8 + 0.35 * N1.fbm(time * 2.2, 0.5, 3) + 0.12 * Math.sin(time * 17.0) * N2.noise(time * 5, 1.0);
    fireL.intensity = 22 * fk; if (fireIn) fireIn.intensity = 1.1 * fk;
    RU.logMat.emissiveIntensity = 1.6 + 1.2 * fk;
    fire.emberMat.uniforms.uI.value = 0.8 + 0.4 * fk;
    for (let i = 0; i < FLAMES.length; i++) { const f = FLAMES[i]; const k = 0.92 + 0.12 * N2.fbm(time * 4 + i * 1.7, i, 2); f.flame.scale.set(1, k, 1); f.core.scale.set(1, k, 1); f.glow.material.opacity = 0.8 + 0.2 * k; }
    for (let i = 0; i < flick.length; i++) flick[i].intensity = flickBase[i] * (0.94 + 0.08 * N2.noise(time * 3 + i * 7, 2.5));
    const fl = floaters.userData.list; for (let i = 0; i < fl.length; i++) { const o = fl[i]; o.c.position.y = o.y + Math.sin(time * o.sp + o.ph) * 0.035; }
  }

  return {
    scene, M, RU, walls, desk, dress, chair, fire, dust, floaters, chand,
    lights: { moon, fireL, lampL, chandL, floatL, hemi, minor, passage: RU.lights.passage },
    vol: { winO, winX, winN, moon: moonDir },
    merged, refreshEnv, tick,
  };
}
