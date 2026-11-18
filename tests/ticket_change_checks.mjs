/* Change sale arithmetic — previous ticket adjustment (v3.12).
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
const { ticketAdj, ticketNet, ticketRemaining } = ctx;

const oldTicket = { sale: 32000, cost: 28000, paid: false, payments: [] };
const change = { sale: 33000, adj: 19500, cost: 12000, paid: false, payments: [] };

assert.equal(ticketAdj(change), 19500);
assert.equal(ticketNet(change), 13500, "net payable = sale - adjustment");
assert.equal(ticketRemaining(change), 13500);
assert.equal(ticketRemaining(oldTicket) + ticketRemaining(change), 45500,
  "client total pending = old outstanding + new net");

// Old ticket already paid -> only the new net stays pending.
assert.equal(ticketRemaining({ ...oldTicket, paid: true }) + ticketRemaining(change), 13500);

// Supplier cost stays untouched; profit comes from the net.
assert.equal(ticketNet(change) - change.cost, 1500);

// Partial payment on the change entry.
assert.equal(ticketRemaining({ ...change, payments: [{ amount: 5000 }] }), 8500);

// Adjustment can never exceed the client price, nor go negative.
assert.equal(ticketNet({ sale: 33000, adj: 40000 }), 0);
assert.equal(ticketAdj({ sale: 33000, adj: -500 }), 0);
assert.equal(ticketAdj({ sale: 33000, adj: "19500" }), 19500);
assert.equal(ticketAdj({ sale: 10000, adj: 19500 }), 10000);

// Tickets without an adjustment behave exactly as before.
assert.equal(ticketNet({ sale: 50000 }), 50000);
assert.equal(ticketRemaining({ sale: 50000, paid: false, payments: [{ amount: 20000 }] }), 30000);

console.log("Ticket change checks passed (old 32,000 + new 13,500 = 45,500)");
