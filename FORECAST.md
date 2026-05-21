# Major Ambience — Year 1 Sales Forecast

> Projections assume the marketing plan in [`MARKETING.md`](MARKETING.md) is executed as written, starting **3 months before the desktop launch**. Numbers are estimates; recalibrate after the first 30 days of real data.

---

## 1. Assumptions

| Variable | Value | Source |
|---|---|---|
| Pricing tiers | $14.99 / $29.99 / $4.99 add‑on | `DESIGN.md § 6.1` |
| Tier mix (paid customers) | 40% Minor / 60% Major | Assumption; recalibrate post‑launch |
| DM Toolkit attach rate | 30% | `MARKETING.md § 7.3` target band 25–40% |
| Refund rate | 3% | Industry standard for one‑time digital products |
| Sales channel mix | 60% direct / 30% Steam / 10% MS Store | Marketing strategy push toward direct |
| Channel cuts | 5% / 30% / 12% respectively | Stripe / Steamworks / Microsoft Store |
| **Blended channel cut** | **13.2%** | `0.6×0.05 + 0.3×0.30 + 0.1×0.12` |
| Pre‑launch email list | 1,000 | `MARKETING.md § 7.1` target |
| Alpha tester cohort | 50 | `MARKETING.md § 3.2` |
| Tier‑2 creator placements at launch | 8 | `MARKETING.md § 4.1` |
| Affiliate (Tier‑3) creators | 30 by Month 8 | `MARKETING.md § 4.3` |

### 1.1 Blended ARPU calculation

```
Tier mix:
  40% × $14.99 (Minor)      = $5.996
  60% × $29.99 (Major)      = $17.994
  30% × $4.99  (DM Toolkit) = $1.497
                              ───────
                              $25.49  blended ARPU (gross)
```

### 1.2 Net revenue per customer

```
$25.49  blended ARPU
× 0.97  refund-adjusted (3% refunds)
× 0.868 net of blended channel cut (13.2%)
= $21.46 net revenue per customer
```

---

## 2. Monthly Model — Base Case

The 12‑month timeline assumes desktop launch at the **start of Month 4** (after a 3‑month Phase 0/1 marketing + alpha runway), DM Toolkit at Month 6, mobile launch at Month 9, Black Friday sale at Month 12.

| Month | Phase | Activity | New Customers | Gross Rev | Net Rev | Cumulative Net |
|---:|---|---|---:|---:|---:|---:|
| **1** | Phase 0 | Landing page, email list build, social presence | 0 | $0 | $0 | $0 |
| **2** | Phase 0 | Build‑in‑public, creator outreach begins | 0 | $0 | $0 | $0 |
| **3** | Phase 1 | Closed alpha (50 GMs), press kit prep | 0 | $0 | $0 | $0 |
| **4** | **LAUNCH** | Coordinated 7‑day push, founder's discount | 2,000 | $50,980 | $42,920 | $42,920 |
| **5** | Sustain | Bug fixes, public changelog, affiliate program opens | 1,200 | $30,588 | $25,752 | $68,672 |
| **6** | DM Toolkit | $4.99 add‑on drops; existing buyers + new attach | 1,400 | $35,686 | $30,044 | $98,716 |
| **7** | Steady | GM Appreciation sale (20% off, 1 week) | 1,000 | $25,490 | $21,460 | $120,176 |
| **8** | Mobile beta | TestFlight + Play Internal Testing announcement | 1,300 | $33,137 | $27,898 | $148,074 |
| **9** | **MOBILE LAUNCH** | Existing customers free upgrade; new mobile buyers | 2,800 | $71,372 | $60,088 | $208,162 |
| **10** | Sustain | Convention demos (PAX Unplugged), content engine | 1,500 | $38,235 | $32,190 | $240,352 |
| **11** | Pre‑BF | Tease Black Friday sale | 1,100 | $28,039 | $23,606 | $263,958 |
| **12** | **BLACK FRIDAY** | 25% off all tiers, biggest sale | 2,500 | $63,725 | $53,650 | **$317,608** |
| **Total** | | | **14,800** | **$377,251** | **$317,608** | |

---

## 3. Three Scenarios

The base case above sits in the middle of the range from `MARKETING.md § 7.3` ($250K–$900K Year 1). Lower bound = creator marketing underperforms; upper bound = one Tier‑1 placement lands.

| Scenario | Customers (Yr 1) | Gross Rev | Net Rev | Net minus marketing ($25K) |
|---|---:|---:|---:|---:|
| **Conservative** | 7,400 (−50%) | $188,600 | $158,800 | **$133,800** |
| **Base** | 14,800 | $377,250 | $317,600 | **$292,600** |
| **Optimistic** | 25,000 (+69%) | $637,250 | $536,500 | **$511,500** |

### 3.1 What drives each scenario

