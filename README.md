# Travel Office Hisab - AB Travels

## App notifications ab Discord par bhi (v3.40)
- **Masla:** `DISCORD_WEBHOOK` set tha, tracker ke alerts Discord par ja rahe thay, magar **naya ticket / ticket file / invoice** ki notification sirf **Telegram** par aati thi.
- **Wajah:** app ki notifications `/notify` relay se jati hain, aur Discord sirf `notifyAll` (bot/tracker/reminders) mein laga hua tha — relay mein nahi.
- **Fix:** relay ab har notification **Telegram + Discord dono** par bhejta he; jawab mein dono ka nateeja aata he (`discord: {ok, error}`), aur `ok` tab bhi true hota he jab sirf Discord gaya ho.
- Agar Telegram token na ho magar `DISCORD_WEBHOOK` set ho to relay ab kaam karta he (pehle `no_token` de deta tha); Telegram chats khali hon to bhi Discord par chala jata he.
- Worker status page **v3.40**; Cloudflare build push par khud chalta he.

## "Failed to fetch" fix — country round trip (v3.39)
- **Masla:** KHI → Indonesia (country) round trip 27 Dec → 20 Jan par **"Failed to fetch"** aata tha. Ye browser ka network error he — worker ka jawab hi nahi mila, kyunke round trip / multi-city ka **har airport** 10 pages (≈2,500 options) ka bhara search hota he aur country run unhe **3 ek saath** chalata tha → worker ka memory/CPU limit toot kar connection band.
- **Fix (app):** round trip/multi ke country run mein ab **2 airports ek saath** (one-way par 3 wahi), aur har airport ki search **6 pages** (round/multi) — halki aur tez.
- **Fix (worker):** request body mein `pages` accept hota he (1–20), is liye app bina redeploy ke pages kam/zyada maang sakti he. `MEZ_MAX_PAGES` env cap barqarar he.
- **Network retry:** koi bhi "Failed to fetch" aaye to app **ek dafa khud dobara** try karti he (1.5s baad); phir bhi na ho to saaf message: *"Meezab/Worker se connection nahi bana (Failed to fetch) — internet ya worker ka masla he. Dubara try karein."*
- Sirf ek hi cheez ki qurbani: round/multi country search mein pehle 1,500 fares (6 pages) aate hain, 2,500 nahi — price ke hisab se sorted hone ki wajah se sab se saste fares usi mein hote hain.

## Country search ab round trip aur multi-city mein bhi (v3.37)
- Pehle **"To" mein country/city ka naam (UAE, Saudi Arabia, Dubai) sirf one-way** mein chalta tha; round trip / multi-city par app kehti thi "IATA code dalein".
- Ab **teeno trip types** mein: har airport ke liye **wahi trip** search hoti he — round trip par us airport ka **return fare** (origin wapas), multi-city par leg 1 ka destination badal kar baqi legs waise hi.
- Country list ka header ab trip bhi dikhata he (`Round trip · 8 airports`), aur kisi row par click karne ke baad ↻ / auto-refresh bhi **round trip / multi-city hi** dobara search karta he (pehle one-way ban jata tha).
- **Speed:** round trip / multi ka har airport bhaari search he (10 pages, 40–70s), is liye wahan **5 airports** (one-way par 8). Watchdog ab har airport ke baad reset hota he, is liye lamba run beech mein "fail" nahi dikhata.
- Budget: har airport **ek Meezab search** — 5 airports = 5 searches.
- **v3.38:** country card ka header ab **tareekh aur party** bhi dikhata he — `Round trip · 10 Dec 2026 – 20 Dec 2026 · 2 adults · 5 airports`, aur multi-city par legs (`KHI→DXB 10 Dec · DXB→LHR 15 Dec`). Help line bhi update ke country search teeno trip types mein chalta he.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Invoice form ab nahi urta + Meezab login 526 fix (v3.36)
- **Invoice draft:** iPhone par (home screen wali app) invoice likhte hue WhatsApp dekhne ke liye app switch karein to iOS page dobara load kar deta he — pehle aadhi likhi invoice (naam, PNR, sab) ur jati thi. Ab form ka har harf isi device par mehfooz rehta he (`localStorage` `ab_inv_draft`, sync nahi hota):
  - Wapas aane par form wahin se milta he — passengers ki ginti aur linked sale samet.
  - Page dobara load ho jaye aur draft 15 minute ke andar ka ho to app Sales ki jagah seedha **Invoice** tab kholta he aur batata he *"Adhoori invoice wapas aa gayi"*.
  - Wapas aane par sync ab Invoice tab ko dobara nahi banata (bani hui invoice / likha hua form waisa hi rehta he).
  - **Generate** ya **Close invoice** par draft khatam. Naya **🧹 Form khali karein** button. 12 ghante purana draft nahi aata.
- **Meezab `login: HTTP 526`:** Meezab ne 20 Nov ko apna API portal ke domain par le aaya (`b2b.meezabair.com.pk/b2b_api`); purana host `testb2bapi.meezabair.com.pk` ghalat SSL certificate dene laga. Worker ab naya address use karta he — Price Lookup aur Tracker dono isi se chalte hain.
- **Sale type** wapas sirf Ticket / Change / Umrah / Hajj (v3.35 ke Visa, Hotel, Insurance, Tour, Other hata diye).
- Worker + app dono badle.

## Kamai kahan se + phone par bare buttons (v3.35)
- **Summary → 💡 Kamai kahan se:** sales ki ginti, avg profit per sale, margin %, pending (unpaid), **har sale type ka profit** (Ticket / Umrah / Visa …) aur **sab se zyada profit dene wale 5 clients**. Neeche mashwaray: kitni sales ki cost/sale khali he, kitni par margin 2% se kam he, pending paisa. Sab numbers `Show totals` passcode ke peeche. Sirf wo sales gini jati hain jin ki cost aur sale dono likhi hon.
- **Clients → dobara rabta:** jis client ne **60+ din** se kuch nahi liya us par `⏳ N din se koi sale nahi` aata he, upar ginti aur **Sirf ye dikhayein** filter. Har client (jis ka number ho) par **💬** — WhatsApp khulta he tayyar follow-up message ke sath (naam ke sath, koi raqam nahi).
- (Sale type ke naye options v3.36 mein wapas hata diye gaye.)
- **Phone par bare buttons:** touch screen / 860px se chhoti screen par har button kam az kam 36px (bare 42px) — pehle 26px the aur ghalat button dab jata tha. Laptop par size wahi.
- **Settings shortcuts:** search ke neeche chips (Telegram, GitHub sync, Backup, Theme, Invoice, Flight prices, Passcode, Staff, Update) — ek tap par sirf wahi cards.
- 9 fields ko screen-reader naam diye (withdrawal / loan / payment dates, move-sales months, PDF text, backup list).
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Invoice: leg labels saaf + headings prominent (v3.34)
- **Bug:** connecting leg par departure ki heading sirf `CONTINUING FLIGHT` thi (return par `RETURN — CONTINUING FLIGHT`), is liye round trip invoice par lagta tha ke wo leg kisi aur trip ki he.
- Ab dono taraf ek jaisa: **`DEPARTURE — CONTINUING FLIGHT`** aur **`RETURN — CONTINUING FLIGHT`**.
- **Headings prominent:** `DEPARTURE FLIGHT` / `RETURN FLIGHT` / continuing legs ab chhote halke grey text ki jagah **coloured pill** mein hain — departure legs **blue**, return legs **teal** — taake client ek nazar mein outbound aur return alag kar le. Pill halka background + border use karta he, is liye **B&W print** par bhi saaf rehta he.
- Sirf invoice ka layout — data, fare ya print size par koi asar nahi. Worker redeploy ki zaroorat nahi.

## Summary mein profit trend + har control ka naam (v3.30)
- **Kyun:** Summary par sirf numbers aur table thi — "profit mahine-ba-mahine upar ja raha he ya neeche" ek nazar mein nahi pata chalta tha. Aur screen reader ko form ke controls ke naam nahi milte the.
- **Naya: Net profit per month line chart** (Recent months card mein, table ke upar).
  - **Zero line** — us se neeche ka point = loss month. Misal: May −12k saaf neeche dikhta he.
  - **Ek hi rang** (single series), area sirf halka wash — koi rainbow nahi.
  - **Labels sirf ahem jagah**: aakhri mahina + sab se ooncha + sab se neecha. Har point par number nahi.
  - **Table neeche barqarar** — wahi asli data he, chart sirf tasveer he.
  - **2 mahine se kam** ho to chart nahi banta (ek mahine ka number stat tile pehle se dikhata he).
  - Koi library nahi, koi animation nahi — inline SVG, `viewBox` se har width par fit.
- **Rang validator se pass karwaya, andaze se nahi:** light `#2563eb` (surface `#ffffff`), dark aur OLED `#3b82f6` (`#121c2c` / `#0b0b0e`). App ka apna `--blue #60a5fa` dark mode ke lightness band se **bahar** tha, is liye chart ka alag token `--trend-series` rakha.
- **Accessibility: har form control ka naam.** Pehle 150+ controls ke `<label>` visually mojood the magar `for=` nahi tha — screen reader unhe pehchan nahi pata tha.
  - Sab static labels ab `for="id"` se juray hue.
  - Jin controls ka koi visible label nahi (placeholder-only, ya dynamic rows) unhe `aria-label` mila — misal income/expense amount, charity, fixed expense rows, month selects.
  - Lighthouse accessibility **90 → 100**.
- **Kuch nahi toota:** cost/sale/profit, advance, pending payments, expiry reminders — sab waise hi. Sirf ek chart aur labels ka izafa.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Har device ka apna theme + file chunte hi upload (v3.29)
- **Theme ab device ka apna:** mobile par OLED aur PC par Light — ek par badalne se doosra nahi badalta. Theme ab GitHub sync wale data (`S.settings`) mein nahi, sirf us device ke `localStorage` (`ab_theme`) mein save hota he. Pehli dafa naya version khulne par jo theme pehle se tha wahi us device par pin ho jata he.
- **Ticket Files:** file chunte (ya PC par drag kar ke chhorte) hi upload shuru — alag **⬆ Upload** button hata diya. Button ka naam ab **⬆ Choose & upload file(s)**. Client / PNR / Note pehle likh dein; khali hon to file ke naam se khud bhar jate hain. Upload chal rahi ho to doosri dafa chunne par double upload nahi hoti.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Booking reminder: 5 / 10 / 15 min pehle bhi (v3.28)
- **"Kitna pehle remind"** ab dropdown nahi — chips hain, **jitne chahein ek saath** chunein: 1 din, 3 ghante, 2 ghante, 1 ghanta, 30 min, **15 min, 10 min, 5 min**, aur expire ke waqt. Default pehle jaisa 1 ghanta + 30 min.
- Hint batata he kaun se reminder aayenge — maslan 29 min baqi aur 30 + 15 + 5 chune hon to: *remind: 15 min · 5 min pehle (30 min ka waqt nikal chuka)*.
- Edit karne par purane chune hue waqt wapas chips par aa jate hain.
- Telegram message mein "1 ghanta baqi" / "15 min baqi" saaf likha hota he; reminder bhejte waqt Telegram ko lamba waqt (20s + 30s) milta he taake 5 min wala alert miss na ho.
- Worker + app dono badle.

## Plane menu + har girawat par alert (v3.27)
- **Plane button (✈) ab 3 options kholta he** — header wala (laptop) aur neeche ki bar ke beech wala (mobile) dono:
  - **🔍 Price Lookup** — fares search.
  - **📈 Flight Tracker** — Price Tracker tab (tracked routes ki ginti badge mein).
  - **⏰ Booking alerts** — Price Tracker tab khul kar seedha Booking expiry reminders card par scroll (aane wale reminders ki ginti badge mein).
  - Bahar tap ya Esc se band.
- **Rs 100 girawat par bhi alert.** Margin kam hota he, is liye pichle check se **koi bhi** girawat (Rs 1+) ho to foran Telegram — koi % hadd nahi, koi 20 min cooldown nahi. Price wahi rahe ya barhe to koi message nahi, is liye spam nahi.
  - Alert mein ab saaf likha hota he **"Rs 100 sasta"** (pehle kitna tha), aur agar tracking shuru se zyada gira ho to "Tracking shuru se: Rs 2,173 kam".
- **Worker + app dono badle.**

## Tracker alert drop na ho + chhoti girawat par bhi alert (v3.26)
- **Masla (ISB→KHI 9P-679, 19 Nov):** price 28,173 → 27,090 gira, Worker ne alert banaya magar Telegram ki ek chat tak message **8 second timeout** mein atak gaya aur dobara koi koshish nahi hui. Test se bhi yahi mila: 2 mein se 1 chat timeout.
- **Fix — delivery:** cron ke alerts ab Telegram ko 20s + 30s ka waqt dete hain (pehle 8s + 12s). Jo chat fail ho, us ke liye alert **`pendingAlert`** mein rakh liya jata he aur cron **har minute sirf usi chat ko dobara** bhejta he (5 dafa tak) — is mein Meezab search nahi lagti.
- **Fix — kab alert:** pehle sirf **3%+** girawat par alert aata tha, aur 20 minute ke andar doosri girawat chup rehti thi. Ab:
  - **1% ya Rs 300** (jo pehle ho) girawat par alert.
  - **Naya sab se kam price** (pichle alert se bhi kam) — cooldown ke andar bhi foran alert.
  - Price upar ja kar wapas aaye (naya low nahi) to 20 min cooldown pehle ki tarah.
- **App mein nazar:** har tracker card par aakhri alert ka haal — `🔔 Price gira alert 5 min pehle: ✓ Telegram 2 chat` ya laal mein `1 chat tak nahi pohncha — har minute dobara bhej rahe hain`.
- **Worker + app dono badle** (Workers Builds `main` push par khud deploy).

## Profit sirf poori sales ka + Tracker/Reminder UX (v3.25)
- **Cost ya sale 0 = profit mein nahi.** Jis sale ki cost price ya sale price abhi 0 he (likhi nahi gayi), us ka profit **na register row mein, na total, na mahine ki income, dashboard, report ya CSV** mein gina jata he. Pehle cost 0 wali sale ka poora sale price "profit" ban jata tha aur sale 0 wali sale "loss" — dono ghalat.
  - Register ke Profit column mein aisi sale par **—** dikhta he; khali Sale cell bhi **—** (sone rang) se nishan.
  - Upar ek line: `⚠ N sale(s) mein cost ya sale price khali he — in ka profit total mein nahi gina gaya`.
  - Search karne par neeche ka Profit total bhi isi qaida se banta he. Form ka hint cost + sale dono likhne tak `Profit: —` dikhata he.
  - Asli loss (dono likhe hon aur cost > sale) pehle ki tarah laal mein dikhta he.
- **Price Tracker:** laptop par **do column** (left naya tracker + tracked routes, right booking reminders). "Check every" aur "Kab tak" ab tab ke peeche chhupe nahi — hamesha saamne, aur neeche live khulasa: *Har 30 min = din mein ~48 checks · kal 9:00 pm tak (~70 checks)*; flight ki date ke baad tak tracking ho to warning, bohot zyada checks par budget warning. "Kisi din tak" ki date flight ki date se aage nahi ja sakti.
  - Tracker card par **⬇ low** (ab tak ki sab se kam price) chip, aur 6 ghante se kam baqi ho to card + 🏁 chip sone rang mein.
  - **Stop** ab app ka apna confirm dialog dikhata he (browser ka purana confirm nahi).
