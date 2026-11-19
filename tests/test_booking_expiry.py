"""Booking expiry reminder checks (v3.22).

The Worker already had /remind + the every-minute cron, but v3.18 removed the
app side, so a booking could not be reminded at all. These checks make sure the
whole chain stays wired: form -> save -> Worker alarm -> cancel on delete.
"""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class BookingExpiryChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_form_fields_exist(self):
        self.assertIn('id="tkExpAt"', self.html)
        self.assertIn('id="tkExpLead"', self.html)
        self.assertIn('type="datetime-local"', self.html)
        self.assertIn("Booking expiry reminder", self.html)

    def test_quick_presets(self):
        # "+30 min" / "+1 ghanta" — booking ke waqt ek tap se waqt set ho jaye.
        for mins in ("30", "60", "120", "180", "360", "1440"):
            self.assertIn('data-exp-min="%s"' % mins, self.html)
        self.assertIn("function tkExpLocalInput(ms){", self.html)

    def test_lead_options(self):
        self.assertIn('<option value="60,30">', self.html)
        self.assertIn('<option value="120,60,30">', self.html)
        self.assertIn('<option value="0">', self.html)

    def test_save_wires_the_alarm(self):
        self.assertIn("expAt:expAtVal || \"\", expRemId:\"\", expTg:!!expAtVal,", self.html)
        self.assertIn("tkExpSchedule(expTk, expLeadVal)", self.html)
        # A past time must block the save instead of silently scheduling nothing.
        self.assertIn("Expiry ka waqt guzar chuka he", self.html)

    def test_worker_relay_and_cancel(self):
        self.assertIn("function tkExpSchedule(t, leadCsv){", self.html)
        self.assertIn('tgRelayUrl() + "/remind"', self.html)
        self.assertIn('action:"add"', self.html)
        self.assertIn('action:"remove"', self.html)
        self.assertIn("function tkExpCancel(t){", self.html)

    def test_delete_cancels_the_alarm(self):
        # Otherwise a deleted booking keeps firing Telegram alarms.
        self.assertIn("tkExpCancel(tk);", self.html)
        self.assertIn("if(rm.indexOf(t.id) >= 0 && t.expAt) tkExpCancel(t);", self.html)

    def test_row_sheet_and_expiry_card(self):
        self.assertIn('add("⏰ Expiry"', self.html)
        self.assertIn("function tkEditExpiry(t){", self.html)
        self.assertIn("Booking expiries (", self.html)
        self.assertIn('class="btn small tk-exp-edit"', self.html)
        self.assertIn('class="btn small tk-exp-del"', self.html)

    def test_register_shows_the_expiry(self):
        self.assertIn("tk-exp-chip", self.html)
        self.assertIn("function tkExpLeft(expAt){", self.html)

    def test_helpers_arithmetic_when_node_is_available(self):
        node = shutil.which("node") or "C:/Users/hp/AppData/Local/Temp/opencode/node.exe"
        try:
            run = subprocess.run(
                [node, str(ROOT / "tests" / "expiry_checks.mjs")],
                capture_output=True, text=True, timeout=60,
            )
        except FileNotFoundError:
            self.skipTest("node is not available")
        self.assertEqual(run.returncode, 0, run.stderr or run.stdout)


if __name__ == "__main__":
    unittest.main()
