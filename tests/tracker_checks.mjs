/* Price Tracker (v3.18) checks — app helpers + worker tracker engine, bina browser.
   index.html aur pricebot-worker.js se asli code nikaal kar chalate hain.
   Tracker alag tab he — Sales register mein tracker/expiry ka koi cheez nahi honi chahiye. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const ROOT = "C:/Users/UMAIR/Downloads/TRAVEL SOFTWARE";
const html = fs.readFileSync(ROOT + "/index.html", "utf8");
let wsrc = fs.readFileSync(ROOT + "/pricebot-worker.js", "utf8");

function grab(src, start, end) {
  const a = src.indexOf(start);
  assert.ok(a > 0, "missing: " + start);
  const b = src.indexOf(end, a + start.length);
  assert.ok(b > a, "missing end for: " + start);
  return src.slice(a, b);
}

/* ---------- 1. app-side helpers ---------- */
const appSrc =
  grab(html, "var TRK = {", "function viewTracker(){") +
  "\nthis.__x = { TRK, trkMoney, trkNextText, trkAgoText, trkUntilText, trkLocalDateIso, trkSpark, trkApply, trkPlanText, trackerRow, trkEveryLabel };";

function appCtx() {
  const ctx = vm.createContext({
    esc: (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
    dmy: (s) => { const m = String(s == null ? "" : s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "/" + m[2] + "/" + m[1].slice(-2) : String(s == null ? "" : s); },
    today: () => "2026-11-18",
    tgRelayUrl: () => "https://worker.test",
    fetch: () => Promise.reject(new Error("no network in test")),
    AbortSignal: globalThis.AbortSignal,
    Date, Math, Number, String, Array, JSON, Intl, console
  });
  vm.runInContext(appSrc + "\nthis.__x = __x;", ctx);
  return ctx.__x;
}
const A = appCtx();

assert.equal(A.trkMoney(27760, "PKR"), "PKR 27,760");
assert.equal(A.trkNextText({ every: 5, lastCheckAt: Date.now() - 2 * 60000 }), "3 min baad");
assert.equal(A.trkNextText({ every: 5, lastCheckAt: Date.now() - 9 * 60000 }), "aglay minute");
assert.equal(A.trkNextText({ paused: true }), "paused");
assert.equal(A.trkNextText({ every: 5, lastCheckAt: 0 }), "abhi");
assert.equal(A.trkAgoText(0), "kabhi nahi");
assert.equal(A.trkAgoText(Date.now() - 30 * 1000), "abhi");
assert.equal(A.trkAgoText(Date.now() - 5 * 60000), "5 min pehle");
assert.equal(A.trkAgoText(Date.now() - 3 * 3600 * 1000), "3 ghante pehle");

/* sparkline: 2+ points chahiye */
assert.equal(A.trkSpark({ history: [] }), "");
assert.equal(A.trkSpark({ history: [{ amount: 100 }] }), "");
const spark = A.trkSpark({ history: [{ amount: 50000 }, { amount: 45000 }, { amount: 40000 }] });
assert.ok(spark.indexOf("<svg") === 0, "spark svg");
assert.ok(spark.indexOf("var(--green)") > 0, "falling line = green");
const sparkUp = A.trkSpark({ history: [{ amount: 40000 }, { amount: 50000 }] });
assert.ok(sparkUp.indexOf("var(--red)") > 0, "rising line = red");

/* "kab tak" text — aaj/kal/date tareen, timezone-independent checks */
{
  const d = new Date(); d.setHours(10, 30, 0, 0);
  const iso = A.trkLocalDateIso(d.getTime());
  const want = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  assert.equal(iso, want, "local date iso: " + iso);
}
{
  const tonight = new Date(); tonight.setHours(23, 59, 59, 0);
  const lbl = A.trkUntilText(tonight.getTime());
  assert.ok(lbl.indexOf("aaj") === 0, "tonight = aaj: " + lbl);
  assert.ok(/[ap]m$/.test(lbl), "has am/pm: " + lbl);
}
{
  const tom = new Date(); tom.setDate(tom.getDate() + 1); tom.setHours(21, 0, 0, 0);
  const lbl = A.trkUntilText(tom.getTime());
  assert.ok(lbl.indexOf("kal") === 0, "tomorrow = kal: " + lbl);
}
{
  const far = new Date(); far.setDate(far.getDate() + 10); far.setHours(9, 30, 0, 0);
  const lbl = A.trkUntilText(far.getTime());
  assert.ok(lbl.indexOf("aaj") !== 0 && lbl.indexOf("kal") !== 0, "far = date form: " + lbl);
}

/* v3.25 plan hint + row */
{
  const p1 = A.trkPlanText(30, 0, "");
  assert.ok(p1.includes("~48 checks") && p1.includes("band na karein"), p1);
  const p2 = A.trkPlanText(5, Date.now() + 3 * 86400000, "2026-11-20");
  assert.ok(p2.includes("~288 checks") && p2.includes("budget"), p2);
  assert.ok(p2.includes("flight ki date ke baad"), "warns when until > departure: " + p2);
  const row = A.trackerRow({ id: "x", origin: "KHI", destination: "UET", departure: "2026-12-14", every: 30,
    until: Date.now() + 2 * 3600000, last: { amount: 20300, currency: "PKR" },
    history: [{ amount: 22000 }, { amount: 19800 }, { amount: 20300 }] });
  assert.ok(row.includes("trk-row expiring"), "ending within 6h is highlighted");
  assert.ok(row.includes("low PKR 19,800"), "lowest seen price chip");
}

/* ---------- 2. worker-side tracker engine ---------- */
wsrc = wsrc.replace("export class WatchIndex", "class WatchIndex").replace("export default", "const worker =");

/* fake KV */
function makeKV() {
  const store = new Map();
  return {
    store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
    async list(o) {
      const prefix = (o && o.prefix) || "";
      const keys = [...store.keys()].filter(k => k.indexOf(prefix) === 0).map(name => ({ name }));
      return { keys, list_complete: true };
    }
  };
}
/* fake Durable Object backing (track index + remind store) */
function makeDO() {
  const storage = new Map();
  let chain = Promise.resolve();
  const j = (o) => ({ ok: true, json: async () => o });
  const handler = async (body) => {
    if (body.action === "track-add") { storage.set(body.key, true); return { ok: true }; }
    if (body.action === "track-remove") { storage.delete(body.key); return { ok: true }; }
    if (body.action === "track-list") {
      return [...storage.keys()].filter(k => k.indexOf("tr:") === 0);
    }
    if (body.action === "remind-add") {
      const r = body.payload && body.payload.reminder;
      if (!r || !r.id) return { ok: false };
      storage.set("r:" + r.id, r);
      return { ok: true };
    }
    if (body.action === "remind-list") {
      return [...storage.entries()].filter(([k]) => k.indexOf("r:") === 0).map(([, v]) => v);
    }
    if (body.action === "remind-remove") { storage.delete("r:" + (body.payload && body.payload.id)); return { ok: true }; }
    return { ok: true };
  };
  return {
    storage,
    idFromName: (n) => n,
    get() {
      return {
        fetch: (url, init) => {
          const body = JSON.parse(init.body);
          const run = chain.then(() => handler(body));
          chain = run.catch(() => {});
          return run.then(j);
        }
      };
    }
  };
}

const sent = [];
const calls = [];
const env = {
  KV: makeKV(),
  WATCH_INDEX_DO: makeDO(),
  MEZ_DAILY_CAP: "4000",
  MEZ_USER: "u", MEZ_PASS: "p",
  __sent: sent
};

/* Meezab search ko replace karein — portal call nahi, deterministic jawab. */
const fakeSearch = `
globalThis.__searchCalls = [];
/* Test ke liye Telegram: network nahi, seedha __sent mein. */
async function notifyAll(env, html, extra, opts) {
  const chats = (opts && opts.only) || ["1", "2"];
  const failSet = globalThis.__failChats || [];
  const sent = chats.filter(c => failSet.indexOf(c) < 0), failed = chats.filter(c => failSet.indexOf(c) >= 0);
  if (sent.length) (env.__sent || globalThis.__sent || []).push(html);
  (globalThis.__deliveries = globalThis.__deliveries || []).push({ only: opts && opts.only, sent, failed });
  return { sent, failed, errors: failed.map(() => "timeout"), discord: null };
}
async function send(env, chat, html) { (env.__sent || globalThis.__sent || []).push(html); return true; }
async function mezRunSearch(env, q, opts) {
  globalThis.__searchCalls.push(q);
  const n = globalThis.__searchCalls.length;
  const price = globalThis.__nextPrices ? globalThis.__nextPrices.shift() : 50000 + n * 100;
  if (price === "fail") throw new Error("portal down");
  return {
    source: "Meezab Air", observed_at: new Date().toISOString(), complete: true, total: 1,
    trip: { type: q.trip_type, cabin: q.cabin, legs: [] },
    pax: { adults: q.adults, children: q.children, infants: q.infants },
    fares: [{
      amount: price, currency: "PKR", airline: "Airblue", airline_code: "PA",
      departure: "2026-12-14T08:00:00", arrival: "2026-12-14T10:00:00",
      stops: 0, seats: 4, baggage: "25KG-25KG",
      segments: [{ flight: "PA401", from: "KHI", to: "UET", departure: "2026-12-14T08:00:00" }],
      legs: [{ segments: [{ flight: "PA401", from: "KHI", to: "UET", departure: "2026-12-14T08:00:00" }] }]
    }]
  };
}
`;

const EXPORTS = ["trackApi", "trackCheck", "trackList", "trackSave", "trackDelete", "checkTrackers",
  "trackPick", "trackQuery", "trackTitle", "trackFlightLabel", "trackText", "remindApi",
  "mezQuery", "notifyAll", "readReminds"];
const fn = new Function(
  wsrc.replace("async function mezRunSearch(", "async function __unused_mezRunSearch(") + "\n" + fakeSearch +
  "\nreturn {" + EXPORTS.join(", ") + "};");
const W = fn();

/* trackPick — cheapest + flight filter */
const fares = [
  { amount: 50000, segments: [{ flight: "PA401" }], legs: [{ segments: [{ flight: "PA401" }] }] },
  { amount: 42000, segments: [{ flight: "EK601" }], legs: [{ segments: [{ flight: "EK601" }] }] },
  { amount: 0, segments: [{ flight: "XX1" }], legs: [{ segments: [{ flight: "XX1" }] }] }
];
assert.equal(W.trackPick(fares).amount, 42000, "cheapest overall");
assert.equal(W.trackPick(fares, "PA401").amount, 50000, "flight filter");
assert.equal(W.trackPick(fares, "pa 401").amount, 50000, "flight filter ignores spaces/case");
assert.equal(W.trackPick(fares, "NOPE"), null, "unknown flight = null");
assert.equal(W.trackPick([{ amount: 0 }]), null, "all zero = null");
assert.equal(W.trackFlightLabel(fares[0]), "PA401");
assert.equal(W.trackFlightLabel(null), "");

/* trackQuery shape */
const tq = W.trackQuery({ origin: "KHI", destination: "UET", departure: "2026-12-14",
  trip_type: "oneway", adults: 1, children: 0, infants_on_lap: 0, infants_in_seat: 0 });
assert.equal(tq.origin, "KHI");
assert.equal(tq.trip_type, "oneway");
assert.equal(tq.return_date, undefined, "oneway has no return date");
const tqR = W.trackQuery({ origin: "KHI", destination: "UET", departure: "2026-12-14",
  trip_type: "round", return_date: "2026-12-20", adults: 2 });
assert.equal(tqR.return_date, "2026-12-20");
assert.equal(tqR.adults, 2);

/* API: save -> list -> check -> pause -> remove */
function post(body) {
  return W.trackApi(new Request("https://worker.test/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://abtravels.github.io" },
    body: JSON.stringify(body)
  }), env, {});
}
async function json(r) { return JSON.parse(await r.text()); }

