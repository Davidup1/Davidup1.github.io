/* Yujie Li — homepage, particles edition (raw WebGL, no dependencies)
 * Two canvases:
 *   .aurora          fixed full-screen flowing gradient (fragment shader)
 *   .hero__particles the name drawn as a few thousand spring-bound particles
 * Both only animate while the hero is on screen and the tab is visible; the aurora
 * freezes on its last frame below the hero, and the particles stop once settled. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var heroVisible = true, pageVisible = !document.hidden;

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  /* =================== Aurora =================== */
  var aurora = (function () {
    var canvas = $(".aurora");
    var gl = canvas && canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false });
    if (!gl) return null;
    var prog;
    try {
      prog = program(gl,
        "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }",
        [
          "precision mediump float;",
          "uniform vec2 uRes; uniform float uTime;",
          "float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }",
          "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);",
          "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }",
          "float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);",
          "  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; } return v; }",
          "void main(){",
          "  vec2 uv = gl_FragCoord.xy / uRes; vec2 p = uv; p.x *= uRes.x / uRes.y;",
          "  float t = uTime * 0.035;",
          "  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t)), fbm(p * 1.4 + vec2(5.2, 1.3) - t));",
          "  vec2 r = vec2(fbm(p * 1.6 + 2.0 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p * 1.6 + 2.0 * q + vec2(8.3, 2.8) - t * 0.5));",
          "  float f = fbm(p * 1.2 + 2.2 * r);",
          "  vec3 col = vec3(0.035, 0.047, 0.043);",
          "  col = mix(col, vec3(0.16, 0.17, 0.42), clamp(r.y * r.y * 1.4, 0.0, 1.0) * 0.55);",
          "  col = mix(col, vec3(0.13, 0.46, 0.42), clamp(f * f * 1.6, 0.0, 1.0) * 0.7);",
          "  col += vec3(0.651, 0.941, 0.753) * 0.3 * pow(clamp(f * q.x * 1.7, 0.0, 1.0), 3.0);",
          // brighter near the top where the hero is; darker lower down so text on glass stays readable
          "  float v = smoothstep(1.25, 0.15, length((uv - vec2(0.5, 0.78)) * vec2(1.0, 1.3)));",
          "  col *= 0.35 + 0.75 * v;",
          "  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.015;",
          "  gl_FragColor = vec4(col, 1.0);",
          "}"
        ].join("\n"));
    } catch (e) { return null; }

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(prog);
    var loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, "uRes"), uTime = gl.getUniformLocation(prog, "uTime");
    var SCALE = 0.5; // the gradient is soft, half resolution is indistinguishable and 4x cheaper
    var t0 = performance.now(), frozenAt = 12000 + Math.random() * 8000;

    function resize() {
      var w = Math.max(1, Math.round(innerWidth * SCALE)), h = Math.max(1, Math.round(innerHeight * SCALE));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    function draw(ms) {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, ms / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return {
      frame: function (now) { draw(reduceMotion ? frozenAt : now - t0 + frozenAt); },
      redraw: function () { draw(reduceMotion ? frozenAt : performance.now() - t0 + frozenAt); }
    };
  })();

  /* =================== Particle name =================== */
  var particles = (function () {
    var hero = $(".hero"), stage = $(".hero__stage"), title = $(".hero__name"), canvas = $(".hero__particles");
    var gl = canvas && canvas.getContext("webgl", { antialias: false, premultipliedAlpha: true, alpha: true, depth: false, stencil: false });
    if (!gl) return null;
    var prog;
    try {
      prog = program(gl,
        [
          "attribute vec2 aPos; attribute float aSeed; attribute float aSpeed;",
          "uniform vec2 uRes; uniform float uSize;",
          "varying float vSeed; varying float vGlow;",
          "void main(){",
          "  vec2 c = aPos / uRes * 2.0 - 1.0;",
          "  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);",
          "  gl_PointSize = uSize * (0.75 + 0.5 * aSeed);",
          "  vSeed = aSeed; vGlow = min(aSpeed * 0.12, 0.8);",
          "}"
        ].join("\n"),
        [
          "precision mediump float;",
          "varying float vSeed; varying float vGlow;",
          "void main(){",
          "  float d = length(gl_PointCoord - 0.5);",
          "  float a = smoothstep(0.5, 0.05, d);",
          "  vec3 mint = vec3(0.651, 0.941, 0.753), teal = vec3(0.353, 0.82, 0.753);",
          "  vec3 col = mix(teal, mint, 0.35 + 0.65 * vSeed) * 1.1;",
          "  col = mix(col, vec3(1.0), vGlow * 0.6 + step(0.92, vSeed) * 0.35);",
          "  a *= 0.95 + vGlow * 0.3;",
          "  gl_FragColor = vec4(col * a, a);",
          "}"
        ].join("\n"));
    } catch (e) { return null; }

    gl.useProgram(prog);
    var aPos = gl.getAttribLocation(prog, "aPos"), aSeed = gl.getAttribLocation(prog, "aSeed"), aSpeed = gl.getAttribLocation(prog, "aSpeed");
    var uRes = gl.getUniformLocation(prog, "uRes"), uSize = gl.getUniformLocation(prog, "uSize");
    var posBuf = gl.createBuffer(), seedBuf = gl.createBuffer(), speedBuf = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // additive: overlapping particles glow
    gl.clearColor(0, 0, 0, 0);

    var W = 0, H = 0, n = 0, step = 3;
    var x, y, vx, vy, tx, ty, pos, speed;
    var mouse = { x: -1e4, y: -1e4, active: false };
    var running = false, settledFrames = 0, born = 0;
    var MAX = coarse ? 5000 : 14000;

    function sampleTargets() {
      var cs = getComputedStyle(title);
      var fontPx = parseFloat(cs.fontSize);
      W = hero.clientWidth; H = hero.clientHeight;
      var hr = hero.getBoundingClientRect(), tr = title.getBoundingClientRect();
      var cx = tr.left - hr.left + tr.width / 2, cy = tr.top - hr.top + tr.height / 2;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      gl.viewport(0, 0, canvas.width, canvas.height);

      var off = document.createElement("canvas");
      off.width = W; off.height = H;
      var ctx = off.getContext("2d", { willReadFrequently: true });
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = cs.fontWeight + " " + fontPx + "px " + cs.fontFamily;
      if ("letterSpacing" in ctx) ctx.letterSpacing = cs.letterSpacing;
      var text = title.textContent.trim().toUpperCase();
      // Fit to the stage like the HTML heading does
      var measured = ctx.measureText(text).width;
      var maxW = stage.clientWidth * 0.98;
      if (measured > maxW) { fontPx *= maxW / measured; ctx.font = cs.fontWeight + " " + fontPx + "px " + cs.fontFamily; }
      ctx.fillText(text, cx, cy + fontPx * 0.04);

      var data = ctx.getImageData(0, 0, W, H).data, filled = 0;
      for (var i = 3; i < data.length; i += 4) if (data[i] > 128) filled++;
      step = Math.max(2, Math.ceil(Math.sqrt(filled / MAX)));
      var pts = [];
      for (var py = 0; py < H; py += step) {
        for (var px = 0; px < W; px += step) {
          if (data[(py * W + px) * 4 + 3] > 128) pts.push(px + (Math.random() - 0.5) * step * 0.6, py + (Math.random() - 0.5) * step * 0.6);
        }
      }
      return pts;
    }

    function build(first) {
      var pts = sampleTargets();
      var m = pts.length / 2;
      var ox = x, oy = y, on = n;
      n = m;
      x = new Float32Array(n); y = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n);
      tx = new Float32Array(n); ty = new Float32Array(n); pos = new Float32Array(n * 2); speed = new Float32Array(n);
      var seed = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        tx[i] = pts[i * 2]; ty[i] = pts[i * 2 + 1]; seed[i] = Math.random();
        if (first) {
          // Start scattered across the whole hero, then fly in
          x[i] = Math.random() * W; y[i] = Math.random() * H;
        } else if (on) {
          var j = i % on; x[i] = ox[j]; y[i] = oy[j];
        } else { x[i] = tx[i]; y[i] = ty[i]; }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf); gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, speedBuf); gl.bufferData(gl.ARRAY_BUFFER, speed, gl.DYNAMIC_DRAW);
      born = performance.now();
      settledFrames = 0;
    }

    function step_(now) {
      var age = (now - born) / 1000;
      var k = reduceMotion ? 1 : 0.012 + Math.min(age / 1.4, 1) * 0.038;   // springs tighten as the name forms
      var damp = 0.86, R = coarse ? 60 : 95, R2 = R * R, F = 5.5;
      var energy = 0;
      for (var i = 0; i < n; i++) {
        var dx = tx[i] - x[i], dy = ty[i] - y[i];
        vx[i] += dx * k; vy[i] += dy * k;
        if (mouse.active) {
          var ex = x[i] - mouse.x, ey = y[i] - mouse.y, d2 = ex * ex + ey * ey;
          if (d2 < R2 && d2 > 0.01) { var d = Math.sqrt(d2), f = (1 - d / R) * F; vx[i] += ex / d * f; vy[i] += ey / d * f; }
        }
        vx[i] *= damp; vy[i] *= damp;
        x[i] += vx[i]; y[i] += vy[i];
        if (reduceMotion) { x[i] = tx[i]; y[i] = ty[i]; vx[i] = vy[i] = 0; }
        var sp = Math.abs(vx[i]) + Math.abs(vy[i]);
        speed[i] = sp; energy += sp + Math.abs(dx) * 0.05 + Math.abs(dy) * 0.05;
        pos[i * 2] = x[i]; pos[i * 2 + 1] = y[i];
      }
      return energy / Math.max(n, 1);
    }

    function draw() {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(uRes, W, H);
      gl.uniform1f(uSize, Math.max(2, step * 1.15) * DPR);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, speedBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, speed);
      gl.enableVertexAttribArray(aSpeed); gl.vertexAttribPointer(aSpeed, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
      gl.enableVertexAttribArray(aSeed); gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, n);
    }

    function onMove(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      mouse.x = clientX - r.left; mouse.y = clientY - r.top;
      mouse.active = mouse.x > -100 && mouse.y > -100 && mouse.x < W + 100 && mouse.y < H + 100;
      if (mouse.active) wake();
    }
    addEventListener("pointermove", function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
    addEventListener("touchmove", function (e) { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    addEventListener("touchend", function () { mouse.active = false; }, { passive: true });
    document.addEventListener("pointerleave", function () { mouse.active = false; });

    function wake() { settledFrames = 0; if (!running) { running = true; loop.start(); } }

    var rt;
    addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(false); wake(); }, 180); });

    return {
      init: function () { build(!reduceMotion); root.classList.add("has-particles"); running = true; },
      tick: function (now) {
        if (!running) return false;
        var e = step_(now); draw();
        if (!mouse.active && e < 0.02) { if (++settledFrames > 30) { running = false; } } else settledFrames = 0;
        return running;
      },
      wake: wake
    };
  })();

  /* =================== Loop (only while the hero is on screen) =================== */
  var loop = (function () {
    var raf = 0;
    function frame(now) {
      raf = 0;
      if (!heroVisible || !pageVisible) return;
      var more = false;
      if (aurora && !reduceMotion) { aurora.frame(now); more = true; }
      if (particles && particles.tick(now)) more = true;
      if (more) raf = requestAnimationFrame(frame);
    }
    return { start: function () { if (!raf) raf = requestAnimationFrame(frame); } };
  })();

  function boot() {
    if (aurora) aurora.redraw();
    if (particles) {
      try { particles.init(); } catch (e) { /* the HTML heading stays visible */ }
    }
    loop.start();
  }
  // Sample the name only once the real font is in, or the particles would trace the fallback font
  var fontReady = document.fonts && document.fonts.load ? document.fonts.load('800 100px "Inter Tight"') : Promise.resolve();
  Promise.race([fontReady, new Promise(function (r) { setTimeout(r, 2500); })]).then(boot, boot);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      heroVisible = en[0].isIntersecting;
      if (heroVisible) { if (particles) particles.wake(); loop.start(); }
    }, { rootMargin: "0px 0px -10% 0px" }).observe($(".hero"));
  }
  document.addEventListener("visibilitychange", function () {
    pageVisible = !document.hidden;
    if (pageVisible) loop.start();
  });
  addEventListener("resize", function () { if (aurora && (!heroVisible || reduceMotion)) aurora.redraw(); });

  /* =================== Page bits =================== */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var els = $$(".sec .kicker, .sec .glass, .contact__big, .contact .btn");
    els.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  // Scrollable lists fade at whichever edge still has more to show
  $$("[data-scroll-fade]").forEach(function (el) {
    function upd() {
      el.style.setProperty("--ft", el.scrollTop > 2 ? "28px" : "0px");
      el.style.setProperty("--fb", el.scrollTop + el.clientHeight >= el.scrollHeight - 2 ? "0px" : "36px");
    }
    el.addEventListener("scroll", upd, { passive: true });
    addEventListener("resize", upd);
    upd();
  });

  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var mail = b.getAttribute("data-copy"), label = $("[data-copy-label]", b);
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(mail).then(function () {
          label.textContent = "Copied to clipboard";
          setTimeout(function () { label.textContent = mail; }, 2000);
        }, function () { location.href = "mailto:" + mail; });
      } else {
        location.href = "mailto:" + mail;
      }
    });
  });

  // Citations per year as columns. Values go in a tooltip and an off-screen table;
  // only the current year is labelled on its cap.
  function renderYears(fig, perYear) {
    var years = Object.keys(perYear).sort().slice(-6);
    if (!years.length) return;
    var max = Math.max.apply(null, years.map(function (y) { return perYear[y]; })) || 1;
    var thisYear = String(new Date().getFullYear());
    var plot = $(".spark__plot", fig), body = $("tbody", fig);
    var axis = document.createElement("div"); axis.className = "spark__years"; axis.setAttribute("aria-hidden", "true");
    years.forEach(function (y, i) {
      var n = perYear[y], current = i === years.length - 1;
      var partial = y === thisYear ? " (so far)" : "";
      var col = document.createElement("div");
      col.className = "spark__col" + (current ? " is-current" : "");
      col.tabIndex = 0;
      col.setAttribute("aria-label", y + ": " + n + " citations" + partial);
      // One scale for every column; the plot's top padding leaves room for the cap label
      var pct = Math.max(2, Math.round(n / max * 100));
      var bar = document.createElement("span"); bar.className = "spark__bar";
      bar.style.height = pct + "%";
      col.appendChild(bar);
      if (current) { var v = document.createElement("span"); v.className = "spark__val"; v.textContent = n; v.style.bottom = "calc(" + pct + "% + 4px)"; col.appendChild(v); }
      var tip = document.createElement("span"); tip.className = "spark__tip"; tip.textContent = y + " · " + n + " citations" + partial;
      col.appendChild(tip);
      plot.appendChild(col);
      var yl = document.createElement("span"); yl.textContent = y; axis.appendChild(yl);
      var tr = document.createElement("tr"); tr.innerHTML = "<th scope=\"row\"></th><td></td>";
      tr.firstChild.textContent = y; tr.lastChild.textContent = n + partial;
      body.appendChild(tr);
    });
    plot.setAttribute("aria-label", "Citations per year: " + years.map(function (y) { return y + " " + perYear[y]; }).join(", "));
    plot.after(axis);
    fig.hidden = false;
  }

  function countUp(el, to) {
    if (reduceMotion) { el.textContent = to; return; }
    var t0 = performance.now(), dur = 1400;
    (function stepUp(t) {
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(stepUp);
    })(t0);
  }
  if (window.ScholarStats) {
    ScholarStats.load((window.PARTICLES || {}).gs).then(function (s) {
      var card = $("[data-stats]");
      if (card && s.total) {
        countUp($('[data-stat="total"]', card), s.total);
        countUp($('[data-stat="h"]', card), s.hIndex || 0);
        var i10 = $('[data-stat="i10"]', card);
        if (s.i10Index != null) countUp(i10, s.i10Index); else i10.parentNode.hidden = true;
        if (s.updated) $('[data-stat="updated"]', card).textContent = "Updated " + new Date(s.updated.replace(" UTC", "Z").replace(" ", "T")).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (s.perYear) renderYears($("[data-spark]", card), s.perYear);
      } else if (card) card.hidden = true;
      $$(".pub__cite").forEach(function (c) {
        s.cites(c.getAttribute("data-gstitle"), c.getAttribute("data-s2id")).then(function (n) { if (n > 0) c.textContent = "Cited by " + n; });
      });
    });
  }
})();
