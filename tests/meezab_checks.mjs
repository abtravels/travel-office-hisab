import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source = fs.readFileSync(new URL("../pricebot-worker.js", import.meta.url), "utf8")
  .replace("export class WatchIndex", "class WatchIndex").replace("export default", "const worker =");
const context = vm.createContext({ console, Date, URL, Response, Request, AbortSignal, setTimeout, crypto, btoa });
vm.runInContext(source, context);
const query = {origin:"KHI",destination:"DXB",departure_date:new Date(Date.now()+7*86400000).toISOString().slice(0,10)};
context.query = query;
assert.equal(vm.runInContext("mezQuery(query).origin", context), "KHI");
/* Passengers: portal jaisa poora party, 1/1/1 se 10/10/10 tak (v2.86). */
assert.equal(vm.runInContext("mezQuery(query).adults", context), 1);
assert.equal(vm.runInContext("mezQuery(query).children", context), 0);
context.party = {...query, adults:2, children:3, infants_on_lap:1, infants_in_seat:2};
const pq = vm.runInContext("mezQuery(party)", context);
assert.equal(pq.adults, 2); assert.equal(pq.children, 3);
assert.equal(pq.infants, 3);          // lap + seat ek hi Infant group
assert.equal(pq.infants_on_lap, 1); assert.equal(pq.infants_in_seat, 2);
context.big = {...query, adults:10, children:10, infants_on_lap:5, infants_in_seat:5};
assert.equal(vm.runInContext("mezQuery(big).infants", context), 10);
context.invalid = {...query, adults:11};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /adult 1 se 10/);
context.invalid = {...query, children:11};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /child 0 se 10/);
context.invalid = {...query, infants_on_lap:6, infants_in_seat:6};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /infants .* 10 se zyada/);
context.invalid = {...query, adults:0};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /adult 1 se 10/);
context.invalid = {...query, trip_type:"round"};   // round trip bina return date
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /Return: valid future date/);
context.invalid = {...query, trip_type:"round", return_date:"2020-01-01"};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /Return: valid future date/);
context.invalid = {...query, trip_type:"multi", legs:[{origin:"KHI",destination:"DXB",date:query.departure_date}]};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /kam az kam 2 legs/);
/* Trip types (v2.88): portal ke values OneWay / Round / MultiCity hain. */
context.rt = {...query, trip_type:"round",
  return_date:new Date(Date.now()+14*86400000).toISOString().slice(0,10)};
const rtq = vm.runInContext("mezQuery(rt)", context);
context.rtq = rtq;
assert.equal(rtq.trip_type,"round");
assert.equal(rtq.return_date, context.rt.return_date);
const rtPortal = vm.runInContext("mezPortalQuery(rtq, {})", context);
assert.equal(rtPortal.FlightDirection,"Round");
assert.equal(rtPortal.ArrivalDate, context.rt.return_date + "T00:00:00");
assert.equal(rtPortal.MultiCityArray.length,0);
context.mc = {...query, trip_type:"multi", legs:[
  {origin:"KHI", destination:"DXB", date:query.departure_date},
  {origin:"DXB", destination:"LHR", date:new Date(Date.now()+9*86400000).toISOString().slice(0,10)}]};
const mcq = vm.runInContext("mezQuery(mc)", context);
context.mcq = mcq;
assert.equal(mcq.trip_type,"multi");
assert.equal(mcq.legs.length,2);
const mcPortal = vm.runInContext("mezPortalQuery(mcq, {})", context);
assert.equal(mcPortal.FlightDirection,"MultiCity");
assert.equal(JSON.stringify(mcPortal.MultiCityArray.map(l => Object.keys(l).join(","))),
  JSON.stringify(["DepartureDate,FromIATA,ToIATA","DepartureDate,FromIATA,ToIATA"]));
assert.equal(JSON.stringify(mcPortal.MultiCityArray.map(l => l.FromIATA + l.ToIATA)),
  JSON.stringify(["KHIDXB","DXBLHR"]));
