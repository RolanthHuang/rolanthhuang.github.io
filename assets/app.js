/* The hall of doors. Plain JavaScript, no build step.
   Content lives in projects.js; this file draws the rooms and moves between them. */
(function () {
  "use strict";

  var SITE = window.SITE;
  var stage = document.getElementById("stage");
  if (!SITE || !stage) return;

  /* ---------- language ---------- */

  var LS_KEY = "hall-of-doors-lang";
  var lang = "en";
  try {
    var saved = localStorage.getItem(LS_KEY);
    if (saved === "en" || saved === "zh") lang = saved;
  } catch (e) {}
  var qp = new URLSearchParams(location.search).get("lang");
  if (qp === "en" || qp === "zh") lang = qp;

  function t(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v[lang] != null ? v[lang] : (v.en != null ? v.en : "");
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function T(v) { return esc(t(v)); }

  var UI = {
    hall: { en: "Hall", zh: "大廳" },
    backTo: { en: "Back to", zh: "回到" },
    allDoors: { en: "All doors", zh: "所有門" },
    cv: { en: "CV", zh: "履歷" },
    skip: { en: "Skip to content", zh: "跳到內容" },
    takeKey: { en: "Take the key to open every door at once.", zh: "拿起鑰匙，一次打開所有的門。" },
    lockedSide: { en: "That door is locked. The key on the table opens the rest.", zh: "那扇門鎖著。桌上的鑰匙能打開其他的門。" },
    keyTitle: { en: "All doors at once", zh: "一次打開所有門" },
    keyLine: { en: "The key turns in every lock: everything in the hall, on one page.", zh: "鑰匙轉開每一道鎖：大廳裡的一切，都在這一頁。" },
    whoSay: { en: "About me, the CV and how to reach me.", zh: "關於我、履歷與聯絡方式。" },
    gardenSay: { en: "Working materials and every public repository.", zh: "完整工作資料與所有公開 repo。" },
    doorsInside: { en: " doors inside.", zh: " 扇門在裡面。" },
    liveDemo: { en: "Live demo", zh: "即時 demo" },
    lockedCase: { en: "Locked door: case study", zh: "上鎖的門：個案紀錄" },
    lockedNote: { en: "Locked. The system stays with its owner; the plaque on this page says what it did.", zh: "上鎖。系統屬於它的擁有者；這一頁的銘牌記錄它做了什麼。" },
    problem: { en: "Problem", zh: "問題" },
    method: { en: "Method", zh: "方法" },
    result: { en: "Result", zh: "結果" },
    openDemo: { en: "Open the demo", zh: "開啟 demo" },
    source: { en: "Source on GitHub", zh: "GitHub 原始碼" },
    sourceShort: { en: "Source", zh: "原始碼" },
    peek: { en: "Look through the keyhole", zh: "從鑰匙孔看進去" },
    bigger: { en: "Make it bigger", zh: "放大" },
    smaller: { en: "Make it smaller", zh: "縮小" },
    closeDemo: { en: "Close the demo", zh: "關閉 demo" },
    screenshot: { en: "Screenshot of ", zh: "畫面截圖：" },
    updated: { en: "Updated ", zh: "更新於 " },
    moreDoors: { en: "More doors in this room", zh: "這個房間的其他門" },
    nextDoor: { en: "The demo next door", zh: "隔壁的 demo" },
    behindLocked: { en: "Behind the locked door next to this one", zh: "隔壁那扇上鎖的門" },
    materials: { en: "Working materials (Dropbox)", zh: "完整資料（Dropbox）" },
    readPlaque: { en: "Read the plaque", zh: "讀銘牌" },
    cvEn: { en: "CV in English", zh: "英文履歷" },
    cvZh: { en: "中文履歷", zh: "中文履歷" },
    email: { en: "Email", zh: "Email" },
    methods: { en: "Methods and tools", zh: "方法與工具" },
    path: { en: "Path so far", zh: "經歷" },
    watching: { en: "Watching the shape.", zh: "觀察形狀中。" },
    caught: { en: "Shift caught early: ", zh: "提早抓到轉變：" },
    starfish: { en: "a starfish.", zh: "海星。" },
    stick: { en: "a stick.", zh: "棍子。" },
    baseline: { en: "Back to the usual shape.", zh: "回到平常的形狀。" },
    stillFig: { en: "Animation is off. From left: the usual shape, a starfish forming, a stick forming.", zh: "動畫已關閉。由左至右：平常的形狀、正在成形的海星、正在成形的棍子。" },
    specimenAlt: { en: "An amoeba-shaped user population that keeps changing into a starfish or a stick. A ring around it lights up as soon as a change starts.", zh: "一隻代表使用者群體的變形蟲，不斷變成海星或棍子；變化一開始，外圈的環就亮起。" },
    workingMaterials: { en: "Working materials", zh: "完整工作資料" },
    everyRepo: { en: "Every public repository", zh: "所有公開 repo" },
    shelfLive: { en: "Read live from GitHub.", zh: "即時取自 GitHub。" },
    shelfLoading: { en: "Reading the shelves from GitHub.", zh: "正在從 GitHub 讀取。" },
    shelfFallback: { en: "GitHub couldn't be reached just now, so this is the list saved with the site.", zh: "目前無法連上 GitHub，以下是網站內建的清單。" },
    hasDoor: { en: "Has a door: ", zh: "有一扇門：" },
    thisSite: { en: "This site", zh: "這個網站" },
    thisSiteText: { en: "Plain HTML, CSS and JavaScript, with no build step. The source is in ", zh: "純 HTML、CSS 與 JavaScript，不需要建置。原始碼在" },
    ownRepo: { en: "its own repository", zh: "它自己的 repo" },
    aboutLink: { en: "About, methods and path", zh: "關於我、方法與經歷" },
    study: { en: "Study", zh: "書房" },
    studyTitle: { en: "The study", zh: "書房" },
    studySay: { en: "A candlelit 3D room: the projects turn on the portrait over the fire, the demos wait behind the bookcase, and the Klein bottle on the desk holds the About page and CV.", zh: "點著蠟燭的 3D 房間：壁爐上的肖像轉過一件件作品，書櫃後藏著所有 demo，桌上的克萊因瓶裝著關於我與履歷。" },
    language: { en: "Language", zh: "語言" },
    site: { en: "Site", zh: "網站" }
  };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var user = SITE.person.githubUser;

  /* ---------- lookups and routes ---------- */

  var roomById = {};
  SITE.rooms.forEach(function (r) { roomById[r.id] = r; });

  function findDoor(roomId, doorId) {
    var r = roomById[roomId];
    if (!r) return null;
    for (var i = 0; i < r.doors.length; i++) if (r.doors[i].id === doorId) return r.doors[i];
    return null;
  }
  function findById(doorId) {
    for (var i = 0; i < SITE.rooms.length; i++) {
      var d = findDoor(SITE.rooms[i].id, doorId);
      if (d) return { room: SITE.rooms[i], door: d };
    }
    return null;
  }

  function parse(hash) {
    var parts = String(hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
    try { parts = parts.map(decodeURIComponent); } catch (e) {}
    var a = parts[0], b = parts[1];
    if (!a) return { name: "hall", depth: 0, key: "#/" };
    if (a === "doors") return { name: "index", depth: 1, key: "#/doors" };
    if (a === "who") return { name: "who", depth: 1, key: "#/who" };
    if (a === "garden") return { name: "garden", depth: 1, key: "#/garden" };
    if (roomById[a]) {
      if (b && findDoor(a, b)) return { name: "door", room: a, door: b, depth: 2, key: "#/" + a + "/" + b };
      return { name: "room", room: a, depth: 1, key: "#/" + a };
    }
    return { name: "hall", depth: 0, key: "#/", unknown: true };
  }

  function parentKey(r) {
    if (r.name === "door") return "#/" + r.room;
    if (r.depth > 0) return "#/";
    return null;
  }

  /* ---------- small helpers ---------- */

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var m = function (c) { return Math.max(0, Math.min(255, Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f))); };
    return "#" + ((1 << 24) + (m(r) << 16) + (m(g) << 8) + m(b)).toString(16).slice(1);
  }

  function fmtDate(v) {
    if (!v) return "";
    var d;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
    if (isNaN(d)) return "";
    try {
      return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-GB", { year: "numeric", month: "short", day: "numeric" }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function studyHref() { return "study/" + (lang === "zh" ? "?lang=zh" : ""); }

  /* ---------- drawings ---------- */

  function keySVG() {
    return '<svg viewBox="0 0 120 44" aria-hidden="true" focusable="false"><g stroke="#6b4c16" stroke-width="1.4">' +
      '<circle cx="21" cy="22" r="15" fill="#d9a441"/><circle cx="21" cy="22" r="6.5" fill="#132621"/>' +
      '<circle cx="21" cy="7" r="3.2" fill="#ebbd58"/><circle cx="21" cy="37" r="3.2" fill="#ebbd58"/><circle cx="6" cy="22" r="3.2" fill="#ebbd58"/>' +
      '<rect x="35" y="19" width="78" height="6" rx="1.5" fill="#d9a441"/><rect x="40" y="16" width="5" height="12" rx="1" fill="#ebbd58"/>' +
      '<path d="M95 25H113V36H109V32H105V38H100V33H95Z" fill="#d9a441"/></g>' +
      '<path d="M38 20.5H110" stroke="#f6d78c" stroke-width="1" opacity=".7"/></svg>';
  }

  function lockSVG() {
    return '<svg viewBox="0 0 24 30" aria-hidden="true" focusable="false">' +
      '<path d="M6.5 13V9a5.5 5.5 0 0 1 11 0v4" fill="none" stroke="#8a6420" stroke-width="3"/>' +
      '<rect x="2" y="12" width="20" height="16" rx="2.5" fill="#d9a441" stroke="#6b4c16" stroke-width="1.2"/>' +
      '<path d="M12 16.5a2.1 2.1 0 0 1 1.1 3.9V24h-2.2v-3.6A2.1 2.1 0 0 1 12 16.5z" fill="#2a1d08"/></svg>';
  }

  function escutcheonSVG() {
    return '<svg viewBox="0 0 64 88" aria-hidden="true" focusable="false">' +
      '<ellipse cx="32" cy="44" rx="28" ry="40" fill="#d9a441" stroke="#6b4c16" stroke-width="2"/>' +
      '<ellipse cx="32" cy="44" rx="22" ry="33" fill="none" stroke="#f6d78c" stroke-width="1.2" opacity=".75"/>' +
      '<path d="M26.4 41.7A8 8 0 1 1 37.6 41.7L40 60H24Z" fill="#120c06"/></svg>';
  }

  function archIcon() {
    return '<svg viewBox="0 0 11 14" aria-hidden="true" focusable="false"><path d="M1 13.5V6a4.5 4.5 0 0 1 9 0v7.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
  }

  function extIcon() {
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M9 2h5v5M14 2 7.5 8.5M12 9.5V14H2V4h4.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  }

  function irisSVG(color) {
    return '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<path fill-rule="evenodd" fill="' + color + '" d="M-500 -500H660V600H-500Z M74.4 47.05A9 9 0 1 1 85.6 47.05L88 60H72Z"/></svg>';
  }

  /* What you see through a door left ajar: the next room, with more doors in it. */
  function glimpseRoom(room) {
    var n = room.doors.length, w = 17, gap = 7;
    var x0 = 50 - (n * w + (n - 1) * gap) / 2, doors = "";
    room.doors.forEach(function (d, i) {
      var x = x0 + i * (w + gap), r = w / 2;
      doors += '<path d="M' + x + ' 170V128A' + r + " " + r + " 0 0 1 " + (x + w) + ' 128V170Z" fill="' + d.paint + '" stroke="rgba(0,0,0,.5)" stroke-width="1"/>' +
        '<circle cx="' + (x + w - 3.4) + '" cy="152" r="1.3" fill="#d9a441"/>';
    });
    return '<svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<rect width="100" height="200" fill="' + room.glimpse + '"/>' +
      '<circle cx="50" cy="92" r="46" fill="#ffe2a0" opacity=".16"/>' +
      '<rect y="170" width="100" height="30" fill="#000" opacity=".35"/>' + doors + "</svg>";
  }
  function glimpseWho() {
    return '<svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<rect width="100" height="200" fill="#f3ebd7"/><rect y="170" width="100" height="30" fill="#d8cbab"/>' +
      '<path d="M50 104c14-2 23 8 21 20-2 12-15 19-25 16-12-2-20-12-17-22 3-10 9-13 21-14z" fill="none" stroke="#26241f" stroke-width="1.5"/>' +
      '<ellipse cx="49" cy="123" rx="5" ry="4" fill="#26241f" opacity=".5"/></svg>';
  }
  function glimpseGarden() {
    var flowers = [[18, 160, "#f2b8c6"], [34, 168, "#fff6d5"], [58, 158, "#f5d76e"], [74, 166, "#f2b8c6"], [86, 156, "#fff6d5"], [46, 172, "#f5d76e"]];
    var f = flowers.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.4" fill="' + p[2] + '"/>'; }).join("");
    return '<svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<rect width="100" height="200" fill="#cfe5b8"/><circle cx="50" cy="70" r="44" fill="#fbfde8" opacity=".75"/>' +
      '<path d="M0 150Q50 134 100 150V200H0Z" fill="#7fb05d"/>' + f + "</svg>";
  }

  function doorHTML(o) {
    var tag = o.href ? "a" : "span";
    var attrs = o.href ? ' href="' + o.href + '" data-door' : ' aria-hidden="true"';
    var leafTop = o.windowImg
      ? '<span class="door__window" style="background-image:url(\'' + o.windowImg + "');background-position:" + (o.focus || "50% 50%") + '"></span>'
      : '<span class="door__panel door__panel--top"></span>';
    return "<" + tag + ' class="door ' + (o.cls || "") + '"' + attrs + (o.attrs || "") +
      ' style="--paint:' + o.paint + ";--next:" + (o.next || "#f2d9a0") + ";--arch:" + (o.arch || "22%") + ";" + (o.style || "") + '">' +
      '<span class="door__gap" aria-hidden="true">' + (o.glimpse || "") + "</span>" +
      '<span class="door__leaf" aria-hidden="true">' + leafTop +
      '<span class="door__panel door__panel--bottom"></span><span class="door__knob"></span><span class="door__keyhole"></span>' +
      (o.lock ? '<span class="door__lock">' + lockSVG() + "</span>" : "") + "</span>" +
      (o.plate ? '<span class="door__plate">' + o.plate + "</span>" : "") +
      (o.sr ? '<span class="sr-only">' + o.sr + "</span>" : "") +
      "</" + tag + ">";
  }

  function keystone(href, label) {
    return '<a class="keystone" href="' + href + '">' + archIcon() + '<span class="sr-only">' + T(UI.backTo) + " </span>" + esc(label) + "</a>";
  }

  /* ---------- the hall, drawn in perspective ---------- */

  var HALL = [
    { to: "risk", x: 372, y: 350, w: 112, h: 270 },
    { to: "decisions", x: 552, y: 328, w: 124, h: 292 },
    { to: "simulations", x: 748, y: 342, w: 118, h: 278 },
    { to: "who", x: 934, y: 394, w: 94, h: 226 }
  ];
  var TINY = { x: 1118, y: 568, w: 34, h: 52 };

  function hallSVG() {
    var VX = 800, VY = 380, FAR = 2.7;
    function P(X, Y, s) { return [VX + (X - VX) * s, VY + (Y - VY) * s]; }
    function f(n) { return Math.round(n * 10) / 10; }
    function pts(a) { return a.map(function (p) { return f(p[0]) + "," + f(p[1]); }).join(" "); }
    function ln(a, b, c, w, op) {
      return '<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '" stroke="' + c + '" stroke-width="' + w + '" stroke-opacity="' + op + '"/>';
    }
    var o = "";
    o += "<defs>" +
      '<linearGradient id="hg-wl" gradientUnits="userSpaceOnUse" x1="300" y1="0" x2="-150" y2="0"><stop offset="0" stop-color="#284840"/><stop offset="1" stop-color="#0f1e1a"/></linearGradient>' +
      '<linearGradient id="hg-wr" gradientUnits="userSpaceOnUse" x1="1300" y1="0" x2="1750" y2="0"><stop offset="0" stop-color="#284840"/><stop offset="1" stop-color="#0f1e1a"/></linearGradient>' +
      '<linearGradient id="hg-ce" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="-60"><stop offset="0" stop-color="#1c352e"/><stop offset="1" stop-color="#0c1915"/></linearGradient>' +
      '<radialGradient id="hg-bw" gradientUnits="userSpaceOnUse" cx="800" cy="230" r="640"><stop offset="0" stop-color="#2d4f45"/><stop offset="1" stop-color="#1b352e"/></radialGradient>' +
      '<radialGradient id="hg-glow"><stop offset="0" stop-color="#ffdc8f" stop-opacity=".55"/><stop offset=".35" stop-color="#ffd07a" stop-opacity=".16"/><stop offset="1" stop-color="#ffd07a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="hg-pool"><stop offset="0" stop-color="#ffd98a" stop-opacity=".3"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>' +
      '<pattern id="hg-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><line x1="0" y1="0" x2="0" y2="5" stroke="#000" stroke-opacity=".24" stroke-width="1"/></pattern>' +
      '<pattern id="hg-hatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(55)"><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-opacity=".17" stroke-width="1"/></pattern>' +
      "</defs>";

    /* ceiling and beams */
    var ceil = pts([P(300, 140, 1), P(1300, 140, 1), P(1300, 140, FAR), P(300, 140, FAR)]);
    o += '<polygon points="' + ceil + '" fill="url(#hg-ce)"/><polygon points="' + ceil + '" fill="url(#hg-hatch)"/>';
    for (var i = 1; i < 10; i++) o += ln(P(300 + 100 * i, 140, 1), P(300 + 100 * i, 140, FAR), "#081310", 1.3, 0.7);
    [1.14, 1.34, 1.62, 2.05].forEach(function (s) { o += ln(P(300, 140, s), P(1300, 140, s), "#081310", 1.6, 0.7); });

    /* side walls */
    var wl = pts([P(300, 140, 1), P(300, 620, 1), P(300, 620, FAR), P(300, 140, FAR)]);
    var wr = pts([P(1300, 140, 1), P(1300, 620, 1), P(1300, 620, FAR), P(1300, 140, FAR)]);
    o += '<polygon points="' + wl + '" fill="url(#hg-wl)"/><polygon points="' + wl + '" fill="url(#hg-hatch2)"/>';
    o += '<polygon points="' + wr + '" fill="url(#hg-wr)"/><polygon points="' + wr + '" fill="url(#hg-hatch2)"/>';
    for (var j = 0; j < 26; j++) {
      var s = 1.02 + j * 0.034;
      o += ln(P(300, 160, s), P(300, 540, s), "#fff", 1, 0.035) + ln(P(1300, 160, s), P(1300, 540, s), "#fff", 1, 0.035);
    }
    /* wainscot on the side walls */
    o += '<polygon points="' + pts([P(300, 540, 1), P(300, 620, 1), P(300, 620, FAR), P(300, 540, FAR)]) + '" fill="#10221d" fill-opacity=".7"/>';
    o += '<polygon points="' + pts([P(1300, 540, 1), P(1300, 620, 1), P(1300, 620, FAR), P(1300, 540, FAR)]) + '" fill="#10221d" fill-opacity=".7"/>';
    [1.06, 1.16, 1.28, 1.43, 1.62, 1.86, 2.16].forEach(function (s) {
      o += ln(P(300, 552, s), P(300, 610, s), "#000", 1.2, 0.35) + ln(P(1300, 552, s), P(1300, 610, s), "#000", 1.2, 0.35);
    });
    o += ln(P(300, 158, 1), P(300, 158, FAR), "#4c7066", 1.6, 0.6) + ln(P(1300, 158, 1), P(1300, 158, FAR), "#4c7066", 1.6, 0.6);
    o += ln(P(300, 540, 1), P(300, 540, FAR), "#5a8075", 2, 0.75) + ln(P(1300, 540, 1), P(1300, 540, FAR), "#5a8075", 2, 0.75);

    /* back wall: stripes, cornice, dado rail, wainscot panels, skirting */
    o += '<rect x="300" y="140" width="1000" height="480" fill="url(#hg-bw)"/>';
    for (var x = 310; x < 1300; x += 20) o += ln([x, 160], [x, 540], "#fff", 1, 0.03);
    o += '<rect x="300" y="140" width="1000" height="18" fill="#17302a"/>' + ln([300, 158], [1300, 158], "#4c7066", 1.6, 0.85);
    o += '<rect x="300" y="541" width="1000" height="79" fill="#18322b"/>' + ln([300, 540], [1300, 540], "#5a8075", 2.2, 0.9);
    for (var px = 311; px < 1290; px += 98) {
      o += '<rect x="' + px + '" y="553" width="86" height="51" fill="none" stroke="#000" stroke-opacity=".38" stroke-width="1.2"/>' +
        '<rect x="' + (px + 1.5) + '" y="554.5" width="86" height="51" fill="none" stroke="#fff" stroke-opacity=".05"/>';
    }
    o += '<rect x="300" y="611" width="1000" height="9" fill="#0d1b17"/>';

    /* the chequered floor */
    var rows = [0, 1, 2, 3, 4, 5].map(function (k) { return 1 / (1 - 0.12 * k); });
    for (var k = 0; k < 5; k++) {
      for (var c = 0; c < 10; c++) {
        var xa = 300 + 100 * c, xb = xa + 100;
        o += '<polygon points="' + pts([P(xa, 620, rows[k]), P(xb, 620, rows[k]), P(xb, 620, rows[k + 1]), P(xa, 620, rows[k + 1])]) +
          '" fill="' + ((c + k) % 2 ? "#2b4b42" : "#10211c") + '"/>';
      }
    }
    o += '<polygon points="' + pts([P(300, 620, 1), P(1300, 620, 1), P(1300, 620, FAR), P(300, 620, FAR)]) + '" fill="url(#hg-hatch2)" opacity=".6"/>';

    /* locked doors along the side walls (decorative, they rattle) */
    var sidePaint = ["#3f2220", "#24344a", "#41351a", "#2c2a3b"];
    function sideDoor(X, sa, sb, paint, flip) {
      var a = P(X, 362, sa), b = P(X, 362, sb), cc = P(X, 620, sb), d = P(X, 620, sa);
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 36 * (sa + sb) / 2;
      var path = "M" + f(d[0]) + " " + f(d[1]) + "L" + f(a[0]) + " " + f(a[1]) + "Q" + f(mx) + " " + f(my) + " " + f(b[0]) + " " + f(b[1]) + "L" + f(cc[0]) + " " + f(cc[1]) + "Z";
      var sk = flip ? sb - (sb - sa) * 0.18 : sa + (sb - sa) * 0.18;
      var knob = P(X, 470, sk);
      return '<g class="side-door"><path class="side-door__edge" d="' + path + '" fill="' + paint + '" stroke="#33554c" stroke-width="' + f(5 * sa) + '"/>' +
        '<path d="' + path + '" fill="url(#hg-hatch)"/>' +
        '<circle cx="' + f(knob[0]) + '" cy="' + f(knob[1]) + '" r="' + f(4 * sk) + '" fill="#b5872f"/></g>';
    }
    o += sideDoor(300, 1.035, 1.11, sidePaint[0], false) + sideDoor(300, 1.2, 1.38, sidePaint[1], false);
    o += sideDoor(1300, 1.035, 1.11, sidePaint[2], true) + sideDoor(1300, 1.2, 1.38, sidePaint[3], true);

    /* pools of lamplight on the floor */
    var LAMPS = [[500, 1.08], [1100, 1.08], [500, 1.3], [1100, 1.3], [500, 1.6], [1100, 1.6]];
    LAMPS.forEach(function (l, n) {
      var p = P(l[0], 620, l[1]);
      o += '<ellipse class="lamp-light" style="--d:' + (0.12 * n + 0.15).toFixed(2) + 's" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" rx="' + f(150 * l[1]) + '" ry="' + f(26 * l[1]) + '" fill="url(#hg-pool)"/>';
    });

    /* the three-legged glass table */
    o += '<g class="table">' +
      '<ellipse cx="800" cy="771" rx="118" ry="13" fill="#000" opacity=".3"/>' +
      ln([800, 682], [800, 758], "#efe6cf", 1.4, 0.35) +
      ln([728, 707], [721, 770], "#efe6cf", 1.8, 0.6) + ln([872, 707], [879, 770], "#efe6cf", 1.8, 0.6) +
      '<ellipse cx="800" cy="696" rx="112" ry="18" fill="#dff1ea" fill-opacity=".1" stroke="#efe6cf" stroke-opacity=".6" stroke-width="1.6"/>' +
      '<path d="M712 694Q760 684 812 684" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4"/></g>';

    /* the lamps hanging from the roof */
    LAMPS.forEach(function (l, n) {
      var s = l[1], p = P(l[0], 140, s), x2 = p[0], yc = p[1], cy = yc + 50 * s, r = 12.5 * s, d = (0.12 * n + 0.15).toFixed(2);
      o += '<circle class="lamp-light" style="--d:' + d + 's" cx="' + f(x2) + '" cy="' + f(cy) + '" r="' + f(78 * s) + '" fill="url(#hg-glow)"/>' +
        ln([x2, yc], [x2, cy - r - 6 * s], "#8a6420", 1.3 * s, 0.9) +
        '<path d="M' + f(x2 - 6.5 * s) + " " + f(cy - r + 1) + "L" + f(x2 - 3.5 * s) + " " + f(cy - r - 6.5 * s) + "H" + f(x2 + 3.5 * s) + "L" + f(x2 + 6.5 * s) + " " + f(cy - r + 1) + 'Z" fill="#b5872f"/>' +
        '<circle class="lamp-light" style="--d:' + d + 's" cx="' + f(x2) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="#f8e3a8"/>' +
        '<circle cx="' + f(x2 - r * 0.35) + '" cy="' + f(cy - r * 0.35) + '" r="' + f(r * 0.28) + '" fill="#fff" fill-opacity=".55"/>' +
        '<circle cx="' + f(x2) + '" cy="' + f(cy + r + 1.6 * s) + '" r="' + f(2.4 * s) + '" fill="#b5872f"/>';
    });

    return '<svg class="scene__bg" viewBox="0 0 1600 900" aria-hidden="true" focusable="false">' + o + "</svg>";
  }

  function curtainSVG() {
    var folds = "";
    [1176, 1194, 1213, 1232, 1250].forEach(function (x, i) {
      folds += '<path d="M' + x + " 460Q" + (x + (i % 2 ? 5 : -4)) + " 540 " + (x - 2) + ' 619" fill="none" stroke="#000" stroke-opacity=".38" stroke-width="2.2"/>' +
        '<path d="M' + (x + 5) + " 460Q" + (x + 9) + " 540 " + (x + 4) + ' 619" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="2"/>';
    });
    return '<svg class="scene__fg" viewBox="0 0 1600 900" aria-hidden="true" focusable="false">' +
      '<line x1="1100" y1="454" x2="1270" y2="454" stroke="#b5872f" stroke-width="3.5"/>' +
      '<circle cx="1098" cy="454" r="5" fill="#d9a441"/><circle cx="1272" cy="454" r="5" fill="#d9a441"/>' +
      '<g class="curtain"><path d="M1150 456H1264V620H1168Q1158 560 1150 456Z" fill="#5c3550"/>' + folds +
      '<path d="M1150 456Q1158 560 1168 620" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2"/>' +
      '<path d="M1160 560Q1200 572 1264 556" fill="none" stroke="#d9a441" stroke-width="2.6"/>' +
      '<circle cx="1162" cy="562" r="4" fill="#d9a441"/></g></svg>';
  }

  /* ---------- views ---------- */

  /* The photographic hall (assets/hall.js) when WebGL 2 is available; the drawn hall below otherwise. */
  var photo = !!(window.PhotoHall && window.PhotoHall.supported());
  var cameFrom = "";
  function viewPhotoHall() {
    return '<section class="view view--photo" aria-labelledby="hall-title">' +
      '<h1 class="sr-only" id="hall-title" tabindex="-1">' + T(SITE.person.name) + ", " + T(SITE.person.title) + "</h1></section>";
  }

  function viewHall() {
    var P = SITE.person;
    var doors = HALL.map(function (h) {
      var r = roomById[h.to];
      var isWho = h.to === "who";
      var plate = isWho ? t(SITE.who.plate) : t(r.plate);
      var say = isWho ? plate + " " + t(UI.whoSay) : plate + ": " + t(r.line);
      var sr = isWho ? say : say + " " + r.doors.length + t(UI.doorsInside);
      return doorHTML({
        href: "#/" + h.to,
        paint: isWho ? SITE.who.paint : r.paint,
        next: isWho ? "#f3ebd7" : r.glimpse,
        glimpse: isWho ? glimpseWho() : glimpseRoom(r),
        plate: esc(plate),
        sr: esc(sr),
        cls: isWho ? "door--who" : "",
        arch: (h.w / 2 / h.h * 100).toFixed(1) + "%",
        attrs: ' data-say="' + esc(say) + '"',
        style: "left:" + (h.x / 16) + "%;top:" + (h.y / 9) + "%;width:" + (h.w / 16) + "%;height:" + (h.h / 9) + "%;"
      });
    }).join("");

    var gardenSay = t(SITE.garden.plate) + ": " + t(UI.gardenSay);
    var tiny = doorHTML({
      href: "#/garden",
      paint: "#6f9a55",
      next: "#cfe5b8",
      glimpse: glimpseGarden(),
      plate: T(SITE.garden.plate),
      sr: esc(gardenSay),
      cls: "door--tiny",
      arch: "32.7%",
      attrs: ' data-say="' + esc(gardenSay) + '"',
      style: "left:" + (TINY.x / 16) + "%;top:" + (TINY.y / 9) + "%;width:" + (TINY.w / 16) + "%;height:" + (TINY.h / 9) + "%;--ring:.25cqw;"
    });

    var sign = '<span class="sign__name">' + T(P.name) + '</span><span class="sign__title">' + T(P.title) + '</span><span class="sign__focus">' + T(P.focus) + "</span>";

    var rows = HALL.map(function (h) {
      var r = roomById[h.to], isWho = h.to === "who";
      var d = doorHTML({ paint: isWho ? SITE.who.paint : r.paint, next: isWho ? "#f3ebd7" : r.glimpse, glimpse: isWho ? glimpseWho() : glimpseRoom(r), cls: "door--static", arch: "28%" });
      return '<li><a class="corridor__row" href="#/' + h.to + '" data-door>' + d + '<span><span class="corridor__name">' + T(isWho ? SITE.who.plate : r.plate) +
        '</span><span class="corridor__line">' + T(isWho ? UI.whoSay : r.line) + "</span></span></a></li>";
    }).join("");
    rows += '<li><a class="corridor__row corridor__row--tiny" href="#/garden" data-door>' +
      doorHTML({ paint: "#6f9a55", next: "#cfe5b8", glimpse: glimpseGarden(), cls: "door--static", arch: "32%" }) +
      '<span><span class="corridor__name">' + T(SITE.garden.plate) + '</span><span class="corridor__line">' + T(UI.gardenSay) + "</span></span></a></li>";

    return '<section class="view view--hall" aria-labelledby="hall-title">' +
      '<div class="scene">' + hallSVG() +
      '<h1 class="sign" id="hall-title" tabindex="-1">' + sign + "</h1>" +
      doors + tiny +
      '<a class="key" href="#/doors" data-say="' + T(UI.keyLine) + '" aria-label="' + T(UI.keyTitle) + '">' + keySVG() + "</a>" +
      '<p class="hall-label" id="hall-label">' + T(UI.takeKey) + "</p>" +
      curtainSVG() + "</div>" +
      '<div class="corridor"><div class="corridor__sign"><h1 class="sign" tabindex="-1">' + sign + "</h1></div>" +
      '<a class="corridor__key" href="#/doors">' + keySVG() + '<span><span class="corridor__name">' + T(UI.keyTitle) + '</span><span class="corridor__line">' + T(UI.keyLine) + "</span></span></a>" +
      '<ul class="corridor__list">' + rows + "</ul></div>" +
      "</section>";
  }

  function viewRoom(room) {
    var cells = "", caps = "";
    room.doors.forEach(function (d, i) {
      var locked = d.kind === "case";
      var href = "#/" + room.id + "/" + d.id;
      var kind = t(locked ? UI.lockedCase : UI.liveDemo);
      cells += '<div class="wall__cell" style="--i:' + (i + 1) + '">' + doorHTML({
        href: href,
        paint: d.paint,
        next: locked ? "#140d0b" : "#f4e3b8",
        glimpse: locked ? "" : '<img src="' + d.image + '-sm.jpg" alt="" loading="lazy" decoding="async" style="object-position:' + (d.focus || "50% 50%") + '">',
        windowImg: locked ? null : d.image + "-sm.jpg",
        focus: d.focus,
        lock: locked,
        plate: T(d.plate),
        sr: esc(t(d.title) + ". " + kind + "."),
        cls: "door--static" + (locked ? " door--locked" : ""),
        arch: "25%"
      }) + "</div>";
      caps += '<div class="wall__caption" style="--i:' + (i + 1) + '"><a href="' + href + '"><span class="wall__title">' + T(d.title) + "</span></a>" +
        '<span class="wall__kind">' + esc(kind) + '</span><p class="wall__lede">' + T(d.lede) + "</p></div>";
    });
    return '<section class="view" aria-labelledby="room-title">' +
      '<div class="frame" style="--paint:' + room.paint + ";--wall:" + room.wall + '">' +
      keystone("#/", t(UI.hall)) +
      '<header class="room-head"><h1 id="room-title" tabindex="-1">' + T(room.title) + "</h1><p>" + T(room.line) + "</p></header>" +
      '<div class="wall" style="--n:' + room.doors.length + '">' + cells + '<div class="wall__floor" aria-hidden="true"></div>' + caps + "</div>" +
      "</div></section>";
  }

  function pmr(d) {
    return '<div class="pmr">' + ["problem", "method", "result"].map(function (k) {
      return "<section><h2>" + T(UI[k]) + "</h2><p>" + T(d[k]) + "</p></section>";
    }).join("") + "</div>";
  }
  function tags(d) {
    return d.tags && d.tags.length ? '<ul class="tags" aria-label="Tags">' + d.tags.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "";
  }

  function viewDoor(room, d) {
    var inner = shade(room.wall, -0.22);
    var head = keystone("#/", t(UI.hall));
    var body;

    if (d.kind === "case") {
      var nextDemo = d.next ? findById(d.next) : null;
      var acts = "";
      if (nextDemo) acts += '<a class="btn btn--brass" href="#/' + nextDemo.room.id + "/" + nextDemo.door.id + '">' + T(UI.nextDoor) + ": " + T(nextDemo.door.plate) + "</a>";
      if (d.archive) acts += '<a class="btn" href="' + esc(d.archive) + '" target="_blank" rel="noopener">' + T(UI.materials) + extIcon() + "</a>";
      body = '<article class="plate-view">' +
        '<figure class="locked-door">' + doorHTML({ paint: d.paint, next: "#140d0b", lock: true, cls: "door--static door--locked", arch: "25%" }) +
        "<figcaption>" + T(UI.lockedNote) + "</figcaption></figure>" +
        '<div class="plate-text"><h1 tabindex="-1">' + T(d.title) + "</h1>" +
        (d.context ? '<p class="context">' + T(d.context) + "</p>" : "") +
        '<p class="lede">' + T(d.lede) + "</p>" +
        pmr(d) + tags(d) +
        (acts ? '<div class="actions">' + acts + "</div>" : "") +
        "</div></article>";
    } else {
      var facts = "";
      if (d.data) facts += "<li>" + T(d.data) + "</li>";
      if (d.repo) facts += '<li data-updated="' + esc(d.repo) + '" data-fallback="' + esc(d.updated || "") + '">' + T(UI.updated) + esc(fmtDate(d.updated)) + "</li>";
      if (d.weight) facts += "<li>" + T(d.weight) + "</li>";
      var more = "";
      if (d.more && d.more.length) {
        more = '<nav class="more" aria-label="' + T(UI.moreDoors) + '"><h2>' + T(UI.moreDoors) + "</h2><ul>" + d.more.map(function (m) {
          return '<li><a href="' + esc(m.url) + '" target="_blank" rel="noopener"><i class="mini-arch" style="--p:' + d.paint + '"></i><span>' + T(m.label) + "</span></a></li>";
        }).join("") + "</ul></nav>";
      }
      var lockedTwin = null;
      SITE.rooms.forEach(function (r) { r.doors.forEach(function (x) { if (x.kind === "case" && x.next === d.id) lockedTwin = { room: r, door: x }; }); });
      if (lockedTwin) {
        more += '<nav class="more" aria-label="' + T(UI.behindLocked) + '"><h2>' + T(UI.behindLocked) + '</h2><ul><li><a href="#/' + lockedTwin.room.id + "/" + lockedTwin.door.id + '"><i class="mini-arch" style="--p:' + lockedTwin.door.paint + '"></i><span>' + T(lockedTwin.door.title) + "</span></a></li></ul></nav>";
      }
      body = '<article class="plate-view">' +
        '<div class="preview-wrap"><div class="preview">' +
        '<img src="' + d.image + '.jpg" width="1280" height="800" alt="' + T(UI.screenshot) + T(d.title) + '" decoding="async">' +
        '<button class="peek" type="button" data-peek>' + escutcheonSVG() + "<span>" + T(UI.peek) + "</span></button>" +
        "</div>" +
        '<div class="preview-tools" data-peek-tools hidden><button type="button" data-wide>' + T(UI.bigger) + '</button><button type="button" data-close>' + T(UI.closeDemo) + "</button></div>" +
        "</div>" +
        '<div class="plate-text"><h1 tabindex="-1">' + T(d.title) + "</h1>" +
        (d.context ? '<p class="context">' + T(d.context) + "</p>" : "") +
        '<p class="lede">' + T(d.lede) + "</p>" +
        (facts ? '<ul class="facts">' + facts + "</ul>" : "") +
        '<div class="actions"><a class="btn btn--brass" href="' + esc(d.demo) + '" target="_blank" rel="noopener">' + T(UI.openDemo) + extIcon() + "</a>" +
        (d.repo ? '<a class="btn" href="https://github.com/' + user + "/" + encodeURIComponent(d.repo) + '" target="_blank" rel="noopener">' + T(UI.source) + "</a>" : "") + "</div>" +
        pmr(d) + tags(d) + more +
        "</div></article>";
    }

    return '<section class="view">' +
      '<div class="frame" style="--paint:' + room.paint + ";--wall:" + room.wall + '">' + head +
      '<div class="frame" style="--paint:' + d.paint + ";--wall:" + inner + '">' + keystone("#/" + room.id, t(room.plate)) + body + "</div>" +
      "</div></section>";
  }

  function specimenSVG() {
    return '<svg viewBox="-120 -120 240 240" role="img" aria-label="' + T(UI.specimenAlt) + '">' +
      "<defs>" +
      '<pattern id="sp-hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><line x1="0" y1="0" x2="0" y2="3.2" stroke="#26241f" stroke-width=".7" stroke-opacity=".5"/></pattern>' +
      '<pattern id="sp-cross" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><path d="M0 0V2.6M0 0H2.6" stroke="#26241f" stroke-width=".6" stroke-opacity=".75"/></pattern>' +
      "</defs>" +
      '<circle class="sp-ring" r="113"/>' +
      '<path class="sp-body" fill="url(#sp-hatch)"/><path class="sp-line"/>' +
      '<ellipse class="sp-nucleus" rx="11" ry="8.5"/>' +
      '<circle class="sp-vac" r="4.2"/><circle class="sp-vac" r="3.2"/><circle class="sp-vac" r="2.5"/>' +
      "</svg>";
  }

  function viewWho() {
    var W = SITE.who, P = SITE.person;
    var skills = W.skills.map(function (s) { return "<div><dt>" + T(s.k) + "</dt><dd>" + T(s.v) + "</dd></div>"; }).join("");
    var path = W.path.map(function (p) { return "<li><span>" + esc(p.when) + "</span>" + T(p.what) + "</li>"; }).join("");
    return '<section class="view view--light">' +
      '<div class="frame" style="--paint:' + W.paint + ";--wall:" + W.wall + '">' + keystone("#/", t(UI.hall)) +
      '<div class="who">' +
      '<figure class="specimen" data-specimen>' + specimenSVG() +
      '<p class="specimen__status" data-status>' + T(UI.watching) + "</p>" +
      "<figcaption><b>" + T(W.story.title) + "</b><p>" + T(W.story.text) + "</p></figcaption></figure>" +
      '<div class="who-text">' +
      '<h1 class="quote" tabindex="-1">' + T(W.question) + "</h1>" +
      '<p class="sub">' + T(P.name) + " " + T(P.altName) + "<br>" + T(P.title) + "</p>" +
      '<div class="bio">' + W.bio.map(function (b) { return "<p>" + T(b) + "</p>"; }).join("") + "</div>" +
      '<p class="open-to">' + T(W.openTo) + "</p>" +
      '<div class="actions">' +
      '<a class="btn btn--brass" href="' + esc(P.cv.en) + '" target="_blank" rel="noopener" lang="en">' + T(UI.cvEn) + "</a>" +
      '<a class="btn btn--brass" href="' + esc(P.cv.zh) + '" target="_blank" rel="noopener" lang="zh-Hant">' + T(UI.cvZh) + "</a></div>" +
      '<div class="actions">' +
      '<a class="btn" href="mailto:' + esc(P.email) + '">' + T(UI.email) + "</a>" +
      '<a class="btn" href="' + esc(P.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>' +
      '<a class="btn" href="' + esc(P.github) + '" target="_blank" rel="noopener">GitHub</a></div>' +
      "</div></div>" +
      '<div class="who-lower"><section><h2>' + T(UI.methods) + '</h2><dl class="skills">' + skills + "</dl></section>" +
      "<section><h2>" + T(UI.path) + '</h2><ol class="path">' + path + "</ol></section></div>" +
      "</div></section>";
  }

  function viewGarden() {
    var G = SITE.garden;
    var beds = G.archives.map(function (a) {
      return '<li><a href="' + esc(a.url) + '" target="_blank" rel="noopener"><b>' + T(a.title) + "</b><span>" + T(a.note) + "</span></a></li>";
    }).join("");
    return '<section class="view view--light" style="--accent:#2e5a35">' +
      '<div class="frame" style="--paint:' + G.paint + ";--wall:" + G.wall + '">' + keystone("#/", t(UI.hall)) +
      '<div class="garden"><header class="room-head"><h1 tabindex="-1">' + T(G.title) + "</h1><p>" + T(G.line) + "</p></header>" +
      "<h2>" + T(UI.workingMaterials) + '</h2><ul class="beds">' + beds + "</ul>" +
      "<h2>" + T(UI.everyRepo) + '</h2><ul class="shelf" data-shelf></ul><p class="shelf-note" data-shelf-note>' + T(UI.shelfLoading) + "</p>" +
      "<h2>" + T(UI.thisSite) + "</h2><p>" + T(UI.thisSiteText) + '<a href="https://github.com/' + user + "/" + esc(SITE.person.siteRepo) + '" target="_blank" rel="noopener">' + T(UI.ownRepo) + "</a>" + (lang === "zh" ? "。" : ".") + "</p>" +
      "</div></div></section>";
  }

  function viewIndex() {
    var P = SITE.person;
    var cols = SITE.rooms.map(function (r) {
      var items = r.doors.map(function (d) {
        var href = "#/" + r.id + "/" + d.id;
        var links = d.kind === "case"
          ? '<a href="' + href + '">' + T(UI.readPlaque) + "</a>"
          : '<a href="' + esc(d.demo) + '" target="_blank" rel="noopener">' + T(UI.openDemo) + '</a><a href="https://github.com/' + user + "/" + encodeURIComponent(d.repo) + '" target="_blank" rel="noopener">' + T(UI.sourceShort) + "</a>";
        return '<li><a href="' + href + '">' + T(d.title) + '</a><span class="kind">' + T(d.kind === "case" ? UI.lockedCase : UI.liveDemo) + "</span><p>" + T(d.lede) + '</p><div class="index-links">' + links + "</div></li>";
      }).join("");
      return '<section class="index-col"><h2><i class="mini-arch" style="--p:' + r.paint + '"></i><a href="#/' + r.id + '">' + T(r.title) + "</a></h2><ul>" + items + "</ul></section>";
    }).join("");
    cols += '<section class="index-col"><h2><i class="mini-arch" style="--p:' + SITE.who.paint + '"></i><a href="#/who">' + T(SITE.who.plate) + "</a></h2><ul>" +
      '<li><a href="#/who">' + T(UI.aboutLink) + "</a><p>" + T(SITE.who.openTo) + '</p><div class="index-links">' +
      '<a href="' + esc(P.cv.en) + '" target="_blank" rel="noopener">' + T(UI.cvEn) + '</a><a href="' + esc(P.cv.zh) + '" target="_blank" rel="noopener">' + T(UI.cvZh) + "</a>" +
      '<a href="mailto:' + esc(P.email) + '">' + T(UI.email) + '</a><a href="' + esc(P.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a></div></li>' +
      '<li><a href="#/garden">' + T(SITE.garden.title) + "</a><p>" + T(UI.gardenSay) + "</p></li>" +
      '<li><a href="' + studyHref() + '">' + T(UI.studyTitle) + "</a><p>" + T(UI.studySay) + "</p></li></ul></section>";
    return '<section class="view">' +
      '<div class="frame" style="--paint:#d9a441;--wall:#1f3a33">' + keystone("#/", t(UI.hall)) +
      '<div class="index"><header class="room-head"><h1 tabindex="-1">' + T(UI.keyTitle) + "</h1><p>" + T(UI.keyLine) + "</p></header>" +
      '<div class="index-grid">' + cols + "</div></div></div></section>";
  }

  /* ---------- behaviour after a view is in place ---------- */

  function mountHall(v) {
    var label = v.querySelector("#hall-label");
    var timer = 0, base = t(UI.takeKey);
    function say(txt) { clearTimeout(timer); if (label) label.textContent = txt; }
    function later(ms) { clearTimeout(timer); timer = setTimeout(function () { if (label) label.textContent = base; }, ms); }
    v.querySelectorAll(".scene [data-say]").forEach(function (el) {
      var txt = el.getAttribute("data-say");
      el.addEventListener("mouseenter", function () { say(txt); });
      el.addEventListener("focus", function () { say(txt); });
      el.addEventListener("mouseleave", function () { later(260); });
      el.addEventListener("blur", function () { later(260); });
    });
    v.querySelectorAll(".side-door").forEach(function (g) {
      g.addEventListener("click", function () {
        g.classList.remove("is-rattling");
        g.getBoundingClientRect();
        g.classList.add("is-rattling");
        say(t(UI.lockedSide));
        later(2800);
      });
    });
    return function () { clearTimeout(timer); };
  }

  function mountPeek(v, room, d) {
    var btn = v.querySelector("[data-peek]");
    if (!btn) return null;
    var preview = v.querySelector(".preview");
    var tools = v.querySelector("[data-peek-tools]");
    var plate = v.querySelector(".plate-view");
    var wide = tools.querySelector("[data-wide]");
    var close = tools.querySelector("[data-close]");
    btn.addEventListener("click", function () {
      if (preview.classList.contains("is-live")) return;
      var f = document.createElement("iframe");
      f.src = d.demo;
      f.title = t(UI.liveDemo) + ": " + t(d.title);
      f.setAttribute("allowfullscreen", "");
      f.style.opacity = "0";
      f.style.transition = "opacity .4s ease";
      f.addEventListener("load", function () { f.style.opacity = "1"; });
      preview.appendChild(f);
      preview.classList.add("is-live");
      tools.hidden = false;
      if (!reduce.matches && preview.animate) {
        var iris = document.createElement("div");
        iris.className = "iris";
        iris.innerHTML = irisSVG(shade(room.wall, -0.22));
        preview.appendChild(iris);
        /* Hold on the keyhole for a moment, then open it until it swallows the frame. */
        var an = iris.animate(
          [
            { transform: "scale(1)", opacity: 0 },
            { transform: "scale(1)", opacity: 1, offset: 0.1 },
            { transform: "scale(1)", opacity: 1, offset: 0.42 },
            { transform: "scale(2.4)", opacity: 1, offset: 0.62 },
            { transform: "scale(26)", opacity: 1 }
          ],
          { duration: 1600, easing: "ease-in", fill: "forwards" }
        );
        an.onfinish = function () { iris.remove(); };
      }
      wide.focus({ preventScroll: true });
    });
    wide.addEventListener("click", function () {
      var on = plate.classList.toggle("is-wide");
      wide.textContent = t(on ? UI.smaller : UI.bigger);
      preview.scrollIntoView({ block: "nearest", behavior: reduce.matches ? "auto" : "smooth" });
    });
    close.addEventListener("click", function () {
      var f = preview.querySelector("iframe");
      if (f) f.remove();
      preview.classList.remove("is-live");
      plate.classList.remove("is-wide");
      wide.textContent = t(UI.bigger);
      tools.hidden = true;
      btn.focus();
    });
    return null;
  }

  function mountSpecimen(v) {
    var fig = v.querySelector("[data-specimen]");
    if (!fig) return null;
    var body = fig.querySelector(".sp-body"), line = fig.querySelector(".sp-line");
    var nuc = fig.querySelector(".sp-nucleus"), vac = fig.querySelectorAll(".sp-vac");
    var status = fig.querySelector("[data-status]");
    var R = 60;
    var VAC = [[0.45, 2.2], [0.5, 4.1], [0.62, 0.9]];

    function radius(a, tm, w) {
      var wob = 0.06 * Math.sin(3 * a + tm * 1.3) + 0.045 * Math.cos(2 * a - tm * 0.9) + 0.03 * Math.sin(5 * a + tm * 2.1);
      return R * (1 + wob + w.star * 0.42 * Math.cos(5 * a + 0.5) + w.stick * 0.62 * Math.cos(2 * (a - 0.7)));
    }
    function draw(tm, w, dx) {
      var d = "";
      for (var i = 0; i <= 150; i++) {
        var a = i / 150 * Math.PI * 2, r = radius(a, tm, w);
        d += (i ? "L" : "M") + (dx + r * Math.cos(a)).toFixed(2) + " " + (r * Math.sin(a)).toFixed(2);
      }
      return d + "Z";
    }
    function place(tm, w) {
      var na = 0.3 + tm * 0.2, nr = radius(na, tm, w) * 0.18;
      nuc.setAttribute("cx", (nr * Math.cos(na)).toFixed(2));
      nuc.setAttribute("cy", (nr * Math.sin(na)).toFixed(2));
      VAC.forEach(function (p, i) {
        var a = p[1] + Math.sin(tm * 0.6 + i) * 0.25, r = radius(a, tm, w) * p[0];
        vac[i].setAttribute("cx", (r * Math.cos(a)).toFixed(2));
        vac[i].setAttribute("cy", (r * Math.sin(a)).toFixed(2));
      });
    }

    if (reduce.matches) {
      /* Still version: three figures side by side instead of one moving shape. */
      var svg = fig.querySelector("svg");
      svg.setAttribute("viewBox", "-120 -120 720 240");
      var g = "";
      [[0, { blob: 1, star: 0, stick: 0 }], [240, { blob: 0.35, star: 0.65, stick: 0 }], [480, { blob: 0.35, star: 0, stick: 0.65 }]].forEach(function (p, i) {
        var dpath = draw(1, p[1], p[0]);
        g += '<path d="' + dpath + '" fill="url(#sp-hatch)"/><path class="sp-line" d="' + dpath + '"/>' +
          (i ? '<circle cx="' + p[0] + '" r="113" fill="none" stroke="#9a2f2a" stroke-width="2.2"/>' : '<circle class="sp-ring" cx="0" r="113"/>');
      });
      svg.innerHTML = svg.querySelector("defs").outerHTML + g;
      status.textContent = t(UI.stillFig);
      return null;
    }

    /* Start half-way through a calm phase, so the first thing you see is the usual shape. */
    var seq = ["blob", "star", "blob", "stick"], per = 3.2, start = performance.now() - per * 550, raf = 0, lastMsg = "", seen = false;
    function frame(now) {
      var tm = (now - start) / 1000;
      var k = Math.floor(tm / per) % 4, f = (tm % per) / per;
      var tg = seq[k], pv = seq[(k + 3) % 4];
      var s = Math.min(1, f / 0.45), e = s * s * (3 - 2 * s);
      var w = { blob: 0, star: 0, stick: 0 };
      w[tg] += e; w[pv] += 1 - e;
      var d = draw(tm, w, 0);
      body.setAttribute("d", d);
      line.setAttribute("d", d);
      place(tm, w);
      var alert = tg !== "blob" && f > 0.05;
      if (alert) seen = true;
      fig.classList.toggle("is-alert", alert);
      var msg = alert ? t(UI.caught) + t(tg === "star" ? UI.starfish : UI.stick)
        : (seen && pv !== "blob" && f > 0.05 ? t(UI.baseline) : (lastMsg || t(UI.watching)));
      if (msg !== lastMsg) { status.textContent = msg; lastMsg = msg; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelAnimationFrame(raf); };
  }

  /* ---------- live data from GitHub ---------- */

  var repos = { list: null, failed: false };
  var GH_KEY = "hall-of-doors-repos-v1";

  function loadRepos() {
    try {
      var c = JSON.parse(sessionStorage.getItem(GH_KEY) || "null");
      if (c && Date.now() - c.t < 3600e3 && Array.isArray(c.d)) { repos.list = c.d; refreshLive(); return; }
    } catch (e) {}
    if (!window.fetch) { repos.failed = true; refreshLive(); return; }
    fetch("https://api.github.com/users/" + encodeURIComponent(user) + "/repos?per_page=100&sort=pushed", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        repos.list = data.filter(function (x) { return !x.fork; }).map(function (x) {
          return { name: x.name, desc: x.description, lang: x.language, pushed: x.pushed_at };
        });
        try { sessionStorage.setItem(GH_KEY, JSON.stringify({ t: Date.now(), d: repos.list })); } catch (e) {}
        refreshLive();
      })
      .catch(function () { repos.failed = true; refreshLive(); });
  }

  function repoInfo(name) {
    if (!repos.list) return null;
    var n = String(name).toLowerCase();
    for (var i = 0; i < repos.list.length; i++) if (repos.list[i].name.toLowerCase() === n) return repos.list[i];
    return null;
  }

  function refreshLive() {
    var v = stage.firstElementChild;
    if (!v) return;
    v.querySelectorAll("[data-updated]").forEach(function (el) {
      var info = repoInfo(el.getAttribute("data-updated"));
      var when = info && info.pushed ? info.pushed : el.getAttribute("data-fallback");
      if (when) el.textContent = t(UI.updated) + fmtDate(when);
    });
    fillShelf(v);
  }

  function fillShelf(v) {
    var ul = v.querySelector("[data-shelf]"), note = v.querySelector("[data-shelf-note]");
    if (!ul) return;
    var byRepo = {};
    SITE.rooms.forEach(function (r) { r.doors.forEach(function (d) { if (d.repo) byRepo[d.repo.toLowerCase()] = { room: r, door: d }; }); });
    var live = !!repos.list;
    var list = live ? repos.list.slice() : Object.keys(byRepo).map(function (k) {
      var x = byRepo[k];
      return { name: x.door.repo, desc: null, lang: null, pushed: x.door.updated };
    });
    list = list.filter(function (x) { return x.name.toLowerCase() !== String(SITE.person.siteRepo).toLowerCase(); });
    ul.innerHTML = list.map(function (x) {
      var hit = byRepo[x.name.toLowerCase()];
      var desc = hit ? t(hit.door.lede) : (x.desc || "");
      var meta = [x.lang, x.pushed ? fmtDate(x.pushed) : ""].filter(Boolean).join(", ");
      return '<li><a href="https://github.com/' + user + "/" + encodeURIComponent(x.name) + '" target="_blank" rel="noopener">' + esc(x.name) + "</a>" +
        "<small>" + esc(meta) + "</small>" + (desc ? "<p>" + esc(desc) + "</p>" : "") +
        (hit ? '<a class="door-link" href="#/' + hit.room.id + "/" + hit.door.id + '">' + T(UI.hasDoor) + T(hit.room.plate) + "</a>" : "") + "</li>";
    }).join("");
    if (note) note.textContent = live ? t(UI.shelfLive) : (repos.failed ? t(UI.shelfFallback) : t(UI.shelfLoading));
  }

  /* ---------- rendering and moving between rooms ---------- */

  var route = parse(location.hash);
  var cleanup = null;
  var moving = false, queued = null, origin = null;

  function titleFor(r) {
    var name = t(SITE.person.name);
    if (r.name === "room") return t(roomById[r.room].title) + " | " + name;
    if (r.name === "door") return t(findDoor(r.room, r.door).title) + " | " + name;
    if (r.name === "who") return t(SITE.who.plate) + " | " + name;
    if (r.name === "garden") return t(SITE.garden.title) + " | " + name;
    if (r.name === "index") return t(UI.keyTitle) + " | " + name;
    return name + " | " + t(SITE.person.title);
  }

  function render(r) {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    var html;
    if (r.name === "room") html = viewRoom(roomById[r.room]);
    else if (r.name === "door") html = viewDoor(roomById[r.room], findDoor(r.room, r.door));
    else if (r.name === "who") html = viewWho();
    else if (r.name === "garden") html = viewGarden();
    else if (r.name === "index") html = viewIndex();
    else html = photo ? viewPhotoHall() : viewHall();
    stage.innerHTML = html;
    document.title = titleFor(r);
    var v = stage.firstElementChild;
    var fns = [];
    if (r.name === "hall") {
      if (photo) {
        var from = cameFrom; cameFrom = "";
        fns.push(window.PhotoHall.mount({ root: v, lang: lang, from: from, navigate: function (h) { location.hash = h; } }));
      } else fns.push(mountHall(v));
    }
    if (r.name === "door") fns.push(mountPeek(v, roomById[r.room], findDoor(r.room, r.door)));
    if (r.name === "who") fns.push(mountSpecimen(v));
    cleanup = function () { fns.forEach(function (fn) { if (fn) fn(); }); };
    refreshLive();
  }

  function focusView(v) {
    var h = v && (v.querySelector(".scene h1, .frame h1") || v.querySelector("h1"));
    if (h && h.offsetParent === null) {
      var all = v.querySelectorAll("h1");
      for (var i = 0; i < all.length; i++) if (all[i].offsetParent !== null) { h = all[i]; break; }
    }
    if (h) { if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  function go(next) {
    if (moving) { queued = next; return; }
    if (next.unknown) { try { history.replaceState(null, "", location.pathname + location.search + "#/"); } catch (e) {} }
    if (next.key === route.key && stage.firstElementChild) return;
    moving = true;
    var prev = route;
    var deeper = next.depth > prev.depth || (next.depth === prev.depth && !!origin);
    var old = stage.firstElementChild;
    var motion = !reduce.matches && old && old.animate;
    var o = origin;
    origin = null;

    function enter() {
      cameFrom = prev.key;
      route = next;
      render(next);
      window.scrollTo(0, 0);
      var nu = stage.firstElementChild;
      if (motion && nu) {
        nu.animate([{ transform: deeper ? "scale(.94)" : "scale(1.07)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
          { duration: 360, easing: "cubic-bezier(.2,.7,.25,1)" });
      }
      focusView(nu);
      moving = false;
      if (queued) { var q = queued; queued = null; if (q.key !== route.key) go(q); }
    }

    if (motion) {
      old.style.transformOrigin = o ? o.x + "px " + o.y + "px" : "50% 30%";
      var an = old.animate([{ transform: "scale(1)", opacity: 1 }, { transform: deeper ? "scale(1.8)" : "scale(.9)", opacity: 0 }],
        { duration: deeper ? 360 : 260, easing: "cubic-bezier(.55,0,.8,.2)", fill: "forwards" });
      an.onfinish = enter;
      an.oncancel = enter;
    } else {
      enter();
    }
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-door]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (moving) return;
    var door = a.classList.contains("door") ? a : a.querySelector(".door");
    var v = stage.firstElementChild;
    if (door && v) {
      var r = door.getBoundingClientRect(), vr = v.getBoundingClientRect();
      origin = { x: r.left + r.width / 2 - vr.left, y: r.top + r.height / 2 - vr.top };
    }
    var target = a.getAttribute("href");
    var finish = function () { if (location.hash === target) go(parse(target)); else location.hash = target; };
    if (reduce.matches || !door) { finish(); return; }
    var locked = door.classList.contains("door--locked");
    door.classList.add(locked ? "is-rattling" : "is-open");
    setTimeout(finish, locked ? 400 : 440);
  });

  window.addEventListener("hashchange", function () { go(parse(location.hash)); });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    var up = parentKey(route);
    if (up) { e.preventDefault(); location.hash = up; }
  });

  /* ---------- top bar ---------- */

  function updateBar() {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (UI[k]) el.textContent = t(UI[k]);
    });
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    var cv = document.getElementById("cv-link");
    if (cv) cv.href = SITE.person.cv[lang];
    var study = document.querySelector(".bar__link--study");
    if (study) study.href = studyHref();
    var group = document.querySelector(".lang");
    if (group) group.setAttribute("aria-label", t(UI.language));
    var nav = document.querySelector(".bar__nav");
    if (nav) nav.setAttribute("aria-label", t(UI.site));
  }

  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      var l = b.getAttribute("data-lang");
      if (l === lang) return;
      lang = l;
      try { localStorage.setItem(LS_KEY, lang); } catch (e) {}
      updateBar();
      var y = window.scrollY;
      render(route);
      window.scrollTo(0, y);
    });
  });

  /* ---------- start ---------- */

  if (route.unknown) { try { history.replaceState(null, "", location.pathname + location.search + "#/"); } catch (e) {} }
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  updateBar();
  render(route);
  if (route.name === "hall" && !reduce.matches) {
    var scene = stage.querySelector(".scene");
    if (scene) {
      scene.classList.add("is-lighting");
      setTimeout(function () { scene.classList.remove("is-lighting"); }, 2600);
    }
  }
  loadRepos();
})();