- **Booking expiry reminders:**
  - Alag **PNR / route** field, aur Client mein purane clients ke naam ki suggestions.
  - Har reminder par haal: `✓ 60 min · 30 min pehle` (Worker par alarm laga) ya `⚠ Alarm nahi laga — dobara` (ek tap par retry). Pehle alarm fail hone par bhi "Reminder set" likha aata tha.
  - 3 ghante se kam baqi = laal card.
  - **Edit** ab wohi form bhar deta he (date picker ke sath) — pehle `dd/mm/yy HH:MM` likhne wala prompt tha jo mobile par mushkil tha. Cancel button bhi.
  - Ek hi client + waqt ka reminder do dafa nahi lagta; guzre hue reminders **🧹 Saaf karein** se ek tap mein hat jate hain.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Sale form mein advance / abhi mila hua (v3.24)
- **Masla:** client poori raqam ek dafa nahi deta. Misal: sale 66,000 ki, client ne 26,000 diye. App sirf **Paid / Unpaid** janta tha — 26,000 likhne ki jagah nahi thi, is liye ya poora Paid dabana parta (aur 40,000 gum ho jate) ya poora Unpaid chhodna parta (aur 66,000 pending dikhta).
- **Ab sale form mein do nayi cheezein:**
  - **Advance received now (Rs)** — client ne abhi kitne diye.
  - **Advance date** — default aaj.
- **Field ke neeche live hint:** *"✓ Abhi mila: Rs 26,000 · baqi Rs 40,000 Pending Payments mein jayega."*
- **Baqi khud Pending Payments mein** — 26,000 `payments[]` mein advance ke tor par darj hota he, is liye 40,000 seedha **Pending Payments**, dashboard ke bakaya aur client ke khatay mein aata he. Alag se kuch karna nahi parta.
- **Status select ki jagah advance chalta he (jab advance likha ho):**
  - advance kam → **Unpaid** + baqi amount (khud)
  - advance poora → **Paid**, kuch baqi nahi
  - advance khali → pehle ki tarah **Paid / Unpaid** select hi faisla karta he (purana behaviour bilkul waisa hi)
- **Advance net se bara ho to net tak mehdood** — baqi kabhi negative nahi. Hint bata deta he: *"⚠ Advance net Rs 5,000 se bara he — Rs 5,000 count hoga."*
- **Change sale par advance `net` (sale − adj) par lagta he**, gross par nahi — misal sale 33,000, adj 19,500 → net 13,500; advance 10,000 → baqi 3,500.
- **Baad ki payments pehle ki tarah** row menu ya Pending tab ke **💵 Payment** se — dono jagah se ab bhi kaam karta he.
- **Sale/register ka hisaab wahi** — cost, sale, profit par advance ka koi asar nahi; sirf "due / received" badalta he.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Booking expiry reminder ab Price Tracker mein (v3.23)
- **Kyun badla:** v3.22 mein yeh dabba **sale form ke andar** tha — sale aur reminder aapas mein uljhe hue the. Ab sale ka kaam sale, reminder ka kaam apni jagah.
- **Poora system Price Tracker tab par:** naya card **⏰ Booking expiry reminders (n)**.
  - **Client / booking** likhein (naam ke sath route ya PNR bhi — reminder message wahi dikhata he, misal `Usama — KHI-DXB EK601`).
  - **Ek tap presets:** `+30 min` · `+1 ghanta` · `+2 ghante` · `+3 ghante` · `+6 ghante` · `+1 din`
  - Ya **exact waqt** (date + time) khud chunein.
  - **Kitna pehle remind:** `1 ghanta + 30 min` (default) · `2 ghante + 1 ghanta + 30 min` · `sirf 30 min` · `sirf 1 ghanta` · `expire ke waqt`.
  - Field ke neeche live hint: **"⏰ 19/11/26 4:32 pm (2 ghanta baqi) — remind: 60 min · 30 min pehle"**.
- **Alag store (`S.bookExps`)** — sale/ticket par ab `expAt` jaisa kuch nahi likha jata, is liye sales register, totals aur hisaab bilkul saaf rehte hain.
- **Purana data khud migrate ho jata he:** v3.22 mein jo reminders sale par the, app khulte hi `migrateBookExps()` unhe is card mein le aata he aur ticket se expiry fields hata deta he (ek hi dafa, duplicate nahi bante).
- **Reminder app band ho tab bhi aata he.** Alarm Cloudflare Worker ke `/remind` store mein jata he aur wahan ka cron due waqt par **Telegram** (aur `DISCORD_WEBHOOK` set ho to Discord) par bhejta he.
- **Guzra hua waqt save nahi hota** — laal warning, entry add nahi hoti.
- **Har entry par ✏ (waqt badlein — purana alarm cancel, naya lag jata he) aur ✕ (reminder hatao)**. Dono sirf reminder par asar dalte hain, hisaab par nahi.
- **`src:"bookexp"`** — worker logs mein pata chalta he ke reminder tracker se aaya he (ticket wale `src:"ticket"` se alag).
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## v3.22 — booking expiry reminder wapas (sale form mein tha)
> **Note (v3.23):** neeche wala sale-form wala dabba hata diya gaya he — reminder ab **Price Tracker** tab par he (upar dekhein). Jo reminders pehle se bane hue hain wo khud migrate ho jate hain.
- **Masla:** booking karte waqt "ye PNR 2 baje expire hota he" yaad rakhne ka koi tareeqa nahi tha. v3.17 mein yeh feature tha, magar **v3.18 ne app ka UI hata diya** — jab ke Worker par `/remind` aur every-minute cron **pehle se maujood** the. Matlab bot ka reminder system zinda tha, bas app us se baat nahi kar raha tha.
- **Ab sale form mein naya dabba:** **⏰ Booking expiry reminder (optional)**
  - **Ek tap ke presets:** `+30 min` · `+1 ghanta` · `+2 ghante` · `+3 ghante` · `+6 ghante` · `+1 din`
  - Ya **exact waqt** (date + time) khud chunein.
  - **Kitna pehle remind:** `1 ghanta + 30 min` (default) · `2 ghante + 1 ghanta + 30 min` · `sirf 30 min` · `sirf 1 ghanta` · `expire ke waqt`.
  - Field ke neeche live hint: **"⏰ 19/11/26 3:45 pm (2 ghanta baqi) — remind: 60 min · 30 min pehle"**.
- **Reminder app band ho tab bhi aata he.** Alarm Cloudflare Worker ke reminder store mein jata he aur wahan ka cron due waqt par **Telegram** (aur `DISCORD_WEBHOOK` set ho to Discord) par bhejta he.
- **Guzra hua waqt save nahi hota** — form laal warning deta he aur sale save hone se rok deta he.
- **Sales register mein** detail cell ke neeche chhoti `⏰ 19/11/26 3:45 pm` line, aur naya card **⏰ Booking expiries (n)** — aane wali expiries countdown (`2 ghanta baqi`) ke sath; wahan se ✏ badlein ya ✕ hata dein.
- **Row menu mein `⏰ Expiry`** — purani sale par baad mein bhi reminder lagaya ja sakta he.
- **Delete/duplicate-cleanup par alarm bhi cancel hota he** — warna ticket delete karne ke baad bhi Telegram aata rehta.
- Sirf app ka change — Worker redeploy ki zaroorat nahi (`/remind` pehle se live he).

## Telegram jawab nahi de raha + Discord fallback (v3.21)
- **Asli masla mila (aur wo Telegram app ka nahi, Cloudflare ka rasta he):** Worker se `api.telegram.org` ka call **jawab hi nahi deta**. "📨 Telegram test" dabane par button 2 minute "bhej rahe…" par atka rehta tha aur phir **"Fetch is aborted"** — kyunke har chat ke liye 20s + 40s ka retry tha aur do chats = 120s (app ka timeout). Isi liye "Check now" par bhi kuch nahi aata tha.
- **Fix:** Telegram calls ab **8s + 12s** (pehle 20s + 40s), aur **saari chats ek saath (parallel)** jati hain — ek slow chat poore request ko nahi latkata. Ab 20 second ke andar asli nateeja: "✓ 2 chat par bheja" ya asli error.
- **Discord fallback (naya):** Cloudflare → Worker `ab-travels-ignav` → Settings → Variables and Secrets → **`DISCORD_WEBHOOK`** add karein (value = apne Discord channel ka webhook URL), Save. Us ke baad **har alert Telegram ke sath Discord par bhi** jata he — Telegram fail ho to bhi alert pohanch jata he.
- **Webhook banane ka tareeqa:** Discord → apna server → **Server Settings → Integrations → Webhooks → New Webhook** → channel chunein → **Copy Webhook URL** → Cloudflare ke `DISCORD_WEBHOOK` mein paste → Save.
- **Test:** Tracker → **📨 Telegram test** ab dono ka nateeja dikhata he: "✓ Telegram 2 chat…" ya "✓ Discord par bhej diya (Telegram jawab nahi de raha)" ya dono ke errors.
- **Mashwra:** Telegram ko primary rakhein (team ke paas already he), Discord ko **backup** — dono ek saath chalti hain, koi nuqsan nahi. Discord webhook ke liye bot/token ki zaroorat nahi, sirf ek URL.

## Salam Air + invoice header (v3.33)
- **Salam Air (OV)** ab app mein add he:
  - Invoice / ticket form ke **airline dropdown** mein (OV — Salam Air), logo ke sath (`airlines/OV.png`).
  - **PNR Lookup** tab ki airline list mein bhi.
  - **Price Lookup → 🔗 Airline portals** card mein `https://www.salamair.com/`.
- Invoice se **"Assalam-o-Alaikum" wali line hata di** (v3.32 mein galti se add hui thi — woh greeting nahi, airline maangi gayi thi).
- Invoice header ka **logo** ab load na ho to **AB monogram** dikhta he (print/PDF mein header khaali nahi lagta).
- Baqi invoice (PNR, passengers, flights, baggage, totals) waisa hi he.

## Tracker: Telegram ka asli nateeja + test button (v3.20)
- **"Check now" par Telegram nahi aata** — ab pata chal jayega ke message gaya ya nahi, kyunke app pehle **hamesha** "✓ Telegram par bhi bhej diya" dikhati thi, chahe send fail ho jaye.
- `notifyAll` ab `{ sent, failed, errors }` deta he (pehle sirf `sent` array tha aur Telegram ka error chup chaap nigal liya jata tha).
- Manual check ka nateeja tracker par **`lastNotify`** mein save hota he (sent, failed, reached, errors) aur `/track` response mein bhi aata he.
- App ka toast ab sach likhta he: **"✓ Check ho gaya — Telegram 2 chat par bheja"**, ya **"⚠ Telegram fail: chat not found"**, ya **"⚠ Telegram nahi gaya — koi allowed chat nahi mila (bot par /start karein)"**.
- Naya **📨 Telegram test** button (Tracked routes ke head par): ek tap par sab allowed chats ko test message — token/chat IDs theek hain ya nahi, foran pata chal jata he.
- **2 ghante (120)** aur **5 ghante (300)** ke interval aur **"Kab tak & interval"** ka alag tab pehle se mojood hain (v3.19) — barqarar.
- CI red hone ki wajah embedded worker copy aur `pricebot-worker.js` ke comments ka farq tha — dono ek jaisay kar diye, ab release checks saaf honi chahiye.
- Worker status page **v3.20**; Cloudflare build push par khud chalta he.

## Price Tracker fixes: "Check now" ka Telegram, 2/5 ghante, alag tab (v3.19)
- **"Check now" par Telegram nahi aata tha — bug tha.** Worker manual check ko `quiet: true` se chalata tha, is liye target/drop alert chup chaap skip ho jata tha, aur price 3% se kam badle to kuch bhi nahi jata. Ab manual check hamesha **"Abhi ka price"** ka message bhejta he (chaahe price na badla ho), aur us se alert cooldown bhi nahi bigarta.
- **Check every: 2 ghante aur 5 ghante** add (5 min se 5 ghante tak: 5 · 10 · 15 · 30 · 60 (1 ghanta) · 120 (2 ghante) · 180 (3 ghante) · 300 (5 ghante)). Telegram message aur tracker chip dono ab "har 2 ghante" likhte hain, "har 120 min" nahi.
- **"Kab tak" ab apna alag tab** he — form do tabs mein: **Route & price** aur **Kab tak & interval**. Tab badalne par typed values zinda rehti hain (sirf show/hide, re-render nahi).
- **Check now** ka toast ab saaf batata he: "✓ Price check ho gaya — Telegram par bhi bhej diya", ya tracker ka asal error dikhata he.
- Tracker list ka chip bhi "har 2 ghante" style mein.
- Sirf app + worker ka badlav; Worker **redeploy** zaroori he (Cloudflare Workers Builds push par khud deploy kar deta he).
- Tracker ki baqi cheezein waisi hi: 5 min minimum, rozana budget ka 25 search manual ke liye bachaya jata he, alert 20 minute mein ek, price 3%+ girne par alert, aur flight filer ke liye 3 missing checks par warning.

## Price Tracker ke "kab tak" + Sales se expiry hata (v3.18)
- **Tracker ab "kb tak" poochta he.** Price Tracker tab ke form mein naya sawal: **Kab tak track karein?** — *Jab tak main band na karun* (default), *Aaj raat 11 baje tak*, *1 / 3 / 7 din ke liye*, ya *Kisi din tak…* (date input — us din raat 11 baje tak). Chuni waqt ke record par save hota he.
- **Waqt guzarne par Worker tracker khud khatam kar deta he** (record + index dono) — koi reminder ya alert nahi, user ne khud limit di ti he. Row par **🏁 aaj/kal/date + waqt tak** chip dikhta he, aur har Telegram alert ke neeche `band … PKT` bhi likha hota he.
- **60 din ka cap** — zyada waqt maangne par Worker 60 din par hi save karta he; guzra hua waqt reject (app bina network call ke tod deta he).
- **Fare card ka button:** Price Lookup ke fare par ab **📈 Track this flight price** — dabane par Price Tracker tab khulta he jahan route/date/flight/party pehle se bhar hote hain.
- **Sales par koi tracking/expiry cheez nahi reh gayi.** v3.17 ka sale-form ka ⏰ Booking expiry dabba, row menu ka **⏰ Expiry** item, ticket object ki `expAt`/`expRemId`/`expTg` fields aur register search ka expiry match — sab hata diya. Tracker sirf apne tab par he; sale register par kuch nazar nahi aata.
- **Worker + app dono badle** (worker: `until` field + cron mein expired-tracker cleanup + alert text; app: form/question, chip, label, expiry code delete).
## Price Tracker + booking expiry reminders (v3.17)
- **Naya tab — 📈 Price Tracker.** Route (maslan **KHI ? UET**), date, aur chaho to flight number ya target price save karein. Ab app band ho, phone so jaye, ya laptop shut ho — **Worker khud** har 5 minute Meezab se price check karta rehta he. **Worker + app dono badle.**
  - Card par: aakhri price, pehli price se **% farq** (? gir / ? charh), chhota **sparkline**, aakhri check kab hua, agla check kab, flight, target hit hone par hara `?` chip.
  - Buttons: **↻ Check now**, **✏ Edit**, **⏸ Pause / ▶ Resume**, **✕ Stop**.
  - Flight number khali chhor dein to poore route ka **sab se sasta** fare track hota he; flight likh dein to sirf wahi flight.
