/* v3.35: "Kamai kahan se" insights, client follow-up, settings shortcuts, touch targets.
   Run: node tests/revenue_checks.mjs */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function slice(a, b) {
  const i = html.indexOf(a), j = html.indexOf(b, i + a.length);
  assert.ok(i > 0 && j > i, "could not slice " + a);
  return html.slice(i, j);
}

const S = { tickets: [
  { client: "Ali Raza", date: "2026-11-02", cost: 30000, sale: 33000, kind: "Ticket", paid: true },
  { client: "Ali Raza", date: "2026-11-05", cost: 9000, sale: 14000, kind: "Visa", paid: true },
  { client: "Usama", date: "2026-11-06", cost: 0, sale: 25000, kind: "Ticket", paid: false },      // profit not ready
  { client: "Sana", date: "2026-11-07", cost: 49500, sale: 50000, kind: "Ticket", paid: false },   // 1% margin
  { client: "Old", date: "2026-10-01", cost: 10000, sale: 12000, kind: "Umrah", paid: true }
] };
const ctx = vm.createContext({ S, Math, Number, String, Object, Array });
vm.runInContext(
  slice("function ticketPaidAmt(t){", "function viewBakaya(){") +
  slice("function revenueInsights(mid){", "function revenueCard(mid){"), ctx);

const nov = ctx.revenueInsights("2026-11");
assert.equal(nov.count, 4, "only November sales");
assert.equal(nov.done, 3, "sale with cost 0 is not counted in profit");
assert.equal(nov.noProfit, 1);
assert.equal(nov.profit, 3000 + 5000 + 500);
assert.equal(nov.avg, Math.round(8500 / 3));
assert.equal(nov.lowMargin, 1, "1% margin sale flagged");
assert.equal(nov.kinds[0].kind, "Visa", "best sale type first");
assert.equal(nov.kinds[0].profit, 5000);
assert.equal(nov.clients[0].name, "Ali Raza");
assert.equal(nov.clients[0].profit, 8000);
assert.equal(nov.unpaid, 25000 + 50000, "unpaid net of both open sales");
assert.ok(Math.abs(nov.margin - (8500 / 97000) * 100) < 1e-9);

const all = ctx.revenueInsights("all");
assert.equal(all.count, 5);
assert.ok(all.kinds.some(k => k.kind === "Umrah"));
assert.equal(ctx.revenueInsights("2025-01").count, 0);

/* wiring */
assert.ok(html.includes("html += revenueCard(mf.cur);"), "card is on Summary");
const card = slice("function revenueCard(mid){", "function viewDash(){");
assert.ok(/class="grid2"/.test(card) && /class="stat"/.test(card), "numbers sit in .grid2/.stat so the passcode hides them");

/* client follow-up */
const fctx = vm.createContext({ String });
vm.runInContext(slice("function clFollowUpText(name){", "function "), fctx);
const msg = fctx.clFollowUpText("Usama Khan");
assert.ok(msg.startsWith("Assalam o Alaikum Usama,"), msg);
assert.ok(msg.includes("0314-3176560"));
assert.ok(!/\bRs\b|\bPKR\b|\d{3,}/.test(msg.replace("0314-3176560", "")), "no amounts in the follow-up");
assert.ok(html.includes("var CL_IDLE_DAYS = 60;"));
assert.ok(html.includes('class="btn small cl-wa"') && html.includes('id="clIdleOnly"'));

/* more sale types */
for (const k of ["Visa", "Hotel", "Insurance", "Tour", "Other"]) assert.ok(html.includes("<option>" + k + "</option>"), "sale type " + k);

/* settings shortcuts + touch targets */
for (const q of ["telegram", "github", "backup", "appearance", "invoice"]) assert.ok(html.includes('["' + q + '",'), "settings chip " + q);
assert.ok(/@media \(max-width: 860px\), \(pointer: coarse\)\{\s*\.btn\{min-height:42px;\}\s*\.btn\.small\{min-height:36px;/.test(html), "touch target sizes");

/* previously unnamed controls */
for (const a of ['id="drawDate" type="date" aria-label=', 'id="wsKind" aria-label=', 'id="tkFrom" aria-label=', 'id="qzDate" type="date" aria-label='])
  assert.ok(html.includes(a), "accessible name: " + a);

console.log("Revenue + UX checks passed (insights by type/client, profit-ready only, follow-up text, sale types, settings chips, touch targets)");
