const copy = {
  title: ['Quiet Study', '光的書房'],
  room: ['Interactive 3D study', '互動 3D 書房'],
  navigation: ['In the study', '書房導覽'],
  language: ['Language', '語言'],
  projects: ['Projects', '作品'],
  wall: ['Projects on the wall', '牆上的作品'],
  demos: ['Demos', 'Demo'],
  about: ['About & CV', '關於與履歷'],
  cv: ['CV', '履歷'],
  pins: ['Pinned on GitHub', 'GitHub 置頂作品'],
  look: ['Look around the 3D study', '環顧 3D 書房'],
  hint: ['Drag to look around · Click a project to open it', '拖曳環顧 · 點牆上的作品即可開啟'],
  touch: ['Drag to look around · Tap a project', '拖曳環顧 · 點牆上的作品'],
  controls: ['Camera controls', '視角控制'],
  reset: ['Reset view', '重設視角'],
  zoomOut: ['Zoom out', '縮小'],
  zoomIn: ['Zoom in', '放大'],
  close: ['Close panel', '關閉面板'],
  source: ['GitHub ↗', 'GitHub ↗'],
  live: ['Open demo ↗', '開啟 Demo ↗'],
  cvEn: ['English CV · PDF', '英文履歷 · PDF'],
  cvZh: ['中文履歷 · PDF', '中文履歷 · PDF'],
  loading: ['Loading pinned projects…', '載入置頂專案…'],
  noPins: ['No pinned repositories. Browse GitHub for all projects.', '目前沒有置頂專案。可到 GitHub 查看全部作品。'],
  pinsUnavailable: ['Pinned projects could not load. View them on GitHub.', '暫時無法載入置頂專案。可到 GitHub 查看。'],
  loadingRoom: ['Loading the study…', '書房載入中…'],
  fallback: ['3D preview unavailable. Projects and CV are still accessible.', '目前無法顯示即時 3D，仍可開啟作品與履歷。'],
};

const { person, rooms } = window.SITE;
const params = new URLSearchParams(location.search);
const languageKey = 'hall-of-doors-lang';
const siteRoot = new URL('../../', import.meta.url);
const asset = (path) => new URL(path, siteRoot).href;
const touch = matchMedia('(pointer: coarse)').matches;
let lang = params.get('lang');
if (!['zh', 'en'].includes(lang)) {
  try { lang = localStorage.getItem(languageKey); } catch (_) { /* optional preference */ }
}
if (lang !== 'zh') lang = 'en';

const $ = (selector) => document.querySelector(selector);
const tr = (key) => copy[key][lang === 'zh' ? 1 : 0];
const localized = (value) => typeof value === 'string' ? value : value?.[lang] || value?.en || '';
const panel = $('#panel');
const content = $('#panel-content');
const heading = $('#panel-title');
let panelKind;
let pins = null;
let pinsError = false;
let selected = 0;
let view = null;
let degraded = false;

const entries = rooms.flatMap((room) => room.doors.map((door) => ({ room, door })));
const matched = new Map();
for (const entry of entries) {
  const key = entry.door.repo?.toLowerCase();
  if (key && (!matched.has(key) || (entry.door.kind === 'demo' && !matched.get(key).door.demo))) matched.set(key, entry);
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function safeWebUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const url = new URL(raw, location.href);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch (_) {
    return null;
  }
}

function link(text, href, { external = false, className, locale } = {}) {
  const element = node('a', text, className);
  element.href = href;
  if (external) {
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
  }
  if (locale) element.lang = locale;
  return element;
}

const imagePath = (entry, pin) => {
  if (typeof pin?.preview === 'string' && /^assets\/pins\/[\w.-]+\.(?:jpe?g|png|webp)$/i.test(pin.preview)) {
    return asset(pin.preview);
  }
  return entry?.door.image ? asset(entry.door.image + '-sm.jpg') : '';
};

