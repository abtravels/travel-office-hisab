/* Booking expiry reminder helpers (v3.22).
   Run: node tests/expiry_checks.mjs  (or via tests/test_booking_expiry.py) */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function slice(startMark, endMark) {
  const a = html.indexOf(startMark);
  const b = html.indexOf(endMark);
  assert.ok(a > 0 && b > a, `could not slice ${startMark}`);
  return html.slice(a, b);
}

const ctx = vm.createContext({
  Date, Math, String, Number, isFinite, JSON,
  dmy: (iso) => iso,            // the label test only needs a stable string
  document: { getElementById: () => null },
});
vm.runInContext(slice("function tkExpLocalInput(ms){", "function tkExpRemindText"), ctx);

const { tkExpPast, tkExpLabel, tkExpLeft, tkExpRead } = ctx;

// A past time is rejected, a near-future one is accepted.
// The app stores device-local wall time ("YYYY-MM-DDTHH:MM"), so build local
// strings here instead of UTC ISO ones (a UTC string would be read as local).
const localIso = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const past = new Date(Date.now() - 60 * 60 * 1000);
const soon = new Date(Date.now() + 45 * 60 * 1000);
const iso = localIso;
assert.equal(tkExpPast(iso(past)), true, "past time must be rejected");
assert.equal(tkExpPast(iso(soon)), false, "future time must be accepted");
assert.equal(tkExpPast(""), false, "empty means no reminder, not an error");

// 12-hour label, same shape the app shows.
assert.equal(tkExpLabel("2026-12-14T13:05"), "2026-12-14 1:05 pm");
assert.equal(tkExpLabel("2026-12-14T00:30"), "2026-12-14 12:30 am");
assert.equal(tkExpLabel("2026-12-14T12:00"), "2026-12-14 12:00 pm");
assert.equal(tkExpLabel(""), "");

// Countdown text used in the expiry card.
const plus = (mins) => localIso(new Date(Date.now() + mins * 60000));
assert.match(tkExpLeft(plus(25)), /^2[45] min baqi$/);
assert.match(tkExpLeft(plus(125)), /^2 ghanta [45] min baqi$/);
assert.match(tkExpLeft(plus(60 * 30)), /^1 din (5|6) ghanta baqi$/);
assert.equal(tkExpLeft(iso(past)), "waqt guzar gaya");

// tkExpRead only accepts a datetime-local value, never a bare date.
assert.equal(tkExpRead(), "", "no field -> no reminder");
assert.equal(tkExpRead.call(null), "");

// v3.25 card: urgent rows, alarm sync status, PNR field, purane saaf karne ka button.
{
  const S = { clients: [{ name: "Usama" }], tickets: [{ client: "Ali" }], bookExps: [
    { id: "a", client: "Usama", ref: "KHI-DXB", expAt: plus(90), lead: "60,30", remId: "r1" },
    { id: "b", client: "Ali", ref: "", expAt: plus(60 * 48), lead: "60,30", remId: "" },
    { id: "c", client: "Old", ref: "", expAt: iso(past), lead: "60,30", remId: "" }
  ] };
  const cctx = vm.createContext({
    Date, Math, String, Number, isFinite, JSON, Object, S,
    dmy: (x) => x,
    esc: (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
    document: { getElementById: () => null }
  });
  vm.runInContext(slice("function tkExpLocalInput(ms){", "function tkExpSchedule") +
    slice("var bkEditId = null;", "/* Card ke saare events"), cctx);
  const card = cctx.bkExpCard();
  assert.ok(card.includes('id="bkExpRef"'), "PNR / route field");
  assert.ok(card.includes('list="bkExpClients"') && card.includes('value="Usama"') && card.includes('value="Ali"'), "client suggestions");
  assert.equal((card.match(/tk-exp-row urgent/g) || []).length, 1, "only the <3h one is urgent");
  assert.ok(card.includes("bk-exp-retry"), "unsynced reminder offers retry");
  assert.ok(card.includes("✓ 1 ghanta · 30 min pehle"), "synced reminder shows lead chip");
  assert.ok(card.includes('id="bkExpClear"') && card.includes("1 purane"), "past reminders can be cleared");
  assert.ok(!card.includes(">Old<"), "past reminder not listed");
  /* v3.28: 5 / 10 / 15 min lead chips, multi-select, default 1 ghanta + 30 min */
  for (const m of [5, 10, 15, 30, 60, 120, 180, 1440, 0]) assert.ok(card.includes('data-lead="' + m + '"'), "lead chip " + m);
  assert.equal((card.match(/bk-lead on/g) || []).length, 2, "default 60 + 30 selected");
  assert.ok(card.includes('id="bkExpLead" value="60,30"'), "hidden csv default");
  assert.equal(cctx.tkExpLeadLabel("15,10,5"), "15 min · 10 min · 5 min");
  assert.equal(cctx.tkExpLeadLabel("1440,60,0"), "1 din · 1 ghanta · waqt par");
}
assert.ok(!/bk-exp-edit[\s\S]{0,1200}prompt\(/.test(html.slice(html.indexOf("function bkExpBind"), html.indexOf("function tgSend"))),
  "reminder edit uses the form, not prompt()");

console.log("Booking expiry checks passed (past rejected, label 12-hour, countdown text, card v3.25)");
