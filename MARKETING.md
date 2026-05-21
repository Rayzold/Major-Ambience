# Major Ambience — Go‑to‑Market Plan

> **Goal:** ship Major Ambience for Windows at the end of Phase 1 (~14 weeks of build), and convert it into a sustainable solo/small‑team product within 12 months of launch. Mobile follows once desktop revenue covers it.
>
> **Companion files.** Product spec: [`DESIGN.md`](DESIGN.md). Build plan: [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md). Pricing is locked in `DESIGN.md § 6.1`.

---

## 1. Strategic Frame

### 1.1 The wedge

**Other tools rent you mood. Major Ambience tunes the mood you already curated.**

Every direct competitor (Syrinscape, Tabletop Audio, Battle Bards) is built around their own curated audio catalog and charges monthly. Major Ambience inverts that — the customer brings their library, owns their grades and scenes, and pays once. *Ownership and autonomy* are the only marketing wedges that matter, because every line of copy will eventually compare against a subscription competitor.

### 1.2 Anchor message

> **Pay once. Own forever. Score every scene.**

Use that as the App Store subtitle, the website hero, and the first three seconds of every demo video.

### 1.3 Target market sizing

| Layer | Size | Notes |
|---|---|---|
| D&D 5e players worldwide | ~40M | Mid‑2020s estimate. Hasbro/WotC numbers. |
| Active GMs | ~3–5M | ~10% of players. |
| GMs who pay for audio tools | ~100–500K | Inferred from Syrinscape + TableTop Audio + Battle Bards customer counts (estimates). |
| Realistic Year‑1 capture | **8K–30K customers** | $14.99–$29.99 ARPU → **$250K–$900K revenue** Year 1. |

These are targets to plan around, not promises. Re‑calibrate after the first 30 days of real data.

---

## 2. Positioning

### 2.1 Competitive map

| Competitor | Model | Price | Their angle | Our counter |
|---|---|---|---|---|
| Syrinscape | Subscription | ~$10/mo or ~$100/yr | Curated soundscapes, deep catalog | One‑time purchase. Your library. |
| Tabletop Audio | Free web | $0 | Free, ad‑supported, browser only | Native app, your files, offline, no ads |
| Battle Bards | Pack purchases | $5–15/pack | Album curation | App that plays your packs (including theirs) better |
| Spotify + manual playlists | Free/Pro | $0–$10/mo | Universal music | Tabletop‑native UI, soundboard, ducking, scenes |

The risk competitor is **Spotify + Discord bots** — free, ubiquitous, "good enough". Beat it on UX (soundboard, scenes, ducking, DM mode), not on catalog.

### 2.2 Brand pillars

1. **Magical** — the spellbook personality from `DESIGN.md § 9`. Display serif, gold italic, theatrical verbs.
2. **Trustworthy** — no subscription, no telemetry by default, no account required to use the app.
3. **Pro** — built by a GM, the visual system is closer to film‑scoring software than to consumer media apps.
4. **Independent** — single dev / small team. Lean into it.

### 2.3 Tagline variants (use, don't waste)

| Surface | Copy |
|---|---|
| Store subtitle | *Pay once. Own forever. Score every scene.* |
| Hero (homepage) | *Tonight's score, in your pocket.* |
| Twitter bio | *Audio companion for tabletop RPGs. Pay once, own it.* |
| 30‑sec elevator | *Major Ambience turns your music folder into a GM's audio studio. Scenes, soundboard, crossfade, ducking. One‑time purchase, no subscription, runs on Windows today and your phone tomorrow.* |
| Convention banner | *Major Ambience — the GM's spellbook for sound.* |

---

## 3. Phased Plan

Plan in 90‑day chunks. Each phase is one solo‑developer's Saturday afternoon away from the previous one.

### 3.1 Phase 0 — Foundation (pre‑launch, 12 weeks before ship)

Goal: 1,000 email subscribers and 30 warm creator relationships before the binary ships.

