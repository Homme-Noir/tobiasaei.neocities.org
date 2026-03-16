/**
 * Shared layout: inject header/footer, page state, radio, navigation, and animations.
 */
(function () {
  var PATHNAME = window.location.pathname;
  var PATH_BASE = (function () {
    var i = PATHNAME.lastIndexOf("/");
    return i === -1 ? "" : PATHNAME.substring(0, i + 1);
  })();
  var CURRENT_FILE = PATHNAME.split("/").pop() || "index.html";
  var CURRENT_PAGE = (CURRENT_FILE || "index.html").replace(/\.html$/, "") || "index";

  var HOME_TITLE = "Tobias_AEI | Home";
  var TAB_SUFFIX = " | Tobias AEI";
  var SCROLL_THRESHOLD = 300;
  var RADIO_STATE_KEY = "taeiRadioStateV1";
  var STAGGER_GROUPS = [
    ".directory-grid .directory-card",
    ".music-track-grid .music-track-tile",
    ".projects-grid .projects-card",
    ".writings-entries > li",
    ".journal-stream .journal-item",
    ".random-bento .random-tile",
    ".guestbook-entries .guestbook-entry",
  ];
  var NAV_THEME_CLASS_BY_PAGE = {
    home: "home-nav-bar",
    music: "music-nav-bar",
    writings: "writings-nav-bar",
    projects: "projects-nav-bar",
    journal: "journal-nav-bar",
    random: "random-nav-bar",
    guestbook: "home-nav-bar",
    not_found: "home-nav-bar",
  };
  var RADIO_STATIONS = [
    {
      id: "lofigirl",
      label: "SomaFM: Groove Salad",
      sources: ["https://ice1.somafm.com/groovesalad-128-mp3", "https://ice2.somafm.com/groovesalad-128-mp3"],
    },
    {
      id: "bootlegboy",
      label: "SomaFM: Illinois Street Lounge",
      sources: ["https://ice1.somafm.com/illstreet-128-mp3", "https://ice2.somafm.com/illstreet-128-mp3"],
    },
    {
      id: "chillhop",
      label: "SomaFM: Lush",
      sources: ["https://ice1.somafm.com/lush-128-mp3", "https://ice2.somafm.com/lush-128-mp3"],
    },
  ];

  function readLocalStorageJson(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function writeLocalStorageJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* no-op: storage unavailable */
    }
  }

  function rafThrottle(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        fn();
      });
    };
  }

  function applyCurrentNavState() {
    var nav = document.getElementById("navbar");
    if (!nav) return;
    var links = nav.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      var linkFile = href.split("/").pop() || href;
      if (linkFile === CURRENT_FILE) {
        a.setAttribute("aria-current", "page");
        a.classList.add("active");
      } else {
        a.removeAttribute("aria-current");
        a.classList.remove("active");
      }
    }
  }

  function applyTabTitleSuffix() {
    if (document.title === HOME_TITLE) return;
    if (document.title.indexOf(TAB_SUFFIX) !== -1) return;
    document.title = document.title + TAB_SUFFIX;
  }

  function applyPageBodyClass() {
    if (!CURRENT_PAGE || CURRENT_PAGE === "index") return;
    document.body.classList.add("page-" + CURRENT_PAGE);
  }

  function applyNavThemeClass() {
    var shell = document.querySelector(".nav-shell");
    if (!shell) return;
    for (var key in NAV_THEME_CLASS_BY_PAGE) {
      if (Object.prototype.hasOwnProperty.call(NAV_THEME_CLASS_BY_PAGE, key)) {
        shell.classList.remove(NAV_THEME_CLASS_BY_PAGE[key]);
      }
    }
    var next = NAV_THEME_CLASS_BY_PAGE[CURRENT_PAGE] || "home-nav-bar";
    shell.classList.add(next);
  }

  function initScrollToTop() {
    if (document.getElementById("scroll-to-top")) return;
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
    var sync = rafThrottle(function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      btn.classList.toggle("scroll-to-top--hidden", y <= SCROLL_THRESHOLD);
    });
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  }

  function initLofiPlayer() {
    var root = document.querySelector("[data-lofi-player]");
    if (!root) {
      root = document.createElement("div");
      root.className = "lofi-player";
      root.setAttribute("data-lofi-player", "");
      root.innerHTML =
        '<button type="button" class="lofi-toggle" data-lofi-toggle aria-pressed="false">Play radio</button>' +
        '<label class="lofi-station-wrap"><span class="sr-only">Radio station</span><select class="lofi-station" data-lofi-station aria-label="Radio station"></select></label>' +
        '<label class="lofi-volume-wrap"><span class="sr-only">Radio volume</span><input type="range" class="lofi-volume" data-lofi-volume min="0" max="1" step="0.05" value="0.45" aria-label="Radio volume" /></label>';
      document.body.appendChild(root);
    }

    var toggle = root.querySelector("[data-lofi-toggle]");
    var volume = root.querySelector("[data-lofi-volume]");
    var station = root.querySelector("[data-lofi-station]");
    if (!toggle || !volume || !station) return;

    var audio = root.querySelector("[data-lofi-audio]");
    if (!audio) {
      audio = document.createElement("audio");
      audio.setAttribute("data-lofi-audio", "");
      audio.preload = "none";
      audio.style.display = "none";
      root.appendChild(audio);
    }

    function resolveStation(id) {
      for (var i = 0; i < RADIO_STATIONS.length; i++) {
        if (RADIO_STATIONS[i].id === id) return RADIO_STATIONS[i];
      }
      return RADIO_STATIONS[0];
    }

    if (!station.options.length) {
      for (var i = 0; i < RADIO_STATIONS.length; i++) {
        var opt = document.createElement("option");
        opt.value = RADIO_STATIONS[i].id;
        opt.textContent = RADIO_STATIONS[i].label;
        station.appendChild(opt);
      }
    }

    var stored = readLocalStorageJson(RADIO_STATE_KEY) || {};
    var currentStation = resolveStation(stored.stationId);
    var desiredVolume = Number(stored.volume);
    var isPlaying = !!stored.isPlaying;

    if (Number.isNaN(desiredVolume)) desiredVolume = 0.45;
    if (desiredVolume < 0) desiredVolume = 0;
    if (desiredVolume > 1) desiredVolume = 1;

    function snapshot(playing) {
      return { stationId: station.value, volume: Number(volume.value || 0.45), isPlaying: !!playing };
    }

    function persist(playing) {
      writeLocalStorageJson(RADIO_STATE_KEY, snapshot(playing));
    }

    function setSource(stationId) {
      var next = resolveStation(stationId);
      if (station.value !== next.id) station.value = next.id;
      var src = next.sources && next.sources.length ? next.sources[0] : "";
      if (!src) return;
      if (audio.src !== src) audio.src = src;
    }

    function setVolume(nextVolume) {
      var v = Number(nextVolume);
      if (Number.isNaN(v)) v = 0.45;
      if (v < 0) v = 0;
      if (v > 1) v = 1;
      volume.value = String(v);
      audio.volume = v;
    }

    function setPlayingState(playing, isBlocked) {
      isPlaying = !!playing;
      toggle.classList.toggle("is-playing", isPlaying);
      toggle.classList.toggle("is-blocked", !!isBlocked);
      toggle.setAttribute("aria-pressed", String(isPlaying));
      if (isBlocked) {
        toggle.textContent = "Tap to resume radio";
      } else {
        toggle.textContent = isPlaying ? "Pause radio" : "Play radio";
      }
      persist(isPlaying);
    }

    function tryPlay(options) {
      var opts = options || {};
      return audio
        .play()
        .then(function () {
          setPlayingState(true, false);
        })
        .catch(function () {
          if (!opts.allowMutedBootstrap) {
            setPlayingState(false, true);
            return;
          }
          var remembered = Number(volume.value || desiredVolume || 0.45);
          if (Number.isNaN(remembered)) remembered = 0.45;
          audio.muted = true;
          audio.volume = 0;
          return audio
            .play()
            .then(function () {
              audio.muted = false;
              setVolume(remembered);
              setPlayingState(true, false);
            })
            .catch(function () {
              audio.muted = false;
              setVolume(remembered);
              setPlayingState(false, true);
            });
        });
    }

    toggle.addEventListener("click", function () {
      if (isPlaying) {
        audio.pause();
        setPlayingState(false, false);
        return;
      }
      setSource(station.value);
      setVolume(volume.value);
      tryPlay();
    });

    station.addEventListener("change", function () {
      setSource(station.value);
      if (isPlaying) {
        tryPlay();
      } else {
        persist(false);
      }
    });

    volume.addEventListener("input", function () {
      setVolume(volume.value);
      persist(isPlaying);
    });

    audio.addEventListener("ended", function () {
      setPlayingState(false, false);
    });
    audio.addEventListener("error", function () {
      setPlayingState(false, true);
    });

    setSource(currentStation.id);
    setVolume(desiredVolume);
    if (isPlaying) {
      tryPlay({ allowMutedBootstrap: true });
    } else {
      setPlayingState(false, false);
    }
  }

  function initNavScrollState() {
    var shell = document.querySelector(".nav-shell");
    if (!shell) return;
    var sync = rafThrottle(function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      shell.classList.toggle("is-scrolled", y > 20);
    });
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

  function applyStaggerReveal() {
    for (var g = 0; g < STAGGER_GROUPS.length; g++) {
      var nodes = document.querySelectorAll(STAGGER_GROUPS[g]);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.classList.add("stagger-in");
        n.style.setProperty("--stagger-delay", String(i * 70) + "ms");
      }
    }
  }

  function initStaggerReveal() {
    applyStaggerReveal();
    window.TAE_REFRESH_STAGGER = applyStaggerReveal;
  }

  function initMobileNav() {
    var shell = document.querySelector(".nav-shell");
    var nav = document.getElementById("navbar");
    if (!shell || !nav) return;
    if (shell.querySelector(".mobile-nav-toggle")) return;
    var list = nav.querySelector("ul");
    if (!list) return;

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
      links[i].addEventListener("click", close);
    }
  }

  function runAfterInject() {
    applyPageBodyClass();
    applyTabTitleSuffix();
    applyCurrentNavState();
    applyNavThemeClass();
    initScrollToTop();
    initLofiPlayer();
    initNavScrollState();
    initPageEntrance();
    initStaggerReveal();
    initMobileNav();
  }

  function injectSharedLayout() {
    var headerPlaceholder = document.getElementById("headerPlaceholder");
    var footerPlaceholder = document.getElementById("footerPlaceholder");
    if (!headerPlaceholder || !footerPlaceholder) {
      runAfterInject();
      return;
    }

    Promise.all([
      fetch(PATH_BASE + "includes/header.html").then(function (r) {
        return r.text();
      }),
      fetch(PATH_BASE + "includes/footer.html").then(function (r) {
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
  }

  injectSharedLayout();
})();
