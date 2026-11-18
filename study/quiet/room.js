import * as THREE from 'three';
import { ParametricGeometry } from 'three';
import { kleinFn } from './klein.js';
import { createGallery } from './gallery.js';

const HEIGHT = 3.45;
const BACK = -3.15;
const FRONT = -2.54;
const LEFT = -3.82;
const RIGHT = 3.32;
const RADIUS = 1.52;
const MOUTH = { left: -3.32, right: -0.86, bottom: 0.81, top: 1.75, radius: 0.25 };
const VIEW = { x: 1.08, y: 2.075, width: 3.72, height: 2.05 };

function stone(color, variation, { edges = 0, partition = 0, recess = 0 } = {}) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.variation = { value: variation };
    shader.uniforms.contactShadows = { value: new THREE.Vector3(edges, partition, recess) };
    shader.vertexShader = 'varying vec3 mineralPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      mineralPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    `);
    shader.fragmentShader = `
      varying vec3 mineralPosition;
      uniform float variation;
      uniform vec3 contactShadows;
      float mineralHash(vec3 p) {
        return fract(52.9829189 * fract(dot(p, vec3(.06711056, .00583715, .0421121))));
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float grain = mineralHash(floor(mineralPosition * 180.0)) - .5;
      float mottling = sin(mineralPosition.x * 5.4 + sin(mineralPosition.z * 3.1))
                     * sin(mineralPosition.y * 4.1 + mineralPosition.z * 3.9);
      float floorContact = exp(-max(0.0, mineralPosition.y) * 9.0);
      float ceilingContact = exp(-max(0.0, ${HEIGHT} - mineralPosition.y) * 6.0);

      // Shade the floor and ceiling where they meet the built-in curved partition.
      float curve = clamp((${LEFT + RADIUS} - mineralPosition.x) / ${RADIUS}, 0.0, 1.0);
      float front = ${FRONT} + ${RADIUS} * (1.0 - sqrt(1.0 - curve * curve));
      float sideDistance = max(max(${LEFT} - mineralPosition.x, mineralPosition.x - ${RIGHT}), 0.0);
      float wallDistance = length(vec2(sideDistance, abs(mineralPosition.z - front)));
      float partitionContact = exp(-wallDistance * 7.0);

      // The rear of the alcove receives less of the room's reflected light.
      float recessDepth = 1.0 - smoothstep(-2.91, -2.46, mineralPosition.z);
      float recessEdge = min(abs(mineralPosition.y - ${MOUTH.bottom}), abs(mineralPosition.y - ${MOUTH.top}));
      float recessContact = recessDepth * (.7 + .3 * exp(-recessEdge * 11.0));
      float contact = contactShadows.x * (floorContact + ceilingContact * .65)
                    + contactShadows.y * partitionContact
                    + contactShadows.z * recessContact;
      diffuseColor.rgb *= 1.0 + (grain * .38 + mottling * .48) * variation - contact;
    `);
  };
  return material;
}

function frontAt(x) {
  const ratio = Math.min(1, Math.max(0, (LEFT + RADIUS - x) / RADIUS));
  return FRONT + RADIUS * (1 - Math.sqrt(1 - ratio * ratio));
}

function reveal(x) {
  const corner = MOUTH.radius;
  const ratio = Math.max(0, (MOUTH.left + corner - x) / corner);
  const inset = corner * (1 - Math.sqrt(Math.max(0, 1 - ratio * ratio)));
  return [MOUTH.bottom + inset, MOUTH.top - inset];
}

function sample(from, to, steps) {
  return Array.from({ length: steps + 1 }, (_, i) => THREE.MathUtils.lerp(from, to, i / steps));
}

