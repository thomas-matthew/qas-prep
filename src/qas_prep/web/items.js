/* QAS practice item bank: original, parametric question templates.
   Each template: id, cat (blueprint category), b (IRT difficulty, theta scale), a (discrimination), calc (calculator allowed), gen() -> {q, choices, ans, exp}
   Difficulty levels are keyed to the Skills Insight score bands:
   b ~ -1.6 -> 200-236, ~ -0.6 -> 237-249, ~ 0.2..0.5 -> 250-262, ~ 0.8..1.1 -> 263-275, ~ 1.6..1.9 -> 276-300 */
(function (G) {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const riNZ = (a, b) => { let v; do { v = ri(a, b); } while (v === 0); return v; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const sample = (a, k) => shuffle(a).slice(0, k);
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
  const MINUS = '−';
  function n(x) {
    if (typeof x === 'string') return x;
    if (Math.abs(x) < 1e-12) x = 0;
    const s = Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 4 });
    return (x < 0 ? MINUS : '') + s;
  }
  function money(x) { return (x < 0 ? MINUS : '') + '$' + Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  const par = x => (x < 0 ? `(${n(x)})` : n(x));
  const fracHTML = (top, bot) => `<span class="fr"><span class="nu">${top}</span><span class="de">${bot}</span></span>`;

  class F {
    constructor(p, q = 1) { if (q === 0) throw new Error('zero denominator'); if (q < 0) { p = -p; q = -q; } const g = gcd(p, q); this.p = p / g; this.q = q / g; }
    add(o) { o = toF(o); return new F(this.p * o.q + o.p * this.q, this.q * o.q); }
    sub(o) { o = toF(o); return new F(this.p * o.q - o.p * this.q, this.q * o.q); }
    mul(o) { o = toF(o); return new F(this.p * o.p, this.q * o.q); }
    div(o) { o = toF(o); return new F(this.p * o.q, this.q * o.p); }
    neg() { return new F(-this.p, this.q); }
    val() { return this.p / this.q; }
    html() { if (this.q === 1) return n(this.p); return (this.p < 0 ? MINUS : '') + fracHTML(n(Math.abs(this.p)), n(this.q)); }
    mixed() {
      if (this.q === 1 || Math.abs(this.p) < this.q) return this.html();
      const w = Math.trunc(this.p / this.q), r = Math.abs(this.p % this.q);
      return n(w) + ' ' + fracHTML(r, this.q);
    }
  }
  const toF = x => (x instanceof F ? x : new F(x, 1));
  const fr = (p, q) => new F(p, q).html();
  const X = '<i>x</i>', Y = '<i>y</i>';
  const sup = (b, e) => `${b}<sup>${e}</sup>`;
  const sqrtH = s => `√<span class="rad">${s}</span>`;
  function lin(m, b, x = X) {
    m = toF(m); b = toF(b); let s = '';
    if (m.p !== 0) { const am = new F(Math.abs(m.p), m.q); s = (m.p < 0 ? MINUS : '') + (am.p === 1 && am.q === 1 ? '' : am.html()) + x; }
    if (b.p !== 0) { const ab = new F(Math.abs(b.p), b.q); s = s ? s + (b.p < 0 ? ' − ' : ' + ') + ab.html() : (b.p < 0 ? MINUS : '') + ab.html(); }
    return s || '0';
  }
  const eqLine = (m, b) => `${Y} = ${lin(m, b)}`;
  const pt = (x, y) => `(${n(x)}, ${n(y)})`;
  const setStr = arr => arr.length ? '{' + arr.slice().sort((a, b) => a - b).map(n).join(', ') + '}' : '∅';
  const union = (A, B) => [...new Set([...A, ...B])];
  const inter = (A, B) => A.filter(x => B.includes(x));
  const minus = (A, B) => A.filter(x => !B.includes(x));

  function mc(correct, ds, fill) {
    const out = [correct];
    for (const d of ds) { if (d != null && !out.includes(d)) out.push(d); if (out.length === 4) break; }
    let g = 0;
    while (out.length < 4) {
      if (!fill || g++ > 300) throw new Error('not enough distractors');
      const d = fill(); if (d != null && !out.includes(d)) out.push(d);
    }
    const choices = shuffle(out);
    return { choices, ans: choices.indexOf(correct) };
  }
  function mcN(c, ds, fmt = n, step) {
    const st = step || (Number.isInteger(c) ? Math.max(1, Math.round(Math.abs(c) * 0.08)) : 0.1);
    return mc(fmt(c), ds.filter(d => Number.isFinite(d)).map(fmt), () => fmt(+(c + riNZ(-4, 4) * st).toFixed(4)));
  }

  /* ---------- small SVG figures ---------- */
  function gridSVG({ points = [], lines = [] }) {
    const R = 6, cell = 20, pad = 16, W = pad * 2 + cell * R * 2;
    const px = x => pad + (x + R) * cell, py = y => pad + (R - y) * cell;
    let s = `<svg class="fig" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" role="img" aria-label="Coordinate plane"><defs><clipPath id="gclip"><rect x="${pad}" y="${pad}" width="${cell * 12}" height="${cell * 12}"/></clipPath></defs>`;
    for (let i = -R; i <= R; i++) {
      s += `<line class="gl" x1="${px(i)}" y1="${py(-R)}" x2="${px(i)}" y2="${py(R)}"/><line class="gl" x1="${px(-R)}" y1="${py(i)}" x2="${px(R)}" y2="${py(i)}"/>`;
    }
    s += `<line class="ax" x1="${px(-R)}" y1="${py(0)}" x2="${px(R)}" y2="${py(0)}"/><line class="ax" x1="${px(0)}" y1="${py(-R)}" x2="${px(0)}" y2="${py(R)}"/>`;
    for (let i = -R; i <= R; i += 2) if (i !== 0) {
      s += `<text class="tk" x="${px(i)}" y="${py(0) + 13}" text-anchor="middle">${n(i)}</text><text class="tk" x="${px(0) - 5}" y="${py(i) + 4}" text-anchor="end">${n(i)}</text>`;
    }
    s += `<text class="tk it" x="${px(R) - 2}" y="${py(0) - 5}" text-anchor="end">x</text><text class="tk it" x="${px(0) + 6}" y="${py(R) + 10}">y</text>`;
    for (const l of lines) s += `<line class="pl" clip-path="url(#gclip)" x1="${px(-R - 1)}" y1="${py(l.m * (-R - 1) + l.b)}" x2="${px(R + 1)}" y2="${py(l.m * (R + 1) + l.b)}"/>`;
    for (const p of points) s += `<circle class="pp" cx="${px(p.x)}" cy="${py(p.y)}" r="4.5"/><text class="pt" x="${px(p.x) + 7}" y="${py(p.y) - 7}">${p.label}</text>`;
    return s + '</svg>';
  }
  function barSVG(labels, series, yMax, step, names, hist) {
    const W = 380, H = 230, L = 40, B = 34, T = 14, Rr = 10, ch = H - B - T, cw = W - L - Rr;
    const y = v => T + ch - (v / yMax) * ch;
    let s = `<svg class="fig" viewBox="0 0 ${W} ${H + (names ? 22 : 0)}" width="${W}" height="${H + (names ? 22 : 0)}" role="img" aria-label="Bar graph">`;
    for (let v = 0; v <= yMax; v += step) s += `<line class="gl" x1="${L}" y1="${y(v)}" x2="${W - Rr}" y2="${y(v)}"/><text class="tk" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    const gw = cw / labels.length, k = series.length, bw = hist ? gw : Math.min(28, (gw * 0.7) / k);
    labels.forEach((lab, i) => {
      const gx = L + gw * i + (gw - bw * k) / 2;
      series.forEach((ser, j) => { const v = ser[i]; s += `<rect class="bar${j + 1}" x="${gx + j * bw}" y="${y(v)}" width="${bw - 2}" height="${ch + T - y(v)}"/>`; });
      s += `<text class="tk" x="${L + gw * i + gw / 2}" y="${H - B + 16}" text-anchor="middle">${lab}</text>`;
    });
    s += `<line class="ax" x1="${L}" y1="${T + ch}" x2="${W - Rr}" y2="${T + ch}"/>`;
    if (names) names.forEach((nm, j) => { const lx = L + j * 110; s += `<rect class="bar${j + 1}" x="${lx}" y="${H + 4}" width="12" height="12"/><text class="tk" x="${lx + 17}" y="${H + 14}">${nm}</text>`; });
    return s + '</svg>';
  }
  function boxSVG(v, lo, hi, step) {
    const W = 400, H = 110, L = 20, Rr = 20, x = t => L + ((t - lo) / (hi - lo)) * (W - L - Rr), yc = 42;
    let s = `<svg class="fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Box plot">`;
    for (let t = lo; t <= hi; t += step) s += `<line class="gl" x1="${x(t)}" y1="12" x2="${x(t)}" y2="76"/><text class="tk" x="${x(t)}" y="94" text-anchor="middle">${t}</text>`;
    s += `<line class="ax" x1="${x(lo)}" y1="76" x2="${x(hi)}" y2="76"/>`;
    s += `<line class="pl" x1="${x(v[0])}" y1="${yc}" x2="${x(v[1])}" y2="${yc}"/><line class="pl" x1="${x(v[3])}" y1="${yc}" x2="${x(v[4])}" y2="${yc}"/>`;
    s += `<line class="pl" x1="${x(v[0])}" y1="${yc - 10}" x2="${x(v[0])}" y2="${yc + 10}"/><line class="pl" x1="${x(v[4])}" y1="${yc - 10}" x2="${x(v[4])}" y2="${yc + 10}"/>`;
    s += `<rect class="box" x="${x(v[1])}" y="${yc - 18}" width="${x(v[3]) - x(v[1])}" height="36"/><line class="pl" x1="${x(v[2])}" y1="${yc - 18}" x2="${x(v[2])}" y2="${yc + 18}"/>`;
    return s + '</svg>';
  }
  function tableHTML(head, rows) {
    return `<table class="dt"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th>${c}</th>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  const BANK = [];
  const T = (id, cat, b, gen, o = {}) => BANK.push({ id, cat, b, a: o.a || 1.2, calc: !!o.calc, gen });

  /* ===== Rational numbers ===== */
  T('RN1', 'RN', -1.6, () => {
    const a = riNZ(-9, 9), b = -ri(2, 7), c = ri(2, 6), val = a - b * c;
    return { q: `What is the value of ${n(a)} − (${n(b)}) × ${c}?`, ...mcN(val, [(a - b) * c, a + b * c, -a - b * c]),
      exp: `Multiply first: (${n(b)}) × ${c} = ${n(b * c)}. Then ${n(a)} − (${n(b * c)}) = ${n(a)} + ${n(-b * c)} = ${n(val)}.` };
  }, { a: 1.1 });
  T('RN2', 'RN', -0.6, () => {
    let a, b; do { a = ri(2, 12); b = ri(2, 12); } while (a === b);
    const c = ri(2, 9);
    return { q: `Which of the following is equivalent to ${fracHTML(`${MINUS}${a} − (${MINUS}${b})`, c)}?`, ...mc(fr(b - a, c), [fr(-a - b, c), fr(a - b, c), fr(a + b, c)]),
      exp: `Subtracting a negative is the same as adding: ${MINUS}${a} − (${MINUS}${b}) = ${MINUS}${a} + ${b} = ${n(b - a)}. Then divide by ${c}: ${n(b - a)} ÷ ${c}${gcd(b - a, c) > 1 ? `, which simplifies to ${fr(b - a, c)}` : ` = ${fr(b - a, c)}`}.` };
  });
  T('RN3', 'RN', 0.1, () => {
    const t0 = -ri(3, 14), up = ri(8, 22), dn = ri(6, 20), ans = t0 + up - dn;
    return { q: `At 6 a.m. the temperature was ${n(t0)}°F. By noon it had risen ${up}°F. By midnight it had dropped ${dn}°F from the noon temperature. What was the temperature at midnight?`,
      ...mcN(ans, [t0 - up + dn, t0 + up + dn, -t0 + up - dn], x => n(x) + '°F'),
      exp: `Noon: ${n(t0)} + ${up} = ${n(t0 + up)}°F. Midnight: ${n(t0 + up)} − ${dn} = ${n(ans)}°F.` };
  });
  T('RN4', 'RN', 1.8, () => {
    const a = ri(1, 9), b = a + ri(3, 12), d = ri(-6, 4), e = d + ri(2, 7), c = ri(2, 4);
    const ans = Math.abs(a - b) - c * Math.abs(d - e);
    return { q: `What is the value of |${n(a)} − ${n(b)}| − ${c}|${n(d)} − ${par(e)}|?`,
      ...mcN(ans, [(a - b) - c * (d - e), Math.abs(a - b) + c * Math.abs(d - e), Math.abs((a - b) - c * (d - e))]),
      exp: `Evaluate inside each absolute value first: |${n(a - b)}| = ${b - a} and |${n(d)} − ${par(e)}| = |${n(d - e)}| = ${e - d}. Then ${b - a} − ${c} × ${e - d} = ${n(ans)}.` };
  }, { a: 1.3 });
  T('RN5', 'RN', 1.0, () => {
    const q = pick([2, 3, 4, 5, 6]), p = ri(1, q - 1), s = pick([3, 4, 5, 8]), r = ri(1, s - 1), t = ri(2, 6);
    const A = new F(p, q), B = new F(r, s), ans = A.add(B.mul(t));
    return { q: `What is the value of ${A.html()} + ${B.html()} × ${t}?`,
      ...mc(ans.html(), [A.add(B).mul(t).html(), A.add(B.div(t)).html(), A.mul(t).add(B).html()], () => ans.add(new F(riNZ(-3, 3), A.q * B.q)).html()),
      exp: `Multiply before adding: ${B.html()} × ${t} = ${B.mul(t).html()}. Then ${A.html()} + ${B.mul(t).html()} = ${ans.html()}.` };
  });

  /* ===== Ratio and proportional relationships ===== */
  T('RP1', 'RP', -0.9, () => {
    const k = pick([4, 5, 6, 8, 10, 12]), u = ri(25, 240) / 100, P = +(k * u).toFixed(2), item = pick(['pens', 'notebooks', 'markers', 'granola bars', 'batteries']);
    return { q: `A store sells a pack of ${k} ${item} for ${money(P)}. What is the price per item?`,
      ...mcN(u, [+(k / P).toFixed(2), +(u * 2).toFixed(2), +(P / (k + 2)).toFixed(2)], money, 0.05),
      exp: `The price for ${k} ${item} is ${money(P)}. To find the price of one, divide the total by the number of items: ${money(P)} ÷ ${k}. The result is ${money(u)} per item. Check: ${k} × ${money(u)} = ${money(P)}.` };
  });
  T('RP2', 'RP', -0.4, () => {
    const c = pick([{ f: 'kilometers', t: 'meters', k: 1000, s: '1 kilometer = 1,000 meters', what: 'A walking trail is' },
      { f: 'kilograms', t: 'grams', k: 1000, s: '1 kilogram = 1,000 grams', what: 'A bag of rice weighs' },
      { f: 'liters', t: 'milliliters', k: 1000, s: '1 liter = 1,000 milliliters', what: 'A water jug holds' },
      { f: 'meters', t: 'centimeters', k: 100, s: '1 meter = 100 centimeters', what: 'A ribbon is' }]);
    const x = ri(12, 95) / 10, ans = +(x * c.k).toFixed(4);
    return { q: `${c.what} ${n(x)} ${c.f}. How many ${c.t} is that? (${c.s})`,
      ...mcN(ans, [ans / 10, +(x / c.k).toFixed(4), ans * 10]),
      exp: `${c.s}, so each ${c.f.slice(0, -1)} is ${n(c.k)} ${c.t}. Converting from a larger unit to a smaller one means multiplying. ${n(x)} × ${n(c.k)} = ${n(ans)} ${c.t}.` };
  });
  T('RP3', 'RP', 0.1, () => {
    const cq = pick([2, 3, 4]), cups = new F(ri(cq + 1, cq * 3), cq), k = pick([8, 12, 16]);
    let m; do { m = pick([20, 24, 30, 36, 40]); } while (m % k === 0);
    const ans = cups.mul(new F(m, k));
    return { q: `A recipe uses ${cups.mixed()} cups of flour to make ${k} muffins. At this rate, how many cups of flour are needed to make ${m} muffins?`,
      ...mc(ans.mixed(), [cups.mul(new F(k, m)).mixed(), ans.add(new F(1, cq)).mixed(), cups.add(new F(m - k, k)).mixed()], () => ans.add(new F(riNZ(-4, 4), 2 * cq)).mixed()),
      exp: `The recipe makes ${k} muffins, and you need ${m}. The scale factor is ${m} ÷ ${k} = ${fr(m, k)}. Multiply the flour by that factor: ${cups.html()} × ${fr(m, k)} = ${ans.html()}. As a mixed number, that is ${ans.mixed()} cups.` };
  });
  T('RP4', 'RP', 0.4, () => {
    let s, m; do { s = ri(36, 84); m = pick([15, 20, 40, 45, 50, 75, 90, 100]); } while ((s * m) % 60 !== 0);
    const h = ri(2, 5), d = s * h, ans = (s * m) / 60;
    return { q: `A train travels ${n(d)} miles in ${h} hours at a constant speed. At that speed, how many miles does it travel in ${m} minutes?`,
      ...mcN(ans, [s * m, (d * m) / 60, +((s * m) / 100).toFixed(1)]),
      exp: `Speed = ${n(d)} ÷ ${h} = ${s} miles per hour. ${m} minutes = ${fr(m, 60)} hour. Distance = ${s} × ${fr(m, 60)} = ${n(ans)} miles.` };
  }, { calc: true });
  T('RP5', 'RP', 1.1, () => {
    const g = ri(3, 12), h = pick([1, 2, 3]), ans = Math.round(g * 60 * h * 3.79);
    return { q: `Water flows from a hose at a rate of ${g} gallons per minute. To the nearest liter, how many liters of water flow from the hose in ${h} hour${h > 1 ? 's' : ''}? (1 gallon ≈ 3.79 liters)`,
      ...mcN(ans, [Math.round(g * h * 3.79), Math.round((g * 60 * h) / 3.79), g * 60 * h]),
      exp: `${h} hour${h > 1 ? 's' : ''} = ${60 * h} minutes, so ${g} × ${60 * h} = ${n(g * 60 * h)} gallons. Then ${n(g * 60 * h)} × 3.79 ≈ ${n(ans)} liters.` };
  }, { calc: true, a: 1.3 });
  T('RP6', 'RP', 0.3, () => {
    const P = ri(4, 16) * 10, pct = pick([10, 15, 20, 25, 30, 40]), Q = +(P * (1 - pct / 100)).toFixed(2);
    return { q: `The price of a jacket was reduced from ${money(P)} to ${money(Q)}. By what percent was the price reduced?`,
      ...mcN(pct, [Math.round(((P - Q) / Q) * 100), Math.round(P - Q), 100 - pct], x => n(x) + '%'),
      exp: `The decrease is ${money(P)} − ${money(Q)} = ${money(P - Q)}. Divide by the original price: ${money(P - Q)} ÷ ${money(P)} = ${n(pct / 100)} = ${pct}%.` };
  }, { calc: true });

  /* ===== Exponents ===== */
  T('EX1', 'EX', -0.6, () => {
    const a = ri(3, 9), s = ri(2, 12), b = s * s, ans = a * a - s;
    return { q: `What is the value of ${sup(a, 2)} − ${sqrtH(b)}?`, ...mcN(ans, [2 * a - s, a * a - b, a * a + s]),
      exp: `${sup(a, 2)} = ${a * a} and ${sqrtH(b)} = ${s}. So ${a * a} − ${s} = ${n(ans)}.` };
  });
  T('EX2', 'EX', 0.1, () => {
    const a = ri(2, 5), b = ri(2, 5), c = ri(2, 4), e = (a + b) * c;
    const f = k => sup(X, k);
    return { q: `Which of the following is equivalent to (${f(a)} · ${f(b)})<sup>${c}</sup>?`,
      ...mc(f(e), [f(a + b + c), f(a * b * c), f(a + b * c)], () => f(e + riNZ(-4, 4))),
      exp: `When multiplying powers with the same base, add exponents: ${f(a)} · ${f(b)} = ${f(a + b)}. A power of a power multiplies exponents: (${f(a + b)})<sup>${c}</sup> = ${f(e)}.` };
  });
  T('EX3', 'EX', 0.5, () => {
    const a = pick([1.2, 1.5, 2, 2.5, 3, 4, 6]), b = pick([1.5, 2, 2.5, 3, 4, 5]), m = ri(2, 7), k = ri(2, 6);
    const prod = +(a * b).toFixed(4); let coef = prod, e = m + k; const norm = prod >= 10; if (norm) { coef = +(prod / 10).toFixed(4); e += 1; }
    const sci = (c, ex) => `${n(c)} × ${sup(10, ex)}`;
    return { q: `Which of the following is equal to (${sci(a, m)})(${sci(b, k)})?`,
      ...mc(sci(coef, e), [sci(coef, m * k), norm ? sci(coef, m + k) : sci(coef, e + 1), sci(+(a + b).toFixed(2), e)], () => sci(coef, e + riNZ(-3, 3))),
      exp: `Multiply the numbers: ${n(a)} × ${n(b)} = ${n(prod)}. Add the exponents: 10<sup>${m}</sup> × 10<sup>${k}</sup> = 10<sup>${m + k}</sup>.` + (norm ? ` Because ${n(prod)} is 10 or more, rewrite it as ${n(coef)} × 10, giving ${sci(coef, e)}.` : '') };
  });
  T('EX4', 'EX', 0.9, () => {
    const a = ri(2, 5), k = ri(2, 3), neg = Math.random() < 0.5, base = neg ? `(${MINUS}${a})` : `${a}`;
    const sign = neg && k % 2 ? -1 : 1, pw = a ** k;
    return { q: `What is the value of ${base}<sup>${MINUS}${k}</sup>?`,
      ...mc(fr(sign, pw), [fr(-sign, pw), n(-sign * pw), n(sign * pw)], () => fr(sign, a * k + riNZ(-2, 2) + 3)),
      exp: `A negative exponent means take the reciprocal: ${base}<sup>${MINUS}${k}</sup> = 1 / ${base}<sup>${k}</sup>. Evaluate the positive power: ${base}<sup>${k}</sup> = ${n(sign * pw)}${neg ? (k % 2 ? ' (an odd power of a negative number stays negative)' : ' (an even power of a negative number is positive)') : ''}. So the value is 1 / ${n(sign * pw)} = ${fr(sign, pw)}.` };
  });
  T('EX5', 'EX', 1.6, () => {
    const [base, p, q] = pick([[8, 2, 3], [27, 2, 3], [16, 3, 4], [32, 2, 5], [64, 2, 3], [81, 3, 4], [25, 3, 2], [9, 3, 2], [4, 3, 2], [16, 3, 2], [125, 2, 3], [8, 4, 3], [4, 5, 2], [36, 3, 2], [49, 3, 2], [100, 3, 2], [32, 3, 5], [16, 5, 4], [1000, 2, 3]]);
    const root = Math.round(base ** (1 / q)), val = root ** p, neg = Math.random() < 0.4;
    const ans = neg ? fr(1, val) : n(val);
    const rootName = q === 2 ? 'square' : q === 3 ? 'cube' : q + 'th';
    return { q: `What is the value of ${base}<sup>${neg ? MINUS : ''}${p}/${q}</sup>?`,
      ...mc(ans, [n(+((base * p) / q).toFixed(2)), n(root * p), neg ? n(val) : fr(1, val)], () => n(val + riNZ(-5, 5))),
      exp: `The denominator ${q} means take the ${rootName} root: the ${rootName} root of ${base} is ${root}. Then raise it to the power ${p}: ${root}<sup>${p}</sup> = ${val}.` + (neg ? ` The negative exponent means take the reciprocal, so the value is ${fr(1, val)}.` : '') };
  }, { a: 1.3 });
  T('EX6', 'EX', 1.0, () => {
    const k = ri(2, 6), m = pick([2, 3, 5, 6, 7]), N = k * k * m;
    return { q: `Which of the following is equivalent to ${sqrtH(N)}?`,
      ...mc(`${k}${sqrtH(m)}`, [`${m}${sqrtH(k)}`, `${k * k}${sqrtH(m)}`, `${k}${sqrtH(k * m)}`], () => `${ri(2, 9)}${sqrtH(pick([2, 3, 5, 6, 7]))}`),
      exp: `Factor out the largest perfect square: ${N} = ${k * k} × ${m}. Since ${sqrtH(k * k)} = ${k}, ${sqrtH(N)} = ${k}${sqrtH(m)}.` };
  });

  /* ===== Algebraic expressions ===== */
  T('AE1', 'AE', -0.5, () => {
    const p = ri(2, 4), q = ri(2, 7), c = riNZ(-9, 9), a = ri(2, 5), ans = p * a * a + q * a + c;
    const cs = c < 0 ? ` − ${-c}` : ` + ${c}`;
    return { q: `What is the value of ${p}${sup(X, 2)} − ${q}${X}${cs} when ${X} = ${MINUS}${a}?`,
      ...mcN(ans, [-p * a * a + q * a + c, p * a * a - q * a + c, (p * a) ** 2 + q * a + c]),
      exp: `Substitute ${X} = ${MINUS}${a}: ${p}(${MINUS}${a})<sup>2</sup> − ${q}(${MINUS}${a})${cs} = ${p * a * a} + ${q * a}${cs} = ${n(ans)}. Remember (${MINUS}${a})<sup>2</sup> is positive.` };
  });
  T('AE2', 'AE', -1.2, () => {
    const m = ri(2, 9), k = ri(2, 12), N = '<i>n</i>', v = ri(1, 3);
    let phrase, c, ds;
    let exp;
    if (v === 1) { phrase = `${k} less than ${m} times a number ${N}`; c = `${m}${N} − ${k}`; ds = [`${k} − ${m}${N}`, `${m}(${N} − ${k})`, `${m}${N} + ${k}`];
      exp = `“${m} times a number ${N}” is ${m}${N}. “${k} less than” something means start with that thing and subtract ${k}. So the expression is ${c}. Watch the order: ${k} − ${m}${N} would mean “${m}${N} less than ${k}.”`; }
    else if (v === 2) { phrase = `the product of ${m} and the sum of a number ${N} and ${k}`; c = `${m}(${N} + ${k})`; ds = [`${m}${N} + ${k}`, `${m} + ${N} + ${k}`, `${N}(${m} + ${k})`];
      exp = `“The sum of a number ${N} and ${k}” is (${N} + ${k}). “The product of ${m} and” that sum multiplies the whole sum by ${m}. Parentheses keep the sum together: ${c}.`; }
    else { phrase = `${k} more than the quotient of a number ${N} and ${m}`; c = `${fracHTML(N, m)} + ${k}`; ds = [`${fracHTML(m, N)} + ${k}`, fracHTML(`${N} + ${k}`, m), fracHTML(N, `${m} + ${k}`)];
      exp = `“The quotient of ${N} and ${m}” is ${N} divided by ${m}: ${fracHTML(N, m)}. “${k} more than” that quotient adds ${k} after dividing. So the expression is ${c}.`; }
    return { q: `Which expression represents “${phrase}”?`, ...mc(c, ds), exp };
  }, { a: 1.0 });
  T('AE3', 'AE', 0.2, () => {
    const a = ri(2, 6), b = ri(1, 9), c = ri(1, 7), d = riNZ(-9, 9), ds = d < 0 ? `− ${-d}` : `+ ${d}`;
    const ans = lin(a + c, a * b + d);
    return { q: `Which of the following is equivalent to ${a}(${X} + ${b}) + ${c}${X} ${ds}?`,
      ...mc(ans, [lin(a + c, b + d), lin(a + c, a * b), lin(a * c, a * b + d)], () => lin(a + c, a * b + d + riNZ(-5, 5))),
      exp: `Distribute: ${a}${X} + ${a * b}. Combine like terms: (${a} + ${c})${X} + (${a * b} ${ds}) = ${ans}.` };
  });
  T('AE4', 'AE', 0.9, () => {
    const Fe = pick([25, 40, 50, 75, 99]), M = pick([19, 24, 30, 35, 45]), Tt = pick([15, 20, 25, 40]), mv = '<i>m</i>', sv = '<i>s</i>';
    return { q: `A gym charges a one-time sign-up fee of $${Fe} plus $${M} per month. Personal training sessions cost $${Tt} each. Which expression gives the total cost, in dollars, of a membership for ${mv} months that includes ${sv} training sessions?`,
      ...mc(`${Fe} + ${M}${mv} + ${Tt}${sv}`, [`(${Fe} + ${M})${mv} + ${Tt}${sv}`, `${Fe}${mv} + ${M} + ${Tt}${sv}`, `${Fe} + (${M} + ${Tt})${mv}${sv}`]),
      exp: `The fee is paid once (${Fe}), the monthly charge is ${M} for each of ${mv} months (${M}${mv}), and each session is ${Tt} (${Tt}${sv}). Add them.` };
  });
  T('AE5', 'AE', 1.7, () => {
    const fx = '<i>f</i>(<i>x</i>)', t = '<i>t</i>';
    if (Math.random() < 0.5) {
      const k = ri(1, 20), a = ri(3, 9), v = a * a - k;
      return { q: `The function <i>f</i> is defined by ${fx} = ${sup(X, 2)} − ${k}. If <i>f</i>(${t}) = ${n(v)} and ${t} > 0, what is the value of ${t}?`,
        ...mcN(a, [v + k, v * v - k, 2 * a]), exp: `Set ${sup(t, 2)} − ${k} = ${n(v)}, so ${sup(t, 2)} = ${v + k}. The positive solution is ${t} = ${a}.` };
    }
    const c = ri(1, 9), a = ri(3, 7), v = 2 ** a + c;
    return { q: `The function <i>f</i> is defined by ${fx} = 2<sup><i>x</i></sup> + ${c}. If <i>f</i>(${t}) = ${v}, what is the value of ${t}?`,
      ...mcN(a, [(v - c) / 2, v - c, a + 1]), exp: `Set 2<sup><i>t</i></sup> + ${c} = ${v}, so 2<sup><i>t</i></sup> = ${v - c} = 2<sup>${a}</sup>. So ${t} = ${a}.` };
  }, { a: 1.3 });

  /* ===== Linear equations ===== */
  T('LE1', 'LE', -1.4, () => {
    const a = ri(2, 9), x = riNZ(-9, 9), b = riNZ(-15, 15), c = a * x + b;
    return { q: `What value of ${X} satisfies ${lin(a, b)} = ${n(c)}?`,
      ...mcN(x, [Number.isInteger((c + b) / a) ? (c + b) / a : NaN, -x, c - b]),
      exp: `${b < 0 ? 'Add ' + -b + ' to' : 'Subtract ' + b + ' from'} both sides: ${a}${X} = ${n(c - b)}. Divide by ${a}: ${X} = ${n(x)}.` };
  }, { a: 1.1 });
  T('LE2', 'LE', 0.0, () => {
    const a = ri(3, 7), c = ri(1, a - 1), b = ri(1, 6), x = riNZ(-8, 8), d = a * (x - b) - c * x;
    return { q: `What value of ${X} satisfies ${a}(${X} − ${b}) = ${lin(c, d)}?`,
      ...mc(n(x), [new F(d + b, a - c).html(), new F(d - a * b, a - c).html(), n(-x)], () => n(x + riNZ(-4, 4))),
      exp: `Distribute: ${a}${X} − ${a * b} = ${lin(c, d)}. Collect ${X}-terms: ${a - c}${X} = ${n(d + a * b)}. So ${X} = ${n(x)}.` };
  });
  T('LE3', 'LE', 0.8, () => {
    let p, q; do { p = ri(2, 6); q = ri(2, 6); } while (p === q);
    const k = ri(1, 9), ans = new F(k * p * q, p + q);
    return { q: `What value of ${X} satisfies ${fracHTML(X, p)} + ${fracHTML(X, q)} = ${k}?`,
      ...mc(ans.html(), [new F(k * (p + q)).html(), new F(k * (p + q), p * q).html(), new F(k, p + q).html()], () => new F(k * p * q + riNZ(-3, 3), p + q).html()),
      exp: `The denominators are ${p} and ${q}. Multiply every term by ${p * q} to clear the fractions: ${q}${X} + ${p}${X} = ${k * p * q}. Combine like terms: ${p + q}${X} = ${k * p * q}. Divide both sides by ${p + q}: ${X} = ${ans.html()}.` };
  });
  T('LE4', 'LE', 0.5, () => {
    const a = ri(2, 6), s = riNZ(-7, 7), b = riNZ(-12, 12), c = b - a * s, op = pick(['>', '<', '≥', '≤']);
    const flip = { '>': '<', '<': '>', '≥': '≤', '≤': '≥' }[op];
    return { q: `Which of the following describes all solutions of ${lin(-a, b)} ${op} ${n(c)}?`,
      ...mc(`${X} ${flip} ${n(s)}`, [`${X} ${op} ${n(s)}`, `${X} ${flip} ${n(-s)}`, `${X} ${op} ${n(-s)}`]),
      exp: `${b < 0 ? 'Add ' + -b + ' to' : 'Subtract ' + b + ' from'} both sides: ${MINUS}${a}${X} ${op} ${n(c - b)}. Dividing by a negative number reverses the inequality: ${X} ${flip} ${n(s)}.` };
  });
  T('LE5', 'LE', 0.6, () => {
    const x = riNZ(-6, 8), y = riNZ(-6, 8), a = ri(2, 5), S = x + y, Tt = a * x - y;
    return { q: `<span class="sys">${X} + ${Y} = ${n(S)}<br>${a}${X} − ${Y} = ${n(Tt)}</span>What is the value of ${X} in the solution to the system of equations above?`,
      ...mcN(x, [y, Number.isInteger((S + Tt) / a) ? (S + Tt) / a : NaN, S - Tt]),
      exp: `Add the two equations to eliminate ${Y}: ${a + 1}${X} = ${n(S + Tt)}, so ${X} = ${n(x)}. (Then ${Y} = ${n(y)}.)` };
  });

  /* ===== Linear applications and graphs ===== */
  T('LA1', 'LA', -1.8, () => {
    let x, y; do { x = riNZ(-5, 5); y = riNZ(-5, 5); } while (Math.abs(x) === Math.abs(y));
    return { q: `${gridSVG({ points: [{ x, y, label: 'P' }] })}What are the coordinates of point <i>P</i> in the <i>xy</i>-plane above?`,
      ...mc(pt(x, y), [pt(y, x), pt(-x, y), pt(x, -y)]),
      exp: `Move ${Math.abs(x)} unit${Math.abs(x) > 1 ? 's' : ''} ${x > 0 ? 'right' : 'left'} along the <i>x</i>-axis, then ${Math.abs(y)} ${y > 0 ? 'up' : 'down'}. The <i>x</i>-coordinate comes first: ${pt(x, y)}.` };
  }, { a: 1.0 });
  T('LA2', 'LA', -0.7, () => {
    const m = riNZ(-5, 5), c = riNZ(-10, 10), eq = `${Y} = ${lin(m, c)}`;
    if (Math.random() < 0.5) {
      const k = riNZ(-6, 6), ans = m * k + c;
      return { q: `For the equation ${eq}, what is the value of ${Y} when ${X} = ${n(k)}?`, ...mcN(ans, [m * (k + c), m * k - c, k + c]),
        exp: `Replace ${X} with ${n(k)} in the equation. ${Y} = ${n(m)}(${n(k)}) ${c < 0 ? '− ' + -c : '+ ' + c} = ${n(m * k)} ${c < 0 ? '− ' + -c : '+ ' + c}. So ${Y} = ${n(ans)}.` };
    }
    const xv = riNZ(-6, 6), yv = m * xv + c;
    return { q: `For the equation ${eq}, what is the value of ${X} when ${Y} = ${n(yv)}?`, ...mcN(xv, [m * yv + c, -xv, yv - c]),
      exp: `Replace ${Y} with ${n(yv)}: ${n(yv)} = ${lin(m, c)}. ${c < 0 ? 'Add ' + -c + ' to' : 'Subtract ' + c + ' from'} both sides: ${n(yv - c)} = ${n(m)}${X}. Divide both sides by ${n(m)}: ${X} = ${n(xv)}.` };
  });
  T('LA3', 'LA', -0.6, () => {
    const c = pick([
      { s: (f, r) => `A taxi company charges a ${money(f)} pickup fee plus ${money(r)} per mile.`, v: 'm', what: 'a ride of <i>m</i> miles', f: [2.5, 3, 3.5, 4], r: [1.75, 2.25, 2.5, 3] },
      { s: (f, r) => `A plumber charges a ${money(f)} service fee plus ${money(r)} per hour of work.`, v: 'h', what: '<i>h</i> hours of work', f: [45, 60, 75], r: [55, 70, 85] },
      { s: (f, r) => `A phone plan costs ${money(f)} per month plus ${money(r)} for each gigabyte of data used.`, v: 'g', what: 'a month in which <i>g</i> gigabytes are used', f: [20, 25, 30], r: [4, 5, 7.5] }]);
    const f = pick(c.f), r = pick(c.r), V = `<i>${c.v}</i>`, C = '<i>C</i>';
    return { q: `${c.s(f, r)} Which equation gives the total cost ${C}, in dollars, for ${c.what}?`,
      ...mc(`${C} = ${n(r)}${V} + ${n(f)}`, [`${C} = ${n(f)}${V} + ${n(r)}`, `${C} = ${n(f + r)}${V}`, `${C} = ${n(r)}${V} − ${n(f)}`], () => `${C} = ${n(r)}${V} + ${n(f + pick([1, 2, 5, 10]))}`),
      exp: `The one-time fee of ${n(f)} dollars is paid once, no matter how much is used. The rate is ${n(r)} dollars for each unit, so the variable part is ${n(r)}${V}. Add them: ${C} = ${n(r)}${V} + ${n(f)}.` };
  });
  T('LA4', 'LA', 0.0, () => {
    let x1, y1, x2, y2;
    do { x1 = ri(-6, 6); y1 = ri(-6, 6); x2 = ri(-6, 6); y2 = ri(-6, 6); } while (x1 === x2 || y1 === y2 || Math.abs(y2 - y1) === Math.abs(x2 - x1) || x1 + x2 === 0);
    const m = new F(y2 - y1, x2 - x1);
    return { q: `What is the slope of the line that passes through the points ${pt(x1, y1)} and ${pt(x2, y2)}?`,
      ...mc(m.html(), [new F(x2 - x1, y2 - y1).html(), m.neg().html(), new F(y2 + y1, x2 + x1).html()], () => new F(m.p + riNZ(-3, 3), m.q).html()),
      exp: `Use slope = (<i>y</i>₂ − <i>y</i>₁) ÷ (<i>x</i>₂ − <i>x</i>₁). Change in ${Y}: ${n(y2)} − ${y1 < 0 ? '(' + n(y1) + ')' : n(y1)} = ${n(y2 - y1)}. Change in ${X}: ${n(x2)} − ${x1 < 0 ? '(' + n(x1) + ')' : n(x1)} = ${n(x2 - x1)}. Slope = ${n(y2 - y1)} ÷ ${x2 - x1 < 0 ? '(' + n(x2 - x1) + ')' : n(x2 - x1)} = ${m.html()}.` };
  });
  T('LA5', 'LA', 0.3, () => {
    let b, p, q; do { b = riNZ(-6, 6); p = riNZ(-5, 5); q = riNZ(-8, 8); } while (q === b);
    const m = new F(q - b, p);
    return { q: `In the <i>xy</i>-plane, a line crosses the <i>y</i>-axis at ${pt(0, b)} and passes through the point ${pt(p, q)}. Which equation represents the line?`,
      ...mc(eqLine(m, b), [eqLine(new F(b), m), eqLine(new F(m.q, m.p), b), eqLine(m, -b)], () => eqLine(m.add(riNZ(-2, 2)), b)),
      exp: `The <i>y</i>-intercept is ${n(b)}. Slope = (${n(q)} − ${par(b)}) ÷ (${n(p)} − 0) = ${m.html()}. So ${eqLine(m, b)}.` };
  });
  T('LA6', 'LA', 0.4, () => {
    let m, c; do { m = riNZ(-4, 5); c = riNZ(-8, 8); } while (m === c);
    const x0 = ri(-2, 1), st = pick([1, 2]), xs = [0, 1, 2, 3].map(i => x0 + i * st), ys = xs.map(x => m * x + c);
    const m2 = m + 1 === 0 ? m + 2 : m + 1;
    return { q: `${tableHTML(['<i>x</i>', '<i>y</i>'], xs.map((x, i) => [n(x), n(ys[i])]))}Which equation represents the linear relationship between ${X} and ${Y} shown in the table?`,
      ...mc(eqLine(m, c), [eqLine(c, m), eqLine(m2, ys[0] - m2 * xs[0]), eqLine(-m, c)], () => eqLine(m, c + riNZ(-3, 3))),
      exp: `Each time ${X} increases by ${st}, ${Y} changes by ${n(m * st)}, so the slope is ${n(m)}. Using the point ${pt(xs[0], ys[0])}: ${n(ys[0])} = ${n(m)}(${n(xs[0])}) + <i>b</i>, so <i>b</i> = ${n(c)}. Check every row, not only the first.` };
  });
  T('LA7', 'LA', 0.9, () => {
    const ctx = pick([
      () => { const A = ri(16, 32) * 1000, B = ri(8, 25) * 100; return { intro: `The equation <i>V</i> = ${n(A)} − ${n(B)}<i>t</i> models the value <i>V</i>, in dollars, of a car <i>t</i> years after it was purchased.`, A, B,
        cA: ['The value of the car, in dollars, when it was purchased', `The amount, in dollars, that the car's value decreases each year`, 'The value of the car, in dollars, after <i>t</i> years', 'The number of years until the car is worth $0'] }; },
      () => { const A = ri(30, 90) * 10, B = ri(5, 20); return { intro: `The equation <i>W</i> = ${n(A)} − ${B}<i>m</i> models the number of gallons of water <i>W</i> left in a tank <i>m</i> minutes after it starts draining.`, A, B,
        cA: ['The number of gallons in the tank before it starts draining', 'The number of gallons that drain out each minute', 'The number of minutes it takes the tank to empty', 'The number of gallons left after <i>m</i> minutes'] }; },
      () => { const A = ri(10, 60) * 10, B = ri(15, 60); return { intro: `The equation <i>S</i> = ${n(A)} + ${B}<i>w</i> models the amount <i>S</i>, in dollars, in Maya's savings account <i>w</i> weeks after she starts saving.`, A, B,
        cA: ['The amount, in dollars, in the account when she starts saving', 'The amount, in dollars, she adds each week', 'The number of weeks she has been saving', 'The total amount, in dollars, after <i>w</i> weeks'] }; }])();
    const askA = Math.random() < 0.7, num = askA ? ctx.A : ctx.B;
    const correct = askA ? ctx.cA[0] : ctx.cA[1];
    return { q: `${ctx.intro} What does the number ${n(num)} represent in this equation?`, ...mc(correct, ctx.cA.filter(x => x !== correct)),
      exp: askA ? `The number without a variable is the amount when time is 0. So ${n(ctx.A)} is the starting amount, the <i>y</i>-intercept. The other number, ${n(ctx.B)}, is how much the amount changes per unit of time.` : `The number multiplied by the time variable is the rate of change, the slope. So ${n(ctx.B)} is how much the amount changes for each unit of time. The other number, ${n(ctx.A)}, is the starting amount.` };
  });
  T('LA8', 'LA', 1.1, () => {
    let m, b0, p, q, bl; do { m = riNZ(-4, 4); b0 = riNZ(-9, 9); p = riNZ(-5, 5); q = riNZ(-9, 9); bl = q - m * p; } while (bl === b0 || q + m * p === bl);
    return { q: `Line ℓ is parallel to the line ${eqLine(m, b0)} and passes through the point ${pt(p, q)}. Which equation represents line ℓ?`,
      ...mc(eqLine(m, bl), [eqLine(m, b0), eqLine(m, q + m * p), eqLine(new F(-1, m), new F(q).add(new F(p, m)))], () => eqLine(m, bl + riNZ(-4, 4))),
      exp: `Parallel lines have the same slope, ${n(m)}. Substitute the point: ${n(q)} = ${n(m)}(${n(p)}) + <i>b</i>, so <i>b</i> = ${n(bl)}. Line ℓ is ${eqLine(m, bl)}.` };
  });
  T('LA9', 'LA', 1.8, () => {
    const m = pick([-4, -3, -2, 2, 3, 4]), k = riNZ(-3, 3), p = m * k, q = riNZ(-8, 8), b0 = riNZ(-9, 9), sp = new F(-1, m);
    return { q: `Line <i>k</i> is perpendicular to the line ${eqLine(m, b0)} and passes through the point ${pt(p, q)}. Which equation represents line <i>k</i>?`,
      ...mc(eqLine(sp, q + k), [eqLine(new F(1, m), q - k), eqLine(-m, q + m * p), eqLine(m, q - m * p)], () => eqLine(sp, q + k + riNZ(-3, 3))),
      exp: `A perpendicular slope is the negative reciprocal: ${sp.html()}. Substitute the point: ${n(q)} = ${sp.html()}(${n(p)}) + <i>b</i> = ${n(-k)} + <i>b</i>, so <i>b</i> = ${n(q + k)}.` };
  }, { a: 1.3 });
  T('LA10', 'LA', 0.5, () => {
    let m, c; do { m = riNZ(-3, 3); c = riNZ(-4, 4); } while (m === c);
    return { q: `${gridSVG({ lines: [{ m, b: c }] })}Which equation represents the line shown in the <i>xy</i>-plane above?`,
      ...mc(eqLine(m, c), [eqLine(-m, c), eqLine(m, -c), eqLine(c, m)], () => eqLine(m + riNZ(-2, 2), c)),
      exp: `The line crosses the <i>y</i>-axis at ${pt(0, c)}, so the <i>y</i>-intercept is ${n(c)}. Moving 1 unit right, the line goes ${m > 0 ? 'up' : 'down'} ${Math.abs(m)}, so the slope is ${n(m)}.` };
  });
  T('LA11', 'LA', 0.8, () => {
    const A = pick([12, 14, 15, 18, 20]), C = pick([6, 7, 8, 9, 10]), x = ri(20, 90), y = ri(20, 90), N = x + y, R = A * x + C * y;
    return { q: `A theater sold ${N} tickets to a show for a total of $${n(R)}. Adult tickets cost $${A} each and child tickets cost $${C} each. How many adult tickets were sold?`,
      ...mcN(x, [y, Math.round(N / 2), Math.round(R / A)]),
      exp: `Let <i>a</i> = adult tickets and <i>c</i> = child tickets. <i>a</i> + <i>c</i> = ${N} and ${A}<i>a</i> + ${C}<i>c</i> = ${n(R)}. Substitute <i>c</i> = ${N} − <i>a</i>: ${A - C}<i>a</i> + ${n(C * N)} = ${n(R)}, so <i>a</i> = ${x}.` };
  }, { calc: true });

  /* ===== Probability and sets ===== */
  T('PS1', 'PS', -1.5, () => {
    const cnt = { red: ri(2, 9), blue: ri(2, 9), green: ri(2, 9) }, tot = cnt.red + cnt.blue + cnt.green, col = pick(['red', 'blue', 'green']), k = cnt[col];
    const other = pick(['red', 'blue', 'green'].filter(c => c !== col));
    return { q: `A bag contains ${cnt.red} red, ${cnt.blue} blue, and ${cnt.green} green marbles. One marble is chosen at random. What is the probability that it is ${col}?`,
      ...mc(fr(k, tot), [fr(k, tot - k), fr(1, 3), fr(cnt[other], tot)], () => fr(ri(1, tot - 1), tot)),
      exp: `Count all the marbles: ${cnt.red} + ${cnt.blue} + ${cnt.green} = ${tot}. ${k} of them are ${col}. Probability = favorable ÷ total = ${fr(k, tot)}${gcd(k, tot) > 1 ? ', after simplifying' : ''}.` };
  }, { a: 1.0 });
  T('PS2', 'PS', 0.3, () => {
    if (Math.random() < 0.5) {
      const s = pick([3, 4, 5, 6, 8, 9, 10, 11]), w = 6 - Math.abs(s - 7);
      return { q: `Two fair six-sided dice are rolled. What is the probability that the sum of the numbers rolled is ${s}?`,
        ...mc(fr(w, 36), [fr(1, 11), fr(w, 12), fr(w + 1, 36)], () => fr(ri(1, 9), 36)),
        exp: `There are 6 × 6 = 36 equally likely outcomes. ${w} of them have a sum of ${s}, so the probability is ${fr(w, 36)}.` };
    }
    const side = pick(['heads', 'tails']), gt = Math.random() < 0.5, k = gt ? ri(1, 4) : ri(3, 6), w = gt ? 6 - k : k - 1, ev = (gt ? 'greater than ' : 'less than ') + k;
    return { q: `A fair coin is flipped and a fair six-sided die is rolled. What is the probability of getting ${side} and a number ${ev}?`,
      ...mc(fr(w, 12), [fr(w, 6), fr(w + 1, 12), fr(1, 2)], () => fr(ri(1, 11), 12)),
      exp: `P(${side}) = ${fr(1, 2)}. P(${ev}) = ${fr(w, 6)}. The events are independent, so multiply: ${fr(1, 2)} × ${fr(w, 6)} = ${fr(w, 12)}.` };
  });
  T('PS3', 'PS', 0.9, () => {
    const t = pick([{ r: ['Juniors', 'Seniors'], c: ['Yes', 'No'], s: 'Students were asked whether they plan to attend the spring concert.', unit: 'student' },
      { r: ['Morning', 'Evening'], c: ['Coffee', 'Tea'], s: 'Customers at a café were surveyed about their usual drink and when they usually visit.', unit: 'customer' }]);
    const v = [[ri(12, 60), ri(12, 60)], [ri(12, 60), ri(12, 60)]], rs = v.map(r => r[0] + r[1]), cs = [v[0][0] + v[1][0], v[0][1] + v[1][1]], tot = rs[0] + rs[1];
    const table = tableHTML(['', t.c[0], t.c[1], 'Total'], [[t.r[0], v[0][0], v[0][1], rs[0]], [t.r[1], v[1][0], v[1][1], rs[1]], ['Total', cs[0], cs[1], tot]]);
    if (Math.random() < 0.5) {
      return { q: `${t.s}${table}If a ${t.unit} in the ${t.c[0]} column is chosen at random, what is the probability that the ${t.unit} is in the ${t.r[1]} row?`,
        ...mc(fr(v[1][0], cs[0]), [fr(v[1][0], rs[1]), fr(v[1][0], tot), fr(cs[0], tot)], () => fr(v[1][0] + riNZ(-5, 5), cs[0])),
        exp: `The condition restricts you to the ${t.c[0]} column: ${cs[0]} ${t.unit}s. Of those, ${v[1][0]} are ${t.r[1]}. Probability = ${fr(v[1][0], cs[0])}.` };
    }
    return { q: `${t.s}${table}If a ${t.unit} in the ${t.r[0]} row is chosen at random, what is the probability that the ${t.unit} is in the ${t.c[1]} column?`,
      ...mc(fr(v[0][1], rs[0]), [fr(v[0][1], cs[1]), fr(v[0][1], tot), fr(rs[0], tot)], () => fr(v[0][1] + riNZ(-5, 5), rs[0])),
      exp: `The condition restricts you to the ${t.r[0]} row: ${rs[0]} ${t.unit}s. Of those, ${v[0][1]} are ${t.c[1]}. Probability = ${fr(v[0][1], rs[0])}.` };
  }, { a: 1.3 });
  T('PS4', 'PS', -0.3, () => {
    let A, B; do { A = sample([...Array(15)].map((_, i) => i + 1), 5); B = sample([...Array(15)].map((_, i) => i + 1), 5); } while (inter(A, B).length === 0 || inter(A, B).length === 5);
    const isI = Math.random() < 0.5, op = isI ? '∩' : '∪';
    const c = setStr(isI ? inter(A, B) : union(A, B));
    return { q: `If <i>A</i> = ${setStr(A)} and <i>B</i> = ${setStr(B)}, what is <i>A</i> ${op} <i>B</i>?`,
      ...mc(c, [setStr(isI ? union(A, B) : inter(A, B)), setStr(minus(A, B)), setStr(union(minus(A, B), minus(B, A)))]),
      exp: isI ? `The symbol ∩ means intersection: keep only the elements that appear in both sets. Check each element of <i>A</i> against <i>B</i>. The shared elements are ${c}.` : `The symbol ∪ means union: combine every element from either set. List each element once, even if it is in both sets. The result is ${c}.` };
  });
  T('PS5', 'PS', 1.6, () => {
    const U = [...Array(12)].map((_, i) => i + 1);
    const exprs = [
      ['<i>A</i> ∪ (<i>B</i> ∩ <i>C</i>)', (A, B, C) => union(A, inter(B, C)), '<i>B</i> ∩ <i>C</i>', (A, B, C) => inter(B, C), 'union with <i>A</i>'],
      ['(<i>A</i> ∪ <i>B</i>) ∩ <i>C</i>', (A, B, C) => inter(union(A, B), C), '<i>A</i> ∪ <i>B</i>', (A, B, C) => union(A, B), 'intersection with <i>C</i>'],
      ['<i>A</i> ∩ (<i>B</i> ∪ <i>C</i>)', (A, B, C) => inter(A, union(B, C)), '<i>B</i> ∪ <i>C</i>', (A, B, C) => union(B, C), 'intersection with <i>A</i>'],
      ['(<i>A</i> ∩ <i>B</i>) ∪ <i>C</i>', (A, B, C) => union(inter(A, B), C), '<i>A</i> ∩ <i>B</i>', (A, B, C) => inter(A, B), 'union with <i>C</i>']];
    const A = sample(U, 4), B = sample(U, 5), C = sample(U, 4), e = pick(exprs), c = setStr(e[1](A, B, C));
    return { q: `Let <i>A</i> = ${setStr(A)}, <i>B</i> = ${setStr(B)}, and <i>C</i> = ${setStr(C)}. What is ${e[0]}?`,
      ...mc(c, exprs.filter(x => x !== e).map(x => setStr(x[1](A, B, C))), () => setStr(sample(union(union(A, B), C), ri(1, 4)))),
      exp: `Work inside the parentheses first: ${e[2]} = ${setStr(e[3](A, B, C))}. Then take the ${e[4]}. The result is ${c}. Remember that ∩ keeps only shared elements and ∪ keeps everything.` };
  }, { a: 1.3 });
  T('PS6', 'PS', 1.7, () => {
    const r = ri(3, 7), b = ri(3, 8), N = r + b, ans = new F(r * (r - 1), N * (N - 1));
    return { q: `A box contains ${r} red pens and ${b} blue pens. Two pens are chosen at random, one after the other, without replacement. What is the probability that both pens are red?`,
      ...mc(ans.html(), [new F(r * r, N * N).html(), new F(r * (r - 1), N * N).html(), new F(r - 1, N - 1).html()], () => new F(r * (r - 1) + riNZ(-4, 4) * 2, N * (N - 1)).html()),
      exp: `First pen red: ${fr(r, N)}. Then ${r - 1} red remain of ${N - 1}: ${fr(r - 1, N - 1)}. Multiply: ${fr(r, N)} × ${fr(r - 1, N - 1)} = ${ans.html()}.` };
  }, { a: 1.2 });

  /* ===== Descriptive statistics ===== */
  T('DS1', 'DS', -1.7, () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; let vals; do { vals = days.map(() => ri(1, 10) * 5); } while (new Set(vals).size < 4);
    let i, j; do { i = ri(0, 4); j = ri(0, 4); } while (vals[i] <= vals[j]);
    const full = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
    return { q: `${barSVG(days, [vals], 50, 5)}The bar graph shows the number of books checked out of a school library each day. How many more books were checked out on ${full[days[i]]} than on ${full[days[j]]}?`,
      ...mcN(vals[i] - vals[j], [vals[i] + vals[j], vals[i], vals[j]], n, 5),
      exp: `${full[days[i]]}: ${vals[i]}. ${full[days[j]]}: ${vals[j]}. Difference: ${vals[i]} − ${vals[j]} = ${vals[i] - vals[j]}.` };
  }, { a: 1.0 });
  T('DS2', 'DS', -0.5, () => {
    const k = pick([5, 6]); let v; do { v = [...Array(k)].map(() => ri(60, 98)); } while (v.reduce((a, b) => a + b) % k !== 0);
    const sum = v.reduce((a, b) => a + b), mean = sum / k, s = v.slice().sort((a, b) => a - b), med = k % 2 ? s[2] : (s[2] + s[3]) / 2;
    return { q: `Jordan's scores on ${k} quizzes were ${v.join(', ')}. What is the mean of these scores?`,
      ...mcN(mean, [med, Math.round(sum / (k - 1)), s[k - 1] - s[0]]),
      exp: `Add the scores: ${v.join(' + ')} = ${sum}. Divide by ${k}: ${sum} ÷ ${k} = ${mean}.` };
  }, { calc: true });
  T('DS3', 'DS', -0.3, () => {
    const k = pick([6, 8]), v = sample([...Array(50)].map((_, i) => i + 10), k), s = v.slice().sort((a, b) => a - b);
    const med = (s[k / 2 - 1] + s[k / 2]) / 2, um = (v[k / 2 - 1] + v[k / 2]) / 2, mean = +(v.reduce((a, b) => a + b) / k).toFixed(1);
    return { q: `What is the median of the following data set?<span class="data">${v.join(', ')}</span>`,
      ...mcN(med, [um, mean, s[k / 2]], n, 0.5),
      exp: `Order the values: ${s.join(', ')}. With ${k} values, the median is the mean of the two middle values: (${s[k / 2 - 1]} + ${s[k / 2]}) ÷ 2 = ${n(med)}.` };
  });
  T('DS4', 'DS', 1.0, () => {
    const v = sample([...Array(21)].map((_, i) => i + 10), 5).sort((a, b) => a - b), big = ri(80, 120);
    return { q: `A data set consists of the values ${v.join(', ')}. The value ${big} is added to the data set. Which of the following best describes how the mean and median change?`,
      ...mc('The mean increases more than the median does.', ['The median increases more than the mean does.', 'The mean and median increase by the same amount.', 'The mean increases, and the median does not change.']),
      exp: `The mean goes from ${n(+(v.reduce((a, b) => a + b) / 5).toFixed(2))} to ${n(+((v.reduce((a, b) => a + b) + big) / 6).toFixed(2))}, but the median only goes from ${v[2]} to ${n((v[2] + v[3]) / 2)}. An extreme value pulls the mean much more than the median.` };
  });
  T('DS5', 'DS', 0.2, () => {
    let M, s, fifth; do { M = ri(70, 90); s = [...Array(4)].map(() => ri(M - 15, Math.min(M + 15, 100))); fifth = 5 * M - s.reduce((a, b) => a + b); } while (fifth < 50 || fifth > 100);
    const sum = s.reduce((a, b) => a + b);
    return { q: `The mean of five test scores is ${M}. Four of the scores are ${s.join(', ')}. What is the fifth score?`,
      ...mcN(fifth, [M, Math.round(sum / 4), fifth - M]),
      exp: `The total of all five scores is 5 × ${M} = ${5 * M}. The four known scores add to ${sum}, so the fifth is ${5 * M} − ${sum} = ${fifth}.` };
  }, { calc: true });
  T('DS6', 'DS', 1.9, () => {
    let A, B, mA, mB, dA, dB; const med = a => a.slice().sort((x, y) => x - y)[3], mean = a => a.reduce((x, y) => x + y) / 7;
    const wantSplit = Math.random() < 0.75;
    do { A = [...Array(7)].map(() => ri(55, 98)); B = [...Array(7)].map(() => ri(55, 98)); mA = mean(A); mB = mean(B); dA = med(A); dB = med(B); }
    while (Math.abs(mA - mB) < 2 || Math.abs(dA - dB) < 3 || (wantSplit && (mA > mB) === (dA > dB)));
    const st = (m, d) => `Class ${m} has the greater mean, and Class ${d} has the greater median.`;
    const c = st(mA > mB ? 'A' : 'B', dA > dB ? 'A' : 'B');
    return { q: `The quiz scores for two small classes are listed below.${tableHTML(['Class', 'Scores'], [['A', A.join(', ')], ['B', B.join(', ')]])}Which statement is true?`,
      ...mc(c, [st('A', 'A'), st('A', 'B'), st('B', 'A'), st('B', 'B')].filter(x => x !== c)),
      exp: `Class A: mean ${n(+mA.toFixed(2))}, median ${dA}. Class B: mean ${n(+mB.toFixed(2))}, median ${dB}. Sort each list to find the median (the 4th of 7 values).` };
  }, { calc: true, a: 1.3 });
  T('DS7', 'DS', 0.4, () => {
    const cats = pick([['Fiction', 'Science', 'History', 'Art'], ['North', 'South', 'East', 'West'], ['Soccer', 'Tennis', 'Swim', 'Track']]);
    let y1, y2, inc; do { y1 = cats.map(() => ri(2, 7) * 5); inc = cats.map(() => ri(-2, 5) * 5); y2 = y1.map((v, i) => v + inc[i]); }
    while (y2.some(v => v <= 0 || v > 60) || inc.filter(v => v === Math.max(...inc)).length > 1 || y2.indexOf(Math.max(...y2)) === inc.indexOf(Math.max(...inc)) || y2.filter(v => v === Math.max(...y2)).length > 1);
    const best = cats[inc.indexOf(Math.max(...inc))];
    return { q: `${barSVG(cats, [y1, y2], 60, 10, ['Year 1', 'Year 2'])}The bar graph shows the number of members in four groups in Year 1 and Year 2. Which group had the greatest increase in members from Year 1 to Year 2?`,
      ...mc(best, cats.filter(c => c !== best)),
      exp: `Increases: ${cats.map((c, i) => `${c} ${n(inc[i])}`).join(', ')}. The greatest increase is ${best}. The tallest Year 2 bar is not necessarily the greatest increase.` };
  });
  T('DS8', 'DS', 0.7, () => {
    let v; do { const a = ri(2, 6); const q1 = a + ri(1, 3), md = q1 + ri(1, 3), q3 = md + ri(1, 3), mx = q3 + ri(1, 4); v = [a, q1, md, q3, mx].map(x => x * 5); } while (v[4] > 95);
    const askIQR = Math.random() < 0.6;
    return { q: `${boxSVG(v, 0, 100, 10)}The box plot summarizes the scores of students on a test. What is the ${askIQR ? 'interquartile range' : 'range'} of the scores?`,
      ...(askIQR ? mcN(v[3] - v[1], [v[4] - v[0], v[2], v[3] - v[2]], n, 5) : mcN(v[4] - v[0], [v[3] - v[1], v[4], v[2]], n, 5)),
      exp: `From the plot: minimum ${v[0]}, Q1 ${v[1]}, median ${v[2]}, Q3 ${v[3]}, maximum ${v[4]}. ` + (askIQR ? `IQR = Q3 − Q1 = ${v[3]} − ${v[1]} = ${v[3] - v[1]}.` : `Range = maximum − minimum = ${v[4]} − ${v[0]} = ${v[4] - v[0]}.`) };
  });

  /* ===== Geometry concepts for Pre-Algebra ===== */
  T('G1a', 'G1', -1.5, () => {
    const l = ri(4, 25), w = ri(2, l - 1);
    return { q: `A rectangle is ${l} centimeters long and ${w} centimeters wide. What is its perimeter, in centimeters?`, ...mcN(2 * (l + w), [l * w, l + w, 2 * l + w]),
      exp: `Perimeter is the distance around the shape, so add all four sides. A rectangle has two lengths and two widths: ${l} + ${l} + ${w} + ${w}. That is 2(${l} + ${w}) = ${2 * (l + w)} centimeters.` };
  }, { a: 1.0 });
  T('G1b', 'G1', -0.6, () => {
    const b = ri(4, 20), h = ri(3, 15), ar = (b * h) / 2;
    return { q: `A triangle has a base of ${b} inches and a height of ${h} inches. What is the area of the triangle, in square inches?`, ...mcN(ar, [b * h, b + h, (b * h) / 4]),
      exp: `Use area = ${fr(1, 2)} × base × height. Multiply the base and height: ${b} × ${h} = ${b * h}. Take half: ${b * h} ÷ 2 = ${n(ar)} square inches.` };
  });
  T('G1c', 'G1', 0.2, () => {
    const r = ri(2, 10), pi = k => `${n(k)}π`;
    if (Math.random() < 0.5) return { q: `A circle has a diameter of ${2 * r} meters. What is the area of the circle, in square meters?`, ...mc(pi(r * r), [pi(4 * r * r), pi(2 * r), pi(4 * r)], () => pi(r * r + riNZ(-6, 6))),
      exp: `The radius is half the diameter: ${2 * r} ÷ 2 = ${r}. Area = πr<sup>2</sup>, so square the radius: ${r}<sup>2</sup> = ${r * r}. The area is ${pi(r * r)} square meters.` };
    return { q: `A circle has a radius of ${r} feet. What is the circumference of the circle, in feet?`, ...mc(pi(2 * r), [pi(r * r), pi(r), pi(4 * r)], () => pi(2 * r + riNZ(-4, 4))),
      exp: `Use circumference = 2πr, with radius ${r}. Multiply: 2 × ${r} = ${2 * r}. So the circumference is ${pi(2 * r)} feet.` };
  });
  T('G1d', 'G1', 0.4, () => {
    const l = ri(3, 12), w = ri(2, 9), h = ri(2, 10), V = l * w * h;
    return { q: `A rectangular prism has a volume of ${n(V)} cubic inches. Its base is ${l} inches long and ${w} inches wide. What is the height of the prism, in inches?`,
      ...mcN(h, [Math.round(V / (l + w)), V - l * w, l * w]), exp: `Volume of a rectangular prism = length × width × height. The base area is ${l} × ${w} = ${l * w} square inches. Divide the volume by the base area: ${n(V)} ÷ ${l * w} = ${h} inches.` };
  }, { calc: true });

  /* ===== Geometry concepts for Algebra 1 ===== */
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29]];
  T('G2a', 'G2', 0.3, () => {
    const [a, b, c] = pick(TRIPLES);
    if (Math.random() < 0.5) return { q: `A right triangle has legs of length ${a} and ${b}. What is the length of the hypotenuse?`, ...mcN(c, [a + b, Math.abs(b - a), c + 2]),
      exp: `Use a<sup>2</sup> + b<sup>2</sup> = c<sup>2</sup>, where c is the hypotenuse. ${a}<sup>2</sup> + ${b}<sup>2</sup> = ${a * a} + ${b * b} = ${a * a + b * b}. Take the square root: c = ${c}.` };
    return { q: `A right triangle has a hypotenuse of length ${c} and one leg of length ${a}. What is the length of the other leg?`, ...mcN(b, [c - a, c + a, b + 3]),
      exp: `The hypotenuse is ${c}, so ${a}<sup>2</sup> + b<sup>2</sup> = ${c}<sup>2</sup>. Subtract: b<sup>2</sup> = ${c * c} − ${a * a} = ${b * b}. Take the square root: b = ${b}.` };
  });
  T('G2b', 'G2', 1.0, () => {
    const [a, b, c] = pick(TRIPLES.filter(t => t[1] <= 15)), dx = a * pick([-1, 1]), dy = b * pick([-1, 1]), x1 = ri(-6, 6), y1 = ri(-6, 6);
    return { q: `What is the distance between the points ${pt(x1, y1)} and ${pt(x1 + dx, y1 + dy)} in the <i>xy</i>-plane?`, ...mcN(c, [a + b, Math.abs(a - b), c * c]),
      exp: `Find the horizontal and vertical distances: Δx = ${a} and Δy = ${b}. Use the Pythagorean theorem: ${a}<sup>2</sup> + ${b}<sup>2</sup> = ${c * c}. Take the square root: the distance is ${c}.` };
  });
  const xi = '<i>x</i>', yi = '<i>y</i>';
  const TR = { rx: ['reflected across the <i>x</i>-axis', (x, y) => [x, -y], `(${xi}, \u2212${yi})`], ry: ['reflected across the <i>y</i>-axis', (x, y) => [-x, y], `(\u2212${xi}, ${yi})`],
    ccw: ['rotated 90\u00B0 counterclockwise about the origin', (x, y) => [-y, x], `(\u2212${yi}, ${xi})`], cw: ['rotated 90\u00B0 clockwise about the origin', (x, y) => [y, -x], `(${yi}, \u2212${xi})`],
    r180: ['rotated 180\u00B0 about the origin', (x, y) => [-x, -y], `(\u2212${xi}, \u2212${yi})`], yx: ['reflected across the line <i>y</i> = <i>x</i>', (x, y) => [y, x], `(${yi}, ${xi})`] };
  T('G2c', 'G2', 0.5, () => {
    let x, y; do { x = riNZ(-7, 7); y = riNZ(-7, 7); } while (Math.abs(x) === Math.abs(y));
    const key = pick(Object.keys(TR)), [desc, f, rule] = TR[key], c = pt(...f(x, y));
    return { q: `The point (${n(x)}, ${n(y)}) is ${desc}. What are the coordinates of its image?`,
      ...mc(c, shuffle(Object.keys(TR).filter(k => k !== key)).map(k => pt(...TR[k][1](x, y)))),
      exp: `When a point is ${desc}, (${xi}, ${yi}) maps to ${rule}. So (${n(x)}, ${n(y)}) becomes ${c}.` };
  });
  T('G2d', 'G2', 1.7, () => {
    const a = ri(2, 9), k = ri(2, 5), W = '<i>w</i>';
    if (Math.random() < 0.6) return { q: `The length of a rectangle is ${a} more than ${k} times its width, ${W}. Which expression represents the perimeter of the rectangle?`,
      ...mc(lin(2 * k + 2, 2 * a, W), [lin(k + 1, a, W), lin(2 * k + 2, a, W), lin(2 * k, 2 * a, W)]),
      exp: `Write the length in terms of the width: length = ${lin(k, a, W)}. Perimeter = 2 × length + 2 × width = 2(${lin(k, a, W)}) + 2${W}. Distribute and combine like terms: ${lin(2 * k, 2 * a, W)} + 2${W} = ${lin(2 * k + 2, 2 * a, W)}.` };
    return { q: `The length of a rectangle is ${a} more than ${k} times its width, ${W}. Which expression represents the area of the rectangle?`,
      ...mc(`${k}${sup(W, 2)} + ${a}${W}`, [lin(k + 1, a, W), `${k}${sup(W, 2)} + ${a}`, lin(2 * k + 2, 2 * a, W)]),
      exp: `Write the length in terms of the width: length = ${lin(k, a, W)}. Area = length × width = (${lin(k, a, W)})${W}. Distribute ${W}: ${k}${sup(W, 2)} + ${a}${W}.` };
  }, { a: 1.3 });
  T('G2e', 'G2', 1.9, () => {
    let x, y; do { x = riNZ(-6, 6); y = riNZ(-6, 6); } while (Math.abs(x) === Math.abs(y));
    const rot = pick(['ccw', 'cw', 'r180']), ref = pick(['rx', 'ry']), R = TR[rot], Fp = TR[ref];
    const after = (f1, f2) => pt(...f2(...f1(x, y)));
    const c = after(R[1], Fp[1]), other = TR[pick(['ccw', 'cw', 'r180'].filter(k => k !== rot))];
    return { q: `Triangle <i>PQR</i> has vertex <i>Q</i> at ${pt(x, y)}. The triangle is ${R[0]}, and then the image is ${Fp[0]}. What are the coordinates of the final image of <i>Q</i>?`,
      ...mc(c, [pt(...R[1](x, y)), pt(...Fp[1](x, y)), after(other[1], Fp[1]), after(Fp[1], R[1])], () => pt(riNZ(-6, 6), riNZ(-6, 6))),
      exp: `First, ${R[0].replace('rotated', 'rotating')}: ${pt(x, y)} → ${pt(...R[1](x, y))}. Then ${Fp[0].replace('reflected', 'reflecting')}: → ${c}. Order matters.` };
  }, { a: 1.3 });


  /* ===== extra coverage at the ends of the scale ===== */
  T('EX0', 'EX', -1.5, () => {
    if (Math.random() < 0.5) { const a = ri(2, 5), k = a < 4 ? ri(3, 4) : ri(2, 3), v = a ** k;
      return { q: `What is the value of ${sup(a, k)}?`, ...mcN(v, [a * k, a + k, a ** (k - 1)]), exp: `${sup(a, k)} means ${a} multiplied by itself ${k} times. ${Array(k).fill(a).join(' × ')} = ${v}. A common mistake is ${a} × ${k} = ${a * k}, which is not the same thing.` }; }
    const r = ri(4, 15), v = r * r;
    return { q: `What is the value of ${sqrtH(v)}?`, ...mcN(r, [v / 2, r * 2, r + 1]), exp: `A square root asks which number times itself gives ${v}. ${r} × ${r} = ${v}. So ${sqrtH(v)} = ${r}.` };
  }, { a: 1.0 });
  T('RP0', 'RP', -1.4, () => {
    let a, b; do { a = ri(2, 9) * ri(2, 4); b = ri(2, 9) * ri(2, 4); } while (a === b || gcd(a, b) === 1);
    const g = gcd(a, b), pair = pick([['cats', 'dogs', 'An animal shelter has'], ['boys', 'girls', 'A class has'], ['red tulips', 'yellow tulips', 'A garden has']]);
    const rs = (x, y) => `${x} : ${y}`;
    return { q: `${pair[2]} ${a} ${pair[0]} and ${b} ${pair[1]}. What is the ratio of ${pair[0]} to ${pair[1]} in simplest form?`,
      ...mc(rs(a / g, b / g), [rs(b / g, a / g), rs(a / g, (a + b) / g), rs(a - 1, b - 1)], () => rs(ri(1, 9), ri(1, 9))),
      exp: `Both numbers are divisible by ${g}: ${a} ÷ ${g} = ${a / g} and ${b} ÷ ${g} = ${b / g}. The ratio is ${rs(a / g, b / g)}, in the order asked (${pair[0]} first).` };
  }, { a: 1.0 });
  T('RP7', 'RP', 1.6, () => {
    const v = ri(5, 40), kmh = +(v * 3.6).toFixed(1);
    return { q: `A car travels at a constant speed of ${n(kmh)} kilometers per hour. What is this speed in meters per second? (1 kilometer = 1,000 meters)`,
      ...mcN(v, [+(kmh * 1000 / 60).toFixed(1), +(kmh / 60).toFixed(2), +(kmh * 3.6).toFixed(1)]),
      exp: `${n(kmh)} km per hour = ${n(kmh * 1000)} meters per 3,600 seconds. ${n(kmh * 1000)} ÷ 3,600 = ${v} meters per second.` };
  }, { calc: true, a: 1.3 });
  T('PS0', 'PS', -0.9, () => {
    const N = pick([6, 8, 10, 12]), m = ri(2, N - 3), t = ri(3, N - 1);
    const isPrime = x => x > 1 && [...Array(x - 2)].every((_, i) => x % (i + 2) !== 0);
    const [kind, test] = pick([['even', x => x % 2 === 0], ['odd', x => x % 2 === 1], ['greater than ' + m, x => x > m], ['less than ' + t, x => x < t], ['a multiple of 3', x => x % 3 === 0], ['prime', isPrime]]);
    const cnt = [...Array(N)].map((_, i) => i + 1).filter(test).length;
    return { q: `A spinner is divided into ${N} equal sections numbered 1 through ${N}. What is the probability that the spinner lands on a number that is ${kind}?`,
      ...mc(fr(cnt, N), [fr(1, N), fr(N - cnt, N), cnt < N - cnt ? fr(cnt, N - cnt) : fr(N - cnt, cnt)], () => fr(ri(1, N - 1), N)),
      exp: `There are ${N} equally likely sections. Count the favorable ones: ${cnt} sections are ${kind}. Probability = ${cnt} ÷ ${N} = ${fr(cnt, N)}.` };
  }, { a: 1.0 });
  T('G2f', 'G2', -0.8, () => {
    let x, y; do { x = riNZ(-6, 6); y = riNZ(-6, 6); } while (x === y);
    const h = riNZ(-5, 5), v = riNZ(-5, 5), dir = (k, p, m) => `${Math.abs(k)} unit${Math.abs(k) > 1 ? 's' : ''} ${k > 0 ? p : m}`;
    return { q: `The point ${pt(x, y)} is moved ${dir(h, 'right', 'left')} and ${dir(v, 'up', 'down')}. What are the coordinates of the new point?`,
      ...mc(pt(x + h, y + v), [pt(x + v, y + h), pt(x - h, y - v), pt(x + h, y - v)], () => pt(x + h + riNZ(-2, 2), y + v)),
      exp: `Moving ${h > 0 ? 'right' : 'left'} changes the <i>x</i>-coordinate: ${n(x)} ${h > 0 ? '+' : '−'} ${Math.abs(h)} = ${n(x + h)}. Moving ${v > 0 ? 'up' : 'down'} changes the <i>y</i>-coordinate: ${n(y)} ${v > 0 ? '+' : '−'} ${Math.abs(v)} = ${n(y + v)}.` };
  }, { a: 1.0 });
  T('G1e', 'G1', 1.3, () => {
    const k = pick([2, 3, 4, 5]);
    if (Math.random() < 0.4) {
      const what = pick(['square', 'rectangle', 'triangle']);
      return { q: `Each side length of a ${what} is multiplied by ${k}. By what factor is the area of the ${what} multiplied?`,
        ...mcN(k * k, [k, 2 * k === k * k ? 4 * k : 2 * k, k ** 3]),
        exp: `Area multiplies two lengths. Multiplying each length by ${k} multiplies the area by ${k} × ${k} = ${k * k}.` };
    }
    const what = pick(['cube', 'rectangular box']);
    return { q: `Each edge length of a ${what} is multiplied by ${k}. By what factor is the volume of the ${what} multiplied?`,
      ...mcN(k ** 3, [k, k * k, 3 * k]),
      exp: `Volume multiplies three lengths. Multiplying each by ${k} multiplies the volume by ${k} × ${k} × ${k} = ${k ** 3}.` };
  }, { a: 1.2 });
  T('G1f', 'G1', 0.9, () => {
    const W = ri(8, 14), H = ri(6, 12), w = ri(2, W - 4), h = ri(2, H - 3), ar = W * H - w * h;
    return { q: `A rectangular garden is ${W} feet by ${H} feet. A rectangular patio that is ${w} feet by ${h} feet is built inside the garden. What is the area of the garden that is not covered by the patio, in square feet?`,
      ...mcN(ar, [W * H + w * h, 2 * (W + H) - 2 * (w + h), (W - w) * (H - h)]),
      exp: `Garden area: ${W} × ${H} = ${W * H}. Patio area: ${w} × ${h} = ${w * h}. Uncovered: ${W * H} − ${w * h} = ${ar} square feet.` };
  });
  T('LE6', 'LE', 1.5, () => {
    const a = pick([2, 3, 4, 5]), b = pick([2, 3, 4, 6]), c = ri(2, 9) * b;
    const m = new F(a, b), k = -c / b;
    return { q: `The equation ${a}${X} − ${b}${Y} = ${c} relates ${X} and ${Y}. Which of the following expresses ${Y} in terms of ${X}?`,
      ...mc(eqLine(m, k), [eqLine(m.neg(), -k), eqLine(new F(b, a), k), eqLine(m, -k)], () => eqLine(m, k + riNZ(-3, 3))),
      exp: `Subtract ${a}${X}: ${MINUS}${b}${Y} = ${MINUS}${a}${X} + ${c}. Divide by ${MINUS}${b}: ${eqLine(m, k)}.` };
  }, { a: 1.3 });

  /* ===== additional coverage (gaps found against a published skill plan) ===== */
  let figId = 0;
  function scatterSVG(pts, xmax, ymax, xs, ys, xl, yl) {
    const W = 380, H = 270, L = 48, R = 14, Tt = 12, B = 44, x = v => L + (v / xmax) * (W - L - R), y = v => Tt + (1 - v / ymax) * (H - Tt - B);
    let s = `<svg class="fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Scatter plot">`;
    for (let v = 0; v <= ymax; v += ys) s += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tk" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    for (let v = 0; v <= xmax; v += xs) s += `<line class="gl" y1="${Tt}" y2="${H - B}" x1="${x(v)}" x2="${x(v)}"/><text class="tk" x="${x(v)}" y="${H - B + 15}" text-anchor="middle">${v}</text>`;
    s += `<line class="ax" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="ax" x1="${L}" x2="${L}" y1="${Tt}" y2="${H - B}"/>`;
    s += `<text class="tk" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${xl}</text><text class="tk" transform="translate(12 ${(Tt + H - B) / 2}) rotate(-90)" text-anchor="middle">${yl}</text>`;
    pts.forEach(p => (s += `<circle class="pp" cx="${x(p[0])}" cy="${y(p[1])}" r="4"/>`));
    return s + '</svg>';
  }
  function numberLineSVG(v, closed, right) {
    const W = 400, H = 70, L = 20, R = 20, lo = v - 5, hi = v + 5, x = t => L + ((t - lo) / (hi - lo)) * (W - L - R), yc = 28, id = 'nl' + figId++;
    let s = `<svg class="fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Number line"><defs><marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="arrowhead"/></marker></defs>`;
    s += `<line class="ax" x1="${L - 10}" x2="${W - R + 10}" y1="${yc}" y2="${yc}"/>`;
    for (let t = lo; t <= hi; t++) s += `<line class="ax" x1="${x(t)}" x2="${x(t)}" y1="${yc - 6}" y2="${yc + 6}"/><text class="tk" x="${x(t)}" y="${yc + 24}" text-anchor="middle">${n(t)}</text>`;
    s += `<line class="ray" x1="${x(v)}" x2="${right ? W - R + 6 : L - 6}" y1="${yc}" y2="${yc}" marker-end="url(#${id})"/>`;
    s += `<circle class="${closed ? 'pp' : 'po'}" cx="${x(v)}" cy="${yc}" r="7"/>`;
    return s + '</svg>';
  }
  const xi2 = '<i>x</i>';
  function corr(pts) { const k = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / k, my = pts.reduce((a, p) => a + p[1], 0) / k; let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; } return sxy / Math.sqrt(sxx * syy); }
  function lsq(pts) { const k = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / k, my = pts.reduce((a, p) => a + p[1], 0) / k; let sxy = 0, sxx = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; } const m = sxy / sxx; return [m, my - m * mx]; }

  /* --- Descriptive statistics --- */
  T('DS9', 'DS', -0.5, () => {
    const kind = pick(['pos', 'neg', 'none']); let pts, r;
    do {
      pts = [];
      for (let i = 0; i < 14; i++) { const x = ri(2, 19) / 2; let y = kind === 'pos' ? 8 * x + 12 + ri(-8, 8) : kind === 'neg' ? 92 - 8 * x + ri(-8, 8) : ri(12, 88); pts.push([x, Math.max(3, Math.min(97, y))]); }
      r = corr(pts);
      // clear trend for positive/negative (|r| >= 0.85); truly flat cloud with points spread across the plot for "no association" (|r| <= 0.1)
    } while (kind === 'none' ? (Math.abs(r) > 0.1 || Math.abs(corr(pts.map(p => [(p[0] - 5.25) ** 2, p[1]]))) > 0.25 || new Set(pts.map(p => Math.floor(p[0] / 2.5))).size < 4) : Math.abs(r) < 0.85); // "none" also rules out a curved (U-shaped) pattern
    const names = { pos: 'A positive association', neg: 'A negative association', none: 'No association', cur: 'A perfectly linear association' };
    const c = names[kind];
    return { q: `${scatterSVG(pts, 10, 100, 2, 20, 'Variable A', 'Variable B')}Which best describes the relationship between Variable A and Variable B shown in the scatter plot?`,
      ...mc(c, Object.values(names).filter(v => v !== c)),
      exp: kind === 'pos' ? 'As Variable A increases, Variable B tends to increase. The points rise from left to right, so the association is positive. They do not lie exactly on a line, so it is not perfectly linear.' : kind === 'neg' ? 'As Variable A increases, Variable B tends to decrease. The points fall from left to right, so the association is negative.' : 'The points are scattered with no upward or downward trend. Knowing Variable A does not help predict Variable B, so there is no association.' };
  }, { a: 1.0 });
  T('DS10', 'DS', 0.6, () => {
    const neg = Math.random() < 0.5, m = neg ? -pick([4, 5, 6]) : pick([4, 5, 6]), b0 = neg ? ri(78, 92) : ri(8, 95 - 10 * m - 8), pts = [];
    let fit;
    do { pts.length = 0; for (let i = 0; i < 14; i++) { const x = ri(1, 19) / 2; pts.push([x, Math.max(2, Math.min(98, m * x + b0 + ri(-6, 6)))]); } fit = lsq(pts); }
    while (Math.abs(fit[0] - m) > 0.5 || Math.abs(fit[1] - b0) > 3 || Math.min(...pts.map(p => p[0])) > 1.5 || Math.max(...pts.map(p => p[0])) < 8.5);
    const alt = b0 + (b0 > 50 ? -30 : 30);
    return { q: `${scatterSVG(pts, 10, 100, 2, 20, 'x', 'y')}Which equation best represents a line of best fit for the data in the scatter plot?`,
      ...mc(eqLine(m, b0), [eqLine(-m, b0), eqLine(m, alt), eqLine(2 * m, b0)], () => eqLine(m, b0 + riNZ(-4, 4) * 10)),
      exp: `A good line passes through the middle of the points. Near ${X} = 0 the points are around ${Y} = ${b0}, so the <i>y</i>-intercept is about ${b0}. From ${X} = 0 to ${X} = 10 the points ${m > 0 ? 'rise' : 'fall'} by about ${Math.abs(10 * m)}, so the slope is about ${n(m)}. That gives ${eqLine(m, b0)}.` };
  });
  T('DS11', 'DS', 0.1, () => {
    const m = pick([2.5, 3, 4, 4.5, 5]), c = ri(40, 60), k = ri(3, 9), ans = +(m * k + c).toFixed(1);
    return { q: `The line of best fit for a set of data is ${Y} = ${n(m)}${X} + ${c}, where ${X} is the number of hours a student studied and ${Y} is the student's test score. Based on this line, what score is predicted for a student who studies ${k} hours?`,
      ...mcN(ans, [m * (k + c), m + k + c, +(m * k).toFixed(1)]),
      exp: `Substitute ${X} = ${k} into the equation. ${Y} = ${n(m)}(${k}) + ${c} = ${n(+(m * k).toFixed(1))} + ${c}. The predicted score is ${n(ans)}.` };
  });
  T('DS12', 'DS', -0.8, () => {
    const labels = ['50–59', '60–69', '70–79', '80–89', '90–99'], cnt = labels.map(() => ri(1, 9)), cut = pick([2, 3]);
    const ans = cnt.slice(cut).reduce((a, b) => a + b), tot = cnt.reduce((a, b) => a + b), thr = [50, 60, 70, 80, 90][cut];
    return { q: `${barSVG(labels, [cnt], 10, 2, null, true)}The histogram shows the test scores of students in a class. How many students scored ${thr} or higher?`,
      ...mcN(ans, [cnt[cut], tot - ans, tot]),
      exp: `Scores of ${thr} or higher are in the bars ${labels.slice(cut).join(', ')}. Add those bars: ${cnt.slice(cut).join(' + ')} = ${ans}.` };
  }, { a: 1.0 });
  T('DS13', 'DS', -1.3, () => {
    let v, mo, tw; do { mo = ri(10, 40); tw = ri(10, 40); const rest = sample([...Array(31)].map((_, i) => i + 10).filter(x => x !== mo && x !== tw), 4); v = shuffle([mo, mo, mo, tw, tw, ...rest]); } while (mo === tw);
    const s = v.slice().sort((a, b) => a - b), med = s[4];
    return { q: `What is the mode of the data set below?<span class="data">${v.join(', ')}</span>`,
      ...mcN(mo, [med, tw, Math.round(v.reduce((a, b) => a + b) / 9)]),
      exp: `The mode is the value that appears most often. Sorted: ${s.join(', ')}. ${mo} appears 3 times, more than any other value, so the mode is ${mo}.` };
  }, { a: 1.0 });

  /* --- Linear applications and graphs --- */
  T('LA12', 'LA', -1.0, () => {
    const v = riNZ(-4, 4), closed = Math.random() < 0.5, right = Math.random() < 0.5;
    const op = right ? (closed ? '≥' : '>') : (closed ? '≤' : '<');
    return { q: `${numberLineSVG(v, closed, right)}Which inequality is shown on the number line above?`,
      ...mc(`${xi2} ${op} ${n(v)}`, ['>', '<', '≥', '≤'].filter(o => o !== op).map(o => `${xi2} ${o} ${n(v)}`)),
      exp: `The circle is at ${n(v)}. ${closed ? 'A filled circle means ' + n(v) + ' is included' : 'An open circle means ' + n(v) + ' is not included'}. The arrow points ${right ? 'right, toward greater' : 'left, toward smaller'} numbers. So the inequality is ${xi2} ${op} ${n(v)}.` };
  }, { a: 1.0 });
  T('LA13', 'LA', 1.3, () => {
    const a = riNZ(-5, 5), b = riNZ(-9, 9), c = ri(2, 9), k = ri(2, 8);
    const lin1 = `${Y} = ${lin(a, b)}`, lin2 = `${Y} = ${fracHTML(X, k)} ${b < 0 ? '− ' + -b : '+ ' + b}`, lin3 = `${a > 0 ? a : 2}${X} + ${c}${Y} = ${ri(6, 30)}`;
    const non = [`${Y} = ${sup(X, 2)} + ${c}`, `${Y} = 2<sup><i>x</i></sup>`, `${Y} = ${fracHTML(k, X)}`, `${Y} = ${X}(${X} − ${c})`];
    if (Math.random() < 0.5) {
      const c1 = pick([lin1, lin2]);
      return { q: 'Which equation represents a linear function?', ...mc(c1, sample(non, 3)),
        exp: `In a linear function, ${X} appears only to the first power: never squared, never in an exponent, never in a denominator. ${c1} fits that rule. The others have ${X} squared, as an exponent, or in a denominator, so their graphs are curves.` };
    }
    const c2 = pick(non);
    return { q: 'Which equation does NOT represent a linear function?', ...mc(c2, [lin1, lin2, lin3]),
      exp: `A linear function has ${X} only to the first power and graphs as a straight line. ${c2} breaks that rule, so its graph is a curve. The other three can each be written as ${Y} = <i>m</i>${X} + <i>b</i>.` };
  }, { a: 1.2 });
  T('LA14', 'LA', 0.9, () => {
    const m = riNZ(-3, 3), c = riNZ(-5, 5), op = pick(['>', '<', '≥', '≤']);
    const ok = (p, q) => { const r = m * p + c; return op === '>' ? q > r : op === '<' ? q < r : op === '≥' ? q >= r : q <= r; };
    let good, bads = [];
    do { good = [riNZ(-5, 5), riNZ(-8, 8)]; } while (!ok(...good));
    const strict = op === '>' || op === '<', bx = riNZ(-4, 4);
    if (strict) bads.push([bx, m * bx + c]);
    let g = 0; while (bads.length < 3 && g++ < 500) { const p = [riNZ(-5, 5), riNZ(-8, 8)]; if (!ok(...p) && !bads.some(b => b[0] === p[0] && b[1] === p[1])) bads.push(p); }
    const r = m * good[0] + c;
    return { q: `Which point is a solution to the inequality ${Y} ${op} ${lin(m, c)}?`, ...mc(pt(...good), bads.map(p => pt(...p))),
      exp: `Substitute each point and check whether the inequality is true. For ${pt(...good)}: ${n(good[1])} ${op} ${n(m)}(${n(good[0])}) ${c < 0 ? '− ' + -c : '+ ' + c}, which is ${n(good[1])} ${op} ${n(r)}. That is true. Each other point makes it false${strict ? ', including a point on the boundary line, which does not count for a strict inequality' : ''}.` };
  });
  T('LA15', 'LA', 1.4, () => {
    let mA, bA, mB, bB; do { mA = ri(1, 6); bA = riNZ(-6, 8); mB = ri(1, 6); bB = riNZ(-6, 8); } while (mA === mB || bA === bB); // positive, distinct slopes: "greater rate of change" has one meaning
    const tbl = tableHTML(['<i>x</i>', '<i>y</i>'], [0, 1, 2, 3].map(x => [x, n(mA * x + bA)]));
    const st = (r, i) => `Function ${r} has the greater rate of change, and Function ${i} has the greater <i>y</i>-intercept.`;
    const c = st(mA > mB ? 'A' : 'B', bA > bB ? 'A' : 'B');
    return { q: `Function A is shown in the table. Function B is defined by ${Y} = ${lin(mB, bB)}.${tbl}Which statement is true?`,
      ...mc(c, [st('A', 'A'), st('A', 'B'), st('B', 'A'), st('B', 'B')].filter(x => x !== c)),
      exp: `Function A: each time ${X} goes up 1, ${Y} changes by ${n(mA)}, so its rate of change is ${n(mA)}. When ${X} = 0, ${Y} = ${n(bA)}, so its <i>y</i>-intercept is ${n(bA)}. Function B has slope ${n(mB)} and <i>y</i>-intercept ${n(bB)}. Compare: ${n(Math.max(mA, mB))} > ${n(Math.min(mA, mB))} and ${n(Math.max(bA, bB))} > ${n(Math.min(bA, bB))}.` };
  }, { a: 1.2 });

  /* --- Linear equations --- */
  T('LE7', 'LE', 1.6, () => {
    const a = ri(2, 5), c = riNZ(-6, 6), lo = ri(-4, 1), hi = lo + ri(2, 6), left = a * lo + c, right = a * hi + c;
    return { q: `Which of the following describes all solutions of ${n(left)} < ${lin(a, c)} ≤ ${n(right)}?`,
      ...mc(`${n(lo)} < ${xi2} ≤ ${n(hi)}`, [`${n(lo)} ≤ ${xi2} < ${n(hi)}`, `${new F(left + c, a).html()} < ${xi2} ≤ ${new F(right + c, a).html()}`, `${n(left - c)} < ${xi2} ≤ ${n(right - c)}`], () => `${n(lo + riNZ(-2, 2))} < ${xi2} ≤ ${n(hi)}`),
      exp: `Do the same thing to all three parts. ${c < 0 ? 'Add ' + -c + ' to' : 'Subtract ' + c + ' from'} each part: ${n(left - c)} < ${a}${xi2} ≤ ${n(right - c)}. Divide each part by ${a}: ${n(lo)} < ${xi2} ≤ ${n(hi)}.` };
  }, { a: 1.3 });
  T('LE8', 'LE', 0.4, () => {
    let a, c; do { a = ri(1, 8); c = ri(1, 8); } while (a === c);
    const x0 = riNZ(-6, 6), b = riNZ(-10, 10), d = a * x0 + b - c * x0, op = pick(['<', '>', '≤', '≥']);
    const flip = { '>': '<', '<': '>', '≥': '≤', '≤': '≥' }, fin = a - c < 0 ? flip[op] : op;
    return { q: `Which of the following describes all solutions of ${lin(a, b)} ${op} ${lin(c, d)}?`,
      ...mc(`${xi2} ${fin} ${n(x0)}`, [`${xi2} ${flip[fin]} ${n(x0)}`, `${xi2} ${fin} ${n(-x0)}`, `${xi2} ${flip[fin]} ${n(-x0)}`]),
      exp: `Move the ${xi2}-terms to the left and the numbers to the right: ${a - c === 1 ? '' : a - c === -1 ? '−' : n(a - c)}${xi2} ${op} ${n(d - b)}. Divide by ${n(a - c)}${a - c < 0 ? '. Because that number is negative, flip the inequality sign' : ''}. The result is ${xi2} ${fin} ${n(x0)}.` };
  });
  T('LE9', 'LE', -0.2, () => {
    const x0 = riNZ(-5, 6), y0 = riNZ(-5, 6), a = ri(1, 3), b = ri(1, 3), S = a * x0 + y0, Dd = x0 - b * y0;
    const e1 = `${a === 1 ? '' : a}${X} + ${Y} = ${n(S)}`, e2 = `${X} − ${b === 1 ? '' : b}${Y} = ${n(Dd)}`;
    return { q: `<span class="sys">${e1}<br>${e2}</span>Which ordered pair is a solution to the system of equations above?`,
      ...mc(pt(x0, y0), [pt(y0, x0), pt(x0 + 1, y0 - a), pt(x0 + b, y0 + 1)], () => pt(x0 + riNZ(-3, 3), y0 + riNZ(-3, 3))),
      exp: `A solution must make both equations true. Check ${pt(x0, y0)}: ${a === 1 ? '' : a + '('}${n(x0)}${a === 1 ? '' : ')'} + (${n(y0)}) = ${n(S)} is true, and ${n(x0)} − ${b === 1 ? '' : b}(${n(y0)}) = ${n(Dd)} is true. Each other choice fails at least one equation.` };
  }, { a: 1.1 });

  /* --- Probability and sets --- */
  T('PS7', 'PS', 0.3, () => {
    let N, A, B, aName, bName, U, I;
    do {
      N = pick([6, 8, 10]); const all = [...Array(N)].map((_, i) => i + 1);
      [aName, A] = pick([['even', all.filter(x => x % 2 === 0)], ['odd', all.filter(x => x % 2 === 1)], ['a multiple of 3', all.filter(x => x % 3 === 0)]]);
      const k = ri(2, N - 2), gt = Math.random() < 0.6;
      bName = gt ? `greater than ${k}` : `less than ${k}`; B = all.filter(x => (gt ? x > k : x < k));
      U = union(A, B).sort((a, b) => a - b); I = inter(A, B);
    } while (!I.length || U.length === N || !B.length);
    const dev = N === 6 ? 'A fair six-sided die is rolled once.' : `A fair spinner has ${N} equal sections numbered 1 through ${N}. It is spun once.`;
    return { q: `${dev} What is the probability that the result is ${aName} or ${bName}?`,
      ...mc(fr(U.length, N), [fr(A.length + B.length, N), fr(I.length, N), fr(A.length * B.length, N * N)], () => fr(ri(1, N - 1), N)),
      exp: `Outcomes that are ${aName}: ${setStr(A)}. Outcomes ${bName}: ${setStr(B)}. “Or” means either one, counting each outcome once: ${setStr(U)}, which is ${U.length} of the ${N} equally likely outcomes. The probability is ${fr(U.length, N)}. Adding ${fr(A.length, N)} + ${fr(B.length, N)} would count ${setStr(I)} twice.` };
  });
  T('PS8', 'PS', -0.6, () => {
    let Tn, h, N; do { Tn = pick([40, 50, 60, 80]); h = Tn * pick([0.2, 0.25, 0.3, 0.4]); N = pick([200, 300, 400, 500]); } while (!Number.isInteger(h) || !Number.isInteger((N * h) / Tn));
    const ans = (N * h) / Tn;
    return { q: `A spinner was spun ${Tn} times and landed on red ${h} times. Based on these results, about how many times would you expect it to land on red in ${N} spins?`,
      ...mcN(ans, [h, N - ans, Math.round(N / 4)]),
      exp: `The experimental probability of red is ${h} out of ${Tn} = ${fr(h, Tn)}. Multiply by the number of new spins: ${N} × ${fr(h, Tn)} = ${ans}.` };
  }, { a: 1.1 });
  T('PS9', 'PS', 0.0, () => {
    const ind = ['Flipping a coin and then rolling a die', 'Rolling a number cube two times', 'Drawing a card, putting it back, and drawing again', 'Spinning a spinner and then flipping a coin', 'Rolling a die and then spinning a spinner', 'Flipping a coin three times', 'Picking a marble, putting it back, and picking again'];
    const dep = ['Drawing two marbles from a bag without putting the first one back', 'Choosing a class president and then a different student as vice president', 'Taking a card from a deck, keeping it, and then taking another card', 'Choosing two people from a group to be on a team, one after the other', 'Picking a name from a hat, leaving it out, and then picking a second name'];
    if (Math.random() < 0.5) { const c = pick(dep); return { q: 'Which situation describes dependent events?', ...mc(c, sample(ind, 3)),
      exp: `Events are dependent when the first outcome changes the chances for the second. In “${c.toLowerCase()},” the first choice is not put back, so the second choice has fewer options. The other situations do not affect each other, so they are independent.` }; }
    const c = pick(ind); return { q: 'Which situation describes independent events?', ...mc(c, sample(dep, 3)),
      exp: `Events are independent when the first outcome does not change the chances for the second. In “${c.toLowerCase()},” the second event has the same possible outcomes no matter what happened first. In the other situations the first item is not replaced, so they are dependent.` };
  }, { a: 1.0 });
  T('PS10', 'PS', 1.2, () => {
    const kinds = [['an even integer', x => x % 2 === 0], ['an odd integer', x => Math.abs(x % 2) === 1], ['a multiple of 3', x => x % 3 === 0]];
    const [name, f] = pick(kinds), lo = ri(-2, 6), hi = lo + ri(6, 10), rng = (a, b) => [...Array(b - a + 1)].map((_, i) => a + i);
    const c = rng(lo + 1, hi).filter(f), other = kinds.find(k => k[0] !== name);
    return { q: `Which set is described by {<i>x</i> | <i>x</i> is ${name} and ${n(lo)} < <i>x</i> ≤ ${n(hi)}}?`,
      ...mc(setStr(c), [setStr(rng(lo, hi).filter(f)), setStr(rng(lo + 1, hi - 1).filter(f)), setStr(rng(lo + 1, hi).filter(other[1]))], () => { const dl = ri(-3, 3), dh = ri(-3, 3); return setStr(rng(lo + 1 + dl, hi + dh).filter(f)); }),
      exp: `Read the rule: <i>x</i> must be ${name}, greater than ${n(lo)} (so ${n(lo)} itself is excluded), and less than or equal to ${n(hi)} (so ${n(hi)} is included if it fits). The numbers that fit are ${setStr(c)}.` };
  }, { a: 1.2 });

  /* --- Rational numbers --- */
  T('RN6', 'RN', -0.8, () => {
    const A = ri(12, 49), B = ri(12, 49), C = ri(-90, 90), a = A / 10, b = B / 10, c = C / 10, val = +(-(A * B) / 100 + C / 10).toFixed(2);
    return { q: `What is the value of (${MINUS}${n(a)}) × ${n(b)} + ${par(c)}?`,
      ...mcN(val, [+((-a + c) * b).toFixed(2), +((A * B) / 100 + c).toFixed(2), +(-(A * B) / 1000 + c).toFixed(3)], n, 0.1),
      exp: `Multiply first: ${n(a)} × ${n(b)} = ${n((A * B) / 100)}, and a negative times a positive is negative, so the product is ${n(-(A * B) / 100)}. Then add ${n(c)}: ${n(-(A * B) / 100)} + ${c < 0 ? '(' + n(c) + ')' : n(c)} = ${n(val)}.` };
  });
  T('RN7', 'RN', 0.6, () => {
    let p, q, r, s; do { q = ri(2, 9); p = riNZ(-q + 1, q - 1); s = ri(2, 9); r = ri(1, s - 1); } while (gcd(p, q) !== 1 || gcd(r, s) !== 1 || p * s === r * q);
    const A = new F(p, q), B = new F(r, s), ans = A.div(B);
    return { q: `What is the value of <span class="fr cf"><span class="nu">${A.html()}</span><span class="de">${B.html()}</span></span>?`,
      ...mc(ans.html(), [A.mul(B).html(), B.div(A).html(), new F(p + r, q + s).html()], () => ans.add(new F(riNZ(-3, 3), ans.q)).html()),
      exp: `The main fraction bar means divide: ${A.html()} ÷ ${B.html()}. Dividing by a fraction means multiplying by its reciprocal: ${A.html()} × ${new F(s, r).html()}. Multiply and simplify: ${ans.html()}.` };
  });
  T('RN8', 'RN', 1.9, () => {
    const a = riNZ(-5, 5), k = ri(2, 6), strict = Math.random() < 0.5, cnt = strict ? 2 * k - 1 : 2 * k + 1;
    const inside = `${xi2} ${a < 0 ? '+ ' + -a : '− ' + a}`;
    return { q: `How many integers ${xi2} satisfy |${inside}| ${strict ? '<' : '≤'} ${k}?`,
      ...mcN(cnt, [2 * k, k, strict ? 2 * k + 1 : 2 * k - 1]),
      exp: `|${inside}| ${strict ? '<' : '≤'} ${k} means ${xi2} is ${strict ? 'less than' : 'at most'} ${k} units from ${n(a)}. So ${n(a - k)} ${strict ? '<' : '≤'} ${xi2} ${strict ? '<' : '≤'} ${n(a + k)}. The integers are ${n(a - k + (strict ? 1 : 0))} through ${n(a + k - (strict ? 1 : 0))}, which is ${cnt} integers.` };
  }, { a: 1.3 });

  /* --- Ratio and proportional relationships --- */
  T('RP8', 'RP', 0.0, () => {
    const k = pick([4, 5, 6, 8, 10, 12]), d = ri(5, 30) / 2, ans = d * k;
    return { q: `A floor plan uses the scale 1 inch : ${k} feet. A wall measures ${n(d)} inches on the plan. What is the actual length of the wall, in feet?`,
      ...mcN(ans, [+(d / k).toFixed(2), d + k, ans * 12]),
      exp: `Each inch on the plan stands for ${k} feet. Multiply: ${n(d)} × ${k} = ${n(ans)} feet.` };
  });
  T('RP9', 'RP', 0.7, () => {
    let T0, S, m; do { T0 = pick([30, 40, 50, 60]); S = pick([40, 50, 60, 80]); m = ri(3, 15); } while ((T0 * S) % m !== 0);
    const ans = (T0 * S) / m;
    return { q: `To estimate the number of fish in a lake, a biologist catches ${T0} fish, tags them, and releases them. Later she catches ${S} fish and finds that ${m} of them are tagged. Based on this, about how many fish are in the lake?`,
      ...mcN(ans, [Math.round((T0 * m) / S), T0 + S - m, Math.round((S * m) / T0)]),
      exp: `Assume the share of tagged fish in her second catch matches the share in the whole lake: ${fr(m, S)} = ${fracHTML(T0, '<i>N</i>')}. Cross-multiply: ${m}<i>N</i> = ${T0} × ${S} = ${T0 * S}. Divide by ${m}: <i>N</i> = ${n(ans)} fish.` };
  });

  /* --- Exponents --- */
  const cbrt = s => `<sup class="idx">3</sup>√<span class="rad">${s}</span>`;
  T('EX7', 'EX', -0.6, () => {
    let r; do { r = riNZ(-10, 10); } while (Math.abs(r) === 1);
    const c = r ** 3;
    return { q: `What is the value of ${cbrt(n(c))}?`, ...mcN(r, [-r, Number.isInteger(c / 3) ? c / 3 : r * 3, r * r]),
      exp: `A cube root asks which number, multiplied by itself three times, gives ${n(c)}. ${par(r)} × ${par(r)} × ${par(r)} = ${n(c)}. So ${cbrt(n(c))} = ${n(r)}.${r < 0 ? ' The cube root of a negative number is negative.' : ''}` };
  }, { a: 1.1 });
  T('EX8', 'EX', -1.0, () => {
    let N; do { N = ri(5, 140); } while (Number.isInteger(Math.sqrt(N)));
    const lo = Math.floor(Math.sqrt(N)), pr = (a, b) => `${a} and ${b}`, h = Math.floor(N / 2);
    return { q: `${sqrtH(N)} is between which two consecutive whole numbers?`,
      ...mc(pr(lo, lo + 1), [pr(lo - 1, lo), pr(lo + 1, lo + 2), pr(h, h + 1)], () => pr(lo + 2, lo + 3)),
      exp: `Find the perfect squares on either side of ${N}: ${lo}<sup>2</sup> = ${lo * lo} and ${lo + 1}<sup>2</sup> = ${(lo + 1) ** 2}. Since ${lo * lo} < ${N} < ${(lo + 1) ** 2}, ${sqrtH(N)} is between ${lo} and ${lo + 1}.` };
  }, { a: 1.0 });
  T('EX9', 'EX', 0.3, () => {
    const c = pick([2.5, 3.4, 4.07, 6, 7.2, 8.1, 1.9]), small = Math.random() < 0.5, e = small ? ri(3, 6) : ri(5, 8);
    const sci = (cc, ex) => `${n(cc)} × ${sup(10, ex < 0 ? MINUS + -ex : ex)}`;
    const std = small ? (c / 10 ** e).toFixed(e + 3).replace(/0+$/, '') : Math.round(c * 10 ** e).toLocaleString('en-US');
    const ex = small ? -e : e;
    return { q: `Which of the following is ${std} written in scientific notation?`,
      ...mc(sci(c, ex), [sci(c, -ex), sci(c, ex + 1), sci(c, ex - 1)]),
      exp: `Move the decimal point so exactly one nonzero digit is to its left: ${n(c)}. You moved it ${e} places to the ${small ? 'right' : 'left'}. ${small ? 'Numbers less than 1 get a negative exponent' : 'Large numbers get a positive exponent'}, so the answer is ${sci(c, ex)}.` };
  });
  T('EX10', 'EX', 1.5, () => {
    let p, q; do { p = ri(2, 7); q = ri(2, 5); } while (p === q || p % q === 0 || gcd(p, q) !== 1);
    const root = (idx, inner) => `${idx === 2 ? '' : `<sup class="idx">${idx}</sup>`}√<span class="rad">${inner}</span>`;
    return { q: `Which of the following is equivalent to ${X}<sup>${p}/${q}</sup> for ${X} > 0?`,
      ...mc(root(q, sup(X, p)), [root(p, sup(X, q)), fracHTML(sup(X, p), q), sup(X, p * q)]),
      exp: `In a rational exponent, the numerator is the power and the denominator is the root. So ${X}<sup>${p}/${q}</sup> is the ${q === 2 ? 'square' : q === 3 ? 'cube' : q + 'th'} root of ${sup(X, p)}: ${root(q, sup(X, p))}.` };
  }, { a: 1.3 });

  /* --- Algebraic expressions --- */
  T('AE6', 'AE', -0.3, () => {
    const a = riNZ(-6, 6), b = riNZ(-6, 6), c = riNZ(-6, 6), p = ri(2, 5), q = ri(2, 5), val = p * a - q * b + c;
    const V = s => `<i>${s}</i>`, par = x => (x < 0 ? `(${n(x)})` : n(x));
    return { q: `What is the value of ${p}${V('a')} − ${q}${V('b')} + ${V('c')} when ${V('a')} = ${n(a)}, ${V('b')} = ${n(b)}, and ${V('c')} = ${n(c)}?`,
      ...mcN(val, [p * a + q * b + c, p * a - q * b - c, p * a - b + c]),
      exp: `Substitute each value, using parentheses for negatives: ${p}${par(a)} − ${q}${par(b)} + ${par(c)}. Multiply: ${n(p * a)} − ${par(q * b)} + ${par(c)}. Combine: ${n(val)}.` };
  });
  T('AE7', 'AE', 1.6, () => {
    const x = riNZ(-6, 6), y = riNZ(-6, 6), val = Math.abs(2 * x - y) - Math.abs(x);
    return { q: `What is the value of |2${xi2} − ${Y}| − |${xi2}| when ${xi2} = ${n(x)} and ${Y} = ${n(y)}?`,
      ...mcN(val, [(2 * x - y) - x, Math.abs(2 * x - y) + Math.abs(x), Math.abs(2 * x - y - x)]),
      exp: `Substitute: |2(${n(x)}) − (${n(y)})| − |${n(x)}|. Inside the first bars: ${n(2 * x)} − (${n(y)}) = ${n(2 * x - y)}. Take absolute values: ${Math.abs(2 * x - y)} − ${Math.abs(x)} = ${n(val)}.` };
  }, { a: 1.3 });

  /* --- Geometry --- */
  T('G1g', 'G1', 0.0, () => {
    const x1 = ri(-6, 2), y1 = ri(-6, 2), w = ri(3, 8), h = ri(2, 7), area = Math.random() < 0.6;
    const V = [[x1, y1], [x1 + w, y1], [x1 + w, y1 + h], [x1, y1 + h]];
    return { q: `A rectangle has vertices at ${V.map(v => pt(...v)).join(', ')}. What is the ${area ? 'area of the rectangle, in square units' : 'perimeter of the rectangle, in units'}?`,
      ...mcN(area ? w * h : 2 * (w + h), [area ? 2 * (w + h) : w * h, w + h, (w + 1) * (h + 1)]),
      exp: `Width: from ${xi2} = ${n(x1)} to ${xi2} = ${n(x1 + w)} is ${w} units. Height: from ${Y} = ${n(y1)} to ${Y} = ${n(y1 + h)} is ${h} units. ${area ? `Area = ${w} × ${h} = ${w * h} square units.` : `Perimeter = 2(${w} + ${h}) = ${2 * (w + h)} units.`}` };
  });
  T('G1h', 'G1', 1.6, () => {
    const L = ri(8, 16), W = ri(6, 12), H = ri(4, 10), l = ri(2, L - 4), w = ri(2, W - 3), V = (L * W - l * w) * H;
    return { q: `A concrete block is a rectangular prism ${L} inches long, ${W} inches wide, and ${H} inches tall. A rectangular hole ${l} inches by ${w} inches goes straight through the full height of the block. What is the volume of concrete in the block, in cubic inches?`,
      ...mcN(V, [L * W * H, (L - l) * (W - w) * H, L * W * H - l * w]),
      exp: `Volume of the solid block: ${L} × ${W} × ${H} = ${n(L * W * H)}. Volume of the hole: ${l} × ${w} × ${H} = ${n(l * w * H)}. Subtract: ${n(L * W * H)} − ${n(l * w * H)} = ${n(V)} cubic inches.` };
  }, { a: 1.3 });
  T('G2g', 'G2', 0.5, () => {
    const half = Math.random() < 0.3, k = half ? new F(1, 2) : new F(pick([2, 3])), x = riNZ(-5, 5) * (half ? 2 : 1), y = riNZ(-5, 5) * (half ? 2 : 1);
    const kv = k.val(), img = pt(x * kv, y * kv);
    return { q: `The point ${pt(x, y)} is dilated by a scale factor of ${k.html()} with the center of dilation at the origin. What are the coordinates of its image?`,
      ...mc(img, [pt(x + kv, y + kv), pt(x * kv, y), pt(y * kv, x * kv)], () => pt(x * kv + riNZ(-2, 2), y * kv)),
      exp: `A dilation centered at the origin multiplies both coordinates by the scale factor. (${n(x)} × ${k.html()}, ${n(y)} × ${k.html()}) = ${img}.` };
  });
  T('G2h', 'G2', 1.4, () => {
    const a = ri(1, 9), b = ri(1, 9), W2 = (u, v) => `${sup(X, 2)} + ${u}${X} + ${v}`;
    return { q: `A rectangle has a length of (${X} + ${a}) units and a width of (${X} + ${b}) units. Which expression represents its area, in square units?`,
      ...mc(W2(a + b, a * b), [`${sup(X, 2)} + ${a * b}`, W2(a * b, a + b), `2${X} + ${a + b}`], () => W2(a + b + riNZ(-2, 2), a * b)),
      exp: `Area = length × width = (${X} + ${a})(${X} + ${b}). Multiply each term of the first by each term of the second: ${X}·${X} + ${b}${X} + ${a}${X} + ${a}·${b}. Combine like terms: ${W2(a + b, a * b)}.` };
  }, { a: 1.3 });
  T('G2i', 'G2', 0.7, () => {
    const [p, q, r] = pick(TRIPLES), s = pick([1, 2]), a = p * s, b = q * s, c = r * s;
    return { q: `A ${c}-foot ladder leans against a vertical wall. The bottom of the ladder is ${a} feet from the base of the wall. How high up the wall does the top of the ladder reach, in feet?`,
      ...mcN(b, [c - a, c + a, Math.round(Math.sqrt(c * c + a * a))]),
      exp: `The ladder, the wall, and the ground form a right triangle, and the ladder is the hypotenuse. ${a}<sup>2</sup> + <i>h</i><sup>2</sup> = ${c}<sup>2</sup>, so <i>h</i><sup>2</sup> = ${c * c} − ${a * a} = ${b * b}. Take the square root: <i>h</i> = ${b} feet.` };
  });

  const META2 = {
    DS9: ['Reading a scatter plot', 'Points rising left to right show a positive association; falling shows a negative one.'],
    DS10: ['Line of best fit', 'Estimate the y-intercept where the cloud of points starts, then the rise over run across the cloud.'],
    DS11: ['Predicting from a line of best fit', 'Substitute the given x-value into the line’s equation.'],
    DS12: ['Reading a histogram', 'Each bar counts the values in its interval. Add the bars that match the condition.'],
    DS13: ['Mode', 'The mode is the value that appears most often.'],
    LA12: ['Inequalities on a number line', 'Open circle: not included (< or >). Filled circle: included (≤ or ≥). The arrow shows the direction.'],
    LA13: ['Linear vs. nonlinear functions', 'Linear means x only to the first power: no squares, no x in an exponent or a denominator.'],
    LA14: ['Solutions of a two-variable inequality', 'Substitute the point and check whether the inequality is true.'],
    LA15: ['Comparing linear functions', 'Find each function’s slope and y-intercept, from a table, graph, or equation, then compare.'],
    LE7: ['Compound inequalities', 'Do the same operation to all three parts at once.'],
    LE8: ['Inequalities with variables on both sides', 'Collect x-terms on one side. Flip the sign if you divide by a negative.'],
    LE9: ['Checking a solution to a system', 'A solution must make every equation in the system true.'],
    PS7: ['Probability of A or B', 'P(A or B) counts each outcome once: subtract the overlap if you add.'],
    PS8: ['Experimental probability and predictions', 'Use the observed fraction, then multiply by the number of new trials.'],
    PS9: ['Independent vs. dependent events', 'Dependent: the first outcome changes the chances for the second (usually “without replacement”).'],
    PS10: ['Set-builder notation', 'Read the rule and the boundaries: < excludes the endpoint, ≤ includes it.'],
    RN6: ['Operations with decimals', 'Multiply before adding, and track the sign.'],
    RN7: ['Complex fractions', 'A fraction over a fraction is division: multiply by the reciprocal of the bottom.'],
    RN8: ['Absolute value inequalities', '|x − a| < k means x is within k units of a.'],
    RP8: ['Scale drawings', 'Multiply the drawing length by the number of real units per drawing unit.'],
    RP9: ['Estimating a population with a proportion', 'Tagged in sample ÷ sample size = tagged total ÷ population.'],
    EX7: ['Cube roots', 'The cube root of n is the number that, used three times as a factor, gives n.'],
    EX8: ['Estimating square roots', 'Find the perfect squares just below and just above the number.'],
    EX9: ['Converting to scientific notation', 'One nonzero digit before the decimal point; the exponent counts how far the point moved.'],
    EX10: ['Rational exponents and radicals', 'x<sup>p/q</sup> is the q-th root of x<sup>p</sup>: the denominator is the root.'],
    AE6: ['Evaluating with several variables', 'Substitute every value in parentheses, then follow the order of operations.'],
    AE7: ['Absolute value expressions', 'Evaluate inside the bars first, then take the absolute value.'],
    G1g: ['Rectangles on the coordinate plane', 'Side lengths are differences of coordinates.'],
    G1h: ['Volume of a composite solid', 'Whole volume minus the part that is removed.'],
    G2g: ['Dilations', 'Centered at the origin, multiply both coordinates by the scale factor.'],
    G2h: ['Area with polynomials', 'Multiply every term of one factor by every term of the other, then combine like terms.'],
    G2i: ['Pythagorean word problems', 'Find the right triangle and its hypotenuse, then use a² + b² = c².']
  };

  /* ===== skill name and key idea for each question type ===== */
  const META = {
    RN1: ['Integer operations', 'Multiply before you add or subtract, and treat subtracting a negative as adding.'],
    RN2: ['Subtracting negatives in a fraction', 'a − (−b) = a + b. Simplify the numerator first, then reduce.'],
    RN3: ['Changes with negative numbers', 'Apply each change in order: a rise adds, a drop subtracts.'],
    RN4: ['Absolute value expressions', 'Evaluate inside the bars first. An absolute value is never negative.'],
    RN5: ['Order of operations with fractions', 'Multiply before adding, even when the numbers are fractions.'],
    RP0: ['Simplifying a ratio', 'Divide both parts by their greatest common factor, and keep the order the question asks for.'],
    RP1: ['Unit price', 'Unit price = total price ÷ number of items.'],
    RP2: ['One-step metric conversion', 'Going from a bigger unit to a smaller unit, multiply.'],
    RP3: ['Scaling a recipe', 'Multiply the original amount by (new quantity ÷ old quantity).'],
    RP4: ['Rates with minutes and hours', 'Convert minutes to hours (÷ 60) before using a per-hour rate.'],
    RP5: ['Multistep unit conversion', 'Write the units at each step so they cancel: gallons per minute × minutes × liters per gallon.'],
    RP6: ['Percent decrease', 'Percent change = change ÷ original amount, not the new amount.'],
    RP7: ['Converting km/h to m/s', 'Multiply by 1,000 (km to m) and divide by 3,600 (hours to seconds).'],
    EX0: ['Powers and square roots', 'a<sup>n</sup> means multiply a by itself n times. A square root undoes squaring.'],
    EX1: ['Squares and roots in an expression', 'Evaluate the power and the root first, then subtract.'],
    EX2: ['Exponent rules', 'Same base multiplied: add exponents. Power of a power: multiply exponents.'],
    EX3: ['Scientific notation', 'Multiply the numbers, add the exponents, then adjust so the number is between 1 and 10.'],
    EX4: ['Negative exponents', 'a<sup>−n</sup> = 1 / a<sup>n</sup>. A negative exponent makes a reciprocal, not a negative number.'],
    EX5: ['Fractional exponents', 'For a<sup>p/q</sup>, take the q-th root first, then raise to the power p.'],
    EX6: ['Simplifying square roots', 'Pull out the largest perfect-square factor.'],
    AE1: ['Evaluating with a negative value', 'Put a negative value in parentheses when you substitute. A negative number squared is positive.'],
    AE2: ['Translating words to expressions', '“Less than” reverses the order. “The sum of” needs parentheses when it is multiplied.'],
    AE3: ['Equivalent expressions', 'Distribute first, then combine like terms.'],
    AE4: ['Writing a cost expression', 'One-time amounts are added once. Per-unit amounts multiply their variable.'],
    AE5: ['Input of a nonlinear function', 'Set the function equal to the given output and solve for the input.'],
    LE1: ['Two-step equations', 'Undo the addition or subtraction first, then the multiplication.'],
    LE2: ['Equations with parentheses', 'Distribute, then move the x-terms to one side and the numbers to the other.'],
    LE3: ['Equations with fractions', 'Multiply every term by a common denominator to clear the fractions.'],
    LE4: ['Linear inequalities', 'Multiplying or dividing by a negative number flips the inequality sign.'],
    LE5: ['Systems by elimination', 'Add or subtract the equations so one variable cancels.'],
    LE6: ['Solving for y in terms of x', 'Move the x-term, then divide every term by the coefficient of y.'],
    LA1: ['Reading coordinates', '(x, y): the horizontal position comes first, then the vertical.'],
    LA2: ['Substituting into a linear equation', 'Replace the known variable with its value, then solve for the other.'],
    LA3: ['Modeling with a linear equation', 'Total = rate × variable + one-time fee.'],
    LA4: ['Slope from two points', 'Slope = (y₂ − y₁) ÷ (x₂ − x₁). Keep the same point order on top and bottom.'],
    LA5: ['Line from an intercept and a point', 'Find the slope from the two points; the y-intercept is b.'],
    LA6: ['Line from a table', 'Slope = change in y ÷ change in x. Check your equation against every row.'],
    LA7: ['Interpreting slope and intercept', 'The constant is the starting value; the coefficient of the variable is the rate of change.'],
    LA8: ['Parallel lines', 'Parallel lines have the same slope. Use the given point to find b.'],
    LA9: ['Perpendicular lines', 'A perpendicular slope is the negative reciprocal: flip the fraction and change the sign.'],
    LA10: ['Line from a graph', 'Read b where the line crosses the y-axis, then count rise over run.'],
    LA11: ['System word problems', 'Write one equation for the number of things and one for the total value.'],
    PS0: ['Spinner probability', 'Favorable sections ÷ total equal sections.'],
    PS1: ['Simple probability', 'Favorable outcomes ÷ total outcomes.'],
    PS2: ['Compound probability', 'Count outcomes in the full sample space, or multiply independent probabilities.'],
    PS3: ['Conditional probability from a table', 'The condition sets the denominator: use that row or column total, not the grand total.'],
    PS4: ['Union and intersection', '∩ means in both sets; ∪ means in either set, listed once.'],
    PS5: ['Combined set operations', 'Do the operation in parentheses first.'],
    PS6: ['Probability without replacement', 'After each draw, reduce both the favorable count and the total by one.'],
    DS1: ['Reading a bar graph', 'Read each bar against the gridlines, then compare.'],
    DS2: ['Finding the mean', 'Add all the values, then divide by how many there are.'],
    DS3: ['Median of an even-sized set', 'Sort the values first, then average the two middle ones.'],
    DS4: ['Effect of an outlier', 'An extreme value pulls the mean much more than the median.'],
    DS5: ['Missing value from a mean', 'Total = mean × count. Subtract the known values from the total.'],
    DS6: ['Comparing two data sets', 'Find each mean and median separately; they can point in different directions.'],
    DS7: ['Change between paired bars', 'Compute each change. The tallest bar is not always the biggest increase.'],
    DS8: ['Reading a box plot', 'Range = maximum − minimum. IQR = Q3 − Q1, the width of the box.'],
    G1a: ['Rectangle perimeter', 'Perimeter = 2 × (length + width).'],
    G1b: ['Triangle area', 'Area = ½ × base × height.'],
    G1c: ['Circle area and circumference', 'Area = πr² and circumference = 2πr. Halve a diameter to get the radius.'],
    G1d: ['Missing dimension of a prism', 'Height = volume ÷ (length × width).'],
    G1e: ['Scaling volume', 'Multiplying every length by k multiplies the volume by k³.'],
    G1f: ['Area with a cutout', 'Area of the whole shape minus the area of the cutout.'],
    G2a: ['Pythagorean theorem', 'a² + b² = c², where c is the hypotenuse, the longest side.'],
    G2b: ['Distance between points', 'Distance = √(Δx² + Δy²), the Pythagorean theorem on the grid.'],
    G2c: ['Single transformations', 'x-axis: (x, −y). y-axis: (−x, y). 90° counterclockwise: (−y, x). 90° clockwise: (y, −x). 180°: (−x, −y).'],
    G2d: ['Perimeter and area expressions', 'Write the length in terms of w first, then put it into the formula.'],
    G2e: ['Two transformations in a row', 'Apply the transformations in the stated order, one at a time.'],
    G2f: ['Translating a point', 'Right or left changes x; up or down changes y.']
  };
  BANK.forEach(it => { const m = META[it.id] || META2[it.id]; if (!m) throw new Error('no meta ' + it.id); it.name = m[0]; it.tip = m[1]; });

  G.QAS_ITEMS = { BANK };
})(typeof window !== 'undefined' ? window : globalThis);