| Track | Action |
|---|---|
| **Web** | Landing page with hero + 3 screenshots + demo video + email signup. Single file, no CMS. Host on Cloudflare Pages, custom domain (`majorambience.com` or `getambience.com`). |
| **Email** | ConvertKit or Buttondown ($9/mo). Bi‑weekly email: build progress, feature reveals, "ask me anything" prompts. |
| **Twitter/X + Bluesky** | Build‑in‑public posts: WIP screenshots, prototype clips, design decisions. 3–5 posts/week. Use `#dnd #ttrpg #gamemastering #vtm` tags. |
| **Reddit** | Lurk in `r/DnD`, `r/DMAcademy`, `r/rpg`, `r/lfg`. Build karma on unrelated comments. Read each sub's self‑promo rules. Do *not* post the product yet. |
| **Discord** | Join 5–10 large TTRPG servers. Engage as a person. Do not pitch the product. |
| **Creator list** | Build a list of 50 target creators (see § 4.1). Follow them. Engage with their content for two months before reaching out. |
| **Demo video** | 60‑second video showing the prototype workflow. Voiceover. Music + ambience over the actions. Post on YouTube + embed everywhere. |

**Cost:** ~$300 (domain, email, design assets). **Time:** 8–12 hours/week.

### 3.2 Phase 1 — Closed alpha (8 weeks before ship)

Goal: validate the audio engine and onboarding with 50 real GMs.

| Track | Action |
|---|---|
| **Alpha tester program** | Invite 50 GMs from the email list. Free Major‑tier license in exchange for weekly feedback. |
| **Feedback loop** | Discord server, alpha‑only channel. Weekly office hours (60 min). Public changelog. |
| **Iterate** | Ship a build every 2 weeks. Patch crash reports within 48 hours. |
| **Testimonials** | At week 6, ask 10 most engaged testers for a 2‑sentence quote + permission to use. |
| **Press kit** | Build the press kit at week 4 so it's ready by launch (see § 6). |

**Cost:** $0 (alpha licenses cost nothing to grant). **Time:** 6–10 hours/week including support.

### 3.3 Phase 2 — Launch (Week 0)

Goal: $50K revenue in the first 30 days. ~1,700–3,400 customers at $14.99–$29.99 blended ARPU.

A coordinated 7‑day push, not a single day.

| Day | Action |
|---|---|
| **D‑7** | Email list: "We ship Friday. Founder's discount: 15% off in week 1." |
| **D‑3** | Twitter teaser thread with build clips. |
| **D‑1** | Email + Twitter: launch trailer drops. Discord announcement. |
| **D‑0 (Friday morning ET)** | Steam launch + direct download from website live simultaneously. Tweet thread with the trailer + "buy here" link. Email to list. Discord ping. Reddit post on `r/DnD` ("I built this for my home games — Major Ambience is out today"). Five creator videos drop within 24 hours (coordinated via § 4.1). |
| **D+1** | r/rpg post (different angle than r/DnD post — emphasize ownership/no‑subscription). |
| **D+2** | r/DMAcademy post — "how I use it during sessions" angle. |
| **D+3** | Hacker News "Show HN: Major Ambience — audio companion for tabletop RPGs". Be available all day for comments. |
| **D+5** | ProductHunt launch. Coordinate upvotes from the alpha cohort. |
| **D+6** | Press follow‑up: re‑pitch any outlet that didn't cover the trailer drop. |
| **D+7** | First retrospective email to the list. Revenue (transparent number), what worked, what's next. |

**Cost:** ~$2–5K (creator codes if any are paid sponsorships, Steam fee $100 one‑time, ads optional). **Time:** full‑time for the launch week.

### 3.4 Phase 3 — Sustain (weeks 1–12 post‑launch)

Goal: maintain $30–50K/mo, build a content engine, ship one more thing.

