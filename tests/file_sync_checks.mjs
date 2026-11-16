/* Ticket-file sync checks (v2.92) — bina browser.
   index.html se union/tombstone helpers nikaal kar chalate hain, taake
   "PC par upload hui file mobile par na aaye" wala regression pakra jaye. */
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

const src = grab("function fileIdMap(", "function doPush(");
const S = { fileTickets: [], fileTombstones: [] };
const ctx = vm.createContext({ S: S, Date: Date });
vm.runInContext(src, ctx);
const run = (code) => vm.runInContext(code, ctx);

const f = (id, name) => ({ id, name, uploadedAt: 1 });

/* ---- union: remote ki nayi file local mein aati he, local-only bachi rehti he ---- */
const local = [f("a", "local.pdf")];
const remote = [f("b", "from-pc.pdf")];
const u1 = run(`fileUnionLists(${JSON.stringify(local)}, ${JSON.stringify(remote)}, [])`);
assert.equal(JSON.stringify(u1.map((x) => x.id)), '["a","b"]');
/* ---- duplicate id ek dafa ---- */
const u2 = run(`fileUnionLists(${JSON.stringify([f("a", "x")])}, ${JSON.stringify([f("a", "y")])}, [])`);
assert.equal(u2.length, 1);
assert.equal(u2[0].name, "x");

/* ---- tombstone: delete ki hui file wapas nahi aati (dono taraf se) ---- */
const u3 = run(`fileUnionLists(${JSON.stringify([f("a", "x")])}, ${JSON.stringify([f("a", "x"), f("b", "y")])}, ${JSON.stringify([{ id: "a", at: 1 }])})`);
assert.equal(JSON.stringify(u3.map((x) => x.id)), '["b"]');

/* ---- fileMergeRemote: S.fileTickets update + added count ---- */
S.fileTickets = [f("a", "local.pdf")];
S.fileTombstones = [];
assert.equal(run(`fileMergeRemote(${JSON.stringify([f("b", "pc.pdf")])})`), 1);
assert.equal(JSON.stringify(S.fileTickets.map((x) => x.id)), '["a","b"]');
assert.equal(run(`fileMergeRemote(${JSON.stringify([f("b", "pc.pdf")])})`), 0, "second merge must add nothing");

/* ---- tombstone merge: dedupe + last 300 ---- */
const tm = run(`fileTombstoneMerge(${JSON.stringify([{ id: "a", at: 1 }, { id: "a", at: 2 }])}, ${JSON.stringify([{ id: "b", at: 3 }])})`);
assert.equal(JSON.stringify(tm.map((x) => x.id)), '["a","b"]');
const many = Array.from({ length: 320 }, (_, i) => ({ id: "t" + i, at: i }));
const capped = run(`fileTombstoneMerge(${JSON.stringify(many)}, [])`);
assert.equal(capped.length, 300);
assert.equal(capped[capped.length - 1].id, "t319");

/* ---- fileAddTombstone: ek hi id do dafa nahi ---- */
S.fileTombstones = [];
run(`fileAddTombstone("z")`);
run(`fileAddTombstone("z")`);
assert.equal(S.fileTombstones.length, 1);
assert.equal(S.fileTombstones[0].id, "z");

/* ---- syncPull merge logic maujood he (source level) ---- */
assert.ok(/fileMergeRemote\(data\.fileTickets\)/.test(html), "syncPull must merge remote ticket files");
assert.ok(/data\.fileTickets = fileUnionLists\(/.test(html), "pull must union both file lists");
assert.ok(/fileAddTombstone\(f\.id\)/.test(html), "delete must record a tombstone");
assert.ok(/fileTombstones/.test(html), "state must carry tombstones");

console.log("Ticket-file sync checks passed: union, tombstones, merge counts, 300 cap.");
