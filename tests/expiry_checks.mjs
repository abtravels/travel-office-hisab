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

console.log("Booking expiry checks passed (past rejected, label 12-hour, countdown text)");
