// Minimal interactivity: footer year + dark-mode toggle (persisted).
(function () {
  // current year in footer
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // theme: respect saved choice, else system preference
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  if (saved === "dark" || saved === "light") {
    root.setAttribute("data-theme", saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }

  var btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }
})();

// Mount the three ported figures. Each builder no-ops when its host is missing,
// so this is safe on any page that does not carry all of them.
//
// The theme toggle above needs no hook here: the figures read their colours from
// CSS variables, so flipping data-theme recomputes them with no JS and without
// interrupting a running cycle.
(function () {
  if (typeof SiteAnim === "undefined") { return; }

  if (window.buildChat) { buildChat(); }
  if (window.buildArray) { buildArray(); }

  // The sensing panels are the one figure whose layout is baked into its
  // viewBox, so the column count is the only thing that forces a rebuild.
  var host = document.getElementById("sensing");
  if (host && window.buildSensing) {
    var narrow = window.matchMedia("(max-width: 620px)");
    var cols = function () { return narrow.matches ? 1 : 2; };
    var build = function () { buildSensing(host, { cols: cols() }); };
    build();

    var onChange = function () { SiteAnim.rebuild(host, build); };
    if (narrow.addEventListener) { narrow.addEventListener("change", onChange); }
    else if (narrow.addListener) { narrow.addListener(onChange); }   // Safari < 14
  }
})();
