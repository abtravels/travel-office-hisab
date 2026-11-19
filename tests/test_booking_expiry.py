"""Booking expiry reminder checks (v3.23).

v3.22 ne reminders app mein wapas laaye the, magar sale form ke andar — sale aur
reminder aapas mein uljhe hue the. v3.23 ne unhe **Price Tracker** tab par alag
store (S.bookExps) mein le jaya: sale ka hisaab saaf, reminder apni jagah.

Yeh checks poora chain pin karte hain: form -> save -> Worker alarm -> cancel.
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

    def test_own_store(self):
        # Sale par expiry fields dobara na aayein.
        self.assertIn("bookExps: []", self.html)
        self.assertIn("function migrateBookExps(s){", self.html)
        self.assertNotIn("expAt:expAtVal", self.html)
        self.assertNotIn('id="tkExpAt"', self.html)

    def test_form_lives_in_tracker(self):
        self.assertIn('id="bkExpAt"', self.html)
        self.assertIn('id="bkExpLead"', self.html)
        self.assertIn('id="bkExpClient"', self.html)
        self.assertIn('id="bkExpAdd"', self.html)
        self.assertIn("function bkExpCard(){", self.html)
        # Tracker ke view mein card lagna chahiye, sales ke view mein nahi.
        self.assertIn("html += bkExpCard();", self.html)
        self.assertIn("if(currentTab === \"tracker\") trkBind();", self.html)
        self.assertIn("bkExpBind();", self.html)

    def test_quick_presets(self):
        for mins in ("30", "60", "120", "180", "360", "1440"):
            self.assertIn('data-exp-min="%s"' % mins, self.html)
        self.assertIn("function tkExpLocalInput(ms){", self.html)

    def test_lead_options(self):
        # v3.28: dropdown ki jagah multi-select chips — 5/10/15 min bhi.
        self.assertIn('id="bkExpLead" value="60,30"', self.html)
        self.assertIn('var BK_LEADS = [[1440,"1 din"],[180,"3 ghante"],[120,"2 ghante"],[60,"1 ghanta"],[30,"30 min"],', self.html)
        self.assertIn('[15,"15 min"],[10,"10 min"],[5,"5 min"],[0,"Expire ke waqt"]];', self.html)
        self.assertIn('class="btn small bk-lead', self.html)

    def test_worker_relay_add_and_cancel(self):
        self.assertIn("function tkExpSchedule(e){", self.html)
        self.assertIn('tgRelayUrl() + "/remind"', self.html)
        self.assertIn('action:"add"', self.html)
        self.assertIn('action:"remove"', self.html)
        self.assertIn("function tkExpCancel(e){", self.html)
        # Naya src — worker logs mein pata rahe ke tracker se aaya he.
        self.assertIn('src:"bookexp"', self.html)

    def test_past_time_is_blocked(self):
        self.assertIn("Ye waqt guzar chuka he — aage ka waqt chunein.", self.html)
        self.assertIn("function tkExpPast(expAt){", self.html)

    def test_list_actions(self):
        self.assertIn('class="btn small bk-exp-edit"', self.html)
        self.assertIn('class="btn small bk-exp-del"', self.html)
        self.assertIn("tkExpLeft", self.html)

    def test_countdown_text(self):
        self.assertIn("function tkExpLeft(expAt){", self.html)
        self.assertIn("min baqi", self.html)

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
