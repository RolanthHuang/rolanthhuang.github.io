import * as THREE from 'three';
import { ParametricGeometry } from 'three';
import { kleinFn } from './klein.js';
import { createGallery } from './gallery.js';
import { mineral, exterior, thinGlass } from './finishes.js?v=glass-stability';

export const ROOM = {
  height: 3.54, front: -2.46, back: -4.25, left: -3.56, right: 4.28, radius: 1.43,
  window: { x: 4.34, from: -2.46, to: -2.12 },
  desk: { left: -3.12, right: -0.78, bottom: 0.94, top: 1.89, back: -3.47 },
  bench: { left: -1.84, right: -0.45, top: 0.88, back: -3.06 },
};
export const EYE = [-3.78, 1.60, 3.38];
export const TONE_EXPOSURE = 0.94;
export const HOME = { yaw: 0.481, pitch: 0.014, zoom: 1 };

const { height, front, back, left, right, radius, window: slit, desk, bench } = ROOM;
const QUARTER_TURN = Math.PI / 2;

function range(from, to, steps) {
  return Array.from({ length: steps + 1 }, (_, i) => THREE.MathUtils.lerp(from, to, i / steps));
}

function surface(x) {
  const curve = THREE.MathUtils.clamp((left + radius - x) / radius, 0, 1);
  return front - radius * (1 - Math.sqrt(1 - curve * curve));
}

function profile(from, to) {
  const curvedUntil = Math.min(to, left + radius);
  if (from >= curvedUntil) return [from, to];
  const angle = (x) => Math.asin(THREE.MathUtils.clamp((left + radius - x) / radius, 0, 1));
  const xs = range(angle(from), angle(curvedUntil), 36).map((a) => left + radius - radius * Math.sin(a));
  xs[0] = from;
  xs[xs.length - 1] = curvedUntil;
  if (to > curvedUntil) xs.push(to);
  return xs;
}

function mesh(scene, geometry, material) {
  const object = new THREE.Mesh(geometry, material);
  scene.add(object);
  return object;
}

function slab(scene, material, width, height, depth, x, y, z) {
  const object = mesh(scene, new THREE.BoxGeometry(width, height, depth), material);
  object.position.set(x, y, z);
  return object;
}

