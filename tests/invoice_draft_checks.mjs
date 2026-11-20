/* v3.36: invoice form ka draft (iPhone par app switch se form na ure) + Meezab API host.
   Run: node tests/invoice_draft_checks.mjs */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../pricebot-worker.js", import.meta.url), "utf8");
const a = html.indexOf('var INV_DRAFT_KEY = "ab_inv_draft";');
const b = html.indexOf("/* Form mein kuch bhi likha / badla jaye");
assert.ok(a > 0 && b > a, "draft helpers not found");

function field(id, value, o) { return Object.assign({ id, value, type: "text", tagName: "INPUT", checked: false, dispatchEvent() {} }, o || {}); }
function makeCtx(fields, now) {
  const store = new Map();
  const card = { querySelectorAll: () => fields };
  const ctx = vm.createContext({
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { querySelector: () => card, getElementById: (id) => fields.filter((f) => f.id === id)[0] || null },
    Date: { now: () => now.t }, JSON, Number, String, Object, Math, Event: function () {}, clearTimeout() {},
    invPaxCount: 3, invLinkId: "sale7", refreshDateDisplays() {}
  });
  vm.runInContext(html.slice(a, b), ctx);
  return { ctx, store };
}

const now = { t: 1_800_000_000_000 };
const fields = [
  field("invClient", "Usama Kh"), field("invPnr", "ab12cd"),
  field("invDate", "2026-11-20", { type: "date" }), field("invBag", "0", { type: "number" }),
  field("invTrip", "round", { tagName: "SELECT", type: "select-one" }),
  field("invTmp", "on", { type: "checkbox", checked: true }),
  field("clScan", "C:\\fake.jpg", { type: "file" }), field("", "no id")
];
const { ctx, store } = makeCtx(fields, now);

ctx.invDraftSave();
const saved = JSON.parse(store.get("ab_inv_draft"));
assert.equal(saved.f.invClient, "Usama Kh");
assert.equal(saved.f.invTmp, true, "checkbox state kept");
assert.equal(saved.f.invTrip, "round");
assert.equal(saved.pax, 3, "passenger count kept");
assert.equal(saved.link, "sale7");
assert.ok(!("clScan" in saved.f), "file inputs are never stored");

/* wapas aane par wohi values */
fields[0].value = ""; fields[1].value = ""; fields[5].checked = false; fields[4].value = "one";
ctx.invDraftApply(ctx.invDraftRead());
assert.equal(fields[0].value, "Usama Kh");
assert.equal(fields[1].value, "ab12cd");
assert.equal(fields[5].checked, true);
assert.equal(fields[4].value, "round");

/* 12 ghante purana draft nahi aata */
now.t += 12 * 3600000 + 1000;
assert.equal(ctx.invDraftRead(), null, "stale draft ignored");
now.t -= 12 * 3600000 + 1000;

/* Sirf default (date / number / dropdown) = draft nahi */
const blank = [field("invClient", "  "), field("invDate", "2026-11-20", { type: "date" }), field("invBag", "0", { type: "number" }),
  field("invTrip", "one", { tagName: "SELECT" })];
const c2 = makeCtx(blank, now);
c2.ctx.invDraftSave();
assert.equal(c2.store.has("ab_inv_draft"), false, "untouched form makes no draft");

/* Generate / Close ke baad draft khatam aur dobara khud na bane */
ctx.invDraftClear();
assert.equal(store.has("ab_inv_draft"), false);
ctx.invDraftSave();
assert.equal(store.has("ab_inv_draft"), false, "no re-save until the user types again");

/* wiring */
assert.ok(/lastInv = d;\s*invDraftClear\(\);/.test(html), "generate clears the draft");
assert.ok(/document\.addEventListener\("visibilitychange", function\(\)\{ if\(document\.hidden\) invDraftSave\(\); \}\);/.test(html), "saved when the app goes to the background");
assert.ok(html.includes('window.addEventListener("pagehide", function(){ invDraftSave(); });'), "saved on pagehide (iOS)");
assert.ok(html.includes('if(!typing) syncPull(function(){ if(currentTab !== "invoice") render(); });'), "coming back does not rebuild the invoice tab");
assert.ok(/var d = invDraftRead\(\);\s*if\(!d \|\| Date\.now\(\) - Number\(d\.at\) > 15 \* 60000\) return;\s*switchTab\("invoice"\);/.test(html), "a fresh draft reopens the invoice tab after an iOS reload");
assert.ok(html.includes('id="invDraftReset"'), "manual clear button");

/* Meezab: API ab portal ke domain par (purana host 526 deta tha) */
assert.ok(worker.includes('const MEZ_BASE = "https://b2b.meezabair.com.pk/b2b_api/api/MiddleWare/";'), "Meezab base follows the portal's BackendApiRoute");
assert.ok(!/fetch\([^)]*testb2bapi/.test(worker) && !/MEZ_BASE = "https:\/\/testb2bapi/.test(worker), "old API host is not used");

console.log("Invoice draft checks passed (save/restore, pax + link, stale ignored, cleared on generate, iOS reload reopens invoice; Meezab base)");
