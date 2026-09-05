import { db } from '../db';
import { processCallback, CallbackResult, validateCallbackSignature, recordFakeClick, FakeClickEvent } from './trackingService';
import { config } from '../config';
import { Session, TrackingLink, ResponseEvent, ResponseRecord } from '../types';

export class CallbackService {

  /**
   * Main callback processing entry point.
   * Delegates to the centralised trackingService.processCallback().
   */
  async processCallback(
    provider: string,
    studyId: string,
    vendorId: string,
    uid: string,
    status: string,
    transactionId?: string,
    rawPayload: Record<string, any> = {},
    requestMetadata: Record<string, any> = {},
  ): Promise<CallbackResult> {
    return processCallback(
      provider, studyId, vendorId, uid, status,
      transactionId, rawPayload, requestMetadata,
    );
  }

  /**
   * Validate HMAC signature on a callback request.
   * The survey platform signs the raw request body with the shared secret.
   */
  validateSignature(rawBody: string, signature: string | undefined): boolean {
    if (config.isDev()) {
      // In development, skip HMAC check unless secret is explicitly set
      if (config.callbackHmacSecret === 'change-this-in-production') return true;
    }
    return validateCallbackSignature(rawBody, signature, config.callbackHmacSecret);
  }

  /** Get session by UID + study (for debugging) */
  async getSessionByUid(
    studyId: string,
    uid: string,
  ): Promise<{ session: Session | null; link: TrackingLink | null }> {
    const { normalizeUid } = await import('./trackingService.js');
    const { normalized } = normalizeUid(uid);
    const sessions = await db.getSessionsByStudy(studyId);
    const matchingSession = sessions.find((s: any) => s.normalized_uid === normalized) ?? null;
    let link: TrackingLink | null = null;
    if (matchingSession) {
      const links = await db.getTrackingLinks({ study_id: studyId, vendor_id: matchingSession.vendor_id });
      link = links[0] ?? null;
    }
    return { session: matchingSession, link };
  }

  async getResponseBySessionId(sessionId: string): Promise<ResponseRecord | null> {
    return db.getResponseBySession(sessionId);
  }

  async getEventsBySessionId(sessionId: string): Promise<ResponseEvent[]> {
    return db.getEventsBySession(sessionId) as Promise<ResponseEvent[]>;
  }

  /** Validate required callback fields */
  validateCallbackRequest(
    _provider: string,
    payload: Record<string, any>,
  ): { valid: boolean; error?: string } {
    const required = ['study_id', 'vendor_id', 'uid', 'status'];
    for (const field of required) {
      if (!payload[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    return { valid: true };
  }

  /**
   * Verify that a valid session exists with LANDING event before callback processing.
   */
  async verifySession(
    studyId: string,
    vendorId: string,
    uid: string,
  ): Promise<{ valid: boolean; error?: string; sessionId?: string }> {
    const { verifySessionExists } = await import('./trackingService.js');
    const result = await verifySessionExists(studyId, vendorId, uid);
    return {
      valid: result.valid,
      error: result.error,
      sessionId: result.session?.id,
    };
  }

  /**
   * Full session trace for operator debugging.
   * Returns the complete journey: session → events → response
   */
  async getSessionTrace(sessionId: string): Promise<{
    session: any | null;
    events: ResponseEvent[];
    response: ResponseRecord | null;
    summary: Record<string, any>;
  }> {
    const session = await db.getSessionById(sessionId);
    const events  = session ? await db.getEventsBySession(sessionId) as ResponseEvent[] : [];
    const response = session ? await db.getResponseBySession(sessionId) : null;

    return {
      session,
      events,
      response,
      summary: {
        session_found:   !!session,
        event_count:     events.length,
        response_found:  !!response,
        final_status:    response?.final_status ?? null,
        is_counted:      response?.is_counted ?? false,
        event_types:     events.map((e) => e.event_type),
      },
    };
  }

  /**
   * Record a fake/unverified click for audit trail.
   * Called when a callback arrives without a valid tracking session.
   */
  async recordFakeClick(event: FakeClickEvent): Promise<void> {
    return recordFakeClick(event);
  }

  /**
   * Retrieve paginated fake click events with optional filters.
   */
  async getFakeClicks(filters?: {
    study_id?: string;
    uid?: string;
    rejection_reason?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: any[]; total: number }> {
    return db.getFakeClicks(filters);
  }

  /**
   * Get aggregated fake click stats by rejection reason for a study.
   */
  async getFakeClickStats(studyId: string): Promise<any[]> {
    return db.getFakeClickStats(studyId);
  }
}

export const callbackService = new CallbackService();