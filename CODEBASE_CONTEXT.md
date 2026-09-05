# Opinion Insights — Full Codebase Context

## Architecture
- **Backend**: Express.js (TypeScript) on port 3000
- **Frontend**: Plain HTML/CSS/JS SPA (`src/app/public/`)
- **DB**: PostgreSQL via Supabase (Neon)
- **API mount**: Both `/` and `/api` prefix
- **Entry**: `src/index.ts` → `src/routes/index.ts` (main) + `api/index.ts` (legacy Supabase SPA)

## DB Connection
```
Host: ep-quiet-hill-a5748jiz.us-east-2.aws.neon.tech
User: neondb_owner
DB: neondb
SSL: Require
```

## Auth System
- HMAC-SHA256 password hashing with secret from `AUTH_SECRET` env var
- JWT tokens (HS256)
- Login: `POST /api/auth/login` → `{ email, password }` → `{ success, token, user }`
- Middleware: `authenticate` + `authorize(roles[])`
- Account lockout: 5 failed attempts → temporary lock

## Users (DB)
| Email | Password | Role |
|-------|----------|------|
| vendor@test.com | vendor123 | VENDOR |
| admin@cawi.io | admin123 | ADMIN |

## Key Files

### Express Server
- `src/index.ts` — Server bootstrap, mounts routes at `/` and `/api`
- `src/routes/index.ts` — ALL API routes (2300+ lines)

### SPA Frontend
- `src/app/public/index.html` — Login + app shell (sidebar, topbar, content area)
- `src/app/public/app.js` — ALL SPA logic (~1760 lines): routing, renderers, auth, CRUD
- `src/app/public/style.css` — Main styles (33KB)
- `src/app/public/glass-buttons.css` — Glass button components
- `src/app/public/login-glass.css` — Login page glassmorphism styles

### SPA Routes (hash-based)
| Hash | Renderer Function | Description |
|------|------------------|-------------|
| #/ | renderDashboard | Platform overview |
| #/studies | renderStudies | Research studies |
| #/vendors | renderVendors | Vendor management |
| #/tracking-links | renderTrackingLinks | Survey tracking links |
| #/responses | renderResponses | Respondent data |
| #/quotas | renderQuotas | Quota tracking |
| #/analytics | renderAnalytics | Performance analytics |
| #/admin-users | renderAdminUsers | User management (NEW) |
| #/settings | renderSettings | Password change (NEW) |

### Sidebar Nav Items
1. Fieldwork: Dashboard, Studies, Vendors, Tracking Links, Responses, Quotas
2. Analytics: Analytics
3. Admin: User Management, Settings

### SPA Helpers
- `api(path, options)` — Fetch wrapper with auth token
- `showToast(msg, type)` — Toast notifications
- `showModal(title, body, footer)` / `hideModal()` — Modal system
- `showLoading()` / `showError(selector, msg)` — UI states
- `renderTable(headers, rows, idKey)` — Generic table renderer
- `renderPagination(page, total, handler)` — Pagination
- `renderBadge(text, type)` — Status badges
- `escapeHtml(str)` — XSS prevention

## API Endpoints (Key)

### Auth
- `POST /auth/login` — Login
- `POST /auth/change-password` — Change password (requires auth)

### Admin (requires ADMIN role)
- `GET /admin/users` — List all users with vendor join
- `POST /admin/users` — Create vendor user `{ email, password, full_name, role, vendor_id }`
- `PATCH /admin/users/:id/status` — Activate/Deactivate `{ status: ACTIVE|SUSPENDED }`
- `DELETE /admin/users/:id` — Delete user

### Core
- `GET /studies` — List studies
- `GET /vendors` — List vendors
- `GET /tracking-links` — List tracking links
- `GET /responses` — List responses
- `GET /quotas` — Quota data
- `GET /analytics` — Analytics data

## Recently Implemented Features

### Password Change (Settings page)
- `renderSettings()` — Form with current password, new password, confirm
- `doChangePassword()` — Calls `POST /auth/change-password`
- Routes to `POST /api/auth/change-password`

### User Management (Admin Users page)
- `renderAdminUsers()` — Table with all users, status, actions
- `showCreateUserModal()` — Modal to create vendor accounts
- `doCreateUser()` — Calls `POST /admin/users`
- `toggleUserStatus(id, status)` — Suspend/Reactivate
- `deleteUser(id)` — Delete with confirmation

### Login Page
- Glassmorphism split layout (left hero, right form)
- Animated beam effect
- SVG input icons, password toggle, loading spinner
- `toggleLoginPw()` — Show/hide password

## Design System
- Dark glassmorphism theme
- Primary: #00BFA5 (teal), accents: #00A389
- Font: Inter (Google Fonts)
- Glass: backdrop-filter blur, semi-transparent bg
- Nav icons: HTML numeric entities ( &#128202; = chart, &#9881; = gear, etc.)