const saved = await json(await post({ action: "save", check: false,
  tracker: { origin: "KHI", destination: "UET", departure: "2026-12-14", every: 5, target: 45000, flight: "PA401" } }));
assert.equal(saved.ok, true, JSON.stringify(saved));
assert.ok(saved.tracker.id, "id assigned");
assert.equal(saved.tracker.every, 5);
assert.equal(saved.tracker.target, 45000);
assert.equal(saved.tracker.paused, false);
console.log("saved tracker:", saved.tracker.id, saved.tracker.origin, saved.tracker.destination);

/* every 1 min is clamped to the 5 min floor */
const fast = await json(await post({ action: "save", check: false,
  tracker: { origin: "LHE", destination: "DXB", departure: "2026-12-15", every: 1 } }));
assert.equal(fast.tracker.every, 5, "min interval enforced");

/* duplicate route rejected */
const dupe = await post({ action: "save", check: false,
  tracker: { origin: "KHI", destination: "UET", departure: "2026-12-14", flight: "PA401" } });
assert.equal(dupe.status, 409, "duplicate route blocked");

/* bad route rejected */
const badRoute = await post({ action: "save", check: false,
  tracker: { origin: "KHI", destination: "KHI", departure: "2026-12-14" } });
assert.equal(badRoute.status, 400, "same origin/destination rejected");

