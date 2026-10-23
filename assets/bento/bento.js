/* Yujie Li — homepage, bento edition (no dependencies) */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Theme toggle (saved per viewer; otherwise follows the system) ---------- */
  var sysDark = window.matchMedia("(prefers-color-scheme: dark)");
  function currentTheme() { return root.getAttribute("data-theme") || (sysDark.matches ? "dark" : "light"); }
  $$("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("bento-theme", next); } catch (e) {}
    });
  });

  /* ---------- Clock ---------- */
  var clock = document.getElementById("clock");
  var hm = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false });
  function tick() { if (clock) clock.textContent = hm.format(new Date()); }
  tick(); setInterval(tick, 10000);

  /* ---------- Spotlight + tilt ---------- */
  if (finePointer) {
    $$(".card").forEach(function (card) {
      var tilt = !reduceMotion && card.closest(".bento");
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty("--mx", x + "px");
        card.style.setProperty("--my", y + "px");
        if (tilt) {
          card.classList.add("is-tilting");
          card.style.setProperty("--ry", ((x / r.width - 0.5) * 4).toFixed(2) + "deg");
          card.style.setProperty("--rx", ((0.5 - y / r.height) * 4).toFixed(2) + "deg");
        }
      });
      card.addEventListener("pointerleave", function () {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- Toast + copy ---------- */
  var toastEl = $(".toast");
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("is-on");
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var mail = b.getAttribute("data-copy"), label = $("[data-copy-label]", b);
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(mail).then(function () {
          toast("Email copied");
          if (label) { label.textContent = "Copied"; setTimeout(function () { label.textContent = "Copy"; }, 2000); }
        }, function () { location.href = "mailto:" + mail; });
      } else {
        location.href = "mailto:" + mail;
      }
    });
  });

  /* ---------- News toggle ---------- */
  var newsBtn = $("[data-news-toggle]");
  if (newsBtn) {
    newsBtn.addEventListener("click", function () {
      var open = newsBtn.closest(".card--news").classList.toggle("is-open");
      newsBtn.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- Citations ---------- */
  function countUp(el, to) {
    if (reduceMotion) { el.textContent = to; return; }
    var t0 = performance.now(), dur = 1400;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  if (window.ScholarStats) {
    ScholarStats.load((window.BENTO || {}).gs).then(function (s) {
      var card = $("[data-stats]");
      if (card && s.total) {
        countUp($('[data-stat="total"]', card), s.total);
        countUp($('[data-stat="h"]', card), s.hIndex || 0);
      } else if (card) {
        card.hidden = true;
      }
      $$(".pub__cite").forEach(function (c) {
        s.cites(c.getAttribute("data-gstitle"), c.getAttribute("data-s2id")).then(function (n) {
          if (n > 0) c.textContent = "Cited by " + n;
        });
      });
    });
  }
})();
