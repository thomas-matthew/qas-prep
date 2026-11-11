(function () {
  const E = window.QAS_ENGINE, BANK = window.QAS_ITEMS.BANK, $ = s => document.querySelector(s);
  const app = $('#app'), hdrStatus = $('#hdr-status'), who = $('#who');
  const BAND_NAMES = ['200–236', '237–249', '250–262', '263–275', '276–300'];
  const BAND_SKILLS = [
    ['Read a graph that shows a single set of data', 'Add, subtract and multiply integers fluently', 'Locate and name points in the xy-plane'],
    ['Choose a linear equation or inequality that models a simple situation', 'Given one value in a two-variable linear equation, find the other', 'Evaluate numeric expressions with fractions or square roots', 'Solve one-step problems with unit rates, ratios, proportions and unit conversions'],
    ['Describe the solution of a system of equations or inequalities', 'Set up and solve a system of linear equations from a word problem', 'Use rates, ratios and unit conversions in multistep problems', 'Connect tables, graphs, words and equations for the same linear relationship'],
    ['Find the slope and intercept of a line parallel to a given line', 'Evaluate expressions with negative and fractional exponents', 'Find simple conditional probabilities', 'Explain what a y-intercept means in a real situation'],
    ['Find the slope and intercept of a line perpendicular to a given line', 'Find the input of a nonlinear function from its output', 'Compare the means and medians of two data sets', 'Write expressions for complex perimeter and area problems', 'Evaluate expressions with absolute value']
  ];
  // RES-04: one line per band
  const BAND_MSG = [
    'You’re building the foundations. Work on the skills below and the next band is in reach.',
    'Solid basics. Multistep rates and systems of equations are the next step up.',
    'You’re in the middle band. Exponents, parallel lines and conditional probability will move you up.',
    'Strong work. Perpendicular lines, nonlinear functions and comparing data sets lead to the top band.',
    'You’re in the top band. Keep the skills sharp with another attempt.'
  ];
  const LETTERS = ['A', 'B', 'C', 'D'];
  const store = window.QAS_STORE, tutor = window.QAS_TUTOR;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let showEngine = false; try { showEngine = localStorage.getItem('qas-sim-engine') === '1'; } catch (e) { }
  let S = null, cur = null, chosen = -1;

  const bandChip = s => `<span class="chip b${E.bandOf(s)}">${BAND_NAMES[E.bandOf(s)]}</span>`;
  const itemScore = it => E.toScore(it.b);
  const inTest = () => !!(cur && S && S.n < E.LENGTH);
  const testNo = id => store.get().findIndex(h => h.id === id) + 1;
  const dateStr = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  /* ---------- profiles ---------- */
  function renderWho(v) {
    const p = store.profile();
    if (v === 'test' || !p) { who.innerHTML = ''; return; }
    who.innerHTML = `<button class="who-btn" id="who-btn" aria-haspopup="true" aria-expanded="false"><span class="who-dot" aria-hidden="true">${esc(p.name[0].toUpperCase())}</span><span class="who-n">${esc(p.name)}</span><span aria-hidden="true">▾</span></button>
      <div class="who-menu" id="who-menu" hidden>
        <p class="who-h">Who’s practicing?</p>
        ${store.profiles.map(x => `<button class="who-i${x.id === p.id ? ' on' : ''}" data-pid="${x.id}"><span>${esc(x.name)}</span><span class="muted num">${x.tests} test${x.tests === 1 ? '' : 's'}</span></button>`).join('')}
        <form class="who-add" id="who-add"><label class="sr" for="who-name">New profile name</label><input id="who-name" maxlength="40" placeholder="Add a profile" autocomplete="off"><button class="btn small" type="submit">Add</button></form>
        <p class="tu-err" id="who-err" hidden></p>
      </div>`;
    const btn = $('#who-btn'), menu = $('#who-menu');
    const toggle = on => { menu.hidden = !on; btn.setAttribute('aria-expanded', on); };
    btn.onclick = e => { e.stopPropagation(); toggle(menu.hidden); if (!menu.hidden) menu.querySelector('.who-i.on')?.focus(); };
    menu.onclick = e => e.stopPropagation();
    document.addEventListener('click', () => toggle(false), { once: true });
    menu.querySelectorAll('[data-pid]').forEach(b => (b.onclick = async () => { toggle(false); tutor.close(); if (+b.dataset.pid !== store.pid) await store.switchTo(+b.dataset.pid); }));
    $('#who-add').onsubmit = async e => {
      e.preventDefault(); const name = $('#who-name').value.trim(); if (!name) return;
      try { tutor.close(); await store.createProfile(name); } catch (x) { const el = $('#who-err'); el.hidden = false; el.textContent = x.message; }
    };
  }
  function renderWelcome() {
    hdrStatus.textContent = ''; setNav('start');
    app.innerHTML = `<section class="welcome"><h1>Who’s practicing?</h1>
      <p class="lede">Each person gets their own profile, with their own tests and progress. You can add more profiles later from the top right.</p>
      <form id="first" class="who-add big"><label class="sr" for="first-name">Your name</label><input id="first-name" maxlength="40" placeholder="Your name" autocomplete="given-name" required><button class="btn primary" type="submit">Start</button></form>
      <p class="tu-err" id="first-err" hidden></p></section>`;
    $('#first-name').focus();
    $('#first').onsubmit = async e => {
      e.preventDefault();
      try { await store.createProfile($('#first-name').value.trim()); } catch (x) { const el = $('#first-err'); el.hidden = false; el.textContent = x.message; }
    };
  }
  function renderOffline() {
    setNav('start'); hdrStatus.textContent = '';
    app.innerHTML = `<section><h1>The app can’t reach its server</h1><p class="lede">${esc(store.lastError)}</p><div class="end-row"><button class="btn primary" id="retry">Try again</button></div></section>`;
    $('#retry').onclick = () => { store.mode = 'loading'; store.init(); };
  }

  /* ---------- start view ---------- */
  function renderStart() {
    hdrStatus.textContent = ''; setNav('start');
    const hist = store.get();
    app.innerHTML = `
    <section class="intro">
      <div class="intro-main">
        <h1>Adaptive QAS practice test</h1>
        <p class="lede">Twenty multiple-choice questions on Quantitative Reasoning, Algebra, and Statistics. Each answer updates an estimate of your ability, and the next question is chosen to match it, while keeping the official mix of topics.</p>
        <ul class="rules">
          <li>Untimed. Use scratch paper.</li>
          <li>You must answer each question to continue, and you can't go back.</li>
          <li>A calculator is available only on questions marked with the calculator button.</li>
          <li>Questions come from a bank of ${window.QAS_ITEMS.BANK.reduce((a, it) => a + it.instances, 0).toLocaleString()} checked questions; each test favors ones you haven't seen yet.</li>
          <li>The tutor is turned off during the test. Ask it about any question afterwards.</li>
        </ul>
        <div class="start-row">
          <button class="btn primary" id="go">Start test</button>
          <label class="toggle"><input type="checkbox" id="eng" ${showEngine ? 'checked' : ''}> Show the adaptive engine as I go</label>
        </div>
        <p class="fine">All questions are original, written to College Board's published QAS topic list and score-band descriptions. Your score is a practice estimate, not an official ACCUPLACER score.</p>
      </div>
      <aside class="hist">
        <h2>Your attempts</h2>${hist.length ? '<a class="hist-link" href="#progress">See your progress</a>' : ''}<p class="save-note ${store.mode}">${store.label()}</p>
        ${hist.length ? `<ol class="hist-list">${hist.map((h, i) => [h, i]).reverse().slice(0, 8).map(([h, i]) => `<li><a class="num hl" href="#test/${h.id}" aria-label="Test ${i + 1}, score ${h.score}: open the review">${h.score}</a>${bandChip(h.score)}<span class="when">#${i + 1} · ${dateStr(h.t)}</span></li>`).join('')}</ol>`
        : `<p class="muted">${store.mode === 'loading' ? '' : 'No attempts yet. Your scores will be listed here.'}</p>`}
      </aside>
    </section>
    <section class="bands">
      <h2>What each score band means</h2>
      <p class="muted">College Board groups QAS scores into five bands. A student in a band can typically do the skills listed for it, plus those of the bands below.</p>
      <div class="band-grid">${BAND_SKILLS.map((sk, i) => `<div class="band b${i}"><div class="band-head"><span class="num">${BAND_NAMES[i]}</span></div><ul>${sk.map(s => `<li>${s}</li>`).join('')}</ul></div>`).join('')}</div>
    </section>
    <section class="blue">
      <h2>Topics on every test</h2>
      <table class="bp"><thead><tr><th>Topic</th><th class="r">Questions</th></tr></thead><tbody>
      ${Object.keys(E.BLUEPRINT).map(k => `<tr><td>${E.CATS[k]}</td><td class="r num">${E.BLUEPRINT[k][0]}–${E.BLUEPRINT[k][1]}</td></tr>`).join('')}
      </tbody></table>
    </section>`;
    $('#go').onclick = startTest;
    $('#eng').onchange = e => { showEngine = e.target.checked; try { localStorage.setItem('qas-sim-engine', showEngine ? '1' : '0'); } catch (x) { } };
  }

  /* ---------- test ---------- */
  const guard = e => { e.preventDefault(); e.returnValue = ''; };
  function startTest() {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    tutor.lock(true); window.addEventListener('beforeunload', guard); // TST-11, AIT-08
    setNav('test'); S = E.newSession(BANK); S.taken = new Set(); nextQuestion();
  }
  function nextQuestion() {
    const it = E.selectNext(S);
    cur = { it, g: it.gen(S.taken) }; chosen = -1; S.taken.add(it.id + '#' + cur.g.k);
    renderQuestion();
  }
  function renderQuestion() {
    const { it, g } = cur, k = S.n + 1;
    hdrStatus.textContent = `Question ${k} of ${E.LENGTH}`;
    const seg = [...Array(E.LENGTH)].map((_, i) => `<span class="${i < S.n ? 'done' : i === S.n ? 'now' : ''}"></span>`).join('');
    app.innerHTML = `
    <div class="test ${showEngine ? 'with-engine' : ''}">
      <div class="qcol">
        <div class="progress" role="progressbar" aria-label="Test progress" aria-valuemin="0" aria-valuemax="${E.LENGTH}" aria-valuenow="${S.n}">${seg}</div>
        <article class="qcard">
          <header class="qhead"><span class="qnum">Question ${k} of ${E.LENGTH}</span>
            ${it.calc ? `<span class="calc-ok"><span class="calc-badge">Calculator allowed</span><button class="btn calc-open small" id="calc-btn" aria-expanded="false"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" fill="none" stroke="currentColor"/><rect x="4.5" y="3.5" width="7" height="3" fill="currentColor"/><circle cx="5.5" cy="9" r=".9" fill="currentColor"/><circle cx="8" cy="9" r=".9" fill="currentColor"/><circle cx="10.5" cy="9" r=".9" fill="currentColor"/><circle cx="5.5" cy="12" r=".9" fill="currentColor"/><circle cx="8" cy="12" r=".9" fill="currentColor"/><circle cx="10.5" cy="12" r=".9" fill="currentColor"/></svg>Open calculator</button></span>` : ''}
          </header>
          <div class="qtext">${g.q}</div>
          <div class="choices" role="radiogroup" aria-label="Answer choices">
            ${g.choices.map((c, i) => `<button class="choice" role="radio" aria-checked="false" data-i="${i}" id="ch${i}"><span class="let">${LETTERS[i]}</span><span class="ctext">${c}</span></button>`).join('')}
          </div>
          <footer class="qfoot"><span class="hint">Choose an answer, then select Next. Keys 1–4 and Enter work too.</span><button class="btn primary" id="next" disabled>${k === E.LENGTH ? 'Finish test' : 'Next'}</button></footer>
        </article>
        ${it.calc ? calcHTML() : ''}
      </div>
      ${showEngine ? enginePanel() : ''}
    </div>`;
    app.querySelectorAll('.choice').forEach(b => b.onclick = () => choose(+b.dataset.i));
    $('#next').onclick = submit;
    if (it.calc) wireCalc();
  }
  function choose(i) {
    chosen = i;
    app.querySelectorAll('.choice').forEach(b => { const on = +b.dataset.i === i; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on); });
    $('#next').disabled = false;
  }
  function submit() {
    if (chosen < 0) return;
    E.record(S, cur.it, chosen === cur.g.ans, { g: cur.g, chosen });
    if (S.n >= E.LENGTH) finish(); else nextQuestion();
    window.scrollTo({ top: 0 });
  }
  document.addEventListener('keydown', e => {
    if (!cur || !$('.choices') || $('.practice') || e.target.closest('.calc') || e.target.closest('input, textarea')) return;
    const m = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
    if (m !== undefined && !e.metaKey && !e.ctrlKey) choose(m);
    if (e.key === 'Enter' && chosen >= 0 && document.activeElement?.id !== 'next') { e.preventDefault(); submit(); }
  });

  function enginePanel() {
    const { it } = cur, sc = E.toScore(S.theta), p = E.P(S.theta, it);
    const last = S.resp[S.resp.length - 1];
    return `<aside class="engine">
      <h2>Engine</h2>
      <dl class="kv">
        <div><dt>Ability estimate θ</dt><dd class="num">${S.theta.toFixed(2)} <span class="muted">± ${S.se.toFixed(2)}</span></dd></div>
        <div><dt>Provisional score</dt><dd class="num">${sc} ${bandChip(sc)}</dd></div>
        ${last ? `<div><dt>Last answer</dt><dd>${last.u ? '<span class="ok">✓ Correct</span>' : '<span class="no">✗ Incorrect</span>'} <span class="muted num">θ ${last.thBefore.toFixed(2)} → ${last.thAfter.toFixed(2)}</span></dd></div>` : ''}
      </dl>
      <h3>This question</h3>
      <dl class="kv">
        <div><dt>Topic</dt><dd>${E.CATS[it.cat]}</dd></div>
        <div><dt>Difficulty <i>b</i></dt><dd class="num">${it.b.toFixed(1)} <span class="muted">(≈ ${itemScore(it)})</span></dd></div>
        <div><dt>Chance you get it right</dt><dd class="num">${Math.round(p * 100)}%</dd></div>
        <div><dt>Information at θ</dt><dd class="num">${E.info(S.theta, it).toFixed(2)}</dd></div>
      </dl>
      <h3>Blueprint so far</h3>
      <table class="bp mini"><tbody>${Object.keys(E.BLUEPRINT).map(k => { const c = S.counts[k], [lo, hi] = E.BLUEPRINT[k]; return `<tr class="${c < lo ? 'under' : ''}"><td>${E.SHORT[k]}</td><td class="r num">${c}<span class="muted"> / ${lo}–${hi}</span></td></tr>`; }).join('')}</tbody></table>
      <p class="fine">${S.n === 0 ? 'First question: a random medium-difficulty starter.' : 'Picked at random from the 4 eligible questions that tell the engine the most at your current θ. Topics still below their minimum get priority.'}</p>
    </aside>`;
  }

  /* ---------- calculator (four-function + square root) ---------- */
  function calcHTML() {
    const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '√', '+', '(', ')', '⌫', '='];
    return `<div class="calc" id="calc" hidden><div class="calc-disp" id="cdisp" aria-live="polite">0</div><div class="calc-keys">${keys.map(k => `<button class="ck ${'÷×−+='.includes(k) ? 'op' : ''}" data-k="${k}">${k}</button>`).join('')}<button class="ck clr" data-k="C">Clear</button></div></div>`;
  }
  function wireCalc() {
    const btn = $('#calc-btn'), box = $('#calc'), disp = $('#cdisp'); let expr = '', shown = false;
    btn.onclick = () => { box.hidden = !box.hidden; btn.setAttribute('aria-expanded', !box.hidden); btn.lastChild.textContent = box.hidden ? 'Open calculator' : 'Hide calculator'; };
    const show = t => (disp.textContent = t || '0');
    box.querySelectorAll('.ck').forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'C') { expr = ''; return show(''); }
      if (k === '⌫') { expr = expr.slice(0, -1); return show(expr); }
      if (k === '=') { const v = evalCalc(expr); expr = v === null ? '' : String(v); shown = true; return show(v === null ? 'Error' : String(v)); }
      if (shown && /[0-9.√(]/.test(k)) expr = ''; shown = false;
      expr += k; show(expr);
    });
  }
  function evalCalc(s) {
    const t = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'); let i = 0;
    const eat = c => (t[i] === c ? (i++, true) : false);
    function expr() { let v = term(); for (;;) { if (eat('+')) v += term(); else if (eat('-')) v -= term(); else return v; } }
    function term() { let v = fac(); for (;;) { if (eat('*')) v *= fac(); else if (eat('/')) v /= fac(); else return v; } }
    function fac() {
      if (eat('-')) return -fac(); if (eat('√')) return Math.sqrt(fac());
      if (eat('(')) { const v = expr(); if (!eat(')')) throw 0; return v; }
      const m = /^\d*\.?\d+|^\d+\.?/.exec(t.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]);
    }
    try { const v = expr(); if (i !== t.length || !isFinite(v)) return null; return +v.toPrecision(10); } catch (e) { return null; }
  }
  window.QAS_CALC_EVAL = evalCalc;

  /* ---------- results ---------- */
  function finish() {
    const score = E.toScore(S.theta);
    const rec = { t: Date.now(), score, se: +S.se.toFixed(3), theta: +S.theta.toFixed(3), items: S.resp.map(r => ({ id: r.it.id, k: r.g.k, c: r.it.cat, b: r.it.b, a: r.it.a, u: r.u ? 1 : 0, ch: r.chosen })) };
    cur = null; S = null;
    tutor.lock(false); window.removeEventListener('beforeunload', guard);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    const saving = store.add(rec);
    renderResults(rec, saving);
  }

  /* Rebuilds what the results page needs from a saved test (DAT-02). */
  function rebuild(rec) {
    const resp = [];
    rec.items.forEach(r => {
      const it = window.QAS_ITEMS.byId[r.id] || { id: r.id, cat: r.c, b: r.b, a: r.a || 1.2, name: r.id, tip: '' };
      const g = window.QAS_ITEMS.get(r.id, r.k);
      resp.push({ it: { ...it, b: r.b, a: r.a || it.a }, g, u: !!r.u, chosen: r.ch, qid: r.id + '#' + r.k });
      const e = E.eap(resp.map(x => ({ it: x.it, u: x.u }))); resp[resp.length - 1].thAfter = e.theta; resp[resp.length - 1].seAfter = e.se;
    });
    return resp;
  }

  function renderResults(rec, saving) {
    const resp = rebuild(rec), live = !!saving;
    const score = rec.score, th = rec.theta, se = rec.se, lo = E.toScore(th - se), hi = E.toScore(th + se), band = E.bandOf(score);
    const n = rec.id ? testNo(rec.id) : store.get().length + 1;
    hdrStatus.textContent = live ? 'Results' : `Test #${n}`; setNav('results');
    const correct = resp.filter(r => r.u).length, missed = resp.length - correct;
    const byCat = {}; resp.forEach(r => { const c = byCat[r.it.cat] || (byCat[r.it.cat] = { n: 0, k: 0 }); c.n++; if (r.u) c.k++; });
    // RES-03: 3–5 skills to work on: missed question types first, then the next band's skills
    const work = [...new Set(resp.filter(r => !r.u).sort((a, b) => a.it.b - b.it.b).map(r => r.it.name))].slice(0, 3);
    const next = band < 4 ? BAND_SKILLS[band + 1] : BAND_SKILLS[band];
    const skills = work.concat(next.slice(0, Math.max(0, 5 - work.length))).slice(0, 5);
    app.innerHTML = `
    ${live ? '' : `<p class="crumb"><a href="#progress">← Progress</a> · Test #${n} · ${new Date(rec.t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>`}
    <section class="result-top">
      <div class="score-card">
        <div class="label">Estimated QAS score</div>
        <div class="big num">${score}</div>
        <div>${bandChip(score)}</div>
        <div class="muted">Likely range ${lo}–${hi} · ${correct} of ${E.LENGTH} correct</div>
        <div class="save-note" id="save-note">${live ? 'Saving…' : 'Saved.'}</div>
        <p class="fine">A practice estimate, not an official ACCUPLACER score.</p>
      </div>
      <div class="next-card">
        <p class="lede">${BAND_MSG[band]}</p>
        <h2>Skills to work on next</h2>
        <ul class="target">${skills.map(s => `<li>${s}</li>`).join('')}</ul>
        <h2>Skills at your level</h2>
        <ul>${BAND_SKILLS[band].map(s => `<li>${s}</li>`).join('')}</ul>
        ${missed ? `<button class="btn primary tutor-btn" id="tu-mistakes" disabled>Review my mistakes with the tutor</button>` : ''}
      </div>
    </section>
    <section>
      <h2>How the test adapted</h2>
      <p class="muted">The line is your provisional score after each answer; the shaded area is ±1 standard error. Dots mark each question's difficulty on the score scale: filled if you got it right, hollow if you missed it.</p>
      <div class="chart-wrap">${trajectorySVG(resp)}</div>
    </section>
    <section>
      <h2>By topic</h2>
      <table class="bp topics"><thead><tr><th>Topic</th><th class="r">Correct</th><th class="bars-h"></th></tr></thead><tbody>
      ${Object.keys(E.BLUEPRINT).map(k => { const c = byCat[k] || { n: 0, k: 0 }; return `<tr><td>${E.CATS[k]}</td><td class="r num">${c.k} / ${c.n}</td><td><span class="meter"><span style="width:${c.n ? (100 * c.k) / c.n : 0}%"></span></span></td></tr>`; }).join('')}
      </tbody></table>
    </section>
    <section>
      <h2>Review your answers</h2>
      <p class="muted">Missed questions are opened for you. Ask the tutor about any question, or flag one that looks wrong.</p>
      <div class="review">${resp.map((r, i) => reviewItem(r, i)).join('')}</div>
    </section>
    <div class="end-row"><button class="btn primary" id="again">Take another test</button><a class="btn ghost" href="#progress">See your progress</a><button class="btn ghost" id="home">Back to start</button></div>`;
    $('#again').onclick = startTest; $('#home').onclick = () => { if (location.hash) location.hash = ''; else renderStart(); };
    wireReview(resp);
    const enable = saved => {
      if (!saved || !saved.id) return;
      rec.id = saved.id;
      const label = `test #${testNo(saved.id)}`;
      app.querySelectorAll('.tutor-btn').forEach(b => (b.disabled = false));
      const mb = $('#tu-mistakes');
      if (mb) mb.onclick = () => tutor.open({ kind: 'mistakes', ref: `a${saved.id}`, title: `Mistakes in ${label}`, body: { kind: 'mistakes', ref: `a${saved.id}`, attempt: saved.id }, autoAsk: 'Help me review the questions I missed. Start with the one that matters most.' });
      app.querySelectorAll('[data-ask]').forEach(b => (b.onclick = () => { const i = +b.dataset.ask, r = resp[i]; tutor.open({ kind: 'question', ref: `a${saved.id}:${i}`, title: `Question ${i + 1}: ${r.it.name}`, body: { kind: 'question', ref: `a${saved.id}:${i}`, attempt: saved.id, index: i } }); }));
      const relabel = () => tutor.refs().then(have => {
        if (mb) mb.textContent = have.has('mistakes|a' + saved.id) ? 'Continue reviewing mistakes with the tutor' : 'Review my mistakes with the tutor';
        app.querySelectorAll('[data-ask]').forEach(b => { b.textContent = have.has(`question|a${saved.id}:${b.dataset.ask}`) ? 'Continue with the tutor' : 'Ask the tutor'; });
      });
      relabel();
      if (window.__qasRelabel) document.removeEventListener('tutor-change', window.__qasRelabel);
      window.__qasRelabel = relabel; document.addEventListener('tutor-change', relabel);
    };
    if (live) {
      Promise.resolve(saving).then(saved => {
        const el = $('#save-note'); if (!el) return;
        el.textContent = saved ? 'Saved to your history.' : store.lastError;
        el.className = 'save-note ' + (saved ? 'server' : 'memory');
        if (saved) { rec.id = saved.id; history.replaceState(null, '', '#test/' + saved.id); enable(saved); }
        else app.querySelectorAll('.tutor-btn').forEach(b => (b.title = 'The tutor works on saved tests.'));
      });
    } else enable(rec);
  }

  function splitSteps(t) { return t.split(/(?<=[.!?”])\s+(?=[A-Z<(“−\d])/).filter(Boolean); }
  function reviewItem(r, i) {
    const g = r.g, s = itemScore(r.it), flagged = window.QAS_ITEMS.flagged.has(r.qid);
    if (!g) return `<details class="rv ${r.u ? 'good' : 'bad'}"><summary><span class="rv-n num">${i + 1}</span><span class="rv-t">${r.it.name}</span><span class="rv-m">${r.u ? '✓ Correct' : '✗ Missed'}</span></summary><div class="rv-body"><p class="muted">This question is no longer in the bank.</p></div></details>`;
    const ch = r.chosen;
    return `<details class="rv ${r.u ? 'good' : 'bad'}" ${r.u ? '' : 'open'}>
      <summary><span class="rv-n num">${i + 1}</span><span class="rv-t">${r.it.name}<span class="rv-c">${E.CATS[r.it.cat]}</span></span><span class="rv-d">level ${BAND_NAMES[E.bandOf(s)]}</span><span class="rv-m">${r.u ? '✓ Correct' : '✗ Missed'}</span></summary>
      <div class="rv-body"><div class="qtext">${g.q}</div>
      <ol class="rv-ch">${g.choices.map((c, j) => `<li class="${j === g.ans ? 'ans' : ''} ${j === ch ? 'mine' : ''}"><span class="let">${LETTERS[j]}</span><span>${c}</span>${j === g.ans ? '<span class="tag ok">✓ Correct answer</span>' : ''}${j === ch && j !== g.ans ? '<span class="tag no">✗ Your answer</span>' : ''}</li>`).join('')}</ol>
      <div class="sol"><div class="key"><span class="key-l">Key idea</span><span>${r.it.tip}</span></div>
      <ol class="steps">${splitSteps(g.exp).map(t => `<li><span>${t}</span></li>`).join('')}<li class="final"><span><strong>Answer: ${LETTERS[g.ans]}.</strong> ${g.choices[g.ans]}</span></li></ol>
      ${r.u || ch == null ? '' : `<p class="mistake">You chose ${LETTERS[ch]}, ${g.choices[ch]}. The correct answer is ${LETTERS[g.ans]}, ${g.choices[g.ans]}. Ask the tutor why ${LETTERS[ch]} was tempting.</p>`}</div>
      <div class="rv-actions"><button class="btn small tutor-btn" data-ask="${i}" disabled>Ask the tutor</button>
        <button class="btn ghost small" data-flag="${i}" ${flagged ? 'disabled' : ''}>${flagged ? 'Flagged for recheck' : 'Flag this question'}</button></div>
      <div class="flag-box" id="flag-${i}" hidden></div></div></details>`;
  }
  function wireReview(resp) {
    app.querySelectorAll('[data-flag]').forEach(b => (b.onclick = () => flagForm(b, resp[+b.dataset.flag].qid, +b.dataset.flag)));
  }
  /* PLT-07: flag a question as wrong or confusing, with a note */
  function flagForm(btn, qid, i) {
    const box = document.getElementById('flag-' + i); box.hidden = false;
    box.innerHTML = `<label for="fn-${i}">What looks wrong or confusing?</label><textarea id="fn-${i}" rows="2" maxlength="2000" placeholder="For example: two answers are correct, or the graph doesn’t match the numbers"></textarea>
      <div class="end-row"><button class="btn small primary" id="fs-${i}">Send flag</button><button class="btn ghost small" id="fc-${i}">Cancel</button></div>`;
    document.getElementById('fn-' + i).focus();
    document.getElementById('fc-' + i).onclick = () => { box.hidden = true; box.innerHTML = ''; };
    document.getElementById('fs-' + i).onclick = async () => {
      try {
        await store.api('/api/flags', { method: 'POST', body: { qid, note: document.getElementById('fn-' + i).value, profile: store.pid } });
        window.QAS_ITEMS.flagged.add(qid); btn.disabled = true; btn.textContent = 'Flagged for recheck';
        box.innerHTML = '<p class="fine">Thanks. This question won’t appear in tests until it has been rechecked.</p>';
      } catch (e) { box.insertAdjacentHTML('beforeend', `<p class="tu-err">${esc(e.message)}</p>`); }
    };
  }
  function trajectorySVG(resp) {
    const W = 720, H = 280, L = 44, R = 64, T = 14, B = 34, n = resp.length;
    const x = i => L + (i * (W - L - R)) / n, y = s => T + ((300 - s) / 100) * (H - T - B);
    const pts = [[0, 250, 16]].concat(resp.map((r, i) => [i + 1, 250 + 16 * r.thAfter, 16 * r.seAfter]));
    const clamp = s => Math.max(200, Math.min(300, s));
    let s = `<svg class="traj" viewBox="0 0 ${W} ${H}" role="img" aria-label="Provisional score after each question">`;
    [237, 250, 263, 276].forEach(v => s += `<line class="gl band-l" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tk" x="${W - R + 6}" y="${y(v) + 4}">${v}</text>`);
    [200, 300].forEach(v => s += `<text class="tk" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`);
    s += `<text class="tk" x="${L - 8}" y="${y(250) + 4}" text-anchor="end">250</text>`;
    const up = pts.map(p => `${x(p[0])},${y(clamp(p[1] + p[2]))}`), dn = pts.slice().reverse().map(p => `${x(p[0])},${y(clamp(p[1] - p[2]))}`);
    s += `<polygon class="se" points="${up.concat(dn).join(' ')}"/>`;
    s += `<polyline class="line" points="${pts.map(p => `${x(p[0])},${y(clamp(p[1]))}`).join(' ')}"/>`;
    resp.forEach((r, i) => { const cx = x(i + 1) - (W - L - R) / n / 2; s += `<circle class="${r.u ? 'dot ok' : 'dot no'}" cx="${cx}" cy="${y(itemScore(r.it))}" r="5"><title>Q${i + 1}: ${r.u ? 'correct' : 'missed'}, difficulty ≈ ${itemScore(r.it)}</title></circle>`; });
    const lp = pts[pts.length - 1]; s += `<circle class="end" cx="${x(lp[0])}" cy="${y(clamp(lp[1]))}" r="5.5"/>`;
    for (let i = 1; i <= n; i++) if (i === 1 || i % 5 === 0) s += `<text class="tk" x="${x(i) - (W - L - R) / n / 2}" y="${H - 12}" text-anchor="middle">Q${i}</text>`;
    s += `<line class="ax" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
    return s + '</svg>';
  }

  function setNav(v) {
    const nav = $('#nav'); nav.hidden = v === 'test';
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', (a.getAttribute('href') === '#progress') === (v === 'progress')));
    renderWho(v);
  }
  const ctx = () => ({ app, E, BANK, store, BAND_NAMES, BAND_SKILLS, bandChip, setNav, hdrStatus, tutor });
  function route() {
    if (inTest()) { if (location.hash) history.replaceState(null, '', location.pathname + location.search); return; }
    cur = null;
    if (store.mode === 'offline') return renderOffline();
    if (store.mode !== 'loading' && !store.profile()) return renderWelcome();
    const m = /^#test\/(\d+)$/.exec(location.hash);
    if (m) {
      const rec = store.get().find(h => h.id === +m[1]);
      if (rec) renderResults(rec);
      else if (store.mode === 'loading') { setNav('progress'); app.innerHTML = '<p class="muted">Loading…</p>'; }
      else { setNav('progress'); app.innerHTML = '<section><h1>Test not found</h1><p class="lede">That test is not in this profile’s history.</p><div class="end-row"><a class="btn primary" href="#progress">Go to progress</a></div></section>'; }
    } else if (location.hash === '#progress') window.QAS_PROGRESS.render(ctx());
    else renderStart();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);
  store.onChange(() => {
    window.QAS_ITEMS.loadSeen(store.get());
    if (inTest()) return;
    if ($('.result-top') && !/^#test\//.test(location.hash) && store.mode === 'server') return; // keep a just-finished results page
    if ($('.practice')) return;
    route();
  });
  document.querySelector('#nav a[href="#"]').onclick = e => { e.preventDefault(); if (location.hash) history.pushState(null, '', location.pathname + location.search); cur = null; route(); };
  window.QAS_START = startTest;
  store.init();
  route();
})();