/* bad date rejected */
const badDate = await post({ action: "save", check: false,
  tracker: { origin: "KHI", destination: "UET", departure: "2020-01-01" } });
assert.equal(badDate.status, 400, "past date rejected");

/* list */
const listed = await json(await post({ action: "list" }));
assert.equal(listed.ok, true);
assert.equal(listed.trackers.length, 2, "two trackers listed: " + listed.trackers.length);
assert.equal(listed.every_min, 5);
assert.equal(listed.max, 12);
assert.ok(listed.budget && listed.budget.cap > 0, "budget surfaced");

/* check: baseline alert (first price) */
const checked = await json(await post({ action: "check", id: saved.tracker.id }));
assert.equal(checked.ok, true, JSON.stringify(checked));
assert.ok(checked.tracker.last.amount > 0, "price recorded");
assert.equal(checked.tracker.last.flight, "PA401");
assert.ok(checked.tracker.history.length === 1, "history appended");
const afterCheck = env.__sent.slice();
assert.ok(afterCheck.some(m => m.indexOf("Tracking on") > 0 || m.indexOf("Price") > 0 || m.indexOf("✈️") > 0),
  "baseline notification sent: " + JSON.stringify(afterCheck));

/* checkTrackers respects interval (thori der pehle check hua) */
globalThis.__searchCalls.length = 0;
env.__sent.length = 0;
await W.checkTrackers(env);
assert.ok(globalThis.__searchCalls.every(q => q.origin !== "KHI"),
  "checked KHI again inside its 5-min window: " + globalThis.__searchCalls.map(q => q.origin).join(","));
