/* v3.45: refund / void, client statement, payment receipt, pending age, dark print lines.
   Run: node tests/refund_statement_checks.mjs */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function slice(a, b) {
  const i = html.indexOf(a), j = html.indexOf(b, i + a.length);
  assert.ok(i > 0 && j > i, "could not slice " + a);
  return html.slice(i, j);
}

const S = { settings: { invCompany: "AB Travels" }, tickets: [], receivables: [] };
const ctx = vm.createContext({ S, Intl });
vm.runInContext(
  slice("var _moneyFmt = null;", "function syncDateDisplay(inp){") +
  slice("function esc(t){", "/* ================= PROFESSIONAL IN-APP DIALOGS") +
  slice("function up(t){", "/* ================= MONTH CALCULATION") +
  slice("function ticketPaidAmt(t){", "function pendingAgeTag(dateStr){") +
  slice("var INV_PRINT_BOX", "function printInvoice(){"), ctx);
const money = ctx.money;

/* ---------- refund arithmetic ---------- */
const rf = (extra) => ({ date: "2026-11-10", sup: 40000, cli: 38000, supGot: [], cliGiven: [], ...extra });

// Paid sale: airline returns 40,000, client gets 38,000, office keeps 2,000 more.
const paid = { sale: 50000, cost: 47000, kind: "Ticket", paid: true, refund: rf({ recv: 50000 }) };
assert.equal(ctx.ticketNet(paid), 12000, "client payable = sale - client refund");
assert.equal(ctx.ticketCost(paid), 7000, "supplier cost = cost - supplier refund");
assert.equal(ctx.ticketProfit(paid), 5000, "profit = 3,000 margin + 2,000 service charge");
assert.equal(ctx.refundSupDue(paid), 40000);
assert.equal(ctx.refundCliDue(paid), 38000);
assert.equal(ctx.ticketRemaining(paid), 0);
assert.equal(ctx.refundOpen(paid), true);

// Part paid: the client only gets back what he paid above the new payable.
const part = { sale: 50000, cost: 47000, kind: "Ticket", paid: true, payments: [{ amount: 20000 }], refund: rf({ recv: 20000 }) };
assert.equal(ctx.ticketRemaining(part), 0);
assert.equal(ctx.refundCliDue(part), 8000, "20,000 received - 12,000 payable");

// Nothing paid: no money goes back, the client still owes the rest.
const none = { sale: 50000, cost: 47000, kind: "Ticket", paid: false, payments: [], refund: rf({ recv: 0 }) };
assert.equal(ctx.ticketRemaining(none), 12000);
assert.equal(ctx.refundCliDue(none), 0);

// Settling both sides closes the refund.
assert.equal(ctx.refundSupDue({ ...paid, refund: rf({ recv: 50000, supGot: [{ amount: 15000 }] }) }), 25000);
const settled = { ...paid, refund: rf({ recv: 50000, supGot: [{ amount: 40000 }], cliGiven: [{ amount: 38000 }] }) };
assert.equal(ctx.refundOpen(settled), false);
assert.equal(ctx.refundStatusText(settled), "↩ refund: settled");

// Amounts are clamped: never more than the cost or the client price.
const wild = { sale: 50000, cost: 47000, paid: true, kind: "Ticket", refund: rf({ sup: 99999, cli: 99999, recv: 50000 }) };
assert.equal(ctx.ticketRefSup(wild), 47000);
assert.equal(ctx.ticketRefCli(wild), 50000);
assert.equal(ctx.ticketNet(wild), 0);
assert.equal(ctx.ticketCost(wild), 0);
assert.equal(ctx.ticketRefSup({ sale: 50000, cost: 47000, refund: rf({ sup: -5 }) }), 0);

// Change sale: adj and refund both come off.
const change = { sale: 33000, adj: 19500, cost: 30000, kind: "Change", paid: true, refund: rf({ sup: 9000, cli: 8000, recv: 13500 }) };
assert.equal(ctx.ticketBilled(change), 13500);
assert.equal(ctx.ticketNet(change), 5500);
assert.equal(ctx.ticketCost(change), 1500);
assert.equal(ctx.ticketProfit(change), 4000);

