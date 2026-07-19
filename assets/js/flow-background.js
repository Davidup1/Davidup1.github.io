/* Ambient animated background: slowly drifting color washes overlaid with
 * evolving topographic contour lines drawn from a 3-D value-noise field.
 * Self-contained (no assets, no deps). Respects prefers-reduced-motion and
 * prefers-color-scheme; the center column is masked so text stays readable. */
(function () {
  "use strict";
  if (window.__flowBackground) return;
  window.__flowBackground = true;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var darkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;" +
    "-webkit-mask-image:linear-gradient(90deg,#000,rgba(0,0,0,0.45) 30%,rgba(0,0,0,0.45) 70%,#000);" +
    "mask-image:linear-gradient(90deg,#000,rgba(0,0,0,0.45) 30%,rgba(0,0,0,0.45) 70%,#000);";
  var ctx = canvas.getContext("2d");

  var W = 0, H = 0, dpr = 1;
  var CELL = 26;            // contour grid cell in CSS px
  var cols = 0, rows = 0;
  var field = null;
  var t = Math.random() * 100;
  var rafId = 0, lastFrame = 0;

  function palette() {
    if (darkScheme.matches) {
      return {
        blobs: [["147,189,158", 0.11], ["211,183,92", 0.06], ["159,180,214", 0.075]],
        stroke: "147,189,158",
        strokeAlpha: 0.19
      };
    }
    return {
      blobs: [["78,122,94", 0.14], ["180,112,46", 0.085], ["86,116,159", 0.10]],
      stroke: "62,104,78",
      strokeAlpha: 0.28
    };
  }

  /* Integer-lattice value noise (libnoise-style hash), 3-D, two octaves. */
  function latticeNoise(ix, iy, iz) {
    var n = (ix * 1619 + iy * 31337 + iz * 6971) & 0x7fffffff;
    n = (n >> 13) ^ n;
    n = (n * (n * n * 60493 + 19990303) + 1376312589) & 0x7fffffff;
    return 1 - n / 1073741824;
  }
  function fade(u) { return u * u * (3 - 2 * u); }
  function noise3(x, y, z) {
    var x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    var fx = fade(x - x0), fy = fade(y - y0), fz = fade(z - z0);
    var v000 = latticeNoise(x0, y0, z0), v100 = latticeNoise(x0 + 1, y0, z0);
    var v010 = latticeNoise(x0, y0 + 1, z0), v110 = latticeNoise(x0 + 1, y0 + 1, z0);
    var v001 = latticeNoise(x0, y0, z0 + 1), v101 = latticeNoise(x0 + 1, y0, z0 + 1);
    var v011 = latticeNoise(x0, y0 + 1, z0 + 1), v111 = latticeNoise(x0 + 1, y0 + 1, z0 + 1);
    var a = v000 + (v100 - v000) * fx, b = v010 + (v110 - v010) * fx;
    var c = v001 + (v101 - v001) * fx, d = v011 + (v111 - v011) * fx;
    var e = a + (b - a) * fy, f = c + (d - c) * fy;
    return e + (f - e) * fz;
  }
  function fbm(x, y, z) {
    return (noise3(x, y, z) + 0.5 * noise3(x * 2 + 31.4, y * 2 + 47.2, z * 2)) / 1.5;
  }

  /* Marching-squares segment table; edges: 0 top, 1 right, 2 bottom, 3 left. */
  var SEGS = [
    [], [[3, 0]], [[0, 1]], [[3, 1]],
    [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
    [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]],
    [[3, 1]], [[0, 1]], [[3, 0]], []
  ];
  var LEVELS = [-0.28, -0.14, 0, 0.14, 0.28];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cols = Math.ceil(W / CELL) + 1;
    rows = Math.ceil(H / CELL) + 1;
    field = new Float32Array(cols * rows);
  }

  function computeField() {
    var s = 0.0036 * CELL; // noise frequency per grid step
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        field[j * cols + i] = fbm(i * s, j * s, t);
      }
    }
  }

  function edgePoint(edge, i, j, a, b, c, d, T) {
    var u;
    switch (edge) {
      case 0: u = (T - a) / (b - a); return [(i + u) * CELL, j * CELL];
      case 1: u = (T - b) / (c - b); return [(i + 1) * CELL, (j + u) * CELL];
      case 2: u = (T - d) / (c - d); return [(i + u) * CELL, (j + 1) * CELL];
      default: u = (T - a) / (d - a); return [i * CELL, (j + u) * CELL];
    }
  }

  function draw() {
    var pal = palette();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Drifting color washes
    var R = Math.max(W, H) * 0.55;
    for (var k = 0; k < pal.blobs.length; k++) {
      var ph = k * 2.1;
      var cx = W * (0.5 + 0.42 * Math.sin(t * 0.55 + ph));
      var cy = H * (0.5 + 0.40 * Math.cos(t * 0.38 + ph * 1.7));
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, "rgba(" + pal.blobs[k][0] + "," + pal.blobs[k][1] + ")");
      g.addColorStop(1, "rgba(" + pal.blobs[k][0] + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // Contour lines
    computeField();
    for (var li = 0; li < LEVELS.length; li++) {
      var T = LEVELS[li];
      var major = T === 0; // index contour, like the heavier line on topo maps
      ctx.lineWidth = major ? 1.6 : 1;
      ctx.strokeStyle = "rgba(" + pal.stroke + "," + (major ? pal.strokeAlpha * 1.35 : pal.strokeAlpha) + ")";
      ctx.beginPath();
      for (var j = 0; j < rows - 1; j++) {
        for (var i = 0; i < cols - 1; i++) {
          var a = field[j * cols + i], b = field[j * cols + i + 1];
          var c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
          var idx = (a > T ? 1 : 0) | (b > T ? 2 : 0) | (c > T ? 4 : 0) | (d > T ? 8 : 0);
          var segs = SEGS[idx];
          for (var si = 0; si < segs.length; si++) {
            var p = edgePoint(segs[si][0], i, j, a, b, c, d, T);
            var q = edgePoint(segs[si][1], i, j, a, b, c, d, T);
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(q[0], q[1]);
          }
        }
      }
      ctx.stroke();
    }
  }

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    if (now - lastFrame < 45) return; // ~22 fps is plenty for this motion
    lastFrame = now;
    t += 0.006;
    draw();
  }

  function start() {
    cancelAnimationFrame(rafId);
    if (reduceMotion.matches) {
      draw(); // single static frame
    } else {
      rafId = requestAnimationFrame(loop);
    }
  }

  function onSchemeChange() { if (reduceMotion.matches) draw(); }

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); draw(); }, 120);
  });
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", start);
    darkScheme.addEventListener("change", onSchemeChange);
  }

  function mount() {
    document.body.insertBefore(canvas, document.body.firstChild);
    resize();
    start();
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
