/* Profit trend chart + form labels (v3.30).
   Run: node tests/trend_checks.mjs
   Chart specs come from the dataviz method: form first (trend -> line),
   one hue, hairline solid grid, 2px line, dots with a 2px surface ring,
   labels only on the endpoint and the extremes. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

/* ---- helpers extracted from the app ---- */
const start = html.indexOf("function trendShortMoney(v){");
const end = html.indexOf("function viewDash(){");
assert.ok(start > 0 && end > start, "trend helpers not found");
const NETS = {};
const ctx = vm.createContext({
  esc: (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
  money: (n) => "Rs " + Math.round(Number(n) || 0).toLocaleString("en-PK"),
  monthLabel: (m) => { const p = m.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(p[1]) - 1] + " " + p[0]; },
  monthCalc: (mid) => ({ net: NETS[mid] || 0 }),
});
vm.runInContext(html.slice(start, end), ctx);
const { trendShortMoney, profitTrendSVG } = ctx;

/* compact axis labels — Pakistani units */
assert.equal(trendShortMoney(900), "900");
assert.equal(trendShortMoney(42000), "42k");
assert.equal(trendShortMoney(100000), "1L");
assert.equal(trendShortMoney(150000), "1.5L");
assert.equal(trendShortMoney(10000000), "1cr");
assert.equal(trendShortMoney(-12000), "\u221212k", "loss uses a real minus sign");

/* a single month is not a trend -> no chart (the stat tile already covers it) */
assert.equal(profitTrendSVG([]), "");
assert.equal(profitTrendSVG(["2026-03"]), "");

/* eight months, one of them a loss */
const mids = ["2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"];
const nets = [42000, 55000, -12000, 61000, 48000, 73000, 69000, 91000];
mids.forEach((m, i) => { NETS[m] = nets[i]; });
const svg = profitTrendSVG(mids);

assert.ok(svg.startsWith('<div class="trend-wrap">'), "wrapped for responsive sizing");
assert.ok(/role="img"/.test(svg), "chart is exposed as an image with a label");
assert.ok(/aria-label="Net profit Mar 2026 Rs 42,000 se Oct 2026 Rs 91,000 tak\."/.test(svg),
  "aria label summarises the trend for screen readers");
assert.ok(/viewBox="0 0 640 190"/.test(svg), "fixed viewBox scales to any width");

/* mark specs */
assert.ok(/stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/.test(svg), "line 2px round");
assert.ok(!/stroke-dasharray/.test(svg), "gridlines solid, never dashed");
const dots = svg.match(/<circle[^>]*>/g) || [];
assert.equal(dots.length, 8, "one dot per month at this count");
assert.ok(dots.every(d => /r="4\.5"/.test(d)), "markers >= 8px across");
assert.ok(dots.every(d => /stroke="var\(--card\)" stroke-width="2"/.test(d)), "2px surface ring on every dot");
assert.ok(/opacity="0\.10"/.test(svg), "area is a ~10% wash, not a saturated block");

/* one hue only — no categorical rainbow for a single series */
const hues = new Set((svg.match(/var\(--trend-series\)/g) || []));
assert.equal(hues.size, 1);
assert.ok(!/var\(--red\)|var\(--green\)|var\(--gold\)/.test(svg),
  "polarity is read from the zero line, not from a second colour");

/* zero baseline present so a loss reads as below the line */
assert.ok(/>0<\/text>/.test(svg), "zero tick labelled");
assert.ok(/\u221212k/.test(svg), "the loss month is directly labelled");
assert.ok(/91k/.test(svg), "the endpoint is directly labelled");

/* labels are sparing: 8 points must not carry 8 value labels */
const valueLabels = (svg.match(/font-weight="700"/g) || []).length;
assert.ok(valueLabels <= 3, "only endpoint + extremes labelled, got " + valueLabels);

/* every month still reachable as text (the table below the chart) */
assert.ok(html.includes("html += '<table><tr><th>'+esc(T(\"thm\"))"), "monthly table kept as the data source");

/* ---- palette tokens exist for all three themes ---- */
assert.ok(/--trend-series:#2563eb;/.test(html), "light series token");
assert.equal((html.match(/--trend-series:#3b82f6;/g) || []).length, 2, "dark + OLED series token");

/* ---- form labels ---- */
assert.ok(html.includes('<label for="tkDate">'), "date label paired");
assert.ok(html.includes('<label for="tkKind">'), "sale type label paired");
assert.ok(html.includes('<label for="tkPaid">'), "status label paired");
assert.ok(html.includes('<label for="tkPayMethod">'), "method label paired");
assert.ok(html.includes('<label for="tkAdvDate">'), "advance date label paired");
assert.ok(html.includes('<label for="\'+key+\'MonthFilter">'), "dynamic month filter label paired");
assert.ok(html.includes('aria-label="Income amount (Rs)"'), "placeholder-only input has a name");
assert.ok(html.includes('aria-label="Fixed expense name — '), "dynamic fixed-expense rows named");

/* no label may point at an id that does not exist */
const ids = new Set([...html.matchAll(/\bid="([A-Za-z0-9_]+)"/g)].map(m => m[1]));
const dynamic = [];
for (const m of html.matchAll(/<label for="([A-Za-z0-9_]+)"/g)) {
  if (!ids.has(m[1])) dynamic.push(m[1]);
}
assert.deepEqual(dynamic, [], "every static label[for] resolves to a real control id");

console.log("Trend + label checks passed (8 months, loss below zero, one hue, 3 labels, all controls named)");
