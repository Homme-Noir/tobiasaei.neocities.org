(function () {
  var container = document.getElementById("last-played-content");
  var weeklyContainer = document.getElementById("weekly-top-tracks");
  var curatedContainer = document.getElementById("curated-playlists");
  var curatedStatus = document.getElementById("spotify-curated-status");
  if (!container) return;
  var lastfmKey;
  var lastfmUser;
  var utils = window.TAEUtils;

  function loadLastfmConfig() {
    return fetch("data/lastfm-config.json", { cache: "no-store" }).then(
      function (res) {
        if (!res.ok) throw new Error("Last.fm config unavailable");
        return res.json();
      },
    );
  }

  initCuratedPlaylists();

  /* Spectrum "Signal Analyzer" panel (js/spectrum-visualizer.js) */
  var spectrumCanvas = document.getElementById("spectrum-canvas");
  if (spectrumCanvas && window.TAE_SPECTRUM) {
    window.TAE_SPECTRUM.attach(spectrumCanvas);
  }

  loadLastfmConfig()
    .then(function (cfg) {
      lastfmKey = cfg.apiKey;
      lastfmUser = cfg.user;
      if (!lastfmKey || !lastfmUser)
        throw new Error("Last.fm config incomplete");
      return runLastfmWidgets();
    })
    .catch(function () {
      if (container) {
        container.innerHTML =
          '<p class="music-loading">Couldn’t load Last.fm configuration.</p>';
      }
      if (weeklyContainer) {
        renderWeeklyError(
          "Couldn’t load the Last.fm configuration. Check data/lastfm-config.json.",
        );
      }
    });

  function runLastfmWidgets() {
    return Promise.all([
      fetchRecentTrack()
        .then(function (t) {
          if (!t || !t.name) {
            container.innerHTML =
              '<p class="music-loading">No recent track.</p>';
            return;
          }
          var artist = t.artist && t.artist["#text"] ? t.artist["#text"] : "";
          var img = getTrackImage(t.image);
          var url = safeUrl(t.url);
          var isNowPlaying = !!(t["@attr"] && t["@attr"].nowplaying === "true");
          var status = isNowPlaying
            ? "Scrobbling now"
            : t.date && t.date["#text"]
              ? t.date["#text"]
              : "Recently played";
          var html = '<div class="music-now-card">';
          if (img)
            html +=
              '<a href="' +
              url +
              '" target="_blank" rel="noopener"><img src="' +
              img +
              '" alt="" width="120" height="120" class="music-now-art"></a>';
          html +=
            '<div class="music-now-info"><a href="' +
            url +
            '" target="_blank" rel="noopener" class="music-now-track">' +
            utils.escapeHtml(t.name) +
            "</a>";
          if (artist)
            html +=
              '<span class="music-now-artist">' +
              utils.escapeHtml(artist) +
              "</span>";
          html +=
            '<span class="music-now-status">' +
            utils.escapeHtml(status) +
            "</span>";
          html += "</div></div>";
          container.innerHTML = html;
        })
        .catch(function () {
          container.innerHTML =
            '<p class="music-loading">Couldn’t load last played.</p>';
        }),
      fetchWeeklyTopTracks()
        .then(renderWeeklyTracks)
        .catch(function () {
          renderWeeklyError("The Last.fm request failed. Try again later.");
        }),
    ]);
  }

  function renderWeeklyError(detail) {
    if (!weeklyContainer) return;
    var item = document.createElement("li");
    item.className = "music-track-tile music-track-message";

    var marker = document.createElement("span");
    marker.className = "music-track-rank";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "!";

    var message = document.createElement("span");
    message.className = "music-track-name";
    message.textContent = "Weekly tracks unavailable.";

    var hint = document.createElement("span");
    hint.className = "music-track-artist";
    hint.textContent = detail;

    item.appendChild(marker);
    item.appendChild(message);
    item.appendChild(hint);
    weeklyContainer.textContent = "";
    weeklyContainer.appendChild(item);
    utils.refreshStagger();
  }

  function fetchRecentTrack() {
    var endpoint =
      "https://ws.audioscrobbler.com/2.0/?" +
      "method=user.getrecenttracks" +
      "&user=" +
      encodeURIComponent(lastfmUser) +
      "&api_key=" +
      encodeURIComponent(lastfmKey) +
      "&limit=1&format=json";
    return jsonp(endpoint).then(function (data) {
      if (
        !data ||
        !data.recenttracks ||
        !data.recenttracks.track ||
        !data.recenttracks.track[0]
      ) {
        throw new Error("No recent tracks");
      }
      return data.recenttracks.track[0];
    });
  }

  function fetchWeeklyTopTracks() {
    var endpoint =
      "https://ws.audioscrobbler.com/2.0/?" +
      "method=user.gettoptracks" +
      "&user=" +
      encodeURIComponent(lastfmUser) +
      "&api_key=" +
      encodeURIComponent(lastfmKey) +
      "&period=7day&limit=8&format=json";
    return jsonp(endpoint).then(function (data) {
      if (data && data.error) {
        throw new Error(data.message || "Last.fm weekly tracks request failed");
      }
      if (!data || !data.toptracks || !Array.isArray(data.toptracks.track)) {
        throw new Error("Last.fm returned an invalid weekly tracks response");
      }
      if (!data.toptracks.track.length) {
        return [];
      }
      return data.toptracks.track;
    });
  }

  function renderWeeklyTracks(tracks) {
    if (!weeklyContainer) return;
    weeklyContainer.textContent = "";
    var frag = document.createDocumentFragment();
    var added = 0;
    for (var i = 0; i < tracks.length; i++) {
      var track = tracks[i];
      if (!track || !track.name) continue;
      added++;
      var artist =
        track.artist && track.artist.name
          ? track.artist.name
          : "Unknown artist";
      var plays = track.playcount ? " · " + track.playcount + " plays" : "";
      var li = document.createElement("li");
      li.className = "music-track-tile";
      var nameSpan = document.createElement("span");
      nameSpan.className = "music-track-name";
      nameSpan.textContent = track.name;
      var artistSpan = document.createElement("span");
      artistSpan.className = "music-track-artist";
      artistSpan.textContent = artist + plays;
      li.appendChild(nameSpan);
      li.appendChild(artistSpan);
      frag.appendChild(li);
    }
    if (!added) {
      var emptyLi = document.createElement("li");
      emptyLi.className = "music-track-tile music-track-message";
      var emptyName = document.createElement("span");
      emptyName.className = "music-track-name";
      emptyName.textContent = "No tracks scrobbled this week.";
      var emptyArtist = document.createElement("span");
      emptyArtist.className = "music-track-artist";
      emptyArtist.textContent = "Try again after listening to something.";
      emptyLi.appendChild(emptyName);
      emptyLi.appendChild(emptyArtist);
      frag.appendChild(emptyLi);
    }
    weeklyContainer.appendChild(frag);
    utils.refreshStagger();
  }

  function safeSpotifyPlaylistUrl(raw) {
    var s = String(raw || "").trim();
    var base = s.split("?")[0].split("#")[0];
    if (
      !/^https:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]{8,}$/i.test(base)
    )
      return "";
    return s;
  }

  function renderCuratedPlaylists(playlists) {
    if (!curatedContainer) return;
    curatedContainer.textContent = "";
    if (!playlists || !playlists.length) {
      var emptyArticle = document.createElement("article");
      emptyArticle.className = "curated-item";
      var emptyH3 = document.createElement("h3");
      emptyH3.textContent = "No eligible playlists found";
      var emptyP = document.createElement("p");
      emptyP.textContent =
        "Only playlists from my library and not made by Spotify are shown.";
      emptyArticle.appendChild(emptyH3);
      emptyArticle.appendChild(emptyP);
      curatedContainer.appendChild(emptyArticle);
      utils.refreshStagger();
      return;
    }
    var picks = getRotatingPlaylists(playlists);
    var fragment = document.createDocumentFragment();
    var added = 0;
    for (var i = 0; i < picks.length; i++) {
      var href = safeSpotifyPlaylistUrl(picks[i].url);
      if (!href) continue;
      added++;
      var article = document.createElement("article");
      article.className = "curated-item";
      var h3 = document.createElement("h3");
      var a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = picks[i].name;
      h3.appendChild(a);
      article.appendChild(h3);
      if (picks[i].description) {
        var p = document.createElement("p");
        p.textContent = picks[i].description;
        article.appendChild(p);
      }
      fragment.appendChild(article);
    }
    if (!added) {
      var invalidArticle = document.createElement("article");
      invalidArticle.className = "curated-item";
      var invalidH3 = document.createElement("h3");
      invalidH3.textContent = "No valid playlist links";
      var invalidP = document.createElement("p");
      invalidP.textContent =
        "Expected open.spotify.com/playlist/… URLs in the synced JSON.";
      invalidArticle.appendChild(invalidH3);
      invalidArticle.appendChild(invalidP);
      curatedContainer.appendChild(invalidArticle);
      utils.refreshStagger();
      return;
    }
    curatedContainer.appendChild(fragment);
    utils.refreshStagger();
  }

  function getRotatingPlaylists(pool) {
    var cycle = Math.floor(Date.now() / (3 * 24 * 60 * 60 * 1000));
    var seeded = pool.slice();
    var seedInput = "cycle:" + cycle + "|count:" + pool.length;
    for (var i = 0; i < pool.length; i++) {
      seedInput += "|" + String(pool[i].url || pool[i].name || i);
    }
    var rng = createSeededRng(hashString(seedInput));
    for (var j = seeded.length - 1; j > 0; j--) {
      var k = Math.floor(rng() * (j + 1));
      var tmp = seeded[j];
      seeded[j] = seeded[k];
      seeded[k] = tmp;
    }
    return seeded.slice(0, Math.min(3, seeded.length));
  }

  function hashString(input) {
    var h = 2166136261;
    for (var i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }

  function createSeededRng(seed) {
    var x = seed >>> 0;
    return function () {
      x += 0x6d2b79f5;
      var t = x;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function setCuratedStatus(text) {
    if (!curatedStatus) return;
    curatedStatus.textContent = text;
  }

  function initCuratedPlaylists() {
    setCuratedStatus("Loading synced playlists…");
    loadLocalCuratedFallback();
  }

  function loadLocalCuratedFallback() {
    fetch("data/spotify-playlists.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Playlist index unavailable");
        return res.json();
      })
      .then(function (all) {
        if (!Array.isArray(all)) all = [];
        var filtered = [];
        for (var i = 0; i < all.length; i++) {
          var p = all[i] || {};
          var ownerId = String(p.ownerId || p.owner_id || "")
            .trim()
            .toLowerCase();
          if (ownerId === "spotify") continue;
          var ownerName = String(p.ownerName || p.owner_name || "").trim();
          if (!ownerId && ownerName.toLowerCase().indexOf("spotify") !== -1)
            continue;
          if (p.inLibrary === false) continue;
          if (!p.name || !p.url) continue;
          filtered.push({
            name: p.name,
            url: p.url,
            description: sanitizeSpotifyDescription(p.description || ""),
          });
        }
        renderCuratedPlaylists(filtered);
        if (filtered.length) {
          setCuratedStatus("Showing synced playlists from my library.");
        } else {
          setCuratedStatus("No synced playlists from my library found yet.");
        }
      })
      .catch(function () {
        renderCuratedPlaylists([]);
        setCuratedStatus("Couldn’t load synced playlists.");
        utils.refreshStagger();
      });
  }

  function sanitizeSpotifyDescription(value) {
    if (!value) return "";
    return utils.stripHtml(value);
  }

  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var callbackName =
        "lastfmCb_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
      var script = document.createElement("script");
      var timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error("Last.fm request timed out"));
      }, 10000);

      window[callbackName] = function (data) {
        cleanup();
        resolve(data);
      };

      function cleanup() {
        window.clearTimeout(timeout);
        if (script.parentNode) script.parentNode.removeChild(script);
        try {
          delete window[callbackName];
        } catch (e) {
          window[callbackName] = undefined;
        }
      }

      script.src = url + "&callback=" + encodeURIComponent(callbackName);
      script.onerror = function () {
        cleanup();
        reject(new Error("Last.fm script load failed"));
      };
      document.body.appendChild(script);
    });
  }

  function getTrackImage(images) {
    if (!images || !images.length) return "";
    for (var i = images.length - 1; i >= 0; i--) {
      if (images[i] && images[i]["#text"])
        return images[i]["#text"].replace(/"/g, "&quot;");
    }
    return "";
  }

  function safeUrl(url) {
    var s = String(url || "").trim();
    if (s.indexOf("http://") === 0 || s.indexOf("https://") === 0)
      return s.replace(/"/g, "&quot;");
    return "https://www.last.fm/user/" + encodeURIComponent(lastfmUser);
  }
})();