assert.ok(globalThis.__searchCalls.length <= 2, "at most TRACK_PER_TICK per tick");

/* pause blocks the cron */
await post({ action: "pause", id: saved.tracker.id, paused: true });
const pausedList = await json(await post({ action: "list" }));
assert.equal(pausedList.trackers.filter(x => x.id === saved.tracker.id)[0].paused, true, "paused saved");
env.__sent.length = 0;
env.KV.store.set("tr:" + fast.tracker.id, JSON.stringify(Object.assign({}, fast.tracker, { lastCheckAt: 0 })));
env.KV.store.set("tr:" + saved.tracker.id, JSON.stringify(Object.assign({}, pausedList.trackers.filter(x => x.id === saved.tracker.id)[0], { lastCheckAt: 0 })));
await W.checkTrackers(env);
const checkedIds = globalThis.__searchCalls.map(q => q.origin);
assert.ok(checkedIds.indexOf("KHI") >= 0 ? false : true, "paused KHI tracker must not be checked: " + checkedIds.join(","));

/* resume */
await post({ action: "pause", id: saved.tracker.id, paused: false });
const resumed = await json(await post({ action: "list" }));
assert.equal(resumed.trackers.filter(x => x.id === saved.tracker.id)[0].paused, false, "resumed");

/* target hit -> alert text */
globalThis.__nextPrices = [44000];
env.__sent.length = 0;
const tHit = resumed.trackers.filter(x => x.id === saved.tracker.id)[0];
const hit = await W.trackCheck(env, tHit, {});
assert.equal(hit.last.amount, 44000);
assert.ok(env.__sent.some(m => m.indexOf("Target poora") > 0), "target alert: " + JSON.stringify(env.__sent));

/* drop > 3% -> alert (after cooldown) */
globalThis.__nextPrices = [40000];
env.__sent.length = 0;
tHit.lastAlertAt = 0;
const drop = await W.trackCheck(env, tHit, {});
assert.equal(drop.last.amount, 40000);
assert.ok(env.__sent.some(m => m.indexOf("Price gira") > 0), "drop alert: " + JSON.stringify(env.__sent));
assert.equal(drop.history.length, 3, "history grows");

