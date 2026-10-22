/* Everything the study says, and the panels it opens. Content comes from the site's own
   assets/projects.js (window.SITE), so the study never drifts from the hall. */
const SITE = window.SITE;
const LS_KEY = 'hall-of-doors-lang';

export const state = { lang: 'en' };
try { const s = localStorage.getItem(LS_KEY); if (s === 'en' || s === 'zh') state.lang = s; } catch (e) { }
{ const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'zh') state.lang = q; }

export const t = (v) => (v == null ? '' : typeof v === 'string' ? v : (v[state.lang] != null ? v[state.lang] : (v.en || '')));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const T = (v) => esc(t(v));
const ext = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M9 2h5v5M14 2 7.5 8.5M12 9.5V14H2V4h4.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

export const L = {
  title: { en: 'The study', zh: '書房' },
  hall: { en: 'Hall', zh: '門廳' },
  backToHall: { en: 'Back to the hall of doors', zh: '回到門廳' },
  loading: { en: 'Lighting the candles…', zh: '正在點蠟燭…' },
  preparing: { en: 'Warming the room…', zh: '讓房間暖起來…' },
  introTitle: { en: 'The study', zh: '書房' },
  introLine: { en: 'The portrait over the fire turns to the next project. The bookcase hides every live demo. The glass bottle on the desk says who I am.', zh: '壁爐上的肖像會轉到下一件作品，書櫃後面藏著所有 demo，桌上的玻璃瓶告訴你我是誰。' },
  hintMouse: { en: 'Drag to look around, scroll to zoom, click what glows.', zh: '拖曳環顧，滾輪縮放，點發光的地方。' },
  hintTouch: { en: 'Drag to look around, tap what glows.', zh: '拖曳環顧，點發光的地方。' },
  gotIt: { en: 'Look around', zh: '開始看看' },
  navProjects: { en: 'Projects', zh: '作品' },
  navDemos: { en: 'Demos', zh: 'Demo' },
  navAbout: { en: 'About & CV', zh: '關於與履歷' },
  hs: {
    portrait: { en: 'Next project', zh: '下一件作品' },
    books: { en: 'Every demo', zh: '所有 demo' },
    klein: { en: 'About & CV', zh: '關於與履歷' },
    hall: { en: 'Back to the hall', zh: '回到門廳' },
    all: { en: 'All doors', zh: '所有門' },
  },
  hsLong: {
    portrait: { en: 'The portrait over the fire: turn it to the next project', zh: '壁爐上的肖像：轉到下一件作品' },
    books: { en: 'The bookcase: open it to every live demo', zh: '書櫃：打開，裡面是所有 demo' },
    klein: { en: 'The Klein bottle on the desk: about me and my CV', zh: '桌上的克萊因瓶：關於我與履歷' },
    hall: { en: 'The left door: back to the hall of doors', zh: '左邊的門：回到門廳' },
    all: { en: 'The right door: every door at once', zh: '右邊的門：一次打開所有的門' },
  },
  doorPlates: [{ en: ['The hall', 'of doors'], zh: ['門廳', '回到大廳'] }, { en: ['All doors', 'at once'], zh: ['所有的門', '一次打開'] }],
  close: { en: 'Back to the room', zh: '回到房間' },
  prev: { en: 'Previous project', zh: '上一件作品' },
  next: { en: 'Next project', zh: '下一件作品' },
  openDemo: { en: 'Open the demo', zh: '開啟 demo' },
  readPlaque: { en: 'Read the full plaque', zh: '讀完整銘牌' },
  source: { en: 'Source', zh: '原始碼' },
  booksKicker: { en: 'Behind the bookcase', zh: '書櫃後面' },
  booksTitle: { en: 'Every live demo', zh: '所有即時 demo' },
  booksLine: { en: 'Each opens in a new tab. The plaque link reads how it was built.', zh: '都會在新分頁開啟；「銘牌」寫著它是怎麼做的。' },
  open: { en: 'Open', zh: '開啟' },
  plaque: { en: 'Plaque', zh: '銘牌' },
  garden: { en: 'Working materials and every public repository are in the garden behind the curtain.', zh: '完整工作資料與所有公開 repo，在窗簾後的花園裡。' },
  gardenLink: { en: 'Behind the curtain', zh: '窗簾後' },
  aboutKicker: { en: 'The Klein bottle', zh: '克萊因瓶' },
  epigraph: { en: 'A bottle with no inside and no outside: every room here leads to another.', zh: '沒有裡外之分的瓶子：這裡的每個房間都通往另一個房間。' },
  cvEn: { en: 'CV in English', zh: '英文履歷' },
  cvZh: { en: '中文履歷', zh: '中文履歷' },
  email: { en: 'Email', zh: 'Email' },
  aboutPage: { en: 'About, methods and path', zh: '關於我、方法與經歷' },
  fallback: { en: 'The 3D study needs WebGL 2, which this browser did not offer. Everything in the room is still here.', zh: '3D 書房需要 WebGL 2，這個瀏覽器沒有提供。房間裡的東西都還在這裡。' },
  failed: { en: 'The study could not finish lighting up. Everything in it is still here.', zh: '書房沒能完整亮起來，但裡面的東西都還在這裡。' },
  language: { en: 'Language', zh: '語言' },
  room: { en: 'In the study', zh: '書房裡' },
  of: { en: ' of ', zh: ' / ' },
};