// A ruled surface uses corresponding points along two edges. Welded vertices keep the curve smooth.
function strip(a, b) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a.flat(), ...b.flat()], 3));
  const count = a.length;
  const indices = [];
  for (let i = 0; i < count - 1; i++) indices.push(i, i + 1, count + i, i + 1, count + i + 1, count + i);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addMesh(scene, geometry, material, { cast = true } = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function slab(scene, material, w, h, d, x, y, z, cast = true) {
  const mesh = addMesh(scene, new THREE.BoxGeometry(w, h, d), material, { cast });
  mesh.position.set(x, y, z);
  return mesh;
}

function wallSection(scene, material, points, lower, upper) {
  addMesh(scene, strip(
    points.map((x) => [x, lower(x), frontAt(x)]),
    points.map((x) => [x, upper(x), frontAt(x)])
  ), material);
}

function makePartition(scene, plaster, recess, wood) {
  const zero = () => 0;
  const ceiling = () => HEIGHT;
  const shadowLine = () => MOUTH.bottom;
  const leftSide = sample(LEFT, MOUTH.left, 40);
  const opening = [...sample(MOUTH.left, LEFT + RADIUS, 60), ...sample(LEFT + RADIUS, MOUTH.right, 24).slice(1)];
  wallSection(scene, plaster, leftSide, zero, ceiling);
  wallSection(scene, plaster, opening, zero, (x) => reveal(x)[0]);
  wallSection(scene, plaster, opening, (x) => reveal(x)[1], ceiling);

  const longWall = [MOUTH.right, RIGHT];
  wallSection(scene, plaster, longWall, zero, shadowLine);
  wallSection(scene, plaster, longWall, () => MOUTH.bottom + 0.019, ceiling);
  slab(scene, recess, RIGHT - MOUTH.right, 0.023, 0.065,
    (RIGHT + MOUTH.right) / 2, MOUTH.bottom + 0.010, FRONT - 0.038);
  slab(scene, plaster, 0.09, HEIGHT, 0.62, RIGHT + 0.04, HEIGHT / 2, FRONT - 0.31);
  slab(scene, plaster, 0.08, HEIGHT, frontAt(LEFT) - BACK, LEFT, HEIGHT / 2, (frontAt(LEFT) + BACK) / 2);

  const nicheZ = -2.92;
  const edge = (x, i, z) => [x, reveal(x)[i], z];
  addMesh(scene, strip(opening.map((x) => edge(x, 0, nicheZ)), opening.map((x) => edge(x, 1, nicheZ))), recess);
  for (const side of [0, 1]) {
    addMesh(scene, strip(opening.map((x) => edge(x, side, frontAt(x))), opening.map((x) => edge(x, side, nicheZ))), recess);
  }
  for (const x of [MOUTH.left, MOUTH.right]) {
    addMesh(scene, strip([edge(x, 0, nicheZ), edge(x, 1, nicheZ)], [edge(x, 0, frontAt(x)), edge(x, 1, frontAt(x))]), recess);
  }

  const lip = (x) => frontAt(x) + 0.63 * Math.sin(Math.PI * (x - MOUTH.left) / (MOUTH.right - MOUTH.left)) ** 0.65;
  for (const thickness of [0, 0.087]) {
    addMesh(scene, strip(opening.map((x) => [x, reveal(x)[0] - thickness, frontAt(x) - 0.012]),
      opening.map((x) => [x, reveal(x)[0] - thickness, lip(x)])), plaster);
  }
  addMesh(scene, strip(opening.map((x) => [x, reveal(x)[0] - 0.087, lip(x)]),
    opening.map((x) => [x, reveal(x)[0], lip(x)])), plaster);

  // The bench projects from the curved return and leaves clearance in front of the ledge.
  slab(scene, plaster, 1.34, 0.12, 0.56, -3.18, 0.417, -1.21);
  const padShape = new THREE.Shape();
  const w = 0.64, d = 0.43, r = 0.035;
  padShape.moveTo(r, 0);
  padShape.lineTo(w - r, 0);
  padShape.quadraticCurveTo(w, 0, w, r);
  padShape.lineTo(w, d - r);
  padShape.quadraticCurveTo(w, d, w - r, d);
  padShape.lineTo(r, d);
  padShape.quadraticCurveTo(0, d, 0, d - r);
  padShape.lineTo(0, r);
  padShape.quadraticCurveTo(0, 0, r, 0);
  const cushion = addMesh(scene, new THREE.ExtrudeGeometry(padShape, {
    depth: 0.03, bevelEnabled: true, bevelSize: 0.013, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 6
  }), wood);
  cushion.rotation.x = -Math.PI / 2;
  cushion.position.set(-3.21, 0.489, -0.98);
}

function makeBottle(scene) {
  const geometry = new ParametricGeometry(kleinFn, 110, 40);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  geometry.translate(-center.x, -bounds.min.y, -center.z);
  geometry.scale(0.33 / size.y, 0.33 / size.y, 0.33 / size.y);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb9a28b, roughness: 0.14, transparent: true, opacity: 0.77, metalness: 0.18,
    clearcoat: 0.88, clearcoatRoughness: 0.11, side: THREE.DoubleSide, depthWrite: false,
  });
  const bottle = addMesh(scene, geometry, glass);
  bottle.position.set(-1.26, MOUTH.bottom + 0.006, -2.15);
  bottle.rotation.y = 0.32;
  return bottle;
}

