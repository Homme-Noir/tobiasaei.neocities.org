/**
 * Shared client helpers for data-driven pages.
 */
(function () {
  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }

  function stripHtml(value) {
    var tmp = document.createElement("div");
    tmp.innerHTML = String(value || "");
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  function parseISODate(text) {
    var value = String(text || "").trim();
    if (!value || value.toLowerCase() === "forgotten") return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";

    var y = parsed.getUTCFullYear();
    var m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    var d = String(parsed.getUTCDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function refreshStagger() {
    if (typeof window.TAE_REFRESH_STAGGER === "function") {
      window.TAE_REFRESH_STAGGER();
    }
  }

  window.TAEUtils = {
    escapeHtml: escapeHtml,
    stripHtml: stripHtml,
    parseISODate: parseISODate,
    refreshStagger: refreshStagger,
  };
})();
