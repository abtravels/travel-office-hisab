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
  grab("function mezBagTokens(", "function mezAirlineStats(") +
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
/* Portal ke do aur format (v2.86 ke live search mein mile) */
assert.equal(run("mezBagKg('0Kilograms-0Kilograms')"), 0);
assert.equal(run("mezBagKg('0Nil')"), 0);
assert.equal(run("mezBagKg('30Kilograms-30Kilograms')"), 30);
/* v2.91: baggage har direction ka alag + total — portal jaisa */
assert.equal(run("mezBaggageLabel('25KG-25KG', [{segments:[{}]},{segments:[{}]}])"), "Baggage 25 kg + 25 kg = 50 kg");
assert.equal(run("mezBaggageLabel('50Pounds-50Pounds-50Pounds', [{segments:[{}]},{segments:[{},{}]}])"), "Baggage 50 lb + 50 lb = 100 lb");
assert.equal(run("mezBaggageLabel('1Pieces-1Pieces', [{segments:[{}]},{segments:[{}]}])"), "Baggage 1 piece + 1 piece = 2 pieces");
assert.equal(run("mezBaggageLabel('0NA-0NA-30KG-30KG', [{segments:[{},{}]},{segments:[{},{}]}])"), "Baggage no bag + 30 kg");
assert.equal(run("mezBaggageLabel('25KG-25KG', [{segments:[{}]}])"), "Baggage 25 kg");
assert.equal(run("mezBagState('0Nil-30KGS')"), "checked");
assert.equal(run("mezBagState('0Nil')"), "none");
assert.equal(run("mezBagState('')"), "unknown");

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
  /* mezComm/mezSellAmount app ke settings se markup padhte hain. */
  S: { settings: { mezCommission: 0 } },
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

/* ---- Per-passenger breakdown (v2.86): total + tap par per-adult/child/infant ---- */
assert.ok(/mezPaxText/.test(html) && /function mezPaxBreakdownHtml/.test(html), "passenger breakdown helpers missing");
assert.equal(vm.runInContext("mezPaxText({adults:1,children:0,infants:0})", renderContext), "1 adult");
assert.equal(vm.runInContext("mezPaxText({adults:2,children:1,infants:1})", renderContext), "2 adults + 1 child + 1 infant");
const pq = vm.runInContext("mezPaxFromPayload({adults:3,children:2,infants_on_lap:1,infants_in_seat:1})", renderContext);
assert.equal(pq.adults, 3); assert.equal(pq.children, 2); assert.equal(pq.infants, 2);
// Party card: total + breakdown toggle
const partyCtx = vm.createContext(Object.assign({}, page, {
  MEZ: Object.assign({}, page.MEZ, {
    fares: [ Object.assign({}, page.MEZ.fares[1], {
      amount: 189320, per_adult: 69610, per_child: 50000, per_infant: 10000,
      pax: { adults:2, children:1, infants:0 }, party_sum: 189220,
      baggage_child: "20KG", baggage_infant: "10KG" }) ],
    info: Object.assign({}, page.MEZ.info, { pax: { adults:2, children:1, infants:0, infants_on_lap:0, infants_in_seat:0 } })
  })
}));
partyCtx.host = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
partyCtx.document = { getElementById: (id) => (id === "faMeezabResults" ? partyCtx.host : null) };
vm.runInContext(renderSource + "\nmezRender();", partyCtx);
const pout = partyCtx.host.innerHTML;
assert.ok(pout.includes("total · 2 adults + 1 child"), "card does not label the total as the party total");
assert.ok(pout.includes("Per-passenger breakdown"), "breakdown toggle missing");
assert.ok(/data-mez-pax="mezPax0"/.test(pout), "breakdown toggle has no target");
assert.ok(pout.includes('id="mezPax0" hidden'), "breakdown should stay folded by default");
assert.ok(/Adult<span class="mez-pax-n">× 2<\/span>[\s\S]{0,80}PKR 69610/.test(pout), "per-adult fare missing from the breakdown");
assert.ok(/Child<span class="mez-pax-n">× 1<\/span>[\s\S]{0,80}PKR 50000/.test(pout), "per-child fare missing from the breakdown");
assert.ok(pout.includes("Baggage 20 kg"), "child baggage missing from the breakdown");
/* Portal format "0Kilograms-0Kilograms" bhi saaf label de (v2.86 live bug) */
assert.equal(vm.runInContext("mezBaggageLabel('0Kilograms-0Kilograms')", partyCtx), "No checked bag");
assert.equal(vm.runInContext("mezBaggageLabel('0Nil')", partyCtx), "No checked bag");
assert.equal(vm.runInContext("mezBaggageLabel('30Kilograms-30Kilograms')", partyCtx), "Baggage 30 kg");
assert.ok(pout.includes("2 adults + 1 child · Economy"), "header does not show the party");
// Single adult par breakdown nahi — card waisa hi rahe
assert.ok(/per adult/.test(out) && !out.includes("Per-passenger breakdown"), "1-adult card should not show a breakdown");