- **Alerts Telegram par** (Settings → Telegram on hona chahiye): price **3%+ gire** to foran, ya **target poora** ho to foran. Warna 20 minute mein ek se zyada alert nahi (spam se bachne ke liye).
- **Meezab budget ka khayal:** har check ek poori search he (25-60 second). Is liye **5 minute minimum** interval he, ek waqt par **12 trackers**, aur cron ek minute mein sirf **2** trackers check karta he. Bache hue searches **25 se kam** hon to tracker ruk jata he — taake manual Price Lookup ke liye budget bacha rahe. Aaj ka budget tracker card par bhi likha aata he.
- **Fare card se seedha track:** Price Lookup ke kisi bhi fare par **📈 Track this fare** — route, date, flight aur party (adults) khud bhar jate hain, bas target daal kar Start dabayein.
- **Booking expiry reminder (sale form):** naya **⏰ Booking expiry** dabba — **date + time** (PNR kitne baje expire hota he). Save karne par Telegram par **1 ghanta** aur **30 minute** pehle alarm chala jata he. Waise hi row menu mein **⏰ Expiry** se baad mein set/badlein ya hata dein (khali chhorne par reminder cancel). Ticket delete karne par reminder bhi khud cancel hota he.
  - Ye waqt register ki Status column mein **nahi** dikhaya jata — sirf reminder ke liye mehfooz rehta he.
- Tracker ka data Worker ke apne store mein he (alag `track:` prefix, Ignav watches ke sath mix nahi hota) — app ka backup isse mutasir nahi hota.

## Partial payment ab darj ho sakti he (v3.16)
- **Masla:** `t.payments` (ticket ki payments) app mein 6 jagah **parhi** ja rahi thi — Pending Payments, Clients history, register ka `due`, CSV ka `Received`/`Remaining` — magar **likhne ka koi tareeqa nahi tha**. Client aadhi raqam de de to sirf poora "✔ Paid" dabana parta tha, jis se hisaab ghalat ho jata tha.
- **Ab:** register ki kisi bhi row par tap/⋯ → **💵 Payment** (aur Pending Payments card mein har unpaid ticket par bhi). Amount aur tareekh poochhi jati he, entry `payments` mein jud jati he.
  - Baqi = **net payable − jama shuda** (adj ke baad wala net).
  - Poori raqam aa jaye to ticket khud **Paid** ho jati he; warna **Unpaid** hi rehti he aur Pending mein `due` ke sath `Received … of …` dikhta he.
  - Register ke Status column mein bhi `due Rs …` / received amount nazar aata he.
- **Misal:** Change sale net 13,500 par 4,000 jama → baqi **9,500**; purani ticket ke 32,000 ke sath client ka total pending **41,500**.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Deep check: Change / adj edge cases + mobile register (v3.15)
- **Purani ticket dobara link nahi ho sakti.** Ek Change sale agar pehle se kisi ticket se juri he to list mein `⚠ already linked` dikhta he, hint laal warning deta he, aur save rok diya jata he — warna us ticket ka outstanding do dafa pending mein count hota.
- **Ticket delete karne par link saaf hota he.** Jo change sales us ticket se juri thin, un ka `prevId` hata diya jata he (confirm box pehle un ka naam bata deta he); "Clean up sales" (duplicates) par bhi wahi.
- **Adj sirf Change par.** Kind `Ticket` / `Umrah` / `Hajj` ho to bacha hua `adj` numbers ko chhoota hi nahi (case-insensitive: `change`, ` Change ` bhi). Purane records jinka kind khali he, un par adj ihtiyat se mana jata he.
- **Adj apne aap nahi bharta.** Purani sale chunne par adj khaali rehta he (adj refund credit he, jo aksar purani ticket ke baqi se mukhtalif hota he — misal baqi 32,000 magar adj 19,500). Hint mein chhota **`adj = baqi`** button he, chahein to ek tap se bhar lein.
- **Change sale bina Sale price save nahi hoti** (pehle adj chup-chaap 0 ho jata tha).
- **Register totals search ke sath sahi.** Search par nikle rows ka adjusted cost total ab effective cost (`adj` ke baad) se banta he — gross se nahi.
- **Profit hamesha `Sale − Cost`.** Hint, dashboard, monthly profit, report aur CSV sab ek hi formula par; adj profit ko chhoota nahi.
- **Mobile register:** `adj −19,500 = 13,500` line chhoti screens (700px se neeche) par wrap hoti he — pehle cell se bahar nikal kar baqi columns par chadh jati thi.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Change sale: previous ticket adj (v3.14)
- **Sale type → Change** chunte hi naya dabba khulta he: **Previous ticket (PNR / sale)** aur **Previous Ticket Adj (Rs)**.
- Purani sale list se chunein (client ke naam se filter hoti he) ya sirf PNR/reference likh dein. Form ke neeche foran dikhta he: **client ko dena he kitna**, supplier ka effective cost, profit, purani ticket ka baqi aur client ka **total pending**.
- Hisaab:
  - **net payable = Sale price − adj** (client ko dena he)
  - **effective cost = Cost price − adj** (supplier ko dena he)
  - **profit = net payable − effective cost = Sale price − Cost price**
- Matlab adj purani ticket se aata he, is liye sale aur supplier cost **dono** se minus hota he — **profit par asar nahi padta**. Cost price mein supplier ka poora (gross) price likhein.
- Misal: purani ticket ka baqi 32,000 + naya ticket 33,000 − adj 19,500 = **naya net 13,500**; client ka total pending **45,500**. Cost 30,000 tha to effective cost 10,500 aur profit **3,000** (purani ticket ka 4,000 + naya 3,000 = 7,000).
- Agar purani ticket paid thi to sirf **13,500** pending rehta he.
- Sales register, Pending Payments, Clients history, Monthly Accounts profit, report aur CSV (naye columns: `Sale price`, `Adj`, `Cost price`, `Previous ticket`) sab isi hisaab par hain.
- Register mein **upar actual (gross) cost aur sale** dikhte hain, aur us ke **neeche chhoti si `adj −19,500 = 13,500` line**. Total row bhi gross dikhati he, neeche adjusted total.
- Edit (✏) se adj baad mein badal sakte hain — sale price se zyada nahi ho sakti.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Portal names phone par poore (v3.09)
- v3.08 ka portal card phones par bhi 2-column grid mein tha, is liye 320px screen par har naam ko ~56px milte thay aur `Meezab B2B` → `Meez…` kat jata tha.
- Ab **600px se neeche single column** he, is liye har portal ka poora naam nazar aata he. Tablet/laptop par 2-column layout waisa hi he.
- Sirf CSS ka change — Worker redeploy ki zaroorat nahi.

## Airline / B2B portals — ek hi jagah (v3.08)
- **PNR Lookup** tab ke sab se upar naya card **🔗 Airline portals**: **Meezab B2B, Fly Jinnah, AirBlue, AirSial, PIA, Serene Air** — ek tap se seedha portal khul jata he (browser mein; koi server request nahi, is liye IP ban ka koi khatra nahi).
- **✎** se kisi bhi portal ka pata apne **agent login** ka daal dein, **✕** se hata dein, **＋ Add portal** se naya (maslan Sabre / Amadeus / koi aur B2B) add karein, **Reset list** se default wapas. List `settings.portals` mein save hoti he, is liye backup/sync ke sath doosre device par bhi aa jati he.
- **Site mobile par na khule to:** browser ke menu se **Request desktop website** (Safari: `aA` → Request Desktop Website; Chrome: `⋮` → Desktop site). Isi se airline ki desktop site khulti he — yahi asli "jugar" he.
- **Jo nahi kiya:** worker se site ko desktop browser bana kar proxy karna — login/cookies/2FA wahan tootti hein, airline ka bot-protection block kar deta he, aur ye un ke terms ke khilaf bhi he. Is liye app sirf seedha link kholta he.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## From / To boxes ek line par (v3.07)
- **Masla:** Price Lookup ka **To** box **From** se thora neeche lagta tha. Wajah: row `align-items:flex-end` par thi, aur har box ke neeche `airport-info` (airport ka naam) hota he — jis column mein wo line lambi/do-line ho jati, us ka input upar khisak jata tha, doosra neeche.
- **Fix:** row ab `align-items:flex-start` par he, is liye label aur input dono hamesha ek line par rehte hain; airport ki line neeche apni jagah rehti he (aur ek hi line mein ellipsis `…` ho jati he, height nahi badalti).
- **Arrow (→)** ab fixed 26px column he (pehle poori width ka hissa le raha tha) aur row ke beech mein vertically centered he. Multi-city leg 2 wali row par bhi wahi fix.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Base fare ka tooltip bhi hata diya (v3.06)
- Pehle price par **long-press** karne se `base fare PKR …` wala tooltip aata tha — ab wo **hata diya** he (Meezab aur Ignav dono cards se). Is liye kisi bhi tarah asli fare nazar nahi aata, sirf aap ka final price.
- Tax panel ki English hint se bhi "long-press" wali line nikal di.
- **Asli fare khud dekhna ho** to Tax `0` kar ke search karein (phir wahi price base fare hota he), ya Meezab portal par dekh lein.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Tax (pehle "commission") — arrow se minimise hone wala panel (v3.05)
- Naam badal diya: Price Lookup ke form mein ab **“Tax / person (Rs)”** he — lafz "commission" kahin nazar nahi aata.
- Ye ab ek **collapsible panel** he (▸ / ▾ arrow): **default band** rehta he, aur band hone par **raqam bhi nazar nahi aati** — sirf `✓ set` ya `add` dikhta he. Is liye screenshot mein na naam aata he na tax ki raqam.
- Panel ke andar wali line ab **English** mein: *“Tax is already added to every price below - it is never shown as a separate line, so a screenshot does not reveal it. To see the base fare, long-press a price.”*
- Har price (fare cards, airline strip, country list, per-passenger breakdown, Copy fare) mein tax pehle se shamil he — v3.03 jaisa hi. Price par long-press karne se `base fare` milta he.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Commission price mein hi shamil — screenshot par markup nazar nahi aata (v3.04)
- Pehle fare aur selling price **do alag number** dikhte thay (`fare` + green `sell · +20,000 comm`) — screenshot bhejne par client ko markup nazar aa jata tha.
- Ab **sirf ek hi price** dikhta he, jis mein commission pehle se juda hua he. Kahin bhi "commission", "sell" ya "markup" ka lafz nahi aata.
- Ye price **fare cards**, **airline strip**, **country list**, **per-passenger breakdown** (per person + party total) aur **Copy fare** ke text — sab jagah wahi final price he.
- Asli fare pehle price par long-press karne se milta tha — **v3.06 se wo tooltip hata diya he** (khud dekhna ho to Tax 0 kar ke search karein).
- Tax box (`Tax / person (Rs)`); `0` = sirf fare. (v3.05 mein ye collapsible panel ho gaya he aur amount bhi chhupi rehti he.)
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Price Lookup: apna commission + selling price (v3.03)
- Price Lookup ke form mein naya box **“Commission / person (Rs)”** — jo commission aap per passenger lena chahte hain wo likh dein.
- Har fare card par ab do number: **fare** (Meezab ka) aur us ke neeche **green selling price** = fare + (commission × passengers), sath chhota note `sell · +20,000 comm`.
- Wohi selling price **airline strip** aur **country list** (har airport ke sab se saste fare) mein bhi — wahan base fare tooltip (long-press) mein milta he.
- Results ke header mein ek line: `commission 5,000/person (4 pax = 20,000)`.
- Ignav search ke cards par bhi wahi treatment, aur **Copy fare** ka text ab **selling price** ke sath copy hota he (client ko seedha bhejne ke liye).
- Commission `settings.mezCommission` mein save hota he, is liye har device/backup ke sath chala jata he. `0` (ya khali) = sirf fare, jaisa pehle tha.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Price Lookup: laptop par poori width (v3.02)
- Price Lookup (Fares) tab ab Sales register ki tarah laptop/desktop par poori width leta he (1000px se bari screen par container 1680px tak) - form aur fare cards poori screen par phailte hain, koi bekar khali jagah nahi.
- Sirf Fares tab badla he; baqi tabs (Dashboard, Month, Settings waghera) ki width waisi hi he. Mobile par kuch nahi badla - wahan pehle se full width he.

## Price Lookup: spinner, refresh aur country search fixes (v3.01)
- Search fail hone par spinner atakna band - error saaf dikhta he aur dobara try kiya ja sakta he.
- Auto-refresh poora results wipe nahi karta; nayi list aane tak purani dikhti rehti he.
- Country search par cabin aur non-stop filter sahi apply hote hain.
- Poll 502 par retry + manual split button (bari round trip load ke liye).
- Search deadline: client timeout se pehle search khud ruk kar jo mila wo dikha deta he, aur header chip reset ho jata he.


## Price Lookup: koi fare nahi chhootta + loading bar (v3.00)
- **Early exit hata diya:** v2.99 mein poll count rukne par ruk jata tha — us se kuch suppliers ke fares chhoot sakte thay. Ab worker portal ke **"search complete"** ka poora intezar karta he (45 polls tak), is liye **saare results** aate hain. `partial` ka label sirf tab aata he jab portal khud waqt par mukammal na ho (us mein bhi koi page skip nahi hota).
- **Pages: saare** — default 10 (2,500 options), `MEZ_MAX_PAGES` se 20 tak. Pehle 6 par cap tha, jo fares kaat deta tha.
- **3 pages ka batch:** 10 pages ek saath parse karne se memory/CPU limit (503) tootti thi aur bari round trip load hi nahi hoti thi. Ab har batch normalize ho kar raw JSON chhod di jati he — sab pages aate hain, koi fare drop nahi hota, aur 503 ka khatra kam.
- **Fancy compact loading bar:** search ke doran lambi "Login ho raha he… 20-60 second" line ki jagah ab **chalti hui patli bar + guzra hua waqt (0s, 1s, 2s…)** aur ek chhoti note.
- **Waqt am/pm mein** (departure/arrival/segments/fetched) aur **auto-refresh default ON (5 minute)** — dono v2.99 se barqarar.
- Purana note: round trip **portal par hi 40–70 second** leta he, is liye abhi bhi utna waqt lag sakta he — magar ab poora data aata he aur progress bar chalti dikhti he.

