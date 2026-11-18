import * as THREE from 'three';
import { buildRoom } from './room.js';
import { createPanorama } from './panorama.js';

const clamp = THREE.MathUtils.clamp;
const TAU = 2 * Math.PI;
const HOME = { yaw: 0.045, pitch: 0.024, zoom: 1 };

export function startViewer({ canvas, markers, wallLinks, quality, onSelect, onLost }) {
  const { scene, sun, targets, gallery } = buildRoom();
  const plane = gallery.projection;
  const artwork = gallery.canvas;
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  let renderer = null;
  if (gl) {
    try { renderer = new THREE.WebGLRenderer({ canvas, context: gl }); }
    catch (error) { console.warn('Switching to the panoramic study.', error); }
  }
  let panorama;
  const eye = new THREE.Vector3(-0.52, 1.56, 5.03);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.035, 32);
  camera.position.copy(eye);
  const state = { ...HOME };
  const low = quality === 'low' || (quality !== 'high' && matchMedia('(pointer: coarse)').matches);
  const ratio = low ? 1 : quality === 'high' ? 1.6 : 1.35;
  if (renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    if (low) sun.shadow.mapSize.set(1024, 1024);
  }
  scene.updateMatrixWorld(true);
  const direction = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const point = new THREE.Vector2();
  const hitObjects = [plane, ...Object.values(targets).map((item) => item.object)];
  const galleryCenter = plane.position;
  const gallerySize = plane.geometry.parameters;
  let projectLinks = [];
  let frame = 0;
  let lost = false;
  let width = 0, height = 0, fit = 46;
  let pointer = null;

  function resize() {
    const nextWidth = canvas.parentElement.clientWidth;
    const nextHeight = canvas.parentElement.clientHeight;
    if (width === nextWidth && height === nextHeight) return;
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    const resolutionCap = low ? 1_180_000 : 3_400_000;
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ratio, Math.sqrt(resolutionCap / (width * height))));
      renderer.setSize(width, height, false);
    }
    camera.aspect = width / height;
    fit = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(23)) * Math.max(1, 1.26 / camera.aspect)));
    fit = Math.min(fit, 85);
  }

  function render() {
    frame = 0;
    if (lost) return;
    resize();
    const { yaw, pitch, zoom } = state;
    direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(projected.copy(eye).add(direction));
    camera.fov = fit;
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    if (renderer) {
      renderer.render(scene, camera);
      // Only the camera and wall artwork change, so the shadow map can be reused.
      renderer.shadowMap.autoUpdate = false;
    } else {
      panorama.render(camera, width, height);
    }
    for (const marker of markers) {
      const { position } = targets[marker.dataset.point];
      const facing = projected.copy(position).sub(eye).dot(direction) > 0;
      projected.copy(position).project(camera);
      const x = (projected.x + 1) / 2;
      const y = (1 - projected.y) / 2;
      marker.hidden = !facing || projected.z > 1 || x < 0.035 || x > 0.965 || y < 0.12 || y > 0.9;
      if (!marker.hidden) {
        marker.style.left = (x * 100) + '%';
        marker.style.top = (y * 100) + '%';
      }
    }

    // The canvas handles pointer hits so a drag can begin over any artwork.
    // These matching links give keyboard users the same direct destinations.
    const wallFacing = projected.copy(galleryCenter).sub(eye).dot(direction) > 0;
    for (const { tile, element } of projectLinks) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const x of [tile.x, tile.x + tile.width]) {
        for (const y of [tile.y, tile.y + tile.height]) {
          projected.set(
            galleryCenter.x + (x / artwork.width - 0.5) * gallerySize.width,
            galleryCenter.y + (0.5 - y / artwork.height) * gallerySize.height,
            galleryCenter.z
          ).project(camera);
          minX = Math.min(minX, (projected.x + 1) / 2);
          maxX = Math.max(maxX, (projected.x + 1) / 2);
          minY = Math.min(minY, (1 - projected.y) / 2);
          maxY = Math.max(maxY, (1 - projected.y) / 2);
        }
      }
      const left = clamp(minX, 0, 1), right = clamp(maxX, 0, 1);
      const top = clamp(minY, 0.10, 0.91), bottom = clamp(maxY, 0.10, 0.91);
      element.hidden = !wallFacing || right - left < 0.015 || bottom - top < 0.015;
      if (!element.hidden) {
        element.style.left = (left * 100) + '%';
        element.style.top = (top * 100) + '%';
        element.style.width = ((right - left) * 100) + '%';
        element.style.height = ((bottom - top) * 100) + '%';
      }
    }
  }

  function requestRender() {
    if (!frame && !lost) frame = requestAnimationFrame(render);
  }

  function turn(deltaYaw, deltaPitch) {
    state.yaw = (state.yaw + deltaYaw) % TAU;
    state.pitch = clamp(state.pitch + deltaPitch, -1.36, 1.36);
    requestRender();
  }

  function zoomBy(scale) {
    state.zoom = clamp(state.zoom * scale, 0.78, 2.05);
    requestRender();
  }

  function cameraAction(action) {
    if (action === 'reset') {
      Object.assign(state, HOME);
      requestRender();
    } else {
      zoomBy(action === 'in' ? 1.17 : 1 / 1.17);
    }
  }

  function hit(event) {
    point.set(2 * event.clientX / width - 1, 1 - 2 * event.clientY / height);
    ray.setFromCamera(point, camera);
    const match = ray.intersectObjects(hitObjects, false)[0];
    if (!match) return null;
    if (match.object === plane) return gallery.projectAt(match.uv);
    return { id: Object.keys(targets).find((key) => targets[key].object === match.object) };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (pointer || !event.isPrimary || event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: state.yaw, pitch: state.pitch, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointer) {
      canvas.style.cursor = hit(event) ? 'pointer' : '';
      return;
    }
    if (event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (Math.hypot(dx, dy) > 5) pointer.moved = true;
    if (!pointer.moved) return;
    canvas.classList.add('dragging');
    canvas.style.cursor = 'grabbing';
    const sensitivity = 0.0045 / state.zoom;
    state.yaw = (pointer.yaw - dx * sensitivity) % TAU;
    state.pitch = clamp(pointer.pitch + dy * sensitivity, -1.36, 1.36);
    requestRender();
  });
  function release(event) {
    if (event.pointerId !== pointer?.id) return;
    const select = event.type === 'pointerup' && !pointer.moved && hit(event);
    pointer = null;
    canvas.classList.remove('dragging');
    canvas.style.cursor = '';
    if (select) onSelect(select);
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomBy(Math.exp(clamp(-event.deltaY * 0.0011, -0.21, 0.21)));
  }, { passive: false });

  const keys = {
    ArrowLeft: () => turn(-0.11, 0), ArrowRight: () => turn(0.11, 0),
    ArrowUp: () => turn(0, 0.09), ArrowDown: () => turn(0, -0.09),
    '+': () => cameraAction('in'), '=': () => cameraAction('in'), '-': () => cameraAction('out'),
    Home: () => cameraAction('reset'), '0': () => cameraAction('reset'),
  };
  canvas.addEventListener('keydown', (event) => {
    if (event.altKey || event.metaKey || event.ctrlKey || !Object.hasOwn(keys, event.key)) return;
    event.preventDefault();
    keys[event.key]();
  });

  window.addEventListener('resize', requestRender);
  function usePanorama() {
    renderer = null;
    panorama = createPanorama({
      canvas, artwork, plane, eye, onReady: requestRender,
      onFailure: () => {
        lost = true;
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', requestRender);
        onLost();
      }
    });
  }
  canvas.addEventListener('webglcontextlost', () => {
    usePanorama();
    requestRender();
  }, { once: true });
  if (!renderer) usePanorama();
  try { render(); }
  catch (error) {
    if (!renderer) throw error;
    console.warn('Switching to the panoramic study.', error);
    usePanorama();
    render();
  }
  canvas.hidden = false;
  return {
    cameraAction,
    showProjects(projects) {
      const tiles = gallery.show(projects, () => {
        panorama?.updateArtwork();
        requestRender();
      });
      projectLinks = tiles.map((tile) => {
        const element = document.createElement('a');
        element.className = 'wall-link';
        element.href = tile.project.href;
        element.setAttribute('aria-label', tile.project.title + ' · ' + tile.project.destination);
        element.hidden = true;
        return { tile, element };
      });
      wallLinks.replaceChildren(...projectLinks.map(({ element }) => element));
    },
  };
}
