# Meezab fare lookup

The app's Price Lookup includes a separate Meezab button using the selected route
and date. Initial support: one-way, one adult, Economy, prices in PKR.

Worker secrets: `MEZ_USER`, `MEZ_PASS`. Optional `MEZ_SUBCOMPANY` defaults to the
view-only account's company ID `278`. Set these through Cloudflare secrets,
never in the HTML or committed files. Existing KV binding is required.

`POST /meezab/search` accepts `origin`, `destination`, `departure_date`, and
optional `max_stops: 0`. It logs in, verifies the session, starts the search,
and polls supplier completion. Every result page is collected (250 per page,
max 6 pages / 1,500 options) before normalizing, so the app really sees all
fares the search returned. Only normalized prices, airlines and segments are
returned; supplier access tokens and session cookies remain server-side.
Complete results cache for ten minutes (`MEZ_CACHE_TTL`); incomplete results are
labelled. A cache hit costs no budget.
There is a best-effort daily budget (KV counters are not atomic). Its cap is
`MEZ_DAILY_CAP` (default 60) and the counter resets at 00:00 UTC (05:00 PKT).
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
minutes). Refreshes are `fresh: true`, skip the Worker cache, and only run while
the Price Lookup tab is open and visible (`document.hidden` pauses them). Because
every refresh spends from the 60/day Worker budget, auto-refresh is capped at 15
per day per browser (localStorage counter `ab_mez_auto_used`) while the ↻ button
works any number of times.

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