## Price Lookup speed + am/pm + auto-refresh on (v2.99)
- **Round trip / multi-city tez:** portal ke completion poll ab `isSearchCompleted` ka hamesha intezar nahi karta — option count 5 polls tak na badle to jo fares aa chuki hain wohi wapas aati hain (jawab `partial` label ke sath, fares live hote hain). Isse round trip **~20–30 second** tez.
- **Pages 10 → 6 (1500 fares, saste pehle):** 2429 options wali round trip par 10 pages ki jagah 6 — time aur CPU dono kam. `MEZ_MAX_PAGES` se 12 tak barhaya ja sakta he.
- **JSON budget 40 MB → 24 MB** — badi round trip par memory/CPU limit (503) ka khatra kam.
- **Live timer:** search ke doran card par **guzra hua waqt (0s, 1s, 2s…)** dikhta he, is liye 40–70 second wali round trip bhi "atki hui" nahi lagti. Note mein saaf likha he: one-way 20–40s, round trip 40–70s.
- **Waqt ab am/pm mein:** Meezab ke cards par departure/arrival aur "fetched" time pehle 24-ghante (`23:05`) mein tha — ab `11:05 pm` / `10:05 am` (phone ke 12/24-ghante ki setting se azad).
- **Auto-refresh dobara default ON (5 minute):** pehle (v2.97) default off kar diya gaya tha; ab budget 4000/din he, is liye 5 minute wala auto-refresh wapas default he — Off/3/5/10 select se band ya badla ja sakta he, aur manual ↻ hamesha chalta he.
- Worker + app dono badle — Worker Cloudflare Workers Builds se khud deploy ho jata he.

## Price Lookup: chhota form, pichhli search yaad, stale prices saaf (v2.98)
- **Form chhota:** Trip / Class / Adults / Children / Infants — ye 6 boxes ab ek **summary line** ke peeche hain (`One-way · Economy · 1 adult`). Tap karne par khulte hain; form ab sirf From/To, dates, Non-stop aur Search tak reh jata he.
- **Aakhri search poora yaad:** pehle sirf From/To aur date yaad rehte thay, is liye tab switch ya reload par trip, class aur passengers default ho jate thay. Ab poora form `sessionStorage` mein rehta he (route/date ke saath trip, class, adults/children/infants aur Non-stop bhi).
- **Airport suggestions Price Lookup mein:** From/To (aur multi-city leg 2) par ab wahi airport/country dropdown chalta he jo invoice mein tha — IATA code haath se likhne ki zaroorat nahi.
- **Infants validation:** infants (lap + seat) adults se zyada nahi ho sakte — galat party par saaf message, portal par lambi fail search se pehle.
- **Purana data saaf:** portal fail hone par worker pichla mukammal jawab `stale: true` ke saath deta he; app ab header mein **"purana data — live search fail hui"** laal note dikhata he (pehle purane prices live lagte thay).
- **Country search bhi yaad:** country se search karne par bhi aakhri search save hota he (pehle sirf single-airport).
- **Budget line:** help mein ab 4000 search/din (worker ka naya default; practically unlimited) — auto-refresh cap 240/din.
- Sirf app ka change (worker v2.96 ke saath chalta he) — Worker redeploy ki zaroorat nahi.

## Price Lookup: search ke baad results foran samne, aur chhote fixes (v2.97)
- **Nested cards khatam:** Meezab ke results aur country panel form card ke **andar** bante thay (card ke andar card — double padding/shadow). Ab dono form ke neeche apne cards mein aate hain, poori width par.
- **Search ke baad khud results tak scroll:** button dabane ke baad results screen se neeche hote thay, is liye lagta tha kuch hua hi nahi. Ab search mukammal hote hi page results par pahunch jata he (refresh/paging par nahi).
- **Validation messages apni jagah:** "From ka IATA code dalein", "Return date chunein" waghera pehle results area mein jate thay (jo ab neeche alag card he). Ab button ke neeche hi laal line mein aate hain, purane results mehfooz rehte hain.
- **Auto-refresh ab default OFF:** pehle har search ke baad 5 minute par khud refresh hota tha — Meezab ka rozana budget chup chaap khatam hone ki yahi wajah thi. Ab user khud chunta he (Off / 3 / 5 / 10 min); manual ↻ hamesha chalta he.
- **Ignav button sirf setup hone par:** Ignav proxy/key set na ho to wo button chhupa rehta he (pehle dabane par error aata tha).
- **Aakhri search yaad:** app dobara kholne par From/To aur departure date pichhli search ke aa jate hain (date guzar gayi ho to aaj).
- **Enter se search:** From/To mein Enter dabane par seedha Meezab search; airport list khuli ho to Enter pehle wahi row chunta he.
- Hint line chhoti kar di (3 lines se 1).

## Invoice: jaane/ aane ka checked-in weight alag (v2.95)
- Round trip invoice mein ab 2 separate weight boxes hain: Checked-in bag - going (kg) aur Checked-in bag - return (kg).
- Jab jaane aur aane ka weight alag ho (e.g. jaana 20 kg, aana 30 kg; ya jaana NIL, aana 20 kg), to wo weight ab common Checked-in line ki jagah apne apne flight block ke neeche print hota he (CHECKED-IN BAG: 20 kg / NIL).
- Return box khali chhor do = going jaisa; 0 = NIL.
- One-way invoice mein return box hidden he, sirf going weight print hota he.
- Tests: node tests/invoice_weight_checks.mjs

## Mobile header: duplicate plane button hata diya (v2.94)

## Mobile header: duplicate plane button hata diya (v2.94)
- Phone par header ke andar wala airplane button (Price Lookup shortcut) hata diya - wo neeche ki quick bar ke **beech mein** already maujood he, is liye duplicate tha.
- Sirf `max-width: 860px` par hidden he (wahi breakpoint jahan bottom quick bar dikhti he). Laptop/desktop par header ka button pehle ki tarah kaam karta he.
- Koi naya button nahi chhupa: bottom bar ka center plane, menu aur baqi tabs sab jaisa tha waisa he.

## Ticket files: PC par upload, mobile par foran (v2.92)
- **Masla:** PC se ticket file upload hoti thi lekin mobile ki list mein nahi aati thi — pull/push dono karne ke baad bhi.
- **Asli wajah:** sync poora state last-writer-wins tha. Jab mobile ka apna data naya hota (`__ts` bara), pull **poora remote data chhor deta** tha ("Local data is newer…"), aur file list bhi usi state ka hissa thi. Doosri taraf: mobile ka purana push PC ki nayi file ko GitHub par dhak deta tha. Is liye file kabhi mobile tak nahi pohanchti thi.
- **Ab:** ticket files ka **union** hota hai — local + GitHub dono lists mila kar ek list banti he, chahe is device ka data naya ho ya purana. Pull ke baad union wapas GitHub par bhi chala jata hai, is liye dono taraf same list rehti he.
- **Delete:** naya `fileTombstones` (id + waqt) — delete ki hui file sync se wapas zinda nahi hoti, kisi bhi device se delete ho.
- Files tab par **"Last GitHub check"** line: kis waqt check hua aur kya nateeja aaya (nayi files mili / local list dikhayi ja rahi he).
- **Missing file recovery (v2.93):** agar kisi file ki metadata kho jaye (purane version ka pull), to Files tab GitHub ke `tickets/` folder ko list kar ke wo entry khud wapas bana deta he — naam, PNR (file name se), size, date aur sha ke saath. Delete ki hui files tombstones ki wajah se wapas nahi aatin.
- Tests: `node tests/file_sync_pull.mjs` (asli `syncPull` fake GitHub ke saath: local newer + remote file, union push, dono taraf ke tombstones, bekaar push nahi), `node tests/file_sync_checks.mjs` (union/tombstone helpers, 300 cap) aur `node tests/file_recover_checks.mjs` (folder se missing entry recovery).

## Meezab baggage: har direction ka alag + total (v2.91)
- **Pehle:** card par sirf ek number — `Baggage 50 kg` (aur pounds/pieces bhi ghalat "kg" ban jate the).
- **Ab portal jaisa:** `BaggageInfoADT` ke har segment ka token alag parse hota he (kg / lb / pieces), aur card par har direction ka allowance + total aata he:
  - `Baggage 25 kg + 25 kg = 50 kg` (outbound 25 kg · return 25 kg)
  - `Baggage 50 lb + 50 lb = 100 lb`
  - `Baggage 1 piece + 1 piece = 2 pieces`
  - Ek taraf bag na ho to: `Baggage 20 kg + no bag` ya `Baggage no bag + 30 kg`
  - Chip par hover (desktop) se poora split: `outbound 25 kg · return 25 kg`.
- **Fare/weight options:** Meezab har `FlightOption` ko alag fare row bhejta he, is liye ek hi flight ke **Economy Basic 25 kg vs Economy Convenience 30 kg**, `value` / `flexi` / `xtra` jaise options apne apne price aur baggage ke sath alag cards mein aate hain.
- **Baggage filter fix:** `Checked bag` / `Cabin only` ab lb aur pieces ko bhi samajhta he (`50Pounds`, `1Pieces` pehle "kg" gin raha tha). Unknown baggage dono filters se bahar rehta he.
- Per-passenger breakdown table mein bhi har group ka apna baggage wahi per-direction label se dikhta he.
- Tests: `node tests/meezab_ui_checks.mjs` — naye cases round trip 25+25=50, pounds 50+50=100, pieces 1+1=2, aur ek-taraf-no-bag ke liye.

## Auto-deploy from GitHub (Workers Builds)
- Worker `ab-travels-ignav` ab GitHub se juda he: Cloudflare → Workers & Pages → ab-travels-ignav → Settings → **Builds**.
  - Git account/repo: `abtravels/travel-office-hisab`, branch **main**
  - Build command: **khali** (koi build step nahi)
  - Deploy command: **`npx wrangler deploy -c wrangler.pricebot.toml`**
  - Root directory: `/`
- Matlab: `main` par har push ke baad Cloudflare khud Worker deploy kar deta he (log: Deployments → build). Haath se code paste/redeploy ki zaroorat nahi.
- Bindings, secrets aur cron `wrangler.pricebot.toml` se aate hain; KV (`KV` → `abtravels-bot`), Durable Object (`WATCH_INDEX_DO`) aur secrets dashboard par waise hi rehte hain.
- Deploy ke baad `https://ab-travels-ignav.umair5075.workers.dev/` par version string check kar lein.

## Meezab: round trip, multi-city aur cabin (v2.88)
- **Masla:** Meezab sirf one-way par chalta tha; round trip aur multi-city ke liye app saaf mana kar deta tha ("Meezab currently supports one-way, Economy").
- **Asli wajah:** portal ke apne search form se request capture ki gayi (Blazor WebAssembly hai, is liye browser ka `fetch`/XHR hook lagaya). Portal `FlightDirection` mein **`Round`** bhejta he (RoundTrip nahi) aur multi-city ke liye `MultiCityArray: [{DepartureDate, FromIATA, ToIATA}, …]` bhejta he. Ab worker bilkul wohi body banata he.
- **Live verify (16 Nov 2026):** KHI–DXB round trip 10→20 Dec = 2,429 options, 2 legs, **88,720 PKR**; KHI–DXB–LHR multi-city = 1,317 options, **96,754 PKR**.
- **Cabin:** portal Economy / PremiumEconomy / Business / First accept karta he, magar fares hamesha Economy class ke aate hain (KHI–DXB aur KHI–LHR par Business/First ki prices bilkul wohi thin). Is liye app choice deta he magar saaf note likhta he ke portal ke fares Economy-class hote hain — jhooti filtering nahi.
- **Worker:** `mezQuery` ab `trip_type` / `return_date` / `legs` / `cabin_class` leta he (4 legs tak), date-order aur From/To validation ke sath. Naye helpers `mezPortalQuery`, `mezTraceId` (16-byte base64), `mezPkNow` (+05:00). Har fare mein `trip_type`, `cabin`, aur `legs[]` (har leg ke apne segments/duration/stops) — top-level fields pehli leg ke, `duration_min` saari legs ka jod. Duplicate fare key ab saari legs dekhti he, is liye same price + different return flight alag rehta he. Reply mein `trip: {type, cabin, legs}`. Cache key `meezab:fare:v2:`.
- **App:** card par har leg alag — **Outbound / Return** (round trip) ya **Leg 1 / Leg 2 …** (multi-city); header mein poora route (`KHI → DXB → LHR`), trip ka naam, dono/teeno dates aur cabin. Adhoori search resume karte waqt trip type, return date, leg 2 aur class bhi wapas set hote hain. Country search pehle ki tarah sirf one-way he.
- **Worker redeploy zaroori:** `npx wrangler deploy -c wrangler.pricebot.toml` (Workers Builds push par khud bhi kar deta he).

## Meezab: poora party (adult + child + infant) ek hi search mein (v2.86)
- Pehle Meezab sirf **1 adult** par chalta tha (worker mein hard block). Ab portal jaisa **poora party**: **10 adult tak, 10 children tak, 10 infants tak** (lap + seat mila kar) — har group ka apna fare bhi aata he.
- **Kya badla:**
  - Worker `mezQuery()` ka 1-adult block gaya; body se `adults` / `children` / `infants_on_lap` / `infants_in_seat` le kar har passenger ka apna object banaya jata he (`AdultClsArray` / `ChildClsArray` / `InfantClsArray`, unique reference IDs ke sath).
  - Hadd se zyada bhejne par saaf error (maslan "Meezab mein adult 1 se 10 tak ho sakte hain").
  - Har fare mein ab **per-person fares** aate hain: `per_adult`, `per_child`, `per_infant`, `party_sum`, aur per-group baggage (`baggage_child`, `baggage_infant`). Reply mein top-level `pax` block bhi.
  - `amount` **poore party ka total** he (portal jaisa) — 1 adult par pehle jaisa hi.
- **App:**
  - Price Lookup ke passenger boxes ab **10 tak** (Adults 1–10, Children 0–10, Infants lap/seat 0–10).
  - Fare card par total + "total · 2 adults + 1 child" label; **"Per-passenger breakdown"** dabane par table khulti he: per person fare × count, group total, baggage. `Per-person fares markup ke baad ke agent fares hain` ka note bhi.
  - Header mein party dikhta he (pehle hardcoded "1 adult" tha). Single adult par card waisa hi simple rehta he — breakdown nahi.
  - Adhoori search resume karte waqt passenger counts bhi wapas set hote hain; country search bhi party ke hisaab se chalti he.
- **Live verify (16 Nov 2026):** 2 adult + 1 child + 1 infant = **186,747 PKR** total, per-person fares ka jod bilkul wohi; 10 adult / 10 child / 10 infant 33 second mein mukammal.
- **Worker redeploy zaroori:** `npx wrangler deploy -c wrangler.pricebot.toml` (Workers Builds push par khud bhi kar deta he).

## Airport dropdown ke 3 bache hue bugs (v2.86)
- **Ek saath do lists:** ek field se doosri par jaate waqt purani list `body` par pari reh jati thi (naya mount hone se uska reference kho jata tha aur wo kabhi band nahi hoti thi). Ab har list par `data-ab-drop` he — naya mount hone se pehle purani hata di jati he, aur doosri field khulte waqt pehli band ho jati he.
- **Tab switch par list float karti rehti thi:** `switchTab()` aur `render()` shuru mein `abDropCloseAll()` — app dobara banne se pehle list saaf.
- **Tez tap par nayi list band ho jati thi:** `blur` ka 200ms timer sirf wohi list band karta he jo us waqt khuli thi (`if(drop === mine)`), is liye nayi khuli list bachi rehti he.

## Meezab budget barha diya: 60 → 150 (v2.85)
- Rozana Meezab budget ab **150 searches/din** he (pehle 60). Counter wahi **00:00 UTC = 05:00 PKT** par reset hota he.
- **Auto-refresh** cap bhi **15 → 40 per din** (per browser), kyunke budget barh gaya he. Manual ↻ par koi cap nahi.
- App help line aur `budget x/150 bache` isi hisaab se update.
- `MEZ_DAILY_CAP` variable se ise aur barha/ghata sakte hain (Settings → Variables), code chhede baghair.
- **Worker redeploy zaroori:** `npx wrangler deploy -c wrangler.pricebot.toml` — warna deployed worker purana 60 ka cap hi rakhega. Settings card ka copy-code bhi v2.85 se sync he.

