---
description: Rebuild one or more web pages as working local code matching their real content, assets, responsive layout, and interactions.
---

Read `.agents/skills/clone-website/SKILL.md` completely, then follow it for the target URL or URLs in
the request. When invoked with arguments, `$ARGUMENTS` holds those URL arguments, for example:

`/clone-website https://example.com`

Notes for this repository:

- The app itself is a single-file static `index.html` (GitHub Pages), so clone output belongs in
  `demos/<site-name>/` as plain HTML/CSS/JS with local assets — not in the root file.
- Do not modify the hand-written app code (`index.html`, `pricebot-worker.js`) as part of a clone.
- Brand assets and copy belong to their owners: keep a visible demo/disclaimer notice and link to the
  source site.