| Week | Action |
|---|---|
| 1–4 | Bug‑fix releases. **Public changelog** on the website (this matters — pros watch it). |
| 2 | Launch the **affiliate program** (§ 4.3). Approve first 20 creators. |
| 4 | Drop the **DM Toolkit** add‑on ($4.99). Coordinates a fresh news cycle. |
| 6 | First **seasonal sale**: 20% off for "GM Appreciation Week" (March). Coordinate with creator partners. |
| 8 | Publish first long‑form content piece on the blog: "Why GMs pay once and own forever" — pure positioning post. |
| 10 | First **YouTube tutorial** on the brand channel: "Score your first scene". 5 min. |
| 12 | Mobile public beta announcement (if engineering on track). |

**Cost:** content production ~$500–2K total. **Time:** 4–6 hours/week sustaining + product dev.

### 3.5 Phase 4 — Mobile launch + scale (months 4–12)

| Milestone | Notes |
|---|---|
| **Mobile public beta** | TestFlight + Play Internal Testing. Free for existing desktop customers. |
| **Mobile launch** | Coordinated like § 3.3 but smaller. Existing customers get it free; new mobile‑only customers pay separately or get a "starter" tier. |
| **Convention demo** | Gen Con (Aug) booth or shared booth space if possible. Tier 1 conventions: Gen Con, PAX Unplugged. Tier 2: regional cons. |
| **Black Friday sale** | 25% off all tiers. Pre‑announce 2 weeks out. |
| **Year 1 retrospective** | Public blog post + email. Transparent revenue. Roadmap for Year 2 (Epic tier, VTT integration, Stream Deck plugin). |

---

## 4. Channels

Ranked by leverage. Allocate effort top‑down.

### 4.1 TTRPG content creators — highest leverage

The single biggest lever in TTRPG marketing. One Matt Colville mention is worth a month of Reddit posts. One Ginny Di tutorial drives 2–5K direct‑download conversions.

**Target list (50 names, 3 tiers):**

| Tier | Audience size | Approach | Expected cost |
|---|---|---|---|
| **Tier 1** (>500K subs) | Matt Colville, Ginny Di, Bob World Builder, the Dungeon Dudes, Critical Role adjacent creators | Free copy + handwritten note. Don't expect a video. Maybe a tweet. | $0 |
| **Tier 2** (50–500K subs) | Dungeon Coach, Dael Kingsmill, Lazy DM (Sly Flourish), Pointy Hat | Free copy + offer to sponsor a video ($300–1500). | $3–10K total budget for 8–10 videos |
| **Tier 3** (5–50K subs) | Indie streamers, actual‑play podcasts, theatre‑of‑the‑mind GMs | Free copy + affiliate code (20% commission). | $0 (revenue share only) |

**Approach script (Tier 2):**

> *"Hey [Name] — built a desktop app for GMs called Major Ambience. It's a one‑time‑purchase audio companion (think Syrinscape but you bring your library). I'd love to send you a free Major‑tier license to play with, no strings. If it clicks for you and you'd like to do a sponsored segment, my budget is $X — but I'd rather you only mention it if you actually use it. Trailer: [link]."*

**Concrete first 90 days:** secure 5 Tier‑2 sponsored placements, 10 Tier‑3 affiliate adoptions. Track every conversion via UTM + affiliate codes.

### 4.2 Reddit — organic, careful, high reward

| Subreddit | Members | Tone | Best post angle |
|---|---|---|---|
| r/DnD | ~4M | Mainstream D&D | "I built this for my home games — here's what it looks like" |
| r/DMAcademy | ~500K | GM craft | "How I score sessions without a subscription" |
| r/rpg | ~2M | System‑agnostic, anti‑mainstream | Emphasize ownership, no D&D‑centrism |
| r/dndnext | ~500K | 5e‑specific | Combat encounter scoring focus |
| r/PathfinderRPG | ~150K | Paizo crowd | Show category breadth, no D&D imagery |
| r/lfg | ~250K | Players + GMs looking for games | Sponsor weekly threads if rules allow |
| r/Wayfarers | ~30K | OSR/old school | Lean Arcane theme + lore |