## Dropdown + Meezab budget: adhoora kaam mukammal (v2.84)
- **Airport suggestion dropdown (v2.84):** ye kaam adhoora chhoda gaya tha — sirf "Airports load ho rahi hain…" wali list bahar tap par band hoti thi, **asli list** (jo matches dikhati he) khuli reh jati thi aur agle box ke neeche chhup jati thi.
- Ab ek hi dropdown manager (`abDropMount`) sab airport fields aur client-name suggestions ke liye: list **`document.body` par `fixed`** banti he, is liye card ke overflow se clip nahi hoti; jagah kam ho to input ke **oper** khulti he, warna neeche; screen ke kinare se chipakti nahi.
- **Bahar tap / scroll / resize:** bahar tap karne par foran band, page scroll ya phone ghumane par input ke sath khud adjust. (Pehle scroll karne par list input se alag ho jati thi.)
- **Keyboard bug fix:** dropdown mein country row pehle aati he, is liye Arrow Down/Up se highlight aur Enter se pick **ek row shift** ho rahe thay (country row ki wajah se). Ab `rowOffset` ke sath sahi row highlight/select hoti he.
- **Meezab ka "search limit reached" (v2.84)** — asal mein Worker ka apna **rozana budget** tha (60 searches/din, v2.85 se **150**), jo pehle pre-check par hi kat jata tha:
  - Cap ab `MEZ_DAILY_CAP` variable se badla ja sakta he (default **150**); counter **00:00 UTC = 05:00 PKT** par reset hota he.
  - **Unit ab search shuru hone par** katta he (portal ne Search ID diya), login/HTTP fail par budget zaya nahi hota.
  - Worker replies mein `budget: {cap, used, left, reset_at}` aata he; app results ke header mein **"budget 41/60 bache"** dikhata he.
  - Limit khatam hone par 429 ka **saaf message + reset waqt** aur country rows mein chhota note; **auto-refresh** khud band reh jata he (429 nahi karta).
  - **Cache 5 → 10 minute** — wohi route dobara search karne par budget kharch nahi hota. Country search har airport par ek search leti he, is liye help line mein likha he.
- **Worker redeploy zaroori:** `npx wrangler deploy -c wrangler.pricebot.toml` (naya budget code + 429 details live karne ke liye). Settings card ka copy-code bhi isi version se sync he.

## Price Lookup compact (v2.83)
- **Lambi hidayat chhup gayi:** tab ke oper wala bara paragraph ab ek chhoti **“Setup / help”** line hai jo tap karne par khulti hai (agar Worker URL set nahi he to wo khud “⚠ Setup baqi he” dikhati hai). Price note, country-search tareeqa aur Ignav ki request-limit wali baat usi ke andar.
- **Market (currency) box hata diya** — search hamesha **PKR** mein hoti hai.
- **Max results box hata diya** — Ignav se jo aayen sab dikhte hain (pehle 15 par kat jate thay). Meezab pehle se hi saari flights laata hai.
- **Chhote boxes:** Trip / Class / Adults / Children / Infants ab compact (34px) aur phone par bhi **3 columns ke grid** mein — From, To aur dates hi bare hain. Pehle ye 6 boxes phone par poori screen le lete thay.
- Trip select dates ki row se nikal kar compact row mein — desktop par date boxes ka overflow bhi theek ho gaya (ab sirf 2 date boxes barabar column mein).
- **⇄ Swap** button — ek tap mein From/To badal jate hain (reverse route search ke liye).
- `faMax` / `faMarket` ka purana saved form data chup chaap ignore hota hai, is liye purani settings kharab nahi hotin.
- Chhoti safai: band (disabled) field ab halka dikhta hai — maslan one-way par "Return date" saaf pata chalta hai ke wo kaam nahi kar raha. Touch par tap ke baad button/summary par blue focus ring chipki nahi rehti.
- Sirf app ka change — Worker redeploy ki zaroorat nahi.

## Tab badalne par search band nahi hoti (v2.82)
- **Masla:** Meezab (ya Ignav) ki search chal rahi ho aur aap doosra tab khol lein, to wapas aane par results ka dabba **khaali** milta tha — search adhoori lagti thi. Wajah: `render()` har tab change par poora page `innerHTML` se dobara banata he, is liye "search chal rahi he" ka card aur error message — jo sirf DOM mein the — mit jate the.
- **Fix:** search ka haal ab DOM ke bajaye app ki state mein rehta he (`MEZ.stage`, `MEZ.stageNote`, `MEZ.error`, `MEZ.busy`). Tab switch par wahi card khud dobara banta he, is liye:
  - search chal rahi ho → **"Search chal rahi he — results aate hi yahin dikhenge"** card wapas dikhta he
  - error aaya ho → wahi error wapas dikhta he
  - country search chal rahi ho → `N/M ho chuke` ke sath list wahi rehti he, rows live update hoti hain
  - button ka haal bhi ek jagah se set hota he (`mezSetBtnBusy`), is liye wapas aane par "search chal rahi he…" sahi dikhta he
- **Adhoori search ka resume:** search ke inputs (from/to/date/non-stop) `sessionStorage` (`ab_mez_pending`) mein rakhe jate hain. Agar search beech mein ruk jaye (tab switch, phone sleep, page reload, ya network timeout), to wapsi par card aata he:
  **"Adhoori search mili — KHI → DXB · 10 Dec 2026"** ke sath **▶ Dobara search karein** button. Ek tap par wahi search chalti he. Search mukammal hone par ye record khud clear ho jata he.
- **Watchdog:** 3.5 minute se zyada koi search latki rahe to button khud chalu ho jata he aur error dikhta he (pehle button hamesha ke liye "search chal rahi he…" par atak sakta tha). Phone jagane par bhi ye check chalta he.
- **Popular routes card hata diya:** Price Lookup se "Popular routes" (KHI→DXB waghera) aur "ya in websites par dekhein" (sasta ticket / Google / Kayak) card nikal diye — form aur Meezab results ab seedha upar aate hain.

## Country search: sirf UAE nahi, saare mulk (v2.81)
- **Dropdown mein country row:** ab **To** ya **From** mein country ka naam likhne par dropdown mein sab se pehle **🌍 <Country> — poore mulk ke fares (N airports)** row aati he, us ke neeche us mulk ke airports. Us row par click karne se poora mulk search ho jata he.
- **Masla kya tha:** airport data (`mwgg/Airports`) mein 236 mulkon mein se **166 mulkon ka naam sirf ISO2 code** ki shakl mein hota he — `AL` (Albania), `CO` (Colombia), `BR` (Brazil), `GS`, `PG` waghera. App ke paas sirf 78 mulkon ke naam the, is liye `Albania`, `Colombia`, `Brazil` likhne par kuch nahi milta tha. `UAE` is liye chalta tha ke us ka naam `AE` ke bajaye seedha "UAE" likha hua he.
- **Fix:** mulkon ka naam ab **240 mulkon** ke liye mojood he, aur purana phone cache (jis mein sirf codes hain) load hote waqt khud naam mein badal diya jata he — user ko kuch clear nahi karna parta.
- **Ab chalta he:** `UAE`, `Saudi Arabia`, `Qatar`, `Pakistan`, `UK`, `USA`, `Albania`, `Colombia`, `Brazil`, `Mexico`, `Greece`, `Thailand`, `Japan`, `Iceland`, `Kosovo`, `Kenya`, `Nigeria`, `Australia`, `Greenland`… — 236 mulk ke 7,918 airports.
- **USA / KSA ka faisla:** ye asal mein airport codes bhi hain (`USA` = Concord, `KSA` = Kassala). Ab pehle country alias dekha jata he, is liye `USA` ya `KSA` likhne par mulk hi khulta he; asli airport chahiye to code ki jagah airport ka naam likhein ya dropdown se chunein.
- Country search pehle ki tarah **8 bade airports** leti he, 3 parallel, price-wise — sirf ab har mulk par.

## Plane ka nishan: seedha Price Lookup (v2.80)
- **Header:** company name (**AB Travels**) ke sath hi ek sunehri ✈ button — ek tap par **Price Lookup** khul jata he. Pehle fares tak pohanchne ke liye ☰ → Price Lookup karna parta tha.
- **Mobile quick bar:** 7 buttons ke beech mein wohi ✈ nishan (gold circle) ubhra hua he — Sales · Invoice · Files · **✈** · Expense · Pending · Menu. Jab Price Lookup khula ho to circle roshan (amber glow) ho jata he.
- Agar Price Lookup pehle se khula he to nishan sirf page ko oper scroll karta he (dobara load nahi karta), is liye typed route/date aur results zaya nahi hote.
- Chhoti screens (400px se kam) par nishan thora chhota ho jata he, taake koi label kate na.
- Sirf UI change — fare logic, worker ya data par koi asar nahi. Worker redeploy ki zaroorat nahi.

## Auto-refresh aur country search (v2.79)
- **Auto-refresh:** Meezab results ke tools mein `Auto refresh` select — `Off` / `Har 3 min` / `Har 5 min` / `Har 10 min`. Timer sirf Price Lookup tab khula aur visible ho tab chalta he; doosre tab par jaane ya browser background mein jaane par ruk jata he, wapsi par foran check hota he. Refresh cache skip karta he (`fresh: true`) taake naye prices aayen. Header mein `auto-refreshed` aur `cached` ka label dikhta he; ↻ button se kabhi bhi manual refresh.
- **Budget guard:** har refresh Meezab ke 60/day quota se ek search leta he, is liye auto-refresh din mein **15** tak mehdood he (per browser counter, header mein "aaj bache hue" dikhta he). Manual ↻ par koi cap nahi.
- **Country search:** **To** mein IATA code ki jagah country/city ka naam likhein — `UAE`, `Saudi Arabia`, `Dubai`, `UK`, `USA`. App apni airport list (`mwgg/Airports`) se us country ke **8 bade airports** chunta he aur har airport ki search alag chalata he, phir sab ko **price-wise** ek list mein dikhata he: airline logo, airport code + city, stops, duration, sab se sasta fare aur fare count.
- **Row click:** kisi bhi airport par click karne se us airport ki **poori fare list** (cards, filters, airline strip, pages) khul jati he; upar country ka chip aur row highlight rehta he, aur ↻/auto-refresh usi airport ko track karta he.
- **Search progress:** sab airports **ek saath 3** chalte hain, is liye 8 UAE airports ~50 second mein poore ho jate hain. `3/8 ho chuke` live dikhta he, fail hone par us airport ki row par wajah likhi aati he — baqi results phir bhi aate hain.

## Meezab fares: platform, baggage filter, airline strip, tab state (v2.77)
- **Platform label:** har fare par chip dikhta he ke woh kis system se aaya — `Travelport`, `Hitit`, `NDC Emirates`, `NDC Flydubai`, `NZFlight`, `OneAPI`, `AirSial`, `Airblue direct`. Worker `EXT_<platform>_*` keys se pehchanta he, warna `Sys_SupplierID` se.
- **Baggage filter:** Sort/Stops panel mein naya `Baggage` select — `Any` / `Checked bag` / `Cabin only`. `0KG-0KG` ka matlab cabin only, khaali field ko kisi filter mein nahi ginte.
- **Airline strip:** results ke upar Meezab portal jaisa horizontal panel — har airline ka logo, naam, **sab se sasta fare** aur fare count. Kisi airline par click karne se list usi airline ki ho jati he, dobara click / "All airlines" se filter hat jata he. Strip stops/baggage filter ke mutabiq update hoti he.
- **Tab switch:** kisi doosre tab par jaane par Price Lookup ka typed text, chuni hui date/pax, Ignav results aur Meezab results **bache rehte hain**; wapsi par wahi scroll position milti he. Meezab search chal rahi ho to wapsi par progress card dikhta he.

## Meezab fares: saari flights, pages, logos (v2.76)
- **Saari flights:** pehle sirf pehla page (100 options) aata tha. Ab worker search ke **saare pages** uthata hai (250 per page, max 1,500 options) — KHI→DXB par 876 options se **863 unique fares**.
- **Page navigation:** har page 10 fares (25/50 bhi), neeche `‹ Prev  1 … 4 5 [6] 7 … 87  Next ›` aur "Page 6 of 87 · showing 51–60 of 863".
- **Sort & filter:** Price (low→high) / Duration / Departure, aur Stops: Any / Non-stop / 1 / 2+.
- **Airline logos:** pehle app ke andar ka `airlines/<code>.png`, warna Wi‑Fi se Kiwi CDN, warna airline code ka badge — network na ho to bhi card toota nahi dikhta.
- **Friendly detail:** depart/arrive time + airport code + city, total duration, `Non-stop` ya `1 stop · AUH`, har leg alag (flight number, aircraft ka naam maslan "Boeing 737 MAX 8", class), layover duration, baggage, refundable/changeable, seats left, overnight aur **Bus connection** chip.
- **Data sanity:** portal kabhi kabhi ghalat PKR amount bhejta he (KHI→DXB par FZ fare `8,077,840`) — sab se saste fare ke 50 guna se zyada wale rows hata diye jaate hain.

## Meezab Air se live fares (v2.75)
- **Naya:** Price Lookup mein Ignav ke saath ek alag button — **“Meezab Air — live PKR fares”**. Wohi route/date use hota hai jo form mein hai.
- Filhaal **one-way, 1 adult, Economy** (Meezab ki search query isi shape mein hai). PKR prices agent rate se aate hain.
- Worker `/meezab/search` khud login karta he (credentials Cloudflare secrets `MEZ_USER` / `MEZ_PASS` mein), 5 minute cache, rozana 60 search ka budget.
- Qareeb ke airport/bus connection jo Meezab lauta de (maslan KHI→AUH + **bus** AUH→Dubai) waise hi dikhte hain aur **Bus connection** label ke saath — fare sasta lagta he lekin asal airport alag hota he.
- Duplicate supplier rows (wahi fare, wahi flights) ek dafa dikhte hain.

## Mobile: naam par tap karne se options foran nazar aayein (v2.74)
- **Masla:** register mein naam par tap karne se neeche wala options menu (Paid/Unpaid, Invoice, Edit, Detail, Date, Delete) khulta hai, lekin phone par page **zoom** ho jaye (double-tap ya pinch) to wo menu "layout screen" ke neeche chala jata tha — sirf title nazar aata aur buttons ke liye neeche scroll karna parta.
- **Fix 1 — double-tap zoom band:** jadwal/buttons/links par `touch-action: manipulation`. Row par jaldi jaldi tap karne se ab page zoom nahi hota (pinch zoom waisa hi chalta hai).
- **Fix 2 — menu dikhne wali screen se chipakta hai:** agar page phir bhi zoom ho, to menu `visualViewport` se naap kar asal visible screen ke neeche pin hota hai aur zoom ke hisaab se chhota ho jata hai; zoom/scroll karne par saath saath khisakta hai.
- **Fix 3 — menu chhota:** phone par buttons ab 3 columns ke grid mein hain (pehle lambi qatar mein 3-4 lines), menu ki ooncha-i 70% screen se zyada nahi hoti.
- Sirf display/touch badla — sales data ya hisaab par koi asar nahi. Worker redeploy ki zaroorat nahi.