assert.equal(mcPortal.ArrivalDate, mcq.legs[1].date + "T00:00:00");
/* Cabin portal jaisa — "" / any = Economy. */
assert.equal(vm.runInContext("mezQuery({...query, cabin_class:'business'}).cabin", context), "Business");
assert.equal(vm.runInContext("mezQuery({...query, cabin_class:'premium_economy'}).cabin", context), "PremiumEconomy");
assert.equal(vm.runInContext("mezQuery(query).cabin", context), "Economy");
context.invalid = {...query, departure_date:"2026-02-30"};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /valid future date/);
context.invalid = {...query, destination:"KHI"};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /alag hone chahiye/);
context.result = {
  SearchUpdateResult:{isSearchCompleted:true}, Flight_Result:{totalResultCount:3,flightDataSet:{
    FlightOption:[
      {ID:1,OptionTotal_WithPM_Agent_Currency_Amount:27760,Agent_Currency:"PKR",
        ValidatingCarrier:"EY",ValidatingCarrierName:"Etihad Airways dba Etihad",
        isRefundable:true,isChangeable:false,BaggageInfoADT:"30KG",EXT_secret:"DO-NOT-EXPOSE",
        Sys_SupplierID:153,EXT_Travelport_json_OfferListResponseIdentifier:"tp-1"},
      {ID:2,OptionTotal_WithPM_Agent_Currency_Amount:0,Agent_Currency:"PKR"},
      {ID:3,OptionTotal_WithPM_Agent_Currency_Amount:100,Agent_Currency:"AED"}],
    FlightData:[{ID:10,FlightOptionID:1,FlightDuration:405}],
    FlightSegment:[
      {ID:20,FlightDataID:10,DepartureIata:"KHI",ArrivalIata:"AUH",
        DepartureDate:"2026-12-10T05:10:00",ArrivalDate:"2026-12-10T07:35:00",
        MarketingAirline:"EY",FlightNumber:"297",AirCraft:"320",FlightMinutes:145,
        LayoverDuration:820,
        DepartureCity:"Karachi",ArrivalCity:"Abu Dhabi",SeatsRemaining:5},
      {ID:21,FlightDataID:10,DepartureIata:"AUH",ArrivalIata:"XNB",
        DepartureDate:"2026-12-10T21:15:00",ArrivalDate:"2026-12-10T23:55:00",
        MarketingAirline:"EY",FlightNumber:"5426",AirCraft:"BUS",FlightMinutes:160,
        ArrivalCity:"Dubai"}
    ]
  }}
};
const normalized = vm.runInContext("mezNormalize(result, query)", context);
assert.equal(normalized.fares.length,1);
const fare = normalized.fares[0];
assert.equal(fare.amount,27760);
assert.equal(fare.airline_code,"EY");
assert.equal(fare.airline,"Etihad Airways");
assert.equal(fare.platform,"Travelport");   // EXT_ prefix supplier id se pehle dekha jata he
assert.equal(vm.runInContext('mezPlatform({Sys_SupplierID:142})', context), "NDC Emirates");
assert.equal(vm.runInContext('mezPlatform({Sys_SupplierID:94})', context), "Hitit");
assert.equal(vm.runInContext('mezPlatform({Sys_SupplierID:95})', context), "");
assert.equal(fare.stops,1);
assert.equal(fare.stops_at,"AUH");
assert.equal(fare.duration_min,1125);
assert.equal(fare.refundable,true);
assert.equal(fare.baggage,"30KG");
assert.equal(fare.baggage_child,"");
/* Per-passenger fares (v2.86): portal har group ka fare alag bhejta he. */
assert.equal(fare.pax.adults,1);
assert.equal(fare.per_adult,0);       // is fixture mein Per* fields nahi hain
context.partyResult = JSON.parse(JSON.stringify(context.result));
Object.assign(context.partyResult.Flight_Result.flightDataSet.FlightOption[0], {
  PerAdultTotal_WithPM_Agent_Currency_Amount:27760,
  PerChildTotal_WithPM_Agent_Currency_Amount:19800,
  PerInfantTotal_WithPM_Agent_Currency_Amount:4200,
  BaggageInfoCNN:"20KG", BaggageInfoINF:"10KG"
});
context.partyQuery = {nonstop:false, adults:2, children:1, infants:1};
const partyNorm = vm.runInContext("mezNormalize(partyResult, partyQuery)", context);
assert.equal(partyNorm.pax.adults,2);
assert.equal(partyNorm.pax.children,1);
assert.equal(partyNorm.pax.infants,1);
const pf = partyNorm.fares[0];
assert.equal(pf.per_adult,27760);
assert.equal(pf.per_child,19800);
assert.equal(pf.per_infant,4200);
assert.equal(pf.baggage_child,"20KG");
assert.equal(pf.baggage_infant,"10KG");
// per-pax sum vs portal total (27760*2 + 19800 + 4200 = 79520)
assert.equal(pf.party_sum,79520);
assert.ok(!JSON.stringify(partyNorm).includes("DO-NOT-EXPOSE"));
assert.equal(fare.segments[1].to,"XNB");
assert.equal(fare.segments[1].aircraft,"BUS");
assert.equal(fare.segments[1].bus,true);
assert.equal(fare.segments[1].layover_min,820);
assert.ok(!JSON.stringify(normalized).includes("DO-NOT-EXPOSE"));
assert.equal(vm.runInContext("mezNormalize(result, {nonstop:true}).fares.length", context),0);
// duplicate supplier rows for the same flight+price collapse to one fare
context.dupes = JSON.parse(JSON.stringify(context.result));
context.dupes.Flight_Result.flightDataSet.FlightOption.push({ID:1,OptionTotal_WithPM_Agent_Currency_Amount:27760,Agent_Currency:"PKR"});
assert.equal(vm.runInContext("mezNormalize(dupes, query).fares.length", context),1);
// paginated responses merge instead of replacing each other
context.pages = [context.result, {
  SearchUpdateResult:{isSearchCompleted:true},
  Flight_Result:{totalResultCount:4,flightDataSet:{
    FlightOption:[{ID:4,OptionTotal_WithPM_Agent_Currency_Amount:19990,Agent_Currency:"PKR",
      ValidatingCarrier:"PK",ValidatingCarrierName:"Pakistan International Airlines"}],
    FlightData:[{ID:40,FlightOptionID:4,FlightDuration:110}],
    FlightSegment:[{ID:41,FlightDataID:40,DepartureIata:"KHI",ArrivalIata:"DXB",
      DepartureDate:"2026-12-10T09:00:00",ArrivalDate:"2026-12-10T10:50:00",
      MarketingAirline:"PK",FlightNumber:"300",AirCraft:"320",FlightMinutes:110}]
  }}
}];
const merged = vm.runInContext("mezNormalize(pages, query)", context);
assert.equal(merged.fares.length,2);
assert.equal(merged.total,4);
assert.equal(merged.fares[0].amount,19990);
/* Round trip (v2.88): ek option ke andar 2 legs — outbound + return. */
context.rtResult = {
  SearchUpdateResult:{isSearchCompleted:true},
  Flight_Result:{totalResultCount:1,flightDataSet:{
    FlightOption:[{ID:7,OptionTotal_WithPM_Agent_Currency_Amount:88720,Agent_Currency:"PKR",
      ValidatingCarrier:"FZ",ValidatingCarrierName:"Flydubai",BaggageInfoADT:"20KG"}],
    FlightData:[
      {ID:70,FlightOptionID:7,FlightDuration:145,DepartureDate:"2026-12-10T16:25:00"},
      {ID:71,FlightOptionID:7,FlightDuration:120,DepartureDate:"2026-12-20T06:00:00"}],
    FlightSegment:[
      {ID:700,FlightDataID:70,DepartureIata:"KHI",ArrivalIata:"DXB",
        DepartureDate:"2026-12-10T16:25:00",ArrivalDate:"2026-12-10T17:50:00",
        MarketingAirline:"FZ",FlightNumber:"332",AirCraft:"7M8",FlightMinutes:145},
      {ID:701,FlightDataID:71,DepartureIata:"DXB",ArrivalIata:"KHI",
        DepartureDate:"2026-12-20T06:00:00",ArrivalDate:"2026-12-20T08:00:00",
        MarketingAirline:"FZ",FlightNumber:"331",AirCraft:"7M8",FlightMinutes:120}]
  }}
};
context.rtNormalizeQuery = {trip_type:"round",origin:"KHI",destination:"DXB",
  departure_date:context.rt.return_date && query.departure_date, return_date:context.rt.return_date,cabin:"Economy",nonstop:false};
