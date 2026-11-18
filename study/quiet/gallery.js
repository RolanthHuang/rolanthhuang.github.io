const WIDTH = 1200;
const HEIGHT = 660;
const MARGIN = 18;
const GAP = 34;
const CAPTION = 44;
const INK = '#3b3128';
const PAPER = '#e8ded0';

function placeTiles(projects) {
  const columns = projects.length > 4 ? 3 : Math.min(2, projects.length);
  const rows = Math.ceil(projects.length / columns);
  const width = (WIDTH - 2 * MARGIN - GAP * (columns - 1)) / columns;
  const height = (HEIGHT - 2 * MARGIN - GAP * (rows - 1)) / rows;
  return projects.map((project, index) => ({
    project,
    x: MARGIN + index % columns * (width + GAP),
    y: MARGIN + Math.floor(index / columns) * (height + GAP),
    width,
    height,
  }));
}

export function createGallery() {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const images = new Map();
  let tiles = [];
  let revision = 0;

  function drawTile(tile, image) {
    const { x, y, width, height, project } = tile;
    const photoHeight = height - CAPTION;
    ctx.clearRect(x, y, width, height);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, y, width, photoHeight);
    if (image) {
      const scale = Math.min(width / image.naturalWidth, photoHeight / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      ctx.drawImage(image, x + (width - w) / 2, y + (photoHeight - h) / 2, w, h);
    } else {
      ctx.fillStyle = '#655748';
      ctx.font = '500 28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(project.destination, x + width / 2, y + photoHeight / 2, width - 44);
    }
    ctx.strokeStyle = 'rgba(67,50,34,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, width - 2, photoHeight - 2);
    ctx.fillStyle = INK;
    ctx.font = '600 27px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(project.title, x, y + photoHeight + 25, width - 49);
    ctx.textAlign = 'right';
    ctx.fillText('↗', x + width - 3, y + photoHeight + 25);
  }

  function loadImage(src) {
    if (!images.has(src)) {
      const image = new Image();
      image.src = src;
      images.set(src, image.decode().then(() => image).catch(() => null));
    }
    return images.get(src);
  }

  function show(projects, redraw) {
    const current = ++revision;
    tiles = projects.length ? placeTiles(projects) : [];
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    for (const tile of tiles) {
      drawTile(tile);
      if (!tile.project.image) continue;
      void loadImage(tile.project.image).then((image) => {
        if (!image || revision !== current) return;
        drawTile(tile, image);
        redraw();
      });
    }
    redraw();
    return tiles;
  }

  function projectAt(uv) {
    const x = uv.x * WIDTH;
    const y = (1 - uv.y) * HEIGHT;
    return tiles.find((tile) => x >= tile.x && x <= tile.x + tile.width
      && y >= tile.y && y <= tile.y + tile.height)?.project;
  }

  return { canvas, show, projectAt };
}
