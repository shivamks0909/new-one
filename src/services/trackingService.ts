import * as crypto from 'crypto';
import { db } from '../db';
import { config } from '../config';
import {
  Study, TrackingLink, Session, ResponseEvent, ResponseRecord,
} from '../types';

// ─── UID Normalization ────────────────────────────────────────────────────────

const MAX_UID_LENGTH = 255;

export function normalizeUid(uid: string): { normalized: string; original: string; error?: string } {
  if (!uid || typeof uid !== 'string') {
    return { normalized: '', original: uid || '', error: 'UID is required' };
  }

  // Strip leading/trailing whitespace and control chars
  const cleaned = uid.trim().replace(/[\x00-\x1F\x7F]/g, '');

  if (cleaned.length === 0) {
    return { normalized: '', original: uid, error: 'UID is empty after normalization' };
  }
  if (cleaned.length > MAX_UID_LENGTH) {
    return { normalized: '', original: uid, error: `UID exceeds maximum length of ${MAX_UID_LENGTH}` };
  }
  // Basic encoding check — no unencoded spaces or unsafe chars
  if (/[<>"';&]/.test(cleaned)) {
    return { normalized: '', original: uid, error: 'UID contains invalid characters' };
  }

  return { normalized: cleaned.toUpperCase(), original: cleaned };
}

// ─── Status Normalization ─────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  complete:        'COMPLETE',
  completed:       'COMPLETE',
  c:               'COMPLETE',
  '1':             'COMPLETE',
  success:         'COMPLETE',
  finish:          'COMPLETE',
  finished:        'COMPLETE',
  terminate:       'TERMINATE',
  terminated:      'TERMINATE',
  t:               'TERMINATE',
  '2':             'TERMINATE',
  screened:        'TERMINATE',
  quota:           'QUOTA_FULL',
  quota_full:      'QUOTA_FULL',
  quotafull:       'QUOTA_FULL',
  qf:              'QUOTA_FULL',
  '3':             'QUOTA_FULL',
  over_quota:      'QUOTA_FULL',
  security:        'SECURITY_REJECT',
  security_reject: 'SECURITY_REJECT',
  securityreject:  'SECURITY_REJECT',
  fraud:           'SECURITY_REJECT',
  '4':             'SECURITY_REJECT',
  blocked:         'SECURITY_REJECT',
  invalid:         'INVALID',
  close:           'CLOSED',
  closed:          'CLOSED',
  expired:         'EXPIRED',
  in_progress:     'IN_PROGRESS',
  inprogress:      'IN_PROGRESS',
  started:         'STARTED',
};

export function normalizeStatus(raw: string): string {
  const key = (raw || '').toLowerCase().replace(/[-\s]/g, '_');
  return STATUS_MAP[key] || raw.toUpperCase();
}

// ─── State Machine & Transitions ──────────────────────────────────────────────

const TERMINAL_STATES = new Set(['COMPLETE', 'TERMINATE', 'QUOTA_FULL', 'SECURITY_REJECT', 'CLOSED', 'EXPIRED']);

export interface StateTransitionResult {
  finalStatus: string;
  isDuplicate: boolean;
  isCounted: boolean;
  rejectionReason?: string;
  terminalAt?: string;
  firstTerminalEvent?: string;
}

export function applyStateTransition(currentStatus: string, newStatus: string): StateTransitionResult {
  const current = (currentStatus || 'IN_PROGRESS').toUpperCase();
  const next = normalizeStatus(newStatus);

  if (TERMINAL_STATES.has(current)) {
    return {
      finalStatus: current,
      isDuplicate: true,
      isCounted: false,
      rejectionReason: `Status already terminal: ${current}`,
      firstTerminalEvent: current,
    };
  }

  const isComplete = next === 'COMPLETE';
  return {
    finalStatus: next,
    isDuplicate: false,
    isCounted: isComplete,
    terminalAt: new Date().toISOString(),
    firstTerminalEvent: next,
  };
}

// ─── Idempotency Key ──────────────────────────────────────────────────────────

