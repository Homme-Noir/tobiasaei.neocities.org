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
  var CURRENT_PAGE =
    (CURRENT_FILE || "index.html").replace(/\.html$/, "") || "index";

  var HOME_TITLE = "Dreamless_Boy | Home";
  var TAB_SUFFIX = " | Dreamless_Boy";
  var SCROLL_THRESHOLD = 300;
  var STAGGER_GROUPS = [
    ".music-track-grid .music-track-tile",
    ".projects-grid .projects-card",
    ".writings-entries > li",
    ".journal-stream .journal-item",
    ".random-bento .random-tile",
  ];

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
    if (
      document.title.indexOf(TAB_SUFFIX) !== -1 ||
      document.title.indexOf("Dreamless_Boy") !== -1 ||
      document.title.indexOf("Dreamless Boy") !== -1
    )
      return;
    document.title = document.title + TAB_SUFFIX;
  }

  function applyPageBodyClass() {
    if (!CURRENT_PAGE || CURRENT_PAGE === "index") return;
    document.body.classList.add("page-" + CURRENT_PAGE);
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
        if (!overlay.classList.contains("is-open")) {
          overlay.setAttribute("hidden", "hidden");
        }
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
    initScrollToTop();
    if (window.TAE_LOFI_PLAYER && window.TAE_LOFI_PLAYER.init) {
      window.TAE_LOFI_PLAYER.init();
    }
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
      fetch(PATH_BASE + "includes/header.html", { cache: "no-store" }).then(
        function (r) {
          if (!r.ok) throw new Error("Could not load the site header.");
          return r.text();
        },
      ),
      fetch(PATH_BASE + "includes/footer.html", { cache: "no-store" }).then(
        function (r) {
          if (!r.ok) throw new Error("Could not load the site footer.");
          return r.text();
        },
      ),
    ])
      .then(function (parts) {
        headerPlaceholder.outerHTML = parts[0];
        footerPlaceholder.outerHTML = parts[1];
        runAfterInject();
      })
      .catch(function (error) {
        console.error("Could not load the shared site layout.", error);
        runAfterInject();
      });
  }

  injectSharedLayout();
})();