/* ---- Round trip / multi-city cards + header (v2.88) ---- */
const ekSeg = page.MEZ.fares[1].segments[0];
const rtFare = Object.assign({}, page.MEZ.fares[1], {
  amount: 88720, trip_type: "round", cabin: "Business",
  departure: "2026-12-10T07:15:00", arrival: "2026-12-20T08:00:00", duration_min: 260,
  segments: [ekSeg],
  legs: [
    { from: "KHI", to: "DXB", from_city: "Karachi", to_city: "Dubai",
      departure: "2026-12-10T07:15:00", arrival: "2026-12-10T08:35:00",
      duration_min: 140, stops: 0, stops_at: "", segments: [ekSeg] },
    { from: "DXB", to: "KHI", from_city: "Dubai", to_city: "Karachi",
      departure: "2026-12-20T06:00:00", arrival: "2026-12-20T08:00:00",
      duration_min: 120, stops: 0, stops_at: "",
      segments: [{ from: "DXB", to: "KHI", from_city: "Dubai", to_city: "Karachi",
        departure: "2026-12-20T06:00:00", arrival: "2026-12-20T08:00:00", flight: "EK604",
        aircraft: "77W", cls: "Y", minutes: 120, layover_min: 0 }] }
  ]
});
const rtCtx = vm.createContext(Object.assign({}, page, {
  MEZ: Object.assign({}, page.MEZ, {
    fares: [rtFare],
    info: { origin: "KHI", destination: "DXB", date: "2026-12-10", ret: "2026-12-20",
      trip: "round", cabin: "Business", total: 12, complete: true,
      pax: { adults: 1, children: 0, infants: 0 } }
  })
}));
rtCtx.host = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
rtCtx.document = { getElementById: (id) => (id === "faMeezabResults" ? rtCtx.host : null) };
vm.runInContext(renderSource + "\nmezRender();", rtCtx);
const rout = rtCtx.host.innerHTML;
assert.ok(rout.includes("Round trip · 10 Dec 2026 – 20 Dec 2026"), "round-trip header lacks both dates");
assert.ok(rout.includes("· Business"), "round-trip header lacks the cabin");
assert.ok(rout.includes("Outbound") && rout.includes("Return"), "round-trip card should split outbound and return");
assert.ok(rout.includes("EK605") && rout.includes("EK604"), "round-trip card should list both legs' flights");
assert.ok(rout.includes(">Round trip<"), "round-trip chip missing on the card");
assert.ok(!/\b10 days\b/.test(rout), "round-trip card should not add the ground time to the duration");

const mcFare = Object.assign({}, rtFare, {
  amount: 96754, trip_type: "multi", cabin: "Economy",
  departure: "2026-12-10T07:15:00", arrival: "2026-12-15T12:00:00", duration_min: 300,
  legs: [
    rtFare.legs[0],
    { from: "DXB", to: "LHR", from_city: "Dubai", to_city: "London",
      departure: "2026-12-15T09:00:00", arrival: "2026-12-15T12:00:00",
      duration_min: 180, stops: 0, stops_at: "",
      segments: [{ from: "DXB", to: "LHR", from_city: "Dubai", to_city: "London",
        departure: "2026-12-15T09:00:00", arrival: "2026-12-15T12:00:00", flight: "EK001",
        aircraft: "388", cls: "Y", minutes: 180, layover_min: 0 }] }
  ]
});
const mcCtx = vm.createContext(Object.assign({}, page, {
  MEZ: Object.assign({}, page.MEZ, {
    fares: [mcFare],
    info: { origin: "KHI", destination: "DXB", date: "2026-12-10", trip: "multi", cabin: "Economy",
      legs: [{ origin: "KHI", destination: "DXB", date: "2026-12-10" },
             { origin: "DXB", destination: "LHR", date: "2026-12-15" }],
      total: 9, complete: true, pax: { adults: 1, children: 0, infants: 0 } }
  })
}));
mcCtx.host = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
mcCtx.document = { getElementById: (id) => (id === "faMeezabResults" ? mcCtx.host : null) };
vm.runInContext(renderSource + "\nmezRender();", mcCtx);
const mcout = mcCtx.host.innerHTML;
assert.ok(mcout.includes("Meezab — KHI → DXB → LHR"), "multi-city header should show the whole route");
assert.ok(mcout.includes("Multi-city · 10 Dec 2026 · 15 Dec 2026"), "multi-city header dates wrong");
assert.ok(mcout.includes("Leg 1") && mcout.includes("Leg 2"), "multi-city card should label each leg");
assert.ok(mcout.includes("EK001"), "multi-city card misses the second leg");
assert.ok(mcout.includes(">Multi-city<"), "multi-city chip missing on the card");

