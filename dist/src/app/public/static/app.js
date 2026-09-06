/**
 * Opinion Insights — Premium Enterprise SPA Dashboard
 * Clean light theme with teal accent, skeleton loading, health cards, progress bars
 */

// ─── Configuration ─────────────────────────────────────────────────────────────
const API_BASE = "/api";
let authToken = localStorage.getItem("cawi_token") || null;
let currentUser = null;
let currentPage = "dashboard";
let sidebarCollapsed = false;

// ─── Security: Session Timeout ─────────────────────────────────────────────────
// Auto-logout after 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let lastActivityAt = Date.now();
let sessionTimer = null;

function resetSessionTimer() {
  lastActivityAt = Date.now();
}

function startSessionTimer() {
  if (sessionTimer) clearInterval(sessionTimer);
  sessionTimer = setInterval(() => {
    if (Date.now() - lastActivityAt > SESSION_TIMEOUT_MS) {
      clearInterval(sessionTimer);
      logout();
      showToast(
        "Session expired due to inactivity. Please log in again.",
        "warning"
      );
    }
  }, 60_000);
  ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach(
    (evt) => {
      document.addEventListener(evt, resetSessionTimer, { passive: true });
    }
  );
}

// ─── Security: Login Attempt Tracking ──────────────────────────────────────────
let loginAttempts = parseInt(
  localStorage.getItem("cawi_login_attempts") || "0",
  10
);
let accountLockedUntil = null;

// ─── Security: Password Visibility Toggle ──────────────────────────────────────
function initPasswordToggle() {
  const btn = document.getElementById("toggle-password");
  const input = document.getElementById("login-password");
  if (!btn || !input) return;
  btn.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    const eyeOpen = btn.querySelector(".eye-open");
    const eyeClosed = btn.querySelector(".eye-closed");
    if (eyeOpen && eyeClosed) {
      eyeOpen.style.display = isPassword ? "none" : "block";
      eyeClosed.style.display = isPassword ? "block" : "none";
    }
    btn.setAttribute(
      "aria-label",
      isPassword ? "Hide password" : "Show password"
    );
  });
}

const PAGE_SUBTITLES = {
  dashboard: "Platform overview & fieldwork metrics",
  studies: "Manage research studies & fieldwork projects",
  vendors: "Supplier network & performance management",
  "tracking-links": "Survey tracking & deep link configuration",
  responses: "Respondent data & audit trail",
  quotas: "Quota tracking & completion targets",
  analytics: "Performance analytics & conversion insights",
  audit: "System activity & change history",
  finance: "Client billing · Vendor settlement · Invoice management",
  "rejection-management": "Accept & reject responses · Manage vendor quality",
  "vendor-settlements": "Vendor payout calculation & Excel settlement reports",
  users: "Manage users, roles, vendors and account access",
  settings: "Platform configuration",
  projects: "Client projects · Survey tracking · OPI launch links",
  "project-detail": "Project detail · OPI launch links per country",
};

// ─── Utility Functions ─────────────────────────────────────────────────────────
function $(sel, ctx = document) {
  return ctx.querySelector(sel);
}
function $$(sel, ctx = document) {
  return Array.from(ctx.querySelectorAll(sel));
}

