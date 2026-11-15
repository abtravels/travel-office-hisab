/* App-side Meezab logic (baggage parse, airline strip, filters) — bina browser.
   index.html se sirf woh functions nikaal kar chalate hain, taake filter logic
   ka regression pakra jaye. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function grab(start, end) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a);
  assert.ok(a > 0 && b > a, "missing block: " + start);
  return html.slice(a, b);
}
const source =
  grab("function mezBagKg(", "function mezAirlineStats(") +
  grab("function mezAirlineStats(", "function mezLogoHtml(") +
  grab("function mezBase(", "function mezPageButtons(");
const context = vm.createContext({ MEZ: { fares: [], stops: "all", baggage: "all", airline: "", sort: "price" } });
vm.runInContext(source, context);
const run = (code) => vm.runInContext(code, context);

assert.equal(run("mezBagKg('0KG-0KG')"), 0);
assert.equal(run("mezBagKg('30KG-30KG')"), 30);
assert.equal(run("mezBagKg('25kg')"), 25);
assert.equal(run("mezBagKg('40KG-7KG')"), 40);
assert.equal(run("mezBagKg('')"), -1);

context.MEZ.fares = [
  { amount: 27760, airline_code: "EY", airline: "Etihad Airways", stops: 1, baggage: "0KG-0KG", duration_min: 600 },
  { amount: 69610, airline_code: "EK", airline: "Emirates", stops: 0, baggage: "25kg-25kg", duration_min: 140 },
  { amount: 75000, airline_code: "EK", airline: "Emirates", stops: 1, baggage: "30KG", duration_min: 700 },
  { amount: 80000, airline_code: "QR", airline: "Qatar Airways", stops: 0, baggage: "", duration_min: 150 }
];

assert.equal(run("mezView().length"), 4);
assert.equal(run("mezView()[0].airline_code"), "EY");            // price sort

run("MEZ.stops = '0'");
assert.equal(run("mezView().map(function(f){ return f.airline_code; }).join(',')"), "EK,QR");
run("MEZ.stops = 'all'");

run("MEZ.baggage = 'checked'");
assert.equal(run("mezView().length"), 2);                         // 25kg + 30KG, unknown hata
run("MEZ.baggage = 'cabin'");
assert.equal(run("mezView().length"), 1);                         // sirf 0KG
run("MEZ.baggage = 'all'");

run("MEZ.airline = 'EK'");
assert.equal(run("mezView().length"), 2);
run("MEZ.stops = '1'");
assert.equal(run("mezView().length"), 1);
assert.equal(run("mezView()[0].amount"), 75000);
run("MEZ.stops = 'all'; MEZ.airline = ''");

const stats = run("mezAirlineStats(mezBase())");
assert.equal(stats.map((s) => s.code).join(","), "EY,EK,QR");     // cheapest pehle
assert.equal(stats[1].count, 2);
assert.equal(stats[1].cheapest, 69610);
assert.equal(stats[0].name, "Etihad Airways");

run("MEZ.sort = 'duration'");
assert.equal(run("mezView()[0].airline_code"), "EK");             // 140 min
run("MEZ.sort = 'departure'");
context.MEZ.fares[0].departure = "2026-12-10T23:00:00";
context.MEZ.fares[1].departure = "2026-12-10T07:15:00";
assert.equal(run("mezView()[0].departure"), "2026-12-10T07:15:00");

/* ---- Render smoke test: poora Meezab card + airline strip bina browser ---- */
const renderSource = grab("function mezTime(", "async function meezabLookup(");
const host = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
const page = {
  document: { getElementById: (id) => (id === "faMeezabResults" ? host : null) },
  esc: (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
  faMoney: (a, c) => (c || "PKR") + " " + Math.round(a),
  faDurMins: (m) => (m ? Math.round(m / 60) + "h " + (m % 60) + "m" : ""),
  absAsset: (p) => "https://app/" + p,
  Intl,
  Date,
  Number,
  String,
  isNaN,
  MEZ: {
    fares: [
      { amount: 27760, currency: "PKR", airline: "Etihad Airways", airline_code: "EY", platform: "NZFlight",
        refundable: false, changeable: false, baggage: "0KG-0KG", departure: "2026-12-10T05:10:00",
        arrival: "2026-12-11T22:50:00", duration_min: 1120, stops: 1, stops_at: "AUH", overnight: true,
        seats: 4, segments: [
          { from: "KHI", to: "AUH", from_city: "Karachi", to_city: "Abu Dhabi", departure: "2026-12-10T05:10:00",
            arrival: "2026-12-10T06:35:00", flight: "EY297", aircraft: "320", cls: "T", minutes: 145, layover_min: 0 },
          { from: "AUH", to: "XNB", from_city: "Abu Dhabi", to_city: "Unknown", departure: "2026-12-10T20:50:00",
            arrival: "2026-12-11T22:50:00", flight: "EY5424", aircraft: "BUS", cls: "T", minutes: 120, layover_min: 855, bus: true }
        ] },
      { amount: 69610, currency: "PKR", airline: "Emirates", airline_code: "EK", platform: "NDC Emirates",
        refundable: true, changeable: true, baggage: "25kg-25kg", departure: "2026-12-10T07:15:00",
        arrival: "2026-12-10T08:35:00", duration_min: 140, stops: 0, stops_at: "", overnight: false,
        seats: 9, segments: [ { from: "KHI", to: "DXB", from_city: "Karachi", to_city: "Dubai",
          departure: "2026-12-10T07:15:00", arrival: "2026-12-10T08:35:00", flight: "EK605",
          aircraft: "77W", cls: "Y", minutes: 140, layover_min: 0 } ] }
    ],
    info: { origin: "KHI", destination: "DXB", date: "2026-12-10", total: 857, complete: true,
      observed_at: "2026-11-15T06:56:00.000Z" },
    page: 1, size: 10, sort: "price", stops: "all", baggage: "all", airline: "", busy: false
  }
};
const renderContext = vm.createContext(page);
vm.runInContext(renderSource + "\nmezRender();", renderContext);
const out = host.innerHTML;
assert.ok(out.includes('class="card" id="mezHead"'), "results card missing");
assert.ok(out.includes('id="mezSort"') && out.includes('id="mezStops"') && out.includes('id="mezBag"') && out.includes('id="mezSize"'));
assert.ok(/<select id="mezBag">[\s\S]*Checked bag[\s\S]*Cabin only/.test(out), "baggage filter missing");
assert.ok(out.includes("All airlines"), "airline strip missing All chip");
assert.ok(out.includes('data-mez-air="EY"') && out.includes('data-mez-air="EK"'));
assert.ok(/Etihad Airways[\s\S]*PKR 27760/.test(out), "airline strip cheapest fare missing");
assert.ok(/Emirates[\s\S]*PKR 69610/.test(out));
assert.ok(out.includes(">NZFlight<"), "platform chip missing");
assert.ok(out.includes(">NDC Emirates<"));
assert.ok(out.includes("Layover 14h 15m in AUH"));
assert.ok(out.includes("Bus connection"));
assert.ok(out.includes("Page 1 of 1"));
assert.equal((out.match(/class="mez-card"/g) || []).length, 2);

console.log("Meezab UI checks passed: baggage parse, stops/baggage/airline filters, airline strip cheapest fares, sorts, card + strip render.");