**Rules of engagement:**
- Read self‑promo rules of each sub. Most allow it once per 30 days, often only on specific days.
- Lead with the work, not the pitch. Post a 30‑sec video or a screenshot, mention pricing at the bottom.
- Engage with every comment for 24 hours. Reddit rewards present authors.
- Never astroturf. The TTRPG community sniffs it instantly and will burn you publicly.

### 4.3 Affiliate program

Launch at week 2 post‑release.

- **Commission:** 20% of net revenue per sale, lifetime per customer cookie (180‑day window).
- **Platform:** LemonSqueezy or Paddle (handle affiliate tracking + tax). Avoid building this yourself.
- **Onboarding:** approve manually for the first 100 affiliates so spam doesn't get in.
- **Assets pack:** screenshots, demo video, 30‑sec voiceover‑free clip, banner ads at 4 sizes, copy snippets. Make it impossible for an affiliate to make ugly creative.

### 4.4 Direct sales channels

| Channel | Cut | When | Notes |
|---|---|---|---|
| **Direct (website, Stripe/Lemon Squeezy)** | 3–5% payment processing | Day 1 | **Push customers here.** Best margin, full customer relationship. |
| **Steam** | 30% | Day 1 | Tabletop tag, big audience, established trust. Worth the cut for discovery. |
| **Microsoft Store** | 12% (apps) | Day 1 (Windows) | Lower cut than Steam, lower discovery. Ship anyway. |
| **App Store / Play** | 15% (small business) | Mobile launch | Required. |
| **itch.io** | 0–10% (variable) | Optional | Indie audience. Worth listing for credibility. |

**Direct sales pitch on the website:** offer a 5% extra discount for direct purchases ("Skip the store cut, keep more in indie pockets"). Self‑aware indie messaging plays well.

### 4.5 Discord community

Build the **Major Ambience Discord** at Phase 0. Channels:

- `#announcements` (write‑only)
- `#alpha` (during alpha, gated)
- `#support`
- `#feature‑requests` (with `+1` reaction protocol)
- `#showcase` (GMs share their scene setups)
- `#audio‑share` (talk about packs they bought, not file sharing)
- `#general`
- `#streamers` (separate channel for actual‑play folks)

Aim for 500 members by launch, 5,000 by month 12.

### 4.6 Conventions

| Convention | When | Year | Approach |
|---|---|---|---|
| **Gen Con** (Indianapolis) | August | Year 1 if revenue allows; Year 2 minimum | Booth $5–15K. Demo the app on three laptops + two phones. |
| **PAX Unplugged** | December | Year 2 | Booth or shared booth. |
| **Origins Game Fair** | June | Year 2 | Lower cost, good GM density. |
| **Local cons** | Year‑round | Year 1 | Cheap or free. Practice the pitch. |

Conventions don't sell. They make creators try the app in person, and creators sell.

### 4.7 Paid acquisition — skip Year 1

Meta + Google Ads burn money in the TTRPG niche. Reddit Ads work better but still expensive. Don't run paid ads in Year 1; revisit only if creator marketing plateaus and CAC math works.

---

## 5. Pricing Strategy

Already locked in `DESIGN.md § 6.1`. Marketing considerations:

| Tier | Price | Marketing role |
|---|---|---|
| Demo | Free | **The hook.** Optimize the demo to convert. |
| Minor Ambience | $14.99 | **The entry.** "Cheaper than two months of Syrinscape." |
| Major Ambience | $29.99 | **The hero.** Position as the default. List first on the website. |
| DM Toolkit | $4.99 | **The upsell.** Offer at checkout, in the in‑app menu, and in re‑engagement emails. |

### 5.1 Launch promotion

- **Founder's discount:** 15% off all tiers, week 1 only. Promo code `LAUNCH15`.
- **Bundle discount:** Major + DM Toolkit at $32.99 (saves $1.99). Visual: "Best value" badge.

