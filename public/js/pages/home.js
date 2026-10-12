(function () {
  var el = document.getElementById("neocities-visitor-count");
  var note = document.getElementById("visitor-count-note");
  var clock = document.querySelector("[data-deck-clock]");
  var uptime = document.querySelector("[data-deck-uptime]");
  var startedAt = Date.now();
  var clockFormatter = clock
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : null;

  function updateDeckClock() {
    if (clock) {
      clock.textContent = clockFormatter.format(new Date()) + " UTC";
    }
    if (uptime) {
      var total = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      var hours = Math.floor(total / 3600);
      var minutes = Math.floor((total % 3600) / 60);
      var seconds = total % 60;
      uptime.textContent =
        String(hours).padStart(2, "0") +
        ":" +
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");
    }
  }

  if (clock || uptime) {
    updateDeckClock();
    window.setInterval(updateDeckClock, 1000);
  }

  if (!el) return;

  function formatCommas(n) {
    var s = String(Math.max(0, Math.floor(Number(n)) || 0));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  fetch("data/neocities-site-stats.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("bad status");
      return res.json();
    })
    .then(function (data) {
      if (!data || data.result !== "success" || !data.info)
        throw new Error("bad payload");
      var views = data.info.views;
      if (views === undefined || views === null) throw new Error("no views");
      el.textContent = formatCommas(views);
      var gen = data.generated_at;
      el.title = gen
        ? "Neocities site views · snapshot generated " + gen
        : "Neocities site views";
      if (note && gen) {
        note.textContent =
          "Neocities site views · updated " +
          new Date(gen).toLocaleDateString();
      }
    })
    .catch(function () {
      el.textContent = "—";
      if (note) note.textContent = "Visitor count unavailable";
      el.title =
        "Could not load data/neocities-site-stats.json (run deploy or python scripts/fetch_neocities_site_stats.py).";
    });
})();
