/* Yujie Li — homepage v2 interactions (no dependencies) */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };

  var mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  addEventListener("pointermove", function (e) {
    if (!mouse.active && cursor) { cursor.classList.remove("is-hidden"); cur.x = e.clientX; cur.y = e.clientY; }
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", function () { mouse.active = false; });

  /* ---------- Beijing clock ---------- */
  var clock = document.getElementById("clock");
  if (clock) {
    var fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- Hero name: split, fit to width, proximity weight ---------- */
  var line = document.querySelector("[data-fit]");
  var chars = [];
  if (line) {
    var text = line.textContent;
    line.textContent = "";
    Array.prototype.forEach.call(text, function (c, i) {
      var s = document.createElement("span");
      s.className = "ch";
      s.style.setProperty("--i", i);
      s.textContent = c === " " ? " " : c;
      s.setAttribute("aria-hidden", "true");
      line.appendChild(s);
      chars.push({ el: s, w: 800, d: 100 });
    });

  }

  /* ---------- Big display lines fill the content width ---------- */
  var fitEls = Array.prototype.slice.call(document.querySelectorAll("[data-fit], [data-fit-width]"));
  function fitWidth(el) {
    var avail = el.parentElement.clientWidth;
    el.style.fontSize = "100px";
    var w = el.getBoundingClientRect().width;
    if (w > 0) el.style.fontSize = (100 * avail / w * 0.995).toFixed(2) + "px";
  }
  function fitAll() { fitEls.forEach(fitWidth); }
  fitAll();
  // Refit once Archivo is in: a fallback font has different widths.
  if (document.fonts && document.fonts.load) document.fonts.load('800 100px "Archivo"').then(fitAll, fitAll);
  addEventListener("resize", fitAll);

  var heroActive = finePointer && !reduceMotion && chars.length;
  function updateName() {
    if (!heroActive) return;
    var r = line.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var cr = c.el.getBoundingClientRect();
      var cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
      var dist = Math.hypot(mouse.x - cx, (mouse.y - cy) * 1.4);
      var f = mouse.active ? clamp(1 - dist / (r.height * 1.6), 0, 1) : 0;
      f = f * f * (3 - 2 * f);
      c.w = lerp(c.w, 800 - f * 640, 0.12);
      c.d = lerp(c.d, 100 - f * 34, 0.12);
      c.el.style.fontVariationSettings = '"wght" ' + c.w.toFixed(1) + ', "wdth" ' + c.d.toFixed(1);
    }
  }

  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add("is-loaded"); });
  });

  /* ---------- Statement: words light up with scroll ---------- */
  var statement = document.querySelector("[data-words]");
  var words = [];
  if (statement) {
    var walker = document.createTreeWalker(statement, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement("span");
        s.className = "w";
        s.textContent = part;
        frag.appendChild(s);
        words.push(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  var litCount = -1;
  function updateWords() {
    if (!words.length) return;
    var r = statement.getBoundingClientRect();
    var p = clamp((innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.25), 0, 1);
    var n = Math.round(p * words.length);
    if (n === litCount) return;
    litCount = n;
    for (var i = 0; i < words.length; i++) words[i].classList.toggle("is-lit", i < n);
  }

  /* ---------- Marquee: driven by scroll, still when idle ---------- */
  var track = document.querySelector(".marquee__track");
  var marqueeX = 0, lastY = scrollY;
  function updateMarquee() {
    var dy = scrollY - lastY;
    lastY = scrollY;
    if (!track || reduceMotion || !dy) return;
    var half = track.scrollWidth / 2;
    marqueeX = (marqueeX - dy * 0.6) % half;
    if (marqueeX > 0) marqueeX -= half;
    track.style.transform = "translate3d(" + marqueeX.toFixed(1) + "px,0,0)";
  }

  /* ---------- Cursor + floating paper preview ---------- */
  var cursor = document.querySelector(".cursor");
  var cursorLabel = cursor && cursor.querySelector(".cursor__label");
  var preview = document.querySelector(".preview");
  var previewInner = preview && preview.querySelector(".preview__inner");
  var cur = { x: mouse.x, y: mouse.y }, pv = { x: mouse.x, y: mouse.y, r: 0 };
  var showPreview = false;

  if (finePointer) {
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest("[data-cursor]");
      cursor.classList.toggle("is-active", !!t);
      if (t) cursorLabel.textContent = t.getAttribute("data-cursor");
    });
    document.addEventListener("pointerleave", function () { cursor.classList.add("is-hidden"); });
    document.addEventListener("pointerenter", function () { if (mouse.active) cursor.classList.remove("is-hidden"); });

    if (!reduceMotion) {
      Array.prototype.forEach.call(document.querySelectorAll(".pub[data-img]"), function (pub) {
        var img = pub.getAttribute("data-img");
        if (!img) return;
        pub.addEventListener("pointerenter", function () {
          previewInner.style.backgroundImage = "url('" + img + "')";
          showPreview = true; preview.classList.add("is-visible");
        });
        pub.addEventListener("pointerleave", function () { showPreview = false; preview.classList.remove("is-visible"); });
      });
    }
  }

  function updateCursor() {
    if (!finePointer) return;
    cur.x = lerp(cur.x, mouse.x, 0.35); cur.y = lerp(cur.y, mouse.y, 0.35);
    cursor.style.transform = "translate3d(" + cur.x.toFixed(1) + "px," + cur.y.toFixed(1) + "px,0)";
    if (!preview) return;
    var px = pv.x;
    pv.x = lerp(pv.x, mouse.x + 40, 0.12); pv.y = lerp(pv.y, mouse.y, 0.12);
    pv.r = lerp(pv.r, clamp((pv.x - px) * 0.35, -10, 10), 0.15);
    var s = showPreview ? 1 : 0.85;
    preview.style.transform = "translate3d(" + pv.x.toFixed(1) + "px," + pv.y.toFixed(1) + "px,0) translate(0,-50%) rotate(" + pv.r.toFixed(2) + "deg) scale(" + s + ")";
  }

  /* ---------- Nav: solid after the hero, hides while scrolling down ---------- */
  var nav = document.querySelector(".nav");
  var navY = scrollY;
  function updateNav() {
    var y = scrollY, dy = y - navY;
    if (Math.abs(dy) < 4) return;
    navY = y;
    var menuEl = document.getElementById("menu");
    nav.classList.toggle("is-solid", y > innerHeight * 0.6);
    nav.classList.toggle("is-hidden", (!menuEl || menuEl.hidden) && dy > 0 && y > innerHeight * 0.6);
  }

  /* ---------- Main loop ---------- */
  function frame() {
    updateNav();
    updateName();
    updateWords();
    updateMarquee();
    updateCursor();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- Reveal on enter ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Current section in nav ---------- */
  var navLinks = document.querySelectorAll(".nav__links a");
  if ("IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle("is-current", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id], footer[id]").forEach(function (s) { sio.observe(s); });
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector(".nav__menu");
  var menu = document.getElementById("menu");
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "Close" : "Menu";
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) setMenu(false); });
  }

  /* ---------- News toggle ---------- */
  var newsBtn = document.querySelector("[data-news-toggle]");
  if (newsBtn) {
    newsBtn.addEventListener("click", function () {
      var sec = newsBtn.closest(".news");
      var open = sec.classList.toggle("is-open");
      newsBtn.setAttribute("aria-expanded", String(open));
      sec.querySelectorAll(".is-extra").forEach(function (el) { el.classList.add("is-in"); });
    });
  }

  /* ---------- Copy email ---------- */
  var copyBtn = document.querySelector("[data-copy]");
  var toast = document.querySelector(".toast");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var mail = copyBtn.getAttribute("data-copy");
      var done = function () {
        toast.textContent = "Copied " + mail + " to clipboard";
        clearTimeout(done.t); done.t = setTimeout(function () { toast.textContent = ""; }, 2600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(mail).then(done, function () { location.href = "mailto:" + mail; });
      } else {
        location.href = "mailto:" + mail;
      }
    });
  }

  /* ---------- Citations (Google Scholar, Semantic Scholar fallback) ---------- */
  var cites = document.querySelectorAll(".pub__cite");
  var norm = function (t) { return (t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
  function showCite(a, n) {
    if (typeof n === "number" && n > 0 && a.hidden) { a.textContent = "Cited by " + n; a.hidden = false; }
  }
  function countUp(el, to) {
    if (reduceMotion) { el.textContent = to; return; }
    var t0 = performance.now(), dur = 1400;
    (function step(t) {
      var k = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function fromSemanticScholar() {
    var pending = Array.prototype.filter.call(cites, function (a) { return a.hidden && a.getAttribute("data-s2id"); });
    if (!pending.length) return;
    fetch("https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: pending.map(function (a) { return a.getAttribute("data-s2id"); }) })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (!Array.isArray(data)) return;
      pending.forEach(function (a, i) { if (data[i]) showCite(a, data[i].citationCount); });
    }).catch(function () { /* decorative; fail silently */ });
  }
  if (window.GS_STATS_URL) {
    fetch(window.GS_STATS_URL, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("gs stats unavailable");
      return r.json();
    }).then(function (data) {
      var papers = (data && data.papers) || {};
      cites.forEach(function (a) {
        var p = papers[norm(a.getAttribute("data-gstitle"))];
        if (p) showCite(a, p.citations);
      });
      var box = document.querySelector("[data-stats]");
      if (box && data.total_citations) {
        box.hidden = false;
        countUp(box.querySelector('[data-stat="citations"]'), data.total_citations);
        countUp(box.querySelector('[data-stat="h"]'), data.h_index || 0);
      }
      fromSemanticScholar();
    }).catch(fromSemanticScholar);
  } else {
    fromSemanticScholar();
  }
})();
