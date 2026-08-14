/* ============================================================================
   jja.js · the Josephson-junction array on the dissipation card.

   Lifted from the Episteme talk (deck.js, slide 19). Geometry follows
   Device_summary.pdf panel (a): cross-shaped islands on a 2 um pitch, 300 nm
   arms, separated by 20 nm gaps. The gap is drawn far wider than scale so it is
   visible at a glance; the caption says so.

   Which gate does what comes from devices/M55D8/profile.md sections 4-5: the
   frame gate sets the coupling between islands and the top gate sets the
   conducting puddles in the plaquettes, and the two act on physically separate
   parts of the device.

   Deltas from upstream, so a future diff against the talk stays readable:
     1. el() gained a `$` key that writes CSS declarations instead of
        presentation attributes, because var() does not resolve in an attribute
     2. COL_FRAME is bound to --anim-bg rather than hardcoded white
     3. the three regime colours point at the --anim-*-ink tokens
     4. the reveal gate becomes SiteAnim.gate, and its clock becomes seconds
     5. the phase-cartoon and phase-sweep figures from the same upstream file
        are not ported
   ========================================================================== */

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  // Layout, in viewBox units. N x N islands on PITCH centres; each island is a
  // cross of total span SPAN and arm width ARM, leaving GAP between arm tips.
  // VB_W is only a little wider than the 256-unit array so the drawing is not
  // marooned in white space; the viewBox in index.html must match these two.
  var N = 3, PITCH = 88, ARM = 20, GAP = 8;
  var SPAN = PITCH - GAP;                       // 80
  var VB_W = 320, VB_H = 300;
  var X0 = (VB_W - ((N - 1) * PITCH + SPAN)) / 2 + SPAN / 2;
  var Y0 = (VB_H - ((N - 1) * PITCH + SPAN)) / 2 + SPAN / 2;

  var COL_ISLAND = '#8d8d99';
  // The frame gate patch is the colour of the figure's own background, so a
  // junction runs purple to nothing as V_f is applied: the link weakens and then
  // is not there. Evgeny's call (2026-08-08). An orange patch gave the gate a
  // colour of its own, which invited the reading that the gate is a thing
  // sitting on the device rather than the link going away.
  //
  // This is bound to the same token .anim paints its background with. If the two
  // ever drift apart the junction gaps show up as pale rectangles and the figure
  // starts claiming the link turned white.
  var COL_FRAME = 'var(--anim-bg)';
  // The puddles must not read as more metal, so they are purple rather than the
  // grey of the superconducting islands.
  var COL_PUDDLE = '#7b3fb5';
  // The weak link between two islands and the puddle inside a plaquette are the
  // same semiconductor, so they carry the same colour. Drawing the link green
  // implied a third material that is not there. What the figure separates is
  // where each gate acts, not what the regions are made of.
  var COL_LINK = COL_PUDDLE;

  // A `$` entry writes CSS declarations rather than presentation attributes.
  // Attributes do not substitute var(), so any value that has to follow the site
  // theme goes through this path.
  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) {
      if (k === '$') {
        for (var p in attrs.$) { n.style.setProperty(p, attrs.$[p]); }
      } else {
        n.setAttribute(k, attrs[k]);
      }
    }
    return n;
  }

  function centre(i) { return { x: X0 + i * PITCH, y: Y0 + i * PITCH }; }

  window.buildArray = function buildArray() {
    var svg = document.getElementById('jja');
    if (!svg || svg.dataset.built) { return; }
    svg.dataset.built = '1';

    var gIslands = document.getElementById('jja-islands');
    var gFrame = document.getElementById('jja-frame');
    var gPuddles = document.getElementById('jja-puddles');
    var gJunctions = document.getElementById('jja-junctions');

    var i, j, cx, cy;

    // --- the islands themselves: a horizontal and a vertical bar per cross ---
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        cx = centre(i).x; cy = centre(j).y;
        gIslands.appendChild(el('rect', {
          x: cx - SPAN / 2, y: cy - ARM / 2, width: SPAN, height: ARM,
          fill: COL_ISLAND, rx: 2
        }));
        gIslands.appendChild(el('rect', {
          x: cx - ARM / 2, y: cy - SPAN / 2, width: ARM, height: SPAN,
          fill: COL_ISLAND, rx: 2
        }));
      }
    }

    // --- puddles: the open square between four neighbouring islands ---------
    // Drawn under the islands, so a puddle reads as filling the plaquette.
    for (i = 0; i < N - 1; i++) {
      for (j = 0; j < N - 1; j++) {
        cx = centre(i).x; cy = centre(j).y;
        gPuddles.appendChild(el('rect', {
          'class': 'puddle',
          x: cx + ARM / 2, y: cy + ARM / 2,
          width: PITCH - ARM, height: PITCH - ARM,
          fill: COL_PUDDLE, rx: 3
        }));
      }
    }

    // --- junctions: the gap between two adjacent arm tips -------------------
    // One per neighbouring pair, horizontal and vertical.
    for (i = 0; i < N; i++) {
      for (j = 0; j < N - 1; j++) {
        // horizontal neighbours: gap sits between column j and j+1
        gJunctions.appendChild(el('rect', {
          'class': 'link',
          x: centre(j).x + SPAN / 2, y: centre(i).y - ARM / 2,
          width: GAP, height: ARM, fill: COL_LINK
        }));
        // vertical neighbours
        gJunctions.appendChild(el('rect', {
          'class': 'link',
          x: centre(i).x - ARM / 2, y: centre(j).y + SPAN / 2,
          width: ARM, height: GAP, fill: COL_LINK
        }));
      }
    }

    // --- the frame gate: exactly the junctions, and nothing else ------------
    // One patch per junction, sharing the geometry of the link rects above so
    // the two coincide to the pixel. Evgeny's call (2026-08-08): the gate acts
    // on the weak links, so the figure must show it acting there and nowhere
    // else.
    //
    // Two earlier versions both misled. Full-width strips drawn over the islands
    // tinted the crosses orange, reading as though the gate depleted the
    // islands; drawn under them the same strips still wrapped every cross in an
    // orange border, which says the gate reaches the aluminium. It does not.
    for (i = 0; i < N; i++) {
      for (j = 0; j < N - 1; j++) {
        gFrame.appendChild(el('rect', {
          x: centre(j).x + SPAN / 2, y: centre(i).y - ARM / 2,
          width: GAP, height: ARM, $: { fill: COL_FRAME }
        }));
        gFrame.appendChild(el('rect', {
          x: centre(i).x - ARM / 2, y: centre(j).y + SPAN / 2,
          width: ARM, height: GAP, $: { fill: COL_FRAME }
        }));
      }
    }

    // ---------------------------------------------------------------- wiring
    function fmtV(v) { return (v < 0.05 ? '' : '-') + v.toFixed(1) + ' V'; }

    var vfval = document.getElementById('vfval');
    var vtval = document.getElementById('vtval');
    var vfregime = document.getElementById('vfregime');
    var vtregime = document.getElementById('vtregime');
    var vfbar = document.getElementById('vfbar');
    var vtbar = document.getElementById('vtbar');
    var knobVf = document.getElementById('knob-vf');
    var knobVt = document.getElementById('knob-vt');

    var puddles = gPuddles.querySelectorAll('.puddle');
    var links = gJunctions.querySelectorAll('.link');

    function render(f, t) {
      // f, t run 0 (gate at 0 V) to 1 (gate at -3 V). The resting state of the
      // figure is f = 0, t = 1: links intact, top gate held very negative so the
      // plaquettes start empty and the array reads as a plain grid.

      // frame gate: more negative shows a stronger gate and weaker links.
      // The gate patches sit directly under the links and share their footprint,
      // so they are invisible until a link starts to fade. Bringing them to
      // solid well before f = 1 keeps the junction opaque all the way through
      // the sweep, running purple to nothing, instead of both rects going
      // transparent at once and letting the background show through at half
      // deflection.
      gFrame.setAttribute('opacity', Math.min(1, 2.2 * f).toFixed(3));
      for (var k = 0; k < links.length; k++) {
        links[k].setAttribute('opacity', (1 - f).toFixed(3));
      }

      // top gate: more negative empties the plaquette puddles
      for (var p = 0; p < puddles.length; p++) {
        puddles[p].setAttribute('opacity', (1 - t).toFixed(3));
      }

      // A bare '-' prefix renders the resting state as "-0.0 V"; sign the value
      // instead so zero prints as "0.0 V".
      vfval.textContent = fmtV(3 * f);
      vtval.textContent = fmtV(3 * t);
      vfbar.style.width = (100 * f).toFixed(1) + '%';
      vtbar.style.width = (100 * t).toFixed(1) + '%';

      if (f < 0.33) {
        vfregime.textContent = 'islands strongly linked';
        vfregime.style.color = 'var(--anim-green-ink)';
      } else if (f < 0.72) {
        vfregime.textContent = 'links weakening';
        vfregime.style.color = 'var(--anim-gold-ink)';
      } else {
        vfregime.textContent = 'islands decoupled: an insulator';
        vfregime.style.color = 'var(--anim-red-ink)';
      }

      if (t < 0.33) {
        vtregime.textContent = 'puddles present: dissipation';
        vtregime.style.color = 'var(--anim-red-ink)';
      } else if (t < 0.72) {
        vtregime.textContent = 'puddles thinning out';
        vtregime.style.color = 'var(--anim-gold-ink)';
      } else {
        vtregime.textContent = 'plaquettes depleted';
        vtregime.style.color = 'var(--anim-green-ink)';
      }

      // Dim whichever gate is not moving, so the eye is told where to look. The
      // top gate rests at t = 1, so it lights up as it comes BACK toward zero.
      knobVf.classList.toggle('active', f > 0.02);
      knobVt.classList.toggle('active', t < 0.98);
    }

    // ------------------------------------------------------------- animation
    // The figure drives itself: sweep the frame gate, return it, sweep the top
    // gate, return it, pause, repeat. The timeline is a list of
    // [duration_ms, u -> [f, t]] segments over one cycle. The opening hold on
    // the bare array was ten seconds, so the figure sat still when you arrived;
    // Evgeny cut it (2026-08-09) and the gates now move almost at once. The
    // swept states hold for long enough to register and no longer. Deliberate
    // values, not stray constants.
    //
    // The top gate starts very negative (t = 1) rather than at zero, so the
    // figure opens on a plain grid of islands and links, and its sweep RUNS BACK
    // to 0 V to fill the plaquettes with puddles. Evgeny's call (2026-08-09):
    // introducing dissipation into an empty array reads more clearly than
    // removing it from an array that already had it.
    var OPENING = 900, SETTLE = 2200;
    var SEG = [
      [OPENING, function () { return [0, 1]; } ],                    // the bare, depleted grid
      [   1900, function (u) { return [u, 1]; } ],                   // frame gate on
      [ SETTLE, function () { return [1, 1]; } ],                    // hold, swept
      [    800, function (u) { return [1 - u, 1]; } ],               // frame gate off
      [   1200, function () { return [0, 1]; } ],                    // rest between gates
      [   1900, function (u) { return [0, 1 - u]; } ],               // top gate back to zero: puddles fill in
      [ SETTLE, function () { return [0, 0]; } ],                    // hold, dissipation on
      [    800, function (u) { return [0, u]; } ]                    // top gate back to -3 V
    ];
    var CYCLE = SEG.reduce(function (a, s) { return a + s[0]; }, 0);

    // Ease so the sweep starts and stops smoothly rather than jerking.
    function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }

    // Freeze instead of animating when the figure has to hold still: a reader
    // who asked for reduced motion, and "?jja=<f>,<t>" for grabbing a particular
    // state or for checking that each gate acts only on its own part of the
    // device.
    if (SiteAnim.still) {
      render(0.6, 0.6);                 // both effects visible at once on the page
      return;
    }
    var frozen = /[?&]jja=([\d.]+),([\d.]+)/.exec(SiteAnim.search);
    if (frozen) {
      render(parseFloat(frozen[1]), parseFloat(frozen[2]));
      return;
    }

    render(0, 1);

    SiteAnim.gate(svg, function (tSec) {
      var e = (tSec * 1000) % CYCLE;
      for (var s = 0; s < SEG.length; s++) {
        if (e < SEG[s][0]) {
          var v = SEG[s][1](ease(e / SEG[s][0]));
          render(v[0], v[1]);
          break;
        }
        e -= SEG[s][0];
      }
    });
  };
}());
