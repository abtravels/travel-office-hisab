"""Change-sale checks: the previous-ticket adjustment must stay wired in (v3.13)."""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TicketChangeChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_helpers_exist(self):
        self.assertIn("function ticketAdj(t){", self.html)
        self.assertIn("function ticketNet(t){", self.html)
        self.assertIn("function ticketCost(t){", self.html)
        self.assertIn("function ticketProfit(t){", self.html)
        self.assertIn("return Math.max(0, ticketNet(t) - ticketPaidAmt(t));", self.html)

    def test_net_used_for_payables(self):
        # Client-facing balances use the net figure, so a refund credit can
        # never inflate receivables. The register shows the gross figures with a
        # small adjustment line underneath.
        self.assertIn("bakaya += Math.max(0, ticketNet(t) - tkPaid);", self.html)
        self.assertIn("ts += ticketNet(t);", self.html)
        self.assertIn("""data-adj="'+adjAmt+'">""", self.html)

    def test_profit_ignores_the_refund_credit(self):
        # The credit comes off the sale and off the supplier bill, so profit
        # stays sale - cost (effective cost = cost - adjustment).
        self.assertIn("b.profit += ticketProfit(t);", self.html)
        self.assertIn("tc += ticketCost(t);", self.html)
        self.assertIn("return ticketNet(t) - ticketCost(t);", self.html)
        self.assertIn("adj profit par asar nahi karta", self.html)

    def test_change_form_and_edit(self):
        self.assertIn('id="tkChangeBox"', self.html)
        self.assertIn('id="tkAdj"', self.html)
        self.assertIn('id="tkPrev"', self.html)
        self.assertIn('Previous Ticket Adj (Rs)', self.html)
        self.assertIn("adj:adj, prevId:prevId, prevRef:prevRef", self.html)
        self.assertIn("Previous Ticket Adj (Rs) — khali chhod dein to purana rahega:", self.html)

    def test_arithmetic_when_node_is_available(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node is not on PATH")
        run = subprocess.run(
            [node, str(ROOT / "tests" / "ticket_change_checks.mjs")],
            capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(run.returncode, 0, run.stderr or run.stdout)


if __name__ == "__main__":
    unittest.main()
