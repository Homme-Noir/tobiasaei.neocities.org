(function () {
  var fullText = "Home of a failing bard...";
  var typed = document.getElementById("typed-line");
  var enter = document.getElementById("enter-link");
  if (!typed || !enter) return;
  function goHome() {
    window.location.assign("home.html");
  }
  enter.addEventListener("click", goHome);
  var i = 0;
  var timer = setInterval(function () {
    i += 1;
    typed.textContent = fullText.slice(0, i);
    if (i >= fullText.length) {
      clearInterval(timer);
      setTimeout(function () {
        enter.disabled = false;
        enter.classList.add("is-ready");
      }, 800);
    }
  }, 95);
})();