/* v3.27: Rs 100 girawat par bhi foran alert (margin kam he) */
globalThis.__nextPrices = [39900];
env.__sent.length = 0;
tHit.lastAlertAt = Date.now() - 60000;   /* 1 min pehle alert — koi cooldown nahi */
await W.trackCheck(env, tHit, {});
assert.ok(env.__sent.some(m => m.indexOf("Price gira") > 0 && m.indexOf("100 sasta") > 0), "Rs 100 drop alerts: " + JSON.stringify(env.__sent));

/* price wahi rahe ya barhe — chup */
globalThis.__nextPrices = [39900, 40500];
env.__sent.length = 0;
await W.trackCheck(env, tHit, {});
await W.trackCheck(env, tHit, {});
assert.equal(env.__sent.length, 0, "same / higher price stays quiet: " + JSON.stringify(env.__sent));

/* asli case — 28,173 -> 27,090 -> 26,990 (Rs 100) -> 27,500 (upar) -> 27,400 (Rs 100 neeche) */
{
  const live = { id: "live", origin: "ISB", destination: "KHI", departure: "2026-11-20", every: 5,
    flight: "PA401", history: [{ at: Date.now() - 600000, amount: 28173.36 }], createdAt: Date.now(),
    last: { amount: 28173.36, currency: "PKR" }, lastAlertAt: Date.now() - 30 * 60000, lastAlertAmount: 28173.36 };
  const steps = [[27089.76, true], [26989.76, true], [26989.76, false], [27500, false], [27400, true]];
  for (const [price, want] of steps) {
    globalThis.__nextPrices = [price];
    env.__sent.length = 0;
    await W.trackCheck(env, live, {});
    const got = env.__sent.some(m => m.indexOf("Price gira") > 0);
    assert.equal(got, want, "price " + price + " alert=" + want + ": " + JSON.stringify(env.__sent));
  }
  /* "tracking shuru se" line — sab se zyada price se kitna kam */
  globalThis.__nextPrices = [26000];
  env.__sent.length = 0;
  await W.trackCheck(env, live, {});
  assert.ok(env.__sent.some(m => m.indexOf("Tracking shuru se") > 0 && m.indexOf("2,173") > 0), "from-start saving line: " + JSON.stringify(env.__sent));
  await W.trackDelete(env, live.id);
}

/* Telegram ek chat par timeout -> pendingAlert, cron sirf usi chat ko dobara bhejta he (bina search) */
{
  const KV2 = makeKV(), DO2 = makeDO();
  const env2 = { KV: KV2, WATCH_INDEX_DO: DO2, MEZ_DAILY_CAP: "4000", __sent: [] };
  const tr = { id: "retry1", origin: "ISB", destination: "KHI", departure: "2026-11-20", every: 60,
    history: [], createdAt: Date.now(), last: { amount: 30000, currency: "PKR" },
    lastAlertAt: Date.now() - 30 * 60000, lastAlertAmount: 30000 };
  globalThis.__failChats = ["2"];
  globalThis.__nextPrices = [28000];
  await W.trackCheck(env2, tr, {});
  assert.ok(tr.pendingAlert && tr.pendingAlert.only.join() === "2", "failed chat queued: " + JSON.stringify(tr.pendingAlert));
  assert.equal(tr.lastNotify.failed, 1);
  assert.equal(tr.lastNotify.sent, 1);
  /* cron: Telegram ab theek — sirf chat 2 ko, koi search nahi */
  globalThis.__failChats = [];
  tr.pendingAlert.at = Date.now() - 60000;
  tr.lastCheckAt = Date.now();          /* abhi due nahi */
  KV2.store.set("tr:" + tr.id, JSON.stringify(tr));
  DO2.storage.set("tr:" + tr.id, true);
  const searchesBefore = globalThis.__searchCalls.length;
  globalThis.__deliveries = [];
  await W.checkTrackers(env2);
  const saved2 = JSON.parse(KV2.store.get("tr:" + tr.id));
  assert.equal(globalThis.__searchCalls.length, searchesBefore, "resend uses no Meezab search");
  assert.ok(globalThis.__deliveries.some(d => d.only && d.only.join() === "2" && d.sent.length === 1), "resent only to failed chat");
  assert.ok(!saved2.pendingAlert, "pending cleared after delivery");
  assert.equal(saved2.lastNotify.failed, 0);
  assert.equal(saved2.lastNotify.sent, 2, "total delivered counted");
  /* hamesha fail ho to 5 dafa ke baad chhor deta he */
  globalThis.__failChats = ["1", "2"];
  const tr3 = Object.assign({}, tr, { id: "retry3", pendingAlert: { html: "x", kind: "down", only: ["1"], tries: 5, at: 0 } });
  KV2.store.set("tr:" + tr3.id, JSON.stringify(tr3));
  DO2.storage.set("tr:" + tr3.id, true);
  await W.checkTrackers(env2);
  assert.ok(!JSON.parse(KV2.store.get("tr:" + tr3.id)).pendingAlert, "gives up after TRACK_RESEND_TRIES");
  globalThis.__failChats = [];
}