## Paid ticket ko dobara Unpaid karna (v2.73)
- **Masla:** Sale ek dafa **✔ Paid** ho jaye to wapas unpaid karne ka koi button hi nahi tha (sirf unpaid par ✔ Paid aata tha).
- **Fix:** Sales register mein paid sale ke `⋯` menu mein ab **↩ Unpaid** button hai. Confirm ke baad sale dobara **Pending Payments** mein aa jati hai (poori raqam ya jitni baqi ho).
- Agar us sale par darj payments poori raqam ke barabar hon (maslan staff ne payment lagayi thi), to unpaid karne ke liye wo payment entries bhi hata di jati hain — confirm dialog mein ye saaf likha aata hai. Warna sale unpaid ho kar bhi 0 baqi dikhti aur Pending mein na aati.
- **✔ Paid** dabane par ab toast aata hai jo batata hai ke ghalti ho to ⋯ → ↩ Unpaid.
- Header ka static badge bhi ab sahi version dikhata hai (pehle pehle frame mein purana number aata tha).

## Default tab: hamesha Sales (v2.72)
- **Har dafa app khulne par Sales tab** khulta hai. Pehle pichhla khula tab yaad rehta tha — kisi ne Expense/Settings par chhor diya ho to dobara wahi khulta tha.
- Tab badalna andar waisa hi hai; sirf nayi opening par shuruaat **Sales** se hoti hai (mobile quick bar ka highlight bhi Sales par aata hai).

## Phone quick bar: Expense button (v2.71)
- Neeche ki quick bar (sirf phones/tablets) ab: **Sales · Invoice · Files · Expense · Pending · ☰ Menu** — Expense Pending se pehle, ek tap door.
- 400px se chhoti screens par icon/label thora chhota kar diya, taake 6 buttons mein kuch kata na jaye.
- Naya tab nahi bana — wahi purana **Expenses** screen khulta hai (`data-tab="exp"`), is liye form, hisaab aur sync par koi asar nahi.

## Modern look (v2.69 / v2.70)
- **Cards:** kone 14px → **16px**, padding 16px, aur layered shadow (oper halki line + neeche narm gehri parchhai). Mouse wale device par card par hover karne se shadow thora ubharta hai.
- **Buttons:** kone 12px, primary/green par halki rangeeli parchhai (glow), dabane par halka "press" effect.
- **Fields:** kone 12px; focus par purana sakht outline hataya — ab **narm ring** (border + 3px halka halo) aata hai, dark aur OLED mein bhi.
- **Stat tiles (Summary/Monthly):** label 11px bold, number 21px tabular figures ke sath — figures ab line par line seedhe rehte hain.
- **Bottom quick bar:** ab **frosted glass** (translucent + blur) — peeche ka content halka dikhta hai, iOS jaisa look. OLED mein pure black frosted.
- **Sidebar:** halka vertical gradient aur active item par gold-tinted gradient (pehle flat grey tha).
- **Scrollbars:** patli, rounded, theme ke rang mein (pehle default moti grey).
- **Chhote touches:** "👁 Show totals" chip ab solid pill (dashed nahi), success banner par hari left accent line, toast rounded + blur, row action sheet ke oper wale kone rounded.
- Sirf **shakl** badli hai — koi button, tab, form ya hisaab ka kaam nahi badla. `prefers-reduced-motion` walon ke liye animation band.
- Poori tarah **CSS-only** change — Worker redeploy ki zaroorat nahi.
- **v2.70 fix:** card ki nayi padding un cards par bhi lag rahi thi jinki apni padding thi — Sales register ka toolbar card ke andar ghus gaya tha (square corners + adhoori line). Ab `sheet-bar` / `sheet-card` / ayat card ki padding waisi hi hai. Drawer ka scrollbar bhi patla aur drawer ke rang mein kar diya (dark/OLED mein patli lakeer jaisi dikh raha tha).

## Notification fixes: ab fail hone par sabab nazar aata hai (v2.68)
- **File add karne par notification na aane ki wajah chhupi hui thi** — app relay ki ghalti chup chaap nigal leti thi (`catch → false`). Ab:
  - fail hone par neeche **toast** aata hai: `⚠ Telegram notification nahi gayi — <sabab>` (maslan `origin`, `no_chats`, `relay 500`).
  - **Settings → 🤖 Team notifications** mein aakhri koshish ka nateeja tareekh ke saath likha hota hai (✓ gayi / ✗ nahi gayi + sabab).
  - Test button bhi ab asal sabab dikhata hai.
- **Purani/galat Chat IDs** ke sabab notification band na hon: agar Worker `no_chats` kahe to app **khud team list** (bot ke allowed chats) par dobara bhej deti hai.
- **Network / Worker 5xx** par ek dafa khud retry (Cloudflare → Telegram kabhi 15–40s leta hai).
- **Paste ki hui file** (clipboard se PDF/image) ab bhi team ko notify karti hai — pehle yeh jaan bujh kar "silent" thi. Sirf note ke dabbe ke andar Ctrl+V karne par notification nahi jati.
- Upload ke baad agar notifications Settings se **off** hain to message mein saaf likha aata hai.
- ⚠ Ek dafa check kar lein: **Settings → Team notifications** mein "Send notifications for new tickets and files" tick hona chahiye.

## Sales register: mouse wheel ab page bhi scroll karta hai (v2.66)
- **Masla:** register par mouse rakh kar wheel ghumane se sirf andar ki list scroll hoti thi aur page upar/neeche nahi hota tha — register se mouse hatana parta tha. Wajah: `.sheet-scroll` par `overscroll-behavior:contain` tha, jo list ke aakhir par bhi scroll ko page tak nahi jane deta.
- **Fix:** ab chaining normal hai (`overscroll-behavior:auto`) — list khatam hone par page khud aage scroll ho jata hai.
- **Chhoti list (maslan November ki kam sales):** agar rows itni kam hain ke andar scroll ki zaroorat hi nahi, to andar ka scroll box **hata diya jata hai** (`fit` class, JS se naapa jata hai) — poora page ek hi scroll mein chalta hai. List lambi ho to frozen header/columns wala box waise hi kaam karta hai.

## Drawer polish (v2.65)
- Drawer khulte hi active tab beech mein aa jata hai — lekin **MENU heading aur ✕ (close) button ab sticky** hain, is liye neeche wale tab (Settings, Monthly Accounts) par bhi band karne ka button hamesha nazar aata hai.
- Quick bar ke active tab ka gold accent bar thora neeche shift kiya taake bar ke top border par crop na ho.

## App ka naya link + origin fix (v2.64)
- **GitHub account ka naam badal gaya hai**, is liye app ka purana link `ali122.github.io/travel-office-hisab/` ab **404** deta hai. Naya live link: **https://abtravels.github.io/travel-office-hisab/** — bookmarks/home-screen icon dobara banayein.
- **Notification relay** (`pricebot-worker.js` ka `/notify`) sirf `ali122.github.io` origin qabool karta tha — naye host se aane wali Telegram notifications 403 ho rahi thin. Ab **dono hosts** (`ali122` aur `abtravels`) allowed hain, aur Telegram ke "📱 Open app" button ka URL naya hai.
- Worker redeploy zaroori hai (`npx wrangler deploy -c wrangler.pricebot.toml`). Redeploy se pehle bhi kaam chalana ho to Cloudflare → Worker → Settings → Variables mein `ALLOWED_ORIGIN = https://abtravels.github.io` set kar dein.
- Hardcoded purane links (`og:image`, company site ke canonical/og/schema URLs, staff portal ka logo, `scrape.js` UA) sab naye host par.
- **Bottom bar ka highlight fix:** Sales/Summary/Settings jaise pages par ab ghalat tab highlight nahi hota (quick bar sirf apne 4 tabs par active dikhati hai).
- Drawer khulte waqt seedha active tab par scroll ho jata hai.
- Invoice ka pehla heading ab **TYPE & AIRLINE** hai (pehle "INVOICE TYPE" heading ke neeche wahi "Invoice type" label dobara aata tha).

## Phone UI — neeche ki quick bar, chhota header, saaf forms (v2.63)
- **Neeche ki quick bar (sirf phones par):** Sales · Invoice · Files · Pending · ☰ Menu. Pehle har tab badalne ke liye ☰ kholna parta tha (2 taps); ab char sab se zyada use hone wale tabs ek tap mein, aur jo tab khula hai wo highlight rehta hai. Menu button wahi purana drawer kholta hai.
- **Header chhota:** phone par verse ki Urdu line ab ek line (tap kar ke poori khulti hai) aur Arabic font thora chhota — screen par ~30px zyada jagah. 410px se chhoti screen par theme/update buttons ab doosri line par nahi girte.
- **Tab badalne par page upar se shuru hota hai** — pehle agla tab beech mein khulta tha (jaise Invoice seedha "Trip type" par).
- **Header ki asli height naapi jati hai** (`--header-h`) — is liye "＋ New sale" jaisa jump target ab header ke neeche chhupta nahi.
- **Sales form ke boxes par labels** (Client name, Contact number, Detail, Cost price, Sale price) — pehle sirf placeholder tha, type karne ke baad box pehchanna mushkil tha.
- **Settings mein search box** — 13-screen lambi Settings mein sirf milte julte cards dikhte hain (khali karein to sab wapas).
- **Invoice form mein section headings** — Invoice type · Passengers · Flight details · Baggage & options.
- **Summary:** backup reminder ab summary ke **neeche** (pehle sab se upar bara button tha).
- **Buttons ka apna look:** bina rang wale `.btn` ab grey UA dabbe nahi (CSV button ka blue-on-grey text khatam); checkbox/radio ka ek hi style; naya focus-friendly accent.
- **Pichhla tab yaad rehta hai** — app dobara kholne par wahi tab khulta hai.
- Mobile ki quick bar aur `main` ka bottom padding safe-area (iPhone home bar) ka khayal rakhte hain.

## GitHub account renamed: Ali122 → abtravels (2026-11-13)
- New links: app **https://abtravels.github.io/travel-office-hisab/** · company website **https://abtravels.github.io/**
- Old `ali122.github.io` links stopped working (GitHub does not redirect Pages sites); repo links on github.com still redirect.
- Updated everywhere in code: price bot relay origin + Telegram "Open app" button, `scrape.js` user agent, staff portal logo URL, app's default GitHub backup repo (`abtravels/travel-office-hisab-backup`), staff portal default `GITHUB_REPO`, and the website's canonical/OG/JSON-LD URLs.

## Company website (2026-11-13)
- Public AB Travels website: **https://abtravels.github.io/** — files live in the separate repo `abtravels/abtravels.github.io` (`index.html`, `style.css`, `main.js`, `assets/logo.png`). Static, free GitHub Pages, no build step or dependencies.
- The old path `/travel-office-hisab/company/` now holds a small redirect page to the root site (query strings are preserved, so shared links keep working).
- **English + اردو** toggle in the header: switches text, `<html lang/dir>` (full RTL), page title, meta description and the prefilled WhatsApp message, then remembers the choice in `localStorage` (`abt-lang`).
- Contact shown: WhatsApp **0314-3176560**, mobile **0314-3176560**, alternate **0310-3311199**, email **ahmedbrothers053@gmail.com**. No street address is published yet.
- The quote form has **no backend**: on submit it validates name/phone and opens `wa.me` with the details prefilled. Nothing is stored on the website.
- Tested 320–1920px, English/Urdu, mobile menu, form validation, all links, no console errors, no horizontal overflow.

## Sales register uses the full laptop width (v2.62)
- On a laptop/desktop the **Sales** tab now stretches to the window instead of sitting in an 820px column, so both side margins are used and the table no longer needs left/right scrolling at 1280px and wider.
- Cell padding is slightly tighter on wide screens so Cost, Sale, Profit, Status, Type, Detail, Pax, Phone and actions all fit in one view.
- Other tabs keep their normal width; phones/tablets below 1000px keep the sideways-scroll grid unchanged.

## Sales register column order (v2.61)
- Columns now run **Cost → Sale → Profit → Status**, then Type, Detail, Pax, Phone and the actions button. The Σ footer row follows the same order.
- CSV export already uses Cost, Sale, Profit, so both views match.

## Sales register — top totals panel removed (v2.60)
- The **Cost / Sale / Profit / Persons** strip above the sales grid is gone. Those figures are already in **Monthly summary** and in the grid's Σ footer row, so the register is now shorter on mobile.
- Nothing else changed: month filter, search, grid columns, row actions and the Σ footer totals still work the same.

## Sales register refinements (v2.59)
- **Month khud current month par khulta hai** — pehle har dafa "All months" aata tha. Agar is mahine koi sale na ho to sab se naya mahina jis mein sales hain khulta hai; sales hi na hon to "All months".
- **Actions ab ek chhota `⋯` button** — us par tap (ya row par tap) se neeche menu khulta hai: ✔ Paid · 🧾 Invoice · ✏ Edit · **📝 Detail** · 📅 Date · ✕ Delete. Row ke andar baqi buttons chhupe rehte hain, is liye **actions ke liye left/right scroll khatam** — ye column hamesha daayen freeze hai (mobile par bhi).
- **Naya sale sab se oper** — pehle ek hi date ki sales naam ke hisab se lag jati thin; ab date ke andar **jo sale baad mein add hui wo pehle** dikhti hai (latest first).
- **Date column mein sirf din** (jab koi mahina chuna ho) — `7`, `9` waghera; "All months" par poori tareekh `07/11/26`. Mahina/year upar filter aur sheet title mein pehle se likha hota hai.
- **Detail ab form se bhi bhar jata hai** — Add New Sale form mein naya **Detail** box (route / PNR / note, e.g. `KHI-DXB EK601`). Purani sale ka detail badalne ke liye row ke `⋯` → **📝 Detail** (khali chhodein to purana rahega, mitane ke liye `-`).

