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
        self.assertIn("""data-eff="'+effCost+'" data-profit="'+p+'">""", self.html)

    def test_profit_ignores_the_refund_credit(self):
        # The credit comes off the sale and off the supplier bill, so profit
        # stays sale - cost (effective cost = cost - adjustment).
        self.assertIn("b.profit += ticketProfit(t);", self.html)
        self.assertIn("tc += ticketCost(t);", self.html)
        # v3.25: cost ya sale 0 ho to profit gina hi nahi jata.
        self.assertIn("if(!ticketProfitReady(t)) return 0;", self.html)
        self.assertIn("return (Number(t.sale) || 0) - (Number(t.cost) || 0);", self.html)
        self.assertIn("adj profit par asar nahi karta", self.html)

    def test_adj_only_on_change_sales(self):
        # A leftover adj on a Ticket/Umrah/Hajj sale must not touch its numbers.
        self.assertIn("function isChangeSale(t){", self.html)
        self.assertIn('return k === "" || k === "change";', self.html)
        self.assertIn("Already linked to a change sale", self.html)
        self.assertIn("Change sale ke liye Sale price zaroori he", self.html)
        self.assertIn("pehle se ek change sale", self.html)

    def test_change_form_and_edit(self):
        self.assertIn('id="tkChangeBox"', self.html)
        self.assertIn('id="tkAdj"', self.html)
        self.assertIn('id="tkPrev"', self.html)
        self.assertIn('Previous Ticket Adj (Rs)', self.html)
        self.assertIn("adj:adj, prevId:prevId, prevRef:prevRef", self.html)
        self.assertIn("Previous Ticket Adj (Rs) — khali chhod dein to purana rahega:", self.html)

    def test_partial_ticket_payments_are_reachable(self):
        # `t.payments` was read in 6 places but there was no way to enter one —
        # only a full "Paid" toggle. Payment must be enterable from both the row
        # sheet and the Pending tab.
        self.assertIn("function receiveTicketPayment(t){", self.html)
        self.assertIn('if(!Array.isArray(t.payments)) t.payments = [];', self.html)
        self.assertIn("t.payments.push({ amount:amt, date:payDt });", self.html)
        self.assertIn('add("💵 Payment"', self.html)
        self.assertIn('class="btn small tk-pay"', self.html)

    def test_advance_received_when_adding_a_sale(self):
        # Sale 66,000 par client ne abhi 26,000 diye -> 40,000 khud Pending
        # Payments mein aana chahiye (v3.24).
        self.assertIn("function ticketAdvanceSplit(sale, adj, advRaw, markPaid){", self.html)
        self.assertIn("var left = Math.max(0, net - adv);", self.html)
        self.assertIn("else if(left > 0) paid = false;", self.html)
        self.assertIn('id="tkAdv"', self.html)
        self.assertIn('id="tkAdvDate"', self.html)
        self.assertIn('id="tkAdvHint"', self.html)
        self.assertIn("Pending Payments mein jayega", self.html)
        # Advance abhi mila hua payments[] mein jata he, warna baqi count nahi hota.
        self.assertIn('nt.payments = [{ amount:sp.adv, date:advDate, note:"advance" }];', self.html)

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
