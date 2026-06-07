/* =========================================================
   Newton ROI Calculator — simplified (3 inputs)
   ========================================================= */
(function () {
  "use strict";

  // ---- benchmark assumptions (documented in the disclaimer) ----
  const CALLS_PER_PATIENT = 1.5;  // inbound calls per patient seen
  const DAYS_PER_MONTH     = 21;  // open ~5 days/week
  const BOOKABLE_RATE      = 0.10; // share of missed calls that are real, unrecoverable bookings
  const RECOVERY_RATE      = 0.85; // share of those Newton recaptures by answering 24/7
  const NEWTON_COST        = 848;  // "Everything" plan, per location, per month

  const el = (id) => document.getElementById(id);
  const animState = {};

  function model(patients, missedPct, value) {
    const callsDay   = patients * CALLS_PER_PATIENT;
    const missedMo   = callsDay * DAYS_PER_MONTH * (missedPct / 100);
    const bookableMo = missedMo * BOOKABLE_RATE;
    const lost       = bookableMo * value;
    const recovered  = lost * RECOVERY_RATE;
    const apptsSaved = bookableMo * RECOVERY_RATE;
    const roi        = recovered / NEWTON_COST;
    const net        = recovered - NEWTON_COST;
    return { callsDay, lost, recovered, apptsSaved, roi, net };
  }

  function animateValue(node, key, target, render) {
    const start = animState[key] !== undefined ? animState[key] : target;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / 480, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = render(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(step);
      else animState[key] = target;
    }
    animState[key] = start;
    requestAnimationFrame(step);
  }

  const int = (n) => Math.round(n).toLocaleString("en-US");
  const moneyShort = (n) => {
    n = Math.round(n);
    return Math.abs(n) >= 1000
      ? "$" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k"
      : "$" + n.toLocaleString("en-US");
  };

  function pop(node) {
    node.classList.remove("pop");
    void node.offsetWidth;
    node.classList.add("pop");
  }

  function compute() {
    const patients  = parseFloat(el("patients").value) || 0;
    const missedPct = parseFloat(el("missed").value) || 0;
    const value     = parseFloat(el("value").value) || 0;

    // live input readouts
    el("patients-out").textContent = int(patients);
    el("missed-out").textContent   = int(missedPct);
    el("value-out").textContent    = int(value);

    const r = model(patients, missedPct, value);

    el("callsDay").textContent = int(r.callsDay);

    animateValue(el("lostMo"), "lost", r.lost, int);   pop(el("lostMo"));
    el("lostYr").textContent = moneyShort(r.lost * 12);

    animateValue(el("recMo"), "rec", r.recovered, int); pop(el("recMo"));
    el("apptsSaved").textContent = int(r.apptsSaved);

    animateValue(el("roi"), "roi", r.roi, (v) => v.toFixed(1));
    el("net").textContent = (r.net < 0 ? "−$" : "$") + int(Math.abs(r.net));

    // recovery bar: recovered as a share of lost
    const pct = r.lost > 0 ? (r.recovered / r.lost) * 100 : 0;
    el("bigbarRec").style.width = pct + "%";
    el("recTag").style.color = pct > 22 ? "var(--lime)" : "var(--evergreen)";
  }

  ["patients", "missed", "value"].forEach((id) =>
    el(id).addEventListener("input", compute)
  );
  compute();
})();
