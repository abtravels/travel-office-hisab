/* syncPull behaviour checks (v2.92) — asli function, fake GitHub.
   Regression: PC par upload hui ticket file mobile par nahi aati thi, kyunki
   pull "local is newer" keh kar poora data chhor deta tha aur fileTickets
   last-writer-wins the. Ab files ka union hota he + tombstones. */
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

const src =
  grab("function mergeRecentFileTickets(", "function fileIdMap(") +
  grab("function fileIdMap(", "function doPush(") +
  grab("function syncPull(", "/* ===== Password-protected GitHub token setup link");

function b64(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}
function unb64(s) {
  return Buffer.from(String(s || "").replace(/\n/g, ""), "base64").toString("utf8");
}

function makeCtx(local, remote) {
  const state = { pushes: 0, syncPushes: 0, status: "", stored: null };
  const ctx = vm.createContext({
    S: local,
    KEY: "k",
    GH_SYNC_PATH: "HisabData.json",
    ghSyncSha: "sha1",
    selectedMonth: null,
    _monthAgg: null,
    Date,
    JSON,
    console,
    localStorage: {
      setItem: (k, v) => { state.stored = v; },
      getItem: () => state.stored
    },
    ghSyncBase64Decode: unb64,
    ghApi: () => Promise.resolve({ content: b64(remote), sha: "sha2" }),
    setSyncStatus: (m) => { state.status = String(m || ""); },
    doPush: () => { state.pushes++; },
    syncPush: () => { state.syncPushes++; },
    ensureSettings: () => {},
    mergeMissingAppData: () => {},
    migrateAutoQarza: () => {}
  });
  vm.runInContext(src, ctx);
  return { ctx, state, run: (code) => vm.runInContext(code, ctx) };
}

const f = (id, name, uploadedAt) => ({ id, name, file: "tickets/" + name, uploadedAt: uploadedAt || 1 });
const baseState = (files, ts, tombstones) => ({
  __ts: ts,
  settings: { githubPat: "ghp_fake", githubRepo: "abtravels/fake" },
  months: { "2026-11": {} },
  tickets: [],
  draws: [],
  receivables: [],
  bills: [],
  invoices: [],
  airlineIds: [],
  clients: [],
  waseem: [],
  charityPaid: [],
  qarzaPaid: [],
  qarzaPayments: [],
  fileTickets: files,
  fileTombstones: tombstones || []
});
const wait = () => new Promise((r) => setTimeout(r, 40));

async function pull(local, remote) {
  const { ctx, state, run } = makeCtx(local, remote);
  let cbOk = null;
  ctx.__cb = (ok) => { cbOk = ok; };
  run("syncPull(__cb)");
  await wait();
  return { state, run, S: run("S"), cbOk };
}

/* ---- A: local newer (mobile-jaise), remote mein nayi file — file aani chahiye + push ---- */
{
  const { state, S, cbOk } = await pull(
    baseState([f("loc", "local.pdf")], 5000),
    baseState([f("pc", "from-pc.pdf")], 1000)
  );
  assert.equal(JSON.stringify(S.fileTickets.map((x) => x.id)), '["loc","pc"]', "A: remote file must merge");
  assert.equal(state.pushes, 1, "A: merged list must be pushed back");
  assert.equal(cbOk, false);
  assert.ok(/ticket file/i.test(state.status), "A: status must mention the files");
}

/* ---- B: remote newer + local-only file — dono, aur union push ho ---- */
{
  const { state, S } = await pull(
    baseState([f("loc", "local.pdf")], 1000),
    baseState([f("pc", "from-pc.pdf")], 5000)
  );
  assert.equal(JSON.stringify(S.fileTickets.map((x) => x.id)), '["loc","pc"]', "B: both lists kept");
  assert.equal(state.syncPushes, 1, "B: local-only file pushed back");
  assert.equal(S.__ts, 5000, "B: remote state adopted");
}

/* ---- C: local ne delete kiya (tombstone) — remote wapas na laaye ---- */
{
  const { S } = await pull(
    baseState([f("loc", "local.pdf")], 5000, [{ id: "gone", at: 2 }]),
    baseState([f("gone", "deleted.pdf"), f("pc", "from-pc.pdf")], 1000)
  );
  assert.equal(JSON.stringify(S.fileTickets.map((x) => x.id)), '["loc","pc"]', "C: tombstoned file stays dead");
}

/* ---- D: doosre device ne delete kiya (remote tombstone) — local se bhi hat jaye ---- */
{
  const { S } = await pull(
    baseState([f("loc", "local.pdf"), f("x", "x.pdf")], 1000),
    baseState([f("pc", "from-pc.pdf")], 5000, [{ id: "x", at: 3 }])
  );
  assert.equal(JSON.stringify(S.fileTickets.map((x) => x.id)), '["loc","pc"]', "D: remote tombstone wins");
}

/* ---- E: dono taraf same list — bekaar union push na ho ---- */
{
  const { state } = await pull(
    baseState([f("loc", "local.pdf")], 1000),
    baseState([f("loc", "local.pdf")], 5000)
  );
  assert.equal(state.syncPushes, 0, "E: no needless push");
}

/* ---- F: source level guards ---- */
assert.ok(/fileMergeRemote\(data\.fileTickets\)/.test(html), "syncPull must merge remote ticket files");
assert.ok(/data\.fileTickets = fileUnionLists\(/.test(html), "pull must union both file lists");
assert.ok(/fileAddTombstone\(f\.id, f\.file\)/.test(html), "delete must record a tombstone");

console.log("syncPull checks passed: remote file merges even when local is newer, union push, tombstones both ways, no needless push.");
