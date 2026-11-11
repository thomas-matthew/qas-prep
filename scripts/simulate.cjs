// Runs the browser's own engine and bank code headlessly against simulated learners of known ability.
// Checks: every test has 20 questions in the official topic mix (CON-01), scores are accurate (SCR-04),
// and 10 tests in a row never repeat a question (GEN-06, ADP-07).
// Usage: node scripts/simulate.cjs [learners]   (prints JSON; exit code 1 if a check fails)
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', 'src', 'qas_prep');
const ctx = { Math, Error, Set, Map, Object, Array, JSON, Number, String, console };
ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
ctx.QAS_BANKDATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'bank.json'), 'utf8'));
ctx.QAS_FLAGGED = [];
for (const f of ['items.js', 'bankserve.js', 'engine.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'web', f), 'utf8'), ctx);
const E = ctx.QAS_ENGINE, BANK = ctx.QAS_ITEMS.BANK;

function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function takeTest(theta) {
  const S = E.newSession(BANK), taken = new Set(), qids = [];
  while (S.n < E.LENGTH) {
    const it = E.selectNext(S), g = it.gen(taken); taken.add(it.id + '#' + g.k); qids.push(it.id + '#' + g.k);
    E.record(S, it, Math.random() < E.P(theta, it), { g });
  }
  return { S, qids };
}

const N = +(process.argv[2] || 3000), fails = [];
let blueprintBad = 0, err = 0, abs = 0, sq = 0, sameBand = 0, lengths = new Set();
for (let i = 0; i < N; i++) {
  const theta = Math.max(-3, Math.min(3, randn()));
  const { S } = takeTest(theta);
  lengths.add(S.n);
  for (const k in E.BLUEPRINT) if (S.counts[k] < E.BLUEPRINT[k][0] || S.counts[k] > E.BLUEPRINT[k][1]) { blueprintBad++; break; }
  const est = E.toScore(S.theta), truth = E.toScore(theta), d = est - truth;
  err += d; abs += Math.abs(d); sq += d * d;
  if (E.bandOf(est) === E.bandOf(truth)) sameBand++;
}
// one learner, 10 tests in a row: questions seen in saved tests are avoided
const hist = []; const served = [];
for (let t = 0; t < 10; t++) {
  ctx.QAS_ITEMS.loadSeen(hist);
  const { S, qids } = takeTest(0.3);
  served.push(...qids);
  hist.push({ items: S.resp.map((r, i) => ({ id: r.it.id, k: r.g.k })) });
}
const out = {
  learners: N, testLengths: [...lengths], blueprintViolations: blueprintBad,
  meanError: +(err / N).toFixed(2), meanAbsError: +(abs / N).toFixed(2), rmse: +Math.sqrt(sq / N).toFixed(2),
  sameBandRate: +(sameBand / N).toFixed(3),
  tenTests: { served: served.length, distinct: new Set(served).size }
};
if (blueprintBad) fails.push('blueprint');
if ([...lengths].some(l => l !== 20)) fails.push('length');
if (Math.abs(out.meanError) > 2) fails.push('bias');
if (out.rmse > 12) fails.push('rmse');
if (out.sameBandRate < 0.5) fails.push('band');
if (out.tenTests.distinct !== 200) fails.push('repeats');
out.fails = fails;
console.log(JSON.stringify(out));
process.exit(fails.length ? 1 : 0);