export function generateIdempotencyKey(
  studyId: string,
  vendorId: string,
  normalizedUid: string,
  normalizedStatus: string,
  externalTransactionId?: string,
): string {
  const parts = [studyId, vendorId, normalizedUid, normalizedStatus];
  if (externalTransactionId) parts.push(externalTransactionId);
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

// ─── HMAC Signature Validation ────────────────────────────────────────────────

export function validateCallbackSignature(
  payload: string,
  receivedSignature: string | undefined,
  secret: string,
): boolean {
  if (!receivedSignature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature.replace(/^sha256=/, ''), 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}

// ─── Redirect Signature (Signed URLs) ──────────────────────────────────────────

export interface RedirectSignaturePayload {
  pid: string;
  uid: string;
  ts: number;      // Unix timestamp (seconds)
  nonce: string;   // Random nonce for replay protection
  outcome: string; // complete, terminate, quota, quality, close
}

const USED_NONCES = new Map<string, number>(); // nonce -> timestamp
const NONCE_CLEANUP_INTERVAL_MS = 60_000;
const NONCE_MAX_AGE_MS = (config.redirectSignatureTtlSeconds + 60) * 1000;

// Cleanup old nonces periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [nonce, ts] of USED_NONCES.entries()) {
      if (now - ts > NONCE_MAX_AGE_MS) {
        USED_NONCES.delete(nonce);
      }
    }
  }, NONCE_CLEANUP_INTERVAL_MS);
}

function generateNonce(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function signRedirectUrl(params: {
  pid: string;
  uid: string;
  outcome: string;
}): string {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const payload: RedirectSignaturePayload = { pid: params.pid, uid: params.uid, ts, nonce, outcome: params.outcome };
  const payloadStr = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', config.redirectHmacSecret).update(payloadStr).digest('hex');
  const encoded = Buffer.from(payloadStr).toString('base64url');
  return `${encoded}.${sig}`;
}

export function verifyRedirectSignature(sigParam: string | undefined): RedirectSignaturePayload | null {
  if (!sigParam) return null;
  const parts = sigParam.split('.');
  if (parts.length !== 2) return null;
  const [encoded, receivedSig] = parts;
  let payloadStr: string;
  try {
    payloadStr = Buffer.from(encoded, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
  // Verify HMAC
  const expectedSig = crypto.createHmac('sha256', config.redirectHmacSecret).update(payloadStr).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return null;
    }
  } catch {
    return null;
  }
  // Parse payload
  let payload: RedirectSignaturePayload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return null;
  }
  // Validate required fields
  if (!payload.pid || !payload.uid || !payload.ts || !payload.nonce || !payload.outcome) {
    return null;
  }
  // Check timestamp expiry
  const now = Math.floor(Date.now() / 1000);
  if (now - payload.ts > config.redirectSignatureTtlSeconds) {
    return null; // Expired
  }
  // Check nonce replay
  if (USED_NONCES.has(payload.nonce)) {
    return null; // Replay detected
  }
  // Mark nonce as used
  USED_NONCES.set(payload.nonce, Date.now());
  return payload;
}

// ─── Session Token / Link Code Generators ────────────────────────────────────

export function generateSessionToken(): string {
  return 'SES_' + crypto.randomBytes(16).toString('hex');
}

export function generateLinkCode(): string {
  return 'lnk_' + crypto.randomBytes(6).toString('hex');
}

// ─── IP Hashing ───────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return crypto.createHmac('sha256', config.authSecret).update(ip).digest('hex');
}

// ─── Session Expiry ───────────────────────────────────────────────────────────

export function isSessionExpired(session: Session): boolean {
  return new Date() > new Date(session.expires_at);
}

// ─── Fake Click Recording ────────────────────────────────────────────────────
// Records rejected callbacks for audit trail. Never creates a session or response.

export interface FakeClickEvent {
  study_id?: string | null;
  vendor_id?: string | null;
  project_id?: string | null;
  uid: string;
  normalized_uid: string;
  rejection_reason: string;
  raw_payload?: any;
  ip_address?: string | null;
  ip_hash?: string | null;
  user_agent?: string | null;
  provider?: string | null;
}