/* search failure is recorded, cron never throws */
globalThis.__nextPrices = ["fail", "fail"];
const failEnv = env;
const failed = await json(await post({ action: "list" }));
assert.equal(failed.ok, true, "api still healthy after failure");
await W.checkTrackers(failEnv).catch(() => assert.fail("checkTrackers must never throw"));

/* remove */
const rm = await json(await post({ action: "remove", id: fast.tracker.id }));
assert.equal(rm.ok, true);
const after = await json(await post({ action: "list" }));
assert.equal(after.trackers.length, 1, "one tracker left");
assert.ok(!env.KV.store.has("tr:" + fast.tracker.id), "KV key deleted");

/* "Kab tak" — until store, 60 din ka cap, past waqt reject */
const withUntil = await json(await post({ action: "save", check: false,
  tracker: { origin: "ISB", destination: "DXB", departure: "2026-12-18", every: 30,
             until: Date.now() + 3 * 3600 * 1000 } }));
assert.ok(withUntil.tracker.until > Date.now(), "until stored");
const farUntil = await json(await post({ action: "save", check: false,
  tracker: { origin: "ISB", destination: "RUH", departure: "2026-12-19",
             until: Date.now() + 90 * 24 * 3600 * 1000 } }));
assert.ok(farUntil.tracker.until <= Date.now() + 60 * 24 * 3600 * 1000 + 60000, "capped at 60 din");
const pastUntil = await post({ action: "save", check: false,
  tracker: { origin: "ISB", destination: "BLR", departure: "2026-12-20",
             until: Date.now() - 60000 } });
assert.equal(pastUntil.status, 400, "past until rejected");

/* alert text mein "band" waqt nazar aaye */
{
  const bandText = W.trackText({ origin: "KHI", destination: "UET", departure: "2026-12-14",
    every: 30, until: Date.now() + 3600000, last: { currency: "PKR" } }, 40000, 50000, "down");
  assert.ok(bandText.indexOf("band") > 0, "until shown in alert: " + bandText);
}

/* "kb tak" guzar jaye to cron tracker apne aap delete kar deta he */
{
  const expTrk = { id: "test-exp", origin: "LHE", destination: "DXB", departure: "2026-12-21",
    every: 30, until: Date.now() - 60000, lastCheckAt: 0, history: [], createdAt: Date.now() };
  env.KV.store.set("tr:" + expTrk.id, JSON.stringify(expTrk));
  env.WATCH_INDEX_DO.storage.set("tr:" + expTrk.id, true);
  await W.checkTrackers(env).catch(() => assert.fail("checkTrackers must never throw"));
  assert.ok(!env.KV.store.has("tr:" + expTrk.id), "expired tracker removed from KV");
  assert.ok(!env.WATCH_INDEX_DO.storage.has("tr:" + expTrk.id), "expired tracker removed from index");
}

/* origin gate */
const blocked = await W.trackApi(new Request("https://worker.test/track", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
  body: JSON.stringify({ action: "list" })
}), env, {});
assert.equal(blocked.status, 403, "foreign origin rejected");

/* max trackers */
env.KV.store.clear();
await W.trackApi(new Request("https://worker.test/track", { method: "POST",
  headers: { "Content-Type": "application/json", Origin: "https://abtravels.github.io" },
  body: JSON.stringify({ action: "save", check: false, tracker: { origin: "KHI", destination: "DXB", departure: "2026-12-20" } })
}), env, {});
const manyEnv = env;
const many = await json(await W.trackApi(new Request("https://worker.test/track", { method: "POST",
  headers: { "Content-Type": "application/json", Origin: "https://abtravels.github.io" },
  body: JSON.stringify({ action: "list" }) }), manyEnv, {}));
assert.equal(many.trackers.length, 1, "reset list");