/* The projects the portrait turns through: every demo door, one per demo link.
   Order follows the repos pinned on GitHub (assets/pinned.json, kept fresh by the site's workflow):
   pinned ones first in pin order, then the rest in room order. A pinned repo the site has no
   write-up for still gets a plain frame, built from its GitHub description. */
let PINNED = [];
export async function loadPinned() {
  try {
    const r = await Promise.race([fetch('../assets/pinned.json'), new Promise((_, no) => setTimeout(no, 1500))]);
    const j = r.ok ? await r.json() : null;
    PINNED = (j && Array.isArray(j.pinned) ? j.pinned : []).filter((x) => x && x.repo);
  } catch (e) { PINNED = []; }
}
const key = (x) => String(x || '').toLowerCase();
const GEN_ROOM = { id: 'pinned', paint: '#8A6A2A', plate: { en: 'Pinned on GitHub', zh: 'GitHub 釘選' }, title: { en: 'Pinned on GitHub', zh: 'GitHub 釘選' } };
const pretty = (n) => String(n).replace(/[-_]+/g, ' ').replace(/\b([a-z])/g, (m) => m.toUpperCase());
function genericOf(x) {
  const txt = { en: x.description || 'A project pinned on GitHub.', zh: x.description || '釘選在 GitHub 的專案。' };
  const door = { id: 'gh-' + key(x.repo), kind: 'demo', repo: x.repo, demo: x.homepage || x.url, title: { en: pretty(x.repo), zh: pretty(x.repo) }, lede: txt, result: { en: '', zh: '' }, tags: [], plate: { en: pretty(x.repo), zh: pretty(x.repo) } };
  return { room: GEN_ROOM, door, img: '', paint: 'p_all', generic: true };
}
export function projectList() {
  const base = [], seen = new Set();
  SITE.rooms.forEach((room) => room.doors.forEach((door) => {
    if (door.kind !== 'demo' || !door.demo || seen.has(door.demo)) return;
    seen.add(door.demo);
    const img = String(door.image || '').split('/').pop();
    base.push({ room, door, img, paint: 'p_' + img });
  }));
  const out = [], used = new Set();
  PINNED.forEach((x) => {
    const hit = base.find((p) => !used.has(p) && key(p.door.repo) === key(x.repo));
    if (hit) { used.add(hit); out.push(hit); return; }
    const g = genericOf(x);
    if (!seen.has(g.door.demo) && !out.some((o) => o.door.id === g.door.id)) { seen.add(g.door.demo); out.push(g); }
  });
  base.forEach((p) => { if (!used.has(p)) out.push(p); });
  return out;
}
export const extraProjects = () => projectList().filter((p) => p.generic);

