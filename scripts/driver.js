/* Test driver, pasted into the page (works on this app and on the original artifact).
   A simulated learner aiming for a score: it answers a question correctly when the question's difficulty,
   on the score scale, is at or below the target, and picks a wrong choice otherwise. Every click goes
   through the real page: the Start button, the answer buttons and Next.
   Usage in the page: await QAS_DRIVE(256)  ->  {score, correct, topics, qids, ...} */
window.QAS_DRIVE = async function (target, { keys = false } = {}) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (sel, ms = 8000) => { const t0 = Date.now(); for (;;) { const el = document.querySelector(sel); if (el) return el; if (Date.now() - t0 > ms) throw new Error('timeout waiting for ' + sel); await sleep(30); } };
  const D = window.QAS_BANKDATA, E = window.QAS_ENGINE, B = window.QAS_ITEMS.BANK;
  const norm = h => { const d = document.createElement('div'); d.innerHTML = h; return d.innerText.replace(/\s+/g, ' ').trim(); };
  const index = new Map();
  for (const id in D) for (const x of D[id]) index.set(norm(x.q) + '||' + x.choices.map(norm).join('|'), { id, x });
  const typeB = id => (B.find(t => t.id === id) || {}).b;
  if (location.hash) { location.hash = ''; await sleep(200); }
  (await waitFor('#go')).click();
  const log = [];
  for (let n = 0; n < 20; n++) {
    const qt = await waitFor('.qtext'); const qnum = document.querySelector('.qnum').textContent;
    const choices = [...document.querySelectorAll('.choice .ctext')].map(c => c.innerText.replace(/\s+/g, ' ').trim());
    const key = qt.innerText.replace(/\s+/g, ' ').trim() + '||' + choices.join('|');
    const hit = index.get(key);
    if (!hit) throw new Error('question not found in bank at ' + qnum);
    const b = typeB(hit.id), score = E.toScore(b), right = score <= target;
    const pick = right ? hit.x.ans : (hit.x.ans + 1) % 4;
    const calc = !!document.querySelector('.calc-badge');
    if (keys) document.dispatchEvent(new KeyboardEvent('keydown', { key: String(pick + 1), bubbles: true }));
    else document.querySelector(`.choice[data-i="${pick}"]`).click();
    const next = document.querySelector('#next');
    if (next.disabled) throw new Error('Next stayed disabled');
    log.push({ qid: hit.id + '#' + hit.x.k, cat: (B.find(t => t.id === hit.id) || {}).cat, level: score, right, calc });
    next.click();
    await sleep(40);
  }
  await waitFor('.score-card .big');
  await sleep(300);
  const topics = {}; log.forEach(r => (topics[r.cat] = (topics[r.cat] || 0) + 1));
  return {
    target, score: +document.querySelector('.score-card .big').textContent,
    range: document.querySelector('.score-card .muted').textContent,
    band: document.querySelector('.score-card .chip').textContent,
    correct: log.filter(r => r.right).length, topics, calcQuestions: log.filter(r => r.calc).length,
    qids: log.map(r => r.qid), reviewItems: document.querySelectorAll('.rv').length,
    saveNote: (document.querySelector('#save-note') || document.querySelector('.save-note') || {}).textContent
  };
};
