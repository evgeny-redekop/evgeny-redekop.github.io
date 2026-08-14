/* ============================================================================
   sensing.js · "one quantum sensor, four things it can see"

   A 2x2 panel of small animations, one lit at a time: vortex mapping,
   thermometry, current imaging, topological magnetisation. Each panel is a
   cartoon of a measurement the nanoSQUID-on-tip actually makes, with the paper
   it came from underneath.

   Each panel is drawn in its own coordinates and declares the box that box
   holds its artwork; the fit() below maps that box into whatever stage it is
   given. So the same builders serve the deck and the standalone preview page
   (panels.html) without being written twice.

   ---------------------------------------------------------------------------
   Forked from the Episteme talk's sensing.js at 70eeb99. Deltas from upstream,
   so that a later diff stays readable:

     1. the neutrals in C emit CSS variables through a `$` key on el(), because
        var() does not resolve in an SVG presentation attribute. The colours
        that paint physical objects stay as fixed hex.
     2. the reveal gate becomes SiteAnim.gate, and `still` now also follows the
        reader's prefers-reduced-motion setting
     3. opts.cols lays the panels out 2x2 or 1x4, for the 620px breakpoint

   Everything else is upstream and should be pulled forward rather than
   rewritten.

   Options: buildSensing(hostId, { onActive: fn(i), freeze: <0-3>, still: bool,
                                   cols: 1|2 })
   One panel on its own: buildSensingPanel(i, hostElement)
   ========================================================================== */

