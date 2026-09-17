# PLAN: Fraud Visibility & Prevention Features (Duplicate Blocker & Unverified Hits)

## 1. High-Level Approach
Add per-project duplicate entry protection and comprehensive unverified hit visibility to Opinion Insights CAWI.
1. **Duplicate Entry Blocker:** Enforce project-scoped duplicate protection during tracking link resolution before session creation. Rule A: blocks IP if already `COMPLETE` on project. Rule B: blocks UID if already used on project in any status. Renders tone-customizable block pages (`BLK-IP-...` and `BLK-UID-...`).
2. **Unverified Hits Visibility:** Surface unverified hits from `fake_click_events` on Dashboard overview (metric card, live feed, spike alert), Response Table (Verified / Unverified tabs + detail slide-over), Project Detail page (country badges), and Analytics page (rate chart, top IPs).

---

## 2. Scope

### In-Scope:
- **Database:**
  - Table `blocked_entry_attempts` with indexes on `sessions(project_id, ip_hash)` and `sessions(project_id, normalized_uid)`.
  - Fraud configuration columns on `projects` (`block_duplicate_ip`, `block_duplicate_uid`, `soft_duplicate_mode`, `block_tone`, `allow_nat_ip`, `custom_ip_message`, `custom_uid_message`).
  - Triage fields on `fake_click_events` (`is_reviewed`, `reviewed_at`, `reviewed_by`, `status`).
  - Table `ip_access_rules` (`ip_hash`, `ip_address`, `action`: `WHITELIST` | `BLACKLIST`, `reason`, `created_at`).
- **Backend Middleware & Link Entrypoints:**
  - Integration in `/track`, `/s/:projectCode`, and `/start/:linkCode`.
  - Transactional check for existing completed IP or existing UID under same `project_id`.
  - Reference ID generation: `BLK-IP-[A-Z0-9]{8}` and `BLK-UID-[A-Z0-9]{8}`.
  - New endpoints for unverified summary, live feed, blocked logs, mark-reviewed, whitelist, and IP block.
- **Frontend & Block Pages:**
  - Dedicated Block Page route `/blocked` with 4 tone variants (Rude default, Polite, Neutral, Custom).
  - Admin Blocked Log page: `/dashboard/projects/[id]/blocked`.
  - Dashboard Overview: Unverified hits metric card, 10s live feed, threshold alert banner (>20% or IP spike).
  - Responses Page: "All", "Verified", "Unverified" tab segregation with red tint, 🚫 badge, and detail panel.
  - Project Detail Page: Country card unverified badges and blocked attempt metrics.
  - Analytics Page: Unverified rate chart, top offending IPs, breakdown table.

### Out-of-Scope:
- Cross-project global IP/UID blocking (strictly per-project as specified).
- Billing or quota impact for unverified/blocked hits (strictly $0, 0 quota count).
- Changing verified respondent callback signature or HMAC workflows.

---

## 3. Data Model Changes

### 3.1 Migration DDL
```sql
-- 1. Project Fraud Configuration Columns
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS block_duplicate_ip BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS block_duplicate_uid BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS soft_duplicate_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS block_tone VARCHAR(32) DEFAULT 'RUDE',
  ADD COLUMN IF NOT EXISTS allow_nat_ip BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_ip_message TEXT,
  ADD COLUMN IF NOT EXISTS custom_uid_message TEXT;

-- 2. Blocked Entry Attempts Table
CREATE TABLE IF NOT EXISTS blocked_entry_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  country_code VARCHAR(10),
  block_type VARCHAR(20) NOT NULL, -- 'IP' | 'UID'
  value_hash VARCHAR(128) NOT NULL,
  raw_value VARCHAR(255),
  reason VARCHAR(255) NOT NULL,
  reference_id VARCHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(128),
  ip_hash VARCHAR(128),
  user_agent TEXT,
  tone VARCHAR(32) DEFAULT 'RUDE',
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  is_unblocked BOOLEAN DEFAULT FALSE,
  unblocked_at TIMESTAMPTZ,
  unblocked_by VARCHAR(128)
);

-- 3. IP Access Rules (Whitelisting / Permanent Block)
CREATE TABLE IF NOT EXISTS ip_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(128) NOT NULL,
  ip_hash VARCHAR(128) NOT NULL,
  rule_type VARCHAR(20) NOT NULL, -- 'WHITELIST' | 'BLACKLIST'
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = GLOBAL
  reason TEXT,
  created_by VARCHAR(128) DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_ip_rule UNIQUE (ip_hash, rule_type, project_id)
);

-- 4. Triage Columns for fake_click_events (Unverified Hits)
ALTER TABLE fake_click_events
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(128),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_proj_ip ON sessions ((metadata_json->>'project_id'), ip_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_proj_uid ON sessions ((metadata_json->>'project_id'), normalized_uid);
CREATE INDEX IF NOT EXISTS idx_responses_proj_status ON responses (project_id, final_status);
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_proj ON blocked_entry_attempts (project_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_ref ON blocked_entry_attempts (reference_id);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_reviewed ON fake_click_events (is_reviewed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_project ON fake_click_events (project_id, created_at DESC);
```

