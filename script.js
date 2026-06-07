/* =========================================================
   Newton ROI Calculator — logic
   ========================================================= */

(function () {
  "use strict";

  const WEEKS_PER_MONTH = 4.33;
  const FT_HIRE_PER_DAY = 127; // ~$3,800/mo full-time front-desk hire

  // Fields that have a paired range + number input
  const FIELDS = [
    "locations", "wage",
    "verifPerWeek", "minPerVerif", "verifAuto",
    "callsPerWeek", "missedPct", "newPatientValue", "callConv",
    "apptsPerWeek", "noShowPct", "apptValue", "noShowReduction",
    "costPerLoc"
  ];

  const el = (id) => document.getElementById(id);
  const num = (id) => parseFloat(el(id).value) || 0;

  /* ---------- formatting ---------- */
  const fmtMoney = (n) =>
    "$" + Math.round(n).toLocaleString("en-US");

  const fmtMoneyShort = (n) => {
    n = Math.round(n);
    if (Math.abs(n) >= 1000) return "$" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
    return "$" + n.toLocaleString("en-US");
  };

  /* ---------- pair sliders + number inputs ---------- */
  function linkPair(id) {
    const range = el(id + "-range");
    const number = el(id);
    if (!range || !number) return;

    range.addEventListener("input", () => {
      number.value = range.value;
      compute();
    });
    number.addEventListener("input", () => {
      // keep slider within its own bounds, but let the number go beyond
      const v = parseFloat(number.value);
      if (!isNaN(v)) {
        range.value = Math.min(Math.max(v, range.min), range.max);
      }
      compute();
    });
  }

  /* ---------- animated count-up ---------- */
  const animState = {};
  function animateValue(node, key, target, render) {
    const start = animState[key] !== undefined ? animState[key] : target;
    const duration = 480;
    const t0 = performance.now();

    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = start + (target - start) * eased;
      node.textContent = render(current);
      if (p < 1) requestAnimationFrame(step);
      else animState[key] = target;
    }
    animState[key] = start;
    requestAnimationFrame(step);
  }

  /* ---------- the model ---------- */
  function calc() {
    const locations = Math.max(num("locations"), 0);
    const wage = num("wage");

    // 02 — Insurance verification (labor saved)
    const verifHoursWk =
      (num("verifPerWeek") * num("minPerVerif") * (num("verifAuto") / 100)) / 60;
    const laborMo = verifHoursWk * WEEKS_PER_MONTH * wage * locations;

    // 03 — Phones & new patients (recovered missed-call revenue)
    const missedCallsWk = num("callsPerWeek") * (num("missedPct") / 100);
    const recoveredBookingsWk = missedCallsWk * (num("callConv") / 100);
    const callsMo =
      recoveredBookingsWk * WEEKS_PER_MONTH * num("newPatientValue") * locations;

    // 04 — No-shows prevented
    const noShowsWk = num("apptsPerWeek") * (num("noShowPct") / 100);
    const recoveredApptsWk = noShowsWk * (num("noShowReduction") / 100);
    const noShowMo =
      recoveredApptsWk * WEEKS_PER_MONTH * num("apptValue") * locations;

    // 05 — cost
    const costMo = num("costPerLoc") * locations;

    const gainMo = laborMo + callsMo + noShowMo;
    const netMo = gainMo - costMo;
    const hoursMo = verifHoursWk * WEEKS_PER_MONTH * locations;
    const multiple = costMo > 0 ? gainMo / costMo : 0;
    const paybackDays = gainMo > 0 ? (costMo / (gainMo / 30)) : Infinity;

    return {
      laborMo, callsMo, noShowMo, costMo,
      gainMo, netMo, hoursMo, multiple, paybackDays
    };
  }

  /* ---------- render ---------- */
  function compute() {
    const r = calc();

    // hero net
    animateValue(el("netMonthly"), "net", r.netMo, (v) =>
      Math.round(v).toLocaleString("en-US")
    );
    pop(el("netMonthly"));

    // multiple pill
    el("roiMultiple").textContent =
      (r.multiple >= 0 ? r.multiple : 0).toFixed(1) + "×";

    // annual strip
    animateValue(el("netAnnual"), "annual", r.netMo * 12, (v) => fmtMoneyShort(v));
    animateValue(el("hoursSaved"), "hours", r.hoursMo, (v) =>
      Math.round(v).toLocaleString("en-US")
    );
    const pb = Math.max(Math.round(r.paybackDays), 0);
    el("payback").textContent =
      isFinite(r.paybackDays) ? pb + (pb === 1 ? " day" : " days") : "—";

    // breakdown amounts
    animateValue(el("amtLabor"), "al", r.laborMo, fmtMoney);
    animateValue(el("amtCalls"), "ac", r.callsMo, fmtMoney);
    animateValue(el("amtNoShow"), "an", r.noShowMo, fmtMoney);
    el("amtCost").textContent = "− " + fmtMoney(r.costMo);

    // bars (relative to largest gain stream)
    const maxGain = Math.max(r.laborMo, r.callsMo, r.noShowMo, 1);
    el("barLabor").style.width = (r.laborMo / maxGain) * 100 + "%";
    el("barCalls").style.width = (r.callsMo / maxGain) * 100 + "%";
    el("barNoShow").style.width = (r.noShowMo / maxGain) * 100 + "%";

    // per-day
    el("perDay").textContent = fmtMoney(r.costMo / 30);

    // tint the net number red-ish if negative
    el("netMonthly").style.color = r.netMo < 0 ? "#ff9a9a" : "";
  }

  function pop(node) {
    node.classList.remove("pop");
    void node.offsetWidth; // reflow
    node.classList.add("pop");
  }

  /* ---------- init ---------- */
  FIELDS.forEach(linkPair);
  compute();
})();
