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
      {ID:1,OptionTotal_WithPM_Agent_Currency_Amount:27760,Agent_Currency:"PKR",EXT_secret:"DO-NOT-EXPOSE"},
      {ID:2,OptionTotal_WithPM_Agent_Currency_Amount:0,Agent_Currency:"PKR"},
      {ID:3,OptionTotal_WithPM_Agent_Currency_Amount:100,Agent_Currency:"AED"}],
    FlightData:[{ID:10,FlightOptionID:1}],
    FlightSegment:[
      {FlightDataID:10,DepartureIata:"KHI",ArrivalIata:"AUH",DepartureDate:"2026-12-10T05:10",AirCraft:"320"},
      {FlightDataID:10,DepartureIata:"AUH",ArrivalIata:"XNB",DepartureDate:"2026-12-10T21:15",AirCraft:"BUS"}
    ]
  }}
};
const normalized = vm.runInContext("mezNormalize(result, query)", context);
assert.equal(normalized.fares.length,1);
assert.equal(normalized.fares[0].amount,27760);
assert.equal(normalized.fares[0].segments[1].to,"XNB");
assert.equal(normalized.fares[0].segments[1].aircraft,"BUS");
assert.ok(!JSON.stringify(normalized).includes("DO-NOT-EXPOSE"));
assert.equal(vm.runInContext("mezNormalize(result, {nonstop:true}).fares.length", context),0);
// duplicate supplier rows for the same flight+price collapse to one fare
context.dupes = JSON.parse(JSON.stringify(context.result));
context.dupes.Flight_Result.flightDataSet.FlightOption.push({ID:1,OptionTotal_WithPM_Agent_Currency_Amount:27760,Agent_Currency:"PKR"});
assert.equal(vm.runInContext("mezNormalize(dupes, query).fares.length", context),1);
console.log("Meezab checks passed: validation, fare currency, zero-price filtering, bus routing, token stripping, nonstop, duplicate fares.");
