/* Reskin layer: applies the game name, the logo lines and the UI colours from config.js.
   theme keys are the CSS variables in css/style.css (without the leading --). */
(function () {
  var C = window.GAME_CONFIG || {};
  if (C.title) document.title = C.title;
  var logo = document.querySelector(".logo") || document.querySelector("#title h1, .title h1, h1");
  if (logo && C.titleLines && C.titleLines.length) {
    var spans = logo.querySelectorAll(":scope > span");
    for (var i = 0; i < spans.length; i++) {
      var t = C.titleLines[i];
      if (t == null || t === "") spans[i].hidden = true; else { spans[i].hidden = false; spans[i].textContent = t; }
    }
  }
  var T = C.theme;
  if (T) for (var k in T) if (T[k]) document.documentElement.style.setProperty("--" + k, T[k]);
})();
