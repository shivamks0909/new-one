# OPINION INSIGHTS CAWI PLATFORM — MASTER SYSTEM OVERVIEW

<!-- TL;DR (20 Lines) -->
> **Platform Summary:** Opinion Insights CAWI (Computer-Assisted Web Interviewing) is an enterprise-grade market research fieldwork gateway, vendor link management, and anti-fraud telemetry platform.
> **Primary Problem Solved:** Eliminates fraudulent survey callbacks, prevents duplicate respondent entries, enforces quota capping across distributed vendors, and segregates unauthorized "direct hits" from billable fieldwork data.
> **Top 5 Core Features:**
> 1. Multi-country, multi-vendor link orchestration with dynamic UID injection and HMAC-signed callbacks.
> 2. Automated Per-Project Duplicate Blocker (Rule A: Duplicate IP after completion; Rule B: Duplicate UID in any status) with customizable rude/polite respondent block pages.
> 3. Unverified Hits Telemetry & Segregation (fake/direct callbacks isolated from client billing and vendor payouts with real-time live feed and triage actions).
> 4. Financial Reconciliation Engine (per-country margin modeling, automated vendor settlements, and audit-ready multi-sheet Excel exports).
> 5. Database Quota Sentinel (500 MB free-tier storage tracking, automated health snapshots, and safety-gated `RESET-CONFIRM` two-step reset mechanism).
> **Target Users:** Market Research Agencies, Operations Managers, Fieldwork Analysts, Sample Vendors, and End Survey Respondents.
> **Technology Stack:** Next.js 14 App Router, TypeScript, React 18, Tailwind CSS, Express 5 backend API bridge, PostgreSQL / SQLite driver abstraction, ExcelJS, Playwright.
> **Key Differentiator:** Zero-trust architecture where unverified traffic can never corrupt research quotas or financial billing, backed by cryptographic session tokens and constant-time signature verification.

---