| Driver | Conservative impact | Base | Optimistic impact |
|---|---|---|---|
| Email list at launch | 500 (half target) | 1,000 | 2,000 (Tier‑1 placement during Phase 0) |
| Tier‑2 creator placements | 3 (half secured) | 8 | 12 (oversubscribed) |
| Reddit launch‑post reception | Lukewarm | ~500 upvotes | Front‑page (`r/all`) one of three posts |
| Affiliate program adoption by Month 8 | 10 active | 30 active | 80 active |
| Mobile launch reception | Soft (TestFlight bugs) | On‑plan | Featured by Apple as "App of the Day" or Google "Play Pick" |
| Refund rate | 5% | 3% | 2% |
| Tier mix shift | 60% Minor / 40% Major | 40 / 60 | 25 / 75 (Major as the default) |

---

## 4. Sensitivity Analysis

Holding everything else constant, what moves the needle most?

| Variable | Change | Impact on Year 1 Net Revenue |
|---|---|---|
| Tier mix shift Major +10pp | 40/60 → 30/70 | **+$22K** (~+7%) |
| DM Toolkit attach +10pp | 30% → 40% | **+$7K** (~+2%) |
| Direct sales mix +20pp | 60% → 80% direct | **+$18K** (~+6%) |
| Launch month customers +500 | 2,000 → 2,500 | **+$11K** (~+3.5%) |
| Mobile launch customers +1,000 | 2,800 → 3,800 | **+$21K** (~+6.5%) |
| Black Friday customers +1,000 | 2,500 → 3,500 | **+$21K** (~+6.5%) |
| Tier‑1 creator placement | One Matt Colville‑sized video lands | **+$50–100K** (largest single lever) |

**Headline insight.** The biggest swing factor isn't channel mix or tier split — it's whether *one* Tier‑1 creator does a video. Plan as if it won't happen (base case), build the relationship so it might.

---

## 5. Year 2 Outlook

Year 2 unlocks two things Year 1 doesn't:

- **Returning customers buying upgrades** — existing Minor‑tier customers upgrade to Major (charge difference: $15.00). If 20% of Year‑1 Minor buyers upgrade, that's ~1,200 × $15 = **+$18K**.
- **Epic tier release** ($49.99) — held back from Year 1. Even at 5% of installed base adopting, that's ~700 × $49.99 = **+$35K**.

Plus the run‑rate from Year 1 (~$25–50K/month sustaining) and one full year of mobile.

Conservative Year 2 estimate: **$400–800K**. The product becomes self‑sustaining around month 18.

---

## 6. Break‑Even Math

| Item | Year 1 |
|---|---:|
| Net revenue (base case) | $317,608 |
| − Marketing budget | −$25,000 |
| − Hosting + tooling | −$1,000 |
| − Code signing + dev accounts | −$600 |
| − Commissioned Demo Pack | −$3,000 |
| − Legal / accounting | −$2,000 |
| **Net before founder salary** | **$285,008** |

If solo: that's the founder's compensation. If 2‑person team (engineering + marketing/support): split roughly $140K each, lower than salaried equivalents but covers cost of living in most US/EU cities.

**Break‑even on hours:** if the founder values their time at $100/hr, the project breaks even at **~2,850 hours** in Year 1. For a solo dev shipping Phase 1 in 14 weeks, that's ~30 hours/week through the year — tight but doable as a side build for an experienced GM.

---

## 7. What the Numbers Are *Not* Telling You

- **No paid acquisition budget assumed.** Adding $20K of well‑targeted Reddit/Meta spend at the right moment (launch week, Black Friday) could shift base → optimistic. Test small first.
- **No B2B revenue.** Tabletop game stores, LARP organizations, university tabletop clubs could buy bulk licenses (10‑seat packs). Out of scope for Year 1.
- **No content pack revenue.** The DESIGN.md non‑goals list "no marketplace at launch" — but a single first‑party content pack (e.g., "Ravenloft Horror Pack") at $9.99 could move the needle in Year 2.
- **No premium support tier.** Pro GMs running paid sessions would pay for priority support; not modeled.
- **Refunds modeled at 3%.** A buggy mobile launch could spike this to 10%+ for a month. Phase‑gate releases through alpha.

---

## 8. The One Chart

If reduced to a single chart, this is the story:

```
$60K ┤                                                  ▓
$55K ┤                                                  ▓
$50K ┤   ▓                                              ▓
$45K ┤   ▓                              ▓               ▓
$40K ┤   ▓                              ▓               ▓
$35K ┤   ▓                              ▓               ▓
$30K ┤   ▓        ▓                     ▓     ▓         ▓
$25K ┤   ▓   ▓    ▓    ▓    ▓     ▓     ▓     ▓    ▓    ▓
$20K ┤   ▓   ▓    ▓    ▓    ▓     ▓     ▓     ▓    ▓    ▓
     └───┬───┬────┬────┬────┬─────┬─────┬─────┬────┬────┬───
        M4  M5   M6   M7   M8    M9    M10   M11  M12
       Lnch Sus  DM   Stdy MblB  MblL  Sus   PrBF BF
```

Each shaded bar = monthly net revenue. Three peaks: Launch, Mobile Launch, Black Friday. The valleys (M7, M11) are where content marketing and creator partnerships have to carry the run‑rate.

---

*Last updated: 2026‑05. Update when the first 30 days of real launch data come in.*