---

## 4. API Contracts

### 4.1 Unverified Hits & Fraud Monitoring Endpoints
- `GET /api/dashboard/unverified-summary`
  - Response: `{ total_today: number, yesterday_total: number, trend_pct: number, verified_count: number, unverified_count: number, unverified_rate_pct: number, threshold_alert: boolean, top_spiking_ips: Array<{ ip: string, hits_1h: number }> }`
- `GET /api/dashboard/unverified-live?limit=20`
  - Response: `Array<{ id: string, created_at: string, project_id: string, project_code: string, project_name: string, country: string, ip: string, ip_hash: string, uid: string, rejection_reason: string, provider: string, is_reviewed: boolean }>`
- `GET /api/responses?type=unverified&page=1&limit=50&project_id=...`
  - Response: `{ data: [...], pagination: { page, limit, total } }`
- `POST /api/unverified/:id/mark-reviewed`
  - Body: `{ notes?: string }`
  - Response: `{ success: true, id: string, reviewed_at: string }`
- `POST /api/unverified/:id/whitelist-ip`
  - Body: `{ reason: string, global?: boolean }`
  - Response: `{ success: true, rule_id: string, ip: string }`
- `POST /api/unverified/:id/block-ip`
  - Body: `{ reason: string, global?: boolean }`
  - Response: `{ success: true, rule_id: string, ip: string }`

### 4.2 Blocked Attempts Endpoints
- `GET /api/projects/:id/blocked`
  - Params: `page`, `limit`, `type` (`IP` | `UID`), `search`, `unblocked` (boolean)
  - Response: `{ summary: { total_blocked: number, last_24h: number, unique_ips: number }, rows: [...], pagination: {...} }`
- `POST /api/projects/:id/blocked/:attemptId/unblock`
  - Body: `{ reason: string }`
  - Response: `{ success: true, message: string }`
- `GET /api/projects/:id/fraud-config` & `PUT /api/projects/:id/fraud-config`
  - Body: `{ block_duplicate_ip: boolean, block_duplicate_uid: boolean, soft_duplicate_mode: boolean, block_tone: string, allow_nat_ip: boolean, custom_ip_message?: string, custom_uid_message?: string }`

---

## 5. UI Component Tree

```text
src/
├── app/
│   ├── blocked/
│   │   └── page.tsx                         # Respondent Block Page (?ref=BLK-...&type=IP|UID&pid=...)
│   ├── dashboard/
│   │   ├── page.tsx                         # Extended with Unverified Metric, Feed & Alert Banner
│   │   ├── responses/
│   │   │   └── page.tsx                     # Response table with All / Verified / Unverified Tabs
│   │   ├── analytics/
│   │   │   └── page.tsx                     # Analytics with Unverified Trends & Top Offending IPs
│   │   └── projects/[projectId]/
│   │       ├── page.tsx                     # Project Detail with Unverified Badges & Fraud Settings
│   │       └── blocked/
│   │           └── page.tsx                 # Project Blocked Entry Attempts Panel
├── components/
│   ├── fraud/
│   │   ├── UnverifiedMetricCard.tsx         # Dashboard Big Number + Verified/Unverified Ratio
│   │   ├── UnverifiedLiveFeed.tsx           # Red-tinted 10s auto-refresh feed
│   │   ├── UnverifiedAlertBanner.tsx        # High spike alert (>20% or IP spike)
│   │   ├── UnverifiedDetailModal.tsx        # Response table slide-over (review/whitelist/block)
│   │   ├── BlockedAttemptsTable.tsx         # Admin table for /blocked logs
│   │   └── ProjectFraudConfigModal.tsx      # Toggle rules + tone selector
│   └── blocked/
│       ├── BlockCardHero.tsx                # Distinctive block badge + reference pill
│       └── ToneMessageCard.tsx              # Dynamic Rude/Polite/Neutral/Custom copy
```

---

## 6. Block Page Copy & Tone Matrix

| Tone | Rule A (IP Duplicate after Complete) | Rule B (UID Duplicate in any status) |
|---|---|---|
| **Rude (Default)** | *"Bhai, tumne is survey ko pehle hi complete kar liya hai. Fir gaand kyu marwa rahe ho?"* | *"Ye UID is project me pehle use ho chuka hai. Naya UID lekar aao, ya vendor se naya le lo."* |
| **Polite** | *"Aapne yeh survey pehle hi safaltapoorvak poora kar liya hai. Ek respondent sirf ek baar survey de sakta hai. Sahyog ke liye dhanyawaad!"* | *"Yeh respondent ID is survey me pehle darj ho chuki hai. Kripya naye link ya ID ke sath prayaas karein."* |
| **Neutral** | *"Submission restricted: Our records show a verified complete from this network for this study."* | *"Identifier already registered: This participant UID has an existing record on this project."* |
| **Custom** | *[Admin-configured text from `projects.custom_ip_message`]* | *[Admin-configured text from `projects.custom_uid_message`]* |