export async function recordFakeClick(event: FakeClickEvent): Promise<void> {
  try {
    await db.recordFakeClick(event);
  } catch (err: any) {
    console.error('[FakeClick] Failed to record:', err.message);
  }
}

// ─── IP Correlation ──────────────────────────────────────────────────────────
// Compares callback IP hash against session IP hash. Returns match status.
// Non-blocking — flags mismatch but doesn't reject the callback.

export function verifyCallbackIp(
  callbackIp: string,
  sessionIpHash: string | null,
): { match: boolean; reason: string } {
  if (!sessionIpHash) return { match: true, reason: 'No session IP to compare' };
  const callbackIpHash = hashIp(callbackIp);
  if (callbackIpHash === sessionIpHash) {
    return { match: true, reason: 'IP matches session origin' };
  }
  return { match: false, reason: 'IP mismatch — callback from different origin than session' };
}

// ─── Status Transition Gate ───────────────────────────────────────────────────

export interface TransitionResult {
  finalStatus: string;
  firstTerminalEvent: string | null;
  terminalAt: Date | null;
  isCounted: boolean;
  rejectionReason: string | null;
  isDuplicate: boolean;
}

export function evaluateStatusTransition(
  currentStatus: string,
  newStatus: string,
): TransitionResult {
  const normNew = normalizeStatus(newStatus);
  const now = new Date();

  // Terminal state immutability — terminal states are permanently locked
  if (['COMPLETE', 'TERMINATE', 'QUOTA_FULL', 'SECURITY_REJECT', 'EXPIRED'].includes(currentStatus)) {
    return {
      finalStatus: currentStatus,
      firstTerminalEvent: null,
      terminalAt: null,
      isCounted: false,
      rejectionReason: `Terminal status conflict: already ${currentStatus}`,
      isDuplicate: true,
    };
  }

  // Valid transitions from STARTED or IN_PROGRESS
  switch (normNew) {
    case 'COMPLETE':
      return { finalStatus: 'COMPLETE', firstTerminalEvent: 'COMPLETE', terminalAt: now, isCounted: true, rejectionReason: null, isDuplicate: false };
    case 'TERMINATE':
      return { finalStatus: 'TERMINATE', firstTerminalEvent: 'TERMINATE', terminalAt: now, isCounted: false, rejectionReason: null, isDuplicate: false };
    case 'QUOTA_FULL':
      return { finalStatus: 'QUOTA_FULL', firstTerminalEvent: 'QUOTA_FULL', terminalAt: now, isCounted: false, rejectionReason: null, isDuplicate: false };
    case 'SECURITY_REJECT':
      return { finalStatus: 'SECURITY_REJECT', firstTerminalEvent: 'SECURITY_REJECT', terminalAt: now, isCounted: false, rejectionReason: 'Security / fraud rejection', isDuplicate: false };
    case 'EXPIRED':
      return { finalStatus: 'EXPIRED', firstTerminalEvent: 'EXPIRED', terminalAt: now, isCounted: false, rejectionReason: null, isDuplicate: false };
    default:
      return { finalStatus: currentStatus, firstTerminalEvent: null, terminalAt: null, isCounted: false, rejectionReason: `Unknown status: ${newStatus}`, isDuplicate: false };
  }
}

// ─── Survey Redirect URL Builder ──────────────────────────────────────────────

