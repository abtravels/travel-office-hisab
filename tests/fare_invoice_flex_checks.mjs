/* v3.43: fare card se invoice form, flexible dates ki patti, aur Meezab search ke fixes.
   Run: node tests/fare_invoice_flex_checks.mjs */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../pricebot-worker.js", import.meta.url), "utf8");
function grab(start, end) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a);
  assert.ok(a > 0 && b > a, "missing block: " + start);
  return html.slice(a, b);
}

const source =
  grab("var INV_AIRLINES = [", "/* Airline logos") +
  grab("function invIsoAddDays(", "function invArrDateInfo(") +
  grab("function mezBagTokens(", "function mezBagUnit(") +
  grab("function mezPaxFromPayload(", "/* \"2 adults + 1 child") +
  grab("var MEZ_FLEX_SPAN = 3;", "function mezFlexStart(") +
  grab("function mezFlexLabel(", "function mezRenderFlex(") +
  grab("function mezHM(", "function mezInvoiceFare(");
const ctx = vm.createContext({
  MEZ: { flex: null, info: null },
  today: () => "2026-12-20",
  mezRenderFlex() {}
});
vm.runInContext(source, ctx);
const run = (code) => vm.runInContext(code, ctx);

/* ---------- Invoice fields from a fare ---------- */
const seg = (from, to, dep, arr) => ({ from, to, departure: dep, arrival: arr });
ctx.fare = {
  trip_type: "round", airline_code: "EK", baggage: "30KG-30KG-25KG",
  pax: { adults: 2, children: 1, infants: 1 },
  legs: [
    { from: "KHI", to: "LHR", departure: "2026-12-27T23:05:00", arrival: "2026-12-28T13:20:00",
      segments: [seg("KHI", "DXB", "2026-12-27T23:05:00", "2026-12-28T00:40:00"),
                 seg("DXB", "LHR", "2026-12-28T03:10:00", "2026-12-28T13:20:00")] },
    { from: "LHR", to: "KHI", departure: "2027-01-20T09:00:00", arrival: "2027-01-20T22:30:00",
      segments: [seg("LHR", "KHI", "2027-01-20T09:00:00", "2027-01-20T22:30:00")] }
  ]
};
ctx.notes = [];
const pf = JSON.parse(run("JSON.stringify(mezInvoiceFields(fare, notes))"));
assert.equal(pf.invTrip, "round");
assert.equal(pf.invAir, "EK");
assert.equal(pf.invFrom + ">" + pf.invTo, "KHI>LHR");
assert.equal(pf.invDate + " " + pf.invTime + " " + pf.invArr, "2026-12-27 23:05 13:20");
assert.equal(pf.invCxFrom, "DXB", "one-stop leg fills the connection airport");
assert.equal(pf.invCxArr1 + " " + pf.invCxDate + " " + pf.invCxTime, "00:40 2026-12-28 03:10");
assert.equal(pf.invRetFrom + ">" + pf.invRetTo, "LHR>KHI");
assert.equal(pf.invRetDate + " " + pf.invRetTime + " " + pf.invRetArr, "2027-01-20 09:00 22:30");
assert.equal(pf.invRetCxFrom, "", "direct return has no connection");
assert.equal(pf.invBag, 30, "going bag = first token of the outbound leg");
assert.equal(pf.invBagRet, "25", "return bag = first token of the return leg");
assert.equal(pf.invPax, 4);
assert.equal(run("notes.length"), 0);

/* one-way, unknown airline, pieces, 2 stops */
ctx.fare2 = { trip_type: "oneway", airline_code: "ZZ", baggage: "1Pieces-1Pieces-1Pieces",
  departure: "2026-12-27T08:00:00", arrival: "2026-12-28T02:00:00",
  segments: [seg("KHI", "DOH", "2026-12-27T08:00:00", "2026-12-27T09:30:00"),
             seg("DOH", "IST", "2026-12-27T12:00:00", "2026-12-27T16:00:00"),
             seg("IST", "LHR", "2026-12-27T22:00:00", "2026-12-28T02:00:00")] };
ctx.notes2 = [];
const pf2 = JSON.parse(run("JSON.stringify(mezInvoiceFields(fare2, notes2))"));
assert.equal(pf2.invTrip, "one");
assert.equal(pf2.invAir, "other", "airline without a logo falls back to Other");
assert.equal(pf2.invFrom + ">" + pf2.invTo, "KHI>LHR");
assert.equal(pf2.invCxFrom, "", "two stops cannot fit the single connection block");
assert.ok(!("invBag" in pf2), "pieces are not written as kg");
assert.equal(pf2.invRetFrom, "", "one-way clears a stale return block");
assert.equal(run("notes2.length"), 2, "user is told about the stops and the baggage");
assert.equal(pf2.invPax, 1);

