# Meezab fare lookup

The app's Price Lookup includes a separate Meezab button using the selected route
and date. Initial support: one-way, one adult, Economy, prices in PKR.

Worker secrets: `MEZ_USER`, `MEZ_PASS`. Optional `MEZ_SUBCOMPANY` defaults to the
view-only account's company ID `278`. Set these through Cloudflare secrets,
never in the HTML or committed files. Existing KV binding is required.

`POST /meezab/search` accepts `origin`, `destination`, `departure_date`, and
optional `max_stops: 0`. It logs in, verifies the session, starts the search,
and polls supplier completion. Only normalized prices, airlines and segments
are returned; supplier access tokens and session cookies remain server-side.
Complete results cache for five minutes; incomplete results are labelled.
There is a best-effort 60-search daily budget (KV counters are not atomic).

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