/* Links back into the site keep the language the visitor is reading in. */
export const site = (path) => (path.startsWith('#') ? '../' + (state.lang === 'zh' ? '?lang=zh' : '') + path : '../' + path);

/* ---------------------------------------------------------------- panels */
export function projectCardHTML(p, i, n) {
  const d = p.door, r = p.room;
  const href = site('#/' + r.id + '/' + d.id);
  const repo = d.repo ? 'https://github.com/' + SITE.person.githubUser + '/' + d.repo : null;
  return `
    <p class="panel__kicker">${T(r.plate)}<span class="panel__count">${i + 1}${T(L.of)}${n}</span></p>
    <h2 class="panel__title" id="panel-title" tabindex="-1">${T(d.title)}</h2>
    ${d.context ? `<p class="panel__context">${T(d.context)}</p>` : ''}
    <p class="panel__lede">${T(d.lede)}</p>
    ${d.result && (d.result.en || d.result.zh) ? `<p class="panel__text">${T(d.result)}</p>` : ''}
    ${d.tags && d.tags.length ? `<ul class="chips">${d.tags.slice(0, 6).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <div class="panel__acts">
      <a class="btn btn--brass" href="${esc(d.demo)}" target="_blank" rel="noopener">${T(L.openDemo)}${ext}</a>
      ${p.generic ? '' : `<a class="btn" href="${esc(href)}">${T(L.readPlaque)}</a>`}
      ${repo ? `<a class="btn btn--quiet" href="${esc(repo)}" target="_blank" rel="noopener">${T(L.source)}${ext}</a>` : ''}
    </div>
    <div class="panel__flip">
      <button class="flip" type="button" data-flip="-1" aria-label="${T(L.prev)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
      <span class="flip__dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</span>
      <button class="flip" type="button" data-flip="1" aria-label="${T(L.next)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
    </div>`;
}

export function demosHTML() {
  const groups = SITE.rooms.map((r) => {
    const seen = new Set();
    const items = r.doors.filter((d) => d.kind === 'demo' && d.demo && !seen.has(d.demo) && seen.add(d.demo)).map((d) => {
      const img = d.image ? site(d.image + '-sm.jpg') : '';
      const more = (d.more || []).filter((m) => !/dropbox/i.test(m.url)).map((m) => `<a href="${esc(m.url)}" target="_blank" rel="noopener">${T(m.label)}${ext}</a>`).join('');
      return `<li class="demo">
        ${img ? `<span class="demo__thumb" style="background-image:url('${esc(img)}');background-position:${esc(d.focus || '50% 50%')}"></span>` : ''}
        <span class="demo__body">
          <span class="demo__title">${T(d.title)}</span>
          <span class="demo__line">${T(d.lede)}</span>
          <span class="demo__links"><a class="demo__open" href="${esc(d.demo)}" target="_blank" rel="noopener">${T(L.open)}${ext}</a><a href="${esc(site('#/' + r.id + '/' + d.id))}">${T(L.plaque)}</a>${more}</span>
        </span></li>`;
    }).join('');
    return items ? `<section class="demos__room"><h3><i style="--p:${esc(r.paint)}"></i>${T(r.title)}</h3><ul>${items}</ul></section>` : '';
  }).join('');
  const extra = extraProjects().map((p) => `<li class="demo"><span class="demo__body"><span class="demo__title">${T(p.door.title)}</span><span class="demo__line">${T(p.door.lede)}</span><span class="demo__links"><a class="demo__open" href="${esc(p.door.demo)}" target="_blank" rel="noopener">${T(L.open)}${ext}</a></span></span></li>`).join('');
  const groups2 = groups + (extra ? `<section class="demos__room"><h3><i style="--p:${esc(GEN_ROOM.paint)}"></i>${T(GEN_ROOM.title)}</h3><ul>${extra}</ul></section>` : '');
  return `
    <p class="panel__kicker">${T(L.booksKicker)}</p>
    <h2 class="panel__title" id="panel-title" tabindex="-1">${T(L.booksTitle)}</h2>
    <p class="panel__text panel__text--dim">${T(L.booksLine)}</p>
    <div class="demos">${groups2}</div>
    <p class="panel__foot">${T(L.garden)} <a href="${esc(site('#/garden'))}">${T(L.gardenLink)}</a></p>`;
}

export function aboutHTML() {
  const P = SITE.person, W = SITE.who;
  return `
    <p class="panel__kicker">${T(L.aboutKicker)}</p>
    <p class="panel__epigraph">${T(L.epigraph)}</p>
    <h2 class="panel__title" id="panel-title" tabindex="-1">${T(P.name)} <span class="panel__alt">${T(P.altName)}</span></h2>
    <p class="panel__sub">${T(P.title)}. ${T(P.focus)}.</p>
    ${W.bio.map((b) => `<p class="panel__text">${T(b)}</p>`).join('')}
    <p class="panel__open">${T(W.openTo)}</p>
    <div class="panel__acts">
      <a class="btn btn--brass" href="${esc(site(P.cv.en))}" target="_blank" rel="noopener" lang="en">${T(L.cvEn)}</a>
      <a class="btn btn--brass" href="${esc(site(P.cv.zh))}" target="_blank" rel="noopener" lang="zh-Hant">${T(L.cvZh)}</a>
    </div>
    <div class="panel__acts panel__acts--small">
      <a class="btn btn--quiet" href="mailto:${esc(P.email)}">${T(L.email)}</a>
      <a class="btn btn--quiet" href="${esc(P.linkedin)}" target="_blank" rel="noopener">LinkedIn${ext}</a>
      <a class="btn btn--quiet" href="${esc(P.github)}" target="_blank" rel="noopener">GitHub${ext}</a>
      <a class="btn btn--quiet" href="${esc(site('#/who'))}">${T(L.aboutPage)}</a>
    </div>`;
}

/* ---------------------------------------------------------------- the panel element */
export function makePanel(onClose) {
  const el = document.getElementById('panel');
  const body = el.querySelector('[data-body]');
  const closeBtn = el.querySelector('[data-close]');
  let open = false, kind = null, returnTo = null;
  closeBtn.addEventListener('click', () => onClose());
  return {
    get open() { return open; }, get kind() { return kind; },
    show(k, html, { focus = true, from = null } = {}) {
      const was = open && kind === k;
      kind = k; body.innerHTML = html; el.dataset.kind = k;
      closeBtn.setAttribute('aria-label', t(L.close));
      if (!open) { el.hidden = false; void el.offsetWidth; el.classList.add('is-open'); open = true; returnTo = from || document.activeElement; }
      if (!was) body.scrollTop = 0;
      if (focus) { const h = body.querySelector('#panel-title'); if (h) h.focus({ preventScroll: true }); }
    },
    hide() {
      if (!open) return;
      open = false; kind = null; el.classList.remove('is-open');
      setTimeout(() => { if (!open) el.hidden = true; }, 420);
      if (returnTo && document.body.contains(returnTo) && returnTo.focus) returnTo.focus({ preventScroll: true });
      returnTo = null;
    },
    el, body,
  };
}

export function setLang(l) {
  state.lang = l;
  try { localStorage.setItem(LS_KEY, l); } catch (e) { }
  applyStatic();
}

/* Static labels in index.html carry data-i18n="key" (a key of L). */
export function applyStatic() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant' : 'en';
  document.title = (state.lang === 'zh' ? '書房 | 黃一玄' : 'The study | Yi-Hsuan Huang');
  document.querySelectorAll('[data-i18n]').forEach((el) => { const v = L[el.getAttribute('data-i18n')]; if (v) el.textContent = t(v); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => { const v = L[el.getAttribute('data-i18n-label')]; if (v) el.setAttribute('aria-label', t(v)); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === state.lang)));
  document.querySelectorAll('[data-site]').forEach((a) => { a.href = site(a.getAttribute('data-site')); });
}
