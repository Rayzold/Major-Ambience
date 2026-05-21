# Risks & Legal

> An internal scan of the legal, IP, and platform risks Major Ambience faces. **Not legal advice.** Where something matters, consult an attorney licensed in your jurisdiction.
>
> This document gets updated whenever a risk lands or a new one surfaces. See `DESIGN.md § 13` for the decisions log.

---

## 1. Trademark

### 1.1 "Major Ambience"

**Status:** Not yet registered.

**Action items before launch:**

- [ ] USPTO TESS search for `MAJOR AMBIENCE` in Class 9 (downloadable software) and Class 41 (entertainment / interactive entertainment services)
- [ ] EUIPO search (same classes, EU territory)
- [ ] UKIPO search
- [ ] Common‑law search via Google, App Store, Steam, itch.io, Bandcamp
- [ ] Domain check: `majorambience.com`, `.app`, `.io`, plus typo variants
- [ ] Reddit + Discord + X handle availability

**Risk level:** Low‑medium. "Ambience" is a generic term; "Major" is a common modifier. The phrase together is distinctive enough to register in Class 9. The biggest risk is an existing audio production company using a near‑variant.

**If conflict found:** fall back to alternatives in `DESIGN.md § 13` decisions log (none listed yet; backup names to be added after the trademark search).

### 1.2 Tier names — "Minor / Major / Epic"

