/* v3.29: theme har device ka apna + file chunte hi upload.
   Run: node tests/device_theme_upload_checks.mjs */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const a = html.indexOf('var THEME_KEY = "ab_theme";');
const b = html.indexOf("function ayatCard(){");
assert.ok(a > 0 && b > a, "theme helpers not found");

function device(initialSynced) {
  const store = new Map();
  const classes = new Set();
  const ctx = vm.createContext({
    S: { settings: { theme: initialSynced } },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    document: {
      body: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } },
      getElementById: () => null
    },
    render: () => {}
  });
  vm.runInContext(html.slice(a, b), ctx);
  return { ctx, store, classes };
}

/* Mobile aur PC dono ka purana synced value "light" tha */
const phone = device("light");
const pc = device("light");
assert.equal(phone.ctx.themeMode(), "light", "first load keeps the old synced value");
assert.equal(phone.store.get("ab_theme"), "light", "pinned on this device");

/* Mobile par OLED */
phone.ctx.themeSet("oled");
assert.equal(phone.ctx.themeMode(), "oled");
assert.ok(phone.classes.has("oled") && phone.classes.has("dark"));

/* Sync aaye aur synced setting kuch bhi ho — PC wahi rehta he */
pc.ctx.themeMode();
pc.ctx.S.settings.theme = "oled";
assert.equal(pc.ctx.themeMode(), "light", "PC is not changed by the phone");
phone.ctx.S.settings.theme = "light";
assert.equal(phone.ctx.themeMode(), "oled", "phone is not changed by synced data");

/* Theme ab S.settings mein likha hi nahi jata */
assert.ok(!/S\.settings\.theme\s*=/.test(html), "theme is no longer written to synced settings");
assert.ok(/var t=localStorage\.getItem\("ab_theme"\)/.test(html), "pre-paint script reads the device theme first");

/* File upload: chunte hi upload, alag Upload button nahi */
assert.ok(!/id="fileUpload"/.test(html), "separate Upload button removed");
const pick = html.slice(html.indexOf("function fileOnPick(input){"), html.indexOf("var fileUploading = false;"));
assert.ok(/fileUploadAll\(\);/.test(pick), "picking files starts the upload");
assert.ok(/if\(fileUploading\)/.test(html), "double upload is blocked");
assert.ok(/drop\.ondrop[\s\S]{0,300}fileOnPick\(input\)/.test(html), "drag and drop also uploads");

console.log("Device theme + auto-upload checks passed (per-device theme, sync does not override, pick = upload)");
