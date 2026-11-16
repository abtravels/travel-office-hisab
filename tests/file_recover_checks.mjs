/* Orphan ticket-file recovery checks (v2.92) — fake GitHub folder listing.
   Agar metadata kho jaye (purane version ka pull), PDF repo ke tickets/
   folder mein hoti he — ab list wahan se khud repair hoti he. */
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

const src = grab("function fileTypeOf(", "function fileRefreshList(");
const S = { __ts: 1, fileTickets: [], fileTombstones: [], clients: [], tickets: [], invoices: [] };
let saved = 0;
const ctx = vm.createContext({
  S,
  Date,
  JSON,
  console,
  githubSyncConfigured: () => true,
  saveLocal: () => { saved++; },
  fileUid: () => "newid",
  fileGuess: (name) => ({ client: "", pnr: String(name).replace(/\.[^.]+$/, "") }),
  ghApi: () => Promise.resolve([
    { type: "file", name: "20261116-vevg5g-1TZQRZ.pdf", path: "tickets/20261116-vevg5g-1TZQRZ.pdf", size: 12345, sha: "s1" },
    { type: "file", name: "20261110-abc123-OLD.pdf", path: "tickets/20261110-abc123-OLD.pdf", size: 1, sha: "s2" },
    { type: "file", name: "20261101-zzz999-DEL.pdf", path: "tickets/20261101-zzz999-DEL.pdf", size: 1, sha: "s3" },
    { type: "dir", name: "sub", path: "tickets/sub" },
    { type: "file", name: "notes.txt", path: "tickets/notes.txt", size: 1, sha: "s4" }
  ])
});
vm.runInContext(src, ctx);

S.fileTickets = [{ id: "keep", name: "OLD.pdf", file: "tickets/20261110-abc123-OLD.pdf" }];
S.fileTombstones = [{ id: "dead", at: 1, file: "tickets/20261101-zzz999-DEL.pdf" }];

const added = await new Promise((res) => {
  ctx.__done = (n) => res(n);
  vm.runInContext("fileRecoverOrphans(function(n){ __done(n); })", ctx);
});
assert.equal(added, 1, "only the truly missing PDF is recovered");
assert.equal(S.fileTickets.length, 2);
const got = S.fileTickets[1];
assert.equal(got.name, "1TZQRZ.pdf", "stored prefix is stripped from the name");
assert.equal(got.file, "tickets/20261116-vevg5g-1TZQRZ.pdf");
assert.equal(got.pnr, "1TZQRZ");
assert.equal(got.type, "application/pdf");
assert.equal(got.size, 12345);
assert.equal(got.sha, "s1");
assert.equal(new Date(got.uploadedAt).getFullYear(), 2026);
assert.equal(saved, 1, "state saved once after recovery");

console.log("Orphan recovery checks passed: missing PDF re-added, existing/deleted/other files skipped.");