D&D 5e and previous editions use Minor Illusion, Major Image, etc. as spell names. Tier‑naming conventions are generally not trademarkable (they're descriptive), but using the *exact* spell names in marketing copy creates avoidable IP friction.

**Rule:** never write "Minor Illusion", "Major Image" or any verbatim spell name in marketing or product copy. The tier names *Minor / Major / Epic* on their own are fine.

---

## 2. Audio licensing

### 2.1 User‑imported audio

**The product never ships audio files.** Users supply their own. This is the safest possible posture — Major Ambience is a player, not a distributor.

**Customer obligation (in EULA):** customers represent that they have the right to play the audio they import. We don't audit their library, and we don't host their files.

### 2.2 The Demo Pack

The free Demo tier ships with ~20 tracks built into the binary. This is the single licensing surface we control.

**Sourcing rules:**

- **Music:** public domain only (IMSLP recordings of pre‑1923 classical works). Even within "public domain", recordings can be separately copyrighted — verify each performance.
- **Ambience and SFX:** commissioned work‑for‑hire from a sound designer with a signed contract assigning full rights. Or CC0‑licensed (e.g., Freesound CC0 pool, BBC Sound Effects with their license terms verified).
- **Strictly avoid:** anything CC‑BY‑SA (forces attribution we'd have to surface in app), CC‑NC (we're a commercial product), or unclear‑license uploads.

**Document everything.** Per‑track license file in `apps/desktop/assets/demo-pack/licenses/` with: source, license type, license URL, date acquired, contract reference if commissioned.

### 2.3 Future commissioned content packs

Per `DESIGN.md § 10`, no marketplace at launch. If first‑party commissioned packs ship later (e.g., "Ravenloft Horror Pack"), each pack needs:

- Work‑for‑hire contract with the composer/designer, full rights assigned
- Recorded chain of custody for every sample used inside the pack
- No samples from royalty‑free libraries that prohibit redistribution inside a commercial product

---

## 3. Platform / store risk

### 3.1 Apple App Store

**Submission risk:** medium. Apple reviews tabletop products inconsistently. Past rejections in this space have flagged:

- "Spam" — apps that look like generic media players. **Mitigation:** demonstrate tabletop‑specific UX in screenshots (scenes, soundboard, ducking).
- "Misleading metadata" — using copyrighted franchise names ("D&D", "Pathfinder") in marketing. **Mitigation:** use generic terms ("tabletop RPGs", "GMs") in metadata. The compatibility statement on the product *page* is fine; the App Store *metadata fields* should stay clean.
- "Functionality" — apps deemed "not useful". **Mitigation:** the Demo Pack must work end‑to‑end at first launch.

**Pre‑submission checklist:**

- [ ] No emoji or special characters in app name
- [ ] No copyrighted track names visible in screenshots
- [ ] No reference to specific TTRPG systems in title/subtitle
- [ ] Background audio mode declared in `Info.plist`
- [ ] App privacy disclosure filled (likely "Data Not Collected")
- [ ] Review notes explain background audio with a demo account walkthrough

### 3.2 Google Play

Generally more permissive. Watch for:

- Foreground service compliance — `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission declared with `serviceType` in manifest (required in 2026 Android)
- Data safety form filled honestly
- Target SDK version compliance (latest within 12 months)

### 3.3 Steam

Most permissive. Risks:

- Tag mismatch — list as "Casual / Indie / Utility / Tabletop" not "Music" (Music tag has a separate review path with restrictions)
- Trading card eligibility — not relevant for a utility app
- Review brigading risk — TTRPG community is generally positive but vocal. Engage early reviewers personally.

### 3.4 Microsoft Store

Lowest cut (12% vs 30%), lowest discovery. Worth listing for the cut alone. No expected friction.

---

## 4. Privacy and data protection

### 4.1 What we collect

Per `DESIGN.md § 12`:

- **Off by default:** anonymous feature‑use counts (which screens are used, no content)
- **With sync (Major+):** email (for magic‑link auth) and the sync blob (grades, scenes, notes — no file paths, no track contents)
- **Never:** track names, file paths, audio metadata, listening history, personally identifying info beyond email

### 4.2 Compliance posture

- **GDPR (EU):** required. Lawful basis for sync = contract performance (the customer purchased sync). Right to erasure: deleting the account purges the sync blob within 30 days.
- **CCPA (California):** required if revenue thresholds are met. Same posture — no sale of data, no third‑party sharing.
- **COPPA:** not applicable; the app is not directed at children under 13.
- **Apple App Tracking Transparency:** not relevant; we don't track across other apps.

### 4.3 Required documents at launch

- [ ] **Privacy Policy** — public URL, linked from store listings and the website
- [ ] **Terms of Service / EULA** — including the "you have rights to the audio you import" clause
- [ ] **Cookie notice** — only if the website uses any cookies (Plausible doesn't; if we add anything, this triggers)
- [ ] **DPA template** for any B2B (game stores) customers

---

## 5. Trademark of mentioned games

We **do not** use copyrighted or trademarked TTRPG names in product or marketing copy. Some allowed and disallowed examples:

| Allowed | Disallowed |
|---|---|
| "audio companion for tabletop RPGs" | "the audio app for D&D 5e" |
| "works for any system" | "Pathfinder soundtrack tool" |
| "score your sessions" | "Critical Role–style audio" |
| Track names users see come from their own files | Pre‑bundled track named "Mind Flayer Theme" |

The product is system‑agnostic. The marketing must read system‑agnostic.

### 5.1 Open Game License (WotC) considerations

We don't use OGL content (monster names, spell names, class names), so we have no exposure to OGL revisions. The 2023 OGL crisis demonstrated this surface is volatile — staying away from OGL terminology is strategic insulation.

### 5.2 Pathfinder, Daggerheart, OSR systems

Same posture — don't name them in product copy. Customer reviews and creator videos can mention any system they want; that's their speech, not ours.

---

## 6. Competitive / commercial

### 6.1 Subscription competitor undercut

Risk: Syrinscape or similar drops their monthly price to $5/mo or offers a "lifetime" tier near our Minor price.

**Mitigation:** ownership is the wedge, not price. Marketing copy emphasizes "no recurring charge", "no internet required to use", "your library, your scenes". A price war drains them faster than us because they have infrastructure to fund.

### 6.2 Apple/Google taking the category

Risk: Apple Music or Spotify ships a "tabletop scenes" feature.

**Likelihood:** very low. The feature set (ducking, soundboard, scenes, weighted shuffle, DM mode) is too vertical.

**If it happens:** we still own the workflow advantage and the community. Pivot doesn't apply — we'd just lose 10–20% of casual customers.

### 6.3 WotC reshuffling

Risk: D&D 6e (One D&D) launch changes the community landscape mid‑Year 1.

**Likelihood:** medium‑high — 2025–2027 has been turbulent.

**Mitigation:** product is system‑agnostic. Marketing emphasizes Pathfinder 2e, Daggerheart, OSR alongside D&D. If D&D fragments the community, the player count *grows* (more systems = more games), which favors a system‑agnostic tool.

### 6.4 Refund storms

Risk: a buggy release triggers a wave of refund requests on Steam or App Store.

**Mitigation:**
- Phase‑gate releases through the 50‑GM alpha (`MARKETING.md § 3.2`).
- Sentry crash reports monitored; pause sales if critical crashes spike.
- Honest refund policy — refund without question within 14 days, *period*. Goodwill compounds.
- Refund rate target: <3%. Above 5%, treat as a quality crisis.

---

## 7. Operational

### 7.1 Solo developer continuity

Risk: founder unable to ship for an extended period.

**Mitigation:**
- Public, opinionated documentation (this repo) means a contractor can pick up the work.
- Source code is in GitHub with backups; no exotic infra.
- Cloud sync is one Cloudflare Worker — replaceable in a day.
- No physical inventory, no employees, no leases — the business pauses cleanly.

### 7.2 Payment processor account closure

Risk: Stripe / Lemon Squeezy / Paddle suspends the account.

**Mitigation:**
- Multi‑processor setup from day one: Stripe primary, Lemon Squeezy backup, both able to fulfill instantly.
- Reserve fund: keep 60 days of operating costs liquid.
- Customer database hosted independently of the processor.

### 7.3 GitHub / DNS / CDN outage

Risk: hosting provider outage during launch.

**Mitigation:**
- Cloudflare Pages + Cloudflare DNS — vertically integrated provider, very high uptime, fast failover.
- Steam, Microsoft Store, App Store, Play Store, itch.io — five independent channels means at least three are always up.
- Customer downloads go through the store of purchase; no single point of failure.

---

## 8. Insurance and entity structure

### 8.1 Entity formation

**Action item before first sale:** form an LLC (US) or equivalent limited‑liability entity in your jurisdiction. Sole proprietorship exposes personal assets to product‑liability claims (vanishingly unlikely for a media app, but cheap to mitigate).

### 8.2 Insurance

Likely not required at this scale, but worth a one‑hour conversation with an insurance broker before $100K in revenue:

- General liability — typical for any product company, ~$500/yr
- Errors & Omissions — covers software defects, ~$1.5–3K/yr
- Cyber liability — covers data breach response, ~$1K/yr

Total potential cost: ~$3–5K/yr. Reassess at $250K revenue.

---

## 9. Pre‑launch legal checklist

Run this list before D‑0:

- [ ] LLC or equivalent entity formed
- [ ] Bank account separate from personal
- [ ] Tax registration (US: EIN; EU: VAT registration if applicable)
- [ ] Privacy Policy and Terms of Service published at `majorambience.com/privacy` and `/terms`
- [ ] EULA included in installer
- [ ] Trademark search complete; filing optional but recommended ($350 USPTO fee per class)
- [ ] Demo Pack license files documented
- [ ] All commissioned content has signed work‑for‑hire contracts on file
- [ ] App Store / Play Store metadata reviewed against `§ 3.1` rules
- [ ] Refund policy published
- [ ] Multi‑processor payment fallback configured
- [ ] One‑hour insurance broker conversation booked

---

*Last updated: 2026‑05. Not legal advice. Consult counsel.*
