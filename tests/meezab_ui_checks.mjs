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
const countryMapSrc = (() => {
  const a = html.indexOf("var AB_COUNTRY_NAMES =");
  const b = html.indexOf("\n", a);
  return html.slice(a, b);
})();
const aliasSrc = (() => {
  const a = html.indexOf("var AB_COUNTRY_ALIAS = {");
  const b = html.indexOf("};", a) + 2;
  return html.slice(a, b);
})();
const source =
  countryMapSrc + "\n" +
  aliasSrc + "\n" +
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
const renderSource = countryMapSrc + "\n" + aliasSrc + "\n" + grab("function mezDate(", "async function meezabLookup(");
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
assert.ok(out.includes("10 Dec 2026") && out.includes("11 Dec 2026"), "overnight dates missing");
assert.equal((out.match(/class="mez-card"/g) || []).length, 2);
assert.ok(out.includes('id="mezAuto"') && out.includes('id="mezRefresh"'), "auto-refresh controls missing");
assert.ok(out.includes("cached") === false, "cached marker should not show for a live response");

/* ---- Country code + airport matching ---- */
const countrySource = grab("var AB_COUNTRY_NAMES", "function airportsCache(");
const countryCtx = vm.createContext({ AB_COUNTRY_NAMES: {} });
vm.runInContext(countrySource, countryCtx);
const cRun = (code) => vm.runInContext(code, countryCtx);
assert.equal(cRun('countryName("AE")'), "UAE");
assert.equal(cRun('countryName("SA")'), "Saudi Arabia");

/* ---- Auto-refresh helpers ---- */
const autoSource = grab("var MEZ_AUTO_CAP", "function ignavSearch(");
const autoCtx = vm.createContext({ localStorage: { getItem: () => null, setItem: () => {} }, Date, JSON, Number, Math,
  document: { getElementById: () => null, addEventListener: () => {} }, MEZ: { auto: 5, busy: false, payload: null } });
vm.runInContext(autoSource, autoCtx);
assert.equal(vm.runInContext("mezAutoBudgetLeft()", autoCtx), 15, "auto budget should default to 15");
assert.equal(vm.runInContext("typeof mezRefresh", autoCtx), "function");
const renderCtxFns = vm.runInContext(
  "[" + ["mezCountryCode", "mezLocateAirports", "mezRankAirports", "mezCountryRows", "mezRenderCountry",
    "mezPickDestination", "mezAutoStart", "mezAutoTick", "mezApply", "mezShowResults"].map(function(f){ return 'typeof ' + f; }).join(",") + "]",
  renderContext);
assert.deepEqual(Array.from(renderCtxFns), [
  "function", "function", "function", "function", "function", "function", "function", "function", "function", "function"
]);

/* ---- Country panel render (price-wise, clickable rows) ---- */
const countryHost = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
const countryPage = Object.assign({}, page, {
  document: { getElementById: (id) => (id === "faMeezabCountry" ? countryHost : null) },
  mezAirIcon: () => "",
  mezStopsText: (f) => (Number(f.stops) ? f.stops + " stop" : "Non-stop"),
  mezCity: (s) => String(s || ""),
  airportList: () => [
    { iata: "DXB", name: "Dubai International Airport", city: "Dubai", country: "UAE" },
    { iata: "AUH", name: "Abu Dhabi International Airport", city: "Abu Dhabi", country: "UAE" },
    { iata: "SHJ", name: "Sharjah International Airport", city: "Sharjah", country: "UAE" },
    { iata: "ZIA", name: "Al Minhad Air Base", city: "Dubai", country: "UAE" }
  ],
  MEZ: { fares: [], info: null, country: null, auto: 0,
    countryData: { label: "UAE", code: "AE", total: 4, codes: ["DXB", "AUH", "SHJ", "ZIA"],
      origin: "KHI", date: "2026-12-10", busy: false, done: 4, observed_at: "2026-11-15T06:56:00.000Z",
      rows: [
        { destination: "DXB", city: "Dubai", fares: [{ amount: 69610 }], count: 1, cheapest: 69610,
          airline: "Emirates", airline_code: "EK", stops: 0, duration_min: 140, state: "ok" },
        { destination: "AUH", city: "Abu Dhabi", fares: [{ amount: 27760 }], count: 1, cheapest: 27760,
          airline: "Etihad Airways", airline_code: "EY", stops: 1, duration_min: 600, state: "ok" },
        { destination: "SHJ", city: "Sharjah", fares: [], count: 0, cheapest: null, state: "ok" },
        { destination: "ZIA", city: "Dubai", fares: [], count: 0, cheapest: null, state: "err", error: "Meezab daily limit" }
      ] } }
});
countryPage.MEZ.country = countryPage.MEZ.countryData;
const countryRenderCtx = vm.createContext(countryPage);
vm.runInContext(renderSource + "\nmezRenderCountry();", countryRenderCtx);
const cOut = countryHost.innerHTML;
assert.ok(cOut.includes("UAE — sab se saste fares"), "country panel heading missing");
assert.ok(cOut.includes('data-mez-dest="AUH"') && cOut.includes('data-mez-dest="DXB"'));
assert.ok(cOut.indexOf("data-mez-dest=\"AUH\"") < cOut.indexOf("data-mez-dest=\"DXB\""), "country rows not price-sorted");
assert.ok(cOut.includes("Meezab daily limit"), "country error row missing");
assert.ok(/SHJ[\s\S]*koi fare nahi mila/.test(cOut), "empty country row message missing");