## Sales register — Google Sheets jaisa grid (v2.58)
- **Sales tab** ka list ab **spreadsheet jaisa** hai: row numbers (#), column headers, poori grid lines, aur har sale ek chhoti single-line row mein — lambi cards khatam, is liye neeche scroll kam karna parta hai.
- **Header row aur Date column frozen** hain — 600 sales hon to bhi naam/tareekh samne rehte hain, sirf andar ka hissa scroll hota hai.
- **Khaas columns pehle**: Date · Client · **Sale** · **Profit** · **Status** (Paid/Unpaid + baqi raqam) — phir Cost, Type, Detail, Pax, Phone.
- **Bari screen par Actions column daayen frozen** — scroll karte waqt bhi ✔ Paid / 🧾 Invoice / ✏ Edit / 📅 Date / ✕ Delete samne rehte hain.
- **Kisi bhi row par tap** karein to neeche chhota menu khulta hai: ✔ Paid · 🧾 Invoice · ✏ Edit · 📅 Date · ✕ Delete (mobile par bhi asaan).
- Upar wahi ek patli patti: **Month filter + Search**. Search karte hi **totals bhi update** hote hain (jitni rows nazar aa rahi hain unka Sale/Profit).
- Neeche **Σ totals row** (Cost / Sale / Profit / Persons) — bilkul sheets ke TOTAL jaisa.
- **⬇ CSV** button — jo rows nazar aa rahi hain wo CSV file ban jati hain, Google Sheets ya Excel mein seedha khul jati hain.
- **"＋ New sale"** button form kholta hai; sale save hote hi form band ho kar naya row sheet mein samne aa jata hai.
- "Move sales to another month" aur "Clean up sales" (duplicates / clear all) ab alag chhote collapsed cards mein — main view saaf rehta hai.
- Chhota fix: Pending Payments ke reminder messages par ab **toast** (neeche confirmation) aata hai; pehle `notify` galti se local variable tha.

## Contact number + payment reminders (v2.57)
- **Add New Sale** form mein ab **Contact number** ka box hai. Number sale par save hota hai aur client record mein bhi (purana number khali ho to).
- Sale likhte hi client ka naam likhte hi number bhi auto-fill ho jata hai (client suggestions).
- Sale ka ✏ (edit) par bhi contact number poocha jata hai — purani sales ka number wahin add kar sakte hain.
- **Pending Payments** mein har unpaid sale aur client entry par number dikhta hai, aur teen buttons milte hain:
  - **📞 Call** — phone par seedha call (tel: link).
  - **💬 WhatsApp** — payment reminder message bhar kar WhatsApp khulta hai (naam + raqam + tareekh).
  - **🔔 Remind team** — Telegram par team ko yaad dila deta hai (naam, raqam, number).
- Pending Payments ke top par **"Remind team: all pending"** button — poori pending list (naam + raqam + number) ek message mein team ko bhej deta hai.
- Sales list mein bhi unpaid sale ke saath contact number dikhta hai.

## Telegram reliability (v2.55 / v2.56)
- **"Webhook: timeout"** ka asal reason: status page har baar Telegram API pe wait karta tha, aur Cloudflare → Telegram ki raasta 15–40s leti hai (kabhi block bhi hoti hai). Ab webhook info **KV mein cache** hoti hai (cron har 10 min refresh karta hai) — status page ab foran jawab deta hai aur sach dikhata hai.
- `tg()` mein **ek retry** add hua hai (timeout / network error / flood-control par dobara try), aur timeout 20s → 40s barha hai — Telegram temporarily slow ho to notification drop nahi hoti.
- App ka relay request timeout 30s → 70s (worker ke retry ka intezaar karta hai).
- Worker live: **v2.56** — status page par `Webhook: connected`, relay dono team chats par OK.

## Reminder fixes + UI polish (v2.54)
- **"kal raat 10 bje"** ab **kal** raat 10 baje par lagta hai (pehle aaj raat par lag jata tha).
- **"raat 12 bje"** ab raat 12:00 (midnight) hai — pehle dopahar 12:00 ban jata tha.
- Notification messages mein dobara "PKT PKT" nahi aata (pehle har reminder message mein "PKT PKT" likha tha).
- Reminders ab Durable Object mein store hote hain: do `/remind` ek saath bhejne par dono bachte hain, aur cron ke chalne ke beech naya reminder add karne par purana delete nahi hota.
- Event qareeb ho (lead times nikal chuke hon) to reminder **event ke waqt** par bhi lag jata hai — pehle "waqt guzar chuka hai" error aa jata tha.
- Invoice par "PASSENGERS (3)" likha ho to 3 rows dikhti hain (khali naam/NIC bhi).
- UI: mobile par header ki ayat 2 lines par clamp hoti hai (tap se poori khulti hai), sale form ke "Status / Method / Commission" ke labels ab visible hain, keyboard focus ring add hua hai.
- Checks: `python -m unittest discover -s tests -v` — price bot aur staff worker ke behaviour checks (Node ya headless Chrome se, offline).

## Reminder fixes (v2.52 / v2.53 — dost ka kaam)

## No added-by names anywhere (v2.51)
- Ticket Files and the staff portal no longer show **who uploaded** a file. The "Aap ka naam (uploads par)" box is gone from the app.
- New uploads do not store an uploader name at all; Telegram notifications already carry no added-by name.
- Old files and backups that still contain `uploadedBy` keep working — the field is simply never displayed.
- Staff portal: deploy `staff-worker` again (`npx wrangler deploy` in `staff-worker/`) to get the same change there.

## Sale — number of persons (v2.50)
- The **Add New Sale** form now has a **Number of persons** field (default **1**, 1–99). It is stored on the sale as `persons`.
- It is **informational only**: cost, sale, profit and all monthly totals stay exactly as entered — increasing persons never multiplies them.
- Sales list shows a 👥 badge when persons is above 1, and the Ticket Summary line shows the total person count for the filtered month.
- The sale edit (✏) prompt now also asks for the person count, and creating an invoice from a sale pre-fills the invoice passenger count from it.
- Older sales without the field are treated as 1 person; imports and backups keep working unchanged.

## Passenger IDs stay aligned (v2.49)
- Multi-passenger invoices keep blank lines in the NIC/Passport box, so a passenger with no NIC does not take the next passenger's ID. Applies to the app invoice form and the staff portal form.

## Multi-city proxy (v2.47)
- The price bot Worker forwards `/search` to Ignav's `/fares/search` endpoint, using the existing proxy budget and configuration.
- Run `python -m unittest discover -s tests -v` for the offline release checks. These checks do not exercise live bookings, payments, or Ignav.

## Price alert preview (v2.46)
- Bot price notifications now start with the **route + current price** on the first line (e.g. `KHI → DXB · 15 Dec 2026 · PKR 85,400`), so the phone notification preview shows everything without opening the message.
- Applies to both `alertText` (target/drop alert) and `updateText` (periodic price update); the change details (previous price, target, fare legs) follow on later lines.
- `pricebot-worker.js` v2.46 redeploy karein (`npx wrangler deploy -c wrangler.pricebot.toml`); bindings/secrets wahi rahenge.

## Price Lookup — children & infants (v2.45)
- Price Lookup now supports **adults, children (2–11), infants on lap (<2) and infants in seat**, using Ignav's official request fields (`adults`, `children`, `infants_on_lap`, `infants_in_seat`). Fields are sent only when above zero, so a plain 1-adult search sends exactly the same request as before.
- Validation: one lap infant per adult, and at most 9 seated passengers (adults + children + infants in seat).
- Ignav returns one **party total** per fare (`PriceModel` has amount/currency/status only, no per-person split), so results are labelled "party total".
- **One search = one Ignav request**, regardless of passenger count. The proxy `MAX_DAILY_PROXY` and bot `MAX_DAILY_REQUESTS` budgets count requests, not passengers; failed requests are not billed.
- UI-only `__max` / `__party` fields are stripped before sending (Ignav uses `additionalProperties: false` and rejects unknown fields).

## Setup guide fix (v2.44)
- The app's Telegram price-bot setup card now lists the required `WATCH_INDEX_DO` Durable Object binding (`WatchIndex`, SQLite, migration `watch-index-v1`) and the `npx wrangler deploy -c wrangler.pricebot.toml` path. Pasting only the Worker code is not enough for v2.42+.

## Audit fixes (v2.42)
- Browser notification requests are verified by the HTTPS origin check (the app-side bot token is no longer required; the old token field is optional/legacy). Staff continues to use the shared `NOTIFY_KEY` secret.
- Concurrent watch-index changes use a SQLite Durable Object instead of overwriting one KV array. First use imports existing watch keys from KV, including keys missed by the old index. Cron does not list KV every minute.
- Staff invoices preserve blank passenger ID slots so IDs stay paired with names.
- Price bot deploy: `npx wrangler deploy -c wrangler.pricebot.toml`. Requires `WATCH_INDEX_DO` binding and `watch-index-v1` migration (`WatchIndex`, SQLite); pasting code alone into an unconfigured Worker is insufficient.

Single-file web app for a travel agency's monthly accounts. No build step, no server:
open `index.html` in any browser. The whole UI is in English.

**Live app:** https://abtravels.github.io/travel-office-hisab/

## What it does

- Monthly accounts: income, expenses, ticket profit, net profit
- Tickets / Umrah bookings — paid / unpaid, per-month filter
- Partners: Umair & Sarmad — share earned, withdrawals, balance
- Father (Owner) withdrawals; Waseem commission & salary (Staff)
- Loan tracker, charity at a configurable rate (per-month override possible)
- Client pending payments (bakaya) with per-month filter
- Month-wise import from a Google Sheet (one file per month) via Apps Script web app
- Sync to Google Sheets (`HisabData` cell) so phone and PC stay together
- Excel (CSV) report: one selected month, all months in one file, or one file per month

## Google Sheet sync

1. Put the Apps Script code (shown inside the app: Settings → Google Sheet setup) into
   the Sheet's **Extensions → Apps Script**, then deploy as a **Web app** (execute as: me,
   access: anyone).
2. In the app: Settings → paste the deployment URL + the Sheet **File ID** → Test.
3. Each month has its own Sheet file — change the File ID, then **Import**.

The app keeps data in `localStorage` and pushes a JSON copy to the Sheet.

## Version

Current version is shown in Settings and in the header badge. Bump `APP_VER` on every release.

## Files

- `index.html` — the whole application (HTML + CSS + JS + embedded Apps Script code)
- `logo.png` — AB Travels logo (header + favicon)

## PDF to Word (structured, iLovePDF style)

Settings/PDF-to-Word tab: **Convert mode** -> *iLovePDF style* reads the PDF text layer,
vector lines, embedded images and page geometry directly (no canvas render needed) and
builds an editable .docx with:

- A4 page size + margins taken from the PDF
- real Word tables (detected from ruled grids), headers/footers repeated on every page
- bold/italic/font family/size, alignment and spacing
- embedded images at their original positions
- scanned pages handled via Tesseract OCR word boxes (render-free when a full-page image exists)

*Simple text only* mode keeps the original text/OCR behaviour. Engine libs (pdf.js, docx.js,
Tesseract.js) load from CDN on first use.

## Data-safety notes

- GitHub backup/sync files never contain the PAT (stripped on export, push, snapshot, share).
- Restore paths (syncPull, backup-file restore, Undo snapshot) merge missing sections
  (clients, invoices, bills, airlineIds, ...) from local state, so an older GitHub/backup
  file cannot wipe newer local data. An explicitly empty array on the remote is respected.
- Settings -> GitHub Sync shows a permanent masked-token connection badge that survives reloads.

## Version

Current version: **2.00**. Bump APP_VER and #verBadge on every release.

## PDF to Word - Exact look mode (v2.01)
- Renders every page to a high-res image (logo, shapes, colors, tables, borders) embedded as full-page background
- Adds transparent, floating, absolutely-positioned editable text frames at exact PDF positions (font family, size, bold/italic, align, white/black auto-detected from background)
- Result opens in Word looking exactly like the PDF - click any text and edit it in place. iLovePDF-style mode remains for native, reflowable Word objects (tables/headers/margins).
- The app bundles pdf.worker.min.js (~1 MB, same version as bundled pdf.js) so page rendering does not depend on a CDN worker. Do not delete it.
## Version
Current version: **2.01**. Bump APP_VER and #verBadge on every release.

