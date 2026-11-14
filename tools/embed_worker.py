"""Refresh the generated Worker copy used by Settings -> copy Worker."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = root / "index.html"
source = (root / "pricebot-worker.js").read_text(encoding="utf-8")
text = html.read_text(encoding="utf-8")
text, count = re.subn(
    r'var TELEGRAM_WORKER_CODE = ("(?:\\.|[^"\\])*");',
    lambda _: "var TELEGRAM_WORKER_CODE = " + json.dumps(source) + ";",
    text,
)
assert count == 1
html.write_text(text, encoding="utf-8")