// No refund -> v3.44 numbers. Profit is still skipped when cost or sale is missing.
assert.equal(ctx.ticketNet({ sale: 50000 }), 50000);
assert.equal(ctx.ticketProfit({ sale: 50000, cost: 40000 }), 10000);
assert.equal(ctx.refundSupDue({ sale: 50000, cost: 40000 }), 0);
assert.equal(ctx.ticketProfit({ sale: 50000, cost: 0, refund: rf({}) }), 0);
assert.equal(ctx.ticketReceived({ sale: 50000, paid: true }), 50000, "a Paid sale counts as fully received");
assert.equal(ctx.ticketReceived({ sale: 50000, paid: false, payments: [{ amount: 7000 }] }), 7000);

/* ---------- pending age ---------- */
const ag = ctx.pendingAging([
  { date: "2026-11-20", amount: 1000 }, { date: "2026-11-17", amount: 500 },   // 4 and 7 days
  { date: "2026-11-16", amount: 2000 }, { date: "2026-10-25", amount: 300 },   // 8 and 30 days
  { date: "2026-10-24", amount: 4000 }, { date: "", amount: 70 },              // 31 days, no date
  { date: "2026-11-23", amount: 0 }
], "2026-11-24");
assert.equal(ag.d7, 1500);
assert.equal(ag.d30, 2300);
assert.equal(ag.old, 4070, "undated entries count as old");
assert.equal(ctx.pendingAgeDays("2026-11-30", "2026-11-24"), 0, "a future date is not negative");

/* ---------- client statement ---------- */
S.tickets = [
  { ...paid, id: "a", client: "Ali Raza", date: "2026-11-01", detail: "KHI-DXB" },
  { id: "x", client: "Someone Else", date: "2026-11-02", sale: 9000, cost: 8000, paid: false }
];
S.receivables = [{ id: "r", client: " ali raza ", total: 10000, date: "2026-11-05", note: "Umrah", payments: [{ amount: 4000, date: "2026-11-06" }] }];
const lg = ctx.clientLedger("Ali Raza");
assert.deepEqual(Array.from(lg.rows, (x) => [x.date, x.debit, x.credit, x.bal]), [
  ["2026-11-01", 50000, 0, 50000],
  ["2026-11-01", 0, 50000, 0],
  ["2026-11-05", 10000, 0, 10000],
  ["2026-11-06", 0, 4000, 6000],
  ["2026-11-10", 0, 38000, -32000]
]);
assert.equal(lg.pending, 6000);
assert.equal(lg.refundDue, 38000);
assert.equal(lg.balance, lg.pending - lg.refundDue, "closing balance = pending - refund due to the client");
assert.equal(ctx.clientLedger("Nobody").rows.length, 0);
assert.equal(ctx.clientLedger("").rows.length, 0, "an empty name matches nothing");

const stmt = ctx.clientStatementText("Ali Raza", "2026-11-24");
assert.ok(stmt.includes("Umrah: " + money(6000)), stmt);
assert.ok(stmt.includes("refund " + money(38000)), stmt);
assert.ok(stmt.includes("Aap ko wapas milna he: " + money(32000)), stmt);
assert.ok(!stmt.includes("Someone Else"));
assert.equal(ctx.clientBalanceText(6000), "Total baqi: " + money(6000));
assert.equal(ctx.clientBalanceText(0), "Koi raqam baqi nahi.");

S.tickets[0].client = "<b>Ali</b>";
assert.ok(!ctx.clientStatementHtml("<b>Ali</b>").includes("<b>Ali</b>"), "client name is escaped in the printed statement");

/* ---------- payment receipt ---------- */
const r1 = ctx.receiptText({ client: "Ali", amount: 20000, date: "2026-11-24", detail: "KHI-DXB", total: 50000, received: 20000, remaining: 30000 });
assert.ok(r1.includes(money(20000) + " (24/11/26)"), r1);
assert.ok(r1.includes("Baqi: " + money(30000)), r1);
assert.ok(ctx.receiptText({ client: "Ali", amount: 30000, total: 50000, received: 50000, remaining: 0 }).includes("poori payment mil gayi"));