## Table of Contents
- [1. Platform Overview](#1-platform-overview)
  - [1.1 What is this platform?](#11-what-is-this-platform)
  - [1.2 What business problem does it solve?](#12-what-business-problem-does-it-solve)
  - [1.3 Platform Actors & Roles](#13-platform-actors--roles)
  - [1.4 Real-World End-to-End Fieldwork Scenario](#14-real-world-end-to-end-fieldwork-scenario)
  - [1.5 What Happens Without This Platform?](#15-what-happens-without-this-platform)
- [2. User Roles & Permissions](#2-user-roles--permissions)
  - [2.1 Role Definitions](#21-role-definitions)
  - [2.2 Comprehensive RBAC Permission Matrix](#22-comprehensive-rbac-permission-matrix)
  - [2.3 Data Scoping & Vendor Isolation](#23-data-scoping--vendor-isolation)
  - [2.4 Destructive Action Governance](#24-destructive-action-governance)
- [3. Dashboard — Every Page & Every Control](#3-dashboard--every-page--every-control)
  - [3.1 Main Dashboard Home (`/dashboard`)](#31-main-dashboard-home-dashboard)
  - [3.2 Projects Directory (`/dashboard/projects`)](#32-projects-directory-dashboardprojects)
  - [3.3 5-Step Project Wizard (`/dashboard/projects/new`)](#33-5-step-project-wizard-dashboardprojectsnew)
  - [3.4 Project Workspace & Detail (`/dashboard/projects/[id]`)](#34-project-workspace--detail-dashboardprojectsid)
  - [3.5 Project Blocked Attempts Table (`/dashboard/projects/[id]/blocked`)](#35-project-blocked-attempts-table-dashboardprojectsidblocked)
  - [3.6 Responses Hub (`/dashboard/responses`)](#36-responses-hub-dashboardresponses)
  - [3.7 Tracking Links Manager (`/dashboard/tracking-links`)](#37-tracking-links-manager-dashboardtracking-links)
  - [3.8 Quota Management (`/dashboard/quotas`)](#38-quota-management-dashboardquotas)
  - [3.9 Vendors Admin Directory (`/dashboard/vendors`)](#39-vendors-admin-directory-dashboardvendors)
  - [3.10 Vendor Self-Service Portal (`/dashboard/vendor`)](#310-vendor-self-service-portal-dashboardvendor)
  - [3.11 User Management (`/dashboard/admin-users`)](#311-user-management-dashboardadmin-users)
  - [3.12 Fieldwork Analytics (`/dashboard/analytics`)](#312-fieldwork-analytics-dashboardanalytics)
  - [3.13 Finance & Margins (`/dashboard/finance`)](#313-finance--margins-dashboardfinance)
  - [3.14 Database & Storage Center (`/dashboard/database`)](#314-database--storage-center-dashboarddatabase)
  - [3.15 Audit Trail (`/dashboard/audit`)](#315-audit-trail-dashboardaudit)
  - [3.16 Credential Vault (`/dashboard/credentials`)](#316-credential-vault-dashboardcredentials)
  - [3.17 Settings (`/dashboard/settings`)](#317-settings-dashboardsettings)
  - [3.18 Survey Builder (`/dashboard/surveys` & `/dashboard/surveys/builder`)](#318-survey-builder-dashboardsurveys--dashboardsurveysbuilder)
- [4. Project Lifecycle — End to End](#4-project-lifecycle--end-to-end)
  - [4.1 Creation Wizard Flow](#41-creation-wizard-flow)
  - [4.2 Lifecycle State Transitions](#42-lifecycle-state-transitions)
  - [4.3 Multi-Country Quota & Pricing Configuration](#43-multi-country-quota--pricing-configuration)
  - [4.4 Vendor Link Allocation](#44-vendor-link-allocation)
  - [4.5 Pausing, Resuming, and Live Project Modifications](#45-pausing-resuming-and-live-project-modifications)
- [5. Tracking Link System](#5-tracking-link-system)
  - [5.1 URL Structure & Macro Interpolation](#51-url-structure--macro-interpolation)
  - [5.2 Ingestion & Session Creation Flow](#52-ingestion--session-creation-flow)
  - [5.3 Identity Sanitization & IP Hashing](#53-identity-sanitization--ip-hashing)
  - [5.4 Cryptographic Signatures & Nonce Replay Guards](#54-cryptographic-signatures--nonce-replay-guards)
- [6. Fraud Prevention & Duplicate Blocker](#6-fraud-prevention--duplicate-blocker)
  - [6.1 Rule A: Completed IP Restriction](#61-rule-a-completed-ip-restriction)
  - [6.2 Rule B: Repeated UID Restriction](#62-rule-b-repeated-uid-restriction)
  - [6.3 Respondent Block Gateway (`/blocked`)](#63-respondent-block-gateway-blocked)
  - [6.4 Block Tone Copy Library (Rude, Polite, Neutral, Custom)](#64-block-tone-copy-library-rude-polite-neutral-custom)
  - [6.5 Soft Mode vs Hard Enforcement](#65-soft-mode-vs-hard-enforcement)
  - [6.6 NAT Exceptions & Whitelist/Blacklist Engine](#66-nat-exceptions--whitelistblacklist-engine)
- [7. Unverified Hits System](#7-unverified-hits-system)
  - [7.1 What is an Unverified Hit?](#71-what-is-an-unverified-hit)
  - [7.2 Interception Vectors & `fake_click_events`](#72-interception-vectors--fake_click_events)
  - [7.3 Live Feed, Spike Banner, and Response Segregation](#73-live-feed-spike-banner-and-response-segregation)
  - [7.4 Operator Triage Actions (Review, Whitelist, Blacklist)](#74-operator-triage-actions-review-whitelist-blacklist)
  - [7.5 Financial & Quota Firewall Invariants](#75-financial--quota-firewall-invariants)
- [8. Response Management](#8-response-management)
  - [8.1 Outcome Classification Lifecycle](#81-outcome-classification-lifecycle)
  - [8.2 Anti-Fraud Terminate-to-Complete Guard](#82-anti-fraud-terminate-to-complete-guard)
  - [8.3 Speeder Detection (< 15s LOI)](#83-speeder-detection--15s-loi)
  - [8.4 Reconciliation Fields: Billing & Payout Statuses](#84-reconciliation-fields-billing--payout-statuses)
- [9. Finance & Settlement](#9-finance--settlement)
  - [9.1 Pricing Architecture (Client CPI vs Vendor CPI)](#91-pricing-architecture-client-cpi-vs-vendor-cpi)
  - [9.2 Margin Calculations & Multi-Currency Rules](#92-margin-calculations--multi-currency-rules)
  - [9.3 Client Invoicing & Vendor Settlement Batches](#93-client-invoicing--vendor-settlement-batches)
- [10. Database Center](#10-database-center)
  - [10.1 Free Tier 500 MB Storage Telemetry](#101-free-tier-500-mb-storage-telemetry)
  - [10.2 5-Sheet Master Excel Export](#102-5-sheet-master-excel-export)
  - [10.3 Two-Step Database Reset (`RESET-CONFIRM`)](#103-two-step-database-reset-reset-confirm)
  - [10.4 Reset Safety Matrix (What Gets Wiped vs Kept)](#104-reset-safety-matrix-what-gets-wiped-vs-kept)
- [11. Survey Builder (LimeSurvey RemoteControl 2)](#11-survey-builder-limesurvey-remotecontrol-2)
  - [11.1 Architecture & JSON-RPC Integration](#111-architecture--json-rpc-integration)
  - [11.2 Question Group & Question Mapping](#112-question-group--question-mapping)
  - [11.3 Publication, Preview & Local Fallback Mock](#113-publication-preview--local-fallback-mock)
- [12. Analytics](#12-analytics)
  - [12.1 Key Fieldwork Metrics (IR, LOI, Conversion)](#121-key-fieldwork-metrics-ir-loi-conversion)
  - [12.2 Study Performance & Vendor Delivery](#122-study-performance--vendor-delivery)
  - [12.3 14-Day Velocity & Top Offending Networks](#123-14-day-velocity--top-offending-networks)
- [13. Settings & Administration](#13-settings--administration)
  - [13.1 User Provisioning & Password Resets](#131-user-provisioning--password-resets)
  - [13.2 System Preferences & Security Settings](#132-system-preferences--security-settings)
- [14. Status Pages (Respondent Side)](#14-status-pages-respondent-side)
  - [14.1 Status Gateway (`/redirect/:status`)](#141-status-gateway-redirectstatus)
  - [14.2 The 6 Respondent Landing Views (`/survey/status`)](#142-the-6-respondent-landing-views-surveystatus)
  - [14.3 Sound FX, Memes, and Dynamic Verification Badges](#143-sound-fx-memes-and-dynamic-verification-badges)
  - [14.4 Mock Survey Simulator (`/mock-survey`)](#144-mock-survey-simulator-mock-survey)
- [15. Public & Private API Endpoints](#15-public--private-api-endpoints)
- [16. Authentication & Security Architecture](#16-authentication--security-architecture)
- [17. Data Model — Complete Database Schema](#17-data-model--complete-database-schema)
- [18. Comprehensive Glossary](#18-comprehensive-glossary)
- [19. What to Read First: New Developer Guide](#19-what-to-read-first-new-developer-guide)

---

## 1. Platform Overview

### 1.1 What is this platform?
Opinion Insights CAWI is a centralized tracking hub, link dispatch gateway, and fraud prevention firewall designed for computer-assisted web interviewing (CAWI). In market research, research agencies create surveys (e.g., in Qualtrics, Decipher, Confirmit, or LimeSurvey) and hire multiple panel suppliers (sample vendors) to provide human respondents. 

This platform sits directly between the sample vendors and the client survey engine. It issues secure tracking links, monitors incoming traffic, validates that respondents are unique, routes qualified participants into the target survey, listens for completion callbacks from the survey engine, prevents bot speeders, and returns respondents safely to their respective vendors with cryptographic proof.

### 1.2 What business problem does it solve?
In modern digital research, sample procurement faces severe operational and financial vulnerabilities:
1. **Duplicate Paneling:** Unscrupulous or careless respondents take the same high-paying survey multiple times across different panels or accounts, corrupting statistical data.
2. **Fake Postback / Complete Injection:** Malicious vendors or bot farms scrape "Complete" redirect URLs and fire thousands of artificial completion pings directly to the platform to falsely claim payouts without taking the survey.
3. **Over-Quota Burn:** Vendors continue flooding a study with traffic after demographic targets (e.g., males aged 18-24) have closed, leading to massive screen-out frustration and disputes.
4. **Reconciliation Chaos:** At the end of fieldwork, comparing spreadsheet logs between client survey completes and vendor invoices takes days. Opinion Insights automates billing status, currency conversion, and vendor margin calculations.

### 1.3 Platform Actors & Roles
The platform serves five distinct user personas:
1. **Super Admin / Executive:** Oversees system health, database quotas, user provisioning, global IP blacklists, and financial margins.
2. **Project Manager / Fieldwork Operator:** Designs multi-country projects, sets sample quotas, generates vendor links, monitors live incoming clicks, pauses lagging cells, and triages unverified hits.
3. **Research Analyst:** Analyzes incidence rates (IR), length of interview (LOI), drop-off distributions, and fraud rates across vendors.
4. **Sample Vendor (Panel Provider):** Logs into a dedicated, isolated portal to view only their assigned projects, download tracking links, and check accepted completes and payouts.
5. **Survey Respondent:** End-user who clicks a vendor link, passes security checks, answers questions, and sees a branded, responsive outcome landing page.

### 1.4 Real-World End-to-End Fieldwork Scenario

```
 [Client / Brand]
        │ 1. Orders 1,000 completes across US & India ($5.00 / $2.50 CPI)
        ▼
 [Opinion Insights CAWI Platform]
        │ 2. Operator creates Project 'OPI-8801' with multi-country quotas & rates
        │ 3. Issues unique tracking links to Vendor A (Dynata) & Vendor B (Cint)
        ▼
   [Sample Vendor] ──► Dispatches link to panelist with macro: &uid=USER_9981
        │
        ▼
 [OPI /track Gateway]
        │ 4. Checks Duplicate IP (Rule A) & Duplicate UID (Rule B)
        │ 5. Creates Session (trk_...) + Logs LANDING event + Hashes IP
        │ 6. Injects UID into client survey URL: https://client-survey.com?id=USER_9981
        ▼
 [Client Survey Platform]
        │ 7. Respondent takes 15-minute survey questionnaire
        │ 8. Survey finishes ──► Redirects to: https://opi.opinioninsights.in/redirect/complete?pid=OPI-8801&uid=USER_9981
        ▼
 [OPI /redirect/complete Gateway]
        │ 9. Validates session token & ensures session wasn't previously TERMINATED
        │ 10. Verifies LOI >= 15 seconds (catches speeder bots)
        │ 11. Increments Quota count & marks response as VERIFIED COMPLETE
        │ 12. Generates HMAC redirect signature
        ▼
 [Respondent Screen] ──► Displays Branded "Survey Complete!" Page with Confetti & Audio FX
        │
        ▼ (Optional)
 [Vendor Callback API] ──► Pings Vendor postback with original transaction ID for panelist payout
```

### 1.5 What Happens Without This Platform?
Without Opinion Insights:
- Fieldwork operators manually construct dozens of messy tracking links in Excel.
- Clients reject 20-30% of completed surveys due to duplicate IP addresses or speeder bots, leaving the agency with thousands of dollars in unbillable vendor costs.
- Direct link scrapers fire fake completion URLs, artificially claiming incentives.
- Fieldwork managers have no visibility into live vendor delivery or sudden fraud spikes.

---

## 2. User Roles & Permissions

### 2.1 Role Definitions
The system enforces strict Role-Based Access Control (RBAC) via JWT claims evaluated in `src/auth/middleware.ts`:
- **`SUPER_ADMIN`**: Full platform authority. Sole role permitted to execute database resets, inspect server credential vaults, manage administrative staff, and configure global security rules.
- **`ADMIN`**: Enterprise fieldwork administrator. Manages projects, clients, vendors, user accounts, financial rates, invoices, and quota overrides.
- **`OPERATOR`**: Day-to-day project manager. Scaffolds multi-country projects, monitors live feeds, pauses/resumes links, and triages unverified responses.
- **`ANALYST`**: Read-only fieldwork intelligence. Inspects response funnels, incidence rates, vendor conversion velocities, and export reports.
- **`VENDOR`**: External panel supplier. Scoped strictly to their assigned studies, tracking links, and generated responses. Cannot see client names, client rates, or other vendors.

### 2.2 Comprehensive RBAC Permission Matrix

| Feature / Action | SUPER_ADMIN | ADMIN | OPERATOR | ANALYST | VENDOR | Code Enforcement |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **View Dashboard Overview** | ✅ | ✅ | ✅ | ✅ | ❌ | `authorize(['SUPER_ADMIN','ADMIN','OPERATOR','ANALYST'])` |
| **Create / Edit Projects** | ✅ | ✅ | ✅ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN','OPERATOR'])` |
| **Pause / Resume Projects** | ✅ | ✅ | ✅ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN','OPERATOR'])` |
| **Archive Projects** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` |
| **Configure Project Fraud Rules** | ✅ | ✅ | ✅ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN','OPERATOR'])` |
| **View All Responses** | ✅ | ✅ | ✅ | ✅ | Scoped | `authorize(ALL_ROLES)` + `vendor_id` filter |
| **Review / Reject Responses** | ✅ | ✅ | ✅ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN','OPERATOR'])` |
| **Triage Unverified Hits** | ✅ | ✅ | ✅ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN','OPERATOR'])` |
| **View Financial Margins & Rates** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` |
| **Generate Client Invoices** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` |
| **Manage Sample Vendors** | ✅ | ✅ | ✅ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN','OPERATOR'])` |
| **Manage System Users** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` |
| **Access Credential Vault** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` |
| **Reveal Decrypted Passwords** | ✅ | ❌ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN'])` |
| **View Database Storage Stats** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` |
| **Export Master DB Backup** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` |
| **Execute Database Reset** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` + `RESET-CONFIRM` |
| **View Audit Trail** | ✅ | ✅ | ❌ | ❌ | ❌ | `authorize(['SUPER_ADMIN','ADMIN'])` |

### 2.3 Data Scoping & Vendor Isolation
Data isolation for `VENDOR` users is enforced at two separate layers:
1. **API Controller Layer (`src/routes/index.ts`):**
   ```typescript
   if (req.user?.role === 'VENDOR') {
     const vendorId = req.user.vendor_id;
     // Automatically injects WHERE vendor_id = $X into all queries
   }
   ```
2. **PostgreSQL Row Level Security (RLS) (`006-rbac-vendor-isolation.sql`):**
   Tables `studies`, `tracking_links`, `sessions`, `responses`, and `quotas` enforce database-level policies verifying `users.vendor_id = record.vendor_id`. A vendor can never observe another vendor's completes, CPI, or link codes.

### 2.4 Destructive Action Governance
Destructive operations (purging responses, archiving live projects, or resetting database tables) are safeguarded by:
- Mandatory 2-step confirmation modals with explicit keyword input (`RESET-CONFIRM`).
- Automated capture into `audit_logs` including actor user ID, IP address, before/after JSON snapshots, and timestamp.

---

## 3. Dashboard — Every Page & Every Control

### 3.1 Main Dashboard Home (`/dashboard`)
- **Route:** `src/app/dashboard/page.tsx`
- **Purpose:** Central mission control displaying real-time fieldwork velocity, conversion funnels, unverified hit alerts, and active project health.
- **Visible Sections:**
  - **Header Bar:** Platform status pill (`SYSTEM OPERATIONAL`), Quick Export Excel button, Refresh Data button, and Profile dropdown.
  - **Global Filter Row:** Study dropdown, Vendor dropdown, Country dropdown, Date range selector, and Reset Filters button.
  - **Traffic Mode Segmented Switch:** `All Traffic` | `✓ Verified` | `✗ Unverified`. Toggling instantly recalculates all metrics and funnels.
  - **Unverified Spike Alert Banner:** Appears dynamically when unverified hits exceed 15% of daily volume. Displays offending IP and a one-click `Triage Fake Clicks` button.
  - **KPI Cards Grid:** Active Projects, Total Clicks, Verified Clicks, Unverified Today (with day-over-day trend %), Starts, Completes, Conversion Rate %, and Average LOI.
  - **Fieldwork Funnel:** Visual conversion bar chart (Clicks → Starts → Completes) with dual-color breakdown of legitimate vs fake volume.
  - **Outcome Distribution Donut Chart:** Graphical breakdown of Completes, Terminated, Quota Full, Quality Fails, and Security Intercepts.
  - **Live Unverified Hits Feed:** Real-time stream (auto-refreshed every 10 seconds) displaying recent direct hit intercepts with IP, reason tag, and timestamp.
  - **Active Projects Table:** Real-time table of running studies with target progress bars, active countries, and quick-access action menus.
- **Related API Endpoints:** `GET /api/dashboard/stats`, `GET /api/unverified/summary`, `GET /api/unverified/live-feed`.

### 3.2 Projects Directory (`/dashboard/projects`)
- **Route:** `src/app/dashboard/projects/page.tsx`
- **Purpose:** Searchable and filterable catalog of all market research projects across all lifecycle states.
- **Controls & Features:**
  - **Search Bar:** Real-time text search across project code, study title, and client name.
  - **Status Filter:** Tabs for `All`, `Active / Live`, `Configuring / Draft`, `Paused`, and `Archived`.
  - **`+ New Project` Button:** Launches the 5-step Project Creation Wizard.
  - **Project Table Cards:** Displays Project Code, Client Name, Target Completes, Current Completes, Country Badges, and Financial Margin %.
  - **Row Action Menu:** `Open Workspace`, `Configure Fraud Rules`, `Pause/Resume`, and `Archive`.
- **Related API Endpoints:** `GET /api/projects`, `POST /api/projects/:id/pause`, `POST /api/projects/:id/resume`.

### 3.3 5-Step Project Wizard (`/dashboard/projects/new`)
- **Route:** `src/app/dashboard/projects/new/page.tsx`
- **Purpose:** Comprehensive enterprise wizard for configuring multi-market research studies with distinct quotas, currencies, and vendor allocations.
- **Step-by-Step Breakdown:**
  1. **Step 1: Basic Info**
     - Fields: Project Name, Auto-generated Project Code (`OPI-XXXX`), Client Selector dropdown, Description, Base Survey URL, UID URL Parameter (default: `uid`), and UID Placeholder (e.g. `{UID}`).
  2. **Step 2: Country Selection**
     - Searchable catalog of 26 global markets categorized by region (Americas, Europe, Asia Pacific, MEA).
     - Multi-select capability with auto-assigned ISO country codes and default local currencies.
  3. **Step 3: Rates & Fieldwork Quotas**
     - Per-country configuration cards: Client Billing Rate (CPI), Baseline Vendor Rate (CPI), Target Completes, Estimated LOI (minutes), Planned Fieldwork Duration (days), and Country Survey URL Override.
     - Live Margin Calculator: Instantly computes estimated project revenue, vendor cost, gross profit, and gross margin percentage.
  4. **Step 4: Vendors & Sample Allocation**
     - Assign multiple vendors per country.
     - Allocate specific target quotas and custom vendor CPIs per partner.
     - Toggle `Internal Only` sample allocation.
  5. **Step 5: Review & Confirm**
     - Pre-flight validation checklist (detects missing URLs, unallocated quotas, or negative margins).
     - Single-click `Launch Project` button that atomically commits project, country, link, and quota records.
     - Post-launch Modal: Displays all generated tracking links with one-click copy and Excel export.
- **Related API Endpoints:** `POST /api/projects`, `GET /api/clients`, `GET /api/vendors`.

### 3.4 Project Workspace & Detail (`/dashboard/projects/[id]`)
- **Route:** `src/app/dashboard/projects/[projectId]/page.tsx`
- **Purpose:** Complete operational management hub for a single active or historical project.
- **Panels & Controls:**
  - **Project Header Bar:** Project Code badge, Client name, Status pill (`LIVE`, `PAUSED`, `ARCHIVED`), and Quick Action buttons (`Pause/Resume`, `Archive`, `🛡️ Fraud & Blocked`).
  - **Country Grid:** Interactive country cards showing Target vs Achieved completes, progress bar, LOI, and Unverified Hit count.
  - **`+ Add Country` Modal:** Allows expanding live projects to new geographic markets on the fly.
  - **Vendor Tracking Links Table:** Lists every vendor link for the selected country with live complete count, vendor quota, vendor CPI, link status, and copy URL button.
  - **`+ Add Vendor Link` Modal:** Generates a new link code for an onboarding vendor.
  - **Link Action Menu:** `Regenerate Link Code` (invalidates compromised link), `Edit Vendor CPI`, `Pause Link`, and `Delete Link`.
  - **Fraud Rules Modal:** Configures duplicate IP and UID rules specific to this project.
- **Related API Endpoints:** `GET /api/projects/:id`, `POST /api/projects/:id/countries`, `POST /api/projects/:id/links`.

### 3.5 Project Blocked Attempts Table (`/dashboard/projects/[id]/blocked`)
- **Route:** `src/app/dashboard/projects/[projectId]/blocked/page.tsx`
- **Purpose:** Dedicated security audit log showing every respondent who was blocked from entering the survey.
- **Controls & Columns:**
  - **Summary Metrics:** Total Blocked Count, Blocks in Last 24 Hours, and Unique Blocked IPs.
  - **Violation Filter:** `All Violations` | `IP Violations` | `UID Violations`.
  - **Search Box:** Searches by Reference ID, UID, IP, or Reason.
  - **Data Columns:** Reference ID (`BLK-IP-XXXX` or `BLK-UID-XXXX`), Type badge, Timestamp, Value (masked IP or UID), Failure Reason, Block Tone applied, and Status.
  - **`Unblock Attempt` Button:** Allows an admin to resolve respondent support inquiries by whitelisting their IP or marking the block as overturned.
  - **`Configure Fraud Rules` Button:** Opens modal to toggle Rule A, Rule B, soft mode, and customize block messages.
- **Related API Endpoints:** `GET /api/projects/:id/blocked`, `POST /api/projects/:id/blocked/:attemptId/unblock`.

### 3.6 Responses Hub (`/dashboard/responses`)
- **Route:** `src/app/dashboard/responses/page.tsx`
- **Purpose:** Master ledger of every respondent transaction recorded by the platform.
- **Tabs & Filters:**
  - **Segmented Tabs:**
    - `All Responses`: Every logged record.
    - `✓ Verified`: Legitimate sessions initiated via valid tracking links.
    - `✗ Unverified`: Fake, direct, or corrupted callbacks captured without an active tracking token.
  - **Filter Controls:** Project selector, Vendor selector, Country selector, Outcome status filter (`COMPLETE`, `TERMINATE`, `QUOTA_FULL`, `QUALITY_FAIL`), and Search box.
  - **Table Columns:** Response ID, Project Code, Respondent UID, Status badge, Verification Type, Client Billing Status (`BILLABLE`, `PENDING`, `REJECTED`), Vendor Acceptance Status (`ACCEPTED`, `PENDING`, `REJECTED`), LOI, Rejection Reason, and Recorded At.
  - **Slide-Over Detail Panel:** Clicking any row reveals deep session telemetry: raw user agent, IP hash, landing URL, referrer, full callback JSON, and review controls.
  - **Unverified Triage Action Buttons:** Inside the slide-over for unverified records:
    - `Mark Reviewed`: Acknowledges the security event.
    - `Whitelist IP`: Allows future traffic from this corporate or university network.
    - `Block IP`: Adds IP to the global blacklist.
  - **Export Button:** Streams filtered response dataset directly to CSV or Excel.
- **Related API Endpoints:** `GET /api/responses`, `POST /api/responses/:id/review`, `POST /api/unverified/:id/triage`.

### 3.7 Tracking Links Manager (`/dashboard/tracking-links`)
- **Route:** `src/app/dashboard/tracking-links/page.tsx`
- **Purpose:** Global index of all generated tracking entry points across all studies.
- **Controls:**
  - **Study Filter & Vendor Filter:** Narrows list to specific campaigns or partners.
  - **`+ Generate Link` Modal:** Quick link generator selecting Study, Vendor, Destination URL, and UID Mode (`AUTO`, `MANUAL`, `ANONYMOUS`).
  - **Link Table:** Link Code, Public Token, Target Study, Vendor Name, Click Count, Status (`ACTIVE`, `PAUSED`), and Created Date.
  - **Copy Link Action:** Copies the canonical format: `https://opi.opinioninsights.in/start/:link_code?uid={UID}`.
- **Related API Endpoints:** `GET /api/tracking-links`, `POST /api/tracking-links`.

### 3.8 Quota Management (`/dashboard/quotas`)
- **Route:** `src/app/dashboard/quotas/page.tsx`
- **Purpose:** Real-time monitoring and management of fieldwork demographic and volumetric quotas.
- **Controls:**
  - **Study Selector:** Switches active quota dashboard between studies.
  - **Quota Progress Cards:** Visual progress meters showing Target, Achieved Completes, Remaining Capacity, and Status (`OPEN`, `FULL`, `CLOSED`).
  - **`+ Create Quota` Modal:** Defines a new quota cell with Target Completes and demographic criteria JSON.
  - **Edit / Close Action:** Allows manually locking a quota bucket to immediately trigger `QUOTA_FULL` redirects for incoming respondents matching those criteria.
- **Related API Endpoints:** `GET /api/quotas`, `POST /api/quotas`, `PUT /api/quotas/:id`.

### 3.9 Vendors Admin Directory (`/dashboard/vendors`)
- **Route:** `src/app/dashboard/vendors/page.tsx`
- **Purpose:** Administrative CRM for managing sample suppliers and panel partners.
- **Controls:**
  - **`+ Add Vendor` Modal:** Name, Vendor Code (e.g. `VND-DYN`), Contact Person, Email, and Notes.
  - **Vendor Catalog Table:** Vendor Code, Name, Primary Contact, Active Studies Count, Status pill (`ACTIVE`, `INACTIVE`), and Created Date.
  - **Edit Vendor Modal:** Updates contact details or deactivates underperforming suppliers.
- **Related API Endpoints:** `GET /api/vendors`, `POST /api/vendors`, `PUT /api/vendors/:id`.

### 3.10 Vendor Self-Service Portal (`/dashboard/vendor`)
- **Route:** `src/app/dashboard/vendor/page.tsx`
- **Purpose:** Restricted, isolated dashboard seen by external sample partners logging in with the `VENDOR` role.
- **Tabs & Panels:**
  - **Overview Tab:** Vendor-specific KPI cards: Assigned Studies, Delivered Sessions, Accepted Completes, and Average Conversion Rate %.
  - **Assigned Studies Tab:** Clean catalog showing only the studies this vendor has been contracted to supply.
  - **Responses Tab:** Read-only log of responses generated exclusively by their panel members.
  - **Tracking Links Tab:** List of assigned link codes with copyable URLs and click counters.
- **Related API Endpoints:** `GET /api/vendor/studies`, `GET /api/vendor/responses`, `GET /api/vendor/tracking-links`, `GET /api/vendor/analytics/summary`.

### 3.11 User Management (`/dashboard/admin-users`)
- **Route:** `src/app/dashboard/admin-users/page.tsx`
- **Purpose:** Internal identity and access management for platform operators, analysts, and vendor accounts.
- **Controls:**
  - **`+ Create Account` Modal:** Full Name, Email, Temporary Password, Role dropdown (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `ANALYST`, `VENDOR`), and Associated Vendor dropdown (mandatory for `VENDOR` role).
  - **Users Table:** Name, Email, Role badge, Vendor Linkage, Status (`ACTIVE`, `INACTIVE`), Last Login timestamp, and Created Date.
  - **Password Reset Modal:** Generates a secure temporary password for locked-out staff.
  - **Deactivate User Button:** Immediately invalidates user sessions.
- **Related API Endpoints:** `GET /api/admin/users`, `POST /api/admin/users`, `PUT /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`.

### 3.12 Fieldwork Analytics (`/dashboard/analytics`)
- **Route:** `src/app/dashboard/analytics/page.tsx`
- **Purpose:** In-depth statistical evaluation of fieldwork efficiency, drop-offs, incidence rates, and vendor delivery velocity.
- **Sections & Visualizations:**
  - **Funnel Conversion Overview:** Overall drop-off metrics from initial link click to verified completion.
  - **Conversion by Study Table:** Study Code, Title, Sessions Started, Completes, and Incidence Rate (IR %).
  - **Vendor Delivery Performance Table:** Compares vendor delivery volume, complete acceptance rates, and effective Cost Per Interview (CPI).
  - **14-Day Unverified Hits Velocity Chart:** Daily trend bar graph highlighting bot spikes and link scraping activity.
  - **Top Offending Networks Table:** Identifies IP addresses generating repeated invalid or direct hits with total hit count and last seen timestamp.
- **Related API Endpoints:** `GET /api/analytics/funnel`, `GET /api/analytics/by-study`, `GET /api/analytics/by-vendor`, `GET /api/analytics/unverified-breakdown`.

### 3.13 Finance & Margins (`/dashboard/finance`)
- **Route:** `src/app/dashboard/finance/page.tsx`
- **Purpose:** Revenue, expense, and profitability tracking across studies and sample suppliers.
- **Controls & Metrics:**
  - **Finance Summary Ledger:** Study Title, Vendor Name, Total Completes, Gross Client Revenue, Net Vendor Cost, Margin ($), and Margin (%).
  - **`Download Financial CSV` Button:** Exports detailed billing spreadsheet for accounting reconciliation.
  - **Reconciliation Engine:** Integrates with backend invoice and vendor settlement tables.
- **Related API Endpoints:** `GET /api/exports/finance`.

### 3.14 Database & Storage Center (`/dashboard/database`)
- **Route:** `src/app/dashboard/database/page.tsx`
- **Purpose:** Cloud database health monitor, storage quota telemetry, master backup creator, and safety-gated data reset controller.
- **Panels & Controls:**
  - **Storage Quota Dial:** Visual percentage meter tracking consumption against the 500 MB Supabase free-tier threshold.
  - **Live Table Size Breakdown:** Lists every PostgreSQL table, raw byte count, and human-readable size (`pg_size_pretty`).
  - **Entity Counters Grid:** Total Projects, Total Survey Sessions, Terminal Responses, Verified Completes, Fake Clicks, and Audit Logs.
  - **`Export Master Excel Backup` Button:** Generates a comprehensive, 5-sheet styled `.xlsx` workbook containing complete database records.
  - **`Reset Database` Button:** Opens the 2-step safety modal.
  - **Database Reset Modal:**
    - Mode selector: `FIELDWORK_ONLY` (wipes sessions, responses, logs, keeps projects and users) vs `FULL_RESET` (wipes all projects, links, and fieldwork; preserves admin accounts).
    - Confirmation Input: User must type exactly `RESET-CONFIRM`.
- **Related API Endpoints:** `GET /api/database/stats`, `GET /api/database/export`, `POST /api/database/reset`.

### 3.15 Audit Trail (`/dashboard/audit`)
- **Route:** `src/app/dashboard/audit/page.tsx`
- **Purpose:** Immutable compliance log recording all administrative modifications, authentication attempts, rate changes, and security events.
- **Controls:**
  - **Search & Entity Filter:** Filters by entity (`PROJECT`, `USER`, `VENDOR`, `DATABASE`, `VAULT`) and action keyword.
  - **Log Table:** Timestamp, User Email, Action taken, Entity Name, Entity ID, IP Address, and JSON diff preview button.
- **Related API Endpoints:** `GET /api/audit-logs`.

### 3.16 Credential Vault (`/dashboard/credentials`)
- **Route:** `src/app/dashboard/credentials/page.tsx`
- **Purpose:** High-security encrypted vault storing client survey logins, API tokens, and provider credentials.
- **Controls:**
  - **Vault Index:** Lists stored credentials with label, type (`EXTERNAL_PROVIDER`, `SURVEY_LOGIN`), username, and last accessed date.
  - **`+ Store Credential` Modal:** Label, Username, Secret Password, and Notes. Encrypted via AES-256-GCM before database write.
  - **`Reveal Password` Action:** Requires `SUPER_ADMIN` authorization; records an entry in `credential_vault_audit` before returning decrypted plaintext.
- **Related API Endpoints:** `GET /api/vault`, `POST /api/vault`, `POST /api/vault/:id/reveal`, `DELETE /api/vault/:id`.

### 3.17 Settings (`/dashboard/settings`)
- **Route:** `src/app/dashboard/settings/page.tsx`
- **Purpose:** User profile configuration, self-service password update, and session termination.
- **Controls:**
  - **Change Password Card:** Current Password, New Password, Confirm Password with client-side validation.
  - **Security Telemetry:** Displays current user role, active session expiry, and registered email address.
- **Related API Endpoints:** `POST /api/auth/change-password`.

### 3.18 Survey Builder (`/dashboard/surveys` & `/dashboard/surveys/builder`)
- **Route:** `src/app/dashboard/surveys/builder/page.tsx`
- **Purpose:** Visual survey questionnaire designer integrated with LimeSurvey RemoteControl 2 JSON-RPC.
- **Controls:**
  - **Question Groups Manager:** Add, rename, reorder question groups.
  - **Question Canvas:** Add Single Choice (`L`), Multiple Choice (`M`), Short Text (`E`), Long Text (`U`), and Numeric (`N`) questions.
  - **Question Properties Editor:** Question code, mandatory toggle, question text, and answer option lines.
  - **`Publish to LimeSurvey` Button:** Synchronizes groups and questions to the external LimeSurvey engine, activates the survey, and updates the study URL.
  - **`Preview Survey` Button:** Opens live iframe preview of the survey runtime.
- **Related API Endpoints:** `GET /api/surveys/:id/builder`, `POST /api/surveys/:id/publish`, `POST /api/surveys/:id/unpublish`.

---

## 4. Project Lifecycle — End to End

```
  [1. DRAFT] ─── (Operator creates project, basic info & description)
      │
      ▼
  [2. CONFIGURING] ─── (Selects countries, sets quotas & client/vendor CPIs)
      │
      ▼
  [3. VALIDATING] ─── (Assigns vendors, generates links, tests redirect URLs)
      │
      ▼
  [4. ACTIVE / LIVE] ─── (Traffic flows, quota monitored, duplicate blocker active)
      │          ▲
      │ (Pause)  │ (Resume)
      ▼          │
  [5. PAUSED] ───┘ ─── (Incoming traffic routed to /survey/status?outcome=PAUSED)
      │
      ▼
  [6. ARCHIVED / CLOSED] ─── (Fieldwork ended, links disabled, records locked for finance)
```

### 4.1 Creation Wizard Flow
The multi-country wizard in `src/app/dashboard/projects/new/page.tsx` guides the user through 5 validated steps:
1. **Basic Info:** Requires unique project code and valid client selection.
2. **Country Selection:** At least one country must be selected from the master database of 26 territories.
3. **Rates & Quotas:** Enforces positive integer quotas, client rates, and estimated LOIs.
4. **Vendors & Allocation:** Allocates target quotas across sample vendors. Total vendor quota is validated against the country target.
5. **Review & Confirm:** Submits the atomic payload to `POST /api/projects`.

### 4.2 Lifecycle State Transitions
Projects move through strictly validated states:
- `DRAFT`: Newly initialized project record.
- `CONFIGURING`: Geographic and financial parameters are being established.
- `VALIDATING`: Tracking links generated; pre-testing survey routing.
- `ACTIVE` / `LIVE`: Open for live traffic. Links accept respondents and create sessions.
- `PAUSED`: Temporarily halted. Clicks are intercepted and redirected to `/survey/status?outcome=PAUSED`. No quota increments occur.
- `ARCHIVED`: Concluded project. Read-only for reporting and financial audit.

### 4.3 Multi-Country Quota & Pricing Configuration
Every project can span multiple independent country cells represented in `project_countries`. Each country maintains:
- Dedicated destination survey URL (allowing localized questionnaire links).
- Local currency code (USD, EUR, GBP, INR, etc.).
- Independent Client CPI and Baseline Vendor CPI.
- Target completes quota and estimated LOI.

### 4.4 Vendor Link Allocation
Inside each country, one or more vendor links (`project_links`) are established. When a vendor link is provisioned:
- A unique `link_code` is generated (`lnk_...`).
- A vendor-specific quota and payout CPI are saved in `link_vendor_assignments`.
- The vendor receives a parameterized link containing `{UID}` or custom macro tags.

### 4.5 Pausing, Resuming, and Live Project Modifications
- **Pausing a Project:** `POST /api/projects/:id/pause` sets project status to `PAUSED`. The `/track` gateway instantly redirects any subsequent click to `/survey/status?outcome=PAUSED&reason=PROJECT_PAUSED`.
- **Live Fieldwork Edits:**
  - Target completes, client rates, and vendor rates can be adjusted live. Rate edits automatically log a change record into `rate_audit`.
  - Survey URLs can be updated without re-generating vendor tracking links.
  - Specific compromised vendor links can be paused or regenerated without impacting other vendors.

---

## 5. Tracking Link System

### 5.1 URL Structure & Macro Interpolation
Tracking links issued to vendors follow a standard parameterized structure:
```
https://opi.opinioninsights.in/track?pid=OPI-8801&country=US&uid={UID}&vendor=VND-01
```
Or via the legacy short-link endpoint:
```
https://opi.opinioninsights.in/start/lnk_abc123xyz?uid={UID}
```

When the vendor sends a panelist, their automated system substitutes `{UID}` with the panelist's unique account ID:
```
https://opi.opinioninsights.in/track?pid=OPI-8801&country=US&uid=PANELIST_49204&vendor=VND-01
```

### 5.2 Ingestion & Session Creation Flow
When a respondent's browser requests `/track`:
1. **Parameter Resolution:** Resolves project code, country code, vendor code, and raw UID.
2. **Project & Country Validation:** Verifies project is `LIVE` and country is active. If paused, immediately redirects to `/survey/status?outcome=PAUSED`.
3. **UID Sanitization:** Runs `normalizeUid(rawUid)`. Trims whitespace, strips control characters, ensures length <= 255, and converts to uppercase.
4. **Duplicate Prevention Check:** Evaluates Rule A (IP) and Rule B (UID) via `fraudService.ts`. If blocked, redirects to `/blocked`.
5. **Session Creation:** Creates a unique `session_token` (`trk_...`) with a 48-hour expiration.
6. **LANDING Event Logging:** Inserts a `LANDING` event into `response_events`.
7. **Initial Response Initialization:** Creates a response record in `responses` with `final_status = 'IN_PROGRESS'`.
8. **Destination URL Construction:** Replaces `[identifier]`, `{identifier}`, `[UID]`, or `{UID}` in the client survey URL with the encoded UID.
9. **Tracking Cookie Issuance:** Sets HttpOnly cookies (`opi_session_token`, `opi_project_code`, `opi_uid`).
10. **Browser Redirection:** Issues HTTP 302 redirect sending respondent to the client survey.

### 5.3 Identity Sanitization & IP Hashing
To comply with ISO 20252 and global privacy regulations (GDPR, CCPA), raw respondent IP addresses are never exposed in public responses:
- The raw IP is extracted from the first element of `X-Forwarded-For` or the socket.
- A cryptographic salted hash is generated:
  ```typescript
  saltedHash = crypto.createHash('sha256').update(rawIp + config.authSecret).digest('hex');
  ```
- All internal duplication checks and database indexing operate on `ip_hash`.

### 5.4 Cryptographic Signatures & Nonce Replay Guards
When the platform routes respondents back to vendors or external systems upon completion, it supports signed redirect tokens to prevent tampering:
- Payload: `{ pid, uid, ts: Math.floor(Date.now() / 1000), nonce: randomBytes(8), outcome }`.
- Signature: Generated via HMAC-SHA256 with `config.redirectHmacSecret`.
- Nonce Cache: Memory store `USED_NONCES` prevents replay attacks; tokens older than `redirectSignatureTtlSeconds` (300s) are rejected.

---

## 6. Fraud Prevention & Duplicate Blocker

```
              Respondent clicks Tracking Link
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │        Duplicate Check Engine         │
        └───────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
   [Rule B: Check UID]             [Rule A: Check IP]
  Same UID used in project?       Same IP completed project?
            │                               │
       YES  │                          YES  │
            ▼                               ▼
   ┌─────────────────┐             ┌─────────────────┐
   │ Blocked: Type UID│            │ Blocked: Type IP │
   │ Ref: BLK-UID-xxx│             │ Ref: BLK-IP-xxx │
   └─────────────────┘             └─────────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
               Logged in blocked_entry_attempts
                            │
                            ▼
             HTTP 302 Redirect to /blocked
    (Displays Rude / Polite / Neutral / Custom Screen)
```

### 6.1 Rule A: Completed IP Restriction
- **Trigger:** An incoming respondent arrives with an IP address that has already submitted a verified `COMPLETE` on the **same project**.
- **Scope:** Evaluated per project. The same IP is free to participate in different, unrelated projects.
- **Rationale:** Prevents a single household or bot operator from submitting multiple completed responses to the same study.
- **Exemptions:** Disabled if `allow_nat_ip` is toggled on, or if the IP address is listed in `ip_access_rules` as `WHITELIST`.

### 6.2 Rule B: Repeated UID Restriction
- **Trigger:** An incoming respondent arrives with a UID that has already entered the **same project** in **any status** (`STARTED`, `TERMINATE`, `QUOTA_FULL`, or `COMPLETE`).
- **Scope:** Evaluated per project.
- **Rationale:** Prevents respondents who screened out or completed from clicking links again to attempt different qualification answers.

### 6.3 Respondent Block Gateway (`/blocked`)
- **Route:** `src/app/blocked/page.tsx`
- **Design:** Distinctive dark cybersecurity UI (`#090d16`) featuring pulsing warning shields, red ambient glow, animated caution icon, violation badge, project name, timestamp, and support reference ID.
- **Support Action:** Includes a 1-click `Copy Reference ID` button and a direct `mailto:` link pre-populated with the reference code for platform support triage.

### 6.4 Block Tone Copy Library (Rude, Polite, Neutral, Custom)
Configurable per project in `projects.block_tone`:

| Tone | IP Violation Headline & Copy | UID Violation Headline & Copy |
| :--- | :--- | :--- |
| **`RUDE`** (Default) | **Headline:** "Pehle Hi Complete Hai!"<br>**Copy:** "Bhai, tumne is survey ko pehle hi complete kar liya hai. Fir kyu aa rahe ho?" | **Headline:** "UID Pehle Se Used Hai!"<br>**Copy:** "Ye UID is project me pehle use ho chuka hai. Naya UID lekar aao, ya vendor se naya le lo." |
| **`POLITE`** | **Headline:** "Survey Already Completed"<br>**Copy:** "Aapne yeh survey pehle hi safaltapoorvak poora kar liya hai. Ek respondent sirf ek baar survey de sakta hai. Sahyog ke liye dhanyawaad!" | **Headline:** "Identifier In Use"<br>**Copy:** "Yeh respondent ID is survey me pehle darj ho chuki hai. Kripya naye link ya ID ke sath prayaas karein." |
| **`NEUTRAL`** | **Headline:** "Submission Restricted"<br>**Copy:** "Our records show a verified complete from this network for this study." | **Headline:** "Identifier Already Registered"<br>**Copy:** "This participant UID has an existing record on this project." |
| **`CUSTOM`** | Displays administrator's `custom_ip_message` text. | Displays administrator's `custom_uid_message` text. |

### 6.5 Soft Mode vs Hard Enforcement
- **Hard Enforcement (`soft_duplicate_mode = FALSE`):** Respondent is blocked immediately. No survey session is created; browser is redirected to `/blocked`.
- **Soft Mode (`soft_duplicate_mode = TRUE`):** System logs the duplicate attempt into `blocked_entry_attempts` with a soft warning flag, but permits the respondent to continue into the survey. Used during testing or when panel quality is unknown.

### 6.6 NAT Exceptions & Whitelist/Blacklist Engine
- **NAT / Shared IP Mode (`allow_nat_ip = TRUE`):** Disables Rule A for corporate networks, universities, or mobile proxy gateways where hundreds of panelists share a single gateway IP.
- **IP Access Rules Table (`ip_access_rules`):**
  - `WHITELIST`: Always bypasses IP duplication blocks for specified project or globally.
  - `BLACKLIST`: Immediately terminates traffic originating from known proxy networks or fraudulent data centers.

---

## 7. Unverified Hits System

### 7.1 What is an Unverified Hit?
An **Unverified Hit** (Direct / Fake Click) is any callback or completion ping that arrives at `/redirect/:status` or `/api/callback` **without a valid, active tracking session**. 

These occur when:
1. A respondent bypasses the vendor link and bookmarks or manually enters the end link.
2. A malicious supplier or rogue panelist extracts the redirect URL and fires automated scripts to simulate completes.
3. A tracking token has expired (> 48 hours).

### 7.2 Interception Vectors & `fake_click_events`
When an incoming callback fails session validation:
- The request is immediately rejected from the legitimate fieldwork ledger.
- A permanent forensic record is written to `fake_click_events`:
  - `rejection_reason`: `DIRECT_CLIENT_LINK`, `NO_SESSION`, `EXPIRED_SESSION`, `NO_LANDING_EVENT`, or `INVALID_UID`.
  - `raw_payload`: Complete JSON dump of query parameters, headers, and cookies.
  - `ip_address`, `ip_hash`, and `user_agent`.
  - `is_reviewed = FALSE`.
- An uncounted response record is created with `final_status = 'UNVERIFIED'`, `is_counted = FALSE`, and `callback_source = 'DIRECT_UNVERIFIED'`.

### 7.3 Live Feed, Spike Banner, and Response Segregation
- **Dashboard Metric & Spike Banner:** The main dashboard displays an `Unverified Today` KPI card. If the unverified hit rate exceeds 15% of daily volume, a glowing red alert banner warns operators of an active fraud spike.
- **Live Feed (10s Polling):** Main dashboard features an auto-updating stream displaying intercepted hits in real time.
- **Segregated Responses Table:** Inside `/dashboard/responses`, clicking the `Unverified` tab isolates all direct hits. They never mix with verified client deliverables.

### 7.4 Operator Triage Actions (Review, Whitelist, Blacklist)
Opening the slide-over review panel for an unverified hit exposes three operational actions:
1. **`Mark Reviewed`:** Sets `is_reviewed = TRUE` with operator name and audit timestamp.
2. **`Whitelist IP`:** Inserts an entry into `ip_access_rules` allowing this IP to pass through in future sessions.
3. **`Block IP`:** Immediately adds the offending IP to `ip_access_rules` under `BLACKLIST`, shielding all platform projects.

### 7.5 Financial & Quota Firewall Invariants
The platform strictly enforces three zero-trust database invariants:
> **INVARIANT 1:** An unverified hit can NEVER increment `achieved` in `quotas` or `project_quotas`.
> **INVARIANT 2:** An unverified hit can NEVER be marked `client_billing_status = 'BILLABLE'`.
> **INVARIANT 3:** An unverified hit can NEVER generate vendor payable credit in `vendor_settlements`.

---

## 8. Response Management

### 8.1 Outcome Classification Lifecycle
Every participant interaction resolves to one of six normalized terminal outcomes:
1. **`COMPLETE`**: Participant answered all questions, satisfied screening criteria, and passed quality validation. Counts toward project quota.
2. **`TERMINATE`**: Participant was screened out due to demographics or qualifying criteria.
3. **`QUOTA_FULL`**: Participant qualified, but their specific demographic bucket was already filled.
4. **`QUALITY_FAIL`**: Terminated due to speeder bot detection (< 15s LOI) or automated trap failures.
5. **`CLOSED`**: Arrived after fieldwork was officially closed.
6. **`PAUSED`**: Arrived while the project or country cell was temporarily paused.

### 8.2 Anti-Fraud Terminate-to-Complete Guard
A common attack vector involves respondents who were screened out altering browser history or invoking client callbacks to re-submit as a `COMPLETE`. 
In `src/routes/index.ts` lines 743-777:
```typescript
if (isAlreadyTerminated && status === 'COMPLETE') {
  // BLOCKED: Terminated session attempting to flip to COMPLETE
  recordFakeClick({ rejection_reason: 'TERMINATE_TO_COMPLETE_FRAUD_ATTEMPT' });
  return res.redirect('/survey/status?outcome=TERMINATE&fraud=blocked');
}
```
The status flip is rejected, logged as fraud, and the respondent remains terminated.

### 8.3 Speeder Detection (< 15s LOI)
In `src/routes/index.ts` lines 801-807:
- When a `COMPLETE` callback arrives, the platform calculates:
  `loiSeconds = (Date.now() - session.created_at) / 1000`.
- If `loiSeconds < 15` and no QA test bypass flag (`qa_bypass=1`) is provided, the status is automatically downgraded from `COMPLETE` to `QUALITY_FAIL`.
- It is uncounted (`is_counted = FALSE`) and rejected from client billing.

### 8.4 Reconciliation Fields: Billing & Payout Statuses
Every response record maintains two distinct financial review fields:
- `client_billing_status`: `PENDING` | `BILLABLE` | `REJECTED`. Controls whether the complete appears on client invoices.
- `vendor_acceptance_status`: `PENDING` | `ACCEPTED` | `REJECTED`. Controls whether the complete is credited to the vendor settlement batch.
- When marked `REJECTED`, operators select from standardized codes: `DUPLICATE`, `INVALID_RESPONDENT`, `QUALITY_ISSUE`, `FRAUD`, `SPEEDER`, `INCOMPLETE`, or `CLIENT_REJECTION`.

---

## 9. Finance & Settlement

### 9.1 Pricing Architecture (Client CPI vs Vendor CPI)
Pricing is configured on a granular per-country, per-vendor basis:
- **Client CPI (Cost Per Interview):** Rate charged to the client per approved complete in that country (e.g., $5.00 USD).
- **Vendor CPI:** Rate paid to the sample supplier per accepted complete (e.g., $2.50 USD).
- **Gross Profit per Complete:** `Client CPI - Vendor CPI` ($2.50).
- **Gross Margin Percentage:** `((Client CPI - Vendor CPI) / Client CPI) * 100` (50.0%).

### 9.2 Margin Calculations & Multi-Currency Rules
- Projects support ISO 4217 currencies (USD, INR, EUR, GBP, AUD, CAD, SGD, AED, JPY).
- Per-country rates are stored in `project_countries.currency`, `client_rate`, and `vendor_rate`.
- The financial export calculates realized margin based only on responses where `client_billing_status = 'BILLABLE'` and `vendor_acceptance_status = 'ACCEPTED'`.

### 9.3 Client Invoicing & Vendor Settlement Batches
- **Client Invoices (`invoices` & `invoice_line_items`):** Aggregates approved completes for a billing period into an official invoice with unique invoice number (`INV-2026-XXXX`).
- **Vendor Settlements (`vendor_settlements`):** Summarizes total submitted, total accepted, and total rejected completes per vendor, computing net `payable_amount`.

---

## 10. Database Center

### 10.1 Free Tier 500 MB Storage Telemetry
Hosted on Supabase PostgreSQL free tier, the database operates under a strict 500 MB disk limit.
- `GET /api/database/stats` polls `pg_database_size(current_database())` and `pg_total_relation_size()` for all public tables.
- The UI renders an active circular gauge displaying real-time MB usage and percentage consumed.

### 10.2 5-Sheet Master Excel Export
Administrators can trigger a single-click backup export (`GET /api/database/export`) that streams a formatted, formula-ready `.xlsx` workbook using ExcelJS:
- **Sheet 1: `System Overview`:** Database size, quota health, total project counts, complete counts, and fraud intercept totals.
- **Sheet 2: `Projects`:** Complete project catalog with client names, rates, currencies, and timestamps.
- **Sheet 3: `Responses`:** Comprehensive response ledger with LOI, billing statuses, and rejection reasons.
- **Sheet 4: `Sessions`:** Unique respondent session attempts with detected country, IP, and duration.
- **Sheet 5: `Security & Intercepts`:** Complete audit trail of fake clicks, direct entries, and blocked attempts.

### 10.3 Two-Step Database Reset (`RESET-CONFIRM`)
To clear testing data before going into production:
1. Administrator navigates to `/dashboard/database` and clicks `Reset Database`.
2. Selects Reset Scope:
   - `FIELDWORK_ONLY`: Clears responses, sessions, fake clicks, and logs. Preserves all projects, links, users, clients, and vendors.
   - `FULL_RESET`: Clears all projects, quotas, links, and fieldwork data. Preserves admin user accounts, clients, and credentials.
3. Must explicitly type `RESET-CONFIRM` into the verification prompt.
4. Client sends `POST /api/database/reset` with `{ confirmation: 'RESET-CONFIRM', mode: '...' }`.

### 10.4 Reset Safety Matrix (What Gets Wiped vs Kept)

| Table | `FIELDWORK_ONLY` | `FULL_RESET` | Reason Preserved / Wiped |
| :--- | :---: | :---: | :--- |
| `users` | 🛡️ **PRESERVED** | 🛡️ **PRESERVED** | Administrative logins and operator access must never be lost. |
| `vendors` | 🛡️ **PRESERVED** | 🛡️ **PRESERVED** | Vendor directory and partner records preserved. |
| `clients` | 🛡️ **PRESERVED** | 🛡️ **PRESERVED** | Client contact directory preserved. |
| `credential_vault` | 🛡️ **PRESERVED** | 🛡️ **PRESERVED** | Encrypted client logins must not be destroyed. |
| `projects` | 🛡️ **PRESERVED** | ❌ **WIPED** | Cleared only in full project wipe. |
| `project_countries` | 🛡️ **PRESERVED** | ❌ **WIPED** | Cleared only in full project wipe. |
| `project_links` | 🛡️ **PRESERVED** | ❌ **WIPED** | Cleared only in full project wipe. |
| `sessions` | ❌ **WIPED** | ❌ **WIPED** | Test respondent sessions purged to reclaim space. |
| `responses` | ❌ **WIPED** | ❌ **WIPED** | Test responses purged to reclaim space. |
| `fake_click_events` | ❌ **WIPED** | ❌ **WIPED** | Test security intercepts purged to reclaim space. |
| `blocked_entry_attempts`| ❌ **WIPED** | ❌ **WIPED** | Test block logs purged. |
| `audit_logs` | ❌ **WIPED** | ❌ **WIPED** | Log reset, immediately followed by fresh `DATABASE_RESET` log entry. |

---

## 11. Survey Builder (LimeSurvey RemoteControl 2)

### 11.1 Architecture & JSON-RPC Integration
The platform includes an internal visual questionnaire builder backed by an integration with LimeSurvey:
- Communication occurs via LimeSurvey RemoteControl 2 JSON-RPC API (`src/services/limeSurvey/limeSurveyProxy.ts`).
- Manages user sessions via `get_session_key` and dispatches authenticated RPC calls to create surveys, groups, and questions.

### 11.2 Question Group & Question Mapping
- **`survey_groups`:** Represents logical pages/sections in a survey. Maps directly to `ls_group_id`.
- **`survey_questions`:** Represents individual questionnaire items.
- Supported Question Types:
  - `single_choice` (`L` in LimeSurvey): Radio buttons with answer options.
  - `multiple_choice` (`M` in LimeSurvey): Checkbox matrix.
  - `short_text` (`E` in LimeSurvey): Single-line input.
  - `long_text` (`U` in LimeSurvey): Multi-line textarea.
  - `numeric` (`N` in LimeSurvey): Number input with range constraints.

### 11.3 Publication, Preview & Local Fallback Mock
- **Publish Workflow:** When an operator clicks `Publish to LimeSurvey`:
  1. Creates or verifies remote survey container via `createSurvey`.
  2. Iterates through local question groups and creates remote groups via `addGroup`.
  3. Iterates through local questions and pushes types/options via `addQuestion`.
  4. Activates survey via `activateSurvey`.
  5. Stores generated URL in `studies.survey_url` and marks status as `LIVE`.
- **Local Fallback Mode:** If LimeSurvey is not running locally during development, `surveyBuilder.ts` automatically switches to `CREATED_LOCAL` mock mode, generating synthetic question IDs so UI testing proceeds unimpeded.

---

## 12. Analytics

### 12.1 Key Fieldwork Metrics (IR, LOI, Conversion)
- **Incidence Rate (IR %):** The percentage of screened respondents who qualify for the study:
  `IR = (Completes / (Completes + Terminates)) * 100`.
- **Length of Interview (LOI):** Calculated from respondent timestamps:
  `LOI (minutes) = Math.round((terminal_at - started_at) / 60000)`.
- **Conversion Rate (%):** Overall efficiency from link entry to completion:
  `Conversion = (Completes / Total Clicks) * 100`.

### 12.2 Study Performance & Vendor Delivery
The Analytics tab aggregates performance cross-tabulations:
- Compares vendor delivery quotas against actual completes delivered.
- Identifies sample suppliers with abnormally high screenout (terminate) rates or quality failures.

### 12.3 14-Day Velocity & Top Offending Networks
- **Fraud Velocity Bar Chart:** Displays daily unverified callback volume over the trailing 14-day window.
- **Top Offending Networks:** Groups fake clicks by raw IP address, listing hit counts, target projects attacked, and last seen timestamps to inform blacklisting decisions.

---

## 13. Settings & Administration

### 13.1 User Provisioning & Password Resets
- Managed under `/dashboard/admin-users`.
- Role assignment enforces least-privilege principles.
- Password updates employ bcrypt hashing (salt rounds: 10).
- Failed login tracker automatically locks accounts after 5 consecutive incorrect attempts for 15 minutes (`users.locked_until`).

### 13.2 System Preferences & Security Settings
- JWT secret configuration (`config.authSecret`).
- Rate limiting thresholds (Starts: 120/min; Callbacks: 60/min; Logins: 20/min).
- Global redirect signature TTL settings.

---

## 14. Status Pages (Respondent Side)

### 14.1 Status Gateway (`/redirect/:status`)
The canonical endpoints configured in client survey platforms as end-redirect links:
- `/redirect/complete` ──► Qualified completion.
- `/redirect/terminate` ──► Screenout / criteria mismatch.
- `/redirect/quotafull` (or `/redirect/quota`) ──► Demographic quota reached.
- `/redirect/quality_term` ──► Failed attention checks or speeder trap.
- `/redirect/closed` ──► Survey deactivated.

Each gateway accepts query parameters `pid` (project code) and `uid` (respondent identifier). It performs session resolution, enforces speeder rules, verifies termination invariants, and redirects to the responsive UI view `/survey/status`.

### 14.2 The 6 Respondent Landing Views (`/survey/status`)
Built as a responsive, glassmorphic layout in `src/app/survey/status/page.tsx`:
1. **Complete:** Emerald green theme, confetti explosion, checkmark badge, completion copy, and audio chime.
2. **Quota Full:** Sky blue theme, quota reached badge, respectful explanation, and option to browse alternative opportunities.
3. **Terminate:** Crimson red theme, clear screenout notice, and back to hub button.
4. **Quality Term:** Amber orange theme, automated quality failure notice advising respondent of integrity requirements.
5. **Closed:** Slate gray theme, survey concluded badge.
6. **Paused:** Warm yellow theme, study temporarily on hold notice.

### 14.3 Sound FX, Memes, and Dynamic Verification Badges
- **Audio FX System (`src/lib/survey/sound-fx.ts`):** Plays contextual audio chimes on status resolution.
- **Meme Mode:** In development and humor modes, status pages support humorous Hindi meme audio templates (e.g. Hindustani Bhau, CID ACP Gaali, Arey Maa Chudi Padi Hai).
- **Verification Pills:**
  - `✓ Verified`: Indicates legitimate survey entry with active cryptographic session token.
  - `⚠ Unverified Hit`: Warns user that direct entry was intercepted without tracking context.

### 14.4 Mock Survey Simulator (`/mock-survey`)
- **Route:** `src/app/mock-survey/page.tsx`
- **Purpose:** Built-in QA testing simulator enabling developers and QA engineers to trigger live survey outcomes directly from the browser.
- **Features:** Displays active session token, project code, and respondent UID. Provides 3 prominent action buttons:
  - `Complete Survey`: Triggers `/redirect/complete` with `qa_bypass=1`.
  - `Terminate Survey`: Triggers `/redirect/terminate`.
  - `Quota Full`: Triggers `/redirect/quotafull`.

---

## 15. Public & Private API Endpoints

### Authentication
#### `POST /api/auth/login`
- **Purpose:** Authenticate user and issue JWT token.
- **Auth Required:** No. Rate limited to 20 req/min.
- **Body:** `{ "email": "admin@opinioninsights.in", "password": "password123" }`
- **Response:**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "uuid", "email": "admin@opinioninsights.in", "role": "ADMIN", "name": "Admin" }
  }
  ```

#### `GET /api/auth/me`
- **Purpose:** Retrieve authenticated user profile from Bearer token.
- **Auth Required:** Yes (`Bearer <token>`).

### Tracking & Ingestion
#### `GET /track`
- **Purpose:** Main multi-country respondent tracking and redirect gateway.
- **Auth Required:** No.
- **Query Params:** `pid` (project code), `country` (ISO code), `uid` (respondent identifier), `vendor` (optional vendor code).
- **Response:** HTTP 302 Redirect to Client Survey URL (or `/blocked` if duplicate detected).

#### `GET /api/start/:linkCode`
- **Purpose:** Legacy short-code tracking entry point.
- **Auth Required:** No. Rate limited (120 req/min).
- **Query Params:** `uid` (respondent identifier).
- **Response:** HTTP 302 Redirect to survey destination.

### Redirects & Callbacks
#### `GET /redirect/:status` (`complete`, `terminate`, `quotafull`, `quality_term`, `closed`)
- **Purpose:** Handles end-of-survey respondent redirects from client surveys.
- **Auth Required:** No. Rate limited (60 req/min).
- **Query Params:** `pid` (project code), `uid` (respondent identifier), `session_token` (optional).
- **Response:** HTTP 302 Redirect to `/survey/status`.

#### `POST /api/callback` / `POST /api/callback/:provider`
- **Purpose:** Server-to-server postback ingestion for external survey engines.
- **Auth Required:** Optional HMAC signature verification via header `x-signature` or `x-hmac-sha256`.
- **Body:** `{ "offerId": "PROJECT_CODE", "uid": "RESPONDENT_UID", "status": "complete" }`

### Projects & Operations
#### `GET /api/projects`
- **Purpose:** List projects with optional status filtering.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `ANALYST`).

#### `POST /api/projects`
- **Purpose:** Create multi-country project via wizard payload.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`).
- **Body:**
  ```json
  {
    "name": "Global Tech Consumer Study",
    "project_code": "OPI-9901",
    "client_id": "uuid-client",
    "base_survey_url": "https://survey.com",
    "countries": [
      {
        "country_code": "US",
        "country_name": "United States",
        "currency": "USD",
        "client_rate": 4.50,
        "vendor_rate": 2.00,
        "target_completes": 500,
        "vendors": [{ "vendor_id": "uuid-vendor", "quota": 500, "vendor_cpi": 2.00 }]
      }
    ]
  }
  ```

#### `POST /api/projects/:id/pause` & `POST /api/projects/:id/resume`
- **Purpose:** Toggle project operational state.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`).

#### `GET /api/projects/:id/fraud-config` & `PUT /api/projects/:id/fraud-config`
- **Purpose:** Read and update project-specific duplicate blocking rules.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`).

#### `GET /api/projects/:id/blocked`
- **Purpose:** Retrieve paginated log of blocked respondent attempts for this project.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`).

### Responses & Security Triage
#### `GET /api/responses`
- **Purpose:** Paginated response ledger.
- **Auth Required:** Yes (`ALL_ROLES`).
- **Query Params:** `page`, `limit`, `type` (`all` | `verified` | `unverified`), `status`, `project_id`.

#### `POST /api/unverified/:id/triage`
- **Purpose:** Take administrative action on an unverified hit.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`).
- **Body:** `{ "action": "REVIEW" | "WHITELIST_IP" | "BLOCK_IP", "notes": "Corporate test IP" }`

### Database Center
#### `GET /api/database/stats`
- **Purpose:** Retrieve 500 MB quota storage telemetry and table sizes.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`).

#### `GET /api/database/export`
- **Purpose:** Stream 5-sheet styled master Excel database backup.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`). Accepts query token `?token=...` for browser downloads.

#### `POST /api/database/reset`
- **Purpose:** Execute 2-step database wipe.
- **Auth Required:** Yes (`SUPER_ADMIN`, `ADMIN`).
- **Body:** `{ "confirmation": "RESET-CONFIRM", "mode": "FIELDWORK_ONLY" | "FULL_RESET" }`

---

## 16. Authentication & Security Architecture

### 16.1 JWT Token Architecture
- **Algorithm:** HS256 (HMAC-SHA256).
- **Signing Secret:** Configured via `config.authSecret`.
- **Payload Structure:**
  ```json
  {
    "sub": "user_uuid",
    "role": "OPERATOR",
    "email": "user@opinioninsights.in",
    "vendor_id": null,
    "iat": 1789600000,
    "exp": 1789628800
  }
  ```
- **Session Duration:** 8 hours (28,800 seconds).

### 16.2 Password Security & Lockout
- Hashed using bcrypt with 10 salt rounds.
- Brute-force protection: Tracks consecutive failed attempts in `users.failed_login_attempts`. Upon 5 failed attempts, sets `users.locked_until = NOW() + INTERVAL '15 minutes'`.
- All authentication events logged to `login_audit` with IP and user agent.

### 16.3 AES-256-GCM Credential Vault
- Located in `src/services/vaultService.ts`.
- Sensitive passwords encrypted with AES-256-GCM with unique 16-byte initialization vector (IV) and 16-byte authentication tag per record.
- Every decryption event logged to `credential_vault_audit`.

### 16.4 Security Headers & CORS
Enforced across all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (Except for `/survey/status` embedding)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Rate limiters implemented via sliding-window in-memory bucket stores.

---

## 17. Data Model — Complete Database Schema

```
                     ┌───────────────────┐
                     │      clients      │
                     └─────────┬─────────┘
                               │ 1:N
                               ▼
 ┌───────────────┐     ┌───────────────────┐
 │     users     │     │     projects      │◄────────┐
 └───────┬───────┘     └─────────┬─────────┘         │
         │ 1:N                   │ 1:N               │
         ▼                       ▼                   │
 ┌───────────────┐     ┌───────────────────┐         │
 │    vendors    │     │ project_countries │         │
 └───────┬───────┘     └─────────┬─────────┘         │
         │                       │ 1:N               │
         │                       ▼                   │
         │ 1:N         ┌───────────────────┐         │
         └────────────►│   project_links   │         │
                       └─────────┬─────────┘         │
                                 │                   │
                                 ▼                   │
                       ┌───────────────────┐         │
                       │     sessions      │         │
                       └─────────┬─────────┘         │
                                 │ 1:1               │
                                 ▼                   │
                       ┌───────────────────┐         │
                       │     responses     │─────────┘
                       └───────────────────┘
```

### Table 1: `users`
- **Purpose:** System accounts for administrators, operators, analysts, and vendors.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `auth_user_id` (UUID, Unique, external auth mapping)
  - `full_name` (VARCHAR(255))
  - `email` (VARCHAR(255), Unique)
  - `password_hash` (VARCHAR(255))
  - `role` (VARCHAR(50), `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `ANALYST`, `VENDOR`)
  - `vendor_id` (UUID, FK -> `vendors.id`, NULL for internal staff)
  - `status` (VARCHAR(50), `ACTIVE`, `INACTIVE`)
  - `failed_login_attempts` (INTEGER, Default: 0)
  - `locked_until` (TIMESTAMPTZ)
  - `created_at`, `updated_at`, `last_login_at` (TIMESTAMPTZ)

### Table 2: `clients`
- **Purpose:** End-clients ordering research projects.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `client_code` (VARCHAR(100), Unique)
  - `name` (VARCHAR(255))
  - `company_name` (VARCHAR(255))
  - `contact_email` (VARCHAR(255))
  - `status` (VARCHAR(50), Default: `ACTIVE`)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### Table 3: `vendors`
- **Purpose:** Sample providers supplying panel respondents.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `vendor_code` (VARCHAR(100), Unique)
  - `name` (VARCHAR(255))
  - `contact_name`, `contact_email` (VARCHAR(255))
  - `status` (VARCHAR(50), Default: `ACTIVE`)
  - `notes` (TEXT)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### Table 4: `projects`
- **Purpose:** High-level fieldwork research studies.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `project_code` (VARCHAR(50), Unique, e.g. `OPI-8801`)
  - `name` (TEXT)
  - `description` (TEXT)
  - `client_id` (UUID, FK -> `clients.id`)
  - `status` (VARCHAR(20), `DRAFT`, `CONFIGURING`, `VALIDATING`, `LIVE`, `PAUSED`, `ARCHIVED`)
  - `base_survey_url` (TEXT)
  - `callback_url_base` (TEXT)
  - `client_rate`, `vendor_rate` (DECIMAL(10,2))
  - `currency` (VARCHAR(3), Default: `USD`)
  - `block_duplicate_ip` (BOOLEAN, Default: `TRUE`)
  - `block_duplicate_uid` (BOOLEAN, Default: `TRUE`)
  - `soft_duplicate_mode` (BOOLEAN, Default: `FALSE`)
  - `block_tone` (VARCHAR(32), Default: `RUDE`)
  - `allow_nat_ip` (BOOLEAN, Default: `FALSE`)
  - `custom_ip_message`, `custom_uid_message` (TEXT)
  - `created_by` (UUID, FK -> `users.id`)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### Table 5: `project_countries`
- **Purpose:** Specific country fieldwork cells within a multi-country project.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `project_id` (UUID, FK -> `projects.id` ON DELETE CASCADE)
  - `country_code` (VARCHAR(10), ISO-2, e.g. `US`)
  - `country_name` (TEXT)
  - `currency` (VARCHAR(3), Default: `USD`)
  - `client_rate` (DECIMAL(10,2))
  - `vendor_rate` (DECIMAL(10,2))
  - `target_completes` (INTEGER)
  - `survey_url` (TEXT, country-specific URL override)
  - `est_loi` (INTEGER, minutes)
  - `fieldwork_days` (INTEGER)
  - `status` (VARCHAR(20), Default: `ACTIVE`)
  - `created_at` (TIMESTAMPTZ)

### Table 6: `project_links`
- **Purpose:** Tracking entry links generated for sample vendors.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `country_id` (UUID, FK -> `project_countries.id` ON DELETE CASCADE)
  - `vendor_id` (UUID, FK -> `vendors.id`)
  - `link_code` (VARCHAR(100), Unique, e.g. `lnk_m9z8...`)
  - `link_name` (TEXT)
  - `url` (TEXT)
  - `vendor_cpi` (DECIMAL(10,2))
  - `uid_mode` (VARCHAR(20), Default: `PROVIDED_UID`)
  - `status` (VARCHAR(20), Default: `ACTIVE`)
  - `created_at` (TIMESTAMPTZ)

### Table 7: `sessions`
- **Purpose:** Records every individual respondent link entry.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `session_token` (VARCHAR(255), Unique, e.g. `trk_...`)
  - `study_id` (UUID)
  - `vendor_id` (UUID, FK -> `vendors.id`)
  - `tracking_link_id` (UUID)
  - `uid` (VARCHAR(255))
  - `normalized_uid` (VARCHAR(255))
  - `ip_hash` (VARCHAR(64))
  - `user_agent` (TEXT)
  - `country_detected` (VARCHAR(100))
  - `referrer` (TEXT)
  - `landing_url` (TEXT)
  - `initial_status`, `current_status` (VARCHAR(50))
  - `started_at`, `last_seen_at`, `completed_at`, `terminated_at`, `expires_at` (TIMESTAMPTZ)
  - `metadata_json` (JSONB, stores project_id, country_id, link_code)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### Table 8: `responses`
- **Purpose:** Master normalized response outcomes.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `session_id` (UUID, FK -> `sessions.id`, Unique)
  - `project_id` (UUID, FK -> `projects.id`)
  - `study_id` (UUID)
  - `vendor_id` (UUID, FK -> `vendors.id`)
  - `uid` (VARCHAR(255))
  - `final_status` (VARCHAR(50), `COMPLETE`, `TERMINATE`, `QUOTA_FULL`, `QUALITY_FAIL`, `UNVERIFIED`)
  - `first_terminal_event` (VARCHAR(50))
  - `terminal_at` (TIMESTAMPTZ)
  - `is_counted` (BOOLEAN, Default: `FALSE`)
  - `counted_at` (TIMESTAMPTZ)
  - `client_billing_status` (VARCHAR(50), `PENDING`, `BILLABLE`, `REJECTED`)
  - `vendor_acceptance_status` (VARCHAR(50), `PENDING`, `ACCEPTED`, `REJECTED`)
  - `rejection_reason` (VARCHAR(255))
  - `callback_source` (VARCHAR(255))
  - `loi_seconds` (INTEGER)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### Table 9: `response_events`
- **Purpose:** Append-only event store of all raw lifecycle pings (landing, callbacks).
- **Columns:**
  - `id` (UUID, Primary Key)
  - `session_id` (UUID, FK -> `sessions.id`)
  - `event_type` (VARCHAR(50), `LANDING`, `CALLBACK_RECEIVED`)
  - `source` (VARCHAR(255))
  - `raw_payload`, `normalized_payload` (JSONB)
  - `event_key` (VARCHAR(512), Unique, idempotency guard)
  - `ip_address` (INET)
  - `user_agent` (TEXT)
  - `created_at` (TIMESTAMPTZ)

### Table 10: `fake_click_events`
- **Purpose:** Forensic audit store of all unauthorized, direct, or unverified callbacks.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `project_id` (UUID, FK -> `projects.id`)
  - `vendor_id` (UUID, FK -> `vendors.id`)
  - `uid`, `normalized_uid` (TEXT)
  - `rejection_reason` (TEXT)
  - `raw_payload` (JSONB)
  - `ip_address` (TEXT)
  - `ip_hash` (TEXT)
  - `user_agent` (TEXT)
  - `is_reviewed` (BOOLEAN, Default: `FALSE`)
  - `reviewed_at` (TIMESTAMPTZ)
  - `reviewed_by` (VARCHAR(128))
  - `review_notes` (TEXT)
  - `created_at` (TIMESTAMPTZ)

### Table 11: `blocked_entry_attempts`
- **Purpose:** Log of respondents blocked by Duplicate IP or UID rules.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `project_id` (UUID, FK -> `projects.id`)
  - `country_code` (VARCHAR(10))
  - `block_type` (VARCHAR(20), `IP` | `UID`)
  - `value_hash` (VARCHAR(128))
  - `raw_value` (VARCHAR(255))
  - `reason` (VARCHAR(255))
  - `reference_id` (VARCHAR(64), Unique, e.g. `BLK-IP-A1B2C3D4`)
  - `ip_address`, `ip_hash` (VARCHAR(128))
  - `user_agent` (TEXT)
  - `tone` (VARCHAR(32))
  - `attempted_at` (TIMESTAMPTZ)
  - `is_unblocked` (BOOLEAN, Default: `FALSE`)
  - `unblocked_at` (TIMESTAMPTZ)
  - `unblocked_by` (VARCHAR(128))

### Table 12: `ip_access_rules`
- **Purpose:** Whitelist and blacklist IP rules.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `ip_address` (VARCHAR(128))
  - `ip_hash` (VARCHAR(128))
  - `rule_type` (VARCHAR(20), `WHITELIST` | `BLACKLIST`)
  - `project_id` (UUID, FK -> `projects.id`, NULL for global)
  - `reason` (TEXT)
  - `created_by` (VARCHAR(128))
  - `created_at` (TIMESTAMPTZ)
  - *Constraint:* `UNIQUE(ip_hash, rule_type, project_id)`

### Table 13: `quotas` & `project_quotas`
- **Purpose:** Quota target counters.
- **Columns:**
  - `id` (UUID, Primary Key)
  - `project_id` (UUID, FK -> `projects.id`)
  - `name` (TEXT)
  - `target` (INTEGER)
  - `achieved` (INTEGER)
  - `remaining` (INTEGER)
  - `status` (VARCHAR(20), `OPEN`, `FULL`, `CLOSED`)
  - `criteria_json` (JSONB)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### Table 14: `invoices` & `invoice_line_items`
- **Purpose:** Client financial billing records.
- **Columns:**
  - `invoices`: `id`, `invoice_number` (Unique), `project_id`, `client_id`, `billing_period_start`, `billing_period_end`, `client_rate`, `total_approved_completes`, `total_amount`, `status`, `raised_at`, `paid_at`.
  - `invoice_line_items`: `id`, `invoice_id`, `response_id`, `uid`, `country`, `rate`, `line_amount`.

### Table 15: `vendor_settlements`
- **Purpose:** Vendor payout reconciliation batches.
- **Columns:**
  - `id` (TEXT, Primary Key)
  - `project_id` (TEXT, FK -> `projects.id`)
  - `vendor_id` (TEXT, FK -> `vendors.id`)
  - `vendor_rate` (DECIMAL(10,2))
  - `total_submitted`, `total_accepted`, `total_rejected` (INTEGER)
  - `accepted_amount`, `rejected_amount`, `payable_amount` (DECIMAL(12,2))
  - `status` (VARCHAR(20), `DRAFT`, `FINALIZED`, `PAID`)
  - `generated_at`, `finalized_at`, `paid_at` (TIMESTAMPTZ)
  - *Constraint:* `UNIQUE(project_id, vendor_id)`

### Table 16: `credential_vault` & `credential_vault_audit`
- **Purpose:** AES-256-GCM encrypted credential vault with audit access trail.
- **Columns:**
  - `credential_vault`: `id`, `created_by`, `study_id`, `label`, `credential_type`, `username`, `encrypted_password`, `iv`, `auth_tag`, `notes`, `last_accessed_at`.
  - `credential_vault_audit`: `id`, `vault_entry_id`, `action`, `performed_by`, `ip_address`, `user_agent`, `created_at`.

### Table 17: `audit_logs` & `login_audit`
- **Purpose:** System-wide compliance and authentication attempt logs.
- **Columns:**
  - `audit_logs`: `id`, `user_id`, `user`, `action`, `entity`, `entity_id`, `before` (JSONB), `after` (JSONB), `timestamp`, `ip`.
  - `login_audit`: `id`, `user_id`, `email_attempted`, `success`, `failure_reason`, `ip_address`, `user_agent`, `created_at`.

---

## 18. Comprehensive Glossary

- **CAWI (Computer-Assisted Web Interviewing):** Online quantitative survey research where respondents answer questionnaire items in a web browser without an interviewer.
- **CPI (Cost Per Interview):** The financial rate associated with a single completed survey response. Client CPI is what the client pays the agency; Vendor CPI is what the agency pays the sample supplier.
- **IR (Incidence Rate):** The percentage of respondents who meet qualifying demographic criteria for a study out of total people who attempt it.
- **LOI (Length of Interview):** The duration, in minutes, that a human respondent requires to complete a questionnaire from start to finish.
- **UID / ZID:** Unique Identifier assigned to an individual panelist by a sample vendor. Essential for deduplication, quality tracking, and panelist incentive disbursement.
- **HMAC (Hash-based Message Authentication Code):** Cryptographic verification technique using SHA-256 and a shared secret key to ensure that callbacks from external platforms have not been forged or tampered with.
- **Direct Hit / Unverified Hit:** A callback ping that hits completion or termination endpoints without arriving via a valid tracking link session. Treated as untrusted traffic.
- **Replay Protection (Nonce):** A random single-use hexadecimal token included in signed URLs to guarantee that a completion link cannot be executed more than once.
- **RLS (Row Level Security):** PostgreSQL database mechanism that restricts which rows a database query can return based on the identity and role of the requesting user.
- **RPC (Remote Procedure Call):** Protocol used to communicate with the LimeSurvey API (JSON-RPC 2.0).
- **Speeder:** A fraudulent respondent or automated script that rushes through a 15-minute survey in under 15 seconds. Flagged as `QUALITY_FAIL`.
- **Reference ID:** A human-readable support identifier (e.g. `BLK-IP-9B4F1A2C`) given to respondents blocked by fraud rules so platform support can look up the block event.

---

## 19. What to Read First: New Developer Guide

If you are a new software engineer onboarding to this codebase, read the repository in this exact sequence to achieve full mental mastery in minimal time:

### Stage 1: The Core Ingestion Pipeline (Day 1)
1. **`src/services/trackingService.ts`**: Understand UID normalization (`normalizeUid`), status state machine (`applyStateTransition`), and session token generation.
2. **`src/services/fraudService.ts`**: Read `checkDuplicateEntry()` to understand how Rule A (IP) and Rule B (UID) evaluate incoming traffic and generate reference IDs.
3. **`src/routes/index.ts` (Lines 3140–3420)**: Trace the `/track` gateway. Follow how query params become database sessions and redirect to client survey URLs.
4. **`src/routes/index.ts` (Lines 740–880)**: Trace `handleRedirectLanding()`. Understand how completion callbacks are verified, how speeder bots (< 15s) are downgraded, and how direct hits are diverted into `fake_click_events`.

### Stage 2: Database Layer & Data Invariants (Day 2)
1. **`src/db/migrations/001-initial-schema.sql`**: Inspect the foundation tables (`users`, `clients`, `vendors`, `studies`, `sessions`, `responses`).
2. **`src/db/migrations/018-fraud-prevention.sql`**: Inspect the fraud tables (`blocked_entry_attempts`, `ip_access_rules`, project fraud toggles).
3. **`src/db/migrations/024-multi-country-project-wizard.sql`**: Inspect multi-country rates and link structures.
4. **`src/db/index.ts`**: Understand the unified database abstraction layer and connection pool management.

### Stage 3: Dashboard Architecture & Admin Pages (Day 3)
1. **`src/components/layout/DashboardLayout.tsx` & `Sidebar.tsx`**: Understand layout structure and RBAC navigation filtering.
2. **`src/app/dashboard/projects/new/page.tsx`**: Study the 5-step wizard to understand how complex projects are created.
3. **`src/app/dashboard/responses/page.tsx`**: Study how verified and unverified traffic are presented, filtered, and triaged.
4. **`src/app/dashboard/projects/[projectId]/blocked/page.tsx`**: Learn how blocked attempts are reviewed and unblocked.

### Stage 4: System Administration & Respondent Runtime (Day 4)
1. **`src/routes/database.ts`**: Understand storage monitoring (500 MB quota), ExcelJS multi-sheet exports, and the `RESET-CONFIRM` safety protocol.
2. **`src/app/survey/status/page.tsx` & `src/lib/survey/outcome-config.ts`**: Review how the 6 respondent outcome pages and meme sound FX are rendered.
3. **`src/app/mock-survey/page.tsx` & `run_fraud_feature_proof.py`**: Run local E2E simulation tests to see all fraud and survey scenarios trigger live.

---
*Opinion Insights CAWI Platform Telemetry & Architecture Documentation • Maintained by Engineering Team.*
