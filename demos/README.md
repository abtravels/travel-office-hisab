# Demos

Is folder mein alag-alag design clone demos rehte hain — app ke `index.html` se bahar, taake main app
ka code na chhue.

| Demo | Source | URL |
| --- | --- | --- |
| `sastaticket-clone/` | <https://www.sastaticket.pk/> homepage | `/demos/sastaticket-clone/` |

## Website cloner kaise use karein

Repo mein [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)
(MIT) ka **skill** install he — wahi technique jis se upar wala clone bana:

```
.agents/skills/clone-website/SKILL.md          # 4-step workflow: map → observe → build → compare
.agents/skills/clone-website/references/       # inspection guide, Framer/motion notes
.claude/commands/clone-website.md              # Claude Code slash command
.opencode/command/clone-website.md             # OpenCode slash command
```

Kisi bhi AI coding agent (Claude Code, OpenCode, Cursor, Codex) mein:

```
/clone-website https://example.com
```

Agent page ko browser se dekhta he, real assets/fonts nikalta he, phir `demos/<site>/` mein plain
HTML/CSS/JS bana deta he. Is repo mein Next.js template install nahi kiya gaya — app static
GitHub Pages par chalti he aur `npm`/Node 24 ka build step nahi chahiye.

Rules:

- Clone output sirf `demos/` mein; root `index.html` ya `pricebot-worker.js` ko haath na lagayein.
- Har demo mein visible disclaimer ho (brand/assets kisi aur ke hain).
- Koi booking/payment/account flow clone na karein — sirf UI + local interactions.
