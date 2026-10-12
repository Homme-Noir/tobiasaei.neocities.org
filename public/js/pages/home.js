/* ==========================================================================
   home.js — Cyberdeck homepage behaviors
   Clock, uptime counter, waveform bars, SVG sine waves, deck controls,
   bottom-bar graphs, radio player. Palette colors are read from CSS custom
   properties defined in css/palette.css (no hardcoded colors here).
   ========================================================================== */

(function () {
  "use strict";

  var $ = function (id) {
    return document.getElementById(id);
  };

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ── Palette helpers ──────────────────────────────────────────────── */
  function paletteColor(n) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--color-" + n)
      .trim();
  }

  // Bar cycle order: pink, orange, amber, blue, purple, red, ...
  var WAVEFORM_COLOR_SLOTS = [5, 7, 8, 2, 4, 6, 8, 2, 7, 5, 9, 8];

  /* ── Live UTC clock ───────────────────────────────────────────────── */
  var clockEl = $("clock");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function updateClock() {
    if (!clockEl) return;
    var now = new Date();
    clockEl.textContent =
      pad(now.getUTCHours()) +
      ":" +
      pad(now.getUTCMinutes()) +
      ":" +
      pad(now.getUTCSeconds()) +
      " UTC";
  }

  updateClock();
  setInterval(updateClock, 1000);

  /* ── Uptime counter ───────────────────────────────────────────────── */
  var uptimeEl = $("uptime");
  var uptimeSeconds = 0;

  function updateUptime() {
    uptimeSeconds += 1;
    if (!uptimeEl) return;
    uptimeEl.textContent =
      pad(Math.floor(uptimeSeconds / 3600)) +
      ":" +
      pad(Math.floor((uptimeSeconds % 3600) / 60)) +
      ":" +
      pad(uptimeSeconds % 60);
  }

  updateUptime(); // show 00:00:01 immediately instead of a stale placeholder
  setInterval(updateUptime, 1000);

  /* ── Waveform bars (randomized every 800ms) ───────────────────────── */
  var wfContainer = $("waveformBars");

  if (wfContainer) {
    for (var i = 0; i < 12; i++) {
      var bar = document.createElement("div");
      bar.className = "wf-bar";
      bar.style.height = 10 + Math.random() * 30 + "px";
      bar.style.background = paletteColor(WAVEFORM_COLOR_SLOTS[i % WAVEFORM_COLOR_SLOTS.length]);
      wfContainer.appendChild(bar);
    }

    setInterval(function () {
      var bars = wfContainer.querySelectorAll(".wf-bar");
      for (var b = 0; b < bars.length; b++) {
        bars[b].style.height = 8 + Math.random() * 32 + "px";
      }
    }, 800);
  }

  /* ── SVG sine waves (requestAnimationFrame) ───────────────────────── */
  var wavePath1 = $("wavePath1");
  var wavePath2 = $("wavePath2");
  var wavePath3 = $("wavePath3");

  function generateWavePath(offset, amplitude, frequency) {
    var width = 800;
    var height = 40;
    var centerY = height / 2;
    var path = "";

    for (var x = 0; x <= width; x += 2) {
      var y =
        centerY +
        Math.sin((x * frequency / width) * Math.PI * 2 + offset) * amplitude +
        Math.sin((x * frequency * 1.5 / width) * Math.PI * 2 + offset * 1.3) *
          (amplitude * 0.4);
      path += (x === 0 ? "M " : " L ") + x + " " + y.toFixed(2);
    }
    return path;
  }

  if (wavePath1 && wavePath2 && wavePath3) {
    var waveOffset = 0;

    function animateWaves() {
      waveOffset += 0.02;
      wavePath1.setAttribute("d", generateWavePath(waveOffset, 12, 3));
      wavePath2.setAttribute("d", generateWavePath(waveOffset * 1.3, 8, 4));
      wavePath3.setAttribute("d", generateWavePath(waveOffset * 0.7, 10, 2.5));
      requestAnimationFrame(animateWaves);
    }

    if (prefersReducedMotion) {
      // Draw one static frame instead of animating.
      wavePath1.setAttribute("d", generateWavePath(0, 12, 3));
      wavePath2.setAttribute("d", generateWavePath(0, 8, 4));
      wavePath3.setAttribute("d", generateWavePath(0, 10, 2.5));
    } else {
      requestAnimationFrame(animateWaves);
    }
  }

  /* ── Bottom bar graphs (SIG 9/10, PWR 7/10, MEM 5/10) ─────────────── */
  function createBarGraph(containerId, filled, total) {
    var container = $(containerId);
    if (!container) return;
    for (var i = 0; i < total; i++) {
      var bar = document.createElement("div");
      bar.className = "bar" + (i >= filled ? " empty" : "");
      container.appendChild(bar);
    }
  }

  createBarGraph("sigBars", 9, 10);
  createBarGraph("pwrBars", 7, 10);
  createBarGraph("memBars", 5, 10);

  /* ── Boot sequence skip toggle ────────────────────────────────────── */
  var skipBtn = $("skipBtn");
  var bootText = $("bootText");

  if (skipBtn && bootText) {
    skipBtn.addEventListener("click", function () {
      var skipped = bootText.style.opacity === "0.3";
      bootText.style.opacity = skipped ? "1" : "0.3";
      skipBtn.textContent = skipped ? "[ skip → ]" : "[ skipped ]";
    });
  }

  /* ── Control-bar sliders (click-to-set) ───────────────────────────── */
  var tracks = document.querySelectorAll(".slider-track");

  Array.prototype.forEach.call(tracks, function (track) {
    track.addEventListener("click", function (e) {
      var rect = track.getBoundingClientRect();
      var pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      var fill = track.querySelector(".slider-fill");
      var knob = track.querySelector(".slider-knob");
      if (fill) fill.style.width = pct + "%";
      if (knob) knob.style.left = pct + "%";
    });
  });

  /* ── Floating radio player ────────────────────────────────────────── */
  var playRadioBtn = $("playRadioBtn");
  var radioSelect = $("radioSelect");
  var volumeSlider = $("volumeSlider");
  var radioAudio = $("radioAudio");

  if (playRadioBtn && radioAudio) {
    radioAudio.volume = (parseInt(volumeSlider.value, 10) || 65) / 100;

    playRadioBtn.addEventListener("click", function () {
      if (radioAudio.paused) {
        radioAudio.src = radioSelect.value;
        radioAudio
          .play()
          .then(function () {
            playRadioBtn.textContent = "\u275A\u275A Pause";
            playRadioBtn.classList.add("playing");
          })
          .catch(function () {
            playRadioBtn.textContent = "\u25B6 Retry radio";
          });
      } else {
        radioAudio.pause();
        playRadioBtn.textContent = "\u25B6 Play radio";
        playRadioBtn.classList.remove("playing");
      }
    });

    radioSelect.addEventListener("change", function () {
      if (!radioAudio.paused) {
        radioAudio.src = radioSelect.value;
      }
    });

    radioAudio.addEventListener("pause", function () {
      playRadioBtn.textContent = "\u25B6 Play radio";
      playRadioBtn.classList.remove("playing");
    });
  }

  if (volumeSlider) {
    var paintVolumeTrack = function () {
      volumeSlider.style.background =
        "linear-gradient(to right, " +
        paletteColor(5) +
        " " +
        volumeSlider.value +
        "%, " +
        paletteColor(3) +
        " " +
        volumeSlider.value +
        "%)";
      if (radioAudio) {
        radioAudio.volume = parseInt(volumeSlider.value, 10) / 100;
      }
    };

    volumeSlider.addEventListener("input", paintVolumeTrack);
    paintVolumeTrack();
  }
})();
