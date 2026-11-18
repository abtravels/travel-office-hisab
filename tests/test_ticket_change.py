"""Change-sale checks: the previous-ticket adjustment must stay wired in (v3.12)."""
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
        self.assertIn("return Math.max(0, ticketNet(t) - ticketPaidAmt(t));", self.html)

    def test_net_used_for_money_maths(self):
        # Profit, pending balance, register totals and the sales row all use the
        # net figure, so a refund credit can never inflate profit or receivables.
        self.assertIn("b.profit += ticketNet(t) - (Number(t.cost)||0);", self.html)
        self.assertIn("bakaya += Math.max(0, ticketNet(t) - tkPaid);", self.html)
        self.assertIn("ts += ticketNet(t);", self.html)
        self.assertIn('data-sale="\'+netSale+\'"', self.html)

    def test_change_form_and_edit(self):
        self.assertIn('id="tkChangeBox"', self.html)
        self.assertIn('id="tkAdj"', self.html)
        self.assertIn('id="tkPrev"', self.html)
        self.assertIn('Previous Ticket Adjustment (Rs)', self.html)
        self.assertIn("adj:adj, prevId:prevId, prevRef:prevRef", self.html)
        self.assertIn("Previous Ticket Adjustment (Rs) — khali chhod dein to purana rahega:", self.html)

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