/* Server response se trip/cabin/legs info mein aayein */
assert.equal(vm.runInContext("mezCabinLabel('PremiumEconomy')", renderContext), "Premium Economy");
assert.equal(vm.runInContext("mezCabinClass('premium_economy')", renderContext), "PremiumEconomy");
assert.equal(vm.runInContext("mezTripLabel('round')", renderContext), "Round trip");
const applyCtx = vm.createContext(Object.assign({}, page, {
  MEZ: { fares: [], info: null, page: 1, airline: "", busy: false }
}));
vm.runInContext(renderSource + `
mezApply({ fares: [], total: 3, complete: true, trip: { type: "round", cabin: "Business",
  legs: [{ origin: "KHI", destination: "DXB", date: "2026-12-10" },
         { origin: "DXB", destination: "KHI", date: "2026-12-20" }] },
  pax: { adults: 2, children: 1, infants: 0 } },
{ origin: "KHI", destination: "DXB", departure_date: "2026-12-10", trip_type: "round",
  return_date: "2026-12-20", cabin_class: "business" }, false);`, applyCtx);
const applied = vm.runInContext("MEZ.info", applyCtx);
assert.equal(applied.trip, "round");
assert.equal(applied.cabin, "Business");
assert.equal(applied.ret, "2026-12-20");
assert.equal(applied.legs.length, 2);