**Common Elements on All Block Pages:**
- Reference ID pill (e.g. `BLK-IP-92F8A17D`, `BLK-UID-3C04E819`) with one-click copy.
- Project Name, Country Code, Blocked Timestamp.
- "Contact Support" button (links to `mailto:support@opinioninsights.in?subject=Blocked%20Reference%20[REF]`).
- Security telemetries: Client IP hash, SHA-256 fingerprint.
- Clean HTTP 200 return (never 500 or broken page).

---

## 7. Execution Checklist

### Phase 1: Database & Backend Core
- [ ] Run migration DDL for `blocked_entry_attempts`, `ip_access_rules`, project fraud settings, and indexes.
- [ ] Implement `checkDuplicateEntry()` in `src/services/trackingService.ts`:
  - Check NAT IP whitelist exceptions.
  - Check `responses` + `sessions` for `COMPLETE` matching `ip_hash` + `project_id`.
  - Check `sessions` for any status matching `normalized_uid` + `project_id`.
  - Insert log into `blocked_entry_attempts` if blocked.
- [ ] Integrate blocker into `/track`, `/s/:projectCode`, and `/start/:linkCode`.
- [ ] Create `/blocked` route in Next.js app rendering responsive block page with all 4 tones and reference IDs.
- [ ] Add `/api/projects/:id/blocked` and `/api/projects/:id/fraud-config` endpoints.

### Phase 2: Unverified Hits Backend & Dashboard Surfacing
- [ ] Create endpoints:
  - `GET /api/dashboard/unverified-summary`
  - `GET /api/dashboard/unverified-live`
  - `GET /api/responses?type=unverified`
  - `POST /api/unverified/:id/mark-reviewed`
  - `POST /api/unverified/:id/whitelist-ip`
  - `POST /api/unverified/:id/block-ip`
- [ ] Add Dashboard Metric Card (Today unverified hits, verified vs unverified ratio).
- [ ] Add Dashboard Live Feed Card (Red-tinted, 10s auto-refresh, last 20 rows).
- [ ] Add Dashboard Alert Banner for spikes (>20% unverified or 5+ hits/hr from same IP).

### Phase 3: Response Table & Project Detail Integration
- [ ] Update Response Table on `/dashboard/responses`:
  - Top tabs: "All", "✅ Verified", "🚫 Unverified".
  - Red-tinted styling + 🚫 badge for unverified rows.
  - Slide-over detail panel with IP, User-Agent, Provider, and Action buttons (Mark Reviewed, Whitelist IP, Block IP).
- [ ] Update Project Detail on `/dashboard/projects/[projectId]`:
  - Add Country Card unverified badge count.
  - Add "Fraud & Duplicates" button linking to `/dashboard/projects/[projectId]/blocked`.
- [ ] Update Analytics on `/dashboard/analytics`:
  - Unverified rate chart over time.
  - Top 5 offending IPs and breakdown by vendor/country.

### Phase 4: Verification & Screenshots
- [x] Utilize `/mock-survey?token=...&pid=...&uid=...` QA simulator to run complete/terminate outcomes directly from frontend and trigger duplicate IP / UID scenarios.
- [x] Run automated scenario tests:
  1. Complete survey via `/mock-survey` -> IP complete registered.
  2. Re-enter same project with same IP -> Duplicate Entry Blocker intercepts -> Rude IP block page shown (`BLK-IP-XXXXXXXX`).
  3. Re-enter same project with same UID -> Duplicate Entry Blocker intercepts -> Rude UID block page shown (`BLK-UID-XXXXXXXX`).
  4. Soft mode toggle -> warning flag logged, survey allowed.
  5. Direct unverified hit -> appears on dashboard live feed within 10s.
  6. Response table tab toggles ("All", "Verified", "Unverified") and shows slide-over with operator actions.
- [x] Captured proof screenshots with Playwright to `FRAUD_FEATURE_PROOF/`:
  - `00_mock_survey_simulator.png`
  - `01_block_page_ip_rude.png`
  - `02_block_page_uid_rude.png`
  - `03_block_page_polite.png`
  - `04_project_blocked_admin_table.png`
  - `05_dashboard_unverified_metric_and_feed.png`
  - `05b_unverified_live_feed_card.png`
  - `06_dashboard_spike_alert.png`
  - `07_response_table_unverified_tab.png`
  - `08_unverified_detail_panel.png`
  - `09_project_detail_unverified_badges.png`
  - `10_analytics_unverified_chart.png`

---

## 8. Open Questions / Confirmations
- *None blocking.* Defaults follow project specification strictly: Rude tone default, project-scoped isolation, $0 billing, 0 quota count for all unverified & blocked attempts.
