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
    if (!root) return;
    var toggle = root.querySelector("[data-lofi-toggle]");
    var volume = root.querySelector("[data-lofi-volume]");
    var audio = root.querySelector("[data-lofi-audio]");
    if (!toggle || !volume || !audio) return;

    audio.volume = Number(volume.value || 0.45);

    function setPlaying(isPlaying) {
      toggle.classList.toggle("is-playing", isPlaying);
      toggle.setAttribute("aria-pressed", String(isPlaying));
      toggle.textContent = isPlaying ? "Pause lofi" : "Play lofi";
    }

    toggle.addEventListener("click", function () {
      if (audio.paused) {
        audio.play().then(function () {
          setPlaying(true);
        }).catch(function () {
          setPlaying(false);
        });
      } else {
        audio.pause();
        setPlaying(false);
      }
    });

    audio.addEventListener("ended", function () {
      setPlaying(false);
    });

    audio.addEventListener("error", function () {
      setPlaying(false);
      toggle.textContent = "Lofi offline";
    });

    volume.addEventListener("input", function () {
      var next = Number(volume.value);
      if (!Number.isNaN(next)) audio.volume = next;
    });
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
