// The six faces are rendered from the same scene and camera position as the WebGL viewer.
const faces = ['right', 'left', 'top', 'bottom', 'back', 'front'];

async function readFace(name) {
  const image = new Image();
  image.src = new URL('panorama/' + name + '.webp?v=carved-study', import.meta.url).href;
  await image.decode();
  const size = image.naturalWidth;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return { size, pixels: ctx.getImageData(0, 0, size, size).data };
}

function sampleCube(images, x, y, z) {
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  let face, u, v, distance;
  if (ax >= ay && ax >= az) {
    face = x > 0 ? 0 : 1;
    u = x > 0 ? z : -z;
    v = -y;
    distance = ax;
  } else if (ay >= az) {
    face = y > 0 ? 2 : 3;
    u = x;
    v = y > 0 ? -z : z;
    distance = ay;
  } else {
    face = z > 0 ? 4 : 5;
    u = z > 0 ? -x : x;
    v = -y;
    distance = az;
  }
  const texture = images[face];
  const last = texture.size - 1;
  const col = ((1 + u / distance) * 0.5 * last + 0.5) | 0;
  const row = ((1 + v / distance) * 0.5 * last + 0.5) | 0;
  return (row * texture.size + col) * 4 + (face << 24);
}

export function createPanorama({ canvas, artwork, plane, eye, onReady, onFailure }) {
  const output = document.createElement('canvas');
  output.className = 'panorama';
  output.setAttribute('aria-hidden', 'true');
  output.hidden = true;
  canvas.before(output);
  canvas.classList.add('panorama-input');
  const ctx = output.getContext('2d', { alpha: false });
  const art = artwork.getContext('2d');
  const { width: wallWidth, height: wallHeight } = plane.geometry.parameters;
  const wallX = plane.position.x - wallWidth / 2;
  const wallY = plane.position.y + wallHeight / 2;
  const wallDepth = plane.position.z - eye.z;
  let artPixels = art.getImageData(0, 0, artwork.width, artwork.height).data;
  let images, buffer;
  Promise.all(faces.map(readFace)).then((textures) => {
    images = textures;
    onReady();
  }).catch(onFailure);

  function render(camera, viewportWidth, viewportHeight) {
    if (!images) return false;
    const maxPixels = 870_000;
    const scale = Math.min(1, Math.sqrt(maxPixels / (viewportWidth * viewportHeight)));
    const w = Math.max(1, Math.round(viewportWidth * scale));
    const h = Math.max(1, Math.round(viewportHeight * scale));
    if (!buffer || w !== output.width || h !== output.height) {
      output.width = w;
      output.height = h;
      buffer = ctx.createImageData(w, h);
    }
    const pixels = buffer.data;
    const basis = camera.matrixWorld.elements;
    const fov = camera.projectionMatrix.elements;
    const stepX = 2 / (w * fov[0]);
    const startX = (0.5 - w / 2) * stepX;
    let out = 0;
    for (let j = 0; j < h; j++) {
      const sy = (1 - 2 * (j + 0.5) / h) / fov[5];
      let dx = basis[0] * startX + basis[4] * sy - basis[8];
      let dy = basis[1] * startX + basis[5] * sy - basis[9];
      let dz = basis[2] * startX + basis[6] * sy - basis[10];
      for (let i = 0; i < w; i++) {
        const packed = sampleCube(images, dx, dy, dz);
        const face = images[packed >>> 24].pixels;
        const index = packed & 0xffffff;
        let r = face[index], g = face[index + 1], b = face[index + 2];
        if (dz < 0) {
          const t = wallDepth / dz;
          const u = (eye.x + t * dx - wallX) / wallWidth;
          const v = (wallY - eye.y - t * dy) / wallHeight;
          if (u >= 0 && u < 1 && v >= 0 && v < 1) {
            const n = ((v * artwork.height | 0) * artwork.width + (u * artwork.width | 0)) * 4;
            const a = artPixels[n + 3] / 255;
            r += (artPixels[n] - r) * a;
            g += (artPixels[n + 1] - g) * a;
            b += (artPixels[n + 2] - b) * a;
          }
        }
        pixels[out++] = r;
        pixels[out++] = g;
        pixels[out++] = b;
        pixels[out++] = 255;
        dx += basis[0] * stepX;
        dy += basis[1] * stepX;
        dz += basis[2] * stepX;
      }
    }
    ctx.putImageData(buffer, 0, 0);
    output.hidden = false;
    return true;
  }

  function updateArtwork() {
    artPixels = art.getImageData(0, 0, artwork.width, artwork.height).data;
  }
  return { render, updateArtwork };
}