/* ---------- 3. /remind API (worker ka reminder store) ---------- */
const REMENV = { KV: makeKV(), WATCH_INDEX_DO: makeDO(), __sent: [] };
function remindPost(body) {
  return W.remindApi(new Request("https://worker.test/remind", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://abtravels.github.io" },
    body: JSON.stringify(body)
  }), REMENV, {});
}
/* App PKT (UTC+5) mein waqt bhejti he — wohi shape yahan bhi. */
function pktStamp(ms) {
  return new Date(ms + 5 * 3600 * 1000).toISOString().slice(0, 16);
}
const at = pktStamp(Date.now() + 6 * 3600 * 1000);
const rem = await json(await remindPost({ action: "add", text: "⏰ Booking expire · Usama", at: at, lead: "60,30" }));
assert.equal(rem.ok, true, JSON.stringify(rem));
assert.ok(rem.reminder.id, "reminder id");
assert.equal(rem.reminder.slots.length, 2, "60 + 30 min slots");
assert.equal(rem.reminder.slots[0].lead, 60);
assert.equal(rem.reminder.slots[1].lead, 30);
assert.ok(rem.reminder.slots[0].at < rem.reminder.slots[1].at, "60-min slot fires first");

const remList = await json(await remindPost({ action: "list" }));
assert.equal(remList.reminders.length, 1, "reminder listed");

const badAt = await remindPost({ action: "add", text: "x", at: "not-a-date" });
assert.equal(badAt.status, 400, "bad time rejected");
const pastAt = await remindPost({ action: "add", text: "x", at: "2020-01-01T10:00" });
assert.equal(pastAt.status, 400, "past time rejected");

const remRm = await json(await remindPost({ action: "remove", id: rem.reminder.id }));
assert.equal(remRm.ok, true);
const remLeft = await json(await remindPost({ action: "list" }));
assert.equal(remLeft.reminders.length, 0, "reminder removed");

const blockedRem = await W.remindApi(new Request("https://worker.test/remind", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
  body: JSON.stringify({ action: "list" })
}), REMENV, {});
assert.equal(blockedRem.status, 403, "remind origin gate");

/* ---------- 4. wiring ---------- */
assert.ok(fs.readFileSync(ROOT + "/pricebot-worker.js", "utf8").indexOf('if (path === "/track")') > 0, "/track route");
assert.ok(fs.readFileSync(ROOT + "/pricebot-worker.js", "utf8").indexOf('if (path === "/remind")') > 0, "/remind route");
assert.ok(fs.readFileSync(ROOT + "/pricebot-worker.js", "utf8").indexOf("checkTrackers(env)") > 0, "cron wired");
assert.ok(wsrc.indexOf("Kab tak") > 0, "worker 'kab tak' expiry logic");
assert.ok(html.indexOf('data-tab="tracker"') > 0, "nav entry (tracker alag tab)");
assert.ok(html.indexOf("viewTracker()") > 0, "render wired");
assert.ok(html.indexOf("Kab tak track karein?") > 0, "'kb tak' field in tracker form");
assert.ok(html.indexOf("Track this flight price") > 0, "fare card track button label");
/* v3.27: plane button (header + bottom bar) -> 3 options menu */
assert.ok(/bf\.addEventListener\("click"[\s\S]{0,120}flyMenuOpen\(bf\)/.test(html), "header plane opens menu");
assert.ok(/bn\.addEventListener\("click"[\s\S]{0,120}flyMenuOpen\(bn\)[\s\S]{0,20}\}, true\)/.test(html), "bottom plane opens menu (capture)");
for (const k of ['data-fly="fares"', 'data-fly="tracker"', 'data-fly="alerts"']) assert.ok(html.indexOf(k) > 0, "menu option " + k);
assert.ok(html.indexOf('id="bkExpCardEl"') > 0, "alerts option scroll target");
assert.ok(wsrc.indexOf("TRACK_ALERT_GAP") < 0, "no drop-alert cooldown left");
/* Reminders Price Tracker tab mein hain (v3.23) — sale form / row menu mein nahi. */
assert.ok(html.indexOf('id="tkExpDate"') < 0, "sale form par expiry field nahi");
assert.ok(html.indexOf("tkEditExpiry") < 0, "row menu se expiry item nahi");
assert.ok(html.indexOf("html += bkExpCard();") > html.indexOf("function viewTracker(){"), "reminders tracker tab par");

console.log("\nall tracker checks passed");
