# sastaticket.pk homepage — design clone (demo)

Ye folder [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)
ke method se banaya gaya **demo clone** he. Ye asli site nahi he: koi booking, payment ya account
yahaan nahi hota.

- Source page: <https://www.sastaticket.pk/> (homepage, sirf)
- Built: 17 Nov 2026
- Stack: plain HTML + CSS + vanilla JS (koi build step nahi) — GitHub Pages par seedha chalta he
- Live URL: `https://abtravels.github.io/travel-office-hisab/demos/sastaticket-clone/`

## Kya clone hua

| Section | Source | Notes |
| --- | --- | --- |
| Top strip, header, nav | live page | desktop + mobile drawer |
| Hero gradient + product tabs | live page | Flights / Buses panes kaam karte hain; Umrah / Visas / Packages par demo notice |
| Flight search widget | live page | trip type, traveller + cabin popover, city combobox, swap, custom calendar, direct-only |
| Support strip | live page | call / WhatsApp links |
| App offer card | live page | local images + store badges |
| Azerbaijan Airlines promo | live page | local sky/plane/logo assets, real banner text |
| Popular destinations | *sample* | real cards client-side load hote hain, is liye 4 sample cards banaye |
| Newsletter | live page | client-side validation, koi request nahi |
| Footer link columns + payment logos | live page | links asli sastaticket.pk pages par jaate hain |

Design tokens (colors, radii, shadows, spacing) live page ke computed styles se liye gaye: navy
`#06325E`, blue `#0A549C`, gradient `#06325E → #0D68C4`, background `#F7F8FB`, Manrope font.

## Interactions jo kaam karti hain

- One way / Return / Multi-city (return date disable/enable, return >= departure)
- Travellers (1–9 adults, children, infants ≤ adults) + cabin class
- From/To city search (24 cities, keyboard arrows + Enter)
- Origin/destination swap
- Date picker with month navigation, past dates disabled
- Direct-flights-only checkbox
- Search validation + demo summary notice
- Buses pane (cities + date + demo notice)
- Newsletter email validation
- Mobile navigation drawer

## Chalane ka tareeqa

```bash
cd demos/sastaticket-clone
python -m http.server 8123
# http://localhost:8123/
```

`index.html` ko seedha browser mein bhi khol sakte hain (koi external request nahi hoti).

## Files

```
index.html   markup + inline SVG icon sprite
styles.css   design tokens, layout, responsive breakpoints (1100/900/560)
app.js       search widget, combobox, calendar, tabs, newsletter, mobile nav
assets/      logos, app badges, promo images, payment partners, Manrope font
```

## Legal

Brand, logo, tasveerein aur copy **Sastaticket Private Limited** ki milkiyat hein. Ye clone sirf
design/engineering reference he; is se koi booking, impersonation ya commercial use nahi hota.
Asli fares/bookings ke liye <https://www.sastaticket.pk/> ya is repo ka AB Travels app use karein.

Font: [Manrope](https://github.com/sharanda/manrope) — SIL Open Font License 1.1.