export function buildSurveyRedirect(link: TrackingLink, session: Session): string {
  const { base_url } = link;
  const encodedUid = encodeURIComponent(session.uid);

  let redirectUrl = base_url || '';

  let matched = false;
  const placeholders = [
    /\[identifier\]/gi,
    /\{identifier\}/gi,
    /\[UID\]/gi,
    /\[uid\]/gi,
    /\{UID\}/gi,
    /\{uid\}/gi,
    /\{\{UID\}\}/gi,
    /\{\{uid\}\}/gi,
    /\[RESPONDENT_ID\]/gi,
    /\{RESPONDENT_ID\}/gi,
    /\[respondent\]/gi,
    /\{respondent\}/gi,
  ];

  for (const ph of placeholders) {
    if (ph.test(redirectUrl)) {
      redirectUrl = redirectUrl.replace(ph, encodedUid);
      matched = true;
    }
  }

  // If template has no placeholder and UID is not yet in URL, cleanly append preserving structure
  if (!matched && !redirectUrl.includes(encodedUid)) {
    const separator = redirectUrl.includes('?') ? '&' : '?';
    redirectUrl = `${redirectUrl}${separator}uid=${encodedUid}`;
  }

  // Replace optional secondary placeholders if present in template
  redirectUrl = redirectUrl
    .replace(/\[pid\]/gi, encodedUid)
    .replace(/\{pid\}/g, encodedUid)
    .replace(/\{vid\}/g, encodeURIComponent(session.vendor_id));

  // Open redirect protection — validate protocol in production without altering URL
  if (config.nodeEnv === 'production' && redirectUrl.startsWith('http')) {
    try {
      const parsed = new URL(redirectUrl);
      if (parsed.protocol !== 'https:') {
        console.warn(`[Redirect] Blocked non-HTTPS URL in production: ${redirectUrl}`);
        return config.appBaseUrl;
      }
    } catch {
      return config.appBaseUrl;
    }
  }

  return redirectUrl;
}

// ─── Link Validation & Auto-Discovery ──────────────────────────────────────────

export async function validateLink(linkCode: string, vendorId?: string): Promise<{
  valid: boolean;
  link?: TrackingLink;
  study?: Study;
  error?: string;
}> {
  // 1. Try standard tracking link lookup by code
  let link = await db.getTrackingLinkByCode(linkCode);

  if (!link) {
    // 2. If not found, attempt Auto-Discovery of external offer ID (e.g. OF02902761NW3C)
    try {
      const { discoveryService } = await import('./discoveryService');
      const { study } = await discoveryService.resolveOrCreateExternalOffer(linkCode);

      // Find or assign vendor
      const links = await db.getTrackingLinks({ study_id: study.id });
      link = links[0];

      if (!link) {
        // Fallback vendor
        const vendors = await db.getVendors(true);
        const selectedVendorId = vendorId || vendors[0]?.id;
        if (selectedVendorId) {
          link = await db.createTrackingLink({
            study_id: study.id,
            vendor_id: selectedVendorId,
            link_code: `lnk_${linkCode.toLowerCase()}`,
            base_url: study.survey_url || `https://pmtool.zephyrsample.com/Survey?offerId=${linkCode}&zid={uid}`,
            uid_mode: 'PROVIDED_UID',
            status: 'ACTIVE'
          });
        }
      }

      if (link && study) {
        return { valid: true, link, study };
      }
    } catch (err: any) {
      console.warn(`[AutoDiscovery] Failed for linkCode=${linkCode}:`, err.message);
    }

    return { valid: false, error: 'Unknown tracking link or external offer' };
  }

  if (link.status !== 'ACTIVE') return { valid: false, link, error: 'Link is not active' };

  const study = await db.getStudy(link.study_id);
  if (!study) return { valid: false, link, error: 'Study not found' };
  if (!['LIVE', 'READY'].includes(study.status)) {
    return { valid: false, link, study, error: `Study is not live (status: ${study.status})` };
  }

  const now = new Date();
  if (study.start_at && now < new Date(study.start_at)) {
    return { valid: false, link, study, error: 'Study has not started yet' };
  }
  if (study.end_at && now > new Date(study.end_at)) {
    return { valid: false, link, study, error: 'Study has ended' };
  }

  const studyVendors = await db.getStudyVendors(link.study_id);
  const vendorAssigned = studyVendors.some(
    (sv: any) => sv.vendor_id === link.vendor_id && sv.status === 'ACTIVE',
  );
  if (!vendorAssigned) {
    return { valid: false, link, study, error: 'Vendor not assigned or inactive for this study' };
  }

  return { valid: true, link, study };
}

// ─── Resolve or Create Session ────────────────────────────────────────────────

