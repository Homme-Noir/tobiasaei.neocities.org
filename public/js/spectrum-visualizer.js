/* ============================================================
   spectrum-visualizer.js — "Signal Analyzer" canvas bars.

   Adapted from the RetroWave music visualizer by C-Elkins
   (https://github.com/C-Elkins/Retrowave-music-visualizer, MIT),
   reduced to a single self-contained frequency-bar mode and
   re-skinned to read every color from this site's palette tokens
   (--color-1..9 / semantic accents defined in css/base.css).

   Usage:
     TAE_SPECTRUM.attach(canvasEl)      -> starts once audio exists
   The analyzer taps into the shared lofi-player <audio> element
   via the "taei:lofi-audio" event dispatched by js/lofi-player.js.

   Behavior notes:
   - Web Audio requires a user gesture before output can be heard;
     we still draw live FFT data while paused/muted so the panel
     never looks dead.
   - Falls back to a gentle synthetic idle wave when no stream is
     connected yet, or if AudioContext is unavailable.
   - Respects prefers-reduced-motion: renders one static frame.
   ============================================================ */
(function () {
  "use strict";

  var BAR_COUNT = 48;
  var SMOOTHING = 0.82;
  var running = []; // active instances, for cleanup on page hide

  function cssColor(el, prop, fallback) {
    var v = getComputedStyle(el).getPropertyValue(prop);
    v = (v || "").trim();
    return v || fallback;
  }

  function mixHex(a, b, t) {
    function parse(h) {
      h = (h || "").replace("#", "");
      if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h.slice(0, 6), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var ca = parse(a),
      cb = parse(b);
    var r = Math.round(ca[0] + (cb[0] - ca[0]) * t),
      g = Math.round(ca[1] + (cb[1] - ca[1]) * t),
      bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }

  function attach(canvas) {
    if (!canvas || canvas.dataset.spectrumBound === "1") return;
    canvas.dataset.spectrumBound = "1";

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /* Palette: read from CSS custom properties so the visualizer
       stays in sync with css/palette.css automatically. */
    /* Read the nine palette slots directly (hex values from
       css/palette.css) so every pixel drawn is a palette color. */
    var rootStyle = document.documentElement;
    function pal(n, fallback) {
      return cssColor(rootStyle, "--color-" + n, fallback);
    }
    var colHot = pal(6, "#ff6361");     /* --color-6 */
    var colViolet = pal(5, "#bc5090");  /* --color-5 */
    var colWarm = pal(8, "#ffa600");    /* --color-8 */
    var colInkDim = pal(3, "#2c4875");  /* --color-3 */

    /* ---- sizing (DPR-aware) ---- */
    var w = 0,
      h = 0,
      dpr = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawFrame(performance.now());
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    /* ---- audio graph (lazy, on first play gesture) ---- */
    var audioCtx = null,
      analyser = null,
      freqData = null,
      boundAudio = null;

    function ensureGraph(audioEl) {
      if (analyser || boundAudio === audioEl) return;
      boundAudio = audioEl;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        audioCtx = audioCtx || new AC();
        var src = audioCtx.createMediaElementSource(audioEl);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = SMOOTHING;
        src.connect(analyser);
        analyser.connect(audioCtx.destination);
        freqData = new Uint8Array(analyser.frequencyBinCount);
      } catch (err) {
        /* CORS or unsupported: fall back to idle wave */
        analyser = null;
      }
    }

    /* Poll briefly for the shared lofi player's subscription API. */
    var subscribeTries = 0;
    function trySubscribe() {
      if (window.TAE_LOFI_PLAYER && window.TAE_LOFI_PLAYER.onAudioElement) {
        window.TAE_LOFI_PLAYER.onAudioElement(function (audioEl) {
          boundAudio = null;
          ensureGraph(audioEl);
        });
        return;
      }
      if (++subscribeTries < 60) setTimeout(trySubscribe, 100);
    }
    trySubscribe();
    document.addEventListener(
      "click",
      function resume() {
        if (audioCtx && audioCtx.state === "suspended") {
          audioCtx.resume().catch(function () {});
        }
      },
      true,
    );

    /* ---- bar heights ---- */
    var levels = new Float32Array(BAR_COUNT);

    function sampleLevels(t) {
      var i, target;
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        var bins = freqData.length;
        for (i = 0; i < BAR_COUNT; i++) {
          // log-ish mapping: low frequencies get more resolution
          var f0 = Math.floor(Math.pow(i / BAR_COUNT, 1.7) * bins);
          var f1 = Math.max(
            f0 + 1,
            Math.floor(Math.pow((i + 1) / BAR_COUNT, 1.7) * bins),
          );
          var sum = 0;
          for (var b = f0; b < f1 && b < bins; b++) sum += freqData[b];
          target = sum / ((f1 - f0) * 255);
          levels[i] = levels[i] * 0.6 + target * 0.4;
        }
      } else {
        // synthetic idle wave so the analyzer always feels alive
        for (i = 0; i < BAR_COUNT; i++) {
          target =
            0.12 +
            0.1 * Math.sin(t / 700 + i * 0.5) +
            0.06 * Math.sin(t / 310 + i * 1.7);
          if (target < 0.04) target = 0.04;
          levels[i] = levels[i] * 0.85 + target * 0.15;
        }
      }
    }

    function barColor(i) {
      var p = i / (BAR_COUNT - 1);
      if (p < 0.5) return mixHex(colHot, colViolet, p * 2);
      return mixHex(colViolet, colWarm, (p - 0.5) * 2);
    }

    /* ---- render ---- */
    function drawFrame(t) {
      sampleLevels(t);
      ctx.clearRect(0, 0, w, h);

      var gap = 2;
      var bw = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      for (var i = 0; i < BAR_COUNT; i++) {
        var lh = Math.max(2, levels[i] * h * 0.92);
        var x = i * (bw + gap);
        var y = h - lh;
        ctx.fillStyle = barColor(i);
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, y, bw, lh);
        // faint reflection under the baseline
        ctx.globalAlpha = 0.14;
        ctx.fillRect(x, h - lh * 0.25, bw, lh * 0.25);
        ctx.globalAlpha = 1;
      }

      // baseline rule
      ctx.fillStyle = colInkDim;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, h - 1, w, 1);
      ctx.globalAlpha = 1;
    }

    var rafId = 0;
    function loop(t) {
      drawFrame(t);
      rafId = requestAnimationFrame(loop);
    }

    resize();
    if (reduced) {
      drawFrame(performance.now());
    } else {
      rafId = requestAnimationFrame(loop);
      running.push({
        stop: function () {
          cancelAnimationFrame(rafId);
        },
        start: function () {
          if (!rafId) rafId = requestAnimationFrame(loop);
        },
      });
    }

    document.addEventListener("visibilitychange", function () {
      if (reduced) return;
      for (var i = 0; i < running.length; i++) {
        if (document.hidden) running[i].stop();
        else running[i].start();
      }
    });
  }

  window.TAE_SPECTRUM = { attach: attach };
})();