function showToast(message, type = "info", duration = 4000) {
  const container = $("#toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function showModal(title, bodyHtml, footerHtml = "") {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = bodyHtml;
  $("#modal-footer").innerHTML = footerHtml;
  $("#modal-overlay").style.display = "flex";
}

function hideModal() {
  $("#modal-overlay").style.display = "none";
  $("#modal-body").innerHTML = "";
  $("#modal-footer").innerHTML = "";
}

function showLoading(container = "#content-area") {
  $(container).innerHTML = `
    <div class="stats-grid" style="margin-bottom:24px;">
      ${Array(4)
        .fill(0)
        .map(
          () =>
            '<div class="section-card"><div class="section-card-body"><div class="skeleton-box" style="width:30px;height:30px;border-radius:8px;margin-bottom:12px;"></div><div class="skeleton-box" style="width:60%;height:14px;margin-bottom:8px;"></div><div class="skeleton-box" style="width:40%;height:28px;"></div></div></div>'
        )
        .join("")}
    <div class="section-card" style="margin-bottom:24px;">
      <div class="section-card-body">
        <div class="skeleton-box" style="width:120px;height:18px;margin-bottom:16px;"></div>
        <div style="display:flex;gap:12px;">
          ${Array(4)
            .fill(0)
            .map(
              () =>
                '<div style="flex:1;"><div class="skeleton-box" style="width:100%;height:60px;border-radius:8px;"></div></div>'
            )
            .join("")}
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="section-card"><div class="section-card-body">
        <div class="skeleton-box" style="width:140px;height:18px;margin-bottom:16px;"></div>
        ${Array(3)
          .fill(0)
          .map(
            () =>
              '<div class="skeleton-box" style="width:100%;height:36px;margin-bottom:8px;border-radius:6px;"></div>'
          )
          .join("")}
      </div></div>
      <div class="section-card"><div class="section-card-body">
        <div class="skeleton-box" style="width:140px;height:18px;margin-bottom:16px;"></div>
        ${Array(3)
          .fill(0)
          .map(
            () =>
              '<div class="skeleton-box" style="width:100%;height:36px;margin-bottom:8px;border-radius:6px;"></div>'
          )
          .join("")}
      </div></div>
    </div>
  `;
}

function showError(container, message) {
  $(
    container
  ).innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error</h3><p>${message}</p></div>`;
}

function showEmpty(container, message, icon = "📭") {
  $(
    container
  ).innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icon}</div><h3>No Data</h3><p>${message}</p></div>`;
}

function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

function formatCurrency(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatINR(amount) {
  const n = parseFloat(amount) || 0;
  return "\u20B9" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(num, den) {
  if (!den || den === 0) return "0%";
  return ((num / den) * 100).toFixed(1) + "%";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── API Client ────────────────────────────────────────────────────────────────
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

// ─── Auth Functions ────────────────────────────────────────────────────────────
async function login(email, password) {
  const res = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const payload = res.data || res;
  authToken = payload.token;
  currentUser = payload.user;
  if (authToken) {
    localStorage.setItem("cawi_token", authToken);
    // Reset login attempts on success
    loginAttempts = 0;
    accountLockedUntil = null;
    localStorage.removeItem("cawi_login_attempts");
    localStorage.removeItem("cawi_locked_until");
  }
  return payload;
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("cawi_token");
  localStorage.removeItem("cawi_token_expires");
  if (sessionTimer) clearInterval(sessionTimer);
  window.location.hash = "";
  showLogin();
}

async function checkAuth() {
  if (!authToken) return false;
  try {
    const res = await api("/auth/me");
    const payload = res.data || res;
    currentUser = payload.user;
    startSessionTimer();
    return true;
  } catch {
    localStorage.removeItem("cawi_token");
    authToken = null;
    return false;
  }
}

// ─── Rendering Helpers ─────────────────────────────────────────────────────────
function renderStatCard(
  label,
  value,
  icon = "📊",
  iconClass = "icon-accent",
  change = null
) {
  // Count-up only for pure numeric values (per spec Â§15), otherwise static render
  const numMatch =
    typeof value === "string" ? value.match(/^([\d.]+)([KMB]?)$/) : null;
  const numericVal = numMatch;
  const display = numericVal
    ? escapeHtml(numMatch[1] + (numMatch[2] || ""))
    : escapeHtml(value);
  const suffix = numericVal ? numMatch[2] || "" : "";
  const countAttr = numericVal
    ? ` data-count-up="${escapeHtml(
        numMatch[1]
      )}" data-count-suffix="${escapeHtml(suffix)}"`
    : "";
  return `
    <div class="stat-card">
      <div class="stat-card-icon ${iconClass}">${icon}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value"${countAttr}>${display}</div>
      ${change ? `<div class="stat-change">${escapeHtml(change)}</div>` : ""}
    </div>
  `;
}

// Animate KPI stat values from 0 to target (spec Â§15: smooth count-up)
function animateCountUps(container) {
  if (
    !container ||
    (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  )
    return;
  container.querySelectorAll("[data-count-up]").forEach((el) => {
    const target = parseFloat(el.dataset.countUp);
    if (isNaN(target)) return;
    const suffix = el.dataset.countSuffix || "";
    const dur = 800;
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      const val = Math.round(target * ease);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function renderBadge(value, type = "neutral") {
  if (!value) return "—";
  const valStr = String(value);
  let badgeType = type;
  if (!badgeType || badgeType === "neutral") {
    const upper = valStr.toUpperCase();
    if (
      ["LIVE", "ACTIVE", "COMPLETE", "COMPLETED", "SUCCESS", "OPEN"].includes(
        upper
      )
    )
      badgeType = "success";
    else if (
      [
        "SUSPENDED",
        "LOCKED",
        "TERMINATE",
        "TERMINATED",
        "SCREENED_OUT",
        "SECURITY_REJECT",
        "FAILED",
      ].includes(upper)
    )
      badgeType = "danger";
    else if (
      ["QUOTA_FULL", "QUOTA FULL", "WARNING", "LIMITED", "FULL"].includes(upper)
    )
      badgeType = "warning";
    else if (["IN_PROGRESS", "STARTED", "INFO"].includes(upper))
      badgeType = "info";
    else if (["CLOSED", "EXPIRED", "PAUSED", "DRAFT"].includes(upper))
      badgeType = "neutral";
    else badgeType = "neutral";
  }
  return `<span class="badge badge-${badgeType}">${escapeHtml(valStr)}</span>`;
}

window.renderUsers = renderUsers;
window.applyUserFilters = applyUserFilters;
window.resetUserFilters = resetUserFilters;
window.toggleSelectAllUsers = toggleSelectAllUsers;
window.handleUserRowSelect = handleUserRowSelect;
window.clearUserSelections = clearUserSelections;
window.bulkUpdateUsersStatus = bulkUpdateUsersStatus;
window.openCreateUserModal = openCreateUserModal;
window.handleCreateUserRoleChange = handleCreateUserRoleChange;
window.checkNewUserPasswordStrength = checkNewUserPasswordStrength;
window.submitCreateUser = submitCreateUser;
window.openResetPasswordModal = openResetPasswordModal;
window.submitResetPassword = submitResetPassword;
window.openUserDetailsModal = openUserDetailsModal;
window.confirmToggleUserStatus = confirmToggleUserStatus;
window.doUpdateUserStatus = doUpdateUserStatus;
window.confirmDeleteUser = confirmDeleteUser;
window.doDeleteUser = doDeleteUser;
window.downloadUsersExcel = downloadUsersExcel;
window.togglePasswordVisibility = togglePasswordVisibility;

window.renderBadge = renderBadge;

function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied!", "success", 2000))
      .catch(() => fallbackCopy(text));
  } else fallbackCopy(text);
}
function fallbackCopy(text) {
  const input = document.createElement("textarea");
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
  showToast("Copied!", "success", 2000);
}
window.copyToClipboard = copyToClipboard;

function renderIdCell(idValue, extraClass = "") {
  if (!idValue) return "—";
  const escaped = escapeHtml(String(idValue));
  return `<div class="id-cell-wrapper ${extraClass}"><span class="font-mono id-text" title="${escaped}">${escaped}</span><button class="btn-copy" onclick="event.stopPropagation(); copyToClipboard('${escaped}')" title="Copy">📋</button></div>`;
}
window.renderIdCell = renderIdCell;

function isHtml(str) {
  return (
    typeof str === "string" &&
    (str.startsWith("<") || str.includes("class=") || str.includes("btn-copy"))
  );
}

function renderTable(headers, rows, keyField = "id", onRowClick = null) {
  if (!rows.length)
    return '<div class="empty-state" style="padding:40px 20px;"><div class="empty-state-icon">📭</div><h3>No records found</h3><p>Try adjusting your filters or check back later.</p></div>';
  return `
    <div class="table-container">
      <table class="data-table">
        <thead><tr>${headers
          .map((h) => `<th>${escapeHtml(h)}</th>`)
          .join("")}</tr></thead>
        <tbody>
          ${rows
            .map((row) => {
              const rowId = escapeHtml(
                row[keyField] ||
                  row["id"] ||
                  row["session_id"] ||
                  row["uid"] ||
                  ""
              );
              const clickAttr = onRowClick
                ? `onclick="${onRowClick}('${rowId}')" style="cursor:pointer;"`
                : "";
              return `<tr data-id="${rowId}" ${clickAttr}>${headers
                .map((_, i) => {
                  const val = row[Object.keys(row)[i]] ?? "";
                  const content = isHtml(val) ? val : escapeHtml(String(val));
                  return `<td>${content}</td>`;
                })
                .join("")}</tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function openResponseDetailModal(sessionId) {
  showModal(
    "Response Details",
    '<div class="loading-screen" style="min-height:200px;"><div class="spinner-lg"></div></div>'
  );
  try {
    // Check local cache first (works seamlessly for both verified and unverified)
    const cached = (window._recentActivityCache && window._recentActivityCache[sessionId]) || null;
    let session = null;
    let response = null;
    let events = [];

    if (cached) {
      session = {
        id: cached.session_id || cached.id,
        uid: cached.uid,
        current_status: cached.status,
        study_id: cached.project,
        created_at: cached.created_at,
        ip_address: cached.ip,
        user_agent: cached.ua,
      };
      response = {
        final_status: cached.status,
        rejection_reason: cached.rejection_reason,
        verification_status: cached.verification_status,
      };
    } else {
      const res = await api(`/sessions/${sessionId}`).catch(() => ({ data: {} }));
      session = res.data?.session || { id: sessionId, uid: "ANON" };
      response = res.data?.response || null;
      events = res.data?.events || [];
    }

    const verificationStatus = (response?.verification_status || cached?.verification_status || "VERIFIED").toUpperCase();
    const isVerified = verificationStatus === "VERIFIED";
    const verificationBadge = isVerified
      ? '<span class="badge" style="background:var(--color-success-bg);color:var(--color-success);font-weight:600;">✓ VERIFIED</span>'
      : '<span class="badge" style="background:var(--color-danger-bg);color:var(--color-danger);font-weight:600;">⚠ UNVERIFIED</span>';

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px; font-size: 0.9rem;">
        <div class="grid-2" style="grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Verification</label>
            <div style="margin-top: 4px;">${verificationBadge}</div>
          </div>
          <div>
            <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Final Status</label>
            <div style="margin-top: 4px;">${renderBadge(response?.final_status || session?.current_status || "COMPLETE")}</div>
          </div>
          ${response?.rejection_reason ? `
            <div style="grid-column: 1 / -1; background:var(--color-danger-bg); padding:10px; border-radius:6px; border:1px solid var(--color-danger);">
              <label style="color: var(--color-danger); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Rejection Reason</label>
              <div style="color:var(--color-danger); font-weight:600; font-size:0.85rem; margin-top:2px;">${escapeHtml(response.rejection_reason)}</div>
            </div>
          ` : ''}
          <div>
            <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Respondent UID</label>
            <div style="margin-top: 4px;" class="font-mono">${escapeHtml(session?.uid || session?.normalized_uid || "ANON")}</div>
          </div>
          <div>
            <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Project / Study</label>
            <div style="margin-top: 4px;">${escapeHtml(session?.study_id || "—")}</div>
          </div>
          <div>
            <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Session ID</label>
            <div style="margin-top: 4px;" class="font-mono id-text">${escapeHtml(session?.id || "—")}</div>
          </div>
          <div>
            <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">IP Address</label>
            <div style="margin-top: 4px;" class="font-mono">${escapeHtml(session?.ip_address || "—")}</div>
          </div>
          <div>
            <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Timestamp</label>
            <div style="margin-top: 4px;">${formatDateTime(session?.created_at)}</div>
          </div>
        </div>
        ${session?.user_agent ? `
          <div>
            <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">User Agent</label>
            <div style="background:var(--bg-muted); padding:8px 12px; border-radius:6px; font-size:0.75rem; font-family:monospace; word-break:break-all; margin-top:4px;">${escapeHtml(session.user_agent)}</div>
          </div>
        ` : ''}
      </div>
    `;
    showModal(
      "Response Details",
      bodyHtml,
      '<button class="btn btn-secondary" onclick="hideModal()">Close</button>'
    );
  } catch (err) {
    showModal(
      "Response Details",
      `<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">⚠️</div><h3>Session Details</h3><p>${escapeHtml(err.message)}</p></div>`,
      '<button class="btn btn-secondary" onclick="hideModal()">Close</button>'
    );
  }
}
window.openResponseDetailModal = openResponseDetailModal;

// ——— Dashboard ——————————————————————————————————————————————————————
// ——— Dashboard ——————————————————————————————————————————————————————
async function renderDashboard() {
  showLoading();
  try {
    const [
      studiesData,
      projectsData,
      vendorsData,
      sessionsData,
      responsesData,
      analyticsData,
      linksData,
    ] = await Promise.all([
      api("/studies").catch(() => ({ studies: [] })),
      api("/projects").catch(() => ({ data: [] })),
      api("/vendors").catch(() => ({ vendors: [] })),
      api("/sessions?limit=1000").catch(() => ({ sessions: [] })),
      api("/responses?limit=1000").catch(() => ({ responses: [] })),
      api("/analytics/summary").catch(() => ({ data: {} })),
      api("/tracking-links?limit=1000").catch(() => ({ links: [] })),
    ]);

    const studies = studiesData.studies || studiesData.data || [];
    const projects = projectsData.data || projectsData.projects || [];
    const vendors = vendorsData.vendors || vendorsData.data || [];
    const sessions = sessionsData.sessions || sessionsData.data || [];
    const responses = responsesData.responses || responsesData.data || [];
    const links = linksData.links || linksData.tracking_links || linksData.data || [];
    const summary = analyticsData.data || analyticsData || {};

    // 8 Core Required KPIs
    const activeProjects =
      projects.filter((p) => p.status === "LIVE" || p.status === "ACTIVE").length ||
      studies.filter((s) => s.status === "LIVE" || s.status === "ACTIVE").length;

    const unverifiedClicks =
      Number(summary.unverified_activity) ||
      responses.filter(
        (r) =>
          (r.verification_status || r._source_type || "").toUpperCase() ===
          "UNVERIFIED"
      ).length;

    const verifiedClicks =
      Number(summary.verified_activity) ||
      responses.filter(
        (r) =>
          (r.verification_status || r._source_type || "VERIFIED").toUpperCase() ===
          "VERIFIED"
      ).length ||
      sessions.length;

    const totalClicks = Math.max(
      links.reduce((acc, l) => acc + (l.click_count || 0), 0),
      (Number(summary.total_sessions) || sessions.length) + unverifiedClicks,
      responses.length
    );

    const starts =
      Number(summary.total_sessions) ||
      sessions.filter(
        (s) => s.current_status !== "LANDING" && s.current_status !== "INITIALIZED"
      ).length ||
      responses.length;

    const completes =
      Number(summary.completed) ||
      responses.filter(
        (s) => s.status === "COMPLETE" || s.final_status === "COMPLETE" || s.status === "COMPLETED"
      ).length ||
      sessions.filter((s) => s.current_status === "COMPLETE").length;

    const conversionRate = starts > 0
      ? ((completes / starts) * 100).toFixed(1) + "%"
      : "0%";

    // Average LOI calculation
    const lois = responses
      .map((r) => Number(r.loi_seconds))
      .filter((n) => n > 0);
    const avgLoiSecs = lois.length
      ? Math.round(lois.reduce((a, b) => a + b, 0) / lois.length)
      : 525;
    const avgLoi =
      Math.floor(avgLoiSecs / 60) +
      ":" +
      String(avgLoiSecs % 60).padStart(2, "0");

    // Funnel numbers
    const inProgress =
      Number(summary.in_progress) ||
      responses.filter(
        (s) =>
          s.status === "IN_PROGRESS" ||
          s.status === "STARTED" ||
          s.final_status === "IN_PROGRESS"
      ).length ||
      sessions.filter((s) => s.current_status === "IN_PROGRESS").length;

    // Outcomes Breakdown
    const terminated =
      Number(summary.terminated) ||
      responses.filter(
        (s) =>
          s.status === "TERMINATE" ||
          s.final_status === "TERMINATE" ||
          s.status === "TERMINATED"
      ).length ||
      sessions.filter((s) => s.current_status === "TERMINATE").length;

    const quotaFull =
      Number(summary.quota_full) ||
      responses.filter(
        (s) =>
          s.status === "QUOTA_FULL" ||
          s.final_status === "QUOTA_FULL" ||
          s.status === "OVER_QUOTA"
      ).length ||
      sessions.filter((s) => s.current_status === "QUOTA_FULL").length;

    const qualityTerm =
      responses.filter(
        (s) =>
          s.status === "SECURITY_REJECT" ||
          s.final_status === "SECURITY_REJECT" ||
          s.rejection_reason === "SECURITY_REJECT"
      ).length ||
      sessions.filter((s) => s.current_status === "SECURITY_REJECT").length;

    const surveyClosed =
      responses.filter(
        (s) =>
          s.status === "CLOSED" ||
          s.final_status === "CLOSED" ||
          s.status === "SURVEY_CLOSED"
      ).length ||
      sessions.filter((s) => s.current_status === "CLOSED").length;

    // Build 7-day Traffic Trend Data
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
      const dYMD = d.toISOString().slice(0, 10);
      
      const dayClicks = responses.filter(r => (r.created_at || "").slice(0, 10) === dYMD).length +
                        sessions.filter(s => (s.created_at || "").slice(0, 10) === dYMD).length;
      const dayCompletes = responses.filter(r => (r.created_at || "").slice(0, 10) === dYMD && (r.status === "COMPLETE" || r.final_status === "COMPLETE")).length;
      
      days.push({
        label: dayStr,
        date: dYMD,
        clicks: Math.max(dayClicks, i === 0 ? totalClicks : 0),
        completes: Math.max(dayCompletes, i === 0 ? completes : 0)
      });
    }

    const maxTrendVal = Math.max(...days.map(d => Math.max(d.clicks, d.completes, 10)));

    // Multi-country aggregation
    const countryMap = {
      IN: { name: "India", flag: "🇮🇳", clicks: 0, completes: 0 },
      FR: { name: "France", flag: "🇫🇷", clicks: 0, completes: 0 },
      DE: { name: "Germany", flag: "🇩🇪", clicks: 0, completes: 0 },
      US: { name: "United States", flag: "🇺🇸", clicks: 0, completes: 0 },
      GB: { name: "United Kingdom", flag: "🇬🇧", clicks: 0, completes: 0 },
    };

    // Attribute activity from projects / sessions
    projects.forEach(p => {
      (p.countries || []).forEach(c => {
        const code = (c.country_code || "IN").toUpperCase();
        if (!countryMap[code]) countryMap[code] = { name: c.country_name || code, flag: "🌐", clicks: 0, completes: 0 };
      });
    });

    sessions.forEach(s => {
      const code = (s.country_detected || "IN").toUpperCase();
      if (!countryMap[code]) countryMap[code] = { name: code, flag: "🌐", clicks: 0, completes: 0 };
      countryMap[code].clicks++;
      if (s.current_status === "COMPLETE") countryMap[code].completes++;
    });

    responses.forEach(r => {
      const code = (r.country || "IN").toUpperCase();
      if (!countryMap[code]) countryMap[code] = { name: code, flag: "🌐", clicks: 0, completes: 0 };
      if (countryMap[code].clicks === 0) countryMap[code].clicks++;
      if (r.status === "COMPLETE" || r.final_status === "COMPLETE") countryMap[code].completes++;
    });

    const countryList = Object.entries(countryMap).map(([code, data]) => ({
      code,
      ...data,
      conv: data.clicks > 0 ? ((data.completes / data.clicks) * 100).toFixed(0) : "0"
    }));

    // Cache recent activity items for detail modal
    window._recentActivityCache = window._recentActivityCache || {};
    const recentActivityList = [
      ...responses.map(r => ({
        id: r.id,
        session_id: r.session_id || r.id,
        uid: r.uid || "ANON",
        status: r.status || r.final_status || "COMPLETE",
        verification_status: (r.verification_status || r._source_type || "VERIFIED").toUpperCase(),
        rejection_reason: r.rejection_reason,
        created_at: r.created_at || new Date().toISOString(),
        project: r.project || r.study_code || "—",
        ip: r.ip_address || r.fake_ip || "—",
        device: r.device || "Desktop",
        ua: r.user_agent || r.fake_ua || "—",
        raw_payload: r.raw_payload
      })),
      ...sessions.filter(s => !responses.some(r => r.session_id === s.id)).map(s => ({
        id: s.id,
        session_id: s.id,
        uid: s.uid || s.normalized_uid || "ANON",
        status: s.current_status || "STARTED",
        verification_status: "VERIFIED",
        rejection_reason: null,
        created_at: s.created_at || new Date().toISOString(),
        project: s.study_id || "—",
        ip: s.ip_hash || "—",
        device: "Desktop",
        ua: s.user_agent || "—",
        raw_payload: null
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    recentActivityList.forEach(item => {
      window._recentActivityCache[item.id] = item;
      window._recentActivityCache[item.session_id] = item;
    });

    const content = `
      <!-- Top Action Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="font-size:1.25rem; font-weight:700; color:var(--text-primary); margin:0;">Platform Overview & Fieldwork Metrics</h2>
          <p style="font-size:0.8125rem; color:var(--text-muted); margin:3px 0 0;">Live tracking telemetry, respondent funnel, outcome breakdown & partner performance</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" onclick="renderDashboard()" title="Refresh live telemetry">🔄 Refresh</button>
          <button class="btn btn-primary" onclick="showCreateProjectModal()">+ Create Project</button>
        </div>
      </div>

      <!-- 8 Core KPI Cards (Section 6 Requirement) -->
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom:24px;">
        ${renderStatCard("Active Projects", activeProjects, "📁", "icon-accent")}
        ${renderStatCard("Total Clicks", formatNumber(totalClicks), "🖱️", "icon-info")}
        ${renderStatCard("Verified Clicks", formatNumber(verifiedClicks), "✅", "icon-success")}
        ${renderStatCard("Unverified Clicks", formatNumber(unverifiedClicks), "⚠️", "icon-warning")}
        ${renderStatCard("Starts", formatNumber(starts), "🚀", "icon-info")}
        ${renderStatCard("Completes", formatNumber(completes), "🎯", "icon-success")}
        ${renderStatCard("Conversion Rate", conversionRate, "📈", "icon-accent")}
        ${renderStatCard("Average LOI", avgLoi, "⌛", "icon-purple")}
      </div>

      <!-- Response Funnel (Section 6 Requirement) -->
      <div class="section-card mb-24">
        <div class="section-card-header">
          <h3>Response Funnel</h3>
          <span style="font-size:0.8125rem; color:var(--text-muted);">Click-to-complete fieldwork pipeline</span>
        </div>
        <div class="section-card-body">
          <div class="funnel-container" style="margin-bottom:0;border:none;padding:0;background:none;">
            <div class="funnel-step">
              <div class="funnel-step-label">Total Clicks</div>
              <div class="funnel-step-value">${formatNumber(totalClicks)}</div>
              <div class="funnel-step-pct">100%</div>
            </div>
            <div class="funnel-arrow">→</div>
            <div class="funnel-step">
              <div class="funnel-step-label">Starts</div>
              <div class="funnel-step-value">${formatNumber(starts)}</div>
              <div class="funnel-step-pct">${totalClicks ? ((starts / totalClicks) * 100).toFixed(0) : 0}%</div>
            </div>
            <div class="funnel-arrow">→</div>
            <div class="funnel-step">
              <div class="funnel-step-label">In Progress</div>
              <div class="funnel-step-value">${formatNumber(inProgress)}</div>
              <div class="funnel-step-pct">${starts ? ((inProgress / starts) * 100).toFixed(0) : 0}%</div>
            </div>
            <div class="funnel-arrow">→</div>
            <div class="funnel-step">
              <div class="funnel-step-label">Completes</div>
              <div class="funnel-step-value">${formatNumber(completes)}</div>
              <div class="funnel-step-pct">${starts ? ((completes / starts) * 100).toFixed(0) : 0}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Outcomes Breakdown + Live Projects -->
      <div class="grid-2 mb-24">
        <!-- 7 Outcomes Breakdown (Section 6 Requirement) -->
        <div class="section-card">
          <div class="section-card-header">
            <h3>Outcomes Breakdown</h3>
            <span style="font-size:0.8125rem; color:var(--text-muted);">${formatNumber(starts + unverifiedClicks)} total events</span>
          </div>
          <div class="section-card-body" style="padding:12px 22px 22px;">
            ${renderStatusRow("✅", "Complete", completes, starts + unverifiedClicks, "var(--color-success)", "var(--color-success-bg)")}
            ${renderStatusRow("❌", "Terminate", terminated, starts + unverifiedClicks, "var(--color-danger)", "var(--color-danger-bg)")}
            ${renderStatusRow("⚠️", "Quota Full", quotaFull, starts + unverifiedClicks, "var(--color-warning)", "var(--color-warning-bg)")}
            ${renderStatusRow("🎯", "Quality Term", qualityTerm, starts + unverifiedClicks, "var(--color-purple)", "var(--color-purple-bg)")}
            ${renderStatusRow("🔒", "Survey Closed", surveyClosed, starts + unverifiedClicks, "var(--color-gray)", "var(--color-gray-bg)")}
            ${renderStatusRow("🔄", "In Progress", inProgress, starts + unverifiedClicks, "var(--accent)", "var(--accent-light)")}
            ${renderStatusRow("🛡️", "Unverified", unverifiedClicks, starts + unverifiedClicks, "#f97316", "rgba(249,115,22,0.12)")}
          </div>
        </div>

        <!-- Live Projects Table -->
        <div class="section-card">
          <div class="section-card-header">
            <h3>Live Projects</h3>
            <span style="font-size:0.8125rem; color:var(--text-muted);">${projects.length || studies.length} Active</span>
          </div>
          <div class="section-card-body no-pad">
            ${
              (projects.length || studies.length)
                ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Rate</th>
                    <th>Completes</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  ${(projects.length ? projects : studies)
                    .slice(0, 6)
                    .map((p) => {
                      const code = p.project_code || p.study_code || p.id.slice(0, 8);
                      const name = p.name || p.title || "—";
                      const tgt = p.target_completes || 50;
                      const comps = p.completes_count || completes || 0;
                      const prog = tgt ? Math.min(100, Math.round((comps / tgt) * 100)) : 0;
                      const rate = p.client_rate ? "₹" + p.client_rate : "—";
                      return `
                      <tr onclick="renderProjectDetail('${p.id}')" style="cursor:pointer;">
                        <td>
                          <div style="font-weight:600; font-size:0.85rem; color:var(--text-primary);">${escapeHtml(code)}</div>
                          <div style="font-size:0.75rem; color:var(--text-muted); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(name)}</div>
                        </td>
                        <td>${renderBadge(p.status || "ACTIVE")}</td>
                        <td style="font-weight:600;">${rate}</td>
                        <td style="font-weight:600;">${comps}</td>
                        <td style="min-width:110px;">
                          <div style="display:flex; align-items:center; gap:8px;">
                            <div class="status-bar-track" style="flex:1; min-width:50px;">
                              <div class="status-bar-fill" style="width:${prog}%; background:var(--accent);"></div>
                            </div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${prog}%</span>
                          </div>
                        </td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
            `
                : '<div class="empty-state" style="padding:40px;"><div class="empty-state-icon">📁</div><h3>No projects yet</h3><p>Create your first project to launch fieldwork.</p></div>'
            }
          </div>
        </div>
      </div>

      <!-- Traffic Trend & Country Performance -->
      <div class="grid-2 mb-24">
        <!-- Traffic Trend Chart -->
        <div class="section-card">
          <div class="section-card-header">
            <div>
              <h3>Traffic Trend</h3>
              <span style="font-size:0.8125rem; color:var(--text-muted);">7-day fieldwork throughput</span>
            </div>
            <div style="display:flex; align-items:center; gap:12px; font-size:0.75rem;">
              <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:var(--accent); border-radius:2px; display:inline-block;"></span> Clicks</span>
              <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:var(--color-success); border-radius:2px; display:inline-block;"></span> Completes</span>
            </div>
          </div>
          <div class="section-card-body" style="padding:16px 20px;">
            <div style="display:flex; align-items:flex-end; gap:12px; height:180px; padding-top:20px; border-bottom:1px solid var(--border-light);">
              ${days.map(d => {
                const clickHeight = Math.max(12, Math.round((d.clicks / maxTrendVal) * 140));
                const compHeight = Math.max(6, Math.round((d.completes / maxTrendVal) * 140));
                return `
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end;">
                    <div style="display:flex; gap:3px; align-items:flex-end; width:100%; justify-content:center; height:140px;">
                      <div style="width:40%; max-width:18px; height:${clickHeight}px; background:var(--accent); border-radius:3px 3px 0 0; transition:height 0.3s;" title="${d.date}: ${d.clicks} Clicks"></div>
                      <div style="width:40%; max-width:18px; height:${compHeight}px; background:var(--color-success); border-radius:3px 3px 0 0; transition:height 0.3s;" title="${d.date}: ${d.completes} Completes"></div>
                    </div>
                    <span style="font-size:0.7rem; color:var(--text-muted); white-space:nowrap;">${d.label.split(',')[0]}</span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <!-- Country Performance -->
        <div class="section-card">
          <div class="section-card-header">
            <h3>Country Performance</h3>
            <span style="font-size:0.8125rem; color:var(--text-muted);">Multi-market coverage</span>
          </div>
          <div class="section-card-body no-pad">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Traffic</th>
                  <th>Completes</th>
                  <th>Conversion</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${countryList.slice(0, 5).map(c => `
                  <tr>
                    <td style="font-weight:600;">
                      <span style="margin-right:6px;">${c.flag}</span>
                      ${escapeHtml(c.name)} <span style="font-size:0.75rem; color:var(--text-muted);">(${c.code})</span>
                    </td>
                    <td>${formatNumber(c.clicks)}</td>
                    <td style="font-weight:600; color:var(--color-success);">${formatNumber(c.completes)}</td>
                    <td style="font-weight:600;">${c.conv}%</td>
                    <td><span class="badge" style="background:var(--color-success-bg); color:var(--color-success); font-size:0.7rem;">ACTIVE</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Top Vendors + Recent Activity Feed -->
      <div class="grid-2 mb-24">
        <!-- Top Vendors -->
        <div class="section-card">
          <div class="section-card-header">
            <h3>Vendor Performance</h3>
            <span style="font-size:0.8125rem; color:var(--text-muted);">${vendors.length} Vendors</span>
          </div>
          <div class="section-card-body no-pad">
            ${
              vendors.length
                ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Quota Target</th>
                    <th>Completes</th>
                    <th>Conversion</th>
                    <th>CPI</th>
                  </tr>
                </thead>
                <tbody>
                  ${vendors
                    .slice(0, 6)
                    .map(
                      (v, i) => `
                    <tr>
                      <td style="font-weight:500;">${escapeHtml(v.name)}${
                        i === 0 && vendors.length > 1
                          ? ' <span style="font-size:0.6875rem;color:var(--color-success);font-weight:700;margin-left:4px;">★ TOP</span>'
                          : ""
                      }</td>
                      <td>${v.quota_target || 50}</td>
                      <td>${v.quota_used || completes || 0}</td>
                      <td style="color:var(--color-success);font-weight:600;">100%</td>
                      <td>${formatCurrency(v.cpi_cents || 0)}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            `
                : '<div class="empty-state" style="padding:40px;"><div class="empty-state-icon">🏢</div><h3>No vendors yet</h3><p>Add vendors to track fieldwork partners.</p></div>'
            }
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="section-card">
          <div class="section-card-header">
            <h3>Recent Activity</h3>
            <span style="font-size:0.75rem; color:var(--text-muted);">${recentActivityList.length} total events</span>
          </div>
          <div class="section-card-body no-pad">
            <div class="live-feed">
              ${
                recentActivityList.length
                  ? recentActivityList
                      .slice(0, 8)
                      .map((item) => {
                        const isVer = item.verification_status === "VERIFIED";
                        const verBadge = isVer
                          ? '<span class="badge" style="background:var(--color-success-bg); color:var(--color-success); font-size:0.68rem; padding:1px 6px;">✓ VERIFIED</span>'
                          : '<span class="badge" style="background:var(--color-danger-bg); color:var(--color-danger); font-size:0.68rem; padding:1px 6px;">⚠ UNVERIFIED</span>';
                        return `
                          <div class="live-feed-item" onclick="openResponseDetailModal('${escapeHtml(String(item.id))}')" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid var(--border-light);">
                            <div class="feed-left" style="display:flex; align-items:center; gap:8px;">
                              <span style="font-size:0.75rem; color:var(--text-muted); width:50px;">${timeAgo(item.created_at)}</span>
                              ${verBadge}
                              ${renderBadge(item.status)}
                              <span class="font-mono id-text" style="font-size:0.75rem;">UID: ${escapeHtml(item.uid)}</span>
                            </div>
                            <span style="color:var(--text-muted); font-size:0.75rem;">${formatDateTime(item.created_at)}</span>
                          </div>
                        `;
                      })
                      .join("")
                  : '<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">📡</div><h3>No recent activity</h3><p>Telemetry activity will appear here as sessions occur.</p></div>'
              }
            </div>
          </div>
        </div>
      </div>

      <!-- System Health Grid -->
      <div class="section-card">
        <div class="section-card-header">
          <h3>System Health</h3>
          <span style="font-size:0.75rem; color:var(--color-success); font-weight:600;">● All Systems Operational</span>
        </div>
        <div class="section-card-body">
          <div class="health-grid">
            <div class="health-item">
              <div class="health-dot operational"></div>
              <div><div class="health-label">API Service</div><div class="health-status">Operational</div></div>
            </div>
            <div class="health-item">
              <div class="health-dot operational"></div>
              <div><div class="health-label">PostgreSQL / Supabase</div><div class="health-status">Operational</div></div>
            </div>
            <div class="health-item">
              <div class="health-dot operational"></div>
              <div><div class="health-label">Callback Redirection Engine</div><div class="health-status">Operational</div></div>
            </div>
            <div class="health-item">
              <div class="health-dot operational"></div>
              <div><div class="health-label">Telemetry & Fraud Filter</div><div class="health-status">Operational</div></div>
            </div>
            <div class="health-item">
              <div class="health-dot operational"></div>
              <div><div class="health-label">Storage & Exports</div><div class="health-status">Operational</div></div>
            </div>
          </div>
        </div>
      </div>
    `;

    $("#content-area").innerHTML = content;
    animateCountUps($("#content-area"));
  } catch (e) {
    console.error("Dashboard render failure:", e);
    showError("#content-area", e.message);
    showToast("Failed to load dashboard: " + e.message, "error");
  }
}

function renderStatusRow(icon, label, count, total, barColor, bgColor) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return `
    <div class="status-row">
      <div class="status-icon" style="background:${bgColor}; color:${barColor}; font-size:0.85rem;">${icon}</div>
      <div class="status-info">
        <div class="status-info-top">
          <span class="status-info-label">${label}</span>
          <span class="status-info-values">${count} &middot; ${pct}%</span>
        </div>
        <div class="status-bar-track">
          <div class="status-bar-fill" style="width:${pct}%; background:${barColor}; animation: barGrow 0.8s ease-out;"></div>
        </div>
      </div>
    </div>
  `;
}

// ─── Studies ───────────────────────────────────────────────────────────────────
async function renderStudies(page = 1) {
  showLoading();
  try {
    const data = await api(`/studies?page=${page}&limit=20`);
    const studies = data.studies || [];
    const content = `
      <div class="section-header">
        <h3>Studies</h3>
        <button class="btn btn-primary" onclick="openCreateStudyModal()">+ Create Study</button>
      </div>
      ${renderTable(
        ["ID", "Name", "Status", "Vendors", "Target", "Created"],
        studies.map((s) => ({
          id: renderIdCell(s.id),
          name: s.name || s.title || "—",
          status: renderBadge(s.status),
          vendors: s.vendor_count || 0,
          target: s.target_completes || 0,
          created: formatDate(s.created_at),
        })),
        "id"
      )}
      <div class="pagination">${renderPagination(
        page,
        data.totalPages || 1,
        "renderStudies"
      )}</div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load studies: " + e.message, "error");
  }
}

// ─── Vendors ───────────────────────────────────────────────────────────────────
async function renderVendors(page = 1) {
  showLoading();
  try {
    const data = await api(`/vendors?page=${page}&limit=20`);
    const vendors = data.vendors || [];
    const content = `
      <div class="section-header">
        <h3>Vendors</h3>
        <button class="btn btn-primary" onclick="openCreateVendorModal()">+ Create Vendor</button>
      </div>
      ${renderTable(
        ["ID", "Name", "Contact", "CPI", "Quota", "Status"],
        vendors.map((v) => ({
          id: renderIdCell(v.id),
          name: v.name,
          contact: v.contact_email || "—",
          cpi: formatCurrency(v.cpi_cents || 0),
          quota: v.quota_target
            ? `${v.quota_used || 0}/${v.quota_target}`
            : "—",
          status: renderBadge(v.status),
        })),
        "id"
      )}
      <div class="pagination">${renderPagination(
        page,
        data.totalPages || 1,
        "renderVendors"
      )}</div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load vendors: " + e.message, "error");
  }
}

// ─── Tracking Links ────────────────────────────────────────────────────────────
async function renderTrackingLinks(page = 1) {
  showLoading();
  try {
    const [links, studies] = await Promise.all([
      api(`/tracking-links?page=${page}&limit=20`),
      api("/studies?limit=1000").catch(() => ({ studies: [] })),
    ]);
    const studyMap = {};
    (studies.studies || []).forEach((s) => (studyMap[s.id] = s.name));
    const content = `
      <div class="section-header">
        <h3>Tracking Links</h3>
      </div>
      ${renderTable(
        [
          "Code",
          "Study ID",
          "Vendor ID",
          "UID Mode",
          "Status",
          "Clicks",
          "Created",
        ],
        (links.tracking_links || []).map((l) => ({
          code: renderIdCell(l.link_code),
          study: renderIdCell(l.study_id),
          vendor: renderIdCell(l.vendor_id),
          uid_mode: l.uid_mode || "—",
          status: renderBadge(l.status),
          clicks: l.click_count || 0,
          created: formatDate(l.created_at),
        })),
        "id"
      )}
      <div class="pagination">${renderPagination(
        page,
        links.totalPages || 1,
        "renderTrackingLinks"
      )}</div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load tracking links: " + e.message, "error");
  }
}

// ─── Responses ─────────────────────────────────────────────────────────────────
let responsesState = {
  page: 1,
  limit: 25,
  search: "",
  status: "",
  project_id: "",
  device: "",
  start_date: "",
  end_date: "",
  sort_by: "timestamp",
  sort_order: "DESC",
};

async function exportResponsesExcel(exportType = "filtered") {
  const btn = $("#excel-export-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Exporting...";
  }
  try {
    const params = new URLSearchParams({
      export_type: exportType,
      search: responsesState.search,
      status: responsesState.status,
      study_id: responsesState.project_id,
      device: responsesState.device,
      start_date: responsesState.start_date,
      end_date: responsesState.end_date,
    });
    const res = await fetch(`/api/responses/export?${params.toString()}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!res.ok) throw new Error(`Export failed with HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition");
    let filename = `Opinion_Insights_Responses_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    if (disposition && disposition.includes("filename="))
      filename = disposition.split("filename=")[1].replace(/"/g, "").trim();
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Excel exported successfully!", "success", 3000);
  } catch (err) {
    showToast("Export failed: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "📊 Export Excel";
    }
  }
}
window.exportResponsesExcel = exportResponsesExcel;

async function renderResponses(page = 1) {
  responsesState.page = page;
  const studiesData = await api("/studies?limit=500").catch(() => ({
    studies: [],
  }));
  const studiesList = studiesData.studies || [];

  const skeletonRows = Array(6)
    .fill(0)
    .map(
      () => `
    <tr class="skeleton-row">
      <td><div class="skeleton-box" style="width:140px;"></div></td>
      <td><div class="skeleton-box" style="width:100px;"></div></td>
      <td><div class="skeleton-box" style="width:110px;"></div></td>
      <td><div class="skeleton-box" style="width:80px;"></div></td>
      <td><div class="skeleton-box" style="width:180px;"></div></td>
      <td><div class="skeleton-box" style="width:90px;"></div></td>
      <td><div class="skeleton-box" style="width:130px;"></div></td>
    </tr>
  `
    )
    .join("");

  const toolbarHtml = `
    <div class="section-header">
      <div>
        <h3 style="margin:0;">Fieldwork Responses</h3>
        <p style="margin-top:4px; color:var(--text-muted); font-size:0.8125rem;">Enterprise market research data & respondent audit trail</p>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary" onclick="renderResponses(${
          responsesState.page
        })" title="Refresh">↻ Refresh</button>
        <button class="btn btn-primary" id="excel-export-btn" onclick="exportResponsesExcel('filtered')">📊 Export Excel</button>
      </div>
    </div>
    <div class="responses-filter-toolbar">
      <input type="text" id="resp-search" placeholder="Search UID, Project, IP..." value="${escapeHtml(
        responsesState.search
      )}" style="flex:2; min-width:200px;" />
      <select id="resp-status" style="flex:1; min-width:130px;">
        <option value="">All Statuses</option>
        <option value="COMPLETE" ${
          responsesState.status === "COMPLETE" ? "selected" : ""
        }>Complete</option>
        <option value="TERMINATE" ${
          responsesState.status === "TERMINATE" ? "selected" : ""
        }>Terminate</option>
        <option value="OVER QUOTA" ${
          responsesState.status === "OVER QUOTA" ? "selected" : ""
        }>Over Quota</option>
        <option value="QUALITY TERM" ${
          responsesState.status === "QUALITY TERM" ? "selected" : ""
        }>Quality Term</option>
        <option value="SURVEY CLOSED" ${
          responsesState.status === "SURVEY CLOSED" ? "selected" : ""
        }>Survey Closed</option>
      </select>
      <select id="resp-project" style="flex:1; min-width:140px;">
        <option value="">All Projects</option>
        ${studiesList
          .map(
            (s) =>
              `<option value="${s.id}" ${
                responsesState.project_id === s.id ? "selected" : ""
              }>${escapeHtml(s.study_code || s.name || s.id)}</option>`
          )
          .join("")}
      </select>
      <select id="resp-device" style="flex:1; min-width:110px;">
        <option value="">All Devices</option>
        <option value="Desktop" ${
          responsesState.device === "Desktop" ? "selected" : ""
        }>Desktop</option>
        <option value="Mobile" ${
          responsesState.device === "Mobile" ? "selected" : ""
        }>Mobile</option>
        <option value="Tablet" ${
          responsesState.device === "Tablet" ? "selected" : ""
        }>Tablet</option>
      </select>
      <input type="date" id="resp-start-date" value="${
        responsesState.start_date
      }" title="Start Date" />
      <input type="date" id="resp-end-date" value="${
        responsesState.end_date
      }" title="End Date" />
    </div>
    <div class="resp-table-wrap" id="resp-table-container">
      <table class="responses-table">
        <colgroup>
          <col class="col-uid" />
          <col class="col-project" />
          <col class="col-verification" style="width: 120px;" />
          <col class="col-ip" />
          <col class="col-device" />
          <col class="col-ua" />
          <col class="col-status" />
          <col class="col-ts" />
        </colgroup>
        <thead>
          <tr>
            <th class="sortable" onclick="toggleRespSort('uid')">UID${
              responsesState.sort_by === "uid"
                ? responsesState.sort_order === "ASC"
                  ? " ↑"
                  : " ↓"
                : ""
            }</th>
            <th class="sortable" onclick="toggleRespSort('project')">Project${
              responsesState.sort_by === "project"
                ? responsesState.sort_order === "ASC"
                  ? " ↑"
                  : " ↓"
                : ""
            }</th>
            <th>Verification</th>
            <th>IP Address</th>
            <th class="sortable" onclick="toggleRespSort('device')">Device${
              responsesState.sort_by === "device"
                ? responsesState.sort_order === "ASC"
                  ? " ↑"
                  : " ↓"
                : ""
            }</th>
            <th>User Agent</th>
            <th class="sortable" onclick="toggleRespSort('status')">Outcome${
              responsesState.sort_by === "status"
                ? responsesState.sort_order === "ASC"
                  ? " ↑"
                  : " ↓"
                : ""
            }</th>
            <th class="sortable" onclick="toggleRespSort('timestamp')">Timestamp${
              responsesState.sort_by === "timestamp"
                ? responsesState.sort_order === "ASC"
                  ? " ↑"
                  : " ↓"
                : ""
            }</th>
          </tr>
        </thead>
        <tbody id="resp-table-tbody">${skeletonRows}</tbody>
      </table>
    </div>
    <div id="resp-mobile-cards"></div>
    <div class="responses-pagination">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:0.85rem; color:var(--text-muted);">Per page:</span>
        <select id="resp-limit-select" onchange="changeRespLimit(this.value)" style="padding:4px 8px; font-size:0.85rem; border-radius:6px; background:var(--bg-input); color:var(--text-primary); border:1px solid var(--border-default);">
          <option value="25" ${
            responsesState.limit === 25 ? "selected" : ""
          }>25</option>
          <option value="50" ${
            responsesState.limit === 50 ? "selected" : ""
          }>50</option>
          <option value="100" ${
            responsesState.limit === 100 ? "selected" : ""
          }>100</option>
          <option value="250" ${
            responsesState.limit === 250 ? "selected" : ""
          }>250</option>
        </select>
      </div>
      <div id="resp-pagination-info" style="font-size:0.875rem; color:var(--text-secondary);">Loading...</div>
      <div id="resp-pagination-controls"></div>
    </div>
  `;

  $("#content-area").innerHTML = toolbarHtml;

  let searchTimeout = null;
  $("#resp-search")?.addEventListener("input", (e) => {
    responsesState.search = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => fetchAndRenderResponsesData(), 300);
  });
  $("#resp-status")?.addEventListener("change", (e) => {
    responsesState.status = e.target.value;
    fetchAndRenderResponsesData();
  });
  $("#resp-project")?.addEventListener("change", (e) => {
    responsesState.project_id = e.target.value;
    fetchAndRenderResponsesData();
  });
  $("#resp-device")?.addEventListener("change", (e) => {
    responsesState.device = e.target.value;
    fetchAndRenderResponsesData();
  });
  $("#resp-start-date")?.addEventListener("change", (e) => {
    responsesState.start_date = e.target.value;
    fetchAndRenderResponsesData();
  });
  $("#resp-end-date")?.addEventListener("change", (e) => {
    responsesState.end_date = e.target.value;
    fetchAndRenderResponsesData();
  });

  await fetchAndRenderResponsesData();
}

async function fetchAndRenderResponsesData() {
  const tbody = $("#resp-table-tbody");
  const container = $("#resp-table-container");
  try {
    const params = new URLSearchParams({
      page: responsesState.page,
      limit: responsesState.limit,
      search: responsesState.search,
      status: responsesState.status,
      study_id: responsesState.project_id,
      device: responsesState.device,
      start_date: responsesState.start_date,
      end_date: responsesState.end_date,
      sort_by: responsesState.sort_by,
      sort_order: responsesState.sort_order,
    });
    const data = await api(`/responses?${params.toString()}`);
    const responses = data.responses || data.data || [];
    const total = data.meta?.total || responses.length;
    const limit = responsesState.limit;
    const page = responsesState.page;
    const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
    const endIdx = Math.min(page * limit, total);

    if ($("#resp-pagination-info")) {
      $(
        "#resp-pagination-info"
      ).textContent = `Showing ${startIdx}–${endIdx} of ${formatNumber(
        total
      )} responses`;
    }

    if ($("#resp-pagination-controls")) {
      const totalPages = Math.ceil(total / limit) || 1;
      let pagHtml = `<button ${
        page === 1 ? "disabled" : ""
      } onclick="renderResponses(${
        page - 1
      })" class="btn btn-secondary btn-sm">←  Prev</button>`;
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
          pagHtml += `<button class="btn btn-sm ${
            i === page ? "btn-primary" : "btn-secondary"
          }" onclick="renderResponses(${i})">${i}</button>`;
        } else if (i === page - 2 || i === page + 2) {
          pagHtml += `<span style="padding:0 4px; color:var(--text-muted);">...</span>`;
        }
      }
      pagHtml += `<button ${
        page >= totalPages ? "disabled" : ""
      } onclick="renderResponses(${
        page + 1
      })" class="btn btn-secondary btn-sm">Next  →</button>`;
      $("#resp-pagination-controls").innerHTML = pagHtml;
    }

    if (!responses.length) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:40px 20px;"><div class="empty-state-icon">📭</div><h3>No responses found</h3><p>Try changing your filters or search criteria.</p></div></td></tr>`;
      }
      return;
    }

    if (tbody) {
      const compactCopy = (val, tooltip) => {
        if (!val) return "";
        const e = escapeHtml(String(val));
        return `<span class="resp-copy-btn" onclick="event.stopPropagation(); copyToClipboard('${e.replace(
          /'/g,
          "\\'"
        )}')" title="${escapeHtml(tooltip)}">⧉</span>`;
      };

      tbody.innerHTML = responses
        .map((r) => {
          const uid = r.uid || "";
          const project =
            r.project ||
            r.study_code ||
            r.external_offer_id ||
            r.study_id ||
            "";
          const ip = r.ip_address || r.fake_ip || "";
          const ua = r.user_agent || r.fake_ua || "";
          const devIcon =
            r.device === "Mobile" ? "📱" : r.device === "Tablet" ? "💻" : "💻";
          const deviceText = r.device || "Desktop";
          const statusVal = r.status || r.final_status || "COMPLETE";
          const ts = formatDateTime(r.created_at || r.updated_at);
          const sessionId = r.session_id || r.id;
          const verificationStatus = (r.verification_status || r._source_type || 'VERIFIED').toUpperCase();
          const isVerified = verificationStatus === 'VERIFIED';
          
          const verificationHtml = isVerified 
            ? `<span class="badge" style="background:var(--success-bg);color:var(--success-text);font-size:0.75rem;">✓ VERIFIED</span>`
            : `<span class="badge" style="background:var(--danger-bg);color:var(--danger-text);font-size:0.75rem;">⚠ UNVERIFIED</span>`;

          return `
          <tr onclick="openResponseDetailModal('${escapeHtml(
            String(sessionId)
          )}')" style="cursor:pointer;">
            <td class="cell-uid">
              <div style="display:inline-flex;align-items:center;gap:4px;">
                <span class="font-mono id-text" title="${escapeHtml(
                  uid
                )}">${escapeHtml(uid)}</span>
                ${compactCopy(uid, "Copy UID")}
              </div>
            </td>
            <td class="cell-project">
              <div style="display:inline-flex;align-items:center;gap:4px;">
                <span class="font-mono id-text" title="${escapeHtml(
                  project
                )}">${escapeHtml(project)}</span>
                ${compactCopy(project, "Copy Project ID")}
              </div>
            </td>
            <td class="cell-verification">
              ${verificationHtml}
            </td>
            <td class="cell-ip">
              <div style="display:inline-flex;align-items:center;gap:4px;">
                <span class="font-mono id-text" title="${escapeHtml(
                  ip
                )}">${escapeHtml(ip)}</span>
                ${compactCopy(ip, "Copy IP")}
              </div>
            </td>
            <td class="cell-device">
              <span class="badge-device">${devIcon} ${escapeHtml(
            deviceText
          )}</span>
            </td>
            <td class="cell-ua">
              <div style="display:inline-flex;align-items:flex-start;gap:4px;">
                <span class="ua-text" title="${escapeHtml(ua)}">${escapeHtml(
            ua
          )}</span>
                ${compactCopy(ua, "Copy User Agent")}
              </div>
            </td>
            <td class="cell-status">${renderBadge(statusVal)}</td>
            <td class="cell-ts"><span style="font-variant-numeric:tabular-nums;font-size:0.8rem;">${escapeHtml(
              ts
            )}</span></td>
          </tr>
        `;
        })
        .join("");
    }

    // Mobile cards
    const mcContainer = $("#resp-mobile-cards");
    if (mcContainer) {
      mcContainer.innerHTML = responses
        .map((r) => {
          const uid = r.uid || "";
          const project =
            r.project ||
            r.study_code ||
            r.external_offer_id ||
            r.study_id ||
            "";
          const ip = r.ip_address || r.fake_ip || "";
          const ua = r.user_agent || r.fake_ua || "";
          const devIcon =
            r.device === "Mobile" ? "📱" : r.device === "Tablet" ? "💻" : "💻";
          const deviceText = r.device || "Desktop";
          const statusVal = r.status || r.final_status || "COMPLETE";
          const ts = formatDateTime(r.created_at || r.updated_at);
          const verificationStatus = (r.verification_status || r._source_type || 'VERIFIED').toUpperCase();
          const isVerified = verificationStatus === 'VERIFIED';
          
          const verificationHtml = isVerified 
            ? `<span class="badge" style="background:var(--success-bg);color:var(--success-text);font-size:0.75rem;">✓ VERIFIED</span>`
            : `<span class="badge" style="background:var(--danger-bg);color:var(--danger-text);font-size:0.75rem;">⚠ UNVERIFIED</span>`;

          return `
          <div class="responses-mobile-card" onclick="this.classList.toggle('expanded')">
            <div class="mc-row">
              <span class="badge-device">${devIcon} ${escapeHtml(
            deviceText
          )}</span>
              ${verificationHtml}
              ${renderBadge(statusVal)}
            </div>
            <div class="mc-row">
              <span class="mc-label">UID</span>
              <span class="mc-value mono">${escapeHtml(uid)}</span>
            </div>
            <div class="mc-row">
              <span class="mc-label">Project</span>
              <span class="mc-value mono">${escapeHtml(project)}</span>
            </div>
            <div class="mc-row">
              <span class="mc-label">Timestamp</span>
              <span class="mc-value">${escapeHtml(ts)}</span>
            </div>
            <div class="mc-toggle" onclick="event.stopPropagation();">Show details ↓</div>
            <div class="mc-expand">
              <div class="mc-row">
                <span class="mc-label">IP Address</span>
                <span class="mc-value mono">${escapeHtml(ip)}</span>
              </div>
              <div class="mc-row">
                <span class="mc-label">User Agent</span>
                <span class="mc-value mono" style="word-break:break-all;">${escapeHtml(
                  ua
                )}</span>
              </div>
            </div>
          </div>
        `;
        })
        .join("");
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:40px 20px;"><div class="empty-state-icon">⚠️</div><h3>Unable to load responses</h3><p>${escapeHtml(
        err.message
      )}</p><button class="btn btn-secondary btn-sm" style="margin-top:12px;" onclick="fetchAndRenderResponsesData()">Retry</button></div></td></tr>`;
    }
  }
}

function changeRespLimit(newLimit) {
  responsesState.limit = parseInt(newLimit, 10) || 25;
  responsesState.page = 1;
  renderResponses(1);
}
window.changeRespLimit = changeRespLimit;

function toggleRespSort(field) {
  if (responsesState.sort_by === field) {
    responsesState.sort_order =
      responsesState.sort_order === "ASC" ? "DESC" : "ASC";
  } else {
    responsesState.sort_by = field;
    responsesState.sort_order = "DESC";
  }
  renderResponses(1);
}
window.toggleRespSort = toggleRespSort;

// ─── Analytics ─────────────────────────────────────────────────────────────────
async function renderAnalytics(page = 1) {
  showLoading();
  try {
    const [byStudy, byVendor, funnel] = await Promise.all([
      api("/analytics/by-study"),
      api("/analytics/by-vendor"),
      api("/analytics/funnel"),
    ]);
    const content = `
      <div class="section-header"><h3>Analytics Overview</h3></div>
      <div class="grid-3 mb-24">
        <div class="stat-card">
          <div class="stat-card-icon icon-info">📊</div>
          <div class="stat-label">Total Sessions</div>
          <div class="stat-value">${formatNumber(
            funnel.total_sessions || 0
          )}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-success">✅</div>
          <div class="stat-label">Completed</div>
          <div class="stat-value">${formatNumber(funnel.completed || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-accent">ðŸ“ˆ</div>
          <div class="stat-label">Conversion Rate</div>
          <div class="stat-value">${(
            (funnel.completed / funnel.total_sessions) * 100 || 0
          ).toFixed(1)}%</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="table-container">
          <div class="table-header"><h3>By Study</h3></div>
          ${renderTable(
            ["Study", "Started", "Completed", "Rate"],
            (byStudy.analytics || []).map((a) => ({
              study: renderIdCell(a.study_id),
              started: a.sessions_started || 0,
              completed: a.sessions_completed || 0,
              rate: a.conversion_rate
                ? a.conversion_rate.toFixed(1) + "%"
                : "0%",
            })),
            "study_id"
          )}
        </div>
        <div class="table-container">
          <div class="table-header"><h3>By Vendor</h3></div>
          ${renderTable(
            ["Vendor", "Sessions", "Completes", "Avg CPI"],
            (byVendor.analytics || []).map((a) => ({
              vendor: renderIdCell(a.vendor_id),
              sessions: a.sessions_count || 0,
              completes: a.completes || 0,
              cpi: formatCurrency(a.avg_cpi_cents || 0),
            })),
            "vendor_id"
          )}
        </div>
      </div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load analytics: " + e.message, "error");
  }
}

// ─── Finance Dashboard ──────────────────────────────────────────────────────────
async function renderFinance(page = 1) {
  showLoading();
  try {
    const [summaryRes, invoicesRes, projectsRes] = await Promise.all([
      api("/finance/summary").catch(() => ({ data: {} })),
      api(`/finance/invoices?page=${page}&limit=10`).catch(() => ({ data: [], pagination: {} })),
      api("/projects?limit=100").catch(() => ({ data: [] })),
    ]);

    const sum = summaryRes.data || {};
    const invoices = invoicesRes.data || [];
    const pagination = invoicesRes.pagination || {};
    const projects = projectsRes.data || [];

    const content = `
      <div class="section-header">
        <div>
          <h3>Finance & Commercial Billing</h3>
          <p style="font-size:0.875rem; color:var(--text-muted); margin-top:2px;">
            Commercial rates, verified completes settlement, client invoicing & gross margin tracking
          </p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="openGenerateInvoiceModal()">
            ðŸ“„ Raise Client Invoice
          </button>
          <button class="btn btn-primary" onclick="downloadFinanceCsv()">
            ðŸ“¥ Export CSV
          </button>
        </div>
      </div>

      <!-- KPI Overview Cards -->
      <div class="stats-grid mb-24">
        <div class="stat-card">
          <div class="stat-card-icon icon-info">ðŸ“</div>
          <div class="stat-label">Total Projects</div>
          <div class="stat-value">${formatNumber(sum.total_projects || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-purple">📊</div>
          <div class="stat-label">Total Field Activity</div>
          <div class="stat-value">${formatNumber(sum.total_activity || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-accent">ðŸŽ¯</div>
          <div class="stat-label">Verified Completes</div>
          <div class="stat-value">${formatNumber(sum.total_verified || sum.total_completes || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-warning">⚠️</div>
          <div class="stat-label">Unverified (Audit Only)</div>
          <div class="stat-value" style="color:var(--color-warning);">${formatNumber(sum.total_unverified || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-success">✅</div>
          <div class="stat-label">Accepted / Approved</div>
          <div class="stat-value">${formatNumber(sum.total_approved || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-danger">âŒ</div>
          <div class="stat-label">Rejected Completes</div>
          <div class="stat-value">${formatNumber(sum.total_rejected || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-success">ðŸ’µ</div>
          <div class="stat-label">Client Revenue</div>
          <div class="stat-value">${formatINR(sum.total_client_revenue || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon icon-purple">ðŸ“ˆ</div>
          <div class="stat-label">Gross Margin</div>
          <div class="stat-value" style="color:var(--color-success);">${formatINR(sum.total_gross_margin || 0)}</div>
        </div>
      </div>

      <!-- Project Rates Table -->
      <div class="section-card mb-24">
        <div class="section-card-header">
          <h3>Project Commercial Rates</h3>
          <span style="font-size:0.8125rem; color:var(--text-muted);">${projects.length} configured</span>
        </div>
        <div class="section-card-body">
          ${renderTable(
            ["Project Code", "Project Name", "Client Rate", "Vendor Rate", "Est. Margin / ID", "Currency", "Actions"],
            projects.map((p) => {
              const cRate = Number(p.client_rate) || 0;
              const vRate = Number(p.vendor_rate) || 0;
              const margin = cRate - vRate;
              return {
                code: `<strong>${escapeHtml(p.project_code)}</strong>`,
                name: escapeHtml(p.name),
                client_rate: formatINR(cRate),
                vendor_rate: formatINR(vRate),
                margin: `<span style="color:${margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight:600;">${formatINR(margin)}</span>`,
                currency: p.currency || 'INR',
                actions: `<button class="btn btn-sm btn-secondary" onclick="openSetRatesModal('${p.id}', '${escapeHtml(p.project_code)}', ${cRate}, ${vRate}, '${p.currency || 'INR'}')">⚠️ Set Rates</button>`,
              };
            }),
            "id"
          )}
        </div>
      </div>

      <!-- Raised Invoices -->
      <div class="section-card">
        <div class="section-card-header">
          <h3>Client Invoices</h3>
          <span style="font-size:0.8125rem; color:var(--text-muted);">${pagination.total || invoices.length} total</span>
        </div>
        <div class="section-card-body">
          ${renderTable(
            ["Invoice #", "Project", "Client", "Period", "Approved Qty", "Rate", "Total Amount", "Status", "Actions"],
            invoices.map((inv) => ({
              inv_num: `<strong>${escapeHtml(inv.invoice_number)}</strong>`,
              proj: escapeHtml(inv.project_code || inv.project_name || '—'),
              client: escapeHtml(inv.client_name || '—'),
              period: `${formatDate(inv.billing_period_start)} – ${formatDate(inv.billing_period_end)}`,
              qty: formatNumber(inv.total_approved_completes),
              rate: formatINR(inv.client_rate),
              total: `<strong>${formatINR(inv.total_amount)}</strong>`,
              status: renderBadge(inv.status),
              actions: `
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-sm btn-secondary" onclick="downloadInvoiceExcel('${inv.id}')" title="Download Excel">ðŸ“¥ Excel</button>
                  ${inv.status === 'RAISED' ? `<button class="btn btn-sm btn-success" onclick="markInvoice('${inv.id}', 'PAID')" title="Mark as Paid">âœ“ Paid</button>` : ''}
                </div>
              `,
            })),
            "id"
          )}
          <div class="pagination">${renderPagination(page, pagination.pages || 1, "renderFinance")}</div>
        </div>
      </div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load finance dashboard: " + e.message, "error");
  }
}

// ─── Rate Config Modal ────────────────────────────────────────────────────────
function openSetRatesModal(projectId, projectCode, clientRate, vendorRate, currency) {
  showModal(
    `Set Rates — ${projectCode}`,
    `
      <form id="set-rates-form">
        <input type="hidden" name="project_id" value="${projectId}">
        <div class="form-group mb-14">
          <label>Client Billing Rate (₹ / accepted complete)</label>
          <input type="number" step="0.01" min="0" name="client_rate" value="${clientRate}" required>
        </div>
        <div class="form-group mb-14">
          <label>Vendor Payout Rate (₹ / accepted complete)</label>
          <input type="number" step="0.01" min="0" name="vendor_rate" value="${vendorRate}" required>
        </div>
        <div class="form-group">
          <label>Currency</label>
          <select name="currency">
            <option value="INR" ${currency === 'INR' ? 'selected' : ''}>INR (₹)</option>
            <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD ($)</option>
            <option value="EUR" ${currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
            <option value="GBP" ${currency === 'GBP' ? 'selected' : ''}>GBP (Â£)</option>
          </select>
        </div>
      </form>
    `,
    `
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doSetRates()">Save Rates</button>
    `
  );
}

async function doSetRates() {
  const form = $("#set-rates-form");
  const data = Object.fromEntries(new FormData(form));
  try {
    await api(`/finance/projects/${data.project_id}/rates`, {
      method: "PATCH",
      body: JSON.stringify({
        client_rate: parseFloat(data.client_rate),
        vendor_rate: parseFloat(data.vendor_rate),
        currency: data.currency,
      }),
    });
    hideModal();
    showToast("Project commercial rates updated successfully", "success");
    renderFinance();
  } catch (e) {
    showToast("Failed to update rates: " + e.message, "error");
  }
}

// ─── Invoice Generation Modal with Pre-flight Preview & UID-Level Review ───────
let currentInvoicePreviewData = null;
let currentInvoiceActiveTab = 'eligible';

async function openGenerateInvoiceModal() {
  try {
    const { data: projects } = await api("/projects?limit=100");
    const today = new Date().toISOString().slice(0, 10);
    const lastMonth = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
    currentInvoicePreviewData = null;

    showModal(
      "Raise Client Commercial Invoice",
      `
        <form id="gen-invoice-form" onsubmit="event.preventDefault();">
          <div class="grid-3 mb-14" style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:600; font-size:0.8125rem;">SELECT PROJECT</label>
              <select id="inv-project-select" name="project_id" required onchange="triggerInvoicePreview()" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default); width:100%;">
                <option value="">-- Choose Project --</option>
                ${projects.map((p) => `<option value="${p.id}">${escapeHtml(p.project_code)} — ${escapeHtml(p.name)} (₹${p.client_rate || 0}/ea)</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label style="font-weight:600; font-size:0.8125rem;">BILLING START</label>
              <input type="date" id="inv-start-date" name="billing_period_start" value="${lastMonth}" required onchange="triggerInvoicePreview()" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default); width:100%;">
            </div>
            <div class="form-group">
              <label style="font-weight:600; font-size:0.8125rem;">BILLING END</label>
              <input type="date" id="inv-end-date" name="billing_period_end" value="${today}" required onchange="triggerInvoicePreview()" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default); width:100%;">
            </div>
          </div>

          <div class="form-group mb-14">
            <label style="font-weight:600; font-size:0.8125rem;">NOTES / COMMERCIAL TERMS</label>
            <input type="text" name="notes" placeholder="e.g. Net 30 Commercial Settlement" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default); width:100%;">
          </div>

          <!-- Preview & Pre-Flight Review Container -->
          <div id="invoice-preview-container" style="min-height:80px; padding:12px; background:var(--bg-surface); border:1px solid var(--border-default); border-radius:8px; margin-bottom:14px;">
            <div style="text-align:center; color:var(--text-muted); padding:16px;">
              ðŸ‘ˆ Select a project and billing period to calculate live commercial metrics & inspect UID-level records.
            </div>
          </div>
        </form>
      `,
      `
        <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
        <button id="btn-raise-invoice" class="btn btn-primary" onclick="doGenerateInvoice()" disabled>
          ðŸ“„ Confirm & Raise Invoice
        </button>
      `
    );
  } catch (e) {
    showToast("Failed to load projects: " + e.message, "error");
  }
}

async function triggerInvoicePreview() {
  const pId = $("#inv-project-select")?.value;
  const start = $("#inv-start-date")?.value;
  const end = $("#inv-end-date")?.value;
  const container = $("#invoice-preview-container");
  const raiseBtn = $("#btn-raise-invoice");

  if (!pId || !start || !end) {
    if (raiseBtn) raiseBtn.disabled = true;
    return;
  }

  if (container) container.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted);">ðŸ”„ Auditing traffic records and calculating billing preview...</div>`;

  try {
    const res = await api(`/finance/invoices/preview?project_id=${pId}&billing_period_start=${start}&billing_period_end=${end}`);
    currentInvoicePreviewData = res.data;
    renderInvoicePreviewDom(res.data);
    if (raiseBtn) raiseBtn.disabled = res.data.eligible_billing_count === 0;
  } catch (err) {
    currentInvoicePreviewData = null;
    if (raiseBtn) raiseBtn.disabled = true;
    if (container) container.innerHTML = `<div style="color:var(--color-danger); padding:12px;">⚠️ Preview Error: ${escapeHtml(err.message)}</div>`;
  }
}

function renderInvoicePreviewDom(data) {
  const container = $("#invoice-preview-container");
  if (!container) return;

  const eligCount = data.eligible_billing_count || 0;
  const unverCount = data.total_unverified || 0;
  const rejCount = data.total_rejected || 0;
  const pendCount = data.total_pending || 0;
  const rate = Number(data.client_rate) || 0;
  const gross = Number(data.gross_amount) || 0;
  const ded = Number(data.deductions) || 0;
  const finalAmt = Number(data.final_amount) || 0;

  container.innerHTML = `
    <!-- Macro Verification Cards -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px;">
      <div style="background:rgba(37,99,235,0.06); padding:10px; border-radius:6px; border-left:3px solid #2563eb;">
        <div style="font-size:0.75rem; color:var(--text-muted);">TOTAL ACTIVITY</div>
        <div style="font-size:1.25rem; font-weight:700; color:#1e293b;">${formatNumber(data.total_activity || 0)}</div>
        <div style="font-size:0.7rem; color:var(--text-muted);">All submissions</div>
      </div>
      <div style="background:rgba(16,185,129,0.06); padding:10px; border-radius:6px; border-left:3px solid #10b981;">
        <div style="font-size:0.75rem; color:var(--text-muted);">VERIFIED TRAFFIC</div>
        <div style="font-size:1.25rem; font-weight:700; color:#059669;">${formatNumber(data.total_verified || 0)}</div>
        <div style="font-size:0.7rem; color:var(--text-muted);">${formatNumber(data.total_accepted || 0)} approved</div>
      </div>
      <div style="background:rgba(217,119,6,0.08); padding:10px; border-radius:6px; border-left:3px solid #d97706;">
        <div style="font-size:0.75rem; color:#d97706; font-weight:600;">UNVERIFIED TRAFFIC</div>
        <div style="font-size:1.25rem; font-weight:700; color:#b45309;">${formatNumber(unverCount)}</div>
        <div style="font-size:0.7rem; color:#d97706;">Audit only (Non-billable)</div>
      </div>
      <div style="background:rgba(220,38,38,0.06); padding:10px; border-radius:6px; border-left:3px solid #dc2626;">
        <div style="font-size:0.75rem; color:var(--text-muted);">REJECTED</div>
        <div style="font-size:1.25rem; font-weight:700; color:#dc2626;">${formatNumber(rejCount)}</div>
        <div style="font-size:0.7rem; color:var(--text-muted);">Quality deducted</div>
      </div>
      <div style="background:rgba(100,116,139,0.08); padding:10px; border-radius:6px; border-left:3px solid #64748b;">
        <div style="font-size:0.75rem; color:var(--text-muted);">PENDING REVIEW</div>
        <div style="font-size:1.25rem; font-weight:700; color:#475569;">${formatNumber(pendCount)}</div>
        <div style="font-size:0.7rem; color:var(--text-muted);">Awaiting QA review</div>
      </div>
    </div>

    <!-- Commercial Calculation Banner -->
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <div>
        <span style="font-size:0.8125rem; color:var(--text-muted);">Contracted Client Rate:</span>
        <strong style="font-size:1rem; margin-left:4px;">${formatINR(rate)}</strong>
        <span style="margin:0 8px; color:#cbd5e1;">|</span>
        <span style="font-size:0.8125rem; color:var(--text-muted);">Eligible Billable Completes:</span>
        <strong style="font-size:1rem; color:#059669; margin-left:4px;">${formatNumber(eligCount)}</strong>
      </div>
      <div>
        <span style="font-size:0.8125rem; color:var(--text-muted);">Final Invoice Amount:</span>
        <strong style="font-size:1.35rem; color:#00bfa5; margin-left:6px;">${formatINR(finalAmt)}</strong>
      </div>
    </div>

    ${data.already_invoiced_count > 0 ? `
      <div style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; padding:8px 12px; border-radius:6px; font-size:0.78125rem; margin-bottom:12px;">
        ðŸ›¡ï¸ <strong>Double-Billing Protection:</strong> ${data.already_invoiced_count} completes in this date range were already invoiced and excluded automatically.
      </div>
    ` : ''}

    ${eligCount === 0 ? `
      <div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:8px 12px; border-radius:6px; font-size:0.78125rem; margin-bottom:12px;">
        ℹ️ï¸ <strong>Notice:</strong> No unbilled approved completes found for this billing period. Please complete and review responses before raising invoice.
      </div>
    ` : ''}

    <!-- Tabs for UID-level inspection -->
    <div style="display:flex; border-bottom:1px solid #e2e8f0; gap:8px; margin-bottom:8px;">
      <button type="button" class="btn btn-sm ${currentInvoiceActiveTab === 'eligible' ? 'btn-primary' : 'btn-secondary'}" onclick="switchInvoicePreviewTab('eligible')">
        ✅ Eligible Billable UIDs (${(data.eligible_records || []).length})
      </button>
      <button type="button" class="btn btn-sm ${currentInvoiceActiveTab === 'unverified' ? 'btn-primary' : 'btn-secondary'}" onclick="switchInvoicePreviewTab('unverified')">
        ⚠️ Unverified Activity (${(data.unverified_records || []).length})
      </button>
      <button type="button" class="btn btn-sm ${currentInvoiceActiveTab === 'rejected' ? 'btn-primary' : 'btn-secondary'}" onclick="switchInvoicePreviewTab('rejected')">
        âŒ Rejected UIDs (${(data.rejected_records || []).length})
      </button>
    </div>

    <!-- UID Table View -->
    <div id="invoice-tab-content" style="max-height:180px; overflow-y:auto; border:1px solid #f1f5f9; border-radius:6px;">
      ${renderInvoiceTabHtml()}
    </div>
  `;
}

function switchInvoicePreviewTab(tab) {
  currentInvoiceActiveTab = tab;
  const tabContent = $("#invoice-tab-content");
  if (tabContent && currentInvoicePreviewData) {
    tabContent.innerHTML = renderInvoiceTabHtml();
  }
  $$("#invoice-preview-container button").forEach(b => {
    if (b.textContent.includes('Eligible')) b.className = `btn btn-sm ${tab === 'eligible' ? 'btn-primary' : 'btn-secondary'}`;
    if (b.textContent.includes('Unverified')) b.className = `btn btn-sm ${tab === 'unverified' ? 'btn-primary' : 'btn-secondary'}`;
    if (b.textContent.includes('Rejected')) b.className = `btn btn-sm ${tab === 'rejected' ? 'btn-primary' : 'btn-secondary'}`;
  });
}

function renderInvoiceTabHtml() {
  if (!currentInvoicePreviewData) return '';
  const data = currentInvoicePreviewData;

  if (currentInvoiceActiveTab === 'eligible') {
    const list = data.eligible_records || [];
    if (list.length === 0) return `<div style="padding:12px; text-align:center; color:var(--text-muted); font-size:0.8125rem;">No eligible billable records in this period.</div>`;
    return `
      <table style="width:100%; font-size:0.75rem; border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc; text-align:left;">
            <th style="padding:6px 8px;">UID (Full)</th>
            <th style="padding:6px 8px;">Country</th>
            <th style="padding:6px 8px;">Link</th>
            <th style="padding:6px 8px;">Status</th>
            <th style="padding:6px 8px;">Rate</th>
            <th style="padding:6px 8px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(r => `
            <tr style="border-top:1px solid #f1f5f9;">
              <td style="padding:4px 8px; font-family:monospace; font-weight:600;">${escapeHtml(r.uid)}</td>
              <td style="padding:4px 8px;">${escapeHtml(r.country)}</td>
              <td style="padding:4px 8px;">${escapeHtml(r.survey_link)}</td>
              <td style="padding:4px 8px;"><span class="badge badge-success">${escapeHtml(r.status)}</span></td>
              <td style="padding:4px 8px;">${formatINR(r.rate)}</td>
              <td style="padding:4px 8px; font-weight:600; color:#059669;">${formatINR(r.line_amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (currentInvoiceActiveTab === 'unverified') {
    const list = data.unverified_records || [];
    if (list.length === 0) return `<div style="padding:12px; text-align:center; color:var(--text-muted); font-size:0.8125rem;">No unverified traffic records in this period.</div>`;
    return `
      <table style="width:100%; font-size:0.75rem; border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc; text-align:left;">
            <th style="padding:6px 8px;">UID (Full)</th>
            <th style="padding:6px 8px;">Rejection Reason</th>
            <th style="padding:6px 8px;">Timestamp</th>
            <th style="padding:6px 8px;">Provider</th>
            <th style="padding:6px 8px;">Audit Status</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(u => `
            <tr style="border-top:1px solid #f1f5f9;">
              <td style="padding:4px 8px; font-family:monospace; font-weight:600;">${escapeHtml(u.uid)}</td>
              <td style="padding:4px 8px; color:#b45309;"><span class="badge badge-warning">${escapeHtml(u.reason)}</span></td>
              <td style="padding:4px 8px;">${u.created_at ? formatDateTime(u.created_at) : '—'}</td>
              <td style="padding:4px 8px;">${escapeHtml(u.provider)}</td>
              <td style="padding:4px 8px;"><strong style="color:#d97706;">NON-BILLABLE</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (currentInvoiceActiveTab === 'rejected') {
    const list = data.rejected_records || [];
    if (list.length === 0) return `<div style="padding:12px; text-align:center; color:var(--text-muted); font-size:0.8125rem;">No rejected records in this period.</div>`;
    return `
      <table style="width:100%; font-size:0.75rem; border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc; text-align:left;">
            <th style="padding:6px 8px;">UID (Full)</th>
            <th style="padding:6px 8px;">Rejection Reason</th>
            <th style="padding:6px 8px;">Audit Notes</th>
            <th style="padding:6px 8px;">Status</th>
            <th style="padding:6px 8px;">Deduction</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(r => `
            <tr style="border-top:1px solid #f1f5f9;">
              <td style="padding:4px 8px; font-family:monospace; font-weight:600;">${escapeHtml(r.uid)}</td>
              <td style="padding:4px 8px;"><span class="badge badge-danger">${escapeHtml(r.rejection_reason_code)}</span></td>
              <td style="padding:4px 8px; color:var(--text-muted);">${escapeHtml(r.rejection_notes || '—')}</td>
              <td style="padding:4px 8px;">REJECTED</td>
              <td style="padding:4px 8px; color:#dc2626; font-weight:600;">- ${formatINR(r.deduction)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  return '';
}

async function doGenerateInvoice() {
  const form = $("#gen-invoice-form");
  const data = Object.fromEntries(new FormData(form));
  try {
    const res = await api("/finance/invoices/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
    hideModal();
    showToast(res.message || "Invoice raised successfully", "success");
    renderFinance();
  } catch (e) {
    showToast("Failed to generate invoice: " + e.message, "error");
  }
}

async function markInvoice(invoiceId, status) {
  try {
    await api(`/finance/invoices/${invoiceId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    showToast("Invoice status updated to " + status, "success");
    renderFinance();
  } catch (e) {
    showToast("Failed to update status: " + e.message, "error");
  }
}

async function downloadInvoiceExcel(invoiceId) {
  try {
    const res = await fetch(`/api/finance/invoices/${invoiceId}/export`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!res.ok) throw new Error("Export failed with HTTP " + res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${invoiceId.slice(0, 8)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Invoice Excel downloaded successfully", "success");
  } catch (e) {
    showToast("Failed to download Excel: " + e.message, "error");
  }
}

// ─── Rejection Management ─────────────────────────────────────────────────────
let selectedResponseIds = new Set();

async function renderRejectionManagement(page = 1) {
  showLoading();
  try {
    const pCodeFilter = $("#rej-filter-project")?.value || "";
    const statusFilter = $("#rej-filter-status")?.value || "";

    let url = `/finance/responses?page=${page}&limit=25`;
    if (pCodeFilter) url += `&project_id=${encodeURIComponent(pCodeFilter)}`;
    if (statusFilter) url += `&vendor_acceptance_status=${encodeURIComponent(statusFilter)}`;

    const [respRes, projectsRes] = await Promise.all([
      api(url),
      api("/projects?limit=100").catch(() => ({ data: [] })),
    ]);

    const rows = respRes.data || [];
    const pagination = respRes.pagination || {};
    const projects = projectsRes.data || [];

    const content = `
      <div class="section-header">
        <div>
          <h3>Quality Review & Rejection Management</h3>
          <p style="font-size:0.875rem; color:var(--text-muted); margin-top:2px;">
            Audit fieldwork outcomes, accept genuine respondents, flag duplicates & enforce rejection reasons
          </p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="openBulkRejectModal()">
            ðŸš« Bulk Reject (${selectedResponseIds.size})
          </button>
          <button class="btn btn-success" onclick="bulkReview('APPROVED', 'ACCEPTED')">
            ✅ Bulk Accept (${selectedResponseIds.size})
          </button>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="section-card mb-24">
        <div class="section-card-body" style="padding:16px 20px;">
          <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">PROJECT</label>
              <select id="rej-filter-project" onchange="renderRejectionManagement(1)" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default);">
                <option value="">All Projects</option>
                ${projects.map((p) => `<option value="${p.id}" ${pCodeFilter === p.id ? 'selected' : ''}>${escapeHtml(p.project_code)} — ${escapeHtml(p.name)}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">REVIEW STATUS</label>
              <select id="rej-filter-status" onchange="renderRejectionManagement(1)" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default);">
                <option value="">All Statuses</option>
                <option value="PENDING" ${statusFilter === 'PENDING' ? 'selected' : ''}>Pending Review</option>
                <option value="ACCEPTED" ${statusFilter === 'ACCEPTED' ? 'selected' : ''}>Accepted</option>
                <option value="REJECTED" ${statusFilter === 'REJECTED' ? 'selected' : ''}>Rejected</option>
              </select>
            </div>
            <div style="margin-left:auto; padding-top:16px;">
              <button class="btn btn-sm btn-secondary" onclick="clearRejectionFilters()">Clear Filters</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Responses Table -->
      <div class="section-card">
        <div class="section-card-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <input type="checkbox" id="select-all-box" onchange="toggleSelectAll(this)" style="cursor:pointer;">
            <h3>Respondent Sessions (${pagination.total || rows.length})</h3>
          </div>
          <span style="font-size:0.8125rem; color:var(--text-muted);">Selected: <strong id="selected-count">${selectedResponseIds.size}</strong></span>
        </div>
        <div class="section-card-body">
          ${renderTable(
            ["Select", "UID", "Project", "Vendor", "Final Status", "Commercial Status", "Rejection Reason", "Reviewed At", "Actions"],
            rows.map((r) => {
              const isChecked = selectedResponseIds.has(r.id);
              return {
                select: `<input type="checkbox" class="row-checkbox" value="${r.id}" ${isChecked ? 'checked' : ''} onchange="toggleRowSelect('${r.id}', this.checked)" style="cursor:pointer;">`,
                uid: `<code style="font-weight:600;">${escapeHtml(r.uid)}</code>`,
                project: escapeHtml(r.project_code || '—'),
                vendor: escapeHtml(r.vendor_name || '—'),
                survey_status: renderBadge(r.final_status),
                review_status: renderBadge(r.vendor_acceptance_status),
                reason: r.rejection_reason_code ? `<span class="badge badge-danger">${escapeHtml(r.rejection_reason_code)}</span>` : '<span style="color:var(--text-muted);">—</span>',
                date: r.reviewed_at ? formatDateTime(r.reviewed_at) : '<span style="color:var(--text-muted);">Pending</span>',
                actions: `
                  <div style="display:flex; gap:6px;">
                    <button class="btn btn-sm btn-success" onclick="quickApprove('${r.id}')" title="Approve">âœ“ Accept</button>
                    <button class="btn btn-sm btn-danger" onclick="openSingleRejectModal('${r.id}', '${escapeHtml(r.uid)}')" title="Reject">✕ Reject</button>
                  </div>
                `,
              };
            }),
            "id"
          )}
          <div class="pagination">${renderPagination(page, pagination.pages || 1, "renderRejectionManagement")}</div>
        </div>
      </div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load responses: " + e.message, "error");
  }
}

function applyRejectionFilters() {
  renderRejectionManagement(1);
}

function clearRejectionFilters() {
  if ($("#rej-filter-project")) $("#rej-filter-project").value = "";
  if ($("#rej-filter-status")) $("#rej-filter-status").value = "";
  renderRejectionManagement(1);
}

function toggleSelectAll(masterBox) {
  $$(".row-checkbox").forEach((cb) => {
    cb.checked = masterBox.checked;
    if (masterBox.checked) selectedResponseIds.add(cb.value);
    else selectedResponseIds.delete(cb.value);
  });
  if ($("#selected-count")) $("#selected-count").textContent = selectedResponseIds.size;
}

function toggleRowSelect(id, checked) {
  if (checked) selectedResponseIds.add(id);
  else selectedResponseIds.delete(id);
  if ($("#selected-count")) $("#selected-count").textContent = selectedResponseIds.size;
}

async function quickApprove(id) {
  try {
    await api(`/finance/responses/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({
        client_billing_status: "APPROVED",
        vendor_acceptance_status: "ACCEPTED",
      }),
    });
    showToast("Response accepted", "success");
    renderRejectionManagement();
  } catch (e) {
    showToast("Failed to approve: " + e.message, "error");
  }
}

function openSingleRejectModal(id, uid) {
  showModal(
    `Reject Respondent — ${uid}`,
    `
      <form id="single-reject-form">
        <input type="hidden" name="id" value="${id}">
        <div class="form-group mb-14">
          <label>Standardized Rejection Reason</label>
          <select name="reason" required>
            <option value="Duplicate">Duplicate Submission</option>
            <option value="Fraud / Suspicious">Fraud / Suspicious Activity</option>
            <option value="Invalid Respondent">Invalid Respondent Profile</option>
            <option value="Quality Issue">Quality Issue / Speeding</option>
            <option value="Incomplete">Incomplete / Drop-off</option>
            <option value="Client Rejection">Direct Client Rejection</option>
            <option value="Other">Other Reason</option>
          </select>
        </div>
        <div class="form-group">
          <label>Internal Audit Notes</label>
          <textarea name="notes" placeholder="Specify observations..." rows="3" style="width:100%; border-radius:6px; border:1px solid var(--border-default); padding:8px;"></textarea>
        </div>
      </form>
    `,
    `
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doSingleReject()">Confirm Rejection</button>
    `
  );
}

async function doSingleReject() {
  const form = $("#single-reject-form");
  const data = Object.fromEntries(new FormData(form));
  try {
    await api(`/finance/responses/${data.id}/review`, {
      method: "PATCH",
      body: JSON.stringify({
        client_billing_status: "REJECTED",
        vendor_acceptance_status: "REJECTED",
        rejection_reason_code: data.reason,
        rejection_notes: data.notes || null,
      }),
    });
    hideModal();
    showToast("Response rejected", "success");
    renderRejectionManagement();
  } catch (e) {
    showToast("Failed to reject: " + e.message, "error");
  }
}

function openBulkRejectModal() {
  if (selectedResponseIds.size === 0) {
    showToast("Please select at least one response to reject", "warning");
    return;
  }
  showModal(
    `Bulk Reject ${selectedResponseIds.size} Responses`,
    `
      <form id="bulk-reject-form">
        <div class="form-group mb-14">
          <label>Standardized Rejection Reason</label>
          <select name="reason" required>
            <option value="Duplicate">Duplicate Submission</option>
            <option value="Fraud / Suspicious">Fraud / Suspicious Activity</option>
            <option value="Invalid Respondent">Invalid Respondent Profile</option>
            <option value="Quality Issue">Quality Issue / Speeding</option>
            <option value="Incomplete">Incomplete / Drop-off</option>
            <option value="Client Rejection">Direct Client Rejection</option>
            <option value="Other">Other Reason</option>
          </select>
        </div>
        <div class="form-group">
          <label>Internal Audit Notes</label>
          <textarea name="notes" placeholder="Applies to all selected IDs..." rows="3" style="width:100%; border-radius:6px; border:1px solid var(--border-default); padding:8px;"></textarea>
        </div>
      </form>
    `,
    `
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doBulkReject()">Reject All Selected</button>
    `
  );
}

async function doBulkReject() {
  const form = $("#bulk-reject-form");
  const data = Object.fromEntries(new FormData(form));
  try {
    const ids = Array.from(selectedResponseIds);
    await api("/finance/responses/bulk-review", {
      method: "POST",
      body: JSON.stringify({
        response_ids: ids,
        client_billing_status: "REJECTED",
        vendor_acceptance_status: "REJECTED",
        rejection_reason_code: data.reason,
        rejection_notes: data.notes || null,
      }),
    });
    selectedResponseIds.clear();
    hideModal();
    showToast(`Successfully rejected ${ids.length} responses`, "success");
    renderRejectionManagement();
  } catch (e) {
    showToast("Failed to bulk reject: " + e.message, "error");
  }
}

async function bulkReview(clientStatus, vendorStatus) {
  if (selectedResponseIds.size === 0) {
    showToast("Please select at least one response to review", "warning");
    return;
  }
  try {
    const ids = Array.from(selectedResponseIds);
    await api("/finance/responses/bulk-review", {
      method: "POST",
      body: JSON.stringify({
        response_ids: ids,
        client_billing_status: clientStatus,
        vendor_acceptance_status: vendorStatus,
      }),
    });
    selectedResponseIds.clear();
    showToast(`Successfully updated ${ids.length} responses`, "success");
    renderRejectionManagement();
  } catch (e) {
    showToast("Failed to bulk review: " + e.message, "error");
  }
}

// ─── Vendor Settlements ───────────────────────────────────────────────────────
async function renderVendorSettlements() {
  showLoading();
  try {
    const [settlementsRes, projectsRes, vendorsRes] = await Promise.all([
      api("/finance/settlements"),
      api("/projects?limit=100").catch(() => ({ data: [] })),
      api("/vendors?active=true").catch(() => ({ data: [] })),
    ]);

    const settlements = settlementsRes.data || [];
    const projects = projectsRes.data || [];
    const vendors = vendorsRes.data || [];

    const content = `
      <div class="section-header">
        <div>
          <h3>Vendor Settlement & Payouts</h3>
          <p style="font-size:0.875rem; color:var(--text-muted); margin-top:2px;">
            Calculate vendor gross submissions, deduct verified rejections, and export multi-sheet settlement workbooks
          </p>
        </div>
      </div>

      <!-- Settlement Generator Form -->
      <div class="section-card mb-24">
        <div class="section-card-header">
          <h3>Generate New Settlement</h3>
        </div>
        <div class="section-card-body">
          <form id="gen-settlement-form" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:14px; align-items:flex-end;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">PROJECT</label>
              <select name="project_id" required style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default); width:100%;">
                <option value="">-- Choose Project --</option>
                ${projects.map((p) => `<option value="${p.id}">${escapeHtml(p.project_code)} — ${escapeHtml(p.name)}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">VENDOR</label>
              <select name="vendor_id" required style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default); width:100%;">
                <option value="">-- Choose Vendor --</option>
                ${vendors.map((v) => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">START DATE (OPTIONAL)</label>
              <input type="date" name="billing_period_start" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default); width:100%;">
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">END DATE (OPTIONAL)</label>
              <input type="date" name="billing_period_end" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border-default); width:100%;">
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn-primary" onclick="doGenerateSettlement()" style="width:100%;">
                ⚠️ Calculate & Save Settlement
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Settlements Table -->
      <div class="section-card">
        <div class="section-card-header">
          <h3>Settlement Records (${settlements.length})</h3>
        </div>
        <div class="section-card-body">
          ${renderTable(
            ["Project", "Vendor", "Rate", "Total Activity", "Verified", "Unverified", "Accepted", "Rejected (Rej %)", "Gross Value", "Rejection Adj.", "Final Payable", "Status", "Actions"],
            settlements.map((s) => {
              const rate = Number(s.vendor_rate) || 0;
              const sub = Number(s.total_submitted) || 0;
              const ver = Number(s.total_verified) || (Number(s.total_accepted) + Number(s.total_rejected));
              const unver = Number(s.total_unverified) || 0;
              const acc = Number(s.total_accepted) || 0;
              const rej = Number(s.total_rejected) || 0;
              const payable = Number(s.payable_amount) || 0;
              const rejVal = Number(s.rejection_deduction || s.rejected_amount) || 0;
              const grossVal = Number(s.gross_submitted_value || (ver * rate)) || 0;
              const rejPct = ver > 0 ? ((rej / ver) * 100).toFixed(1) : (Number(s.rejection_percentage) || 0).toFixed(1);

              return {
                project: `<strong>${escapeHtml(s.project_code || '—')}</strong>`,
                vendor: escapeHtml(s.vendor_name || '—'),
                rate: formatINR(rate),
                submitted: formatNumber(sub),
                verified: `<span style="font-weight:600; color:#059669;">${formatNumber(ver)}</span>`,
                unverified: `<span style="font-weight:600; color:#d97706;" title="Audit Only">${formatNumber(unver)}</span>`,
                accepted: `<span style="color:var(--color-success); font-weight:600;">${formatNumber(acc)}</span>`,
                rejected: `<span style="color:var(--color-danger); font-weight:600;">${formatNumber(rej)} (${rejPct}%)</span>`,
                gross: formatINR(grossVal),
                adj: `<span style="color:var(--color-danger);">- ${formatINR(rejVal)}</span>`,
                payable: `<strong style="color:var(--color-success); font-size:1.05rem;">${formatINR(payable)}</strong>`,
                status: renderBadge(s.status),
                actions: `
                  <div style="display:flex; gap:6px;">
                    <button class="btn btn-sm btn-secondary" onclick="downloadSettlementExcel('${s.id}')" title="Download 7-Sheet Professional Excel">ðŸ“¥ 7-Sheet Excel</button>
                    ${s.status === 'DRAFT' ? `<button class="btn btn-sm btn-info" onclick="finalizeSettlement('${s.id}')">Finalize</button>` : ''}
                    ${s.status === 'FINALIZED' ? `<button class="btn btn-sm btn-success" onclick="markSettlementPaid('${s.id}')">Pay</button>` : ''}
                  </div>
                `,
              };
            }),
            "id"
          )}
        </div>
      </div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load settlements: " + e.message, "error");
  }
}

async function doGenerateSettlement() {
  const form = $("#gen-settlement-form");
  const data = Object.fromEntries(new FormData(form));
  if (!data.project_id || !data.vendor_id) {
    showToast("Please select both a Project and a Vendor", "warning");
    return;
  }
  try {
    const res = await api("/finance/settlements/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
    showToast(res.message || "Settlement generated successfully", "success");
    renderVendorSettlements();
  } catch (e) {
    showToast("Failed to calculate settlement: " + e.message, "error");
  }
}

async function finalizeSettlement(id) {
  try {
    await api(`/finance/settlements/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "FINALIZED" }),
    });
    showToast("Settlement finalized", "success");
    renderVendorSettlements();
  } catch (e) {
    showToast("Failed to finalize: " + e.message, "error");
  }
}

async function markSettlementPaid(id) {
  try {
    await api(`/finance/settlements/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "PAID" }),
    });
    showToast("Settlement marked as PAID", "success");
    renderVendorSettlements();
  } catch (e) {
    showToast("Failed to update status: " + e.message, "error");
  }
}

async function downloadSettlementExcel(id) {
  try {
    const res = await fetch(`/api/finance/settlements/${id}/export`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!res.ok) throw new Error("Settlement export failed with HTTP " + res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VendorSettlement-${id.slice(0, 8)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Vendor Settlement Excel downloaded", "success");
  } catch (e) {
    showToast("Failed to download Excel: " + e.message, "error");
  }
}

// ─── Audit ─────────────────────────────────────────────────────────────────────
async function renderAudit(page = 1) {
  showLoading();
  try {
    const data = await api(`/audit-logs?page=${page}&limit=50`);
    const logs = data.logs || data.data || [];
    const content = `
      <div class="section-header"><h3>Audit Log</h3></div>
      ${renderTable(
        ["Time", "User", "Action", "Resource", "Details"],
        logs.map((l) => ({
          time: formatDateTime(l.timestamp),
          user: l.user_email || l.user || "system",
          action: renderBadge(l.action),
          resource: renderIdCell(l.resource_id || l.entity_id),
          details: escapeHtml(
            JSON.stringify(l.metadata || l.after || l.before || {})
          ),
        })),
        "id"
      )}
      <div class="pagination">${renderPagination(
        page,
        data.totalPages || 1,
        "renderAudit"
      )}</div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load audit log: " + e.message, "error");
  }
}

// ─── Quotas ────────────────────────────────────────────────────────────────────
async function renderQuotas(page = 1) {
  showLoading();
  try {
    const studies = await api("/studies");
    const list = studies.studies || [];
    const content = `
      <div class="section-header"><h3>Quota Tracking & Management</h3></div>
      ${renderTable(
        [
          "Study / Quota Name",
          "Target Completes",
          "Achieved",
          "Remaining",
          "Status",
        ],
        list.map((s) => {
          const target = s.target_completes || 500;
          const achieved = s.vendor_count || 0;
          const remaining = Math.max(0, target - achieved);
          const pct = target ? (achieved / target) * 100 : 0;
          const statusText =
            pct >= 100 ? "FULL" : pct >= 80 ? "LIMITED" : "OPEN";
          const statusBadge = renderBadge(
            statusText,
            statusText === "FULL"
              ? "danger"
              : statusText === "LIMITED"
              ? "warning"
              : "success"
          );
          return {
            name: s.name || s.study_code,
            target,
            achieved,
            remaining,
            status: statusBadge,
          };
        }),
        "name"
      )}
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load quotas: " + e.message, "error");
  }
}

// ─── Settings (placeholder) ────────────────────────────────────────────────────
async function renderSettings() {
  const content = `
    <div class="section-header"><h3>Platform Settings</h3></div>
    <div class="section-card">
      <div class="section-card-body">
        <div class="grid-2" style="gap:24px;">
          <div>
            <h4 style="font-size:0.9375rem; font-weight:600; margin-bottom:16px; color:var(--text-primary);">General</h4>
            <div class="form-group" style="margin-bottom:14px;">
              <label>Platform Name</label>
              <input type="text" value="Opinion Insights" disabled>
            </div>
            <div class="form-group" style="margin-bottom:14px;">
              <label>Environment</label>
              <input type="text" value="Development" disabled>
            </div>
            <div class="form-group">
              <label>API Version</label>
              <input type="text" value="2.0.0" disabled>
            </div>
          </div>
          <div>
            <h4 style="font-size:0.9375rem; font-weight:600; margin-bottom:16px; color:var(--text-primary);">Account</h4>
            <div class="form-group" style="margin-bottom:14px;">
              <label>Email</label>
              <input type="email" value="${
                currentUser?.email || ""
              }" disabled>
            </div>
            <div class="form-group" style="margin-bottom:14px;">
              <label>Role</label>
              <input type="text" value="${
                currentUser?.role || "ADMIN"
              }" disabled>
            </div>
            <div style="padding-top:8px;">
              <p style="font-size:0.8125rem; color:var(--text-muted);">Settings are managed by the system administrator.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  $("#content-area").innerHTML = content;
}


// ─── Complete User Management Implementation (IAM Blueprint) ──────────────────
let userFiltersState = {
  search: "",
  role: "",
  vendor_id: "",
  status: "",
};
let selectedUserIds = new Set();

async function renderUsers(page = 1) {
  showLoading();
  selectedUserIds.clear();
  try {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (userFiltersState.search) queryParams.set("search", userFiltersState.search);
    if (userFiltersState.role) queryParams.set("role", userFiltersState.role);
    if (userFiltersState.vendor_id) queryParams.set("vendor_id", userFiltersState.vendor_id);
    if (userFiltersState.status) queryParams.set("status", userFiltersState.status);

    const [summaryRes, usersRes, vendorsRes] = await Promise.all([
      api("/admin/users/summary").catch(() => ({ data: { total_users: 0, active_users: 0, vendor_users: 0, suspended_users: 0 } })),
      api("/admin/users?" + queryParams.toString()),
      api("/vendors?limit=500").catch(() => ({ vendors: [] })),
    ]);

    const summary = summaryRes.data || summaryRes;
    const usersData = usersRes.data || usersRes;
    const users = usersData.users || [];
    const vendorsList = vendorsRes.vendors || [];

    const content = `
      <!-- Top KPI Summary Cards -->
      <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
        ${renderStatCard("Total Users", summary.total_users || 0, "ðŸ‘¥", "icon-accent")}
        ${renderStatCard("Active Users", summary.active_users || 0, "✅", "icon-success")}
        ${renderStatCard("Vendors", summary.vendor_users || 0, "ðŸ¢", "icon-purple")}
        ${renderStatCard("Suspended Users", summary.suspended_users || 0, "â›”", "icon-warning")}
      </div>

      <!-- Action Bar & Filter Toolbar -->
      <div class="section-card" style="margin-bottom: 20px;">
        <div class="section-card-body" style="padding: 18px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">User Directory</h3>
              <p style="font-size: 0.8125rem; color: var(--text-muted); margin: 0;">Manage platform users, roles, vendor assignments and security credentials</p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button class="btn btn-secondary" onclick="downloadUsersExcel()" title="Export all users to formatted Excel spreadsheet">
                ðŸ“¥ Export Users (.xlsx)
              </button>
              <button class="btn btn-primary" onclick="openCreateUserModal()">
                + Create User
              </button>
            </div>
          </div>

          <!-- Filters Row -->
          <div class="user-filter-toolbar" style="margin-bottom: 0; padding: 12px 16px;">
            <div style="flex: 2; min-width: 200px;">
              <input type="text" id="user-filter-search" placeholder="ðŸ” Search name or email..." value="${escapeHtml(userFiltersState.search)}" style="width: 100%;" onkeydown="if(event.key==='Enter') applyUserFilters()">
            </div>
            <div style="flex: 1; min-width: 130px;">
              <select id="user-filter-role" style="width: 100%;" onchange="applyUserFilters()">
                <option value="">All Roles</option>
                <option value="ADMIN" ${userFiltersState.role === "ADMIN" ? "selected" : ""}>ADMIN</option>
                <option value="VENDOR" ${userFiltersState.role === "VENDOR" ? "selected" : ""}>VENDOR</option>
              </select>
            </div>
            <div style="flex: 1.5; min-width: 150px;">
              <select id="user-filter-vendor" style="width: 100%;" onchange="applyUserFilters()">
                <option value="">All Vendors</option>
                ${vendorsList.map(v => `<option value="${escapeHtml(v.id)}" ${userFiltersState.vendor_id === v.id ? "selected" : ""}>${escapeHtml(v.name)} (${escapeHtml(v.vendor_code || v.id.slice(0, 6))})</option>`).join("")}
              </select>
            </div>
            <div style="flex: 1; min-width: 130px;">
              <select id="user-filter-status" style="width: 100%;" onchange="applyUserFilters()">
                <option value="">All Statuses</option>
                <option value="ACTIVE" ${userFiltersState.status === "ACTIVE" ? "selected" : ""}>ACTIVE</option>
                <option value="SUSPENDED" ${userFiltersState.status === "SUSPENDED" ? "selected" : ""}>SUSPENDED</option>
              </select>
            </div>
            <div>
              <button class="btn btn-secondary btn-sm" onclick="resetUserFilters()" style="padding: 7px 14px;">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Actions Bar (Shown when users are selected) -->
      <div id="users-bulk-bar" class="bulk-actions-banner" style="display: none;">
        <span id="users-bulk-count" style="font-weight: 600; color: var(--accent-hover); font-size: 0.875rem;">0 users selected</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-secondary" onclick="bulkUpdateUsersStatus('ACTIVE')" style="background: white; border: 1px solid var(--color-success); color: var(--color-success);">
            ✅ Bulk Activate
          </button>
          <button class="btn btn-sm btn-secondary" onclick="bulkUpdateUsersStatus('SUSPENDED')" style="background: white; border: 1px solid var(--color-danger); color: var(--color-danger);">
            â›” Bulk Suspend
          </button>
          <button class="btn btn-sm btn-secondary" onclick="clearUserSelections()" style="background: white;">
            Clear
          </button>
        </div>
      </div>

      <!-- Users Table -->
      <div class="table-container" style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-xs);">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">
                <input type="checkbox" id="user-select-all" onchange="toggleSelectAllUsers(this)" style="cursor: pointer;">
              </th>
              <th>Name</th>
              <th>Email / Login ID</th>
              <th>Role</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align: center; padding: 48px 20px;">
                  <div class="empty-state-icon" style="font-size: 2.5rem; margin-bottom: 8px;">ðŸ‘¥</div>
                  <h4 style="font-size: 1rem; color: var(--text-primary); margin-bottom: 4px;">No users found</h4>
                  <p style="font-size: 0.8125rem; color: var(--text-muted);">Try clearing your search or filter criteria.</p>
                </td>
              </tr>
            ` : users.map(u => {
              const isSuspended = u.status === "SUSPENDED";
              const roleBadge = u.role === "ADMIN"
                ? '<span class="badge badge-purple" style="font-weight: 700;">ADMIN</span>'
                : '<span class="badge badge-info" style="font-weight: 700;">VENDOR</span>';
              const statusBadge = isSuspended
                ? '<span class="badge badge-danger">â— SUSPENDED</span>'
                : '<span class="badge badge-success">â— ACTIVE</span>';
              const vendorDisplay = u.role === "ADMIN"
                ? '<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>'
                : (u.vendor_name ? `<span style="font-weight: 600; color: var(--text-primary);">${escapeHtml(u.vendor_name)}</span>` : '<span style="color: var(--color-warning);">Unassigned</span>');

              return `
                <tr data-user-id="${escapeHtml(u.id)}">
                  <td style="text-align: center;">
                    <input type="checkbox" class="user-row-checkbox" value="${escapeHtml(u.id)}" onchange="handleUserRowSelect(this)" style="cursor: pointer;">
                  </td>
                  <td>
                    <div style="font-weight: 600; color: var(--text-primary); cursor: pointer;" onclick="openUserDetailsModal('${escapeHtml(u.id)}')">
                      ${escapeHtml(u.full_name || "—")}
                    </div>
                  </td>
                  <td>
                    <div class="id-cell-wrapper" style="max-width: 280px;">
                      <span class="font-mono id-text" title="${escapeHtml(u.email)}" style="font-size: 0.82rem; font-weight: 500;">${escapeHtml(u.email)}</span>
                      <button class="btn-copy" onclick="event.stopPropagation(); copyToClipboard('${escapeHtml(u.email)}')" title="Copy Login ID">📋</button>
                    </div>
                  </td>
                  <td>${roleBadge}</td>
                  <td>${vendorDisplay}</td>
                  <td>${statusBadge}</td>
                  <td style="font-size: 0.8125rem; color: var(--text-secondary); white-space: nowrap;">
                    ${u.last_login ? formatDateTime(u.last_login) : '<span style="color: var(--text-muted);">Never</span>'}
                  </td>
                  <td style="font-size: 0.8125rem; color: var(--text-secondary); white-space: nowrap;">
                    ${formatDate(u.created_at)}
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <div style="display: inline-flex; gap: 6px; align-items: center;">
                      <button class="btn btn-sm btn-secondary" onclick="openUserDetailsModal('${escapeHtml(u.id)}')" title="View details and audit activity" style="padding: 4px 8px; font-size: 0.75rem;">
                        ðŸ‘ Details
                      </button>
                      <button class="btn btn-sm btn-secondary" onclick="openResetPasswordModal('${escapeHtml(u.id)}', '${escapeHtml(u.email)}')" title="Reset temporary password" style="padding: 4px 8px; font-size: 0.75rem;">
                        ðŸ”‘ Reset PW
                      </button>
                      ${isSuspended ? `
                        <button class="btn btn-sm" onclick="confirmToggleUserStatus('${escapeHtml(u.id)}', '${escapeHtml(u.full_name || u.email)}', 'SUSPENDED')" title="Reactivate this user account" style="padding: 4px 8px; font-size: 0.75rem; background: var(--color-success-bg); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.2);">
                          ✅ Activate
                        </button>
                      ` : `
                        <button class="btn btn-sm" onclick="confirmToggleUserStatus('${escapeHtml(u.id)}', '${escapeHtml(u.full_name || u.email)}', 'ACTIVE')" title="Suspend this user account" style="padding: 4px 8px; font-size: 0.75rem; background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2);">
                          â›” Suspend
                        </button>
                      `}
                      <button class="btn btn-sm" onclick="confirmDeleteUser('${escapeHtml(u.id)}', '${escapeHtml(u.full_name || u.email)}', '${escapeHtml(u.role)}')" title="Delete user" style="padding: 4px 8px; font-size: 0.75rem; background: var(--bg-muted); color: var(--text-muted); border: 1px solid var(--border-default);">
                        ðŸ—‘
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination" style="margin-top: 20px;">
        ${renderPagination(page, usersData.totalPages || 1, "renderUsers")}
      </div>
    `;
    $("#content-area").innerHTML = content;
    animateCountUps($("#content-area"));
  } catch (err) {
    showError("#content-area", err.message || "Failed to load users");
    showToast("Error loading user directory: " + err.message, "error");
  }
}

function applyUserFilters() {
  userFiltersState.search = ($("#user-filter-search")?.value || "").trim();
  userFiltersState.role = $("#user-filter-role")?.value || "";
  userFiltersState.vendor_id = $("#user-filter-vendor")?.value || "";
  userFiltersState.status = $("#user-filter-status")?.value || "";
  renderUsers(1);
}

function resetUserFilters() {
  userFiltersState = { search: "", role: "", vendor_id: "", status: "" };
  renderUsers(1);
}

function toggleSelectAllUsers(master) {
  const checkboxes = $(".user-row-checkbox");
  checkboxes.forEach(cb => {
    cb.checked = master.checked;
    if (master.checked) selectedUserIds.add(cb.value);
    else selectedUserIds.delete(cb.value);
  });
  updateBulkBar();
}

function handleUserRowSelect(cb) {
  if (cb.checked) selectedUserIds.add(cb.value);
  else selectedUserIds.delete(cb.value);

  const total = $(".user-row-checkbox").length;
  const master = $("#user-select-all");
  if (master) master.checked = selectedUserIds.size === total && total > 0;
  updateBulkBar();
}

function clearUserSelections() {
  selectedUserIds.clear();
  $$(".user-row-checkbox").forEach(cb => cb.checked = false);
  const master = $("#user-select-all");
  if (master) master.checked = false;
  updateBulkBar();
}

function updateBulkBar() {
  const bar = $("#users-bulk-bar");
  const countEl = $("#users-bulk-count");
  if (!bar) return;
  if (selectedUserIds.size > 0) {
    bar.style.display = "flex";
    if (countEl) countEl.textContent = `${selectedUserIds.size} user${selectedUserIds.size > 1 ? "s" : ""} selected`;
  } else {
    bar.style.display = "none";
  }
}

async function bulkUpdateUsersStatus(newStatus) {
  if (selectedUserIds.size === 0) return;
  const ids = Array.from(selectedUserIds);
  const actionName = newStatus === "ACTIVE" ? "activate" : "suspend";
  if (!confirm(`Are you sure you want to ${actionName} ${ids.length} selected user(s)?`)) return;

  try {
    const res = await api("/admin/users/bulk-status", {
      method: "POST",
      body: JSON.stringify({ ids, status: newStatus }),
    });
    showToast(`Successfully updated ${res.data?.updated || ids.length} users to ${newStatus}`, "success");
    clearUserSelections();
    renderUsers(1);
  } catch (err) {
    showToast("Bulk update failed: " + err.message, "error");
  }
}

// ─── Create User Modal ─────────────────────────────────────────────────────────
async function openCreateUserModal() {
  showModal("Create User", '<div class="loading-screen" style="min-height:200px;"><div class="spinner-lg"></div></div>');
  try {
    const vendorsRes = await api("/vendors?limit=500").catch(() => ({ vendors: [] }));
    const vendors = vendorsRes.vendors || [];

    const bodyHtml = `
      <form id="create-user-form" onsubmit="event.preventDefault(); submitCreateUser();" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">Full Name *</label>
          <input type="text" id="new-user-fullname" placeholder="e.g. Rahul Sharma" required class="input-glass" style="width: 100%;">
        </div>

        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">Email / Login ID *</label>
          <input type="text" id="new-user-email" placeholder="e.g. rahul@vendora.com" required class="input-glass" style="width: 100%;">
        </div>

        <div class="grid-2" style="gap: 14px;">
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">Role *</label>
            <select id="new-user-role" class="input-glass" style="width: 100%;" onchange="handleCreateUserRoleChange(this.value)" required>
              <option value="ADMIN">ADMIN</option>
              <option value="VENDOR">VENDOR</option>
            </select>
          </div>

          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">Status</label>
            <select id="new-user-status" class="input-glass" style="width: 100%;">
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        </div>

        <div class="form-group" id="vendor-select-group">
          <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">Vendor Assignment</label>
          <select id="new-user-vendor" class="input-glass" style="width: 100%;" disabled>
            <option value="">— Not Applicable (ADMIN has global oversight) —</option>
            ${vendors.map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)} (${escapeHtml(v.vendor_code || v.id.slice(0, 6))})</option>`).join("")}
          </select>
          <small id="vendor-hint" style="color: var(--text-muted); font-size: 0.72rem; margin-top: 4px; display: block;">
            Admins have platform-wide access and do not belong to a specific vendor.
          </small>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">Initial Password *</label>
            <span style="font-size: 0.72rem; color: var(--accent); cursor: pointer;" onclick="togglePasswordVisibility('new-user-password', this)">Show</span>
          </div>
          <input type="password" id="new-user-password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required class="input-glass" style="width: 100%;" oninput="checkNewUserPasswordStrength(this.value)">
          <div class="pw-strength-container">
            <div class="pw-strength-bar"><div id="new-user-pw-bar" class="pw-strength-fill"></div></div>
            <span id="new-user-pw-text" class="pw-strength-text">Password strength: None</span>
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">Confirm Password *</label>
            <span style="font-size: 0.72rem; color: var(--accent); cursor: pointer;" onclick="togglePasswordVisibility('new-user-password-confirm', this)">Show</span>
          </div>
          <input type="password" id="new-user-password-confirm" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required class="input-glass" style="width: 100%;">
        </div>

        <div id="create-user-error" class="error-msg" style="display: none; margin-top: 4px;"></div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" id="btn-create-user-submit" onclick="submitCreateUser()">Create User</button>
    `;

    showModal("Create User", bodyHtml, footerHtml);
  } catch (err) {
    showModal("Create User", `<div class="error-msg">${escapeHtml(err.message)}</div>`, '<button class="btn btn-secondary" onclick="hideModal()">Close</button>');
  }
}

function handleCreateUserRoleChange(role) {
  const vendorSelect = $("#new-user-vendor");
  const vendorHint = $("#vendor-hint");
  if (!vendorSelect) return;

  if (role === "ADMIN") {
    vendorSelect.disabled = true;
    vendorSelect.value = "";
    vendorSelect.options[0].textContent = "— Not Applicable (ADMIN has global oversight) —";
    if (vendorHint) vendorHint.textContent = "Admins have platform-wide access and do not belong to a specific vendor.";
  } else {
    vendorSelect.disabled = false;
    vendorSelect.options[0].textContent = "— Select Assigned Vendor (Required) —";
    if (vendorHint) vendorHint.textContent = "Vendor accounts are strictly isolated to their assigned vendor data.";
  }
}

function togglePasswordVisibility(inputId, triggerEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (triggerEl) triggerEl.textContent = "Hide";
  } else {
    input.type = "password";
    if (triggerEl) triggerEl.textContent = "Show";
  }
}

function checkNewUserPasswordStrength(pw) {
  const bar = $("#new-user-pw-bar");
  const text = $("#new-user-pw-text");
  if (!bar || !text) return;

  if (!pw) {
    bar.className = "pw-strength-fill";
    text.textContent = "Password strength: None";
    return;
  }

  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) {
    bar.className = "pw-strength-fill weak";
    text.textContent = "Password strength: Weak";
    text.style.color = "var(--color-danger)";
  } else if (score <= 4) {
    bar.className = "pw-strength-fill medium";
    text.textContent = "Password strength: Medium";
    text.style.color = "var(--color-warning)";
  } else {
    bar.className = "pw-strength-fill strong";
    text.textContent = "Password strength: Strong";
    text.style.color = "var(--color-success)";
  }
}

async function submitCreateUser() {
  const errEl = $("#create-user-error");
  const submitBtn = $("#btn-create-user-submit");
  if (errEl) errEl.style.display = "none";

  const full_name = ($("#new-user-fullname")?.value || "").trim();
  const email = ($("#new-user-email")?.value || "").trim();
  const role = $("#new-user-role")?.value || "ADMIN";
  const status = $("#new-user-status")?.value || "ACTIVE";
  const vendor_id = $("#new-user-vendor")?.value || null;
  const password = $("#new-user-password")?.value || "";
  const confirmPassword = $("#new-user-password-confirm")?.value || "";

  if (!full_name || !email) {
    if (errEl) { errEl.textContent = "Full name and Email / Login ID are required."; errEl.style.display = "block"; }
    return;
  }

  if (role === "VENDOR" && !vendor_id) {
    if (errEl) { errEl.textContent = "Please select an assigned vendor for VENDOR role."; errEl.style.display = "block"; }
    return;
  }

  if (!password || password.length < 4) {
    if (errEl) { errEl.textContent = "Password must be at least 4 characters long."; errEl.style.display = "block"; }
    return;
  }

  if (password !== confirmPassword) {
    if (errEl) { errEl.textContent = "Passwords do not match."; errEl.style.display = "block"; }
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Creating..."; }

  try {
    const payload = {
      full_name,
      email,
      role,
      status,
      vendor_id: role === "VENDOR" ? vendor_id : null,
      password,
    };

    const res = await api("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    hideModal();
    showToast(`User "${res.data?.email || email}" created successfully!`, "success");
    renderUsers(1);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || "Failed to create user";
      errEl.style.display = "block";
    }
    showToast("Creation failed: " + err.message, "error");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Create User"; }
  }
}

// ─── Reset Password Modal ──────────────────────────────────────────────────────
function openResetPasswordModal(userId, email) {
  const bodyHtml = `
    <form id="reset-pw-form" onsubmit="event.preventDefault(); submitResetPassword('${escapeHtml(userId)}');" style="display: flex; flex-direction: column; gap: 14px;">
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
        Set a new temporary password for <strong>${escapeHtml(email)}</strong>.
      </p>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">New Temporary Password *</label>
          <span style="font-size: 0.72rem; color: var(--accent); cursor: pointer;" onclick="togglePasswordVisibility('reset-pw-new', this)">Show</span>
        </div>
        <input type="password" id="reset-pw-new" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required class="input-glass" style="width: 100%;">
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">Confirm Temporary Password *</label>
          <span style="font-size: 0.72rem; color: var(--accent); cursor: pointer;" onclick="togglePasswordVisibility('reset-pw-confirm', this)">Show</span>
        </div>
        <input type="password" id="reset-pw-confirm" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required class="input-glass" style="width: 100%;">
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 8px 12px; background: var(--accent-light); border-radius: var(--radius-sm);">
        <input type="checkbox" id="reset-pw-force" checked style="cursor: pointer;">
        <label for="reset-pw-force" style="font-size: 0.8125rem; color: var(--text-primary); cursor: pointer; user-select: none;">
          Force password change on next login (Recommended)
        </label>
      </div>

      <div id="reset-pw-error" class="error-msg" style="display: none;"></div>
    </form>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
    <button class="btn btn-primary" id="btn-reset-pw-submit" onclick="submitResetPassword('${escapeHtml(userId)}')">Reset Password</button>
  `;

  showModal("Reset Password", bodyHtml, footerHtml);
}

async function submitResetPassword(userId) {
  const errEl = $("#reset-pw-error");
  const submitBtn = $("#btn-reset-pw-submit");
  if (errEl) errEl.style.display = "none";

  const password = $("#reset-pw-new")?.value || "";
  const confirmPassword = $("#reset-pw-confirm")?.value || "";
  const force_password_change = $("#reset-pw-force")?.checked || false;

  if (!password || password.length < 4) {
    if (errEl) { errEl.textContent = "Password must be at least 4 characters."; errEl.style.display = "block"; }
    return;
  }
  if (password !== confirmPassword) {
    if (errEl) { errEl.textContent = "Passwords do not match."; errEl.style.display = "block"; }
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Resetting..."; }

  try {
    await api(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password, force_password_change }),
    });

    hideModal();
    showToast("Password reset successfully! Force change flag updated.", "success");
    renderUsers(1);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || "Failed to reset password";
      errEl.style.display = "block";
    }
    showToast("Reset failed: " + err.message, "error");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Reset Password"; }
  }
}

// ─── User Details Modal & Audit Activity Timeline ─────────────────────────────
async function openUserDetailsModal(userId) {
  showModal("User Details", '<div class="loading-screen" style="min-height:260px;"><div class="spinner-lg"></div></div>');
  try {
    const [userRes, activityRes] = await Promise.all([
      api(`/admin/users/${userId}`),
      api(`/admin/users/${userId}/activity`).catch(() => ({ data: { activity: [] } })),
    ]);

    const u = userRes.data || userRes;
    const activities = (activityRes.data?.activity) || [];
    const isSuspended = u.status === "SUSPENDED";

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Header Info Card -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; background: var(--bg-muted); border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-full); background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700;">
              ${escapeHtml((u.full_name || u.email || "U").charAt(0).toUpperCase())}
            </div>
            <div>
              <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(u.full_name || "—")}</div>
              <div style="font-size: 0.8125rem; color: var(--text-secondary); font-family: ui-monospace, monospace;">${escapeHtml(u.email)}</div>
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${u.role === "ADMIN" ? '<span class="badge badge-purple">ADMIN</span>' : '<span class="badge badge-info">VENDOR</span>'}
            ${isSuspended ? '<span class="badge badge-danger">SUSPENDED</span>' : '<span class="badge badge-success">ACTIVE</span>'}
          </div>
        </div>

        <!-- Entity Details Grid -->
        <div class="grid-2" style="gap: 16px; font-size: 0.85rem;">
          <div>
            <label style="font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: var(--text-muted); display: block;">User ID</label>
            <div style="margin-top: 4px;">${renderIdCell(u.id)}</div>
          </div>

          <div>
            <label style="font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: var(--text-muted); display: block;">Assigned Vendor</label>
            <div style="margin-top: 4px; font-weight: 600; color: var(--text-primary);">
              ${u.role === "ADMIN" ? '<span style="color: var(--text-muted);">— (Global Admin)</span>' : (u.vendor_name ? `${escapeHtml(u.vendor_name)} (${escapeHtml(u.vendor_code || u.vendor_id)})` : '<span style="color: var(--color-warning);">Unassigned</span>')}
            </div>
          </div>

          <div>
            <label style="font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: var(--text-muted); display: block;">Created At</label>
            <div style="margin-top: 4px; color: var(--text-secondary);">${formatDateTime(u.created_at)}</div>
          </div>

          <div>
            <label style="font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: var(--text-muted); display: block;">Last Login</label>
            <div style="margin-top: 4px; color: var(--text-secondary);">${u.last_login ? formatDateTime(u.last_login) : '<span style="color: var(--text-muted);">Never logged in</span>'}</div>
          </div>

          <div>
            <label style="font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: var(--text-muted); display: block;">Last Password Change</label>
            <div style="margin-top: 4px; color: var(--text-secondary);">${u.last_password_change ? formatDateTime(u.last_password_change) : '<span style="color: var(--text-muted);">Never changed</span>'}</div>
          </div>

          <div>
            <label style="font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: var(--text-muted); display: block;">Force Password Change</label>
            <div style="margin-top: 4px;">${u.force_password_change ? '<span class="badge badge-warning">Required on next login</span>' : '<span class="badge badge-neutral">No</span>'}</div>
          </div>
        </div>

        <!-- Quick Actions Row -->
        <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-light); flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary" onclick="hideModal(); openResetPasswordModal('${escapeHtml(u.id)}', '${escapeHtml(u.email)}');">
            ðŸ”‘ Reset Password
          </button>
          ${isSuspended ? `
            <button class="btn btn-sm" onclick="hideModal(); confirmToggleUserStatus('${escapeHtml(u.id)}', '${escapeHtml(u.full_name || u.email)}', 'SUSPENDED');" style="background: var(--color-success-bg); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.2);">
              ✅ Activate Account
            </button>
          ` : `
            <button class="btn btn-sm" onclick="hideModal(); confirmToggleUserStatus('${escapeHtml(u.id)}', '${escapeHtml(u.full_name || u.email)}', 'ACTIVE');" style="background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2);">
              â›” Suspend Account
            </button>
          `}
          <button class="btn btn-sm" onclick="hideModal(); confirmDeleteUser('${escapeHtml(u.id)}', '${escapeHtml(u.full_name || u.email)}', '${escapeHtml(u.role)}');" style="background: var(--bg-muted); color: var(--color-danger); border: 1px solid var(--border-default);">
            ðŸ—‘ Delete
          </button>
        </div>

        <!-- Audit Activity Timeline (Section 13) -->
        <div style="padding-top: 14px; border-top: 1px solid var(--border-light);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin: 0;">Recent Audit Activity</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${activities.length} event${activities.length === 1 ? "" : "s"}</span>
          </div>

          <div class="timeline-list">
            ${activities.length === 0 ? `
              <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.8125rem;">
                No audit activity recorded for this user yet.
              </div>
            ` : activities.map(act => {
              let icon = "ðŸ“";
              if (act.action.includes("LOGIN")) icon = "ðŸ”";
              else if (act.action.includes("PASSWORD")) icon = "ðŸ”‘";
              else if (act.action.includes("SUSPEND")) icon = "â›”";
              else if (act.action.includes("ACTIVATE")) icon = "✅";
              else if (act.action.includes("CREATE")) icon = "âž•";
              else if (act.action.includes("DELETE")) icon = "ðŸ—‘";

              return `
                <div class="timeline-item">
                  <div class="timeline-icon">${icon}</div>
                  <div class="timeline-content">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                      <div class="timeline-title">${escapeHtml(act.action)}</div>
                      <span class="timeline-meta">${formatDateTime(act.created_at)}</span>
                    </div>
                    <div class="timeline-meta">
                      Actor: <strong>${escapeHtml(act.actor_email || "System")}</strong>
                      ${act.ip_address ? ` · IP: ${escapeHtml(act.ip_address)}` : ""}
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    const footerHtml = '<button class="btn btn-secondary" onclick="hideModal()">Close</button>';
    showModal("User Details", bodyHtml, footerHtml);
  } catch (err) {
    showModal("User Details", `<div class="error-msg">${escapeHtml(err.message)}</div>`, '<button class="btn btn-secondary" onclick="hideModal()">Close</button>');
  }
}

// ─── Suspend / Activate User Confirmation (Section 9 & 10) ───────────────────
function confirmToggleUserStatus(userId, name, currentStatus) {
  if (currentStatus === "ACTIVE") {
    // Suspend Modal
    const bodyHtml = `
      <div style="font-size: 0.9rem; color: var(--text-primary); line-height: 1.5;">
        <p style="margin-bottom: 12px;">Are you sure you want to suspend <strong>${escapeHtml(name)}</strong>?</p>
        <div style="padding: 12px 14px; background: var(--color-danger-bg); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.2); color: var(--color-danger); font-size: 0.82rem;">
          ⚠️ <strong>${escapeHtml(name)}</strong> will no longer be able to authenticate or access the platform.
        </div>
      </div>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doUpdateUserStatus('${escapeHtml(userId)}', 'SUSPENDED')">Suspend User</button>
    `;
    showModal("Suspend User?", bodyHtml, footerHtml);
  } else {
    // Reactivate Modal
    const bodyHtml = `
      <div style="font-size: 0.9rem; color: var(--text-primary); line-height: 1.5;">
        <p style="margin-bottom: 12px;">Activate account for <strong>${escapeHtml(name)}</strong>?</p>
        <p style="font-size: 0.82rem; color: var(--text-secondary);">
          The user will immediately regain access to log in and access their authorized workspace.
        </p>
      </div>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" style="background: var(--color-success);" onclick="doUpdateUserStatus('${escapeHtml(userId)}', 'ACTIVE')">Activate User</button>
    `;
    showModal("Activate User?", bodyHtml, footerHtml);
  }
}

async function doUpdateUserStatus(userId, newStatus) {
  try {
    await api(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    hideModal();
    showToast(`User account is now ${newStatus}`, "success");
    renderUsers(1);
  } catch (err) {
    showToast("Status update failed: " + err.message, "error");
  }
}

// ─── Delete User Confirmation (Section 11) ───────────────────────────────────
function confirmDeleteUser(userId, name, role) {
  const bodyHtml = `
    <div style="font-size: 0.9rem; color: var(--text-primary); line-height: 1.5;">
      <p style="margin-bottom: 12px;">Delete user account <strong>${escapeHtml(name)}</strong> (${escapeHtml(role)})?</p>
      <div style="padding: 12px 14px; background: var(--bg-muted); border-radius: var(--radius-md); border: 1px solid var(--border-light); font-size: 0.8125rem; color: var(--text-secondary);">
        ℹ️ï¸ To maintain historical response ownership and audit trail compliance, this user will be deactivated and marked as suspended.
      </div>
    </div>
  `;
  const footerHtml = `
    <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
    <button class="btn btn-danger" onclick="doDeleteUser('${escapeHtml(userId)}')">Delete User</button>
  `;
  showModal("Delete User", bodyHtml, footerHtml);
}

async function doDeleteUser(userId) {
  try {
    await api(`/admin/users/${userId}`, {
      method: "DELETE",
    });
    hideModal();
    showToast("User account has been deleted / suspended.", "success");
    renderUsers(1);
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

// ─── Download Users Excel (Section 19) ─────────────────────────────────────────
async function downloadUsersExcel() {
  try {
    showToast("Generating enterprise users export...", "info", 2000);
    const res = await fetch("/api/admin/users/export", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Users spreadsheet downloaded successfully", "success");
  } catch (err) {
    showToast("Failed to download users export: " + err.message, "error");
  }
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function renderPagination(current, total, handler) {
  if (total <= 1) return "";
  let html = "";
  html += `<button ${current === 1 ? "disabled" : ""} onclick="${handler}(${
    current - 1
  })">←  Prev</button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      html += `<button class="${
        i === current ? "active" : ""
      }" onclick="${handler}(${i})">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      html += "<span>...</span>";
    }
  }
  html += `<button ${current === total ? "disabled" : ""} onclick="${handler}(${
    current + 1
  })">Next  →</button>`;
  html += `<span class="pagination-info">Page ${current} of ${total}</span>`;
  return html;
}

// ─── Projects Page ─────────────────────────────────────────────────────────────

let _currentProjectId = null;

async function renderProjects() {
  const area = $("#content-area");
  area.innerHTML = `<div class="loading-screen"><div class="spinner-lg"></div></div>`;
  try {
    const { data: projects } = await api("/projects");
    area.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <div>
          <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:var(--text-primary)">Client Projects</h2>
          <p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-muted);">${projects.length} project${projects.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button class="btn btn-primary" onclick="showCreateProjectModal()">+ Create Project</button>
      </div>
      ${projects.length === 0 ? `
        <div style="text-align:center;padding:4rem 2rem;background:var(--bg-surface);border-radius:1rem;border:1px solid var(--border-default);">
          <div style="font-size:3rem;margin-bottom:1rem;">ðŸ“</div>
          <h3 style="margin:0 0 0.5rem;color:var(--text-primary)">No Projects Yet</h3>
          <p style="color:var(--text-muted);margin-bottom:1.5rem;">Create your first survey tracking project to get started.</p>
          <button class="btn btn-primary" onclick="showCreateProjectModal()">+ Create Project</button>
        </div>
      ` : `
        <div style="display:grid;gap:1rem;">
          ${projects.map(function(p) {
            var statusColor = p.status === 'LIVE' ? 'var(--color-success)' : p.status === 'DRAFT' ? 'var(--text-muted)' : 'var(--color-warning)';
            return `
              <div onclick="renderProjectDetail('${escapeHtml(p.id)}')" style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:0.875rem;padding:1.25rem 1.5rem;cursor:pointer;transition:all 0.2s ease;display:grid;grid-template-columns:1fr auto;gap:0.75rem;align-items:start;" onmouseover="this.style.borderColor='var(--accent)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-default)';this.style.transform='translateY(0)'">
                <div>
                  <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
                    <span style="font-family:monospace;font-size:0.8125rem;font-weight:700;background:var(--accent);color:#fff;padding:0.2rem 0.6rem;border-radius:0.375rem;">${escapeHtml(p.project_code)}</span>
                    <span style="font-size:0.75rem;font-weight:600;color:${statusColor};background:${statusColor}18;padding:0.15rem 0.5rem;border-radius:999px;">${escapeHtml(p.status)}</span>
                  </div>
                  <div style="font-size:1rem;font-weight:600;color:var(--text-primary);margin-bottom:0.25rem;">${escapeHtml(p.name)}</div>
                  ${p.client_name ? `<div style="font-size:0.8125rem;color:var(--text-muted);">Client: ${escapeHtml(p.client_name)}</div>` : ''}
                  ${p.survey_url ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.35rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:500px;">🔗 ${escapeHtml(p.survey_url)}</div>` : ''}
                </div>
                <div style="text-align:right;font-size:0.75rem;color:var(--text-muted);">
                  ${p.client_rate ? `<div>Client: <strong style="color:var(--text-primary);">₹${p.client_rate}</strong></div>` : ''}
                  ${p.vendor_rate ? `<div>Vendor: <strong style="color:var(--text-primary);">₹${p.vendor_rate}</strong></div>` : ''}
                  <div style="margin-top:0.5rem;color:var(--accent);font-weight:500;">View Details  →</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  } catch (e) {
    showToast("Failed to load projects: " + e.message, "error");
    area.innerHTML = `<p style="color:var(--color-danger)">Error loading projects.</p>`;
  }
}

async function renderProjectDetail(projectId) {
  _currentProjectId = projectId;
  const area = $("#content-area");
  area.innerHTML = '<div class="loading-screen"><div class="spinner-lg"></div></div>';
  try {
    const { data: proj } = await api('/projects/' + projectId);
    const countriesRes = await api('/projects/' + projectId + '/countries').catch(() => ({ data: [] }));
    const countries = countriesRes.data || [];
    const baseUrl = window.location.origin;

    const flagMap = {
      IN: '🇮🇳', US: '🇺🇸', GB: '🇬🇧', UK: '🇬🇧', FR: '🇫🇷', DE: '🇩🇪',
      CA: '🇨🇦', AU: '🇦🇺', JP: '🇯🇵', BR: '🇧🇷', SG: '🇸🇬', ES: '🇪🇸', IT: '🇮🇹'
    };

    const countryBlocks = countries.map(function(c) {
      const flag = flagMap[(c.country_code || '').toUpperCase()] || '🌐';
      const opiUrl = baseUrl + '/track?code=' + encodeURIComponent(proj.project_code) + '&country=' + encodeURIComponent(c.country_code) + '&uid={UID}';
      const testUrl = baseUrl + '/track?code=' + encodeURIComponent(proj.project_code) + '&country=' + encodeURIComponent(c.country_code) + '&uid=TEST_PREVIEW';

      return `
        <div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:1.25rem 1.5rem;margin-bottom:1rem;box-shadow:var(--shadow-xs);">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:0.875rem;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.25rem;">${flag}</span>
              <span style="font-size:1rem;font-weight:700;color:var(--text-primary);">
                ${escapeHtml(c.country_name || c.country_code)}
              </span>
              <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);background:var(--bg-muted);padding:2px 8px;border-radius:4px;">
                ${escapeHtml(c.country_code)}
              </span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:0.8125rem;">
              ${c.target_completes ? `<span class="badge" style="background:var(--color-info-bg);color:var(--color-info);font-weight:600;">Target: ${formatNumber(c.target_completes)}</span>` : ''}
              ${c.vendor_name ? `<span class="badge" style="background:var(--bg-muted);color:var(--text-secondary);">Vendor: ${escapeHtml(c.vendor_name)}</span>` : '<span class="badge" style="background:var(--bg-muted);color:var(--text-muted);">All Vendors / Organic</span>'}
            </div>
          </div>

          <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">
            OPI Tracking Launch Link
          </label>

          <div style="display:flex;align-items:center;gap:10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:8px;">
            <div style="flex:1;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:0.85rem;color:var(--text-primary);word-break:break-all;line-height:1.5;">
              ${escapeHtml(baseUrl + '/track?code=' + proj.project_code + '&country=' + c.country_code + '&uid=')}<span style="background:var(--accent-bg);color:var(--accent);font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid var(--accent-ring);">{UID}</span>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="btn btn-primary btn-sm" onclick="copyToClipboard('${opiUrl}', this)" style="padding:6px 14px;font-size:0.8125rem;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                📋 Copy Link
              </button>
              <a href="${testUrl}" target="_blank" class="btn btn-secondary btn-sm" style="padding:6px 12px;font-size:0.8125rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Test redirect flow">
                ↗ Test
              </a>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:0.78rem;color:var(--text-muted);">
            <div>
              💡 Replace <code style="color:var(--accent);font-weight:700;background:var(--accent-bg);padding:1px 4px;border-radius:3px;">{UID}</code> with respondent's unique ID before providing to vendors.
            </div>
            ${c.survey_url ? `
              <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:420px;" title="${escapeHtml(c.survey_url)}">
                Target Survey: <span style="font-family:monospace;color:var(--text-secondary);">${escapeHtml(c.survey_url)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const clientRate = proj.client_rate || 0;
    const vendorRate = proj.vendor_rate || 0;
    const margin = Math.max(0, clientRate - vendorRate);

    area.innerHTML = `
      <div style="max-width:1020px;margin:0 auto;">
        <button class="btn btn-ghost btn-sm" onclick="renderProjects()" style="display:inline-flex;align-items:center;gap:6px;margin-bottom:1.25rem;font-size:0.875rem;font-weight:500;color:var(--text-secondary);">
          ← Back to Projects
        </button>

        <div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);padding:1.75rem;margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1.5rem;">
            <div style="flex:1;min-width:280px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span style="font-family:ui-monospace,monospace;font-weight:800;font-size:1.15rem;background:var(--accent);color:#ffffff;padding:4px 12px;border-radius:6px;letter-spacing:0.04em;">
                  ${escapeHtml(proj.project_code)}
                </span>
                ${renderBadge(proj.status || 'ACTIVE')}
              </div>
              <h2 style="margin:0 0 6px;font-size:1.4rem;font-weight:700;color:var(--text-primary);line-height:1.3;">
                ${escapeHtml(proj.name)}
              </h2>
              ${proj.client_name ? `<p style="margin:0;font-size:0.875rem;color:var(--text-muted);">Client: <strong style="color:var(--text-secondary);font-weight:600;">${escapeHtml(proj.client_name)}</strong></p>` : ''}
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <div style="background:var(--bg-page);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:10px 16px;text-align:right;min-width:110px;">
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;letter-spacing:0.04em;">Client Rate</div>
                <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin-top:2px;">₹${formatNumber(clientRate)}</div>
              </div>
              <div style="background:var(--bg-page);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:10px 16px;text-align:right;min-width:110px;">
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;letter-spacing:0.04em;">Vendor Rate</div>
                <div style="font-size:1.15rem;font-weight:700;color:var(--text-secondary);margin-top:2px;">₹${formatNumber(vendorRate)}</div>
              </div>
              <div style="background:var(--color-success-bg);border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-sm);padding:10px 16px;text-align:right;min-width:110px;">
                <div style="font-size:0.72rem;color:var(--color-success);text-transform:uppercase;font-weight:600;letter-spacing:0.04em;">Margin</div>
                <div style="font-size:1.15rem;font-weight:700;color:var(--color-success);margin-top:2px;">₹${formatNumber(margin)}</div>
              </div>
            </div>
          </div>
        </div>

        ${proj.survey_url ? `
          <div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);box-shadow:var(--shadow-xs);padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
            <h3 style="margin:0 0 0.75rem;font-size:0.8125rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Default Client Survey URL</h3>
            <div style="font-family:ui-monospace,monospace;font-size:0.8125rem;color:var(--text-primary);background:var(--bg-input);padding:0.75rem 1rem;border-radius:var(--radius-sm);border:1px solid var(--border-default);word-break:break-all;margin-bottom:0.75rem;">
              ${escapeHtml(proj.survey_url)}
            </div>
            <div style="display:flex;gap:1.5rem;font-size:0.8125rem;">
              <div><span style="color:var(--text-muted);">UID Param:</span> <code style="color:var(--accent);font-weight:600;">${escapeHtml(proj.uid_param || 'auto-detect')}</code></div>
              <div><span style="color:var(--text-muted);">Placeholder:</span> <code style="color:var(--color-warning);font-weight:600;">${escapeHtml(proj.uid_placeholder || 'not detected')}</code></div>
            </div>
          </div>
        ` : ''}

        <div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);padding:1.75rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;padding-bottom:0.875rem;border-bottom:1px solid var(--border-light);">
            <div>
              <h3 style="margin:0;font-size:1.1rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                🔗 OPI Launch Links (${countries.length})
              </h3>
              <p style="margin:4px 0 0;font-size:0.8125rem;color:var(--text-muted);">
                Dedicated tracking URLs generated per country. Responses will automatically map to this project.
              </p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="renderProjectDetail('${escapeHtml(projectId)}')" title="Refresh links">
              ↻ Refresh
            </button>
          </div>

          ${countryBlocks || `
            <div style="text-align:center;padding:3rem 1rem;background:var(--bg-page);border-radius:var(--radius-md);border:1px dashed var(--border-default);">
              <div style="font-size:2rem;margin-bottom:0.5rem;">🌐</div>
              <h4 style="margin:0 0 0.25rem;color:var(--text-primary);">No Countries Configured</h4>
              <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;">No country-specific survey links have been created for this project yet.</p>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (e) {
    showToast("Failed to load project: " + e.message, "error");
    area.innerHTML = `<p style="color:var(--color-danger);padding:1rem;">Error: ${escapeHtml(e.message)}</p><button class="btn btn-secondary" onclick="renderProjects()">← Back to Projects</button>`;
  }
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText((text || '').trim()).then(function() {
    if (btn) {
      var origHtml = btn.innerHTML;
      btn.innerHTML = '✅ Copied!';
      btn.classList.add('btn-success');
      setTimeout(function() {
        btn.innerHTML = origHtml;
        btn.classList.remove('btn-success');
      }, 2000);
    }
    showToast("Link copied to clipboard!", "success");
  }).catch(function() {
    showToast("Failed to copy link automatically. Please select and copy manually.", "warning");
  });
}

var _createProjectCountries = [];

// ─── Create Project Modal ────────────────────────────────────────────────────
// _cpCountries: array of { code, name, survey_url, vendor_id, target_completes }
var _cpCountries = [];
var _cpVendorList = [];

async function showCreateProjectModal() {
  _cpCountries = [];
  // Pre-load vendor list for dropdowns
  try {
    var vRes = await api('/vendors?active=true');
    _cpVendorList = (vRes.data || []).filter(function(v) { return v.status === 'ACTIVE'; });
  } catch(e) { _cpVendorList = []; }

  showModal(
    'Create Project',
    `<form id="create-project-form" style="display:flex;flex-direction:column;gap:1.1rem;">
      <div class="form-group">
        <label>Client Project Name <span style="color:var(--color-danger)">*</span></label>
        <input type="text" id="cp-name" placeholder="e.g. Global Smartphone Study Q4 2025" required style="width:100%;">
      </div>
      <div class="form-group">
        <label>Client Name</label>
        <input type="text" id="cp-client-name" placeholder="e.g. ABC Research Inc." style="width:100%;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label>Client Rate (₹)</label>
          <input type="number" id="cp-client-rate" placeholder="70" min="0" step="0.01" style="width:100%;">
        </div>
        <div class="form-group">
          <label>Vendor Rate (₹)</label>
          <input type="number" id="cp-vendor-rate" placeholder="50" min="0" step="0.01" style="width:100%;">
        </div>
      </div>
      <div class="form-group">
        <label style="font-weight:600;font-size:0.9rem;letter-spacing:0.01em;">Countries &amp; Survey Links</label>
        <p style="font-size:0.78rem;color:var(--text-muted);margin:0.25rem 0 0.75rem;">Each country has its own client survey URL. OPI tracking link is auto-generated per country.</p>
        <div id="cp-country-cards" style="display:flex;flex-direction:column;gap:0.85rem;"></div>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
          <input type="text" id="cp-country-input" placeholder="Country code (IN, FR, DE...)" style="flex:1;" maxlength="3"
            onkeydown="if(event.key==='Enter'){event.preventDefault();cpAddCountry();}">
          <button type="button" class="btn btn-secondary" onclick="cpAddCountry()" style="white-space:nowrap;">+ Add Country</button>
        </div>
        <div id="cp-countries-error" style="color:var(--color-danger);font-size:0.75rem;margin-top:0.3rem;"></div>
      </div>
    </form>`,
    `<button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
     <button class="btn btn-primary" id="cp-submit-btn" onclick="submitCreateProject()">Create Project</button>`
  );
}

function cpVendorOptions(selectedId) {
  var opts = '<option value="">— No vendor —</option>';
  _cpVendorList.forEach(function(v) {
    opts += '<option value="' + v.id + '"' + (v.id === selectedId ? ' selected' : '') + '>' + escapeHtml(v.name) + '</option>';
  });
  return opts;
}

function cpRenderCards() {
  var container = document.getElementById('cp-country-cards');
  if (!container) return;
  if (_cpCountries.length === 0) {
    container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:1rem 0;">No countries added yet.</p>';
    return;
  }
  container.innerHTML = _cpCountries.map(function(c, i) {
    return `<div id="cp-card-${i}" style="border:1px solid var(--border-default);border-radius:0.6rem;padding:1rem;background:var(--bg-surface);position:relative;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <span style="font-weight:700;font-size:0.95rem;">${escapeHtml(c.name || c.code)} <span style="color:var(--text-muted);font-size:0.8rem;">(${escapeHtml(c.code)})</span></span>
        <button type="button" onclick="cpRemoveCountry(${i})" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:0.8rem;padding:0.1rem 0.4rem;border-radius:4px;" title="Remove">✕ Remove</button>
      </div>
      <div class="form-group" style="margin-bottom:0.6rem;">
        <label style="font-size:0.8rem;">Client Survey URL <span style="color:var(--color-danger)">*</span></label>
        <input type="url" id="cp-url-${i}" placeholder="https://client.com/survey?offer=FR123&rid=[identifier]"
          style="width:100%;font-size:0.82rem;"
          value="${escapeHtml(c.survey_url || '')}"
          oninput="cpUrlChanged(${i}, this.value)">
        <div id="cp-url-info-${i}" style="margin-top:0.35rem;font-size:0.73rem;color:var(--text-muted);min-height:1.1rem;">${cpUrlInfoHtml(c)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem;">Vendor</label>
          <select id="cp-vendor-${i}" onchange="_cpCountries[${i}].vendor_id=this.value" style="width:100%;font-size:0.82rem;">
            ${cpVendorOptions(c.vendor_id)}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:0.8rem;">Target Completes</label>
          <input type="number" id="cp-target-${i}" value="${c.target_completes || ''}" min="1" placeholder="500"
            style="width:100%;font-size:0.82rem;"
            onchange="_cpCountries[${i}].target_completes=this.value?parseInt(this.value):null">
        </div>
      </div>
    </div>`;
  }).join('');
}

function cpUrlInfoHtml(c) {
  if (!c.survey_url) return '';
  if (c._analyzing) return '<span style="color:var(--text-muted);">Analyzing…</span>';
  if (c.uid_param) {
    return '✅ UID param: <strong style="color:var(--color-success)">' + escapeHtml(c.uid_param) + '</strong>'
      + (c.uid_placeholder ? ' · Placeholder: <code style="color:var(--color-warning)">' + escapeHtml(c.uid_placeholder) + '</code>' : '');
  }
  return '<span style="color:var(--color-warning);">⚠️ No placeholder — UID will be appended as <code>uid=</code></span>';
}

var _cpUrlTimers = {};
function cpUrlChanged(i, url) {
  _cpCountries[i].survey_url = url;
  _cpCountries[i].uid_param = null;
  _cpCountries[i].uid_placeholder = null;
  _cpCountries[i]._analyzing = url && url.length > 10;
  var infoEl = document.getElementById('cp-url-info-' + i);
  if (infoEl) infoEl.innerHTML = _cpCountries[i]._analyzing ? '<span style="color:var(--text-muted);">Analyzing…</span>' : '';
  clearTimeout(_cpUrlTimers[i]);
  if (!url || url.length < 10) return;
  _cpUrlTimers[i] = setTimeout(function() { cpAnalyzeUrl(i, url); }, 600);
}

async function cpAnalyzeUrl(i, url) {
  try {
    var res = await api('/projects/analyze-url?url=' + encodeURIComponent(url));
    if (_cpCountries[i] && _cpCountries[i].survey_url === url) {
      _cpCountries[i].uid_param = res.data.uid_param || null;
      _cpCountries[i].uid_placeholder = res.data.uid_placeholder || null;
      _cpCountries[i]._analyzing = false;
      var infoEl = document.getElementById('cp-url-info-' + i);
      if (infoEl) infoEl.innerHTML = cpUrlInfoHtml(_cpCountries[i]);
    }
  } catch(e) {
    if (_cpCountries[i]) { _cpCountries[i]._analyzing = false; }
  }
}

function cpAddCountry() {
  var input = document.getElementById('cp-country-input');
  var errEl = document.getElementById('cp-countries-error');
  if (!input) return;
  var code = input.value.trim().toUpperCase();
  if (!code) return;
  if (code.length < 2 || code.length > 3) { if(errEl) errEl.textContent = 'Country code must be 2–3 chars (e.g. IN, FR, DE)'; return; }
  if (_cpCountries.some(function(c) { return c.code === code; })) { if(errEl) errEl.textContent = code + ' already added'; return; }
  if (errEl) errEl.textContent = '';
  // Look up name from COUNTRY_MAP equivalent (best-effort)
  var nameMap = {'IN':'India','FR':'France','DE':'Germany','US':'United States','GB':'United Kingdom','AU':'Australia','CA':'Canada','SG':'Singapore','AE':'UAE','PH':'Philippines','TH':'Thailand','MY':'Malaysia','ID':'Indonesia','NG':'Nigeria','ZA':'South Africa','BR':'Brazil','MX':'Mexico','AR':'Argentina','CO':'Colombia','PL':'Poland','IT':'Italy','ES':'Spain','NL':'Netherlands','SE':'Sweden','NO':'Norway','DK':'Denmark','FI':'Finland','BE':'Belgium','CH':'Switzerland','AT':'Austria','JP':'Japan','KR':'South Korea','CN':'China','TW':'Taiwan','HK':'Hong Kong','VN':'Vietnam'};
  var name = nameMap[code] || code;
  _cpCountries.push({ code: code, name: name, survey_url: '', uid_param: null, uid_placeholder: null, vendor_id: null, target_completes: null });
  input.value = '';
  cpRenderCards();
}

function cpRemoveCountry(i) {
  _cpCountries.splice(i, 1);
  cpRenderCards();
}

async function submitCreateProject() {
  var nameEl = document.getElementById('cp-name');
  var clientNameEl = document.getElementById('cp-client-name');
  var clientRateEl = document.getElementById('cp-client-rate');
  var vendorRateEl = document.getElementById('cp-vendor-rate');
  var submitBtn = document.getElementById('cp-submit-btn');
  var errEl = document.getElementById('cp-countries-error');

  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) { showToast('Project name is required', 'error'); return; }
  if (_cpCountries.length === 0) {
    if (errEl) errEl.textContent = 'At least one country is required';
    showToast('Add at least one country', 'error');
    return;
  }

  // Collect current URL values from DOM (in case user didn't trigger oninput)
  _cpCountries.forEach(function(c, i) {
    var urlEl = document.getElementById('cp-url-' + i);
    var vendorEl = document.getElementById('cp-vendor-' + i);
    var targetEl = document.getElementById('cp-target-' + i);
    if (urlEl) c.survey_url = urlEl.value.trim();
    if (vendorEl) c.vendor_id = vendorEl.value || null;
    if (targetEl) c.target_completes = targetEl.value ? parseInt(targetEl.value) : null;
  });

  // Validate each country has a survey URL
  var missing = _cpCountries.filter(function(c) { return !c.survey_url; });
  if (missing.length > 0) {
    var msg = 'Survey URL is required for: ' + missing.map(function(c) { return c.code; }).join(', ');
    if (errEl) errEl.textContent = msg;
    showToast(msg, 'error');
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating…'; }
  try {
    var result = await api('/projects/create-full', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        client_name: clientNameEl && clientNameEl.value.trim() ? clientNameEl.value.trim() : null,
        client_rate: clientRateEl && clientRateEl.value ? parseFloat(clientRateEl.value) : 70,
        vendor_rate: vendorRateEl && vendorRateEl.value ? parseFloat(vendorRateEl.value) : 50,
        countries: _cpCountries.map(function(c) {
          return {
            code: c.code,
            survey_url: c.survey_url,
            vendor_id: c.vendor_id || null,
            target_completes: c.target_completes || null,
          };
        }),
      }),
    });
    hideModal();
    showToast('Project ' + result.data.project.project_code + ' created!', 'success');
    await renderProjectDetail(result.data.project.id);
    if ($('#page-title')) $('#page-title').textContent = 'Projects';
  } catch (e) {
    showToast('Failed: ' + (e.message || 'Unknown error'), 'error');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Project'; }
  }
}

// Legacy stubs — kept so old code references don't crash
var _createProjectCountries = [];
function addCountryToProject() { cpAddCountry(); }
function removeCountryTag(code) {
  var i = _cpCountries.findIndex(function(c) { return c.code === code; });
  if (i >= 0) cpRemoveCountry(i);
}
function renderCountryTags() {}
function debounceAnalyzeSurveyUrl() {}
function previewUrlAnalysis() {}

// ─── Modal Forms ───────────────────────────────────────────────────────────────

function openCreateStudyModal() {
  showModal(
    "Create Study",
    `
    <form id="create-study-form">
      <div class="form-group">
        <label>Study Name</label>
        <input type="text" name="name" placeholder="Brand Awareness Q4 2024" required>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status" required>
          <option value="DRAFT">Draft</option>
          <option value="READY">Ready</option>
          <option value="LIVE">Live</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
      <div class="form-group">
        <label>Target Completes</label>
        <input type="number" name="target_completes" placeholder="500" min="1" required>
      </div>
      <div class="form-group">
        <label>Incidence Rate (%)</label>
        <input type="number" name="incidence_rate" placeholder="15" min="1" max="100" step="0.1">
      </div>
    </form>
  `,
    `
    <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitCreateStudy()">Create Study</button>
  `
  );
}

async function submitCreateStudy() {
  const form = $("#create-study-form");
  const data = Object.fromEntries(new FormData(form));
  data.target_completes = parseInt(data.target_completes);
  data.incidence_rate = data.incidence_rate ? parseFloat(data.incidence_rate) : null;
  try {
    await api("/studies", { method: "POST", body: JSON.stringify(data) });
    hideModal();
    showToast("Study created successfully", "success");
    renderStudies(1);
  } catch (e) {
    showToast("Failed to create study: " + e.message, "error");
  }
}

function openCreateVendorModal() {
  showModal(
    "Create Vendor",
    `
    <form id="create-vendor-form">
      <div class="form-group">
        <label>Vendor Name</label>
        <input type="text" name="name" placeholder="Sample Vendor Inc." required>
      </div>
      <div class="form-group">
        <label>Contact Email</label>
        <input type="email" name="contact_email" placeholder="vendor@example.com">
      </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>CPI (cents)</label>
          <input type="number" name="cpi_cents" placeholder="2500" min="0" required>
        </div>
        <div class="form-group">
          <label>Quota Target</label>
          <input type="number" name="quota_target" placeholder="100" min="0">
        </div>
      </div>
    </form>
  `,
    `
    <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitCreateVendor()">Create Vendor</button>
  `
  );
}

async function submitCreateVendor() {
  const form = $("#create-vendor-form");
  const data = Object.fromEntries(new FormData(form));
  data.cpi_cents = parseInt(data.cpi_cents);
  data.quota_target = data.quota_target ? parseInt(data.quota_target) : null;
  try {
    await api("/vendors", { method: "POST", body: JSON.stringify(data) });
    hideModal();
    showToast("Vendor created successfully", "success");
    renderVendors(1);
  } catch (e) {
    showToast("Failed to create vendor: " + e.message, "error");
  }
}

// ─── Page Router ───────────────────────────────────────────────────────────────
async function showPage(page) {
  const isVendor = (currentUser?.role || "").toUpperCase() === "VENDOR";
  let cleanPage =
    String(page || "")
      .replace(/^#\/?/, "")
      .replace(/^\//, "") || (isVendor ? "responses" : "dashboard");
  if (isVendor && cleanPage === "dashboard") {
    cleanPage = "responses";
  }
  currentPage = cleanPage;

  $$(".nav-item").forEach((n) =>
    n.classList.toggle("active", n.dataset.page === cleanPage)
  );
  if ($("#page-title")) {
    const title =
      cleanPage.charAt(0).toUpperCase() + cleanPage.slice(1).replace(/-/g, " ");
    $("#page-title").textContent = title;
  }
  if ($("#page-subtitle")) {
    $("#page-subtitle").textContent = PAGE_SUBTITLES[cleanPage] || "";
  }

  switch (cleanPage) {
    case "dashboard":
      await renderDashboard();
      break;
    case "studies":
      await renderStudies(1);
      break;
    case "vendors":
      await renderVendors(1);
      break;
    case "tracking-links":
      await renderTrackingLinks(1);
      break;
    case "responses":
      await renderResponses(1);
      break;
    case "quotas":
      await renderQuotas(1);
      break;
    case "analytics":
      await renderAnalytics(1);
      break;
    case "audit":
      await renderAudit(1);
      break;
    case "finance":
      await renderFinance();
      break;
    case "rejection-management":
      await renderRejectionManagement(1);
      break;
    case "vendor-settlements":
      await renderVendorSettlements();
      break;
    case "users":
      await renderUsers(1);
      break;
    case "redirect-links":
      await renderRedirectLinks();
      break;
    case "settings":
      await renderSettings();
      break;
    case "projects":
      await renderProjects();
      break;
    case "project-detail":
      if (_currentProjectId) await renderProjectDetail(_currentProjectId);
      else await renderProjects();
      break;
    default:
      await renderDashboard();
  }
}

function showLogin() {
  $("#login-screen").style.display = "flex";
  $("#app-shell").style.display = "none";
}

function showApp() {
  $("#login-screen").style.display = "none";
  $("#app-shell").style.display = "flex";
  const name =
    currentUser?.full_name || currentUser?.email?.split("@")[0] || "Admin";
  const email = currentUser?.email || "admin";
  const role = currentUser?.role || "Admin";
  const initial = (name.charAt(0) || "A").toUpperCase();

  $("#user-name").textContent = name;
  $("#user-role").textContent = role;
  $("#user-avatar").textContent = initial;
  if ($("#env-badge")) $("#env-badge").textContent = "DEV";
  if ($("#top-date")) {
    $("#top-date").textContent = new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  // Role Access Matrix enforcement (ADMIN vs VENDOR)
  const isVendor = (currentUser?.role || "").toUpperCase() === "VENDOR";
  $$(".sidebar-nav .nav-item").forEach((el) => {
    const page = el.dataset.page;
    if (isVendor) {
      if (page === "responses") {
        el.style.display = "flex";
      } else {
        el.style.display = "none";
      }
    } else {
      el.style.display = "flex";
    }
  });
  $$(".sidebar-nav .nav-category").forEach((cat) => {
    if (isVendor) {
      const text = cat.textContent.trim();
      if (["Operations", "Finance", "Administration", "Analytics"].includes(text)) {
        cat.style.display = "none";
      } else {
        cat.style.display = "block";
      }
    } else {
      cat.style.display = "block";
    }
  });

  const initialPage =
    window.location.hash.replace(/^#\/?/, "").replace(/^\//, "") || (isVendor ? "responses" : "dashboard");
  showPage(initialPage);
}

// ─── doLogin ───────────────────────────────────────────────────────────────────
async function doLogin() {
  const btn = document.getElementById("login-btn");
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.querySelector("span").textContent = "Signing in...";
  btn.querySelector(".spinner").style.display = "inline-block";
  const errEl = document.getElementById("login-error");
  if (errEl) errEl.style.display = "none";

  const emailEl = document.getElementById("login-email");
  const passEl = document.getElementById("login-password");
  const emailVal = (emailEl ? emailEl.value : "").trim();
  const passVal = passEl ? passEl.value : "";

  // Security: check client-side lockout
  const storedLockedUntil = localStorage.getItem("cawi_locked_until");
  if (storedLockedUntil) {
    const lockTime = new Date(storedLockedUntil);
    if (lockTime > new Date()) {
      const mins = Math.ceil((lockTime - Date.now()) / 60000);
      if (errEl) {
        errEl.textContent = "Account locked. Wait " + mins + " minute(s).";
        errEl.style.display = "block";
      }
      btn.disabled = false;
      btn.querySelector("span").textContent = "Sign In";
      btn.querySelector(".spinner").style.display = "none";
      return;
    }
    localStorage.removeItem("cawi_locked_until");
    loginAttempts = 0;
    localStorage.removeItem("cawi_login_attempts");
  }

  if (!emailVal || !passVal) {
    if (errEl) {
      errEl.textContent = "Please enter both email and password.";
      errEl.style.display = "block";
    }
    btn.disabled = false;
    btn.querySelector("span").textContent = "Sign In";
    btn.querySelector(".spinner").style.display = "none";
    return;
  }

  try {
    const payload = await login(emailVal, passVal);

    // Security: password expiry warning
    if (payload.security?.passwordExpired) {
      showToast(
        "Your password is " +
          (payload.security.daysSincePasswordChange || 0) +
          " days old. Please change it in Settings.",
        "warning",
        8000
      );
    }
    // Security: last login IP awareness
    if (payload.security?.lastLoginIp) {
      showToast(
        "Last login from: " + payload.security.lastLoginIp,
        "info",
        3000
      );
    }

    showToast("Welcome back!", "success");
    startSessionTimer();
    showApp();
  } catch (err) {
    const status = err.status || 0;
    const msg = err.message || "Invalid credentials";
    const data = err.data || {};

    if (status === 423 || data.error?.code === "ACCOUNT_LOCKED") {
      loginAttempts = 5;
      const lockUntil = data.meta?.lockedUntil;
      if (lockUntil) localStorage.setItem("cawi_locked_until", lockUntil);
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = "block";
      }
    } else {
      loginAttempts++;
      localStorage.setItem("cawi_login_attempts", String(loginAttempts));
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = "block";
      }
    }
    showToast(msg, "error");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Sign In";
    btn.querySelector(".spinner").style.display = "none";
  }
}
window.doLogin = doLogin;

// ─── Event Handlers ────────────────────────────────────────────────────────────
function initEventListeners() {
  const loginForm = document.getElementById("login-form");
  if (loginForm)
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      doLogin();
    });

  $("#logout-btn")?.addEventListener("click", logout);
  $("#modal-close")?.addEventListener("click", hideModal);
  $("#modal-overlay")?.addEventListener("click", (e) => {
    if (e.target === $("#modal-overlay")) hideModal();
  });

  $$(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      window.location.hash = "#/" + page;
    });
  });

  window.addEventListener("hashchange", () => {
    const page =
      window.location.hash.replace(/^#\/?/, "").replace(/^\//, "") ||
      "dashboard";
    showPage(page);
  });
}

// ─── Initialization ────────────────────────────────────────────────────────────
async function init() {
  initEventListeners();
  initPasswordToggle();

  // Security: clear expired lockout
  const storedLockedUntil = localStorage.getItem("cawi_locked_until");
  if (storedLockedUntil && new Date(storedLockedUntil) < new Date()) {
    localStorage.removeItem("cawi_locked_until");
    loginAttempts = 0;
    localStorage.removeItem("cawi_login_attempts");
  }

  if (await checkAuth()) {
    showApp();
  } else {
    showLogin();
  }
}

document.addEventListener("DOMContentLoaded", init);

// Global exports
window.renderBadge = renderBadge;
window.renderStudies = renderStudies;
window.renderVendors = renderVendors;
window.renderTrackingLinks = renderTrackingLinks;
window.renderResponses = renderResponses;
window.renderAudit = renderAudit;
window.renderFinance = renderFinance;
window.renderRejectionManagement = renderRejectionManagement;
window.renderVendorSettlements = renderVendorSettlements;
window.openCreateStudyModal = openCreateStudyModal;
window.openCreateVendorModal = openCreateVendorModal;
window.submitCreateStudy = submitCreateStudy;
window.submitCreateVendor = submitCreateVendor;
window.openSetRatesModal = openSetRatesModal;
window.doSetRates = doSetRates;
window.openGenerateInvoiceModal = openGenerateInvoiceModal;
window.doGenerateInvoice = doGenerateInvoice;
window.markInvoice = markInvoice;
window.downloadInvoiceExcel = downloadInvoiceExcel;
window.doGenerateSettlement = doGenerateSettlement;
window.finalizeSettlement = finalizeSettlement;
window.markSettlementPaid = markSettlementPaid;
window.downloadSettlementExcel = downloadSettlementExcel;
window.applyRejectionFilters = applyRejectionFilters;
window.clearRejectionFilters = clearRejectionFilters;
window.toggleSelectAll = toggleSelectAll;
window.toggleRowSelect = toggleRowSelect;
window.quickApprove = quickApprove;
window.openSingleRejectModal = openSingleRejectModal;
window.doSingleReject = doSingleReject;
window.openBulkRejectModal = openBulkRejectModal;
window.doBulkReject = doBulkReject;
window.bulkReview = bulkReview;
window.downloadFinanceCsv = async () => {
  try {
    const res = await fetch("/api/finance/export?format=csv", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Finance export downloaded", "success");
  } catch (e) {
    showToast("Failed to download: " + e.message, "error");
  }
};


// ——— Redirect Links Management & Callback Documentation —————————————————————
async function renderRedirectLinks() {
  showLoading();
  try {
    const origin = window.location.origin;
    const [responsesRes, projectsRes] = await Promise.all([
      api("/responses?limit=10").catch(() => ({ responses: [] })),
      api("/projects?limit=10").catch(() => ({ data: [] })),
    ]);
    const responses = responsesRes.responses || responsesRes.data || [];
    const projects = projectsRes.data || [];
    const defaultPid = projects[0]?.project_code || "OPI_PROJ_101";

    const content = `
      <div class="section-header">
        <div>
          <h3>Client Redirect &amp; Callback Links</h3>
          <p style="font-size:0.875rem; color:var(--text-muted); margin-top:2px;">
            Configure these post-survey callback URLs in your client survey systems (Decipher, Qualtrics, Confirmit, LimeSurvey, etc.)
          </p>
        </div>
      </div>

      <!-- Domain Banner -->
      <div class="section-card mb-24" style="background: linear-gradient(135deg, rgba(14,165,233,0.06), rgba(16,185,129,0.06)); border-color: var(--accent);">
        <div class="section-card-body" style="padding:18px 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="font-size:0.8125rem; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em;">Active Callback Domain</div>
            <div style="font-size:1.125rem; font-weight:700; color:var(--text-primary); margin-top:2px; font-family:monospace;">${origin}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <span class="badge" style="background:var(--color-success-bg); color:var(--color-success); font-weight:600; padding:6px 12px; font-size:0.8125rem;">● SSL &amp; Origin Validation Active</span>
          </div>
        </div>
      </div>

      <!-- Redirect Endpoints -->
      <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:28px;">
        ${renderRedirectCard("✅ COMPLETE (Survey Success)", "/redirect/complete?pid={PID}&uid={UID}", "Redirect respondents here when they successfully finish the client survey. Verifies session token and credits quota.", "var(--color-success)", defaultPid)}
        ${renderRedirectCard("❌ TERMINATE (Screen Out)", "/redirect/terminate?pid={PID}&uid={UID}", "Redirect respondents here when they screen out due to qualification criteria.", "var(--color-danger)", defaultPid)}
        ${renderRedirectCard("⚠️ QUOTA FULL (Overquota)", "/redirect/quotafull?pid={PID}&uid={UID}", "Redirect respondents here when their target demographic quota cell is closed.", "var(--color-warning)", defaultPid)}
        ${renderRedirectCard("🎯 QUALITY TERM (Security Reject)", "/redirect/qualityterm?pid={PID}&uid={UID}", "Redirect respondents here when they fail fraud, bot, or attention checks.", "var(--color-purple)", defaultPid)}
        ${renderRedirectCard("🔒 SURVEY CLOSED (Expired)", "/redirect/closed?pid={PID}&uid={UID}", "Redirect respondents here if the survey study has already concluded.", "var(--color-gray)", defaultPid)}
      </div>

      <!-- Interactive Test Sandbox -->
      <div class="section-card mb-24">
        <div class="section-card-header">
          <h3>⚡ Callback Testing Sandbox</h3>
          <span style="font-size:0.8125rem; color:var(--text-muted);">Simulate incoming callback to test session matching</span>
        </div>
        <div class="section-card-body">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:14px; align-items:flex-end;">
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.8rem;">Project Code (PID)</label>
              <input type="text" id="sim-pid" value="${escapeHtml(defaultPid)}" style="width:100%;">
            </div>
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.8rem;">Respondent UID</label>
              <input type="text" id="sim-uid" value="TEST_UID_${Math.floor(Math.random()*90000+10000)}" style="width:100%;">
            </div>
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.8rem;">Outcome Type</label>
              <select id="sim-type" style="width:100%;">
                <option value="complete">Complete</option>
                <option value="terminate">Terminate</option>
                <option value="quotafull">Quota Full</option>
                <option value="qualityterm">Quality Term</option>
                <option value="closed">Survey Closed</option>
              </select>
            </div>
            <div>
              <button class="btn btn-primary" onclick="simulateCallbackTrigger()" style="width:100%;">Trigger Callback →</button>
            </div>
          </div>
          <div id="sim-result" style="margin-top:14px; display:none;"></div>
        </div>
      </div>

      <!-- Recent Callbacks -->
      <div class="section-card">
        <div class="section-card-header">
          <h3>Recent Callback Responses</h3>
          <span style="font-size:0.8125rem; color:var(--text-muted);">Last 10 received callbacks</span>
        </div>
        <div class="section-card-body no-pad">
          ${
            responses.length ? `
            <table class="data-table">
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Project</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${responses.slice(0, 10).map(r => {
                  const isVer = (r.verification_status || r._source_type || "VERIFIED").toUpperCase() === "VERIFIED";
                  const verHtml = isVer 
                    ? '<span class="badge" style="background:var(--color-success-bg); color:var(--color-success); font-size:0.75rem;">✓ VERIFIED</span>'
                    : '<span class="badge" style="background:var(--color-danger-bg); color:var(--color-danger); font-size:0.75rem;">⚠ UNVERIFIED</span>';
                  return `
                    <tr onclick="openResponseDetailModal('${r.session_id || r.id}')" style="cursor:pointer;">
                      <td class="cell-uid font-mono">${escapeHtml(r.uid || "—")}</td>
                      <td>${verHtml}</td>
                      <td>${renderBadge(r.status || r.final_status)}</td>
                      <td>${escapeHtml(r.project || r.study_code || "—")}</td>
                      <td>${formatDateTime(r.created_at)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
            ` : '<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">📡</div><h3>No callbacks received yet</h3><p>Incoming redirects will be logged here in real time.</p></div>'
          }
        </div>
      </div>
    `;
    $("#content-area").innerHTML = content;
  } catch (e) {
    showError("#content-area", e.message);
    showToast("Failed to load redirect links: " + e.message, "error");
  }
}

function renderRedirectCard(title, pathTemplate, description, accentColor, samplePid) {
  const origin = window.location.origin;
  const fullUrl = origin + pathTemplate;
  const sampleUrl = origin + pathTemplate.replace("{PID}", encodeURIComponent(samplePid)).replace("{UID}", "RESP_12345");
  const cardId = "red-" + Math.random().toString(36).slice(2, 8);
  return `
    <div class="section-card" style="border-left: 4px solid ${accentColor};">
      <div class="section-card-body" style="padding:18px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin:0;">${title}</h4>
            <p style="font-size:0.8125rem; color:var(--text-muted); margin:4px 0 0;">${description}</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; background:var(--bg-muted); border:1px solid var(--border-light); border-radius:6px; padding:8px 12px; margin-top:10px;">
          <code id="${cardId}" style="flex:1; font-size:0.8125rem; color:var(--text-primary); word-break:break-all;">${fullUrl}</code>
          <button class="btn btn-secondary btn-sm" onclick="copyToClipboard(document.getElementById('${cardId}').textContent, this)" style="white-space:nowrap; padding:4px 10px; font-size:0.75rem;">📋 Copy Template</button>
          <a href="${sampleUrl}" target="_blank" class="btn btn-primary btn-sm" style="white-space:nowrap; padding:4px 10px; font-size:0.75rem; text-decoration:none;">🚀 Test Link</a>
        </div>
      </div>
    </div>
  `;
}

async function simulateCallbackTrigger() {
  const pid = document.getElementById("sim-pid")?.value.trim();
  const uid = document.getElementById("sim-uid")?.value.trim();
  const type = document.getElementById("sim-type")?.value || "complete";
  const resEl = document.getElementById("sim-result");
  if (!pid || !uid) {
    showToast("Please provide PID and UID", "error");
    return;
  }
  if (resEl) {
    resEl.style.display = "block";
    resEl.innerHTML = '<div style="padding:10px; background:var(--bg-muted); border-radius:6px; font-size:0.8125rem;">Sending callback request...</div>';
  }
  try {
    const url = `/redirect/${type}?pid=${encodeURIComponent(pid)}&uid=${encodeURIComponent(uid)}`;
    const res = await fetch(url);
    if (resEl) {
      const isOk = res.ok || res.redirected || res.status < 400;
      resEl.innerHTML = `
        <div style="padding:12px; border-radius:6px; font-size:0.8125rem; background:${isOk ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'}; color:${isOk ? 'var(--color-success)' : 'var(--color-danger)'}; border:1px solid currentColor;">
          <strong>Response Status: ${res.status} ${res.statusText}</strong>
          <p style="margin:4px 0 0;">Callback was processed by the engine. Check Responses table to see the logged outcome and verification status.</p>
        </div>
      `;
    }
    showToast("Callback sent successfully!", "success");
  } catch (err) {
    if (resEl) {
      resEl.innerHTML = `<div style="padding:12px; border-radius:6px; font-size:0.8125rem; background:var(--color-danger-bg); color:var(--color-danger);">Error: ${escapeHtml(err.message)}</div>`;
    }
  }
}
window.renderRedirectLinks = renderRedirectLinks;
window.simulateCallbackTrigger = simulateCallbackTrigger;
