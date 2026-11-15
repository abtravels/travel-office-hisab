"""Offline release checks; these do not create bookings or contact services."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ReleaseChecks(unittest.TestCase):
    def test_embedded_worker_matches_source(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        worker = (ROOT / "pricebot-worker.js").read_text(encoding="utf-8")
        match = re.search(r'var TELEGRAM_WORKER_CODE = ("(?:\\.|[^"\\])*");', html)
        self.assertIsNotNone(match, "Embedded Worker is missing")
        self.assertEqual(json.loads(match.group(1)).replace("\r\n", "\n"), worker.replace("\r\n", "\n"))

    def test_multicity_proxy_route(self):
        worker = (ROOT / "pricebot-worker.js").read_text(encoding="utf-8")
        self.assertIn('if (path === "/search") return proxyIgnav(request, env, "/fares/search", hdrs);', worker)

    def test_meezab_budget(self):
        worker = (ROOT / "pricebot-worker.js").read_text(encoding="utf-8")
        self.assertIn("MEZ_DAILY_CAP", worker)
        self.assertIn("const MEZ_CACHE_TTL = 600;", worker)
        self.assertIn('code: "budget"', worker)
        body = worker[worker.index("async function mezRunSearch("):worker.index("async function meezabSearch(")]
        self.assertIn("if (used >= cap) throw mezBudgetError(cap);", body)
        self.assertNotIn("used >= 60", body)
        # A unit is spent only after the portal accepted the search.
        self.assertGreater(body.index("await env.KV.put(budgetKey"), body.index("if (!state?.SearchID)"))


if __name__ == "__main__":
    unittest.main()
