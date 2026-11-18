import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const source = html.slice(html.indexOf("function tgRelayWhy("), html.indexOf("function tgSend("));
async function scenario(replies, ok) {
  const waits = [], recipients = [];
  const ctx = vm.createContext({
    AbortSignal, tgRelayUrl: () => "",
    setTimeout(fn, ms) { waits.push(ms); fn(); },
    async fetch(_, {body}) {
      recipients.push(JSON.parse(body).chats);
      assert.ok(replies.length);
      const [status, result] = replies.shift();
      return new Response(JSON.stringify(result), {status});
    }
  });
  const pending = vm.runInContext(source + '\ntgPost({chats:["1","2"]},0)', ctx);
  if(ok) assert.equal(await pending, true);
  else await assert.rejects(pending);
  assert.equal(replies.length, 0);
  return {waits, recipients};
}
const transient = [502,{sent:["1"],failed:["2"],errors:["Telegram sendMessage failed: 522"]}];
const timeout = [502,{sent:[],failed:["2"],errors:["The operation was aborted due to timeout"]}];
const recovered = await scenario([transient, timeout, [200,{ok:true}]], true);
assert.deepEqual(recovered.recipients, [["1","2"],["2"],["2"]]);
assert.deepEqual(recovered.waits, [15000,90000]);
assert.equal((await scenario(Array(4).fill(timeout), false)).waits.length, 3);
assert.deepEqual((await scenario([[403,{error:"origin"}]],false)).waits, []);
console.log("Telegram relay retry checks passed");