### 5.2 Recurring sales

Three planned promos per year:

| Period | Discount | Tier | Story |
|---|---|---|---|
| **GM Appreciation Month** (March) | 20% off | All | "For the GMs who score every scene" |
| **Summer Convention Special** (July, before Gen Con) | 15% off | All | Tied to Gen Con announcements |
| **Black Friday** (Nov) | 25% off | All | Largest sale of the year |

Avoid weekly sales — they cheapen the brand and train customers to wait.

---

## 6. Press Kit

Required at week 4 of alpha (Phase 1). Lives at `majorambience.com/press`.

Contents:

1. **Fact sheet** — one‑page PDF: name, tagline, platforms, pricing, key features, dev story, launch date, contact.
2. **Logo pack** — SVG + PNG, light + dark, square + horizontal.
3. **Screenshots** — 8–12 PNGs, no overlays, 1920×1080 and 1290×2796 (iPhone Pro).
4. **Demo video** — 60‑sec trailer, 30‑sec cut, no‑voiceover B‑roll for embeds.
5. **Founder story** — 200 words, first‑person, why you built it.
6. **Press quote** — one‑liner journalists can pull: *"Major Ambience is the audio companion built by a GM who got tired of subscriptions."*
7. **Review codes** — generate 25 on request via a form.

**Target outlets:**

| Outlet | Angle |
|---|---|
| ENWorld | Industry news + reviews |
| The Gauntlet | Indie GM community |
| Tabletop Game Bookshelf | Game accessories |
| Polygon (TTRPG vertical) | Mainstream, hard to land |
| PC Gamer | Tabletop coverage occasionally |
| Rascal News | Indie TTRPG journalism |
| RPG.net | Forum reviews |
| Geek & Sundry adjacent | Critical Role network |

---

## 7. Metrics & Targets

### 7.1 Phase 0 (pre‑launch) targets

| Metric | Target |
|---|---|
| Email subscribers | 1,000 |
| Twitter followers | 500 |
| Discord members | 200 |
| Alpha testers | 50 |
| Tier‑2 creator relationships warmed | 8 |

### 7.2 Phase 2 (launch month) targets

| Metric | Target |
|---|---|
| Day‑1 revenue | $15K |
| Week‑1 revenue | $35K |
| Month‑1 revenue | $50K |
| Customers | 1,700–3,400 |
| Mailing list growth | +3,000 |
| Affiliate signups | 30 |

### 7.3 Year 1 targets

| Metric | Target |
|---|---|
| Revenue | $250K–$900K |
| Customers | 8K–30K |
| Mobile launched | Month 6–9 |
| DM Toolkit attach rate | 25–40% of buyers |
| Refund rate | <3% |
| Discord | 5,000 members |

### 7.4 Tracking infrastructure (minimum viable)

- **Analytics:** Plausible.io (privacy‑friendly, ~$9/mo). No Google Analytics.
- **Sales:** Lemon Squeezy or Paddle (handle tax, affiliates, refunds).
- **Email:** ConvertKit or Buttondown.
- **Crash reporting:** Sentry (free tier).
- **In‑app telemetry:** **off by default.** Toggleable. If on, send anonymous feature‑use counts only — never content metadata.

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| One bad creator review tanks launch week | Med | High | Diversify — never depend on a single Tier‑1 placement. |
| Apple/Google rejects mobile build | Med | Med | Submit early, conservative store copy, no copyrighted track names in screenshots. |
| Piracy | High | Low | Accept it. Loyal converters pay anyway. Sign builds; do not invest in DRM. |
| Subscription competitor cuts prices to match | Med | Med | Lean harder into ownership messaging; subscription cuts make our wedge sharper. |
| WotC TTRPG license shake‑up | Low | Low | App is system‑agnostic. Position with Pathfinder, Daggerheart, OSR alongside D&D. |
| GM burnout / solo‑dev fatigue | High | High | 90‑day cycles with rest weeks. Outsource support after month 3. |
| Audio licensing complaint about Demo Pack | Low | Med | Use public‑domain music + commissioned SFX. Document all sources. |
| Refund storms from a buggy release | Low | High | Phase‑gate releases through the alpha cohort. Pause sales if critical bug ships. |

