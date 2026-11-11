/* Progress dashboard: patterns across saved attempts, interactive charts, insights and topic practice. */
(function () {
  let view = { range: 5, test: null, topic: null };
  let CTX = null;

  /* ---------- tooltip (shared by every chart) ---------- */
  let tip = null;
  function ensureTip() {
    if (tip) return;
    tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
    const show = (el, x, y) => {
      tip.innerHTML = el.getAttribute('data-tip'); tip.hidden = false;
      const r = tip.getBoundingClientRect(), W = window.innerWidth;
      let left = x + 14, top = y + 14;
      if (left + r.width > W - 8) left = x - r.width - 14;
      if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
      tip.style.left = Math.max(8, left) + 'px'; tip.style.top = Math.max(8, top) + 'px';
    };
    document.addEventListener('pointermove', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el, e.clientX, e.clientY); else tip.hidden = true; });
    document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); show(el, r.right, r.top); } });
    document.addEventListener('focusout', () => (tip.hidden = true));
    document.addEventListener('scroll', () => (tip.hidden = true), true);
  }

  /* ---------- data ---------- */
  function analyze(ctx) {
    const { E, BANK, store } = ctx;
    const hist = store.get(), detailed = hist.filter(h => Array.isArray(h.items));
    const thOf = h => (typeof h.theta === 'number' ? h.theta : (h.score - 250) / 16);
    const win = view.range === 0 ? detailed : detailed.slice(-view.range);
    const recent = hist.slice(-3), thNow = recent.length ? recent.reduce((a, h) => a + thOf(h), 0) / recent.length : 0;
    const byId = Object.fromEntries(BANK.map(it => [it.id, it]));
    const cats = Object.keys(E.BLUEPRINT);
    const topic = {}; cats.forEach(k => (topic[k] = { n: 0, k: 0, exp: 0, per: [], types: {} }));
    const ids = {}, lev = [0, 1, 2, 3, 4].map(() => ({ n: 0, k: 0 }));
    win.forEach((h, wi) => {
      const th = thOf(h), per = {}; cats.forEach(k => (per[k] = { n: 0, k: 0, exp: 0 }));
      for (const r of h.items) {
        if (!topic[r.c]) continue;
        const p = E.P(th, { a: r.a || 1.2, b: r.b });
        const T = topic[r.c]; T.n++; T.k += r.u; T.exp += p;
        per[r.c].n++; per[r.c].k += r.u; per[r.c].exp += p;
        const t = ids[r.id] || (ids[r.id] = { n: 0, miss: 0, sur: 0, last: null }); t.n++; t.last = r.u; if (!r.u) { t.miss++; t.sur += p; }
        const ty = T.types[r.id] || (T.types[r.id] = { n: 0, k: 0 }); ty.n++; ty.k += r.u;
        const L = lev[E.bandOf(E.toScore(r.b))]; L.n++; L.k += r.u;
      }
      cats.forEach(k => topic[k].per.push(per[k]));
    });
    return { hist, detailed, win, thOf, thNow, byId, cats, topic, ids, lev };
  }
  const resid = T => (T.n ? (T.k - T.exp) / T.n : 0);
  function statusOf(T) {
    if (T.n < 4) return ['na', 'Too few questions'];
    const d = resid(T); return d <= -0.12 ? ['weak', 'Focus here'] : d >= 0.12 ? ['strong', 'Strong'] : ['ok', 'On track'];
  }
  const pct = (k, n) => (n ? Math.round((100 * k) / n) + '%' : '—');
  const dateStr = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  /* ---------- insights ---------- */
  function insights(A, ctx) {
    const { E, BAND_NAMES } = ctx, out = [], H = A.hist, latest = H[H.length - 1];
    if (H.length >= 2) {
      const n = H.length, xs = H.map((_, i) => i), ys = H.map(h => h.score), mx = (n - 1) / 2, my = ys.reduce((a, b) => a + b) / n;
      const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      const d = latest.score - H[0].score;
      out.push({ kind: d > 0 ? 'good' : d < 0 ? 'bad' : 'info', title: d === 0 ? 'Same score as your first test' : `${d > 0 ? 'Up' : 'Down'} ${Math.abs(d)} point${Math.abs(d) === 1 ? '' : 's'} since your first test`, body: `Across ${n} tests your score has moved about ${slope >= 0 ? '+' : '−'}${Math.abs(slope).toFixed(1)} points per test.` });
    }
    const band = E.bandOf(latest.score);
    if (band < 4) { const need = [237, 250, 263, 276][band] - latest.score; out.push({ kind: 'info', title: `${need} point${need === 1 ? '' : 's'} to the ${BAND_NAMES[band + 1]} band`, body: `Your latest score is ${latest.score}. The next band starts at ${[237, 250, 263, 276][band]}.` }); }
    const rated = A.cats.filter(k => A.topic[k].n >= 4).map(k => [k, resid(A.topic[k])]).sort((a, b) => a[1] - b[1]);
    if (rated.length) {
      const [wk, wv] = rated[0], [sk, sv] = rated[rated.length - 1], W = A.topic[wk], S = A.topic[sk];
      if (wv < -0.05) out.push({ kind: 'bad', title: `Weakest: ${E.CATS[wk]}`, body: `${W.k} of ${W.n} correct (${pct(W.k, W.n)}), about ${Math.round((100 * W.exp) / W.n)}% expected at your level.`, act: ['practice', wk, 'Practice this topic'], topic: wk });
      if (sv > 0.05 && sk !== wk) out.push({ kind: 'good', title: `Strongest: ${E.CATS[sk]}`, body: `${S.k} of ${S.n} correct (${pct(S.k, S.n)}), above the ${Math.round((100 * S.exp) / S.n)}% expected.`, topic: sk });
    }
    // most improved topic: residual in the later half of all detailed tests vs the earlier half
    if (A.detailed.length >= 4) {
      const half = Math.floor(A.detailed.length / 2), part = list => { const m = {}; for (const h of list) { const th = A.thOf(h); for (const r of h.items) { const o = m[r.c] || (m[r.c] = { n: 0, k: 0, e: 0 }); o.n++; o.k += r.u; o.e += E.P(th, { a: r.a || 1.2, b: r.b }); } } return m; };
      const a = part(A.detailed.slice(0, half)), b = part(A.detailed.slice(half));
      let best = null; for (const k of A.cats) { if (!a[k] || !b[k] || a[k].n < 3 || b[k].n < 3) continue; const imp = (b[k].k / b[k].n) - (a[k].k / a[k].n); if (!best || imp > best[1]) best = [k, imp, a[k], b[k]]; }
      if (best && best[1] > 0.1) out.push({ kind: 'good', title: `Most improved: ${E.CATS[best[0]]}`, body: `From ${pct(best[2].k, best[2].n)} correct in your earlier tests to ${pct(best[3].k, best[3].n)} in your later ones.`, topic: best[0] });
    }
    const sur = Object.entries(A.ids).filter(([, t]) => t.miss && t.sur / t.miss >= 0.6).sort((x, y) => y[1].sur - x[1].sur)[0];
    if (sur) { const it = A.byId[sur[0]]; if (it) out.push({ kind: 'bad', title: `Careless-miss check: ${it.name}`, body: `You missed ${sur[1].miss} of ${sur[1].n} even though students at your level usually get these right. ${it.tip}`, act: ['practice', it.cat, 'Practice'], topic: it.cat }); }
    return out.slice(0, 5);
  }

  /* ---------- charts ---------- */
  function trendSVG(A, E) {
    const H = A.hist, W = 640, Ht = 230, L = 40, R = 46, T = 20, B = 40, n = H.length, pad = 22;
    const x = i => (n === 1 ? (L + W - R) / 2 : L + pad + (i * (W - L - R - 2 * pad)) / (n - 1)), y = s => T + ((300 - s) / 100) * (Ht - T - B);
    let s = `<svg class="viz trend" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Score for each saved test">`;
    [237, 250, 263, 276].forEach(v => (s += `<line class="gl" stroke-dasharray="3 4" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tk" x="${W - R + 6}" y="${y(v) + 4}">${v}</text>`));
    [200, 300].forEach(v => (s += `<text class="tk" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`));
    s += `<line class="ax" x1="${L}" x2="${W - R}" y1="${Ht - B}" y2="${Ht - B}"/>`;
    if (n > 1) s += `<polyline class="line" points="${H.map((h, i) => `${x(i)},${y(h.score)}`).join(' ')}"/>`;
    const day = d => new Date(d).toDateString(), every = Math.ceil(n / 12);
    H.forEach((h, i) => {
      const sel = view.test === i, correct = Array.isArray(h.items) ? h.items.reduce((a, r) => a + r.u, 0) : null;
      const tipTxt = `<b>Test #${i + 1}</b> · ${dateStr(h.t)}${h.sim ? ' · simulated' : ''}<br>Score ${h.score} (${CTX.BAND_NAMES[E.bandOf(h.score)]})${correct !== null ? `<br>${correct} of 20 correct` : ''}<br><span class="tip-hint">Select to see this test</span>`;
      s += `<g class="pt-g${sel ? ' sel' : ''}" data-test="${i}" tabindex="0" role="button" aria-label="Test ${i + 1}, score ${h.score}" data-tip="${tipTxt.replace(/"/g, '&quot;')}">
        <circle class="hit" cx="${x(i)}" cy="${y(h.score)}" r="14"/>
        <circle class="pt${h.sim ? ' sim' : ''}" cx="${x(i)}" cy="${y(h.score)}" r="${sel ? 7 : 5}"/></g>`;
      if (n <= 10 || i === n - 1 || sel) s += `<text class="lbl" x="${x(i)}" y="${y(h.score) - 12}" text-anchor="middle">${h.score}</text>`;
      if (i % every === 0 || i === n - 1) s += `<text class="tk" x="${x(i)}" y="${Ht - B + 16}" text-anchor="middle">#${i + 1}</text>`;
      if (i === 0 || day(h.t) !== day(H[i - 1].t)) s += `<text class="tk" x="${x(i)}" y="${Ht - B + 30}" text-anchor="middle">${dateStr(h.t)}</text>`;
    });
    return s + '</svg>';
  }

  function heatmapHTML(A, E) {
    const offset = A.detailed.length - A.win.length;
    const head = A.win.map((h, i) => `<th scope="col" class="num">#${A.hist.indexOf(h) + 1}${h.sim ? '<span class="sim-mark" title="Simulated">*</span>' : ''}</th>`).join('');
    const rows = A.cats.map(k => {
      const cells = A.topic[k].per.map((c, i) => {
        if (!c.n) return `<td><span class="cell empty" data-tip="<b>${E.SHORT[k]}</b><br>Not on this test">–</span></td>`;
        const d = Math.max(-0.5, Math.min(0.5, (c.k - c.exp) / c.n)), mix = Math.round(Math.abs(d) * 200);
        const tipTxt = `<b>${E.CATS[k]}</b> · test #${A.hist.indexOf(A.win[i]) + 1}<br>${c.k} of ${c.n} correct<br>About ${c.exp.toFixed(1)} expected at that test's level`;
        return `<td><button class="cell ${d < 0 ? 'lo' : 'hi'}${mix > 60 ? ' strong' : ''}" style="--m:${mix}%" data-topic="${k}" data-tip="${tipTxt}">${c.k}/${c.n}</button></td>`;
      }).join('');
      return `<tr class="${view.topic === k ? 'sel' : ''}"><th scope="row"><button class="row-btn" data-topic="${k}">${E.SHORT[k]}</button></th>${cells}</tr>`;
    }).join('');
    return `<div class="heat-wrap"><table class="heat"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      <div class="legend"><span>Below expected</span><span class="grad" aria-hidden="true"></span><span>Above expected</span>${A.win.some(h => h.sim) ? '<span class="muted">* simulated test</span>' : ''}${offset ? `<span class="muted">Showing your last ${A.win.length} of ${A.detailed.length} detailed tests</span>` : ''}</div>`;
  }

  function dumbbellSVG(A, E) {
    const W = 640, rowH = 26, L = 190, R = 90, T = 26, n = A.cats.length, Ht = T + n * rowH + 22, x = v => L + v * (W - L - R);
    let s = `<svg class="viz dumb" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Your accuracy compared with the expected accuracy for each topic">`;
    [0, 0.25, 0.5, 0.75, 1].forEach(v => (s += `<line class="gl" x1="${x(v)}" x2="${x(v)}" y1="${T - 6}" y2="${Ht - 22}"/><text class="tk" x="${x(v)}" y="${Ht - 6}" text-anchor="middle">${v * 100}%</text>`));
    A.cats.forEach((k, i) => {
      const Tt = A.topic[k], cy = T + i * rowH + rowH / 2, [cls, lab] = statusOf(Tt), sel = view.topic === k;
      s += `<g class="drow${sel ? ' sel' : ''}" data-topic="${k}" tabindex="0" role="button" aria-label="${E.CATS[k]}: ${pct(Tt.k, Tt.n)} correct" data-tip="<b>${E.CATS[k]}</b><br>You: ${Tt.k} of ${Tt.n} (${pct(Tt.k, Tt.n)})<br>Expected: ${Tt.n ? Math.round((100 * Tt.exp) / Tt.n) + '%' : '—'}<br><span class='tip-hint'>Select to open this topic</span>">
        <rect class="row-hit" x="0" y="${cy - rowH / 2}" width="${W}" height="${rowH}"/>
        <text class="rl" x="${L - 12}" y="${cy + 4}" text-anchor="end">${E.SHORT[k]}</text>`;
      if (Tt.n) {
        const a = Tt.k / Tt.n, e = Tt.exp / Tt.n;
        s += `<line class="conn" x1="${x(Math.min(a, e))}" x2="${x(Math.max(a, e))}" y1="${cy}" y2="${cy}"/><circle class="exp" cx="${x(e)}" cy="${cy}" r="5"/><circle class="you ${cls}" cx="${x(a)}" cy="${cy}" r="6"/>`;
      }
      s += `<text class="st ${cls}" x="${W - R + 10}" y="${cy + 4}">${cls === 'na' ? 'Few data' : lab}</text></g>`;
    });
    s += `<text class="tk" x="${L}" y="12">● You</text><text class="tk" x="${L + 60}" y="12">○ Expected at your level</text>`;
    return s + '</svg>';
  }

  function curveSVG(A, E, BAND_NAMES) {
    const W = 640, Ht = 220, L = 44, R = 16, T = 16, B = 40, y = v => T + (1 - v) * (Ht - T - B), cw = (W - L - R) / 5;
    let s = `<svg class="viz curve" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Your accuracy at each question level">`;
    [0, 0.5, 1].forEach(v => (s += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tk" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text>`));
    const mids = [-1.6, -0.6, 0.2, 1.0, 1.8];
    A.lev.forEach((Lv, i) => {
      const cx = L + cw * i + cw / 2, bw = Math.min(56, cw * 0.55), v = Lv.n ? Lv.k / Lv.n : 0;
      if (Lv.n) s += `<rect class="bar1" x="${cx - bw / 2}" y="${y(v)}" width="${bw}" height="${Math.max(0, y(0) - y(v))}" rx="4" data-tip="<b>Questions at ${BAND_NAMES[i]}</b><br>${Lv.k} of ${Lv.n} correct (${pct(Lv.k, Lv.n)})<br>Expected at your level: ${Math.round(100 * E.P(A.thNow, { a: 1.2, b: mids[i] }))}%"/>`;
      else s += `<text class="tk" x="${cx}" y="${y(0) - 6}" text-anchor="middle">none</text>`;
      s += `<text class="tk" x="${cx}" y="${Ht - B + 16}" text-anchor="middle">${BAND_NAMES[i]}</text>`;
    });
    // the curve shares the bars' x positions: each band's center sits at that band's typical difficulty
    const cx = i => L + cw * i + cw / 2, xb = b => { if (b <= mids[0]) return cx(0) - ((mids[0] - b) / (mids[1] - mids[0])) * cw; for (let i = 0; i < 4; i++) if (b <= mids[i + 1]) return cx(i) + ((b - mids[i]) / (mids[i + 1] - mids[i])) * cw; return cx(4) + ((b - mids[4]) / (mids[4] - mids[3])) * cw; };
    const pts = []; for (let b = -2.3; b <= 2.5; b += 0.05) { const xx = xb(b); if (xx >= L && xx <= W - R) pts.push([xx, y(E.P(A.thNow, { a: 1.2, b }))]); }
    s += `<polyline class="model" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
    s += `<line class="ax" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/><text class="tk" x="${L}" y="${Ht - 6}">Question level (score band) →</text>`;
    return s + '</svg>';
  }

  function sparkSVG(per) {
    const W = 260, Ht = 70, L = 8, R = 8, T = 10, B = 12, n = per.length, x = i => (n === 1 ? W / 2 : L + (i * (W - L - R)) / (n - 1)), y = v => T + (1 - v) * (Ht - T - B);
    let s = `<svg class="viz spark" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Accuracy in this topic on each test"><line class="gl" x1="${L}" x2="${W - R}" y1="${y(0.5)}" y2="${y(0.5)}"/>`;
    const pts = per.map((c, i) => (c.n ? [x(i), y(c.k / c.n), c] : null)).filter(Boolean);
    if (pts.length > 1) s += `<polyline class="line thin" points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}"/>`;
    pts.forEach(p => (s += `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="4" data-tip="${p[2].k} of ${p[2].n} correct"/>`));
    return s + '</svg>';
  }

  /* ---------- panels ---------- */
  function testDetail(A, E, BANK) {
    const h = A.hist[view.test]; if (!h) return '';
    if (!Array.isArray(h.items)) return `<p class="muted">Test #${view.test + 1} scored ${h.score}. It was taken before question details were saved.</p>`;
    const byCat = {}; h.items.forEach(r => { const c = byCat[r.c] || (byCat[r.c] = { n: 0, k: 0 }); c.n++; c.k += r.u; });
    return `<div class="td-head"><h3>Test #${view.test + 1} · ${dateStr(h.t)}${h.sim ? ' · <span class="pill na">Simulated</span>' : ''}</h3><span class="num">Score ${h.score} ${CTX.bandChip(h.score)}</span><a class="btn small" href="#test/${h.id}">Open full review</a></div>
      <div class="td-grid"><table class="bp mini"><tbody>${Object.keys(E.BLUEPRINT).filter(k => byCat[k]).map(k => `<tr><td>${E.SHORT[k]}</td><td class="r num">${byCat[k].k} / ${byCat[k].n}</td></tr>`).join('')}</tbody></table>
      <ol class="q-strip">${h.items.map((r, i) => { const it = A.byId[r.id]; return `<li class="${r.u ? 'ok' : 'no'}" data-tip="<b>Q${i + 1}: ${it ? it.name : r.id}</b><br>${E.CATS[r.c]}<br>Level ${CTX.BAND_NAMES[E.bandOf(E.toScore(r.b))]}<br>${r.u ? 'Correct' : 'Missed'}"><span>${i + 1}</span></li>`; }).join('')}</ol></div>`;
  }
  function topicDetail(A, E) {
    const k = view.topic, T = A.topic[k]; if (!T) return '';
    const [cls, lab] = statusOf(T);
    const types = Object.entries(T.types).map(([id, t]) => [A.byId[id], t]).filter(([it]) => it).sort((a, b) => (a[1].k / a[1].n) - (b[1].k / b[1].n));
    return `<div class="tp-head"><h3>${E.CATS[k]}</h3><span class="pill ${cls}">${lab}</span></div>
      <p class="muted">${T.n ? `${T.k} of ${T.n} correct (${pct(T.k, T.n)}) across these tests; about ${Math.round((100 * T.exp) / T.n)}% expected at your level.` : 'No questions from this topic in these tests yet.'}</p>
      ${T.per.some(c => c.n) ? `<div class="spark-row"><span class="tk-l">Accuracy per test</span>${sparkSVG(T.per)}</div>` : ''}
      ${types.length ? `<table class="bp types"><thead><tr><th>Question type</th><th class="r">Correct</th></tr></thead><tbody>${types.map(([it, t]) => `<tr><td><span class="ty-n">${it.name}</span><span class="ty-t">${it.tip}</span></td><td class="r num">${t.k} / ${t.n}</td></tr>`).join('')}</tbody></table>` : ''}
      <div class="end-row"><button class="btn primary" data-practice="${k}">Practice ${E.SHORT[k].toLowerCase()} · 8 questions</button><button class="btn small tutor-btn" data-plan="${k}">Make me a study plan for this topic</button></div>`;
  }

  /* ---------- main render ---------- */
  function render(ctx) {
    CTX = ctx; ensureTip();
    const { app, E, BANK, store, BAND_NAMES, BAND_SKILLS, bandChip, setNav, hdrStatus } = ctx;
    setNav('progress'); hdrStatus.textContent = '';
    if (store.mode === 'loading') { app.innerHTML = `<section><h1>Your progress</h1><p class="lede">${store.label()}</p></section>`; return; }
    const hist = store.get();
    if (!hist.length) {
      app.innerHTML = `<section><h1>Your progress</h1><p class="lede">Take a practice test and this page will show your score trend, how you do on each topic compared with your level, and what to practise next.</p>
        <div class="end-row"><a class="btn primary" href="#">Go to the practice test</a></div></section>${dataSection(ctx, 0)}`;
      wire(ctx);
      return;
    }
    const A = analyze(ctx);
    if (view.test === null || view.test >= hist.length) view.test = hist.length - 1;
    if (!view.topic || !A.topic[view.topic]) { const w = A.cats.filter(k => A.topic[k].n >= 3).sort((a, b) => resid(A.topic[a]) - resid(A.topic[b]))[0]; view.topic = w || A.cats[0]; }
    const latest = hist[hist.length - 1], best = Math.max(...hist.map(h => h.score)), band = E.bandOf(latest.score);
    const avg = E.toScore(A.thNow), change = latest.score - hist[0].score, ins = insights(A, ctx);
    const ranges = [[3, 'Last 3'], [5, 'Last 5'], [10, 'Last 10'], [0, 'All']];

    app.innerHTML = `
    <section class="dash-head"><div><h1>Your progress</h1><p class="save-note ${store.mode}">${store.label()}</p>${hist.length < 3 ? `<p class="fine">Patterns need a few tests. With ${hist.length} so far, some charts have little to show yet.</p>` : ''}</div>
      <button class="btn primary tutor-btn" data-plan="">Make me a study plan</button>
      <div class="seg" role="radiogroup" aria-label="Tests to include">${ranges.map(([v, l]) => `<button role="radio" aria-checked="${view.range === v}" class="${view.range === v ? 'on' : ''}" data-range="${v}">${l}</button>`).join('')}</div></section>
    <section class="tiles five">
      <div class="tile"><span class="label">Tests taken</span><span class="v num">${hist.length}</span>${hist.some(h => h.sim) ? `<span class="muted small">${hist.filter(h => h.sim).length} simulated</span>` : ''}</div>
      <div class="tile"><span class="label">Latest score</span><span class="v num">${latest.score}</span>${bandChip(latest.score)}</div>
      <div class="tile"><span class="label">Change</span><span class="v num ${change > 0 ? 'ok' : change < 0 ? 'no' : ''}">${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}</span><span class="muted small">since test #1</span></div>
      <div class="tile"><span class="label">Recent average</span><span class="v num">${avg}</span><span class="muted small">last ${Math.min(3, hist.length)} tests</span></div>
      <div class="tile"><span class="label">Best score</span><span class="v num">${best}</span>${bandChip(best)}</div>
    </section>
    <section class="dash">
      <div class="card span2"><div class="card-h"><h2>Score over time</h2><span class="muted small">Select a point to inspect that test</span></div>
        <div class="chart-scroll">${trendSVG(A, E)}</div><div id="test-detail" class="test-detail">${testDetail(A, E, BANK)}</div></div>
      <div class="card"><div class="card-h"><h2>Insights</h2></div>
        ${ins.length ? `<ul class="ins">${ins.map(i => `<li class="${i.kind}"><span class="ins-t">${i.title}</span><span class="ins-b">${i.body}</span>${i.act ? `<button class="btn small ghost" data-practice="${i.act[1]}">${i.act[2]}</button>` : i.topic ? `<button class="link" data-topic="${i.topic}">Open topic</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Take a few more tests to see patterns.</p>'}
      </div>
    </section>
    <section class="dash">
      <div class="card span2"><div class="card-h"><h2>Topic by test</h2><span class="muted small">Each cell is one topic on one test. Select a row or cell to open that topic.</span></div>${A.win.length ? heatmapHTML(A, E) : '<p class="muted">Question details are saved for tests taken after the update.</p>'}</div>
      <div class="card" id="topic-detail">${topicDetail(A, E)}</div>
    </section>
    <section class="dash">
      <div class="card span2"><div class="card-h"><h2>You compared with expected, by topic</h2><span class="muted small">Expected is what a student at each test's score level usually gets right</span></div><div class="chart-scroll">${dumbbellSVG(A, E)}</div></div>
      <div class="card"><div class="card-h"><h2>Next band</h2></div>
        ${band < 4 ? `<p class="muted">Your latest score is in ${BAND_NAMES[band]}. Questions at ${BAND_NAMES[band + 1]} test:</p><ul class="rules">${BAND_SKILLS[band + 1].map(s => `<li>${s}</li>`).join('')}</ul>` : '<p>You are in the top band. Keep taking tests to stay consistent.</p>'}</div>
    </section>
    <section class="dash">
      <div class="card span2"><div class="card-h"><h2>Success by question level</h2><span class="muted small">Bars: your rate. Line: expected at your recent level (${avg}).</span></div><div class="chart-scroll">${curveSVG(A, E, BAND_NAMES)}</div>
        <div class="legend"><span class="key bar"></span><span>Your rate</span><span class="key line"></span><span>Expected at ${avg}</span></div></div>
      <div class="card"><div class="card-h"><h2>Missed most</h2></div>${missedHTML(A, E)}</div>
    </section>
    <section class="danger-row"><a class="btn primary" href="#">Take another test</a></section>
    ${dataSection(ctx, hist.length)}`;
    wire(ctx);
  }
  function missedHTML(A, E) {
    const list = Object.entries(A.ids).filter(([, t]) => t.miss > 0).sort((a, b) => b[1].sur - a[1].sur).slice(0, 6);
    if (!list.length) return '<p class="muted">No missed questions in these tests.</p>';
    return `<ol class="missed compact">${list.map(([id, t]) => { const it = A.byId[id]; return it ? `<li><button class="link nm" data-topic="${it.cat}">${it.name}</button><span class="num muted">${t.miss} of ${t.n}</span><span class="tp">${it.tip}</span></li>` : ''; }).join('')}</ol>`;
  }
  function wire(ctx) {
    const { app, store } = ctx, rerender = () => render(ctx);
    app.querySelectorAll('[data-range]').forEach(b => (b.onclick = () => { view.range = +b.dataset.range; rerender(); }));
    const selTest = el => { view.test = +el.dataset.test; rerender(); document.querySelector(`[data-test="${view.test}"]`)?.focus({ preventScroll: true }); };
    app.querySelectorAll('[data-test]').forEach(el => { el.onclick = () => selTest(el); el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selTest(el); } }; });
    const selTopic = (el, scroll) => { view.topic = el.dataset.topic; rerender(); if (scroll) document.getElementById('topic-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    app.querySelectorAll('[data-topic]').forEach(el => { el.onclick = () => selTopic(el, true); if (el.tagName === 'g') el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selTopic(el, true); } }; });
    app.querySelectorAll('[data-practice]').forEach(b => (b.onclick = () => practice(ctx, b.dataset.practice)));
    app.querySelectorAll('[data-plan]').forEach(b => (b.onclick = () => {
      const topic = b.dataset.plan || null, A = analyze(ctx);
      ctx.tutor.open({ kind: 'plan', ref: topic || 'all', title: topic ? `Study plan: ${ctx.E.CATS[topic]}` : 'Study plan',
        body: { kind: 'plan', ref: topic || 'all', summary: planSummary(A, ctx, topic), topic },
        autoAsk: topic ? `Make me a short study plan for ${ctx.E.CATS[topic]}, based on my results.` : 'Make me a study plan based on my results so far.' });
    }));
    const imp = document.getElementById('imp-file');
    if (imp) imp.onchange = async () => {
      const f = imp.files[0], out = document.getElementById('imp-msg'); if (!f) return;
      out.textContent = 'Importing…';
      try { const n = await store.importFile(f); out.textContent = n ? `Added ${n} test${n === 1 ? '' : 's'}.` : 'No new tests in that file; they were already here.'; } catch (e) { out.textContent = e.message; }
    };
    loadFlags();
    const ren = document.getElementById('prof-ren');
    if (ren) ren.onclick = () => {
      const box = document.getElementById('prof-box');
      box.innerHTML = `<form id="prof-form" class="who-add"><label class="sr" for="prof-name">New name</label><input id="prof-name" maxlength="40" value="${(store.profile() || {}).name || ''}"><button class="btn small" type="submit">Rename</button></form>`;
      document.getElementById('prof-form').onsubmit = async e => { e.preventDefault(); try { await store.renameProfile(document.getElementById('prof-name').value.trim()); rerender(); } catch (x) { box.insertAdjacentText('beforeend', x.message); } };
    };
    const del = document.getElementById('prof-del');
    if (del) del.onclick = () => {
      const box = document.getElementById('prof-box'), p = store.profile();
      box.innerHTML = `<span class="muted">Delete the profile ${p.name} with all of its tests and tutor chats? This can’t be undone.</span> <button class="btn danger small" id="prof-yes">Delete profile</button> <button class="btn ghost small" id="prof-no">Keep</button>`;
      document.getElementById('prof-yes').onclick = async () => { await store.deleteProfile(); location.hash = ''; };
      document.getElementById('prof-no').onclick = () => (box.innerHTML = '');
    };
    const clr = document.getElementById('clr');
    if (clr) clr.onclick = () => {
      const box = document.getElementById('clr-confirm'), n = store.get().length;
      box.innerHTML = `<span class="muted">Delete all ${n} saved tests, their analytics and tutor chats? This can’t be undone. Every question becomes available again.</span> <button class="btn danger small" id="clr-yes">Delete</button> <button class="btn ghost small" id="clr-no">Keep</button>`;
      document.getElementById('clr-yes').focus();
      document.getElementById('clr-yes').onclick = async () => { box.textContent = 'Deleting…'; try { await store.clear(); } catch (e) { box.textContent = e.message; } };
      document.getElementById('clr-no').onclick = () => (box.innerHTML = '');
    };
  }

  /* ---------- topic practice: 8 questions with instant feedback ---------- */
  function practice(ctx, cat) {
    const { app, E, BANK, hdrStatus, setNav } = ctx;
    const A = analyze(ctx), pool = BANK.filter(it => it.cat === cat).sort((a, b) => Math.abs(a.b - A.thNow) - Math.abs(b.b - A.thNow));
    const seq = []; for (let i = 0; seq.length < 8; i++) seq.push(pool[i % pool.length]);
    let i = 0, right = 0; const L = ['A', 'B', 'C', 'D'], drillSeen = new Set();
    const split = t => t.split(/(?<=[.!?”])\s+(?=[A-Z<(“−\d])/).filter(Boolean);
    setNav('progress'); window.scrollTo({ top: 0 });
    function show() {
      const it = seq[i], g = it.gen(drillSeen); drillSeen.add(it.id + '#' + g.k); let chosen = -1, done = false;
      hdrStatus.textContent = `Practice ${i + 1} of 8`;
      app.innerHTML = `<div class="qcol practice"><div class="prac-head"><h1>Practice: ${E.CATS[cat]}</h1><button class="btn ghost small" id="p-quit">Back to progress</button></div>
        <p class="muted">Instant feedback after each answer. Practice questions are not saved to your history.</p>
        <article class="qcard"><header class="qhead"><span class="qnum">Question ${i + 1} of 8 · ${it.name}</span><span class="num muted">${right} correct so far</span></header>
          <div class="qtext">${g.q}</div>
          <div class="choices" role="radiogroup">${g.choices.map((c, j) => `<button class="choice" role="radio" aria-checked="false" data-i="${j}"><span class="let">${L[j]}</span><span class="ctext">${c}</span></button>`).join('')}</div>
          <div id="p-fb"></div>
          <footer class="qfoot"><span class="hint">Choose an answer, then check it.</span><button class="btn primary" id="p-go" disabled>Check answer</button></footer></article></div>`;
      document.getElementById('p-quit').onclick = () => render(ctx);
      const btns = app.querySelectorAll('.choice'), go = document.getElementById('p-go');
      btns.forEach(b => (b.onclick = () => { if (done) return; chosen = +b.dataset.i; btns.forEach(x => { x.classList.toggle('sel', x === b); x.setAttribute('aria-checked', x === b); }); go.disabled = false; }));
      go.onclick = () => {
        if (!done) {
          done = true; const ok = chosen === g.ans; if (ok) right++;
          btns.forEach((x, j) => { x.disabled = true; if (j === g.ans) x.classList.add('right'); else if (j === chosen) x.classList.add('wrong'); });
          document.getElementById('p-fb').innerHTML = `<div class="sol"><p class="fb ${ok ? 'ok' : 'no'}"><strong>${ok ? 'Correct.' : `Not quite. The answer is ${L[g.ans]}.`}</strong></p>
            <div class="key"><span class="key-l">Key idea</span><span>${it.tip}</span></div><ol class="steps">${split(g.exp).map(t => `<li><span>${t}</span></li>`).join('')}<li class="final"><span><strong>Answer: ${L[g.ans]}.</strong> ${g.choices[g.ans]}</span></li></ol>
            <div class="rv-actions"><button class="btn small tutor-btn" id="p-ask">Ask the tutor about this question</button></div></div>`;
          const qid = it.id + '#' + g.k, picked = chosen;
          document.getElementById('p-ask').onclick = () => ctx.tutor.open({ kind: 'question', ref: `drill:${qid}:${picked}`, title: it.name, body: { kind: 'question', ref: `drill:${qid}:${picked}`, qid, chosen: picked } });
          go.textContent = i === 7 ? 'See results' : 'Next question';
        } else if (i < 7) { i++; show(); } else finish();
      };
    }
    function finish() {
      hdrStatus.textContent = 'Practice done';
      app.innerHTML = `<section class="qcol"><h1>Practice: ${E.CATS[cat]}</h1><div class="score-card"><div class="label">Practice result</div><div class="big num">${right}<span class="muted" style="font-size:28px"> / 8</span></div></div>
        <div class="end-row"><button class="btn primary" id="p-again">Practice again</button><button class="btn ghost" id="p-back">Back to progress</button></div></section>`;
      document.getElementById('p-again').onclick = () => practice(ctx, cat);
      document.getElementById('p-back').onclick = () => render(ctx);
    }
    show();
  }

  /* ---------- history data, flagged questions, profile ---------- */
  function dataSection(ctx, n) {
    const p = ctx.store.profile() || { name: '' };
    return `<section class="card data-card"><h2>Your data</h2>
      <div class="data-grid">
        <div><h3>History</h3><p class="fine">Saved on the host computer and backed up daily.</p>
          <div class="end-row"><a class="btn small" href="${ctx.store.exportUrl()}" download>Export history</a>
          <label class="btn small" for="imp-file">Import history</label><input type="file" id="imp-file" accept="application/json,.json" class="sr"></div>
          <p class="fine" id="imp-msg" aria-live="polite"></p>
          ${n ? `<div class="danger-row"><button class="btn danger small" id="clr">Clear all history</button><span id="clr-confirm"></span></div>` : ''}</div>
        <div><h3>Flagged questions</h3><p class="fine">Questions anyone flagged as wrong or confusing. They stay out of tests until rechecked.</p><ul class="missed compact" id="flag-list"><li class="muted">Loading…</li></ul></div>
        <div><h3>Profile</h3><p class="fine">You're practicing as <strong>${p.name}</strong>. Switch or add profiles from the top right.</p>
          <div class="end-row"><button class="btn small" id="prof-ren">Rename</button><button class="btn danger small" id="prof-del">Delete profile</button></div><div id="prof-box"></div></div>
      </div></section>`;
  }
  async function loadFlags() {
    const el = document.getElementById('flag-list'); if (!el) return;
    try {
      const rows = (await CTX.store.api('/api/flags')).filter(f => !f.rechecked);
      el.innerHTML = rows.length ? rows.map(f => `<li><span class="nm">${f.name} <span class="muted num">${f.qid}</span></span><button class="btn ghost small" data-recheck="${f.qid}">Mark rechecked</button><span class="tp">${f.note ? f.note.replace(/[<>&]/g, '') : 'No note'}${f.who ? ' · ' + f.who : ''}</span></li>`).join('') : '<li class="muted">None.</li>';
      el.querySelectorAll('[data-recheck]').forEach(b => (b.onclick = async () => {
        await CTX.store.api(`/api/flags/${encodeURIComponent(b.dataset.recheck)}/recheck`, { method: 'POST' });
        window.QAS_ITEMS.flagged.delete(b.dataset.recheck); loadFlags();
      }));
    } catch (e) { el.innerHTML = `<li class="muted">${e.message}</li>`; }
  }

  /* ---------- the summary a study plan starts from (AIT-03) ---------- */
  function planSummary(A, ctx, topicKey) {
    const { E, BAND_NAMES } = ctx, H = A.hist, L = [];
    L.push(`Tests taken: ${H.length}.`);
    L.push('Scores over time (200–300 scale): ' + H.map((h, i) => `#${i + 1} ${dateStr(h.t)}: ${h.score} (${BAND_NAMES[E.bandOf(h.score)]})`).join('; ') + '.');
    if (H.length) L.push(`Latest score ${H[H.length - 1].score}; recent average ${E.toScore(A.thNow)}; best ${Math.max(...H.map(h => h.score))}.`);
    L.push(`\nBy topic, across the ${A.win.length} most recent tests (your accuracy vs. the accuracy expected at your level):`);
    for (const k of A.cats) { const T = A.topic[k]; if (T.n) L.push(`- ${E.CATS[k]}: ${T.k}/${T.n} correct (${pct(T.k, T.n)}), expected about ${Math.round((100 * T.exp) / T.n)}% — ${statusOf(T)[1]}`); }
    const missed = Object.entries(A.ids).filter(([, t]) => t.miss > 0).sort((a, b) => b[1].miss - a[1].miss || b[1].sur - a[1].sur).slice(0, 10);
    if (missed.length) {
      L.push('\nQuestion types missed most:');
      missed.forEach(([id, t]) => { const it = A.byId[id]; if (it) L.push(`- ${it.name} (${E.CATS[it.cat]}): missed ${t.miss} of ${t.n}. Key idea: ${it.tip.replace(/<[^>]+>/g, '')}`); });
    }
    const band = H.length ? E.bandOf(H[H.length - 1].score) : 0;
    if (band < 4) L.push(`\nSkills for the next band (${BAND_NAMES[band + 1]}): ${ctx.BAND_SKILLS[band + 1].join('; ')}.`);
    if (topicKey) {
      const T = A.topic[topicKey];
      L.push(`\nFocus topic: ${E.CATS[topicKey]}. Question types in it:`);
      Object.entries(T.types).forEach(([id, t]) => { const it = A.byId[id]; if (it) L.push(`- ${it.name}: ${t.k}/${t.n} correct`); });
    }
    return L.join('\n');
  }

  window.QAS_PROGRESS = { render, planSummary, analyze: ctx => analyze(ctx) };
})();