(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // Every colour the figure uses, in one place, so a different site can retheme
  // it without reading the drawing code.
  //
  // The split: a fill that paints a physical object is a fixed hex, because the
  // sample is a lit thing and looks right on a dark card. Ink drawn on the page
  // background is a token, because #4b2e83 text on the dark card sits at 1.7:1
  // and is effectively invisible. Values carrying var() must be written through
  // el()'s `$` key.
  var C = {
    ink:     'var(--text)',
    muted:   'var(--muted)',
    accent:  'var(--anim-purple)',
    accent2: 'var(--anim-purple-soft)',
    gold:    'var(--anim-gold-ink)',
    warm:    '#b3322c',
    cool:    '#2e7d52',
    blue:    '#2f6fb5',
    film:    '#e8eef7',
    filmEdge: '#9fb0c8',
    panel:   'var(--anim-bg)',
    edge:    'var(--border)',
    stage:   '#f5f3fa',
    stageEdge: '#c9c3dc'
  };
  C.purple = C.accent;
  C.purple2 = C.accent2;

  var ACTIVE_MS = 5500;          // how long each panel holds the light
  var DIM = 0.3;                 // opacity of the three that are not lit

  // A `$` entry writes CSS declarations rather than presentation attributes.
  // Attributes do not substitute var(), so every value that has to follow the
  // site theme goes through this path. Plain hex works through it too, which is
  // why label() below can route unconditionally.
  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (k === '$') {
        for (var p in attrs.$) { n.style.setProperty(p, attrs.$[p]); }
      } else {
        n.setAttribute(k, attrs[k]);
      }
    }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }

  /* ------------------------------- drawing aids -------------------------- */

  // cold blue to hot red, for every temperature field in the figure
  function heat(t) {
    t = Math.max(0, Math.min(1, t));
    var a = [86, 132, 196], b = [196, 62, 44];
    return 'rgb(' + a.map(function (v, i) {
      return Math.round(v + (b[i] - v) * t);
    }).join(',') + ')';
  }

  function label(g, x, y, s, colour, size) {
    g.appendChild(el('text', {
      x: x, y: y, 'font-size': size || 11.5, 'font-family': 'inherit',
      $: { fill: colour || C.muted }
    }, s));
  }

  function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x))); }

  // A closed path whose dashes march, with two arrowheads riding it. sign sets
  // the direction, which is the whole point in the magnetisation panel.
  function marching(g, d, colour, sign, width) {
    var p = el('path', {
      d: d, fill: 'none', stroke: colour, 'stroke-width': width || 3,
      'stroke-dasharray': '11 7', 'stroke-linecap': 'round'
    });
    g.appendChild(p);
    var heads = [0, 1].map(function () {
      return g.appendChild(el('path', { d: 'M0,-5 L8,0 L0,5 z', fill: colour }));
    });
    var len = 0;
    return function (u) {
      if (!len) { len = p.getTotalLength(); }
      p.setAttribute('stroke-dashoffset', (-sign * len * u).toFixed(1));
      heads.forEach(function (h, i) {
        var q = ((sign > 0 ? u : 1 - u) + i * 0.5) % 1;
        var a = p.getPointAtLength(len * q);
        var b = p.getPointAtLength(len * ((q + 0.004 * sign + 1) % 1));
        var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        h.setAttribute('transform', 'translate(' + a.x.toFixed(1) + ',' + a.y.toFixed(1) +
                       ') rotate(' + ang.toFixed(1) + ')');
      });
    };
  }

  function tipMark(g) {
    var t = el('g', {});
    t.appendChild(el('circle', { cx: 0, cy: 0, r: 7, fill: 'none', stroke: C.warm, 'stroke-width': 2 }));
    t.appendChild(el('path', {
      d: 'M-11,0 H-4 M4,0 H11 M0,-11 V-4 M0,4 V11', stroke: C.warm, 'stroke-width': 1.5
    }));
    g.appendChild(t);
    return t;
  }

  /* ======================================================================
     Panel 0 · vortex mapping
     The scan and the map are the same object. The raster is a real path, so
     the arc length at which the tip reaches any point on it is known, and a
     vortex can only appear under the tip. Nothing is drawn where a vortex
     will turn up before the tip gets there: until then there is no way to
     know it is there.
     ==================================================================== */
  function buildVortex(g) {
    var d = 'M20,58 H132 C158,58 158,84 178,84 H182 C202,84 202,58 228,58 H340 ' +
            'V152 H228 C202,152 202,126 182,126 H178 C158,126 158,152 132,152 H20 Z';
    g.appendChild(el('path', { d: d, fill: C.film, stroke: C.filmEdge, 'stroke-width': 1.6 }));

    var XA = 26, XB = 334, ROWS = [72, 89, 106, 123, 140];

    var raster = 'M' + XA + ',' + ROWS[0];
    ROWS.forEach(function (y, r) {
      if (r) { raster += ' V' + y; }
      raster += ' H' + (r % 2 === 0 ? XB : XA);
    });
    var span = XB - XA, drop = ROWS[1] - ROWS[0];
    var LEN = ROWS.length * span + (ROWS.length - 1) * drop;

    var trail = g.appendChild(el('path', {
      d: raster, fill: 'none', stroke: C.warm, 'stroke-width': 1.1, opacity: 0.28,
      'stroke-dasharray': LEN, 'stroke-dashoffset': LEN
    }));

    function arrive(x, r) {                    // arc length at which the tip arrives
      var along = (r % 2 === 0) ? x - XA : XB - x;
      return (r * (span + drop) + along) / LEN;
    }

    var vs = [[84, 1], [116, 2], [180, 2], [244, 2]].map(function (v) {
      var q = el('g', { opacity: 0 });
      q.appendChild(el('circle', { cx: 0, cy: 0, r: 10, fill: C.purple2, opacity: 0.22 }));
      q.appendChild(el('circle', { cx: 0, cy: 0, r: 5, fill: C.purple }));
      g.appendChild(q);
      return { node: q, x: v[0], y: ROWS[v[1]], t: arrive(v[0], v[1]) };
    });

    var t = tipMark(g);

    return function (u) {
      var pt = trail.getPointAtLength(LEN * u);
      t.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ',' + pt.y.toFixed(1) + ')');
      t.setAttribute('opacity', u >= 0.999 ? 0 : 1);
      trail.setAttribute('stroke-dashoffset', (LEN * (1 - u)).toFixed(1));
      vs.forEach(function (v) {
        var age = u - v.t;
        var s = age < 0 ? 0 : 1 + 0.8 * Math.exp(-Math.pow(age / 0.018, 2));
        v.node.setAttribute('opacity', age < 0 ? 0 : 1);
        v.node.setAttribute('transform',
          'translate(' + v.x + ',' + v.y + ') scale(' + s.toFixed(3) + ')');
      });
    };
  }

  /* ======================================================================
     Panel 1 · thermometry
     A dumbbell, so the bar carrying the gradient is visibly a different
     object from its two reservoirs. Bath and sink start at the same
     temperature and there is nothing to see; the bath then heats and the
     gradient along the edge grows out of that, while the bulk stays at the
     sink. The edge is a real gradient whose stops are the steady-state
     profile.
     ==================================================================== */
  function buildThermo(g) {
    var X0 = 54, X1 = 306, YT = 74, YB = 116, EDGE = 8;
    var PY0 = 44, PY1 = 146, BULK = 0.02;
    var gid = 't2grad-' + (buildThermo.n = (buildThermo.n || 0) + 1);

    var defs = g.appendChild(el('defs', {}));
    var grad = el('linearGradient', {
      id: gid, x1: X0, y1: 0, x2: X1, y2: 0, gradientUnits: 'userSpaceOnUse'
    });
    var stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map(function (o) {
      var s = el('stop', { offset: o, 'stop-color': heat(0) });
      grad.appendChild(s);
      return { node: s, o: o };
    });
    defs.appendChild(grad);

    // The pads are square on the inner edge and rounded outside, and each runs
    // one pixel under the bar, which is drawn over them: no outline, no gap,
    // and no hairline of background in the seam. At the bath end the edge
    // gradient starts at exactly the bath temperature, so the only step in
    // colour there is the cold bulk, which is the claim.
    var bath = g.appendChild(el('path', {
      d: 'M' + (X0 + 1) + ',' + PY0 + ' H16 Q8,' + PY0 + ' 8,' + (PY0 + 8) +
         ' V' + (PY1 - 8) + ' Q8,' + PY1 + ' 16,' + PY1 + ' H' + (X0 + 1) + ' Z',
      fill: heat(0)
    }));
    g.appendChild(el('path', {
      d: 'M' + (X1 - 1) + ',' + PY0 + ' H344 Q352,' + PY0 + ' 352,' + (PY0 + 8) +
         ' V' + (PY1 - 8) + ' Q352,' + PY1 + ' 344,' + PY1 + ' H' + (X1 - 1) + ' Z',
      fill: heat(0)
    }));
    label(g, 8, 36, 'bath', C.warm);
    label(g, 310, 36, 'sink', C.blue);

    g.appendChild(el('rect', {
      x: X0, y: YT, width: X1 - X0, height: YB - YT, fill: heat(BULK)
    }));
    g.appendChild(el('rect', { x: X0, y: YT, width: X1 - X0, height: EDGE, fill: 'url(#' + gid + ')' }));
    g.appendChild(el('rect', { x: X0, y: YB - EDGE, width: X1 - X0, height: EDGE, fill: 'url(#' + gid + ')' }));
    label(g, 166, 99, 'bulk', '#4a6d94', 10.5);

    // hold, heat the bath, hold, cool back down, so a free-running loop is
    // seamless. In the deck the ramp stops at the hot hold (see ART.end).
    function bathT(u) {
      if (u < 0.10) { return 0; }
      if (u < 0.62) { return ease((u - 0.10) / 0.52); }
      if (u < 0.86) { return 1; }
      return 1 - ease((u - 0.86) / 0.14);
    }

    return function (u) {
      var Tb = bathT(u);
      bath.setAttribute('fill', heat(Tb));
      stops.forEach(function (s) { s.node.setAttribute('stop-color', heat(Tb * (1 - s.o))); });
    };
  }

  /* ======================================================================
     Panel 2 · current imaging
     Tesla's valvular conduit. The channel zigzags, so no straight line runs
     from one end to the other, and at each apex a loop carries straight on
     in the direction the flow was already going while the channel turns
     away. Flow from the right runs into that mouth, rounds the island, and
     comes back into the channel facing the stream behind it. Flow from the
     left meets the same mouths from behind and stays in the channel.
     ==================================================================== */
  function buildCurrent(g) {
    var Y = 104, D = 15, A = 26;
    var APEX = [[88, 1], [156, 0], [224, 1], [292, 0]];   // x, 1 = apex up

    var mainD = 'M18,' + (Y + A) + ' L88,' + (Y - A) + ' L156,' + (Y + A) +
                ' L224,' + (Y - A) + ' L292,' + (Y + A) + ' L348,' + (Y - A + 6);
    var loopD = APEX.map(function (e) {
      var xa = e[0], up = e[1];
      function P(dx, dy) { return (xa + dx) + ',' + (Y + (up ? dy : -dy)); }
      return 'M' + P(0, -A) +
             ' C' + P(-26, -48) + ' ' + P(-58, -50) + ' ' + P(-64, -26) +
             ' C' + P(-70, -4) + ' ' + P(-54, 10) + ' ' + P(-34, 0);
    });
    var all = [mainD].concat(loopD);

    all.forEach(function (d) {                 // walls first, so the joins merge
      g.appendChild(el('path', {
        d: d, fill: 'none', stroke: '#8fb0a3', 'stroke-width': D + 3.6,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }));
    });
    var paths = all.map(function (d) {
      return g.appendChild(el('path', {
        d: d, fill: 'none', stroke: '#e9f2ee', 'stroke-width': D,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }));
    });
    var main = paths[0], loops = paths.slice(1);
    var mainLen = 0, loopLen = [];

    var dots = [], loopDots = [], bursts = [];
    for (var i = 0; i < 14; i++) {
      dots.push(g.appendChild(el('circle', { r: 3.6, fill: C.cool })));
    }
    loops.forEach(function () {
      for (var k = 0; k < 5; k++) {
        loopDots.push(g.appendChild(el('circle', { r: 3.2, fill: C.warm, opacity: 0 })));
      }
    });
    APEX.forEach(function (e) {                // where the returning jet meets the stream
      bursts.push(g.appendChild(el('circle', {
        cx: e[0] - 34, cy: Y, r: 6, fill: 'none', stroke: C.warm, 'stroke-width': 2, opacity: 0
      })));
    });

    var tag = g.appendChild(el('text', {
      x: 12, y: 198, 'font-size': 12.5, 'font-weight': 700, fill: C.cool, 'font-family': 'inherit'
    }));

    return function (u) {
      if (!mainLen) {
        mainLen = main.getTotalLength();
        loopLen = loops.map(function (p) { return p.getTotalLength(); });
      }
      var fwd = u < 0.5, v = (u % 0.5) / 0.5;
      tag.textContent = fwd ? 'forward: it follows the bends and keeps going'
                            : 'reverse: each loop turns it back into the stream';
      tag.setAttribute('fill', fwd ? C.cool : C.warm);

      dots.forEach(function (d, i) {
        var q = (v * (fwd ? 1 : 0.26) + i / 14) % 1;
        var p = main.getPointAtLength(mainLen * (fwd ? q : 1 - q));
        d.setAttribute('cx', p.x.toFixed(1));
        d.setAttribute('cy', p.y.toFixed(1));
        d.setAttribute('fill', fwd ? C.cool : C.warm);
        d.setAttribute('opacity', fwd ? 1 : 0.5);
      });

      loops.forEach(function (lp, li) {
        for (var k = 0; k < 5; k++) {
          var d2 = loopDots[li * 5 + k];
          var q2 = ((fwd ? v * 0.22 : v * 1.5) + k / 5) % 1;
          var p2 = lp.getPointAtLength(loopLen[li] * q2);
          d2.setAttribute('cx', p2.x.toFixed(1));
          d2.setAttribute('cy', p2.y.toFixed(1));
          d2.setAttribute('opacity', fwd ? 0.12 : 1);
        }
        var b = bursts[li];
        if (fwd) {
          b.setAttribute('opacity', 0);
        } else {
          var ph = (v * 2.4 + li * 0.5) % 1;
          b.setAttribute('r', (5 + 9 * ph).toFixed(1));
          b.setAttribute('opacity', (0.85 * (1 - ph)).toFixed(2));
        }
      });
    };
  }

  /* ======================================================================
     Panel 3 · topological magnetisation
     The background is a ferromagnet: time reversal is already broken there
     and it carries no drawn mode. What is drawn is the topological
     contribution. One device is cut in two by a domain wall, each mode runs
     on its own domain boundary, so the outer edges run opposite ways and the
     wall they share carries both modes the same way.
     ==================================================================== */
  function buildTopo(g) {
    var X0 = 40, X1 = 320, Y0 = 64, Y1 = 162, R = 14;

    g.appendChild(el('rect', {
      x: 12, y: 40, width: 336, height: 136, rx: 6,
      fill: '#efeaf8', stroke: C.stageEdge, 'stroke-width': 1.4
    }));

    // dx slides the wall sideways so the two modes can be seen separately on
    // it; ins pulls a mode inside its own domain so the device outline stays
    // readable underneath.
    function wall(dx, y0, y1, back) {
      var c1x = 196 + dx, c2x = 162 + dx;
      return back
        ? 'C' + c2x + ',' + (y1 - 30) + ' ' + c1x + ',' + (y0 + 32) + ' ' + (176 + dx) + ',' + y0
        : 'C' + c1x + ',' + (y0 + 32) + ' ' + c2x + ',' + (y1 - 30) + ' ' + (186 + dx) + ',' + y1;
    }
    function left(dx, ins) {
      var x0 = X0 + ins, y0 = Y0 + ins, y1 = Y1 - ins, rr = R - ins * 0.5;
      return 'M' + (176 + dx) + ',' + y0 +
             ' L' + (x0 + rr) + ',' + y0 + ' Q' + x0 + ',' + y0 + ' ' + x0 + ',' + (y0 + rr) +
             ' L' + x0 + ',' + (y1 - rr) + ' Q' + x0 + ',' + y1 + ' ' + (x0 + rr) + ',' + y1 +
             ' L' + (186 + dx) + ',' + y1 + ' ' + wall(dx, y0, y1, true) + ' Z';
    }
    function right(dx, ins) {
      var x1 = X1 - ins, y0 = Y0 + ins, y1 = Y1 - ins, rr = R - ins * 0.5;
      return 'M' + (176 + dx) + ',' + y0 + ' ' + wall(dx, y0, y1, false) +
             ' L' + (x1 - rr) + ',' + y1 + ' Q' + x1 + ',' + y1 + ' ' + x1 + ',' + (y1 - rr) +
             ' L' + x1 + ',' + (y0 + rr) + ' Q' + x1 + ',' + y0 + ' ' + (x1 - rr) + ',' + y0 + ' Z';
    }

    g.appendChild(el('path', { d: left(0, 0), fill: '#d6c9f2' }));
    g.appendChild(el('path', { d: right(0, 0), fill: '#f6d8d4' }));
    g.appendChild(el('path', {                       // the device, over both
      d: 'M' + (X0 + R) + ',' + Y0 + ' L' + (X1 - R) + ',' + Y0 +
         ' Q' + X1 + ',' + Y0 + ' ' + X1 + ',' + (Y0 + R) +
         ' L' + X1 + ',' + (Y1 - R) + ' Q' + X1 + ',' + Y1 + ' ' + (X1 - R) + ',' + Y1 +
         ' L' + (X0 + R) + ',' + Y1 + ' Q' + X0 + ',' + Y1 + ' ' + X0 + ',' + (Y1 - R) +
         ' L' + X0 + ',' + (Y0 + R) + ' Q' + X0 + ',' + Y0 + ' ' + (X0 + R) + ',' + Y0 + ' Z',
      fill: 'none', stroke: '#6f6f7d', 'stroke-width': 2.2
    }));
    g.appendChild(el('text', {
      x: 104, y: 120, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700,
      fill: C.purple, 'font-family': 'inherit'
    }, 'C = +1'));
    g.appendChild(el('text', {
      x: 256, y: 120, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700,
      fill: C.warm, 'font-family': 'inherit'
    }, 'C = −1'));

    var run = [
      marching(g, left(-5, 6), C.purple, 1, 3),
      marching(g, right(5, 6), C.warm, -1, 3)
    ];
    return function (u) { run.forEach(function (f) { f(u); }); };
  }

  /* ----------------------------------------------------------------------
     Each panel's artwork box, the phase its own animation ends on, and the
     period it runs at when it loops on its own. `end` is what the deck's
     0-to-1 ramp maps onto, so a panel that is not lit sits at its finished
     state: the map complete, the bath hot, the valve jammed.
     -------------------------------------------------------------------- */
  var ART = [
    { build: buildVortex,  box: [12, 52, 336, 106], end: 1,    period: 9 },
    { build: buildThermo,  box: [8, 24, 344, 124],  end: 0.86, period: 9 },
    { build: buildCurrent, box: [12, 14, 340, 190], end: 0.9,  period: 10 },
    { build: buildTopo,    box: [10, 38, 340, 140], end: 1,    period: 5 }
  ];

  function fit(box, x, y, w, h) {
    var s = Math.min(w / box[2], h / box[3]);
    return 'translate(' + (x + (w - box[2] * s) / 2 - box[0] * s).toFixed(2) + ',' +
           (y + (h - box[3] * s) / 2 - box[1] * s).toFixed(2) + ') scale(' + s.toFixed(4) + ')';
  }

  // ---- panel geometry, in viewBox units -----------------------------------
  // A panel is a fixed size and the viewBox is derived from how many columns
  // they are laid out in, so the artwork never rescales with the column count.
  // Upstream hardcoded a 720x500 board and divided it in two.
  var M = 5, GUT = 14;
  var QW = 348, QH = 238;                         // one panel
  var SX = 16, SY = 54, SW = QW - 32, SH = 156;   // the stage inside a panel

  var PANELS = [
    { title: 'Vortex mapping',           sub: 'where flux is trapped',
      cite: 'kagome superconductor · Phys. Rev. Materials (2025)' },
    { title: 'Thermometry',              sub: 'where the heat is dissipated',
      cite: 'sub-µK at cryogenic temperature' },
    { title: 'Current imaging',          sub: 'how the current actually flows',
      cite: 'electron hydrodynamics · arXiv:2603.11175' },
    { title: 'Topological magnetisation', sub: 'domains an edge state carries',
      cite: 'fractional Chern insulators · Nature 635, 584 (2024)' }
  ];

  function origin(i, cols) {
    return {
      x: M + (i % cols) * (QW + GUT),
      y: M + Math.floor(i / cols) * (QH + GUT)
    };
  }

  // 720x500 at two columns, 358x1004 at one.
  function board(cols) {
    var rows = Math.ceil(PANELS.length / cols);
    return {
      w: 2 * M + cols * QW + (cols - 1) * GUT,
      h: 2 * M + rows * QH + (rows - 1) * GUT
    };
  }

  /* ====================================================================== */
  window.buildSensing = function buildSensing(hostId, opts) {
    opts = opts || {};
    var host = typeof hostId === 'string' ? document.getElementById(hostId) : hostId;
    if (!host || host.dataset.built) { return; }
    host.dataset.built = '1';

    var cols = opts.cols === 1 ? 1 : 2;
    var vb = board(cols);

    var svg = el('svg', {
      viewBox: '0 0 ' + vb.w + ' ' + vb.h,
      role: 'img',
      'aria-label': 'four measurements one nanoSQUID sensor makes, lit one at a time: ' +
        'mapping trapped vortices, imaging where heat is dissipated at an edge, ' +
        'imaging how current flows, and imaging the magnetic domains a topological edge state carries'
    });
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.height = 'auto';
    host.appendChild(svg);

    var frames = [], shells = [];

    PANELS.forEach(function (p, i) {
      var o = origin(i, cols);
      var g = el('g', {});
      svg.appendChild(g);

      // The shell stroke is also written every frame by light() below, so both
      // ends have to be CSS declarations. Setting it here as a style and there
      // as an attribute would let the style win and kill the lit-panel ring.
      var shell = el('rect', {
        x: o.x, y: o.y, width: QW, height: QH, rx: 11, 'stroke-width': 1.5,
        $: { fill: C.panel, stroke: C.edge }
      });
      g.appendChild(shell);

      g.appendChild(el('text', {
        x: o.x + 16, y: o.y + 26, 'font-size': 17, 'font-weight': 700,
        $: { fill: C.accent }
      }, p.title));
      g.appendChild(el('text', {
        x: o.x + 16, y: o.y + 44, 'font-size': 12.5, $: { fill: C.muted }
      }, p.sub));

      var inner = el('g', { transform: fit(ART[i].box, o.x + SX, o.y + SY, SW, SH) });
      g.appendChild(inner);
      frames.push({ fn: ART[i].build(inner), end: ART[i].end });

      g.appendChild(el('text', {
        x: o.x + 16, y: o.y + QH - 14, 'font-size': 11, $: { fill: C.gold }
      }, p.cite));

      shells.push({ group: g, shell: shell });
    });

    function light(i, u) {
      shells.forEach(function (s, k) {
        var on = k === i;
        s.group.setAttribute('opacity', on ? 1 : DIM);
        s.shell.style.setProperty('stroke', on ? C.accent2 : C.edge);
        s.shell.setAttribute('stroke-width', on ? 2.5 : 1.5);
      });
      // The three that are dark sit at their finished state, so the panel reads
      // as a completed measurement rather than a half-drawn one.
      frames.forEach(function (f, k) { f.fn(f.end * (k === i ? u : 1)); });
      if (typeof opts.onActive === 'function') { opts.onActive(i); }
    }

    var park = /[?&]sensing=([0-3])/.exec(SiteAnim.search);
    var still = opts.still || SiteAnim.still;

    if (opts.freeze !== undefined || park) {
      light(opts.freeze !== undefined ? opts.freeze : parseInt(park[1], 10), 1);
      return;
    }
    if (still) {                       // every panel finished and at full strength
      frames.forEach(function (f) { f.fn(f.end); });
      shells.forEach(function (s) { s.group.setAttribute('opacity', 1); });
      return;
    }

    light(0, 0);

    // Run only while the figure is on screen. The host div is the observed node
    // rather than the svg, because a rebuild at the breakpoint replaces the svg
    // and the observer has to outlive it.
    SiteAnim.gate(host, function (tSec) {
      var e = tSec * 1000;
      var i = Math.floor(e / ACTIVE_MS) % PANELS.length;
      light(i, Math.min(1, (e % ACTIVE_MS) / (ACTIVE_MS * 0.78)));
    });
  };

  /* ----------------------------------------------------------------------
     One panel on its own, at its full size and running its whole cycle
     rather than the deck's ramp. This is what panels.html uses to look at
     them side by side. ?u=0.4 in the URL freezes every panel at that phase,
     which is how they get checked in a headless browser.
     -------------------------------------------------------------------- */
  window.buildSensingPanel = function buildSensingPanel(i, host) {
    if (!host || host.dataset.built) { return; }
    host.dataset.built = '1';
    var art = ART[i], box = art.box;

    var svg = el('svg', { viewBox: box.join(' ') });
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.display = 'block';
    host.appendChild(svg);
    var g = el('g', {});
    svg.appendChild(g);
    var fn = art.build(g);

    var frozen = /[?&]u=([0-9.]+)/.exec(window.location.search);
    if (frozen) { fn(parseFloat(frozen[1]) % 1); return; }

    var t0 = null;
    function tick(now) {
      if (t0 === null) { t0 = now; }
      fn(((now - t0) / 1000 % art.period) / art.period);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };
}());
