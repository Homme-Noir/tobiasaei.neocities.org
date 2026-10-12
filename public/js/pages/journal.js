(function () {
  var root = document.getElementById("journal-entries");
  if (!root) return;
  var utils = window.TAEUtils;
  var filterButtons = document.querySelectorAll(".journal-filter-btn");
  var entries = [];
  var activeFilter = "journal";

  function timestampOf(entry) {
    var value = entry && entry.datetime ? String(entry.datetime) : "";
    if (!value) return Number.NEGATIVE_INFINITY;
    var iso = utils.parseISODate(value);
    if (!iso) return Number.NEGATIVE_INFINITY;
    var ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return Number.NEGATIVE_INFINITY;
    return ms;
  }

  function visibleEntries() {
    var filtered =
      activeFilter === "all"
        ? entries.slice()
        : entries.filter(function (entry) {
            return activeFilter === "indexes"
              ? !!entry.isIndex
              : !entry.isIndex;
          });
    return filtered.sort(function (a, b) {
      return timestampOf(b) - timestampOf(a);
    });
  }

  function render() {
    var current = visibleEntries();
    if (!current.length) {
      root.innerHTML =
        '<article class="journal-item"><time class="journal-date" datetime="">Forgotten</time><div class="journal-body"><h2 class="journal-item-title">No entries</h2><p>No notes match this filter.</p></div></article>';
      return;
    }
    var html = "";
    for (var i = 0; i < current.length; i++) {
      var entry = current[i] || {};
      var datetime = entry.datetime || "Forgotten";
      var title = entry.title || "Untitled";
      var body = String(entry.content || "");
      var machineDatetime = utils.parseISODate(datetime);
      html += '<article class="journal-item">';
      if (machineDatetime) {
        html +=
          '<time class="journal-date" datetime="' +
          machineDatetime +
          '">' +
          utils.escapeHtml(datetime) +
          "</time>";
      } else {
        html +=
          '<span class="journal-date">' +
          utils.escapeHtml(datetime) +
          "</span>";
      }
      html += '<div class="journal-body">';
      html +=
        '<h2 class="journal-item-title">' + utils.escapeHtml(title) + "</h2>";
      html += '<div class="vault-text">' + utils.escapeHtml(body) + "</div>";
      html += "</div></article>";
    }
    root.innerHTML = html;
    utils.refreshStagger();
  }

  for (var i = 0; i < filterButtons.length; i++) {
    filterButtons[i].addEventListener("click", function () {
      var next = this.getAttribute("data-journal-filter") || "journal";
      activeFilter = next;
      for (var j = 0; j < filterButtons.length; j++) {
        var isActive = filterButtons[j] === this;
        filterButtons[j].classList.toggle("active", isActive);
        filterButtons[j].setAttribute(
          "aria-selected",
          isActive ? "true" : "false",
        );
      }
      render();
    });
  }

  fetch("data/vault-journal.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Journal unavailable");
      return res.json();
    })
    .then(function (data) {
      if (!Array.isArray(data)) data = [];
      entries = data;
      render();
    })
    .catch(function () {
      root.innerHTML =
        '<article class="journal-item"><time class="journal-date" datetime="">Forgotten</time><div class="journal-body"><h2 class="journal-item-title">Journal unavailable</h2><p>Vault export could not be loaded.</p></div></article>';
      utils.refreshStagger();
    });
})();