/* Form se resume tak trip type save/restore hota he */
assert.ok(/trip:trip, ret:ret \|\| "", cls:payload\.cabin_class/.test(html), "pending search does not save the trip type");
assert.ok(/leg2:\(trip === "multi"\)/.test(html), "pending search does not save the second leg");
assert.ok(/set\("faTrip", pd\.trip \|\| "one"\)/.test(html), "resume does not restore the trip type");
assert.ok(/set\("faRet", pd\.ret\)/.test(html), "resume does not restore the return date");
assert.ok(/set\("faDate2", pd\.leg2\.date/.test(html), "resume does not restore the second leg date");
assert.ok(/set\("faClass", pd\.cls\)/.test(html), "resume does not restore the cabin");
/* Round trip / multi-city IATA-only: country alias (UAE/USA) aur naam dono reject */
assert.ok(/trip !== "one" && \(!\/\^\[A-Z\]\{3\}\$\/\.test\(toUp\) \|\| aliasHit\)/.test(html),
  "round trip / multi-city guard missing");
assert.ok(/countryCandidates\(toRaw, 1\)\.length/.test(html),
  "3-letter country names are not filtered out of the IATA check");
assert.ok(/payload\.trip_type = "round"; payload\.return_date = ret/.test(html), "round-trip payload missing");
assert.ok(/payload\.legs = \[ \{ origin:origin, destination:mainTo, date:date \}/.test(html), "multi-city payload missing");

/* ---- Country code + airport matching ---- */
const countrySource = grab("var AB_COUNTRY_NAMES", "function airportsCache(");
const countryCtx = vm.createContext({ AB_COUNTRY_NAMES: {} });
vm.runInContext(countrySource, countryCtx);
const cRun = (code) => vm.runInContext(code, countryCtx);
assert.equal(cRun('countryName("AE")'), "UAE");
assert.equal(cRun('countryName("SA")'), "Saudi Arabia");

/* Time ab 12-ghante am/pm mein (v2.99) — pehle 24-ghante aa raha tha. */
const timeCtx = vm.createContext({});
vm.runInContext(grab("function mezTime(", "function mezStamp(") + ";this.__mezTime = mezTime;", timeCtx);
assert.equal(timeCtx.__mezTime("2026-12-10T23:05:00"), "11:05 pm");
assert.equal(timeCtx.__mezTime("2026-12-10T00:30:00"), "12:30 am");
assert.equal(timeCtx.__mezTime("2026-12-10T12:00:00"), "12:00 pm");
assert.equal(timeCtx.__mezTime("2026-12-10T09:45:00"), "9:45 am");
assert.equal(timeCtx.__mezTime(""), "");

/* Auto-refresh dobara default ON — 5 minute (v2.99) */
assert.ok(/country: null, auto: 5,/.test(html), "auto-refresh default should be 5 minutes");

/* ---- Auto-refresh helpers ---- */
const autoSource = grab("var MEZ_AUTO_CAP", "function ignavSearch(");
const autoCtx = vm.createContext({ localStorage: { getItem: () => null, setItem: () => {} }, Date, JSON, Number, Math,
  document: { getElementById: () => null, addEventListener: () => {} }, MEZ: { auto: 5, busy: false, payload: null } });
vm.runInContext(autoSource, autoCtx);
assert.equal(vm.runInContext("mezAutoBudgetLeft()", autoCtx), 240, "auto budget should default to 240 (live prices)");
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

/* Airport ranking: bade / international airports pehle (v2.81) */
const rankSrc = grab("var MEZ_MAJOR = (", "var MEZ_COUNTRY_MAX");
const rankCtx = vm.createContext({});
vm.runInContext(rankSrc + ";this.__rank = mezRankAirports;", rankCtx);
const ranked = rankCtx.__rank([
  { iata: "ALQ", name: "Aeroclube Airport", city: "Alegrete", country: "Brazil" },
  { iata: "GRU", name: "Guarulhos International Airport", city: "Sao Paulo", country: "Brazil" },
  { iata: "ZZZ", name: "Air Force Base", city: "Zed", country: "Brazil" }
]);
assert.equal(ranked[0].iata, "GRU", "international airport should rank first");
assert.equal(ranked[2].iata, "ZZZ", "military base should rank last");

/* Tab switch par search zinda rahe + adhoori search resume ho (v2.82) */
assert.ok(/function mezPanelHtml\(\)/.test(html), "state based results panel missing");
assert.ok(/function mezBindPanel\(\)/.test(html), "resume buttons binder missing");
assert.ok(/function mezSetStage\(/.test(html) && /function mezClearStage\(/.test(html), "search stage helpers missing");
assert.ok(/function mezSetBtnBusy\(/.test(html), "busy button helper missing");
assert.ok(/function mezPendSave\(/.test(html) && /function mezPendRead\(/.test(html) && /function mezPendClear\(/.test(html),
  "pending search storage helpers missing");
assert.ok(/ab_mez_pending/.test(html), "pending search storage key missing");
assert.ok(/id="mezResumeBtn"/.test(html), "resume button markup missing");
assert.ok(/MEZ\.stage === "loading"/.test(html), "loading stage not handled by panel");
assert.ok(/mezBindPanel\(\)/.test(html), "panel is rendered without binding its buttons");
assert.ok(/function mezWatchdog\(\)/.test(html), "stuck search watchdog missing");
/* Watchdog request ke timeout se pehle nahi chalna chahiye (v3.01) */
assert.ok(/Date\.now\(\) - MEZ\.runStart < 285000/.test(html),
  "watchdog fires before the 5-minute client timeout");
/* Search fail par error panel hamesha bane — catch mein busy abhi true hota he,
   is liye wahan se loading card banta tha aur error kabhi nazi nahi aata (v3.01) */
assert.ok(!/if\(errHost\) errHost\.innerHTML = mezPanelHtml\(\);/.test(html),
  "error panel is still rendered while busy is true (spinner gets stuck)");
assert.ok(/if\(h3\)\{ h3\.innerHTML = mezPanelHtml\(\); mezBindPanel\(\); \}/.test(html),
  "finally does not unconditionally repaint the error panel");
assert.ok(/function mezAbortStage\(/.test(html), "validation failure leaves the loading card behind");
/* Country pick payload: refresh cabin/nonstop na khoye (v3.01) */
assert.ok(/trip_type:"oneway", cabin_class:mezCabinClass\(c\.cabin \|\| "economy"\)/.test(html),
  "country pick drops the cabin from the refresh payload");
assert.ok(/if\(c\.nonstop\) MEZ\.payload\.max_stops = 0;/.test(html),
  "country pick drops the non-stop filter from the refresh payload");
assert.ok(/nonstop: base\.max_stops === 0,/.test(html), "country search does not remember the non-stop filter");
/* Refresh fail: fares screen par barqarar rahein (v3.01) */
assert.ok(/if\(MEZ\.fares\.length\)\{\s*\n\s*mezRender\(\);\s*\n\s*\} else if\(!auto\)/.test(html),
  "refresh failure wipes the visible fares");
/* Naya search purana refresh-error chip saaf kare (v3.01) */
assert.ok(/MEZ\.autoErr = "";\s*\n\s*var val = function/.test(html),
  "new search does not reset the header refresh-error chip");
/* Budget message cache ka jhoota wada na kare (v3.01) */
assert.ok(!/cache \(10 minute\) se foran aa jayega/.test(html), "budget card still promises a cache hit");
/* Manual split button maujood he aur handler dead nahi (v3.01) */
assert.ok(/id="applyMonth"/.test(html), "manual split button markup missing");
assert.ok(/if\(!confirm\(msg\)\) return;/.test(html), "manual split does not ask for confirmation");
assert.ok(/function applyMonthNow\(mid\)/.test(html), "applyMonthNow helper missing");
assert.ok(/mezPendSave\(\{ from:origin/.test(html), "search inputs are not remembered");
assert.ok(/mezPendClear\(\)/.test(html), "pending search is never cleared after success");
assert.ok(!/faRenderPresets/.test(html), "popular-route preset renderer still present");
assert.ok(!/FA_PRESETS/.test(html), "popular-route preset list still present");
assert.ok(!/id="faPresets"/.test(html), "popular routes card still rendered");
assert.ok(!/id="faQuick"/.test(html), "backup website buttons still rendered");

/* Panel HTML bina browser: loading / busy / error / resume */
const panelSource = renderSource.slice(renderSource.indexOf("function mezWaitCard("),
  renderSource.indexOf("/* Ek airport ki poori fare list"));
const panelCtx = vm.createContext({
  MEZ: { stage:"", stageNote:"", error:"", busy:false, fares:[] },
  esc: (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])),
  mezDate: (s) => String(s || "").slice(0, 10),
  mezTripLabel: (t) => (t === "round" ? "Round trip" : (t === "multi" ? "Multi-city" : "One-way")),
  mezPendRead: () => null
});
vm.runInContext(panelSource, panelCtx);
const panel = (code) => vm.runInContext(code, panelCtx);

assert.ok(/Meezab Air/.test(panel("mezPanelHtml()") ) === false, "empty state should render nothing");
panelCtx.MEZ.stage = "loading"; panelCtx.MEZ.stageNote = "Login ho raha he";
assert.ok(panel("mezPanelHtml()").includes("Login ho raha he"), "loading stage note not shown");
panelCtx.MEZ.stage = ""; panelCtx.MEZ.error = "network fail";
assert.ok(panel("mezPanelHtml()").includes("network fail"), "error not shown in panel");
panelCtx.MEZ.error = ""; panelCtx.MEZ.busy = true;
assert.ok(/Search chal rahi he/.test(panel("mezPanelHtml()")), "busy panel missing while search runs");
panelCtx.MEZ.busy = false;
assert.equal(panel("mezPanelHtml()"), "", "idle panel should be empty");
panelCtx.mezPendRead = () => ({ from:"KHI", to:"DXB", date:"2026-12-10", nonstop:false });
assert.ok(panel("mezPanelHtml()").includes("mezResumeBtn"), "resume card missing for an unfinished search");
assert.ok(panel("mezPanelHtml()").includes("KHI") && panel("mezPanelHtml()").includes("DXB"), "resume card lacks the route");

/* Suggestion dropdown: ek hi manager, body par fixed (v2.84) */
assert.ok(/function abDropMount\(/.test(html), "shared dropdown mount helper missing");
assert.ok(/var AB_DROP = null;/.test(html), "dropdown state missing");
assert.ok(!/AB_DROP_CLOSER/.test(html), "old half-done dropdown closer is back");
assert.ok(/abDropMount\(drop, inp, closeDrop\)/.test(html), "airport dropdown is not mounted on the shared manager");
assert.ok(/rowOffset \+ j/.test(html), "keyboard highlight ignores the country rows");

/* Meezab budget: cap/reset app side (v2.84) — asli tagging app mein
   `err.code = (j && j.code) || ...` hai, is liye pattern us par milta he. */
assert.ok(/err\.code = \(j && j\.code\) \|\| \(r\.status === 429 \? "budget" : ""\)/.test(html), "budget errors are not tagged");
assert.ok(/budget ' \+ esc\(String\(MEZ\.budget\.left\)\)/.test(html), "remaining Meezab budget is not shown");
assert.ok(/MEZ\.budget && Number\(MEZ\.budget\.left\) === 0/.test(html), "auto-refresh ignores an exhausted budget");

console.log("Meezab UI checks passed: baggage parse, stops/baggage/airline filters, airline strip cheapest fares, sorts, auto-refresh helpers, country panel render, card + strip render, per-passenger breakdown, quick fare buttons, country map.");