---

## 9. Budget (Year 1, realistic)

| Category | Cost |
|---|---|
| Domain + hosting | $200 |
| Email service (ConvertKit Pro) | $300 |
| Cloudflare Workers + KV (sync) | $0–200 |
| Sentry + Plausible | $200 |
| Code signing (EV cert) | $400 |
| Apple Developer + Google Play | $124 + $25 |
| Creator sponsorships (Phase 1–2) | $5–10K |
| Demo Pack commissioning | $2–4K |
| Launch press kit + trailer | $1–3K |
| Gen Con booth (if Year 1) | $8–15K |
| Misc (legal review, accounting) | $1–2K |
| **Total** | **$18K–35K Year 1** |

Reachable with ~600–1,200 customers at blended ARPU. Anything above that funds Year 2 (mobile launch, Epic tier development, second hire if revenue allows).

---

## 10. 90‑Day Action Plan

Concrete actions for the first 90 days of marketing work, starting **now** (parallel to engineering Phase 1).

### Weeks 1–4

- [ ] Register `majorambience.com`. Launch landing page (single static file).
- [ ] Set up email service. Embed signup on landing page.
- [ ] Create Twitter/X account + Bluesky account. Bio + pinned launch trailer placeholder.
- [ ] Set up Discord server (skeleton channels per § 4.5).
- [ ] Compile the 50‑creator target list. Spreadsheet with handle, audience size, content focus, last 3 videos, contact method, status.
- [ ] Start build‑in‑public posts. 3 posts/week minimum.
- [ ] Record a rough 60‑sec demo video using the prototype (already shippable as a demo!).

### Weeks 5–8

- [ ] Email list at 250+. Send first newsletter.
- [ ] Begin engaging with Tier‑2 creators' content publicly (comments, retweets). No pitches yet.
- [ ] Polish the demo video — voiceover, music, captions.
- [ ] Reach out to first 10 Tier‑3 creators with free codes — no expectation of coverage.
- [ ] Draft press kit (factsheet, founder story, key images).
- [ ] First Reddit post (`r/DMAcademy`): "I'm building this for my home games — what would make it indispensable for you?" — survey post, no link.

### Weeks 9–12

- [ ] Email list at 600+. Discord at 100+.
- [ ] Send first Tier‑2 outreach (8 creators) with personalized notes.
- [ ] Confirm 3 sponsored placements for launch week.
- [ ] Open closed alpha to 50 GMs from the email list.
- [ ] Press kit live on website.
- [ ] Steam page submitted (Coming Soon).
- [ ] Microsoft Store listing drafted.

By week 12, the marketing engine is warm: there's an audience, there are creators waiting, there are reviewers in alpha producing testimonials. Engineering finishes Phase 1 around week 14 and the launch in § 3.3 fires.

---

## 11. Voice & Channel Style

A few rules to keep marketing consistent with the product personality.

- **Use *italic gold* for emphasis on the website**, the same treatment the app uses. It's a brand signature.
- **Never use "user" in marketing copy.** Say "you" or "GMs".
- **Founder voice on Twitter** is acceptable and recommended. Mix product clips with personal GM stories. Be the GM in the audience's head.
- **No FOMO copy.** No "limited time only!" pressure language. The brand is calm and confident.
- **No corporate verbs.** Compare:
  - ❌ *"Manage your audio library"*
  - ✅ *"Score every scene"*
  - ❌ *"Configure your settings"*
  - ✅ *"Tune the table"*
- **Reply to every customer email personally for the first 1,000 customers.** This is unsustainable forever but unbeatable at launch. The community will talk about it.

---

*Last updated: 2026‑05. Update the Decisions Log in `DESIGN.md` whenever a marketing decision lands.*
