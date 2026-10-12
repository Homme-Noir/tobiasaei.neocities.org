/**
 * Shared page state, radio player, and animations.
 */
(function () {
  var CURRENT_FILE = window.location.pathname.split("/").pop() || "index.html";
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
    ".guestbook-entries .guestbook-entry",
    ".deck-directory .deck-card",
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

  function runPageSetup() {
    applyPageBodyClass();
    applyTabTitleSuffix();
    initScrollToTop();
    if (window.TAE_LOFI_PLAYER && window.TAE_LOFI_PLAYER.init) {
      window.TAE_LOFI_PLAYER.init();
    }
    initPageEntrance();
    initStaggerReveal();
  }

  runPageSetup();
})();