const rtNorm = vm.runInContext("mezNormalize(rtResult, rtNormalizeQuery)", context);
assert.equal(rtNorm.fares.length,1);
assert.equal(rtNorm.trip.type,"round");
assert.equal(rtNorm.trip.legs.length,2);
assert.equal(rtNorm.trip.legs[1].origin,"DXB");
const rtFare = rtNorm.fares[0];
assert.equal(rtFare.legs.length,2);
assert.equal(rtFare.legs[0].from,"KHI"); assert.equal(rtFare.legs[0].to,"DXB");
assert.equal(rtFare.legs[1].from,"DXB"); assert.equal(rtFare.legs[1].to,"KHI");
assert.equal(rtFare.legs[0].segments.length,1);       // segments leg-wise hi rehte hain
assert.equal(rtFare.segments.length,1);               // top-level = pehli leg
assert.equal(rtFare.duration_min,265);                // dono legs ka jod
assert.equal(rtFare.cabin,"Economy");
// nonstop filter har leg par lagta he — dono single-segment hain, to fare bachta he
assert.equal(vm.runInContext("mezNormalize(rtResult, {...rtNormalizeQuery, nonstop:true}).fares.length", context),1);
// same price magar mukhtalif return flight = alag fare (dedupe return leg ko dekhta he)
context.rtTwo = JSON.parse(JSON.stringify(context.rtResult));
context.rtTwo.Flight_Result.flightDataSet.FlightOption.push(
  {ID:8,OptionTotal_WithPM_Agent_Currency_Amount:88720,Agent_Currency:"PKR",ValidatingCarrier:"FZ"});