/* no checked bag = NIL */
ctx.fare3 = { trip_type: "oneway", airline_code: "PK", baggage: "0KG",
  departure: "2026-12-27T08:00:00", arrival: "2026-12-27T10:00:00",
  segments: [seg("KHI", "DXB", "2026-12-27T08:00:00", "2026-12-27T10:00:00")] };
ctx.notes3 = [];
assert.equal(JSON.parse(run("JSON.stringify(mezInvoiceFields(fare3, notes3))")).invBag, 0);

/* ---------- Flexible dates ---------- */
assert.equal(run("mezFlexDates('2026-12-27').join(',')"),
  "2026-12-24,2026-12-25,2026-12-26,2026-12-27,2026-12-28,2026-12-29,2026-12-30");
assert.equal(run("mezFlexDates('2026-12-21').join(',')"),
  "2026-12-20,2026-12-21,2026-12-22,2026-12-23,2026-12-24", "past dates are skipped");
assert.equal(run("mezFlexStay({ trip_type:'round', departure_date:'2026-12-27', return_date:'2027-01-20' })"), 24);
assert.equal(run("mezFlexStay({ trip_type:'oneway', departure_date:'2026-12-27' })"), 0);
assert.equal(run("mezCheapest({ fares:[{amount:90000},{amount:0},{amount:61000}] })"), 61000);
assert.equal(run("mezCheapest({ fares:[] })"), null);
assert.equal(run("mezFlexLabel('2026-12-27')"), "Sun 27 Dec");
const k1 = run("mezFlexKey({ origin:'KHI', destination:'DXB', trip_type:'round', departure_date:'2026-12-27', return_date:'2027-01-06', adults:1 })");
const k2 = run("mezFlexKey({ origin:'KHI', destination:'DXB', trip_type:'round', departure_date:'2026-12-29', return_date:'2027-01-08', adults:1 })");
const k3 = run("mezFlexKey({ origin:'KHI', destination:'DXB', trip_type:'round', departure_date:'2026-12-29', return_date:'2027-01-09', adults:1 })");
assert.equal(k1, k2, "same trip length on another day keeps the strip");
assert.notEqual(k1, k3, "a different trip length starts a new strip");

/* wiring */
assert.ok(html.includes('id="faFlex"') && html.includes('id="faMeezabFlex"'), "flexible dates checkbox + strip host");
assert.ok(html.includes("var flexOn = !!(document.getElementById(\"faFlex\")||{}).checked && trip !== \"multi\" && picks.length === 1;"),
  "flexible dates only on a single-airport one-way / round trip");
assert.ok(html.includes('data-mez-inv="'), "fare card has the invoice button");
assert.ok(html.indexOf('id="faTrip"') < html.indexOf('id="faDate"'), "trip box sits above the dates");

/* Meezab fixes */
assert.ok(html.includes("else if(!MEZ.fares.length && !MEZ.country) mezShowResults();"), "zero fares shows the empty card, not a spinner");
assert.ok(/if\(MEZ\.country !== C\) return;/.test(html), "a closed country list stops its lanes");
assert.ok(html.includes("if(okRows.length) mezPendClear();"), "all-failed country run keeps the resume record");
assert.ok(html.includes('"korea":"KR"'), "Korea means South Korea");
assert.ok(html.includes('e1.name === "TimeoutError"'), "a timeout is not retried as a network failure");
assert.ok(worker.includes("if (lostPages) {") && worker.includes("complete = false;"), "a lost page is never reported complete");

/* Invoice + tracker fixes */
assert.ok(html.includes('if(k === "invoice" && !invPrefill) invLinkId = null;'), "an invoice opened from a sale keeps its link");
assert.ok(!html.includes('querySelector(".card.inv-form")') && !html.includes('closest(".card.inv-form")'),
  "the draft only watches the invoice card, not Expenses");
assert.ok(html.includes('<div class="card inv-form inv-card"><h2>Invoice / Ticket'), "invoice card carries its own class");
assert.ok(html.includes('if(dtx && tk.date && (!dtx.value || dtx.value === today())){'), "linking a sale does not overwrite a typed flight date");
assert.ok(html.includes('id="trkChildren"') && html.includes('id="trkLap"') && html.includes('id="trkSeat"'), "tracker form has children and infants");
assert.ok(/children:Number\(\(document\.getElementById\("trkChildren"\)/.test(html), "tracker save sends children");
assert.ok(html.includes("function trkFormCapture()"), "tracker form survives a re-render");
assert.ok(html.includes("(f.trip_type === \"multi\" ? '' : '<button type=\"button\" class=\"btn small\" data-mez-track="), "no Track button on multi-city cards");

console.log("Fare-to-invoice + flexible dates checks passed (legs, connection, baggage, pax; date strip, trip length; Meezab state fixes)");
