/* Change sale arithmetic — previous ticket adjustment (v3.13).
   Run: node tests/ticket_change_checks.mjs  (or via tests/test_ticket_change.py) */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const start = html.indexOf("function ticketPaidAmt(t){");
const end = html.indexOf("function viewBakaya(){");
assert.ok(start > 0 && end > start, "ticket helpers not found in index.html");
const ctx = vm.createContext({});
vm.runInContext(html.slice(start, end), ctx);
const { ticketAdj, ticketNet, ticketCost, ticketProfit, ticketRemaining, ticketAdvanceSplit } = ctx;

const oldTicket = { sale: 32000, cost: 28000, paid: false, payments: [] };
const change = { sale: 33000, adj: 19500, cost: 30000, paid: false, payments: [] };

assert.equal(ticketAdj(change), 19500);
assert.equal(ticketNet(change), 13500, "net payable = sale - adjustment");
assert.equal(ticketRemaining(change), 13500);
assert.equal(ticketRemaining(oldTicket) + ticketRemaining(change), 45500,
  "client total pending = old outstanding + new net");

// Old ticket already paid -> only the new net stays pending.
assert.equal(ticketRemaining({ ...oldTicket, paid: true }) + ticketRemaining(change), 13500);

// Refund credit comes off both the client price and the supplier bill, so the
// profit stays the normal margin: 33,000 - 30,000 = 3,000.
assert.equal(ticketCost(change), 10500, "effective supplier cost = cost - adjustment");
assert.equal(ticketProfit(change), 3000, "profit = net payable - effective cost");
assert.equal(ticketProfit(change), change.sale - change.cost, "profit ignores the credit");
assert.equal(ticketProfit(oldTicket) + ticketProfit(change), 7000,
  "old ticket profit + change profit = sale - cost on both");

// Partial payment on the change entry.
assert.equal(ticketRemaining({ ...change, payments: [{ amount: 5000 }] }), 8500);

// Adjustment can never exceed the client price, nor go negative.
assert.equal(ticketNet({ sale: 33000, adj: 40000 }), 0);
assert.equal(ticketAdj({ sale: 33000, adj: -500 }), 0);
assert.equal(ticketAdj({ sale: 33000, adj: "19500" }), 19500);
assert.equal(ticketAdj({ sale: 10000, adj: 19500 }), 10000);

// Credit larger than the supplier cost never makes the cost negative, and the
// profit still matches the gross margin (adj never touches profit).
assert.equal(ticketCost({ sale: 33000, adj: 19500, cost: 5000 }), 0);
assert.equal(ticketProfit({ sale: 33000, adj: 19500, cost: 5000 }), 28000);

// adj only applies to Change sales — a leftover adj can't touch other kinds.
assert.equal(ticketAdj({ sale: 33000, adj: 19500, kind: "Ticket" }), 0);
assert.equal(ticketNet({ sale: 33000, adj: 19500, kind: "Umrah" }), 33000);
assert.equal(ticketProfit({ sale: 33000, adj: 19500, cost: 30000, kind: "Ticket" }), 3000);

// Tickets without an adjustment behave exactly as before.
assert.equal(ticketNet({ sale: 50000 }), 50000);
assert.equal(ticketCost({ sale: 50000, cost: 40000 }), 40000);
assert.equal(ticketProfit({ sale: 50000, cost: 40000 }), 10000);

/* v3.25: cost ya sale 0 ho to profit gina hi nahi jata (na row, na totals) */
assert.equal(ticketProfit({ sale: 25000, cost: 0 }), 0, "no cost -> no profit");
assert.equal(ticketProfit({ sale: 0, cost: 18000 }), 0, "no sale -> no loss either");
assert.equal(ticketProfit({ sale: 0, cost: 0 }), 0);
assert.equal(ticketProfit({}), 0);
assert.equal(ctx.ticketProfitReady({ sale: 25000, cost: 0 }), false);
assert.equal(ctx.ticketProfitReady({ sale: 33000, cost: 30000 }), true);
{
  const list = [{ cost: 30000, sale: 33000 }, { cost: 0, sale: 25000 }, { cost: 18000, sale: 0 }];
  const total = list.reduce((a, t) => a + ticketProfit(t), 0);
  assert.equal(total, 3000, "register total sirf poori sales ka: " + total);
}
assert.equal(ticketProfit({ sale: 30000, cost: 32000 }), -2000, "real loss still shows");
assert.equal(ticketRemaining({ sale: 50000, paid: false, payments: [{ amount: 20000 }] }), 30000);

/* ---------- Advance received while adding a sale (v3.24) ----------
   Sale 66,000, client ne abhi 26,000 diye -> 40,000 baqi, jo khud Pending
   Payments mein chala jata he. */
const adv1 = ticketAdvanceSplit(66000, 0, 26000, true);
assert.equal(adv1.net, 66000);
assert.equal(adv1.adv, 26000, "advance as entered");
assert.equal(adv1.left, 40000, "remaining = sale - advance");
assert.equal(adv1.paid, false, "remaining must stay unpaid so it shows in Pending");

// Kuch bhi nahi diya -> poora baqi, status select hi chalta he.
const adv0 = ticketAdvanceSplit(66000, 0, 0, true);
assert.equal(adv0.adv, 0);
assert.equal(adv0.left, 66000);
assert.equal(adv0.paid, true, "no advance -> the Paid/Unpaid select decides");
assert.equal(ticketAdvanceSplit(66000, 0, 0, false).paid, false);

// Poora amount diya -> paid, kuch baqi nahi.
const advFull = ticketAdvanceSplit(66000, 0, 66000, false);
assert.equal(advFull.left, 0);
assert.equal(advFull.paid, true, "fully paid even if status said unpaid");

// Advance net se bara ho to net tak clamp, negative baqi kabhi nahi.
const advOver = ticketAdvanceSplit(66000, 0, 90000, true);
assert.equal(advOver.adv, 66000);
assert.equal(advOver.left, 0);

// Change sale par advance net (sale - adj) par lagta he, gross par nahi.
const advCh = ticketAdvanceSplit(33000, 19500, 10000, true);
assert.equal(advCh.net, 13500);
assert.equal(advCh.left, 3500, "remaining is measured on the net payable");
assert.equal(advCh.paid, false);

// Advance + payments mil kar wohi baqi dete hain jo register dikhata he.
assert.equal(ticketRemaining({ sale: 66000, paid: false, payments: [{ amount: 26000 }] }), 40000);

console.log("Ticket change checks passed (old 32,000 + new 13,500 = 45,500; profit 7,000; advance 26,000 of 66,000 -> 40,000 pending)");
