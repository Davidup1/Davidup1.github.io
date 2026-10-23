/* Yujie Li — homepage, terminal edition (no dependencies) */
(function () {
  "use strict";

  var T = window.TERM || { papers: [], versions: [], links: {} };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Small DOM builder: el("p", {class: "x"}, "text", childNode, ...). Strings are always text, never HTML.
  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return n;
  }

  var touch = window.matchMedia("(pointer: coarse)").matches;
  if (!isMac) $$("kbd[data-mod]").forEach(function (k) { k.textContent = "Ctrl"; });
  if (touch) {
    var kb = $(".bar__k"); if (kb) kb.textContent = "search";
    var tip = $(".tip");
    if (tip) { tip.textContent = "# tip: tap search, or type a command at the bottom (try "; tip.append(el("code", null, "help"), ")"); }
  }

  /* ---------- Clock ---------- */
  var clock = document.getElementById("clock");
  var hm = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false });
  function tick() { if (clock) clock.textContent = hm.format(new Date()); }
  tick(); setInterval(tick, 10000);

  /* ---------- Toast ---------- */
  var toastEl = $(".toast");
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("is-on");
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }
  function copyEmail() {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(T.email).then(function () { toast("copied " + T.email); return true; }, function () { return false; });
    }
    location.href = "mailto:" + T.email;
    return Promise.resolve(false);
  }
  $$("[data-copy]").forEach(function (b) { b.addEventListener("click", copyEmail); });

  /* ---------- Typed commands ---------- */
  var blocks = $$(".blk").filter(function (b) { return $(".typed", b); });
  function finish(blk) { blk.classList.add("is-done"); }
  function typeBlock(blk, speed) {
    if (blk.dataset.typed) return;
    blk.dataset.typed = "1";
    var t = $(".typed", blk), text = t.textContent, i = 0;
    if (reduceMotion) { finish(blk); return; }
    t.textContent = ""; t.classList.add("is-typing");
    (function step() {
      t.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(step, speed + Math.random() * speed * 0.6);
      else setTimeout(function () { t.classList.remove("is-typing"); finish(blk); }, 140);
    })();
  }
  if (blocks.length) {
    typeBlock(blocks[0], 70);
    if ("IntersectionObserver" in window) {
      var tio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { typeBlock(en.target, 22); tio.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -15% 0px" });
      blocks.slice(1).forEach(function (b) { tio.observe(b); });
    } else {
      blocks.forEach(finish);
    }
  }
  // Jumping to a section types it straight away so content is never hidden
  function reveal(id) { var b = document.getElementById(id); if (b && $(".typed", b)) typeBlock(b, 12); }

  /* ---------- Current tab ---------- */
  var tabs = $$(".bar__tabs a");
  if ("IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        tabs.forEach(function (a) { a.classList.toggle("is-current", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    $$(".blk[id]").forEach(function (s) { sio.observe(s); });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function () { reveal(a.getAttribute("href").slice(1)); });
  });

  /* ---------- Citations ---------- */
  if (window.ScholarStats) {
    ScholarStats.load(T.gs).then(function (s) {
      var box = $("[data-stats]");
      if (box) {
        box.textContent = "";
        if (s.total) box.append(el("span", null, s.total + " citations · h-index " + s.hIndex), " ", el("span", { class: "c" }, "# google scholar"));
        else box.append(el("a", { href: T.links.scholar, rel: "noopener" }, "google scholar ↗"));
      }
      $$(".ls__row .cite").forEach(function (c) {
        s.cites(c.getAttribute("data-gstitle"), c.getAttribute("data-s2id")).then(function (n) { if (n > 0) c.textContent = "★" + n; });
      });
    });
  }

  /* ---------- Actions shared by the shell and the palette ---------- */
  function goTo(id) {
    reveal(id);
    var t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
  function openUrl(url) { if (url) window.open(url, "_blank", "noopener"); }
  function paperUrl(p) { return p.page || p.pdf; }
  function findPaper(arg) {
    if (!arg) return null;
    var n = parseInt(arg, 10);
    if (n >= 1 && n <= T.papers.length && String(n) === arg) return T.papers[n - 1];
    var q = arg.toLowerCase().replace(/[^a-z0-9]/g, "");
    return T.papers.filter(function (p) { return p.short.toLowerCase().replace(/[^a-z0-9]/g, "").indexOf(q) === 0; })[0] || null;
  }
  function findVersion(arg) {
    var q = (arg || "").toLowerCase().replace(/^\/|\/$/g, "");
    return T.versions.filter(function (v) { return v.id === q || v.name.toLowerCase() === q || v.url.replace(/\//g, "") === q; })[0] || null;
  }
  var SECTIONS = [
    { id: "whoami", name: "whoami", desc: "who I am" },
    { id: "about", name: "about", desc: "about & interests" },
    { id: "papers", name: "papers", desc: "selected publications" },
    { id: "news", name: "news", desc: "latest updates" },
    { id: "experience", name: "experience", desc: "education & industry" },
    { id: "honors", name: "honors", desc: "awards & service" },
    { id: "contact", name: "contact", desc: "get in touch" }
  ];

  /* ---------- Shell ---------- */
  var form = $(".prompt"), input = $("#cmd"), log = $(".session__log");
  var ps1 = $(".prompt label .ps1");
  var history = [], hIdx = 0;

  function row(a, b) { return el("p", { class: "row" }, el("b", null, a), el("span", null, b)); }
  function link(text, url) { return el("a", { href: url, target: "_blank", rel: "noopener" }, text); }

  var COMMANDS = {
    help: { desc: "list commands", run: function () {
      var box = el("div");
      [["whoami | about", "jump to a section"], ["papers | news", "…also exp, honors, contact"], ["ls", "list papers with numbers"],
       ["open <n|name>", "open a paper, e.g. open 1, open urlbert"], ["code <n>", "open a paper's code"],
       ["open scholar", "…or github, huggingface"], ["email", "copy my email address"], ["versions", "list homepage versions"],
       ["switch <name>", "e.g. switch kinetic"], ["date", "time in Beijing"], ["history", "commands you typed"], ["clear", "clear this screen"]
      ].forEach(function (r) { box.appendChild(row(r[0], r[1])); });
      box.appendChild(el("p", { class: "c" }, "# tip: ↑ ↓ browse history · " + (isMac ? "⌘K" : "Ctrl+K") + " opens the palette"));
      return box;
    } },
    ls: { desc: "list papers", run: function () {
      var box = el("div");
      T.papers.forEach(function (p, i) { box.appendChild(row(String(i + 1).padStart(2, " ") + "  " + p.venue, p.short)); });
      box.appendChild(el("p", { class: "c" }, "# open <n> to read · code <n> for the repository"));
      return box;
    } },
    open: { desc: "open a paper or link", run: function (arg) {
      if (!arg) return el("p", { class: "err" }, "usage: open <n|name|scholar|github|huggingface>");
      if (T.links[arg]) { openUrl(T.links[arg]); return el("p", null, "opening ", link(arg, T.links[arg]), " ↗"); }
      var p = findPaper(arg);
      if (!p) return el("p", { class: "err" }, "open: no such paper: " + arg + " (try ls)");
      openUrl(paperUrl(p));
      return el("p", null, "opening ", link(p.short, paperUrl(p)), " ↗");
    } },
    code: { desc: "open a paper's code", run: function (arg) {
      var p = findPaper(arg);
      if (!p) return el("p", { class: "err" }, "usage: code <n|name> (try ls)");
      if (!p.code) return el("p", { class: "err" }, "code: " + p.short + " has no public repository yet");
      openUrl(p.code);
      return el("p", null, "opening ", link(p.code.replace(/^https?:\/\//, ""), p.code), " ↗");
    } },
    email: { desc: "copy email", run: function () {
      var out = el("p", null, T.email, " ", el("span", { class: "c" }, "# copying…"));
      copyEmail().then(function (ok) { out.lastChild.textContent = ok ? "# copied to clipboard" : "# opened your mail app"; });
      return out;
    } },
    versions: { desc: "list versions", run: function () {
      var box = el("div");
      T.versions.forEach(function (v) {
        box.appendChild(el("p", { class: "row" }, el("b", null, v.id + (v.id === "terminal" ? " *" : "")), el("span", null, el("a", { href: v.url }, v.url), "  ", el("span", { class: "c" }, v.desc))));
      });
      box.appendChild(el("p", { class: "c" }, "# switch <name> to go there"));
      return box;
    } },
    switch: { desc: "go to another version", run: function (arg) {
      var v = findVersion(arg);
      if (!v) return el("p", { class: "err" }, "switch: unknown version: " + (arg || "") + " (try versions)");
      setTimeout(function () { location.href = v.url; }, 250);
      return el("p", null, "switching to " + v.name + "…");
    } },
    date: { desc: "Beijing time", run: function () {
      return el("p", null, new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", dateStyle: "full", timeStyle: "medium" }).format(new Date()) + " (CST, UTC+8)");
    } },
    history: { desc: "command history", run: function () {
      var box = el("div");
      history.forEach(function (h, i) { box.appendChild(el("p", null, el("span", { class: "c" }, String(i + 1).padStart(3, " ") + "  "), h)); });
      return box;
    } },
    echo: { run: function (arg) { return el("p", null, arg || ""); } },
    sudo: { run: function () { return el("p", { class: "err" }, "yujie is not in the sudoers file. This incident will be reported."); } },
    exit: { run: function () { setTimeout(function () { location.href = "/"; }, 400); return el("p", null, "logout · taking you to the classic version…"); } }
  };
  COMMANDS.cd = COMMANDS.switch;
  COMMANDS.copy = COMMANDS.email;
  SECTIONS.forEach(function (s) {
    COMMANDS[s.name] = { run: function () { goTo(s.id); return el("p", { class: "c" }, "→ #" + s.id); } };
  });
  COMMANDS.exp = COMMANDS.experience;
  COMMANDS.cat = { run: function (arg) {
    var map = { "about.md": "about", "experience.yaml": "experience", "honors.txt": "honors", "service.txt": "honors", "news.log": "news" };
    if (map[arg]) return COMMANDS[map[arg]].run();
    return el("p", { class: "err" }, "cat: " + (arg || "") + ": No such file or directory");
  } };

  function run(line) {
    var trimmed = line.trim();
    var entry = el("div", null, el("p", { class: "echo" }, ps1.cloneNode(true), " ", trimmed));
    if (trimmed === "clear") { log.textContent = ""; return; }
    if (trimmed) {
      var parts = trimmed.split(/\s+/), name = parts[0].toLowerCase(), arg = parts.slice(1).join(" ");
      var cmd = Object.prototype.hasOwnProperty.call(COMMANDS, name) ? COMMANDS[name] : null;
      entry.appendChild(cmd ? cmd.run(arg) : el("p", { class: "err" }, "command not found: " + name + " · try help"));
    }
    log.appendChild(entry);
    input.scrollIntoView({ block: "nearest" });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value;
      if (v.trim()) { history.push(v.trim()); }
      hIdx = history.length;
      input.value = "";
      run(v);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp" && history.length) { hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx]; e.preventDefault(); }
      if (e.key === "ArrowDown" && history.length) { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ""; e.preventDefault(); }
      if (e.key === "Tab") {
        var v = input.value.trim().toLowerCase();
        var hit = v && Object.keys(COMMANDS).filter(function (c) { return c.indexOf(v) === 0; });
        if (hit && hit.length === 1) { input.value = hit[0] + " "; e.preventDefault(); }
      }
    });
  }

  /* ---------- Command palette ---------- */
  var pal = $(".pal"), palIn = $(".pal__in"), palList = $(".pal__list");
  var palItems = [], sel = 0, lastFocus = null;

  function buildItems() {
    var items = [];
    SECTIONS.forEach(function (s) { items.push({ group: "Sections", label: s.name, hint: s.desc, act: function () { goTo(s.id); } }); });
    T.papers.forEach(function (p, i) {
      items.push({ group: "Papers", label: p.short, hint: p.venue, search: p.title, act: function () { openUrl(paperUrl(p)); } });
      if (p.code) items.push({ group: "Papers", label: p.short + " · code", hint: "github", search: p.title + " code", act: function () { openUrl(p.code); } });
    });
    items.push({ group: "Links", label: "Copy email", hint: T.email, act: copyEmail });
    items.push({ group: "Links", label: "Google Scholar", hint: "↗", act: function () { openUrl(T.links.scholar); } });
    items.push({ group: "Links", label: "GitHub", hint: "↗", act: function () { openUrl(T.links.github); } });
    items.push({ group: "Links", label: "Hugging Face", hint: "↗", act: function () { openUrl(T.links.huggingface); } });
    T.versions.forEach(function (v) {
      if (v.id === "terminal") return;
      items.push({ group: "Versions", label: "Switch to " + v.name, hint: v.desc, act: function () { location.href = v.url; } });
    });
    return items;
  }
  var ALL = buildItems();

  // Subsequence match; consecutive and word-start hits score higher.
  function score(text, q) {
    var t = text.toLowerCase(), j = 0, s = 0, last = -2, hits = [];
    for (var i = 0; i < t.length && j < q.length; i++) {
      if (t[i] === q[j]) {
        s += (i === last + 1 ? 3 : 1) + (i === 0 || /[\s\-·]/.test(t[i - 1]) ? 2 : 0);
        hits.push(i); last = i; j++;
      }
    }
    return j === q.length ? { s: s - t.length * 0.01, hits: hits } : null;
  }
  function labelNode(label, hits) {
    var span = el("span");
    for (var i = 0; i < label.length; i++) span.appendChild(hits && hits.indexOf(i) >= 0 ? el("mark", null, label[i]) : document.createTextNode(label[i]));
    return span;
  }
  function render() {
    var q = palIn.value.trim().toLowerCase();
    palItems = q ? ALL.map(function (it) {
      // Labels match fuzzily; long titles only on a contiguous substring, or "url" would hit every title.
      var m = score(it.label, q) || (it.search && it.search.toLowerCase().indexOf(q) >= 0 ? { s: 0.5, hits: null } : null);
      return m ? { it: it, s: m.s, hits: score(it.label, q) ? m.hits : null } : null;
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }) : ALL.map(function (it) { return { it: it, hits: null }; });
    sel = Math.min(sel, Math.max(0, palItems.length - 1));
    palList.textContent = "";
    if (!palItems.length) { palList.appendChild(el("li", { class: "pal__empty" }, "no matches · press Enter to run “" + palIn.value.trim() + "” in the shell")); return; }
    var group = null;
    palItems.forEach(function (m, i) {
      if (!q && m.it.group !== group) { group = m.it.group; palList.appendChild(el("li", { class: "pal__group", role: "presentation" }, group)); }
      var li = el("li", { class: "pal__item", role: "option", id: "pal-opt-" + i, "aria-selected": String(i === sel) },
        labelNode(m.it.label, m.hits), el("span", { class: "hint" }, m.it.hint || ""));
      li.addEventListener("mousemove", function () { if (sel !== i) { sel = i; mark(); } });
      li.addEventListener("click", function () { choose(i); });
      palList.appendChild(li);
    });
    mark();
  }
  function mark() {
    $$(".pal__item", palList).forEach(function (li) { li.setAttribute("aria-selected", String(li.id === "pal-opt-" + sel)); });
    var cur = document.getElementById("pal-opt-" + sel);
    if (cur) { cur.scrollIntoView({ block: "nearest" }); palIn.setAttribute("aria-activedescendant", cur.id); }
  }
  function choose(i) {
    var m = palItems[i];
    var raw = palIn.value.trim();
    closePal();
    if (m) m.it.act();
    else if (raw) { run(raw); history.push(raw); hIdx = history.length; }
  }
  function openPal() {
    lastFocus = document.activeElement;
    pal.hidden = false; palIn.value = ""; sel = 0; render(); palIn.focus();
    document.body.style.overflow = "hidden";
  }
  function closePal() {
    pal.hidden = true; document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  palIn.addEventListener("input", function () { sel = 0; render(); });
  palIn.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { sel = Math.min(palItems.length - 1, sel + 1); mark(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); mark(); e.preventDefault(); }
    else if (e.key === "Enter") { choose(sel); e.preventDefault(); }
    else if (e.key === "Tab") { e.preventDefault(); }
  });
  pal.addEventListener("click", function (e) { if (e.target === pal) closePal(); });
  $$("[data-palette-open]").forEach(function (b) { b.addEventListener("click", openPal); });

  /* ---------- Global keys ---------- */
  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); if (pal.hidden) openPal(); else closePal(); return; }
    if (e.key === "Escape" && !pal.hidden) { closePal(); return; }
    var typing = /input|textarea|select/i.test((document.activeElement || {}).tagName || "");
    if (!typing && pal.hidden && e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault(); input.focus({ preventScroll: true });
      input.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }
  });
})();
