/* Serve questions from the fixed, verified bank instead of generating them.
   Each question type keeps its metadata (topic, difficulty, key idea); gen() returns a stored question,
   preferring ones this learner has not seen in a saved test (ADP-07) and skipping flagged ones (PLT-07). */
(function () {
  const D = window.QAS_BANKDATA || {}, B = window.QAS_ITEMS.BANK, seen = new Set(), flagged = new Set(window.QAS_FLAGGED || []);
  window.QAS_ITEMS.seen = seen;
  window.QAS_ITEMS.flagged = flagged;
  // DAT-03: "seen" comes only from saved tests, so it always matches the history
  window.QAS_ITEMS.loadSeen = hist => { seen.clear(); for (const h of hist) if (Array.isArray(h.items)) for (const r of h.items) if (r.k !== undefined) seen.add(r.id + '#' + r.k); };
  window.QAS_ITEMS.byId = Object.fromEntries(B.map(it => [it.id, it]));
  // the stored question with this identity, for rebuilding a past test's review (DAT-02)
  window.QAS_ITEMS.get = (id, k) => { const x = (D[id] || []).find(q => q.k === k); return x ? { q: x.q, choices: x.choices.slice(), ans: x.ans, exp: x.exp, k: x.k } : null; };
  for (const it of B) {
    const list = D[it.id] || [];
    it.instances = list.length;
    it.gen = (avoid) => {
      const usable = list.filter(x => !flagged.has(it.id + '#' + x.k));
      let cand = usable.filter(x => !seen.has(it.id + '#' + x.k) && !(avoid && avoid.has(it.id + '#' + x.k)));
      if (!cand.length) cand = usable.filter(x => !(avoid && avoid.has(it.id + '#' + x.k))); // every version seen: allow repeats
      if (!cand.length) cand = usable;
      const x = cand[Math.floor(Math.random() * cand.length)];
      return { q: x.q, choices: x.choices.slice(), ans: x.ans, exp: x.exp, k: x.k };
    };
  }
  // a type with no usable questions left is removed from the pool
  for (let i = B.length - 1; i >= 0; i--) if (!B[i].instances || (D[B[i].id] || []).every(x => flagged.has(B[i].id + '#' + x.k))) B.splice(i, 1);
})();
