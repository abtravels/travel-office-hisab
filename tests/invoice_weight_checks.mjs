/* Invoice baggage checks (v2.95) — per-direction checked-in weight.
   Jaane aur aane ka kg alag ho to weight flight block ke neeche aata he;
   0 / khali / "nil" ka matlab NIL. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const a = html.indexOf("function invBagKg(");
const b = html.indexOf("function invFlightBlock(");
assert.ok(a > 0 && b > a, "baggage helpers missing");
const ctx = vm.createContext({});
vm.runInContext(html.slice(a, b), ctx);
const run = (code) => vm.runInContext(code, ctx);

assert.equal(run("invBagKg(20)"), 20);
assert.equal(run("invBagKg(0)"), 0);
assert.equal(run("invBagKg('')"), 0);
assert.equal(run("invBagKg('nil')"), 0);
assert.equal(run("invBagLabel(20)"), "20 kg");
assert.equal(run("invBagLabel(0)"), "NIL");

const d = (bag, bagRet, trip) => ({ bag, bagRet, trip });
assert.equal(run(`invBagSplit(${JSON.stringify(d(20, 30, "round"))})`), true, "20 out / 30 return");
assert.equal(run(`invBagSplit(${JSON.stringify(d(0, 20, "round"))})`), true, "NIL out / 20 return");
assert.equal(run(`invBagSplit(${JSON.stringify(d(20, 0, "round"))})`), true, "20 out / NIL return");
assert.equal(run(`invBagSplit(${JSON.stringify(d(20, 20, "round"))})`), false, "same weight");
assert.equal(run(`invBagSplit(${JSON.stringify(d(20, "", "round"))})`), false, "empty = same as going");
assert.equal(run(`invBagSplit(${JSON.stringify(d(20, 30, "one"))})`), false, "one-way");
assert.equal(run(`invBagForLeg(${JSON.stringify(d(20, 30, "round"))}, false)`), 20);
assert.equal(run(`invBagForLeg(${JSON.stringify(d(20, 30, "round"))}, true)`), 30);

/* render + form wiring (source level) */
assert.ok(/id="invBagRet"/.test(html), "return weight input");
assert.ok(/class="retbag/.test(html), "return weight box follows trip type");
assert.ok(/invFlightBlock\(leg, .*seats, bagKg\)/.test(html), "outbound weight reaches flight block");
assert.ok(/invFlightBlock\(leg1, .*seats, bagKg\)/.test(html), "return weight reaches flight block");
assert.ok(/CHECKED-IN BAG/.test(html), "per-flight weight label");
assert.ok(/\(split \? '' :/.test(html), "shared row hidden when weights differ");
assert.ok(/d\.bagRet = d\.bagRetRaw === "" \? d\.bag :/.test(html), "empty return box = same as going");

console.log("Invoice baggage checks passed: per-direction kg, NIL, empty=same, one-way, render wiring.");
