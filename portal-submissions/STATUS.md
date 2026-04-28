# Portal Submission Status

Live tracker for all portal submissions. Updated as each phase progresses.

---

## Summary

| Portal | Account | SDK ID | Build Ready | Submitted | Approved | Live URL | Notes |
|---|---|---|---|---|---|---|---|
| CrazyGames | ⬜ Not created | N/A (own ads) | ✅ | ⬜ | ⬜ | — | Top priority. Curated. |
| Poki | ⬜ Not created | N/A | ✅ | ⬜ | ⬜ | — | Highest traffic. Curated, may reject. |
| GameDistribution | ⬜ Not created | ⬜ Pending | ✅ | ⬜ | ⬜ | — | Easiest, serves ads. SDK already integrated. |
| Y8 | ⬜ Not created | N/A | ✅ | ⬜ | ⬜ | — | Auto-approval likely. |
| Kongregate | ⬜ Not created | N/A | ✅ | ⬜ | ⬜ | — | Legacy audience, low effort. |
| Itch.io | ✅ Verified 2026-04-24 | N/A | ✅ | 🟡 In progress | ⬜ | Pending | See ITCH_SUBMISSION.md walkthrough. Cover image needed. |

---

## Submission Steps Per Portal

### 1. CrazyGames — **PRIORITY 1**
- **Submit URL:** https://developer.crazygames.com/
- **Account needed under:** Jesse Tamburino / bourneash@gmail.com
- **SDK required:** Optional (CrazyGames SDK) — can submit without for v1
- **Build format:** ZIP of `dist/` directory, index.html at root
- **Max size:** 500MB
- **Review time:** 3-14 days
- **Revenue:** 50/50 ad rev share
- **Autonomous-ability:** Partial — account creation requires email verification; Claude can prep build + assets, Jesse verifies email

### 2. Poki — Priority 2
- **Submit URL:** https://developers.poki.com/
- **Account needed under:** Jesse Tamburino / bourneash@gmail.com
- **SDK required:** YES (Poki SDK mandatory — replaces GameDistribution SDK in Poki build)
- **Build format:** ZIP with Poki SDK integrated
- **Max size:** 50MB
- **Review time:** 7-21 days
- **Revenue:** Rev share + flat rate on exclusives
- **Autonomous-ability:** Partial — Jesse creates account first, Claude preps Poki-specific build

### 3. GameDistribution — Priority 3 (fastest to revenue)
- **Submit URL:** https://gamedistribution.com/partner
- **Account needed under:** Jesse Tamburino / bourneash@gmail.com
- **SDK required:** YES — **already integrated** in js/ads.js
- **Build format:** ZIP of `dist/` directory
- **Max size:** 50MB
- **Review time:** 1-7 days
- **Revenue:** 50/50 ad rev share, plus distributes to 1000+ partner sites
- **Autonomous-ability:** Partial — Jesse verifies email, Claude submits

### 4. Y8
- **Submit URL:** https://account.y8.com/developer
- **SDK required:** Optional
- **Build format:** ZIP
- **Review time:** 1-14 days
- **Autonomous-ability:** Partial

### 5. Kongregate
- **Submit URL:** https://www.kongregate.com/developer
- **SDK required:** Optional (Kongregate API for stats)
- **Build format:** ZIP or hosted URL
- **Review time:** 7-30 days
- **Autonomous-ability:** Partial

### 6. Itch.io
- **Submit URL:** https://itch.io/game/new
- **SDK required:** No
- **Build format:** ZIP or hosted URL
- **Review time:** Instant (no review, public immediately)
- **Revenue:** 100% yours (Itch takes optional cut); can also accept tips
- **Autonomous-ability:** Full — Claude can do end-to-end once account exists

---

## Account Creation Queue

Claude cannot autonomously create portal accounts (requires email verification, CAPTCHA, sometimes phone). These are queued for Jesse:

**Action needed from Jesse (~15 min total):**

1. Go to each portal URL above
2. Sign up with `bourneash@gmail.com`
3. Verify email
4. Set developer display name to "Jesse Tamburino" or "RC-9 Games"
5. Paste the API key / developer dashboard URL into `CREDENTIALS.md`

Once accounts exist, Claude handles:
- Build packaging per portal
- Metadata entry
- Asset upload
- Submission
- Status tracking
- Ad SDK integration per portal's requirements

---

## Last Updated
2026-04-24
