"""Profit trend chart and form-label checks (v3.30).

The chart follows the dataviz method: pick the form first (a trend over time is
a line, not a bar chart), give a single series one hue, and validate the palette
instead of eyeballing it. The monthly table stays underneath as the readable
data source, so the chart never becomes the only way to reach a number.
"""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TrendAndLabelChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_chart_helpers_exist(self):
        self.assertIn("function profitTrendSVG(mids){", self.html)
        self.assertIn("function trendShortMoney(v){", self.html)
        # A lone month is not a trend; the stat tile already carries it.
        self.assertIn("if(!mids || mids.length < 2) return \"\";", self.html)

    def test_chart_is_wired_into_the_summary(self):
        self.assertIn("var trend = profitTrendSVG(showMids);", self.html)
        self.assertIn("Net profit per month", self.html)
        # The table must survive: it is the accessible data source.
        self.assertIn("html += '<table><tr><th>'+esc(T(\"thm\"))", self.html)

    def test_mark_specs(self):
        self.assertIn('stroke-width="2" stroke-linejoin="round" stroke-linecap="round"', self.html)
        self.assertIn('r="4.5"', self.html)
        self.assertIn('stroke="var(--card)" stroke-width="2"', self.html)
        self.assertIn('opacity="0.10"', self.html)
        self.assertNotIn("stroke-dasharray", self.html)

    def test_palette_tokens_for_every_theme(self):
        # Validated with the dataviz validator: light on #ffffff, dark on
        # #121c2c and OLED on #0b0b0e. The app's own --blue (#60a5fa) failed
        # the dark lightness band, so the chart carries its own token.
        self.assertIn("--trend-series:#2563eb;", self.html)
        self.assertEqual(self.html.count("--trend-series:#3b82f6;"), 2)

    def test_chart_is_accessible(self):
        self.assertIn('role="img"', self.html)
        self.assertIn("<title>Net profit per month</title>", self.html)
        self.assertIn("<desc>", self.html)

    def test_form_controls_have_names(self):
        for frag in (
            '<label for="tkDate">',
            '<label for="tkKind">',
            '<label for="tkPaid">',
            '<label for="tkPayMethod">',
            '<label for="tkAdvDate">',
            '<label for="tkPersons">',
            '<label for="tkMonthFilter">',
            '<label for="repMonth"',
            '<label for="setSearch">',
            '<label for="setIgnavProxy"',
            '<label for="setIgnavKey"',
            'aria-label="Income amount (Rs)"',
            'aria-label="Expense amount (Rs)"',
            'aria-label="Charity amount (Rs)"',
            'aria-label="Month"',
        ):
            self.assertIn(frag, self.html)

    def test_every_static_label_resolves(self):
        import re
        ids = set(re.findall(r'\bid="([A-Za-z0-9_]+)"', self.html))
        dangling = [m for m in re.findall(r'<label for="([A-Za-z0-9_]+)"', self.html) if m not in ids]
        self.assertEqual(dangling, [], "label[for] must point at a real control")

    def test_arithmetic_and_specs_when_node_is_available(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node is not on PATH")
        run = subprocess.run(
            [node, str(ROOT / "tests" / "trend_checks.mjs")],
            capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(run.returncode, 0, run.stderr or run.stdout)


if __name__ == "__main__":
    unittest.main()
