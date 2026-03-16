/**
 * Shared layout: inject header/footer, current page, tab title suffix, scroll-to-top.
 */
(function () {
  var base = (function () {
    var p = window.location.pathname;
    var i = p.lastIndexOf("/");
    return i === -1 ? "" : p.substring(0, i + 1);
  })();

  var HOME_TITLE = "Tobias_AEI: Home";
  var TAB_SUFFIX = " | Tobias AEI";
  var SCROLL_THRESHOLD = 300;
  var RADIO_STATE_KEY = "taeiRadioStateV1";
  var RADIO_COMMAND_KEY = "taeiRadioCommandV1";
  var RADIO_WINDOW_NAME = "taeiRadioPlayerWindow";
  var RADIO_STATIONS = [
    {
      id: "lofigirl",
      label: "SomaFM: Groove Salad",
      sources: [
        "https://ice1.somafm.com/groovesalad-128-mp3",
        "https://ice2.somafm.com/groovesalad-128-mp3",
      ],
    },
    {
      id: "bootlegboy",
      label: "SomaFM: Illinois Street Lounge",
      sources: [
        "https://ice1.somafm.com/illstreet-128-mp3",
        "https://ice2.somafm.com/illstreet-128-mp3",
      ],
    },
    {
      id: "chillhop",
      label: "SomaFM: Lush",
      sources: [
        "https://ice1.somafm.com/lush-128-mp3",
        "https://ice2.somafm.com/lush-128-mp3",
      ],
    },
  ];

  function setCurrentPage() {
    var nav = document.getElementById("navbar");
    if (!nav) return;
    var links = nav.querySelectorAll("a[href]");
    var pathname = window.location.pathname;
    var currentFile = pathname.split("/").pop();
    if (!currentFile) currentFile = "index.html";
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      var linkFile = href.split("/").pop() || href;
      if (linkFile === currentFile) {
        a.setAttribute("aria-current", "page");
        a.classList.add("active");
        break;
      }
    }
  }

  function setTabTitleSuffix() {
    if (document.title !== HOME_TITLE) {
      document.title = document.title + TAB_SUFFIX;
    }
  }

  function setPageBodyClass() {
    var pathname = window.location.pathname;
    var file = pathname.split("/").pop() || "";
    var baseName = file.replace(/\.html$/, "");
    if (!baseName || baseName === "index") return;
    document.body.classList.add("page-" + baseName);
  }

  function initScrollToTop() {
    var btn = document.createElement("a");
    btn.href = "#";
    btn.id = "scroll-to-top";
    btn.setAttribute("aria-label", "Scroll to top");
    btn.className = "scroll-to-top scroll-to-top--hidden";
    btn.textContent = "↑";
    document.body.appendChild(btn);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    function updateVisibility() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (y > SCROLL_THRESHOLD) {
        btn.classList.remove("scroll-to-top--hidden");
      } else {
        btn.classList.add("scroll-to-top--hidden");
      }
    }

    window.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();
  }

  function initLofiPlayer() {
    var root = document.querySelector("[data-lofi-player]");
    if (!root) {
      root = document.createElement("div");
      root.className = "lofi-player";
      root.setAttribute("data-lofi-player", "");
      root.innerHTML =
        '<button type="button" class="lofi-toggle" data-lofi-toggle aria-pressed="false">Play radio</button>' +
        '<label class="lofi-station-wrap">' +
        '  <span class="sr-only">Radio station</span>' +
        '  <select class="lofi-station" data-lofi-station aria-label="Radio station"></select>' +
        "</label>" +
        '<label class="lofi-volume-wrap">' +
        '  <span class="sr-only">Radio volume</span>' +
        '  <input type="range" class="lofi-volume" data-lofi-volume min="0" max="1" step="0.05" value="0.45" aria-label="Radio volume" />' +
        "</label>";
      document.body.appendChild(root);
    }
    var toggle = root.querySelector("[data-lofi-toggle]");
    var volume = root.querySelector("[data-lofi-volume]");
    var station = root.querySelector("[data-lofi-station]");
    if (!toggle || !volume || !station) return;
    var carrierWindow = null;

    function readState() {
      try {
        var raw = window.localStorage.getItem(RADIO_STATE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
      } catch (err) {
        return null;
      }
    }

    function writeState(next) {
      try {
        window.localStorage.setItem(RADIO_STATE_KEY, JSON.stringify(next));
      } catch (err) {
        /* no-op: storage unavailable */
      }
    }

    function resolveStation(id) {
      for (var i = 0; i < RADIO_STATIONS.length; i++) {
        if (RADIO_STATIONS[i].id === id) return RADIO_STATIONS[i];
      }
      return RADIO_STATIONS[0];
    }

    for (var i = 0; i < RADIO_STATIONS.length; i++) {
      var opt = document.createElement("option");
      opt.value = RADIO_STATIONS[i].id;
      opt.textContent = RADIO_STATIONS[i].label;
      station.appendChild(opt);
    }

    var stored = readState() || {};
    var currentStation = resolveStation(stored.stationId);
    var desiredVolume = Number(stored.volume);
    var isPlaying = !!stored.isPlaying;

    if (Number.isNaN(desiredVolume)) desiredVolume = 0.45;
    if (desiredVolume < 0) desiredVolume = 0;
    if (desiredVolume > 1) desiredVolume = 1;
    volume.value = String(desiredVolume);
    station.value = currentStation.id;

    function currentState(playing) {
      return {
        stationId: station.value,
        volume: Number(volume.value || 0.45),
        isPlaying: !!playing,
      };
    }

    function setPlaying(playing) {
      isPlaying = !!playing;
      toggle.classList.toggle("is-playing", isPlaying);
      toggle.setAttribute("aria-pressed", String(isPlaying));
      toggle.textContent = isPlaying ? "Pause radio" : "Play radio";
      writeState(currentState(isPlaying));
    }

    function sendCommand(type, payload) {
      var message = {
        id: Date.now() + "_" + Math.floor(Math.random() * 10000),
        type: type,
        payload: payload || {},
      };
      try {
        window.localStorage.setItem(RADIO_COMMAND_KEY, JSON.stringify(message));
      } catch (err) {
        /* no-op: storage unavailable */
      }
    }

    function openCarrierWindow(isUserGesture) {
      try {
        if (!carrierWindow || carrierWindow.closed) {
          var features = "popup=yes,width=420,height=240";
          carrierWindow = window.open(base + "radio-player.html", RADIO_WINDOW_NAME, features);
          if (carrierWindow && carrierWindow.focus && isUserGesture) carrierWindow.focus();
        }
      } catch (err) {
        carrierWindow = null;
      }
    }

    toggle.addEventListener("click", function () {
      if (!isPlaying) {
        openCarrierWindow(true);
        sendCommand("play", {
          stationId: station.value,
          volume: Number(volume.value || 0.45),
        });
        setPlaying(true);
      } else {
        sendCommand("pause");
        setPlaying(false);
      }
    });

    station.addEventListener("change", function () {
      var next = resolveStation(station.value);
      sendCommand("set-station", {
        stationId: next.id,
        autoplay: !!isPlaying,
      });
      writeState(currentState(isPlaying));
      if (isPlaying) {
        openCarrierWindow(true);
      }
    });

    volume.addEventListener("input", function () {
      var next = Number(volume.value);
      if (Number.isNaN(next)) return;
      sendCommand("set-volume", {
        volume: next,
      });
      writeState(currentState(isPlaying));
    });

    window.addEventListener("storage", function (event) {
      if (event.key !== RADIO_STATE_KEY || !event.newValue) return;
      try {
        var next = JSON.parse(event.newValue);
        if (!next || typeof next !== "object") return;
        var nextStation = resolveStation(next.stationId);
        station.value = nextStation.id;
        var nextVolume = Number(next.volume);
        if (!Number.isNaN(nextVolume)) volume.value = String(Math.max(0, Math.min(1, nextVolume)));
        isPlaying = !!next.isPlaying;
        toggle.classList.toggle("is-playing", isPlaying);
        toggle.setAttribute("aria-pressed", String(isPlaying));
        toggle.textContent = isPlaying ? "Pause radio" : "Play radio";
      } catch (err) {
        /* no-op: invalid data */
      }
    });

    if (isPlaying) {
      toggle.classList.add("is-playing");
      toggle.setAttribute("aria-pressed", "true");
      toggle.textContent = "Pause radio";
      openCarrierWindow(false);
      sendCommand("sync", {
        stationId: station.value,
        volume: Number(volume.value || 0.45),
      });
    } else {
      setPlaying(false);
    }
  }

  function initNavScrollState() {
    var shell = document.querySelector(".nav-shell");
    if (!shell) return;
    function sync() {
      var y = window.scrollY || document.documentElement.scrollTop;
      shell.classList.toggle("is-scrolled", y > 20);
    }
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  }

  function initPageEntrance() {
    var main = document.querySelector("main");
    if (!main) return;
    main.classList.add("page-enter");
    window.requestAnimationFrame(function () {
      main.classList.add("page-enter--active");
    });
  }

  function initStaggerReveal() {
    var groups = [
      ".directory-grid .directory-card",
      ".music-track-grid .music-track-tile",
      ".projects-grid .projects-card",
      ".writings-entries > li",
      ".journal-stream .journal-item",
      ".random-bento .random-tile",
      ".guestbook-entries .guestbook-entry"
    ];

    for (var g = 0; g < groups.length; g++) {
      var nodes = document.querySelectorAll(groups[g]);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.classList.add("stagger-in");
        n.style.setProperty("--stagger-delay", String(i * 70) + "ms");
      }
    }
  }

  function initMobileNav() {
    var shell = document.querySelector(".nav-shell");
    var nav = document.getElementById("navbar");
    if (!shell || !nav) return;
    if (shell.querySelector(".mobile-nav-toggle")) return;

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mobile-nav-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Toggle menu");
    toggle.textContent = "Menu";
    shell.appendChild(toggle);

    var overlay = document.createElement("div");
    overlay.className = "mobile-nav-overlay";
    overlay.setAttribute("hidden", "hidden");

    var panel = document.createElement("div");
    panel.className = "mobile-nav-panel";
    var list = nav.querySelector("ul");
    if (!list) return;
    panel.appendChild(list.cloneNode(true));
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function close() {
      overlay.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      window.setTimeout(function () {
        overlay.setAttribute("hidden", "hidden");
      }, 220);
    }

    function open() {
      overlay.removeAttribute("hidden");
      window.requestAnimationFrame(function () {
        overlay.classList.add("is-open");
      });
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function () {
      if (overlay.classList.contains("is-open")) close();
      else open();
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    var links = overlay.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function () {
        close();
      });
    }
  }

  function runAfterInject() {
    setPageBodyClass();
    setTabTitleSuffix();
    setCurrentPage();
    initScrollToTop();
    initLofiPlayer();
    initNavScrollState();
    initPageEntrance();
    initStaggerReveal();
    initMobileNav();
  }

  var headerPlaceholder = document.getElementById("headerPlaceholder");
  var footerPlaceholder = document.getElementById("footerPlaceholder");

  var sectionPages = ["music", "writings", "projects", "journal", "random"];
  var pathname = window.location.pathname;
  var file = pathname.split("/").pop() || "";
  var baseName = file.replace(/\.html$/, "");
  var isSectionPage = sectionPages.indexOf(baseName) !== -1;
  var headerFile = isSectionPage ? "includes/header-" + baseName + ".html" : "includes/header.html";
  var footerFile = isSectionPage ? "includes/footer-" + baseName + ".html" : "includes/footer.html";

  if (headerPlaceholder && footerPlaceholder) {
    Promise.all([
      fetch(base + headerFile).then(function (r) {
        return r.text();
      }),
      fetch(base + footerFile).then(function (r) {
        return r.text();
      }),
    ])
      .then(function (parts) {
        headerPlaceholder.outerHTML = parts[0];
        footerPlaceholder.outerHTML = parts[1];
        runAfterInject();
      })
      .catch(function () {
        runAfterInject();
      });
  } else {
    runAfterInject();
  }
})();