/* Quick fare buttons: header brand ke sath plane + mobile bottom bar ke beech mein bhi (v2.80) */
const brandBtn = html.match(/<button id="brandFares"[^>]*>([\s\S]{0,40}?)<\/button>/);
assert.ok(brandBtn, "header plane button missing");
assert.ok(/✈/.test(brandBtn[1]), "header plane button icon missing");
assert.ok(/class="brand-fares"/.test(brandBtn[0]), "header plane button class missing");
assert.ok(/aria-label="Price Lookup/.test(brandBtn[0]), "header plane button is not labelled for Price Lookup");

const bnBlock = html.slice(html.indexOf('<nav id="bottomNav"'), html.indexOf("</nav>", html.indexOf('<nav id="bottomNav"')));
const bnBtns = bnBlock.match(/<button[\s\S]*?<\/button>/g) || [];
assert.equal(bnBtns.length, 7, "bottom bar should have 7 buttons (plane in the middle)");
assert.ok(/id="bnFares"[^>]*data-tab="fares"/.test(bnBlock), "bottom bar plane button does not open Price Lookup");
assert.equal(bnBtns[3].indexOf("bnFares") >= 0, true, "bottom bar plane button is not in the middle");
assert.ok(/<span class="bf-circle">✈<\/span>/.test(bnBlock), "bottom bar plane icon missing");
assert.ok(/function switchTab\(k\)/.test(html), "switchTab missing");
assert.ok(/getElementById\("brandFares"\)[\s\S]{0,300}switchTab\("fares"\)/.test(html), "header plane button does not call switchTab('fares')");

/* Country search har mulk par chalti he, sirf UAE par nahi (v2.81) */
const mapCount = (countryMapSrc.match(/"[^"]*"/g) || []).length;
assert.ok(mapCount >= 240, "country name map is too small: " + mapCount + " strings");
["AL:\"Albania\"", "CO:\"Colombia\"", "BR:\"Brazil\"", "KE:\"Kenya\"", "JP:\"Japan\"", "IS:\"Iceland\""].forEach((pair) => {
  assert.ok(countryMapSrc.includes(pair), "country map missing " + pair);
});
assert.ok(/function airportsNormalize\(list\)/.test(html), "airport country normaliser missing");
assert.ok(/function countryCandidates\(q, limit\)/.test(html), "country candidate helper missing");
assert.ok(/function airportCountInCountry\(list, name\)/.test(html), "airport counter helper missing");
assert.ok(/airportsNormalize\(cached\.list\)/.test(html), "cached airport list is not normalised");
assert.ok(/var AB_COUNTRY_ALIAS = \{/.test(html), "country alias table missing");
assert.ok(!/var MEZ_COUNTRY_ALIAS = \{/.test(html), "duplicate alias table is back");

const shell = vm.createContext({});
vm.runInContext(countryMapSrc + ";this.__map = AB_COUNTRY_NAMES;", shell);
const cmap = shell.__map;
assert.equal(cmap.AE, "UAE");
assert.equal(cmap.US, "USA");
assert.equal(cmap.GB, "UK");
assert.equal(cmap.KS, "Kosovo");
assert.equal(Object.keys(cmap).length >= 200, true, "country map should cover 200+ countries");

console.log("Meezab UI checks passed: baggage parse, stops/baggage/airline filters, airline strip cheapest fares, sorts, auto-refresh helpers, country panel render, card + strip render, quick fare buttons, country map.");