// A set of corresponding edges builds both the smooth wall and the radiused reveals.
function loft(scene, material, rings) {
  const size = rings[0].length;
  const indices = [];
  for (let row = 1; row < rings.length; row++) {
    for (let i = 1; i < size; i++) {
      const a = (row - 1) * size + i - 1;
      const b = row * size + i - 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(rings.flat(2), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return mesh(scene, geometry, material);
}

function roundedInset(x, start, radius) {
  const delta = THREE.MathUtils.clamp((start + radius - x) / radius, 0, 1);
  return radius * (1 - Math.sqrt(1 - delta * delta));
}

function partition(scene, plaster, inside, shadow, upholstery) {
  const cove = 0.27;
  const lip = 0.047;
  const edgeX = desk.left + cove;
  const coveXs = range(QUARTER_TURN, 0, 32).map((a) => edgeX - cove * Math.sin(a));
  coveXs[0] = desk.left;
  const deskXs = [...coveXs.slice(0, -1), ...profile(edgeX, desk.right)];
  const deskEdge = (x, upper) => (upper ? desk.top : desk.bottom) + (upper ? -1 : 1) * roundedInset(x, desk.left, cove);
  const y0 = () => 0;
  const y1 = () => height;
  const joint = desk.bottom - 0.02;

  const face = (xs, low, high) => loft(scene, plaster, [
    xs.map((x) => [x, low(x), surface(x)]), xs.map((x) => [x, high(x), surface(x)]),
  ]);
  const beforeBench = [...deskXs.filter((x) => x < bench.left), bench.left];
  const overBench = [bench.left, ...deskXs.filter((x) => x > bench.left), bench.right];
  face(profile(left, desk.left), y0, y1);
  face(beforeBench, y0, (x) => deskEdge(x, false));
  face(overBench.slice(0, -1), () => bench.top, (x) => deskEdge(x, false));
  face(deskXs, (x) => deskEdge(x, true), y1);
  face([desk.right, bench.right], () => bench.top, () => joint);
  face([desk.right, right], () => joint + 0.013, y1);
  face([bench.right, right], y0, () => joint);

  // Continue the outside curve into its return without a projecting vertical seam.
  loft(scene, plaster, [
    [[left, 0, back], [left, height, back]],
    [[left, 0, surface(left)], [left, height, surface(left)]],
  ]);
  slab(scene, plaster, right - left, height, 0.10, (left + right) / 2, height / 2, back);
  slab(scene, shadow, right - desk.right, 0.018, 0.04, (right + desk.right) / 2, joint + 0.006, front - 0.03);

  // Round the rim into the alcove in depth as well as in elevation.
  for (const upper of [false, true]) {
    const inset = upper ? -lip : lip;
    const rims = range(0, QUARTER_TURN, 7).map((a) => deskXs.map((x) => [x,
      deskEdge(x, upper) + inset * Math.sin(a),
      surface(x) - lip * (1 - Math.cos(a)),
    ]));
    loft(scene, inside, [...rims, deskXs.map((x) => [x, deskEdge(x, upper) + inset, desk.back])]);
  }
  loft(scene, inside, [
    deskXs.map((x) => [x, deskEdge(x, false) + lip, desk.back]),
    deskXs.map((x) => [x, deskEdge(x, true) - lip, desk.back]),
  ]);
  for (const x of [desk.left, desk.right]) {
    loft(scene, inside, [
      [[x, deskEdge(x, false), desk.back], [x, deskEdge(x, true), desk.back]],
      [[x, deskEdge(x, false), surface(x)], [x, deskEdge(x, true), surface(x)]],
    ]);
  }

  const sillXs = [...deskXs, bench.right];
  function sillFront(x) {
    if (x >= desk.right) return front + 0.18 * (bench.right - x) / (bench.right - desk.right);
    const t = (x - desk.left) / (desk.right - desk.left);
    return surface(x) + 0.22 * Math.sin(Math.PI * Math.max(0, t) / 2) ** 0.55;
  }
  const sillRim = range(0, Math.PI, 9).map((a) => sillXs.map((x) => [x,
    (x <= desk.right ? deskEdge(x, false) : desk.bottom) - 0.046 + 0.046 * Math.cos(a),
    sillFront(x) + 0.033 * Math.sin(a),
  ]));
  loft(scene, plaster, [sillXs.map((x) => [x, x <= desk.right ? deskEdge(x, false) : desk.bottom, surface(x) - 0.015]),
    ...sillRim, sillXs.map((x) => [x, (x <= desk.right ? deskEdge(x, false) : desk.bottom) - 0.092, surface(x) - 0.015])]);

  const bayWidth = bench.right - bench.left;
  const bayCenter = (bench.left + bench.right) / 2;
  slab(scene, inside, bayWidth, bench.top, 0.05, bayCenter, bench.top / 2, bench.back - 0.025);
  for (const x of [bench.left, bench.right]) {
    slab(scene, inside, 0.011, bench.top, front - bench.back, x, bench.top / 2, (front + bench.back) / 2);
  }
  slab(scene, inside, bayWidth, 0.023, front - bench.back, bayCenter, bench.top, (front + bench.back) / 2);
  slab(scene, plaster, bayWidth - 0.13, 0.104, 0.78, bayCenter + 0.058, 0.307, -2.75);
  const pad = new THREE.Shape();
  const w = bayWidth - 0.17, d = 0.68, r = 0.047;
  pad.moveTo(r, 0);
  pad.lineTo(w - r, 0);
  pad.quadraticCurveTo(w, 0, w, r);
  pad.lineTo(w, d - r);
  pad.quadraticCurveTo(w, d, w - r, d);
  pad.lineTo(r, d);
  pad.quadraticCurveTo(0, d, 0, d - r);
  pad.lineTo(0, r);
  pad.quadraticCurveTo(0, 0, r, 0);
  const cushion = mesh(scene, new THREE.ExtrudeGeometry(pad, {
    depth: 0.048, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.014, bevelSegments: 4, curveSegments: 10,
  }), upholstery);
  cushion.rotation.x = -QUARTER_TURN;
  cushion.position.set(bench.left + 0.155, 0.364, -2.39);
}

function bottleOnSill(scene) {
  const geometry = new ParametricGeometry(kleinFn, 124, 56);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const center = bounds.getCenter(new THREE.Vector3());
  const bottleHeight = 0.39 * 1.3;
  const scale = bottleHeight / (bounds.max.y - bounds.min.y);
  geometry.translate(-center.x, -bounds.min.y, -center.z);
  geometry.scale(scale, scale, scale);

  const object = mesh(scene, geometry, thinGlass());
  object.position.set(-1.36, desk.bottom + 0.003, -2.47);
  object.rotation.y = 0.24;
  return object;
}

function projectionOnWall(scene) {
  const gallery = createGallery();
  const texture = new THREE.CanvasTexture(gallery.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const projection = mesh(scene, new THREE.PlaneGeometry(4.21, 1.89), material);
  projection.position.set(1.69, 2.095, front + 0.006);
  return {
    projection, ...gallery,
    show(projects, redraw) {
      return gallery.show(projects, () => {
        texture.needsUpdate = true;
        redraw();
      });
    },
  };
}

export function buildRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbbab96);
  const plaster = mineral(ROOM, 0xe1cdb1, 'wall');
  const envelope = mineral(ROOM, 0xe2d2bd, 'shell');
  const stone = mineral(ROOM, 0xc5aa8a, 'floor');
  const reveal = mineral(ROOM, 0xd0b596, 'reveal');
  const shadow = mineral(ROOM, 0x706152, 'trim');
  const felt = mineral(ROOM, 0x4f473e, 'felt');

  slab(scene, stone, 9.2, 0.22, 10.55, -0.13, -0.11, 0.55);
  slab(scene, envelope, 9.2, 0.18, 10.55, -0.13, height + 0.09, 0.55);
  slab(scene, envelope, 0.19, height, 10.55, -4.66, height / 2, 0.55);
  slab(scene, envelope, 9.2, height, 0.18, -0.13, height / 2, -4.64);
  slab(scene, envelope, 9.2, height, 0.18, -0.13, height / 2, 5.76);
  for (const [start, end] of [[-4.73, slit.from], [slit.to, 5.84]]) {
    slab(scene, envelope, 0.22, height, end - start, slit.x + 0.11, height / 2, (start + end) / 2);
  }
  for (const z of [slit.from + 0.009, slit.to - 0.009]) {
    slab(scene, shadow, 0.10, height, 0.015, slit.x + 0.145, height / 2, z);
  }
  slab(scene, shadow, 0.105, 0.023, slit.to - slit.from, slit.x + 0.145, 0.01, (slit.from + slit.to) / 2);
  const garden = mesh(scene, new THREE.PlaneGeometry(12, 8), exterior());
  garden.rotation.y = -QUARTER_TURN;
  garden.position.set(6.75, 2.5, -2.4);
  const terrace = new THREE.MeshBasicMaterial({ color: 0xd6c79e });
  slab(scene, terrace, 2.75, 0.18, 6, 5.8, -0.1, -2.4);

  partition(scene, plaster, reveal, shadow, felt);
  const bottle = bottleOnSill(scene);
  const gallery = projectionOnWall(scene);

  // A narrow flush door joint and a recessed pull are the only rear-wall details.
  slab(scene, shadow, 1.27, 2.76, 0.022, -0.98, 1.38, 5.661);
  slab(scene, envelope, 1.246, 2.743, 0.037, -0.98, 1.372, 5.647);
  slab(scene, shadow, 0.018, 0.195, 0.036, -0.49, 1.14, 5.62);
  return { scene, gallery, targets: {
    about: { object: bottle, position: bottle.position.clone().add(new THREE.Vector3(0.31, 0.15, 0.13)) },
  } };
}
