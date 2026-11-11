/* QAS adaptive engine: 3PL IRT, EAP ability estimation, blueprint-constrained
   maximum-information selection with randomesque exposure control. Fixed length 20. */
(function (G) {
  const D = 1.7, C = 0.2, LENGTH = 20;
  const CATS = {
    RN: 'Rational numbers', RP: 'Ratio and proportional relationships', EX: 'Exponents', AE: 'Algebraic expressions',
    LE: 'Linear equations', LA: 'Linear applications and graphs', PS: 'Probability and sets', DS: 'Descriptive statistics',
    G1: 'Geometry concepts for Pre-Algebra', G2: 'Geometry concepts for Algebra 1'
  };
  const SHORT = { RN: 'Rational numbers', RP: 'Ratios & rates', EX: 'Exponents', AE: 'Expressions', LE: 'Linear equations', LA: 'Linear apps & graphs', PS: 'Probability & sets', DS: 'Statistics', G1: 'Geometry (pre-algebra)', G2: 'Geometry (algebra 1)' };
  // College Board QAS test specifications (number of questions per 20-question test)
  const BLUEPRINT = { RN: [1, 3], RP: [2, 3], EX: [2, 4], AE: [1, 3], LE: [1, 2], LA: [3, 4], PS: [2, 3], DS: [2, 4], G1: [1, 3], G2: [1, 2] };

  const P = (th, it) => C + (1 - C) / (1 + Math.exp(-D * it.a * (th - it.b)));
  function info(th, it) { const p = P(th, it); return (D * it.a) ** 2 * ((1 - p) / p) * ((p - C) / (1 - C)) ** 2; }

  const GRID = []; for (let i = -80; i <= 80; i++) GRID.push(i / 20);
  function eap(resp) {
    let s0 = 0, s1 = 0, s2 = 0;
    for (const th of GRID) {
      let L = Math.exp(-th * th / 2);
      for (const r of resp) { const p = P(th, r.it); L *= r.u ? p : 1 - p; }
      s0 += L; s1 += th * L; s2 += th * th * L;
    }
    const m = s1 / s0; return { theta: m, se: Math.sqrt(Math.max(s2 / s0 - m * m, 1e-9)) };
  }
  const toScore = th => Math.max(200, Math.min(300, Math.round(250 + 16 * th)));
  const BANDS = [[200, 236], [237, 249], [250, 262], [263, 275], [276, 300]];
  const bandOf = s => BANDS.findIndex(([lo, hi]) => s >= lo && s <= hi);

  function newSession(bank) {
    const counts = {}; Object.keys(BLUEPRINT).forEach(k => (counts[k] = 0));
    return { bank, used: new Set(), counts, resp: [], theta: 0, se: 1, n: 0 };
  }

  function eligible(s) {
    const left = LENGTH - s.n - 1, out = [];
    for (const it of s.bank) {
      if (s.used.has(it.id)) continue;
      if (s.counts[it.cat] + 1 > BLUEPRINT[it.cat][1]) continue;
      let need = 0;
      for (const k in BLUEPRINT) need += Math.max(0, BLUEPRINT[k][0] - (s.counts[k] + (k === it.cat ? 1 : 0)));
      if (need > left) continue;
      out.push(it);
    }
    return out;
  }

  function selectNext(s) {
    const el = eligible(s);
    if (s.n === 0) { // first question: random medium-difficulty starter
      const st = el.filter(it => it.b >= -0.6 && it.b <= 0.4);
      return st[Math.floor(Math.random() * st.length)];
    }
    // weighted-deviations flavour: information at current theta, boosted for categories still below their minimum
    const scored = el.map(it => ({ it, v: info(s.theta, it) * (s.counts[it.cat] < BLUEPRINT[it.cat][0] ? 1.25 : 1) }));
    scored.sort((a, b) => b.v - a.v);
    const top = scored.slice(0, 4); // randomesque: pick among the 4 best
    return top[Math.floor(Math.random() * top.length)].it;
  }

  function record(s, it, u, extra = {}) {
    s.used.add(it.id); s.counts[it.cat]++; s.n++;
    const pBefore = P(s.theta, it), thBefore = s.theta;
    s.resp.push({ it, u, pBefore, thBefore, ...extra });
    const e = eap(s.resp); s.theta = e.theta; s.se = e.se;
    s.resp[s.resp.length - 1].thAfter = e.theta; s.resp[s.resp.length - 1].seAfter = e.se;
    return e;
  }

  G.QAS_ENGINE = { D, C, LENGTH, CATS, SHORT, BLUEPRINT, BANDS, P, info, eap, toScore, bandOf, newSession, selectNext, record, eligible };
})(typeof window !== 'undefined' ? window : globalThis);
