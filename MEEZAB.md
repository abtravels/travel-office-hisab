# Meezab fare lookup

The app's Price Lookup includes a separate Meezab button using the selected route,
date and passengers. Support: one-way, round trip and multi-city (up to 4 legs),
cabin selection (Economy / Premium / Business / First), prices in PKR, and the
full portal party — up to 10 adults, 10 children and 10 infants (lap + seat
together).

Worker secrets: `MEZ_USER`, `MEZ_PASS`. Optional `MEZ_SUBCOMPANY` defaults to the
view-only account's company ID `278`. Set these through Cloudflare secrets,
never in the HTML or committed files. Existing KV binding is required.

`POST /meezab/search` accepts `origin`, `destination`, `departure_date`,
`adults` (1–10), `children` (0–10), `infants_on_lap` (0–10), `infants_in_seat`
(0–10, and lap + seat together at most 10), and optional `max_stops: 0`. It logs
in, verifies the session, starts the search, and polls supplier completion. Every result page is collected (250 per page,
max 6 pages / 1,500 options, `MEZ_MAX_PAGES`, max 12) before normalizing, so the app really sees all
fares the search returned. Only normalized prices, airlines and segments are
returned; supplier access tokens and session cookies remain server-side.
Complete results are cached for ten minutes (`MEZ_CACHE_TTL`) as a fallback: a
reply is always live unless the caller sends `cache: true`, and when a live
search fails the last complete answer comes back with `cached: true, stale: true`
(plus `stale_reason`), which the app labels as "purana data".
There is a best-effort daily budget (KV counters are not atomic). Its cap is
`MEZ_DAILY_CAP` (default 4000, practically unlimited) and the counter resets at
00:00 UTC (05:00 PKT).
A unit is counted only once the portal has accepted the search and returned a
`SearchID`, so a login or HTTP failure above that point costs nothing. Every
`/meezab/search` reply carries `budget: { cap, used, left, reset_at }`, and an
exhausted budget answers `429` with `code: "budget"` plus the same cap/reset
values. The app shows the remaining searches in the results header and keeps
auto-refresh off when the budget is gone. A country search spends one unit per
airport.