// This repo has a Pages demo and previews in its README, but no homepage in the pin feed.
const pinDetails = {
  risk_control_on_multi_dimension: {
    title: { en: 'Multi-dimensional risk control', zh: '多維度風險控制' },
    description: {
      en: 'Compare how weights and hard limits across three kinds of risk change a decision.',
      zh: '比較三種風險的權重與上限，如何影響最後的選擇。',
    },
    demo: 'https://rolanthhuang.github.io/Risk_control_on_Multi_dimension/',
    image: asset('study/quiet/risk-control-preview.jpg'),
  },
};

function describePin(pin) {
  const key = pin.repo.toLowerCase();
  const entry = matched.get(key);
  const details = pinDetails[key];
  return {
    title: localized(entry?.door.title || details?.title) || pin.repo.replace(/[_-]+/g, ' '),
    description: localized(entry?.door.lede || details?.description) || pin.description || '',
    url: pin.url,
    demo: safeWebUrl(entry?.door.demo) || safeWebUrl(pin.homepage) || details?.demo,
    image: imagePath(entry, pin) || details?.image,
  };
}

function projectLinks(project, showRepo = true) {
  const actions = node('div', '', 'actions');
  if (project.demo && project.demo !== project.url) actions.append(link(tr('live'), project.demo, { external: true }));
  if (showRepo && project.url) actions.append(link(tr('source'), project.url, { external: true }));
  return actions;
}

function renderPins() {
  if (!pins) {
    content.append(node('p', tr('loading')));
    return;
  }
  if (!pins.length) {
    content.append(node('p', tr(pinsError ? 'pinsUnavailable' : 'noPins')),
      link(tr('source'), person.github, { external: true }));
    return;
  }
  const list = node('ul');
  pins.forEach((pin, index) => {
    const project = describePin(pin);
    const item = node('li');
    const row = node('div', '', 'project-row');
    const select = node('button', project.title, 'name');
    select.type = 'button';
    select.dataset.selection = index;
    select.setAttribute('aria-expanded', String(index === selected));
    if (index === selected) select.setAttribute('aria-current', 'true');
    select.addEventListener('click', () => {
      selected = index;
      renderPanel();
      content.querySelector(`[data-selection="${index}"]`).focus({ preventScroll: true });
    });
    row.append(select, link(tr('source'), project.url, { external: true }));
    item.append(row);
    if (index === selected) {
      const details = node('div', '', 'details');
      if (project.description) details.append(node('p', project.description));
      if (project.image) {
        const thumbnail = node('img', '', 'project-image');
        thumbnail.src = project.image;
        thumbnail.alt = '';
        thumbnail.addEventListener('error', () => thumbnail.remove(), { once: true });
        details.append(thumbnail);
      }
      details.append(projectLinks(project, false));
      item.append(details);
    }
    list.append(item);
  });
  content.append(list);
}

function renderDemos() {
  const seen = new Set();
  for (const room of rooms) {
    const list = node('ul');
    for (const door of room.doors) {
      const demo = safeWebUrl(door.demo);
      if (door.kind !== 'demo' || !demo || seen.has(demo)) continue;
      seen.add(demo);
      const item = node('li');
      const title = link(localized(door.title) + ' ↗', demo, { external: true });
      const row = node('div', '', 'project-row');
      row.append(title);
      item.append(row);
      list.append(item);
    }
    if (list.childElementCount) content.append(node('h3', localized(room.title), 'section-title'), list);
  }
}

function renderAbout() {
  const name = localized(person.name);
  heading.textContent = name;
  content.append(node('p', localized(person.title)), node('p', localized(person.focus)));
  const actions = node('div', '', 'actions');
  actions.append(
    link(tr('cvEn'), asset(person.cv.en), { external: true, className: 'pdf', locale: 'en' }),
    link(tr('cvZh'), asset(person.cv.zh), { external: true, className: 'pdf', locale: 'zh-Hant' }),
    link(tr('source'), person.github, { external: true })
  );
  content.append(actions);
}

