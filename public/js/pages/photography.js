(function () {
  var grid = document.querySelector("[data-photography-grid]");
  var empty = document.querySelector("[data-photography-empty]");
  if (!grid || !empty) return;

  function showEmpty(message) {
    empty.textContent = message;
    empty.hidden = false;
  }

  fetch("data/photography.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("Could not load the photo catalog.");
      return response.json();
    })
    .then(function (photos) {
      if (!Array.isArray(photos)) {
        throw new Error("The photo catalog must contain a list.");
      }

      var validPhotos = photos.filter(function (photo) {
        return (
          photo &&
          typeof photo.src === "string" &&
          photo.src.indexOf("photos/") === 0 &&
          photo.src.split("/").indexOf("..") === -1 &&
          typeof photo.alt === "string" &&
          photo.alt.trim()
        );
      });

      if (!validPhotos.length) {
        showEmpty(
          "No photographs yet. Add images to the photos/ folder and list them in data/photography.json.",
        );
        return;
      }

      empty.hidden = true;
      validPhotos.forEach(function (photo) {
        var figure = document.createElement("figure");
        figure.className = "photography-card";

        var image = document.createElement("img");
        image.src = photo.src;
        image.alt = photo.alt;
        image.loading = "lazy";
        image.decoding = "async";
        figure.appendChild(image);

        if (typeof photo.caption === "string" && photo.caption.trim()) {
          var caption = document.createElement("figcaption");
          caption.className = "photography-caption";
          caption.textContent = photo.caption;
          figure.appendChild(caption);
        }

        grid.appendChild(figure);
      });
    })
    .catch(function (error) {
      showEmpty(error.message);
    });
})();