export async function resolveOrCreateSession(
  studyId: string,
  vendorId: string,
  trackingLinkId: string,
  rawUid: string,
  ipAddress: string,
  userAgent: string | null,
  referrer: string | null,
  landingUrl: string,
): Promise<Session> {
  const { normalized, original, error: uidError } = normalizeUid(rawUid);
  if (uidError) throw new Error(uidError);

  // Find existing session for this study/vendor/UID
  const existing = await db.findSession(studyId, vendorId, normalized);
  if (existing) {
    await db.updateSession(existing.id, { last_seen_at: new Date() });
    return existing;
  }

  // Create new session
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1000);

  let projectId: string | null = null;
  let projectCode: string | null = null;
  try {
    const pRes = await db.pool.query(
      `SELECT p.id, p.project_code FROM projects p 
       JOIN studies s ON UPPER(p.project_code) = UPPER(s.study_code) 
       WHERE s.id::text = $1::text LIMIT 1`,
      [studyId]
    );
    if (pRes.rows[0]) {
      projectId = pRes.rows[0].id;
      projectCode = pRes.rows[0].project_code;
    }
  } catch (e) { /* ignore fallback error */ }

  const session = await db.createSession({
    session_token: sessionToken,
    study_id: studyId,
    vendor_id: vendorId,
    tracking_link_id: trackingLinkId,
    uid: original,
    normalized_uid: normalized,
    external_uid: null,
    ip_hash: hashIp(ipAddress),
    ip_address_encrypted_or_restricted_storage: true,
    user_agent: userAgent,
    country_detected: null,
    referrer,
    landing_url: landingUrl,
    initial_status: 'STARTED',
    current_status: 'STARTED',
    expires_at: expiresAt,
    metadata_json: {
      project_id: projectId,
      project_code: projectCode,
    },
  });

  // Create initial response record (IN_PROGRESS)
  await db.createResponseRecord({
    session_id: session.id,
    study_id: studyId,
    project_id: projectId,
    vendor_id: vendorId,
    uid: original,
    final_status: 'IN_PROGRESS',
  });

  await db.createAuditLog({
    user: 'system',
    action: 'SESSION_CREATED',
    entity: 'session',
    entity_id: session.id,
    before: null,
    after: { session_token: sessionToken, uid: original, study_id: studyId, vendor_id: vendorId },
    ip: ipAddress,
  });

  // Record LANDING event — proves respondent actually visited /start
  // Required by verifySessionExists gate before callbacks are accepted
  const landingKey = crypto
    .createHash('sha256')
    .update(`${studyId}|${vendorId}|${normalized}|LANDING`)
    .digest('hex');

  await db.createResponseEvent({
    session_id: session.id,
    study_id: studyId,
    vendor_id: vendorId,
    uid: original,
    event_type: 'LANDING',
    source: 'tracking_link',
    raw_payload: { link_code: trackingLinkId, uid: original, ip: ipAddress },
    normalized_payload: { event_type: 'LANDING', uid: normalized },
    event_key: landingKey,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return session;
}

// ─── Session Verification Gate ────────────────────────────────────────────────
// Verifies that a session exists with a LANDING event before allowing callbacks.
// This prevents fake pid+uid URL hits from creating phantom responses.

export interface SessionVerification {
  valid: boolean;
  session?: Session;
  error?: string;
}

export async function verifySessionExists(
  studyId: string,
  vendorId: string,
  rawUid: string,
): Promise<SessionVerification> {
  const { normalized, error: uidError } = normalizeUid(rawUid);
  if (uidError) return { valid: false, error: uidError };

  const session = await db.findSession(studyId, vendorId, normalized);
  if (!session) {
    return { valid: false, error: 'No valid session — respondent must complete landing first' };
  }

  if (isSessionExpired(session)) {
    return { valid: false, session, error: 'Session has expired' };
  }

  // Check for LANDING event — proves respondent actually visited /start
  const events = await db.getEventsBySession(session.id);
  const hasLanding = events.some(
    (e: any) => e.event_type === 'LANDING' || e.event_type === 'START',
  );
  if (!hasLanding) {
    return { valid: false, session, error: 'Session has no landing event — callback rejected' };
  }

  return { valid: true, session };
}

// ─── Callback Processing ──────────────────────────────────────────────────────

export interface CallbackResult {
  accepted: boolean;
  duplicate: boolean;
  sessionId: string;
  normalizedStatus: string;
  finalStatus: string;
  counted: boolean;
  reason: string | undefined;
  requestId: string;
  ip_mismatch?: boolean;
  ip_mismatch_reason?: string;
}

export async function processCallback(
  provider: string,
  studyId: string,
  vendorId: string,
  rawUid: string,
  rawStatus: string,
  transactionId: string | undefined,
  rawPayload: Record<string, any>,
  requestMeta: { ip_address?: string; user_agent?: string; referrer?: string; landing_url?: string },
): Promise<CallbackResult> {
  const requestId = crypto.randomBytes(8).toString('hex');

  const normalizedStatus = normalizeStatus(rawStatus);
  const { normalized: normalizedUid, original: uid, error: uidError } = normalizeUid(rawUid);

  if (uidError) {
    return {
      accepted: false, duplicate: false, sessionId: '',
      normalizedStatus, finalStatus: 'INVALID',
      counted: false, reason: uidError, requestId,
    };
  }

  const idempotencyKey = generateIdempotencyKey(studyId, vendorId, normalizedUid, normalizedStatus, transactionId);

  // ── Step 1: VERIFY session exists (no auto-creation) ────────────────────
  // Sessions are ONLY created by /start endpoints. Callbacks that arrive
  // without a pre-existing session with LANDING event are rejected.
  const links = await db.getTrackingLinks({ study_id: studyId, vendor_id: vendorId });
  const trackingLink = links[0];

  if (!trackingLink) {
    console.warn(`[Callback:${requestId}] No tracking link found for study=${studyId} vendor=${vendorId}`);
    return {
      accepted: false, duplicate: false, sessionId: '',
      normalizedStatus, finalStatus: 'INVALID', counted: false,
      reason: 'No tracking link found for study/vendor', requestId,
    };
  }

  const sessionVerification = await verifySessionExists(studyId, vendorId, uid);
  if (!sessionVerification.valid) {
    console.warn(`[Callback:${requestId}] Session verification failed: ${sessionVerification.error}`);

    // Record as fake click for audit trail
    const rejectionReason = sessionVerification.error?.includes('expired')
      ? 'EXPIRED_SESSION'
      : sessionVerification.error?.includes('landing')
        ? 'NO_LANDING_EVENT'
        : 'NO_SESSION';
    await recordFakeClick({
      study_id: studyId,
      vendor_id: vendorId,
      uid,
      normalized_uid: normalizedUid,
      rejection_reason: rejectionReason,
      raw_payload: { ...rawPayload, transaction_id: transactionId, request_id: requestId },
      ip_address: requestMeta.ip_address || null,
      ip_hash: requestMeta.ip_address ? undefined : null,
      user_agent: requestMeta.user_agent || null,
      provider,
    });

    return {
      accepted: false, duplicate: false, sessionId: sessionVerification.session?.id || '',
      normalizedStatus, finalStatus: 'INVALID', counted: false,
      reason: sessionVerification.error || 'Session verification failed', requestId,
    };
  }
  const session = sessionVerification.session!;

  // ── IP Correlation Check ────────────────────────────────────────────────
  // Flag if callback IP differs from session creation IP (informational, non-blocking)
  let ipMismatch = false;
  let ipMismatchReason = '';
  if (requestMeta.ip_address) {
    const ipCheck = verifyCallbackIp(requestMeta.ip_address, session.ip_hash);
    ipMismatch = !ipCheck.match;
    ipMismatchReason = ipCheck.reason;
    if (ipMismatch) {
      console.warn(`[Callback:${requestId}] ${ipMismatchReason}`);
    }
  }

  // ── Step 2: Atomic idempotency — try to insert event ────────────────────
  const eventInserted = await db.createResponseEvent({
    session_id: session.id,
    study_id: studyId,
    vendor_id: vendorId,
    uid,
    event_type: 'CALLBACK_RECEIVED',
    source: provider,
    raw_payload: { ...rawPayload, transaction_id: transactionId, request_id: requestId },
    normalized_payload: { event_type: normalizedStatus, uid: normalizedUid, provider },
    event_key: idempotencyKey,
    ip_address: requestMeta.ip_address || null,
    user_agent: requestMeta.user_agent || null,
  });

  // If INSERT returned nothing → ON CONFLICT triggered → duplicate
  if (!eventInserted) {
    const existingResponse = await db.getResponseBySession(session.id);
    return {
      accepted: false,
      duplicate: true,
      sessionId: session.id,
      normalizedStatus,
      finalStatus: existingResponse?.final_status ?? 'IN_PROGRESS',
      counted: false,
      reason: 'Duplicate event — already processed',
      requestId,
    };
  }

  // ── Step 3: Apply state machine ──────────────────────────────────────────
  let currentResponse = await db.getResponseBySession(session.id);
  if (!currentResponse) {
    currentResponse = await db.createResponseRecord({
      session_id: session.id,
      study_id: studyId,
      vendor_id: vendorId,
      uid: uid,
      final_status: 'IN_PROGRESS',
    });
  }
  const currentStatus = currentResponse?.final_status ?? session.current_status;
  const transition = applyStateTransition(currentStatus, normalizedStatus);

  if (transition.isDuplicate) {
    return {
      accepted: false,
      duplicate: true,
      sessionId: session.id,
      normalizedStatus,
      finalStatus: transition.finalStatus,
      counted: false,
      reason: transition.rejectionReason ?? 'Duplicate terminal state',
      requestId,
    };
  }

  // ── Step 4: Persist outcome ──────────────────────────────────────────────
  const loiSeconds = transition.terminalAt
    ? Math.max(0, Math.round((new Date(transition.terminalAt).getTime() - new Date(session.created_at || Date.now()).getTime()) / 1000))
    : undefined;

  const resolvedProjectId = session.metadata_json?.project_id || undefined;

  await db.updateResponseRecord(session.id, {
    project_id:           resolvedProjectId,
    final_status:        transition.finalStatus,
    first_terminal_event: transition.firstTerminalEvent,
    terminal_at:          transition.terminalAt,
    is_counted:           transition.isCounted,
    counted_at:           transition.isCounted ? new Date() : null,
    rejection_reason:     transition.rejectionReason,
    callback_source:      provider,
    loi_seconds:          loiSeconds,
  });

  // ── Step 5: Update session current_status ────────────────────────────────
  const sessionUpdates: Partial<any> = {
    current_status: transition.finalStatus,
    last_seen_at: new Date(),
  };
  if (transition.finalStatus === 'COMPLETE') sessionUpdates.completed_at = new Date();
  if (transition.finalStatus === 'TERMINATE') sessionUpdates.terminated_at = new Date();
  await db.updateSession(session.id, sessionUpdates);

  // ── Step 6: Audit ────────────────────────────────────────────────────────
  await db.createAuditLog({
    user: 'system',
    action: 'CALLBACK_PROCESSED',
    entity: 'response',
    entity_id: session.id,
    before: { final_status: currentStatus },
    after: {
      final_status: transition.finalStatus,
      is_counted: transition.isCounted,
      provider,
      request_id: requestId,
    },
    ip: requestMeta.ip_address || null,
  });

  return {
    accepted: true,
    duplicate: false,
    sessionId: session.id,
    normalizedStatus,
    finalStatus: transition.finalStatus,
    counted: transition.isCounted,
    reason: transition.rejectionReason ?? undefined,
    requestId,
    ip_mismatch: ipMismatch,
    ip_mismatch_reason: ipMismatchReason,
  };
}

// ─── TrackingService class (kept for backward compatibility) ──────────────────
export class TrackingService {
  normalizeUid   = normalizeUid;
  normalizeStatus = normalizeStatus;
  generateIdempotencyKey = generateIdempotencyKey;
  processCallback = processCallback;
  resolveOrCreateSession = resolveOrCreateSession;
  buildSurveyRedirect = buildSurveyRedirect;
  validateLink = validateLink;
  isSessionExpired = isSessionExpired;
  verifySessionExists = verifySessionExists;
  generateLinkCode = generateLinkCode;
  generateSessionToken = generateSessionToken;
  recordFakeClick = recordFakeClick;
  verifyCallbackIp = verifyCallbackIp;
}

export const trackingService = new TrackingService();