function makeProjection(scene) {
  const gallery = createGallery();
  const texture = new THREE.CanvasTexture(gallery.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false,
  });
  const projection = new THREE.Mesh(new THREE.PlaneGeometry(VIEW.width, VIEW.height), material);
  projection.position.set(VIEW.x, VIEW.y, FRONT + 0.013);
  scene.add(projection);
  return {
    projection,
    ...gallery,
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
  scene.background = new THREE.Color(0xe7ded1);
  const plaster = stone(0xd9cabb, 0.17, { edges: 0.26 });
  const envelope = stone(0xd5c7b9, 0.12, { edges: 0.12 });
  const ceiling = stone(0xd5c7b9, 0.12, { partition: 0.23 });
  const limestone = stone(0xc5b3a0, 0.18, { partition: 0.31 });
  const reveal = stone(0xc5af98, 0.13, { recess: 0.26 });
  const felt = stone(0x534b41, 0.2);
  const black = new THREE.MeshStandardMaterial({ color: 0x4d443a, roughness: 0.8 });

  slab(scene, limestone, 9.1, 0.22, 10.3, 0.22, -0.11, 0.65);
  slab(scene, ceiling, 9.1, 0.18, 10.3, 0.22, HEIGHT + 0.09, 0.65);
  slab(scene, envelope, 0.19, HEIGHT, 10.3, -4.23, HEIGHT / 2, 0.65);
  slab(scene, envelope, 9.1, HEIGHT, 0.18, 0.22, HEIGHT / 2, -4.46);
  slab(scene, envelope, 9.1, HEIGHT, 0.18, 0.22, HEIGHT / 2, 5.74);
  const windowX = 4.44;
  const windowFrom = -2.94, windowTo = -2.43;
  for (const [start, end] of [[-4.5, windowFrom], [windowTo, 5.8]]) {
    slab(scene, envelope, 0.19, HEIGHT, end - start, windowX, HEIGHT / 2, (start + end) / 2);
  }
  for (const z of [windowFrom, windowTo]) slab(scene, black, 0.12, HEIGHT, 0.021, windowX, HEIGHT / 2, z);
  slab(scene, black, 0.13, 0.027, windowTo - windowFrom, windowX, 0.014, (windowFrom + windowTo) / 2);
  const sky = new THREE.MeshBasicMaterial({ color: 0xfff5dd, toneMapped: false });
  slab(scene, sky, 0.03, 6, 5, 6.8, 2.6, -4.4, false);
  slab(scene, limestone, 3.2, 0.18, 6, 5.93, -0.1, -2.4, false);

  makePartition(scene, plaster, reveal, felt);
  const bottle = makeBottle(scene);
  const display = makeProjection(scene);

  // Full height skirting-free rear door, with just a narrow perimeter joint and a pull.
  slab(scene, black, 1.28, 2.6, 0.05, -1.03, 1.3, 5.623);
  slab(scene, envelope, 1.244, 2.568, 0.044, -1.03, 1.294, 5.6);
  slab(scene, black, 0.015, 0.2, 0.039, -0.54, 1.12, 5.563);

  scene.add(new THREE.HemisphereLight(0xfff4e9, 0xb59c89, 1.2));
  scene.add(new THREE.AmbientLight(0xe4e1df, 0.15));
  const sun = new THREE.DirectionalLight(0xffe5c7, 2.65);
  sun.position.set(10.6, 4.9, -4.25);
  sun.target.position.set(0, 0, -0.36);
  sun.castShadow = true;
  sun.shadow.camera.left = -6.5;
  sun.shadow.camera.right = 6.5;
  sun.shadow.camera.top = 6.5;
  sun.shadow.camera.bottom = -6.5;
  sun.shadow.camera.near = 0.2;
  sun.shadow.camera.far = 23;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 2.6;
  sun.shadow.normalBias = 0.03;
  sun.shadow.bias = -0.0002;
  scene.add(sun, sun.target);
  const bounce = new THREE.PointLight(0xffe9d5, 22, 13, 2);
  bounce.position.set(-1.15, 2.43, 0.18);
  scene.add(bounce);
  const doorLight = new THREE.PointLight(0xf1e5d6, 12, 9, 2);
  doorLight.position.set(-1.2, 2.65, 4.4);
  scene.add(doorLight);

  const targets = {
    about: { object: bottle, position: bottle.position.clone().add(new THREE.Vector3(0.12, 0.11, 0.05)) },
  };
  return { scene, sun, targets, gallery: display };
}
