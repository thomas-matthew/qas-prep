// Writes src/qas_prep/types.json: each question type's topic, difficulty, calculator flag, name and key idea,
// taken from web/items.js so the server (tutor context) and the browser share one source.
const fs = require('fs'), path = require('path'), vm = require('vm');
const web = path.join(__dirname, '..', 'src', 'qas_prep', 'web');
const ctx = { Math, Error, Set, Object, Array, JSON, Number, String, console };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(web, 'items.js'), 'utf8'), ctx);
const out = ctx.QAS_ITEMS.BANK.map(({ id, cat, b, a, calc, name, tip }) => ({ id, cat, b, a, calc, name, tip }));
fs.writeFileSync(path.join(web, '..', 'types.json'), JSON.stringify(out, null, 1) + '\n');
console.log(out.length + ' types');
