/**
 * Shared layout: inject header/footer, current page, breadcrumbs, tab title suffix, scroll-to-top.
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

  function insertBreadcrumbs() {
    var main = document.querySelector("main");
    if (!main) return;
    var pathname = window.location.pathname;
    var file = pathname.split("/").pop() || "";
    var raw = file.replace(/\.html$/, "");
    if (!raw || raw === "index" || raw === "home") return;
    var title = raw
      .split("_")
      .map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");
    var existing = document.querySelector(".breadcrumb");
    if (existing) existing.remove();
    var nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Breadcrumb");
    nav.className = "breadcrumb";
    nav.innerHTML =
      '<a href="' +
      base +
      'home.html">Home</a> <span aria-hidden="true">/</span> <span>' +
      escapeHtml(title) +
      "</span>";
    main.insertBefore(nav, main.firstChild);
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
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

  function runAfterInject() {
    setPageBodyClass();
    setTabTitleSuffix();
    setCurrentPage();
    insertBreadcrumbs();
    initScrollToTop();
    initLofiPlayer();
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