Passing `fresh: true` in the body skips the five-minute cache and always runs a
new portal search (used by the app's ↻ / auto-refresh). Cached responses carry
`cached: true` so the app can label them.

## Auto-refresh and country search (v2.79)

The app refreshes the current route on a timer (`Auto refresh`: off / 3 / 5 / 10
minutes, **default 5**). Refreshes are `fresh: true`, skip the Worker cache, and
only run while the Price Lookup tab is open and visible (`document.hidden` pauses
them). Because every refresh spends from the 4000/day Worker budget,
auto-refresh is capped at 240 per day per browser (localStorage counter
`ab_mez_auto_used`) while the ↻ button works any number of times.

## Speed (v2.99)

A round trip used to take 60-90 seconds and could fail on bigger routes. Two
changes: the completion poll now stops as soon as the portal's option count has
not moved for five polls after at least twelve, instead of always waiting for
`isSearchCompleted` (the reply is then labelled `partial`, which is honest — the
fares shown are live), and pages are capped at six (1,500 fares, cheapest first)
instead of ten, with a 24 MB JSON budget instead of 40 MB. The app shows a live
elapsed-seconds counter in the wait card so a long round trip is visibly moving.

Typing a country or city instead of an IATA code in **To** ("UAE", "Saudi
Arabia", "Dubai") runs a country search. The app resolves the airports from its
local `mwgg/Airports` list (no extra API), keeps the 8 largest (a major-airport
rank list, then `International` names), and calls `/meezab/search` once per
airport, **three at a time**, merging each cheapest fare into a price-sorted
list. Eight UAE airports took 52 seconds on 15 November 2026. The worker
endpoint is unchanged — only `/meezab/search` is used, so a country search costs
one budget unit per airport. Clicking a row opens that airport's full fare list in
the normal results card; the row stays highlighted and ↻/auto-refresh then tracks
that airport.

Each fare carries `airline_code`, `platform`, `duration_min`, `stops`, `stops_at`,
`overnight`, `seats`, `refundable`/`changeable`, `baggage`, and per-segment
`flight`, `aircraft`, `cls`, `minutes`, `layover_min`, `bus`. Times stay as the
portal's local wall-clock strings (no UTC conversion), because each airport has
its own offset.

## Trip types: round trip and multi-city (v2.88)

The portal does not use the words "round trip" the way the app does. Its search
query carries `FlightDirection` with three values — `OneWay`, `Round` (not
"RoundTrip") and `MultiCity` — plus the dates and a leg list:

```json
{ "FlightDirection": "Round", "DepartureDate": "2026-12-10T00:00:00",
  "ArrivalDate": "2026-12-20T00:00:00", "MultiCityArray": [] }
```

```json
{ "FlightDirection": "MultiCity", "DepartureDate": "2026-12-10T00:00:00",
  "ArrivalDate": "2026-12-15T00:00:00",
  "MultiCityArray": [
    { "DepartureDate": "2026-12-10T00:00:00", "FromIATA": "KHI", "ToIATA": "DXB" },
    { "DepartureDate": "2026-12-15T00:00:00", "FromIATA": "DXB", "ToIATA": "LHR" } ] }
```

Top-level `FlightFrom`/`FlightTo` stay the first leg; `ArrivalDate` is the return
date for `Round` and the last leg's date for `MultiCity`. The trace ID and
`SearchDateTime` also match the portal byte-for-byte now (16 random bytes base64,
`+05:00` offset). Live checks on 16 November 2026:

- `Round` KHI–DXB 10→20 Dec: 2,429 options, 2 legs per option, cheapest 88,720 PKR.
- `MultiCity` KHI–DXB–LHR 10/15 Dec: 1,317 options, 2 legs, cheapest 96,754 PKR.
- Cabin `Business` / `First` / `PremiumEconomy` are accepted, but the portal
  keeps returning Economy-class fares (`FlightClass: "Economy"`) — on KHI–DXB
  and KHI–LHR the prices were identical to Economy. The cabin only changes which
  suppliers answer, so the app offers the choice with an honest note instead of
  filtering fares that do not exist.

`POST /meezab/search` now also accepts `trip_type` (`oneway` / `round` /
`multi`), `return_date`, `legs: [{ origin, destination, date }]` and
`cabin_class` (`economy` / `premium_economy` / `business` / `first`). Old
clients that send only `return_date` or `legs` still work (the shape decides the
trip type). Validation rejects a missing/earlier return date, fewer than two
legs, more than four legs, out-of-order leg dates and same From/To on a leg.

Every fare now carries `trip_type`, `cabin` and `legs: [...]`; each leg has its
own `from`/`to`, `departure`/`arrival`, `duration_min`, `stops`, `stops_at` and
`segments`. Top-level `departure`/`arrival` remain the first leg / last arrival
and `duration_min` is the sum of the legs. Duplicate-fare keys include every leg,
so two round trips with the same price but different return flights stay
separate. The reply adds `trip: { type, cabin, legs }`.

In the app the card shows one block per leg — **Outbound** / **Return** for round
trips, **Leg 1 / Leg 2 …** for multi-city — with a trip chip and the whole route
in the results header. Country/city search stays one-way only, as before, because
a round trip is not a set of alternative airports.

## Passengers: total price + per-person breakdown (v2.86)

The portal prices the whole party in one search, exactly like its own website, so
`amount` is the **party total**. The worker builds one passenger object per
traveller (`AdultClsArray` / `ChildClsArray` / `InfantClsArray`, with `Adults`,
`Child` and `Infant` counts), each with its own unique reference IDs — reusing
IDs makes a supplier quote a single passenger.

Every fare also carries the portal's per-group fares, taken from
`PerAdultTotal_WithPM_Agent_Currency_Amount`, `PerChildTotal_…` and
`PerInfantTotal_…` (markup-included agent amounts, matching the total field):

```json
{ "amount": 186747, "pax": { "adults": 2, "children": 1, "infants": 1 },
  "per_adult": 59546, "per_child": 50977, "per_infant": 16678,
  "party_sum": 186747,
  "baggage": "0Nil", "baggage_child": "0Nil", "baggage_infant": "0Nil" }
```

`party_sum` is `per_adult × adults + per_child × children + per_infant × infants`;
the app only warns when it differs from `amount`. Baggage now comes per group
(`BaggageInfoADT` / `BaggageInfoCNN` / `BaggageInfoINF`). Replies also carry a
top-level `pax` block. Verified live on 16 November 2026: the sums matched
exactly for 1/0/0, 2/0/0, 2/1/1, 10/3/2 and 10/10/10.

In the app the card shows the party total with a "total · 2 adults + 1 child"
label, and tapping **Per-passenger breakdown** opens a small table with per-person
fare, per-group total and baggage. A single-adult search keeps the plain
"per adult" card with no breakdown.

The portal stores infants in one group, so `infants_on_lap` and `infants_in_seat`
are added together before the search (`infants`). The app still remembers which
was which for the form and add-to-booking display.

`platform` is the distribution system the fare came from. The portal hides it in
`EXT_<platform>_*` keys (`EXT_Hitit_*`, `EXT_Travelport_*`, `EXT_EK_NDC_*`,
`EXT_FZ_*`, `EXT_OneAPI_*`, `EXT_AirSial_*`, `EXT_NZFlight_*`) and in
`Sys_SupplierID`. Mapping observed on live searches:

| Sys_SupplierID | platform |
| --- | --- |
| 94 | Hitit |
| 101 | AirSial |
| 114 | NDC Flydubai |
| 138 | OneAPI |
| 142 | NDC Emirates |
| 151, 152 | Travelport |
| 153 | NZFlight |
| 155 | Airblue direct |
| 95 | (portal exposes no name — chip hidden) |

`EXT_` keys win over the ID, so a re-numbered supplier still gets the right
label. Supplier tokens (`SupplierReference`, `EXT_*` values) are never returned.

`duration_min` is summed from segment flight minutes plus layovers. The portal's
own `FlightDuration` field is unreliable (672 of 854 KHI→DXB fares said 60
minutes for 4–5 hour journeys), so it is only a fallback. Meezab stores a
layover on the *preceding* segment; the worker moves it to `layover_min` of the
segment it comes before.

Absurd amounts are dropped: if the cheapest fare is at least 5,000 PKR, anything
above 50× the cheapest is treated as portal data error. KHI→DXB keeps a real
1,323,760 fare but drops the bogus 8,077,840 ones.

Nearby airports and bus connections returned by Meezab retain their actual
airport codes. The app explicitly labels BUS segments.

## Deploy
```
$env:CF_API_TOKEN = "<token: Workers Scripts Write>"
powershell -ExecutionPolicy Bypass -File tools/deploy_worker.ps1
python tools/embed_worker.py   # refresh the copy shown in Settings
```
`keep_bindings` preserves KV, the Durable Object and every secret, so the
script can be replaced safely. Live lookups need the 10-minute login session
cache to expire before a credential change is picked up.

## Notes
- `fetch` must use `redirect: "follow"`. With `redirect: "error"` the portal's
  login response made the Worker throw, which surfaced as a plain 502.
- Meezab sends an empty `session_token` cookie first and the real one second;
  only cookies with a value are forwarded.
- Errors are prefixed `Meezab <step>: ...` so a failure names the stage
  (login / verify / GetFlightList / poll) instead of a generic message.

Checks:
```
node tests/meezab_checks.mjs
python -m unittest discover -s tests
```

Live adapter verification on 14 November 2026: KHI/DXB, 10 December 2026,
one adult, completed successfully and returned PKR fares. Prices are transient.
Party search verified 16 November 2026: 2 adults + 1 child + 1 infant returned
186,747 PKR total with per-person fares summing to the same number, and a
10 adult / 10 child / 10 infant search completed in 33 seconds.
