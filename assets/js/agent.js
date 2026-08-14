/* ============================================================================
   agent.js · the transcript on the Three Voices card.

   Lifted from the Episteme talk (short.js, slide 6). One exchange from a real
   run, turn by turn: the agent reports a step, the blind referee raises
   numbered gaps, the agent concedes one and contests the other, the run stops,
   and the scientist rules. The vocabulary is the harness's own.

   Deltas from upstream, so a future diff against the talk stays readable:
     1. the reveal gate becomes SiteAnim.gate
     2. the print-pdf test becomes SiteAnim.still
   The turn data and the timing are untouched.

   Styling is .transcript in style.css. The panel keeps its dark colours in both
   site themes because it is a console, so it is the one element here that
   ignores the theme toggle.
   ========================================================================== */

(function () {
  'use strict';

  var CHAT = [
    { who: 'agent',   role: 'orch',    text: 'step 3 · T_BKT = 212 ± 8 mK' },
    { who: 'agent',   role: 'orch',    text: 'figure opened, then described' },
    { who: 'referee', role: 'skeptic', text: 'GAP A1 · window misses transition' },
    { who: 'referee', role: 'skeptic', text: 'GAP B2 · no residual panel' },
    { who: 'agent',   role: 'orch',    text: 'A1: ACCEPT, refitting 0.9–1.6 K' },
    { who: 'agent',   role: 'orch',    text: 'B2: CONTEST, line 88 draws it' },
    { who: '',        role: 'meta',    text: 'stopped, waiting for you' },
    { who: 'you',     role: 'human',   text: 'take A1. B2 stands.' },
    { who: 'agent',   role: 'out',     text: 'T_BKT = 198 ± 11 mK · recorded' }
  ];
  var TURN_MS = 1250, CHAT_HOLD_MS = 4200;

  window.buildChat = function buildChat() {
    var host = document.getElementById('chat');
    if (!host || host.dataset.built) { return; }
    host.dataset.built = '1';

    var turns = CHAT.map(function (m) {
      var d = document.createElement('div');
      d.className = 'turn ' + m.role;
      if (m.role === 'meta' || m.role === 'out') {
        d.innerHTML = '<span class="' + m.role + '">' + m.text + '</span>';
      } else {
        d.innerHTML = '<span class="who">' + m.who + '</span> ' + m.text;
      }
      d.style.opacity = 0;
      host.appendChild(d);
      return d;
    });

    function show(n) {
      turns.forEach(function (t, i) { t.style.opacity = i < n ? 1 : 0; });
    }

    var park = /[?&]chat=(\d+)/.exec(SiteAnim.search);
    if (SiteAnim.still || park) {
      show(park ? parseInt(park[1], 10) : turns.length);
      return;
    }

    // Start on the first turn rather than on nothing: arriving to a blank black
    // panel reads as a bug for the second or two before it fills.
    show(1);
    var cycle = turns.length * TURN_MS + CHAT_HOLD_MS;
    SiteAnim.gate(host, function (t) {
      var e = (t * 1000) % cycle;
      show(Math.min(turns.length, 1 + Math.floor(e / TURN_MS)));
    });
  };
}());
