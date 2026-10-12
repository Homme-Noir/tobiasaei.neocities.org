/* Shared floating radio player. */
(function () {
  var RADIO_STATE_KEY = "taeiRadioStateV1";
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
      return {
        stationId: station.value,
        volume: Number(volume.value || 0.45),
        isPlaying: !!playing,
      };
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

  window.TAE_LOFI_PLAYER = { init: initLofiPlayer };
})();