context.rtTwo.Flight_Result.flightDataSet.FlightData.push(
  {ID:72,FlightOptionID:8,FlightDuration:150,DepartureDate:"2026-12-20T22:00:00"});
context.rtTwo.Flight_Result.flightDataSet.FlightSegment.push(
  {ID:702,FlightDataID:72,DepartureIata:"DXB",ArrivalIata:"KHI",
   DepartureDate:"2026-12-20T22:00:00",ArrivalDate:"2026-12-21T00:15:00",
   MarketingAirline:"FZ",FlightNumber:"335",AirCraft:"7M8",FlightMinutes:150});
assert.equal(vm.runInContext("mezNormalize(rtTwo, rtNormalizeQuery).fares.length", context),2);
// portal occasionally returns a wild wrong amount (e.g. 8,077,840 PKR economy fare)
context.wild = JSON.parse(JSON.stringify(context.pages));
context.wild[1].Flight_Result.flightDataSet.FlightOption.push(
  {ID:99,OptionTotal_WithPM_Agent_Currency_Amount:9000000,Agent_Currency:"PKR",ValidatingCarrier:"FZ"});
context.wild[1].Flight_Result.flightDataSet.FlightData.push({ID:990,FlightOptionID:99,FlightDuration:120});
context.wild[1].Flight_Result.flightDataSet.FlightSegment.push(
  {ID:991,FlightDataID:990,DepartureIata:"KHI",ArrivalIata:"DXB",
   DepartureDate:"2026-12-10T11:00:00",ArrivalDate:"2026-12-10T13:00:00",
   MarketingAirline:"FZ",FlightNumber:"999",AirCraft:"320",FlightMinutes:120});
assert.equal(vm.runInContext("mezNormalize(wild, query).fares.length", context),2);
// auto-refresh: search core alag function he, taake fresh flag cache skip kar sake
assert.equal(vm.runInContext("typeof mezRunSearch", context), "function");
assert.equal(vm.runInContext("typeof meezabSearch", context), "function");
/* v3.01: poll ek dafa slow ho to search na mare — retry helper + timeout badha */
assert.equal(vm.runInContext("typeof mezPoll", context), "function");
assert.ok(/mezPoll\(cookie, pageBody\(1, 1\)\)/.test(source), "the poll loop does not use the retrying helper");
assert.ok(!/status = await mezPost\(cookie, "GetFlightListUpdate", pageBody\(1, 1\)\)/.test(source),
  "the poll loop still calls mezPost directly (one slow poll kills the search)");
assert.ok(/pollFails >= 3\) throw e;/.test(source), "repeated poll failures are not tolerated");
/* Budget message: purane cached routes ka jhoota wada na kare (v3.01) */
assert.ok(!/cached\) routes ab bhi chalte hain/.test(source), "budget error still promises cached results");
console.log("Meezab checks passed: validation, passenger groups (10/10/10), fare currency, zero-price filtering, bus routing, token stripping, nonstop, duplicate fares, paging merge, wild-price filter, rich fields, per-passenger fares, refresh helper.");