function renderPanel() {
  content.replaceChildren();
  if (panelKind === 'projects') {
    heading.textContent = tr('pins');
    renderPins();
  } else if (panelKind === 'demos') {
    heading.textContent = tr('demos');
    renderDemos();
  } else {
    renderAbout();
  }
}

function openPanel(kind) {
  panelKind = kind;
  renderPanel();
  panel.showModal();
  heading.focus();
}

function updateGallery() {
  if (!view || !pins || degraded) return;
  view.showProjects(pins.map((pin) => {
    const project = describePin(pin);
    return { ...project, href: project.demo || project.url, destination: project.demo ? 'Demo' : 'GitHub' };
  }));
}

function refreshLabels() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.title = tr('title') + ' | ' + localized(person.name);
  document.querySelectorAll('[data-text]').forEach((element) => { element.textContent = tr(element.dataset.text); });
  document.querySelectorAll('[data-label]').forEach((element) => { element.setAttribute('aria-label', tr(element.dataset.label)); });
  document.querySelectorAll('[data-person]').forEach((element) => { element.textContent = localized(person[element.dataset.person]); });
  document.querySelectorAll('[data-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === lang)));
  refreshRenderStatus();
  if (panel.open) renderPanel();
  updateGallery();
}

function refreshRenderStatus() {
  const ready = !$('#scene').hidden && !degraded;
  $('#controls-hint').textContent = tr(touch ? 'touch' : 'hint');
  $('#controls-hint').hidden = !ready;
  $('#render-status').textContent = ready ? '' : tr(degraded ? 'fallback' : 'loadingRoom');
  $('#render-status').hidden = ready;
  $('.controls').hidden = !ready;
}

async function loadPins() {
  try {
    const response = await fetch(asset('assets/pinned.json'), { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error('Unable to load pinned repositories');
    const data = await response.json();
    if (!Array.isArray(data.pinned)) throw new Error('Missing pinned repository list');
    pins = data.pinned.filter((pin) => typeof pin?.repo === 'string' && /^[\w.-]+$/.test(pin.repo)
      && /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/i.test(pin.url)).slice(0, 6);
  } catch (_) {
    pins = [];
    pinsError = true;
  }
  if (panel.open && panelKind === 'projects') renderPanel();
  updateGallery();
}

function useFallback() {
  degraded = true;
  $('#scene').hidden = true;
  $('.poster').hidden = false;
  document.querySelectorAll('[data-point]').forEach((marker) => { marker.hidden = true; });
  $('#wall-links').hidden = true;
  refreshLabels();
}

document.querySelectorAll('[data-open]').forEach((button) => {
  button.addEventListener('click', () => openPanel(button.dataset.open));
});
document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => {
    lang = button.dataset.lang;
    try { localStorage.setItem(languageKey, lang); } catch (_) { /* optional preference */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
    refreshLabels();
  });
});
panel.addEventListener('click', (event) => {
  if (event.target !== panel) return;
  const { left, right, top, bottom } = panel.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) panel.close();
});

refreshLabels();
void loadPins();
import('./viewer.js?v=room-loading').then(({ startViewer }) => {
  view = startViewer({
    canvas: $('#scene'),
    markers: [...document.querySelectorAll('[data-point]')],
    wallLinks: $('#wall-links'),
    quality: params.get('q'),
    onSelect: ({ id, href }) => {
      if (href) location.assign(href);
      else openPanel(id);
    },
    onReady: refreshRenderStatus,
    onLost: useFallback,
  });
  document.querySelectorAll('[data-camera]').forEach((button) => {
    button.addEventListener('click', () => view.cameraAction(button.dataset.camera));
  });
  updateGallery();
}).catch((error) => {
  console.warn('3D study could not start.', error);
  useFallback();
});
