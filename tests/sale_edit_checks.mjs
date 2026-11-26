/* v3.48: sale edit ki raqam pull se wapas na jaye, aur comma wali raqam sahi parse ho.
   Run: node tests/sale_edit_checks.mjs */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function slice(a, b) {
  const i = html.indexOf(a);
  assert.ok(i > 0, "could not find " + a);
  const j = b ? html.indexOf(b, i + a.length) : html.length;
  assert.ok(!b || j > i, "could not slice to " + b);
  return html.slice(i, j);
}

/* ---------- 1. numFromText: comma / Rs / space ---------- */
const nctx = vm.createContext({ Number, String, isFinite });
vm.runInContext(slice("function numFromText(v){", "function money(n){"), nctx);
assert.equal(nctx.numFromText("150000"), 150000);
assert.equal(nctx.numFromText("150,000"), 150000);
assert.equal(nctx.numFromText("Rs 1,50,000"), 150000);
assert.equal(nctx.numFromText("1 50 000"), 150000);
assert.equal(nctx.numFromText(" 151000 "), 151000);
assert.ok(Number.isNaN(nctx.numFromText("")), "empty is not a number");
assert.ok(Number.isNaN(nctx.numFromText("abc")), "text is not a number");
assert.equal(nctx.numFromText("0"), 0);

/* ---------- 2. mergeEditedTickets: edited sale remote se jeet jaye ---------- */
const mctx = vm.createContext({ Number, Object, Array });
vm.runInContext(slice("function mergeEditedTickets(data, local){", "\n/* Just-uploaded"), mctx);

const remote = { tickets: [
  { id: "a", sale: 151000 },              // purani remote copy
  { id: "b", sale: 80000, __edited: 500 } // remote par naya edit
] };
const local = { tickets: [
  { id: "a", sale: 150000, __edited: 900 } // is device par edit hua
] };
mctx.mergeEditedTickets(remote, local);
assert.equal(remote.tickets[0].sale, 150000, "edited sale wins over the stale remote copy");
assert.equal(remote.tickets[1].sale, 80000, "untouched remote sale stays");

/* remote newer ho to remote hi rahe */
const remote2 = { tickets: [{ id: "a", sale: 151000, __edited: 1000 }] };
const local2 = { tickets: [{ id: "a", sale: 150000, __edited: 900 }] };
mctx.mergeEditedTickets(remote2, local2);
assert.equal(remote2.tickets[0].sale, 151000, "newer remote edit is not overwritten");

/* bina edit ki local copy kuch na badle */
const remote3 = { tickets: [{ id: "a", sale: 151000 }] };
const local3 = { tickets: [{ id: "a", sale: 150000 }] };
mctx.mergeEditedTickets(remote3, local3);
assert.equal(remote3.tickets[0].sale, 151000, "no __edited marker = remote data kept");

/* khali / ghalat data par crash na ho */
mctx.mergeEditedTickets(null, local);
mctx.mergeEditedTickets({}, local);
mctx.mergeEditedTickets({ tickets: [] }, local);

/* ---------- 3. wiring: pull merge mein call ho, edit par foran push ho ---------- */
assert.ok(/mergeEditedTickets\(data, S\);/.test(html), "mergeEditedTickets runs inside syncPull");
assert.ok(/t\.__edited = Date\.now\(\);\s*\n\s*saveNow\(/.test(html), "sale edit pushes immediately");

console.log("Sale edit checks passed (comma amounts, edited sale survives pull, immediate push)");