## Mobile tables (v2.02)
- render() har data table ko .table-wrap (overflow-x:auto) mein wrap karta hai, aur mobile par card-style stacked rows bana deta hai (data-label ke sath) - action icons (edit/unpaid/delete/invoice/date) kabhi clip ya off-screen nahi hote.
- Invoice print preview (#invPrint) ko wrap nahi kiya jata taake PDF capture ka layout barqarar rahe.
## Version
Current version: **2.02**.

## Price Lookup (Amadeus) - v2.03
- Settings -> Amadeus - live flight prices: one-time setup = free developers.amadeus.com account (API Key + Secret) + free Cloudflare Worker proxy (~5 min, no credit card). Worker code is inside the app (copy button). API secrets NEVER reach the app or browser - only the Worker talks to Amadeus; app calls /flights and /health on your Worker URL.
- New nav tab: Price Lookup - enter From/To (IATA codes), date, adults, non-stop filter, currency (PKR/USD/AED/SAR/EUR), class, and see real-time published fares sorted by price (airline, times, stops, duration, seats, fare class, grand total). Copy any fare to clipboard to send to a client. Popular-route presets + sasta ticket/Google Flights/Kayak backup links included. Indicative fares; booking via consolidator/airline portal.
## Version
Current version: **2.03**.

## Version
Current version: **2.31** (Email share opens Gmail compose with recipient prompt; larger ayah/Urdu fonts; staff portal daily ayah; price bot v2.29 quiet hours + updates; invoice share row).

## Price Lookup - Ignav (v2.12) - Cloudflare Worker proxy
- Amadeus Self-Service was decommissioned 17 July 2026 (all free keys disabled) - that integration is removed.
- New provider: Ignav (ignav.com). First 1,000 successful requests are a one-time free allowance (not monthly); after that $2 per 1,000. Failed requests are not billed. API key stays in a Cloudflare Worker proxy (browser calls are blocked by Ignav). Setup: Settings -> Flight prices - Ignav -> copy worker code -> deploy on Cloudflare -> set IGNAV_API_KEY secret -> paste Worker URL.
- Price Lookup tab: one-way, round-trip and multi-city (2 legs), airport autocomplete, adults, cabin class, non-stop, market (PKR/AED/SAR/GBP/USD/INR/QAR), max results; results show airline + flight number, times, duration, stops/via airports and price, with Copy fare and Book/links.
- Security: the Ignav API key is stripped from backup files, GitHub sync payloads, undo snapshots and share links (same treatment as the GitHub PAT); it stays on the device and survives restores.

## Sasta route price snapshots (free)
- `.github/workflows/sasta-prices.yml` runs Playwright Chromium every 30 minutes on a public repo (free Actions minutes) and reads Sasta's public SEO route pages.
- Top 16 routes only; output is `data/sasta/<origin>-<destination>.json` with a route-level `amount`, `observed_at`, `source_url`. It is cached/indicative, not date-specific availability.
- Price Lookup fetches `data/sasta/khi-dxb.json` (etc.) and shows a **Sasta Ticket — route price · External / indicative** card under Ignav results. Missing file / failed scrape = badge hidden, manual Sasta link remains.
- The scraper does not log in, bypass CAPTCHA or book. If Sasta changes markup/WAF, the job fails gracefully and the last good JSON stays.

## Staff portal (v2.16) — separate Cloudflare Worker
- `staff-worker/` is a password-only staff portal at `staff-abtravels.<subdomain>.workers.dev`. No email or OTP; the password is a Worker secret and the browser gets a 12-hour signed `HttpOnly` cookie.
- Staff can add partial payments on receivables and unpaid tickets, view/add/edit clients (no delete), create their own bookings, create ticket/Umrah invoices for any client (save + print), print/share invoices for their own bookings, open/share the shared Ticket Files, and use PNR Lookup. Saved staff invoices appear in the owner app's Invoice tab too.
- Cost, profit, expenses, partners, Father, loans, settings, airline IDs, backups and the GitHub token never reach staff. Staff bookings are saved with `createdBy: "staff"`, `cost: 0` so the owner can add the real cost.
- Setup, secrets and testing: see `staff-worker/README.md`. The Worker writes to the same `HisabData.json`; press **Pull now** in the owner app to see staff changes.


## Price Lookup fix (v2.08): Ignav requires a server proxy
- Cause of 'check connection': Ignav's API is not callable from browser JavaScript (key must stay server-side). Direct calls fail.
- Fix: one-click Cloudflare Worker proxy code inside Settings (free plan). Worker adds the key server-side and exposes /health, /fares, /round-trip, /booking-links with CORS.

## Price Lookup — Kiwi/Tequila (v2.19)
- Second free source alongside Ignav. `KIWI_WORKER_CODE` (Settings → Kiwi prices) deploys a separate Cloudflare Worker that proxies `api.tequila.kiwi.com/v2/search` with the key stored server-side as `TEQUILA_KEY`.
- Setup: tequila.kiwi.com/portal/signup → free key → deploy worker → set secret → paste Worker URL → Save & test.
- One-way searches hit the worker's `/kiwi` endpoint in parallel with Ignav; results are converted to the same itinerary shape and merged into the sorted list with a **Kiwi** badge and a direct "Kiwi par book" deep link. Prices show as *unverified* (indicative).
- Currency follows the Pricing market selector (PKR default). `kiwiProxy` URL is device-specific (stripped from shared state, like `ignavProxy`).
## Kiwi/Tequila removed (v2.21)
- Tequila public signup closed May 2024 (invitation-only per Kiwi.com policy), so the v2.19 Kiwi integration was fully reverted — Ignav is again the only live source in Price Lookup. The v2.19 worker code remains in git history if a Tequila key is ever obtained.
## Telegram price bot (v2.24)
- New Settings card: "Telegram price bot" with a one-click copy of `pricebot-worker.js` (also kept in the repo root).
- One Cloudflare Worker does both jobs: the Ignav proxy for the app and the Telegram bot with a 1-minute cron.
- Bot commands: `/price KHI DXB 01-12-2026` (one-way or `... 15-12-2026` round trip, options `adults=2 cabin=business market=AE nonstop`), `/watch ... target=85000 every=10`, `/urgent 1 60` (every minute for 60 minutes), `/list`, `/stop 1|all`, `/book 1`, `/budget`.
- Alerts on target price hit or a 5%+ drop, max one alert per 10 minutes; only `verified` fares can alert.
- First `/start` claims the bot (owner chat stored in KV); every other chat is refused (`This bot is private`).
- Safety: daily search budget (default 60, `MAX_DAILY_REQUESTS`), reserved before each Ignav call; protects the 1,000 one-time free searches and the KV 1,000 writes/day limit.
- Secrets (`IGNAV_API_KEY`, `TELEGRAM_BOT_TOKEN`, optional `TELEGRAM_WEBHOOK_SECRET`) live only in the Worker; nothing is stored in the app or its backups.
- Setup guide: `PRICEBOT.md`.

## Mobile-friendly price bot (v2.25)
- Natural messages: `DXB to KHI 15 December`, `DXB KHI 15 Dec har 30 minute`, `EK601 DXB KHI 15 December` — Roman Urdu/English, city names or IATA codes, `kal`/`aaj`, `har ghantay`, `har 2 ghantay`.
- Tracking end time (`... kal raat 10 baje tak` or `until=2026-12-14T22:00`, Pakistan time); the watch deletes itself and tells you when time is up.
- Inline buttons on every reply: 1 / 5 / 10 / 15 / 30 / 60 min, Pause, Book, Stop; new `/interval`, `/pause`, `/resume` commands.
- Specific flight filter for both one-off prices and watches (`flight=EK601` / `EK601` in a normal message).
- Every fare and alert shows the check time (PKT) and the source (Ignav, verified only).
- App proxy now has its own best-effort daily counter (`MAX_DAILY_PROXY`, default 200) and an optional `ALLOWED_ORIGIN` check, so the public `/fares` route cannot silently drain the whole Ignav allowance. The Ignav dashboard spending limit remains the hard stop.

## Invoice overnight arrival (v2.26)
- Invoice ab arrival ki apni date dikhata hai. Agar flight raat ko utarti hai (arrival time departure se chhota, e.g. 11:05 PM → 2:05 AM), to arrival `02/12/26 (+1)` — agle din — print hoti hai, departure ki date nahi.

## Shared price bot (v2.27)
- Team access: owner `/share <chat_id>` se member add karta hai (`/unshare` se remove, max 10). Member apna ID `/id` se le sakta hai.
- Ek hi watch list sab members ke liye: koi bhi `/watch`/`/stop`/`/interval` chalaye, sab par asar hota hai.
- Price alerts, budget/end-time messages aur naya-watch notice **tamam allowed chats** ko jate hain.
- Worker status page par owner aur team chats dikhte hain; bot version `v2.27`.

## Ticket Files — shared PDF library (v2.33)
- New nav tab **Ticket Files**. Upload a saved ticket PDF/image from the PC (or drag & drop); it is stored once in the private GitHub backup repo under `tickets/` (20 MB per file, PDF/JPG/PNG).
- The invoice share row's old **LocalSend** button is now **📁 Files**: it saves the generated invoice straight into the shared library, so no download/re-upload or PC→phone transfer is needed.
- Only small metadata (client, PNR, file name, size, uploader, time) goes into `HisabData.json`, so every device that has the app (mobile, Sarmad, staff) sees the list after the normal GitHub sync. Files download on first open and are cached on the device.
- Client and PNR auto-fill from the file name when they match an existing client/ticket/invoice.
- **WhatsApp** button: on a phone the share sheet opens with the PDF already attached (no LocalSend step). On a PC the PDF downloads and WhatsApp Web opens at the client's saved number with a ready caption.
- Staff portal: new **Ticket Files** tab; the Worker proxies downloads through `/api/file?id=...`, so staff never receive the GitHub token.
- Deleting a file in the app removes it from GitHub; other devices drop it on their next sync (or **Refresh** on the tab).
- Staff Worker must be redeployed once after this version for the staff tab to appear.

## Team push notifications (v2.34)
- New Settings card **Team notifications (free push)**. Notifications use [ntfy.sh](https://ntfy.sh) — no account, email or OTP.
- Setup once: press **New topic** → **Save & send test** → install the free **ntfy** app on every phone (Play Store / App Store) → `+` → paste the topic → Subscribe. On a PC, open `https://ntfy.sh/<topic>` and press Subscribe.
- Notifications are sent automatically for: a new sale/ticket in the app, a new Ticket File upload, an invoice saved to Ticket Files, a new staff booking, and a staff payment.
- The topic is a shared secret: anyone who knows it can read the notifications (client names/PNRs are included). Share it only with the team; press **New topic** to rotate it.
- If ntfy.sh is unreachable, the app keeps working; only the notification fails (silently in the background).
- The Worker reads the topic from `HisabData.json`, so staff-originated notifications work without any extra Worker secret.

## Ticket Files: links, notes and pasted documents (v2.35)
- New **Paste link / document** card in Ticket Files:
  - **Link** — e.g. a Google Drive or airline booking URL. Stored as a clickable entry with Open link / Copy / WhatsApp.
  - **Note / document text** — paste a document's text (max 4,000 characters). Stored in the synced data with View / Copy / WhatsApp.
  - **📋 Paste from clipboard** — a PDF/image in the clipboard is uploaded as a file; text/URL fills the form. Pasting a PDF/image into the note box also works.
- **These entries never send a push notification.** Notifications remain only for real ticket-file uploads, new sales, staff bookings and staff payments.
- Links are the cheapest option for big documents: keep the file on Drive and paste the link, so GitHub storage is not used.
- Staff portal shows links with Open/Copy and notes with View/Copy.

## GitHub storage — not unlimited
- GitHub Free is **not unlimited**: recommended repo size is under **1 GB** (soft; GitHub may contact you above it), a single file is capped at **100 MB**, and Git LFS gives 1 GB free (not used here).
- Each Ticket File upload is one commit. Deleting a file removes it from the current tree but the old copy stays in git history, so the repo does not shrink immediately.
- A typical 200 KB ticket PDF ≈ 5,000 files per 1 GB. That is years of normal use, but use Drive links for big documents and delete old ticket files occasionally.
- GitHub Pages (the app itself) is limited to 1 GB site size and 100 GB/month soft bandwidth; the app is under 1 MB.

## Notification server setting (v2.36)
- Team notifications ab **configurable ntfy server** use karti hain. Naya field: **Settings → Team notifications → Notification server** (default `https://ntfy.sh`).
- Kyun: kuch networks/ISPs (jaise ghar ka broadband) `ntfy.sh` ko block kar dete hain — phone par "TLS error" ya "check internet" aata hai, halanki office Wi-Fi par pehle kaam kar raha tha.
- Working public mirrors: `https://ntfy.envs.net`, `https://ntfy.adminforge.de`, `https://ntfy.mzte.de`. Server field mein daal kar **Save & send test** karein, aur phone ke ntfy app mein bhi wahi server add karein.
- **Copy subscribe link** ab usi server ka link deta hai; staff Worker bhi wahi server use karta hai (redeploy zaroori).
- Default waisa hi hai, is liye purane users ka behaviour nahi badla.

## Version
Current version: **3.40** — App notifications (naya ticket, ticket file, invoice) ab `/notify` relay se Telegram + **Discord** dono par; relay Discord-only config par bhi chalta he. (v3.39: "Failed to fetch" fix — country round trip 2 airports + 6 pages per airport, network auto-retry.)

## Price bot: KV list limit fix (v2.41)
- Cloudflare KV free plan mein **1,000 list requests/day** hoti hain. Bot ka cron har minute `KV.list` chalata tha (1,440/day), is liye ~15 ghante mein 90% usage email aa jati thi.
- Ab watches ek hi `w:index` KV key mein track hoti hain; cron sirf `get` karta hai. Pehli baar index missing ho to ek dafa `KV.list` se migrate hota hai, phir nahi. Cron `*/1 * * * *` hi rehta hai, urgent mode bhi kaam karta hai.
- `pricebot-worker.js` v2.41 redeploy karein; KV binding aur secrets wahi rahenge.

## Notifications: Telegram via Worker relay (v2.39)
- Telegram notifications ab **Worker relay** se jati hain: app → `ab-travels-ignav.umair5075.workers.dev/notify` → `api.telegram.org`.
- Kyun: kuch ISPs ghar ke broadband par `api.telegram.org` bhi block karte hain. Pehle app seedha Telegram par `no-cors` se bhejti thi — fail hone par bhi "Test bhej diya" dikhta tha aur message kahin nahi jata tha.
- Naya Settings field **Notification relay (Worker URL)** (default `https://ab-travels-ignav.umair5075.workers.dev`); khali chhorne par default use hota he.
- Relay Telegram ka response check karta hai; failed requests ko success nahi dikhata. Browser request ke liye device-local bot token zaroori hai.
- `/notify` origin aur token verify karta hai, sirf bot ke allowed team chats ko bhejta hai, aur 120/hour soft cap hai.
- **Staff portal** `PRICEBOT` service binding se relay use karta hai. Dono Workers par same `NOTIFY_KEY` secret set karein. Chat IDs synced settings se aati hain; khali hon to bot ki team use hoti hai.

## Team notifications via Telegram — ntfy removed (v2.37)
- The ntfy system (topic/server settings, ntfy.sh push) is fully removed after repeated mobile delivery problems. Telegram is now the notification channel: reliable push on every phone, no battery settings, no extra app beyond Telegram.
- New Settings card **🤖 Team notifications (Telegram)**: paste the **bot token** (from @BotFather — the same token the price bot uses) and **chat IDs** of every team member (each member messages the bot once, then copies their ID from `https://api.telegram.org/bot<TOKEN>/getUpdates`). Save & send test.
- Sends directly from the browser via the Bot API (`sendMessage`, no-cors GET) — no worker changes needed. Fires on: new sale/ticket, new Ticket Files upload, invoice saved to Ticket Files.
- `tgBotToken` is device-local and stripped from sync/backups (like the PAT and Ignav key). Leftover `ntfyTopic`/`ntfyServer`/`ntfyOn` keys are stripped from sync and deleted locally when the Telegram card is saved — this also silences the staff worker's ntfy calls (its code reads the removed topic key). Staff booking/payment notifications will need a small staff-worker update later if wanted.



## Price bot: sab se sasta indicative fare bhi dikhega (v2.38)
- `/price` replies, watch ke price updates aur alerts mein ab verified best ke ilawa **sab se sasta unverified (indicative) fare** bhi show hota hai: `💡 Sab se sasta (indicative/unverified): PKR … — booking se pehle confirm karein` — sirf tab jab wo verified best se sasta ho.
- Ye aggregator-vs-airline-direct pricing ka farq dikhata hai (masalan airarabia.com ka direct price Ignav ke verified price se sasta ho sakta hai).
- Agar kisi route par koi **verified fare hi na mile**, to `/price` ab blank message ke bajaye indicative cheapest dikhata hai warning ke saath.
- Alerts aur triggers waise hi **verified-only** hain — sirf display/labels badle hain, alert behaviour nahi.
- Worker redeploy zaroori hai: Settings → **Telegram price bot** card se naya code copy karein → Cloudflare Worker → Edit code → paste → **Deploy**.



## Telegram reminders — price bot ab alarm bhi deta hai (v2.52)
- Naya command: `/remind <kaam> <waqt>` — masalan `/remind Air Arabia: Usama ki booking 1 bje expire hogi` → team ko **12:00 aur 12:30 par alarm** (default: 1 ghanta + 30 min pehle).
- Waqt Roman Urdu mein: `1 bje` = 1 PM (1–7 baje, bina subah/raat ke, dopahar), `subah 7 bje`, `raat 11 bje`, `9:30`, `kal 1 bje`, `15 December 1 bje`, `30 min baad`, `2 ghantay baad`.
- Apne lead times: `lead=60,30,10` (comma list; `0` = event ke waqt par). `/reminds` — upcoming list · `/unremind R12` · `/unremind all`.
- Reminders quiet hours (02:00–09:00 PKT) ke doran bhi aate hain — ye explicit alarms hain.
- Storage: ek KV key `reminds`; cron har minute check karta hai, sirf fire par 1 KV write (KV.list bilkul nahi — budget-safe).
- Worker v2.52 redeploy zaroori hai (DO binding ke sath, `wrangler.pricebot.toml` recommended).



## Reminder waqt ab 12-ghantay (am/pm) mein (v2.53)
- `/remind` ke tamam messages (confirmation, alarm, `/reminds` list) ab waqt 12-ghantay ke format mein dikhate hain: `10 Nov 2026 1:00 PM PKT` (date + am/pm dono).
- Sirf display badla — reminders ka kaam waisa hi hai. Worker v2.53 redeploy zaroori hai.



## Sales register: PC par wheel hamesha PAGE scroll karta hai (v2.67)
- Masla: mouse register (Sales register grid) ke upar ho to mouse wheel pehle register ke andar ke scroll box ko pakar leta tha — page upar/neeche nahi jata tha; mouse ko register se bahar le jana parta tha.
- Ab desktop/mouse par register ka andar ka scroll box bilkul nahi banta (`@media (hover:hover) and (pointer:fine)` mein `.sheet-scroll` ka max-height hata diya gaya) — wheel ka matlab hamesha page scroll. Sticky column headers ab page ke header ke neeche chipakte hain (`top:var(--header-h)`).
- Mobile/touch par behavior nahi badla (andar ka scroll waisa hi hai). Sirf display fix — data ya save kaam par asar nahi. Worker redeploy ki zaroorat nahi.
