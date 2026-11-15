import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source = fs.readFileSync(new URL("../pricebot-worker.js", import.meta.url), "utf8")
  .replace("export class WatchIndex", "class WatchIndex").replace("export default", "const worker =");
const context = vm.createContext({ console, Date, URL, Response, Request, AbortSignal, setTimeout });
vm.runInContext(source, context);
const query = {origin:"KHI",destination:"DXB",departure_date:new Date(Date.now()+7*86400000).toISOString().slice(0,10)};
context.query = query;
assert.equal(vm.runInContext("mezQuery(query).origin", context), "KHI");
context.invalid = {...query, children:1};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /1 adult/);
context.invalid = {...query, departure_date:"2026-02-30"};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /valid future date/);
context.invalid = {...query, destination:"KHI"};
assert.throws(() => vm.runInContext("mezQuery(invalid)", context), /different/);
context.result = {
  SearchUpdateResult:{isSearchCompleted:true}, Flight_Result:{totalResultCount:3,flightDataSet:{
    FlightOption:[
      {ID:1,OptionTotal_WithPM_Agent_Currency_Amount:27760,Agent_Currency:"PKR",
        ValidatingCarrier:"EY",ValidatingCarrierName:"Etihad Airways dba Etihad",
        isRefundable:true,isChangeable:false,BaggageInfoADT:"30KG",EXT_secret:"DO-NOT-EXPOSE"},
      {ID:2,OptionTotal_WithPM_Agent_Currency_Amount:0,Agent_Currency:"PKR"},
      {ID:3,OptionTotal_WithPM_Agent_Currency_Amount:100,Agent_Currency:"AED"}],
    FlightData:[{ID:10,FlightOptionID:1,FlightDuration:405}],
    FlightSegment:[
      {ID:20,FlightDataID:10,DepartureIata:"KHI",ArrivalIata:"AUH",
        DepartureDate:"2026-12-10T05:10:00",ArrivalDate:"2026-12-10T07:35:00",
        MarketingAirline:"EY",FlightNumber:"297",AirCraft:"320",FlightMinutes:145,
        DepartureCity:"Karachi",ArrivalCity:"Abu Dhabi",SeatsRemaining:5},
      {ID:21,FlightDataID:10,DepartureIata:"AUH",ArrivalIata:"XNB",
        DepartureDate:"2026-12-10T21:15:00",ArrivalDate:"2026-12-10T23:55:00",
        MarketingAirline:"EY",FlightNumber:"5426",AirCraft:"BUS",FlightMinutes:160,
        LayoverDuration:820,ArrivalCity:"Dubai"}
    ]
  }}
};
const normalized = vm.runInContext("mezNormalize(result, query)", context);
assert.equal(normalized.fares.length,1);
const fare = normalized.fares[0];
assert.equal(fare.amount,27760);
assert.equal(fare.airline_code,"EY");
assert.equal(fare.airline,"Etihad Airways");
assert.equal(fare.stops,1);
assert.equal(fare.stops_at,"AUH");
assert.equal(fare.duration_min,405);
assert.equal(fare.refundable,true);
assert.equal(fare.baggage,"30KG");
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
console.log("Meezab checks passed: validation, fare currency, zero-price filtering, bus routing, token stripping, nonstop, duplicate fares, paging merge, wild-price filter, rich fields.");
