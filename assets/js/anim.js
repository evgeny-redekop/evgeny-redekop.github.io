/* ============================================================================
   anim.js · the one mechanism the three ported figures share.

   The figures come from the Episteme talk, where each one ran only while its
   slide was the current one. Reveal keeps every section in the DOM, so an
   ungated loop would have run for the whole talk. On a scrolling page the same
   problem has a different predicate: run only while the figure is on screen.

   This file is that predicate, plus the two pieces of bookkeeping the figures
   need around it. A builder hands over a pure function of elapsed seconds and
   never touches requestAnimationFrame itself.

   The contract, obeyed by agent.js, jja.js and sensing.js:

     1. buildX(hostOrId, opts) is idempotent, guarded by dataset.built.
     2. It renders a resting frame synchronously, so a figure is never blank
        while it waits to be scrolled into view.
     3. If SiteAnim.still, it renders the finished frame and returns without
        gating: no observer, no rAF, ever.
     4. Otherwise it calls SiteAnim.gate exactly once.
     5. frame(t) is a pure function of t, which is what makes pause and resume
        free.
   ========================================================================== */

window.SiteAnim = (function () {
  'use strict';

  var search = window.location.search;
  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // One observer for the whole page rather than one per figure. rootMargin
  // starts a figure just before it is reached, so it is already moving when it
  // arrives instead of snapping into motion under the reader's eye.
  var io = null;
  function observer() {
    if (io) { return io; }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var rec = e.target.__anim;
        if (!rec) { return; }
        if (e.isIntersecting) { rec.start(); } else { rec.stop(); }
      });
    }, { rootMargin: '150px 0px', threshold: 0 });
    return io;
  }

  var SiteAnim = {

    // True when the page must hold still: the reader's OS setting, or ?still
    // for taking screenshots and for checking the static frames by hand.
    still: !!reduced || /[?&]still(&|=|$)/.test(search),

    // The query string, so each figure can read its own freeze parameter
    // (?chat=, ?jja=, ?sensing=) without repeating this lookup.
    search: search,

    /* Run `frame(tSeconds)` only while `node` is on screen.

       Elapsed time accumulates across pauses, so scrolling away and back
       resumes the cycle where it left off. The deck reset its clock on every
       start, which suits arriving at a slide deliberately; here a figure parked
       on the viewport edge would restart on every small scroll. */
    gate: function (node, frame) {
      var raf = null, t0 = null, acc = 0;

      function tick(now) {
        if (t0 === null) { t0 = now; }
        frame(acc + (now - t0) / 1000);
        raf = requestAnimationFrame(tick);
      }

      var rec = {
        start: function () {
          if (raf === null) { t0 = null; raf = requestAnimationFrame(tick); }
        },
        stop: function () {
          if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
          if (t0 !== null) { acc += (performance.now() - t0) / 1000; t0 = null; }
        }
      };

      node.__anim = rec;
      observer().observe(node);
      return rec;
    },

    // Stop a figure and forget it. Pairs with rebuild below.
    release: function (node) {
      if (node.__anim) { node.__anim.stop(); delete node.__anim; }
      observer().unobserve(node);
    },

    /* Rebuild a figure in place, used when the sensing panels change column
       count at the 620px breakpoint. The builders are dataset.built-guarded, so
       the flag has to go along with the DOM or the rebuild silently no-ops. */
    rebuild: function (node, build) {
      SiteAnim.release(node);
      node.innerHTML = '';
      delete node.dataset.built;
      build();
    }
  };

  return SiteAnim;
}());