/* ---------- print: light lines become dark ---------- */
assert.equal(ctx.invPrintInk("#e5e7eb", true), "#111827", "box border");
assert.equal(ctx.invPrintInk("rgb(243, 244, 246)", false), "#374151", "row line");
assert.equal(ctx.invPrintInk("#f1f5f9", false), "#374151");
assert.equal(ctx.invPrintInk("rgb(203, 213, 225)", false), "#374151");
assert.equal(ctx.invPrintInk("rgba(29, 78, 216, 0.133)", true), "rgb(29, 78, 216)", "faint tint keeps its colour");
assert.equal(ctx.invPrintInk("#111827", true), "", "dark stays");
assert.equal(ctx.invPrintInk("rgb(37, 99, 235)", true), "", "the blue PNR box stays");
assert.equal(ctx.invPrintInk("", true), "");
assert.equal(ctx.invPrintInk("transparent", true), "");

function el(style, tag) { return { tagName: tag || "DIV", style }; }
function box(color, w) {
  const s = {};
  for (const sd of ["Top", "Right", "Bottom", "Left"]) { s["border" + sd + "Style"] = "solid"; s["border" + sd + "Color"] = color; s["border" + sd + "Width"] = w || "1px"; }
  return s;
}
const card = el(box("rgb(229, 231, 235)"));
const row = el({ borderBottomStyle: "solid", borderBottomColor: "rgb(243, 244, 246)", borderBottomWidth: "1px" });
const dash = el({ borderTopStyle: "dashed", borderTopColor: "rgb(203, 213, 225)", borderTopWidth: "1px" });
const stamp = el(box("rgb(17, 24, 39)", "2px"));
const logo = el(box("rgb(229, 231, 235)"), "IMG");
const plain = el({});
const root = { ...el(box("rgb(229, 231, 235)")), querySelectorAll: () => [card, row, dash, stamp, logo, plain] };
assert.equal(ctx.invPrintDarken(root, 0), 4 + 4 + 1 + 1);
assert.equal(card.style.borderTopColor, "#111827");
assert.equal(root.style.borderLeftColor, "#111827");
assert.equal(row.style.borderBottomColor, "#374151");
assert.equal(dash.style.borderTopColor, "#374151");
assert.equal(stamp.style.borderTopColor, "rgb(17, 24, 39)");
assert.equal(logo.style.borderTopColor, "rgb(229, 231, 235)", "the logo ring is not a box line");
assert.equal(card.style.borderTopWidth, "1px");
// A shrunk page gets its line width back; thicker lines are left alone.
ctx.invPrintDarken(root, 1.6);
assert.equal(card.style.borderTopWidth, "1.60px");
assert.equal(stamp.style.borderTopWidth, "2px");
assert.equal(ctx.invPrintDarken(null, 0), 0);

/* ---------- wiring ---------- */
const pr = slice("function printInvoice(){", "/* ---------- Invoice → PDF");
assert.ok(pr.includes("invPrintDarken(pg, 0);"), "print copy is darkened");
assert.ok(pr.includes("if(z < 1){ invPrintDarken(pg, 1 / z); fit(); }"), "line width restored after the A4 shrink");
assert.ok(!slice("function invPdfBlob(){", "var invPdfCache").includes("invPrintDarken"), "shared PDF keeps the screen look");
assert.ok(html.includes('add("↩ Refund", "", function(){ refundStart(t); });'), "refund is on the row menu");
assert.ok(html.includes('class="btn small rf-sup"') && html.includes('class="btn small rf-cli"'), "refund card buttons");
assert.ok(html.includes('class="btn small cl-stmt"') && html.includes('class="btn small cl-stmt-wa"'), "statement buttons");
assert.equal((html.match(/receiptOffer\("/g) || []).length, 2, "receipt after a ticket payment and after a pending-entry payment");
assert.ok(html.includes("agBox(\"0–7 din\", ag.d7"), "aging card on Pending Payments");

console.log("Refund + statement checks passed (profit 5,000 after refund, client due 38,000 / 8,000 / 0, ledger -32,000, aging 1,500 / 2,300 / 4,070, print lines dark)");
