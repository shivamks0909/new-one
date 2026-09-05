import { Pool, QueryResult } from 'pg';
import { config } from '../config';

// Reads connection string from environment â€” never hardcoded
const DB_URL = config.databaseUrl;
const USE_SQLITE = !DB_URL || DB_URL.includes('sqlite') || process.env.USE_SQLITE === 'true';

export class Database {
  public pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    } as any);

    this.pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });

    // Wrap pool.query with retry for transient TLS/connection reset errors from pooler
    const originalQuery = this.pool.query.bind(this.pool);
    this.pool.query = (async (...args: any[]) => {
      try {
        return await (originalQuery as any)(...args);
      } catch (err: any) {
        const isTransient = /SSL routines|bad record mac|ECONNRESET|ETIMEDOUT|Connection terminated/i.test(err?.message || '');
        if (isTransient) {
          console.warn('[DB] Retrying query on transient connection/SSL error:', err.message);
          return await (originalQuery as any)(...args);
        }
        throw err;
      }
    }) as any;
  }

  private async query(text: string, params?: any[]): Promise<QueryResult> {
    return this.pool.query(text, params);
  }

  async getUserByAuthId(authUserId: string): Promise<any> {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE auth_user_id = $1',
      [authUserId]
    );
    return rows[0] ?? null;
  }

  async getUserByEmail(email: string): Promise<any> {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return rows[0] ?? null;
  }

  async getUserById(id: string): Promise<any> {
    const { rows } = await this.pool.query(
      `SELECT u.*, v.name as vendor_name, v.vendor_code
       FROM users u
       LEFT JOIN vendors v ON v.id = u.vendor_id
       WHERE u.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async createUser(user: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO users (auth_user_id, full_name, email, password_hash, role, vendor_id, status, force_password_change, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        user.auth_user_id || require('crypto').randomUUID(),
        user.full_name,
        user.email,
        user.password_hash,
        user.role || 'VENDOR',
        user.vendor_id || null,
        user.status ?? 'ACTIVE',
        user.force_password_change === true,
      ]
    );
    if (rows[0]) return rows[0];
    throw new Error('Failed to create user');
  }

  async getAllUsers(filters: { search?: string; role?: string; vendor_id?: string; status?: string } = {}): Promise<any[]> {
    let sql = `
      SELECT u.id, u.email, u.full_name, u.role, u.status, u.vendor_id, u.last_login_at, u.created_at, u.updated_at,
             u.password_changed_at, u.force_password_change,
             v.name as vendor_name, v.vendor_code
      FROM users u
      LEFT JOIN vendors v ON v.id = u.vendor_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (filters.role && filters.role !== 'ALL') {
      params.push(filters.role);
      sql += ` AND u.role = $${params.length}`;
    }
    if (filters.vendor_id && filters.vendor_id !== 'ALL') {
      params.push(filters.vendor_id);
      sql += ` AND u.vendor_id = $${params.length}`;
    }
    if (filters.status && filters.status !== 'ALL') {
      params.push(filters.status);
      sql += ` AND u.status = $${params.length}`;
    }
    sql += ` ORDER BY u.created_at DESC`;
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  async getUserSummary(): Promise<{ total_users: number; active_users: number; vendor_users: number; suspended_users: number }> {
    const { rows } = await this.pool.query(`
      SELECT 
        COUNT(*)::int as total_users,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active_users,
        COUNT(CASE WHEN role = 'VENDOR' THEN 1 END)::int as vendor_users,
        COUNT(CASE WHEN status = 'SUSPENDED' THEN 1 END)::int as suspended_users
      FROM users
    `);
    return rows[0] || { total_users: 0, active_users: 0, vendor_users: 0, suspended_users: 0 };
  }

  async updateUser(id: string, fields: Partial<any>): Promise<any> {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = ['full_name', 'email', 'role', 'vendor_id', 'status', 'force_password_change'];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) return this.getUserById(id);
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async updateUserStatus(id: string, status: string): Promise<any> {
    const { rows } = await this.pool.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return rows[0] ?? null;
  }

  async bulkUpdateUserStatus(ids: string[], status: string): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const { rowCount } = await this.pool.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
      [status, ids]
    );
    return rowCount || 0;
  }

  async getUserRecentActivity(userId: string, email?: string): Promise<any[]> {
    try {
      const { rows } = await this.pool.query(
        `SELECT id, action, action as event_type, "user" as actor_email, entity, before, after, timestamp as created_at, ip, ip as ip_address
         FROM audit_logs
         WHERE (entity = 'user' AND entity_id = $1)
            OR "user" = $2
         ORDER BY timestamp DESC
         LIMIT 20`,
        [userId, email || '']
      );
      return rows;
    } catch {
      return [];
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    // Soft delete / disable to protect historical respondent audit records
    const { rowCount } = await this.pool.query(
      `UPDATE users SET status = 'SUSPENDED', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  }


  async getClients(): Promise<any[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM clients ORDER BY name'
    );
    return rows;
  }

  async getClient(id: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM clients WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  async createClient(client: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO clients (client_code, name, company_name, contact_name, contact_email, contact_phone, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        client.client_code, client.name, client.company_name,
        client.contact_name, client.contact_email, client.contact_phone,
        client.notes, client.status ?? 'ACTIVE',
      ]
    );
    if (rows[0]) return rows[0];
    throw new Error('Failed to create client');
  }

  async updateClient(id: string, fields: Partial<any>): Promise<any> {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = ['name', 'company_name', 'contact_name', 'contact_email', 'contact_phone', 'notes', 'status'];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw new Error('No fields to update');
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE clients SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async getStudies(filters?: { client_id?: string; status?: string; country?: string }): Promise<any[]> {
    let sql = 'SELECT * FROM studies WHERE 1=1';
    const params: any[] = [];
    if (filters?.client_id) { params.push(filters.client_id); sql += ` AND client_id = $${params.length}`; }
    if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
    if (filters?.country) { params.push(filters.country); sql += ` AND country = $${params.length}`; }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  async getStudy(id: string): Promise<any | null> {
    const { rows } = await this.pool.query('SELECT * FROM studies WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async getStudyByExternalOfferId(externalOfferId: string): Promise<any | null> {
    const { rows } = await this.pool.query('SELECT * FROM studies WHERE external_offer_id = $1', [externalOfferId]);
    return rows[0] ?? null;
  }

  async getExternalPlatformByCode(code: string): Promise<any | null> {
    const { rows } = await this.pool.query('SELECT * FROM external_platforms WHERE platform_code = $1 AND status = $2', [code, 'ACTIVE']);
    return rows[0] ?? null;
  }

  async getExternalOffer(platformId: string, externalOfferId: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM external_offers WHERE platform_id = $1 AND external_offer_id = $2',
      [platformId, externalOfferId]
    );
    return rows[0] ?? null;
  }

  async createExternalOffer(offer: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO external_offers (platform_id, external_offer_id, name, survey_url, status, discovery_method, metadata, first_seen_at, last_seen_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW(), NOW(), NOW())
       ON CONFLICT (platform_id, external_offer_id) DO UPDATE SET
         last_seen_at = NOW(),
         survey_url = EXCLUDED.survey_url
       RETURNING *`,
      [
        offer.platform_id,
        offer.external_offer_id,
        offer.name,
        offer.survey_url,
        offer.status ?? 'ACTIVE',
        offer.discovery_method ?? 'AUTO',
        JSON.stringify(offer.metadata ?? {})
      ]
    );
    return rows[0];
  }

  async touchExternalOffer(id: string): Promise<void> {
    await this.pool.query('UPDATE external_offers SET last_seen_at = NOW() WHERE id = $1', [id]);
  }

  async createStudy(study: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO studies
         (study_code, client_id, title, description, country, market, language, survey_url,
           survey_platform, target_completes, loi_minutes, incidence_rate, client_cpi,
           start_at, end_at, status, security_level, created_by, external_offer_id, source_platform, discovery_method, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW())
       RETURNING *`,
      [
        study.study_code, study.client_id, study.title, study.description,
        study.country, study.market, study.language, study.survey_url, study.survey_platform,
        study.target_completes ?? 0, study.loi_minutes ?? 0, study.incidence_rate ?? 50,
        study.client_cpi ?? 0, study.start_at, study.end_at,
        study.status ?? 'DRAFT', study.security_level ?? 'standard', study.created_by ?? 'system',
        study.external_offer_id ?? null, study.source_platform ?? 'ZEPHYR', study.discovery_method ?? 'AUTO'
      ]
    );
    if (rows[0]) return rows[0];
    throw new Error('Failed to create study');
  }

  async updateStudy(id: string, fields: Partial<any>): Promise<any> {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = [
      'title', 'description', 'country', 'market', 'language', 'survey_url',
      'survey_platform', 'target_completes', 'loi_minutes', 'incidence_rate',
      'client_cpi', 'start_at', 'end_at', 'status', 'security_level',
    ];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw new Error('No fields to update');
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE studies SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async getVendors(activeOnly = false): Promise<any[]> {
    const sql = activeOnly
      ? "SELECT * FROM vendors WHERE status = 'ACTIVE' ORDER BY name"
      : 'SELECT * FROM vendors ORDER BY name';
    const { rows } = await this.pool.query(sql);
    return rows;
  }

  async getVendor(id: string): Promise<any | null> {
    const { rows } = await this.pool.query('SELECT * FROM vendors WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async createVendor(vendor: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO vendors (vendor_code, name, contact_name, contact_email, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [vendor.vendor_code, vendor.name, vendor.contact_name, vendor.contact_email, vendor.status ?? 'ACTIVE', vendor.notes]
    );
    if (rows[0]) return rows[0];
    throw new Error('Failed to create vendor');
  }

  async updateVendor(id: string, fields: Partial<any>): Promise<any> {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = ['name', 'contact_name', 'contact_email', 'status', 'notes'];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw new Error('No fields to update');
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE vendors SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async assignVendorToStudy(assignment: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO study_vendors
         (study_id, vendor_id, vendor_cpi, target_completes, max_completes, status,
           allowed_country, custom_start_url, custom_terminate_url, custom_quota_url, custom_complete_url,
           created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
       ON CONFLICT (study_id, vendor_id) DO UPDATE SET
         vendor_cpi        = EXCLUDED.vendor_cpi,
         target_completes  = EXCLUDED.target_completes,
         max_completes     = EXCLUDED.max_completes,
         status            = EXCLUDED.status,
         allowed_country   = EXCLUDED.allowed_country,
         custom_start_url  = EXCLUDED.custom_start_url,
         custom_terminate_url = EXCLUDED.custom_terminate_url,
         custom_quota_url  = EXCLUDED.custom_quota_url,
         custom_complete_url  = EXCLUDED.custom_complete_url,
         updated_at        = NOW()
       RETURNING *`,
      [
        assignment.study_id, assignment.vendor_id, assignment.vendor_cpi ?? 0,
        assignment.target_completes ?? 0, assignment.max_completes ?? 0,
        assignment.status ?? 'ACTIVE', assignment.allowed_country ?? null,
        assignment.custom_start_url ?? null, assignment.custom_terminate_url ?? null,
        assignment.custom_quota_url ?? null, assignment.custom_complete_url ?? null,
      ]
    );
    if (rows[0]) return rows[0];
    throw new Error('Failed to assign vendor to study');
  }

  async getStudyVendors(studyId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT sv.*, v.name as vendor_name, v.vendor_code, v.status as vendor_status
       FROM study_vendors sv
       JOIN vendors v ON v.id = sv.vendor_id
       WHERE sv.study_id = $1
       ORDER BY sv.created_at`,
      [studyId]
    );
    return rows;
  }

  async getStudyVendorsByVendor(vendorId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT sv.*, s.title as study_title, s.study_code, s.status as study_status
       FROM study_vendors sv
       JOIN studies s ON s.id = sv.study_id
       WHERE sv.vendor_id = $1
       ORDER BY sv.created_at`,
      [vendorId]
    );
    return rows;
  }

  async getStudyVendor(studyId: string, vendorId: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM study_vendors WHERE study_id = $1 AND vendor_id = $2',
      [studyId, vendorId]
    );
    return rows[0] ?? null;
  }

  async createTrackingLink(link: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO tracking_links
         (study_id, vendor_id, link_code, public_token, base_url, destination_url,
           uid_mode, callback_profile_id, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
       RETURNING *`,
      [
        link.study_id, link.vendor_id, link.link_code,
        link.public_token || ('tok_' + Math.random().toString(36).substring(7)),
        link.base_url, link.destination_url ?? '', link.uid_mode ?? 'PROVIDED_UID',
        link.callback_profile_id ?? null, link.status ?? 'ACTIVE',
      ]
    );
    if (rows[0]) return rows[0];
    throw new Error('Failed to create tracking link');
  }

  async getTrackingLink(id: string): Promise<any | null> {
    const { rows } = await this.pool.query('SELECT * FROM tracking_links WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async getTrackingLinkByCode(linkCode: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM tracking_links WHERE link_code = $1',
      [linkCode]
    );
    return rows[0] ?? null;
  }

  async getTrackingLinks(filters?: { study_id?: string; vendor_id?: string }): Promise<any[]> {
    let sql = `SELECT tl.*, s.title as study_title, s.study_code, v.name as vendor_name
               FROM tracking_links tl
               JOIN studies s ON s.id = tl.study_id
               JOIN vendors v ON v.id = tl.vendor_id
               WHERE 1=1`;
    const params: any[] = [];
    if (filters?.study_id) { params.push(filters.study_id); sql += ` AND tl.study_id = $${params.length}`; }
    if (filters?.vendor_id) { params.push(filters.vendor_id); sql += ` AND tl.vendor_id = $${params.length}`; }
    sql += ' ORDER BY tl.created_at DESC';
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  async updateTrackingLink(id: string, fields: Partial<any>): Promise<any> {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = ['status', 'base_url', 'destination_url', 'uid_mode'];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw new Error('No fields to update');
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE tracking_links SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async createSession(session: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO sessions
         (session_token, study_id, vendor_id, tracking_link_id, uid, normalized_uid,
           external_uid, ip_hash, ip_address_encrypted_or_restricted_storage,
           user_agent, country_detected, referrer, landing_url,
           initial_status, current_status,
           started_at, last_seen_at, expires_at,
           metadata_json, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW(),$16,
                $17::jsonb,NOW(),NOW())
       RETURNING *`,
      [
        session.session_token,
        session.study_id,
        session.vendor_id,
        session.tracking_link_id,
        session.uid,
        session.normalized_uid,
        session.external_uid ?? null,
        session.ip_hash,
        session.ip_address_encrypted_or_restricted_storage ?? true,
        session.user_agent ?? null,
        session.country_detected ?? null,
        session.referrer ?? null,
        session.landing_url,
        session.initial_status ?? 'STARTED',
        session.current_status ?? 'STARTED',
        session.expires_at,
        JSON.stringify(session.metadata_json ?? {}),
      ]
    );
    if (rows[0]) return rows[0];
    throw new Error('Failed to create session');
  }

  async getSessionByToken(sessionToken: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM sessions WHERE session_token = $1',
      [sessionToken]
    );
    return rows[0] ?? null;
  }

  async getSessionById(id: string): Promise<any | null> {
    const { rows } = await this.pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async getSessionsByStudy(studyId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM sessions WHERE study_id = $1 ORDER BY started_at DESC',
      [studyId]
    );
    return rows;
  }

  async findSession(studyId: string, vendorId: string, normalizedUid: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM sessions WHERE study_id = $1 AND vendor_id = $2 AND normalized_uid = $3 ORDER BY started_at DESC LIMIT 1',
      [studyId, vendorId, normalizedUid]
    );
    return rows[0] ?? null;
  }

  async updateSession(id: string, fields: Partial<any>): Promise<any> {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = [
      'current_status', 'last_seen_at', 'completed_at', 'terminated_at',
      'expires_at', 'country_detected', 'metadata_json',
    ];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) return null;
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE sessions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async createResponseEvent(event: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO response_events
         (session_id, study_id, vendor_id, uid, event_type, source,
           raw_payload, normalized_payload, event_key, ip_address, user_agent, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,
                $7::jsonb,$8::jsonb,$9,
                $10,$11,NOW())
       ON CONFLICT (event_key) DO NOTHING
       RETURNING *`,
      [
        event.session_id,
        event.study_id,
        event.vendor_id,
        event.uid,
        event.event_type,
        event.source ?? null,
        JSON.stringify(event.raw_payload ?? {}),
        JSON.stringify(event.normalized_payload ?? {}),
        event.event_key,
        event.ip_address ?? null,
        event.user_agent ?? null,
      ]
    );
    return rows[0] ?? null;
  }

  async getEventsBySession(sessionId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM response_events WHERE session_id = $1 ORDER BY created_at',
      [sessionId]
    );
    return rows;
  }

  async eventKeyExists(eventKey: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      'SELECT 1 FROM response_events WHERE event_key = $1 LIMIT 1',
      [eventKey]
    );
    return rows.length > 0;
  }

  async createResponseRecord(record: Partial<any>): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO responses
         (session_id, study_id, vendor_id, uid, final_status, first_terminal_event,
           terminal_at, is_counted, counted_at, rejection_reason, callback_source,
           created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
       ON CONFLICT (session_id) DO NOTHING
       RETURNING *`,
      [
        record.session_id, record.study_id, record.vendor_id, record.uid,
        record.final_status ?? 'IN_PROGRESS',
        record.first_terminal_event ?? null,
        record.terminal_at ?? null,
        record.is_counted ?? false,
        record.counted_at ?? null,
        record.rejection_reason ?? null,
        record.callback_source ?? null,
      ]
    );
    return rows[0] ?? null;
  }

  async getResponseBySession(sessionId: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM responses WHERE session_id = $1',
      [sessionId]
    );
    return rows[0] ?? null;
  }

  async updateResponseRecord(sessionId: string, fields: Partial<any>): Promise<any> {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = [
      'final_status', 'first_terminal_event', 'terminal_at',
      'is_counted', 'counted_at', 'rejection_reason', 'callback_source', 'loi_seconds',
    ];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) return null;
    params.push(sessionId);
    const { rows } = await this.pool.query(
      `UPDATE responses SET ${sets.join(', ')}, updated_at = NOW() WHERE session_id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async getStudyAnalytics(studyId: string, verified?: boolean): Promise<any> {
    let sessionFilter = '';
    if (verified === true) {
      sessionFilter = 'AND s.id IN (SELECT session_id FROM responses)';
    } else if (verified === false) {
      sessionFilter = 'AND s.id NOT IN (SELECT session_id FROM responses WHERE session_id IS NOT NULL)';
    }

    const { rows } = await this.pool.query(
      `SELECT
         COUNT(DISTINCT s.id)                                                        AS total_sessions,
         COUNT(DISTINCT CASE WHEN r.final_status = 'COMPLETE'        THEN r.id END) AS completes,
         COUNT(DISTINCT CASE WHEN r.final_status = 'TERMINATE'       THEN r.id END) AS terminates,
         COUNT(DISTINCT CASE WHEN r.final_status = 'QUOTA_FULL'      THEN r.id END) AS quota_full,
         COUNT(DISTINCT CASE WHEN r.final_status = 'SECURITY_REJECT' THEN r.id END) AS security_rejects,
         COUNT(DISTINCT CASE WHEN r.final_status = 'IN_PROGRESS'     THEN r.id END) AS in_progress,
         COUNT(DISTINCT CASE WHEN r.final_status = 'INVALID'         THEN r.id END) AS invalid_count,
         COUNT(DISTINCT CASE WHEN r.final_status = 'EXPIRED'         THEN r.id END) AS expired_count,
         COUNT(DISTINCT CASE WHEN r.is_counted = true                THEN r.id END) AS counted_completes
       FROM sessions s
       LEFT JOIN responses r ON r.session_id = s.id
       WHERE s.study_id = $1 ${sessionFilter}`,
      [studyId]
    );
    return rows[0] ?? {};
  }

  async getVendorStudyAnalytics(studyId: string, verified?: boolean): Promise<any[]> {
    let sessionFilter = '';
    if (verified === true) {
      sessionFilter = 'AND s.id IN (SELECT session_id FROM responses)';
    } else if (verified === false) {
      sessionFilter = 'AND s.id NOT IN (SELECT session_id FROM responses WHERE session_id IS NOT NULL)';
    }

    const { rows } = await this.pool.query(
      `SELECT
         sv.vendor_id,
         v.name  AS vendor_name,
         sv.vendor_cpi,
         sv.target_completes,
         COUNT(DISTINCT s.id)                                                        AS total_sessions,
         COUNT(DISTINCT CASE WHEN r.final_status = 'COMPLETE'        THEN r.id END) AS completes,
         COUNT(DISTINCT CASE WHEN r.final_status = 'TERMINATE'       THEN r.id END) AS terminates,
         COUNT(DISTINCT CASE WHEN r.final_status = 'QUOTA_FULL'      THEN r.id END) AS quota_full,
         COUNT(DISTINCT CASE WHEN r.final_status = 'SECURITY_REJECT' THEN r.id END) AS security_rejects,
         COUNT(DISTINCT CASE WHEN r.is_counted = true                THEN r.id END) AS counted_completes
       FROM study_vendors sv
       JOIN vendors v ON v.id = sv.vendor_id
       LEFT JOIN sessions s ON s.study_id = sv.study_id AND s.vendor_id = sv.vendor_id
       LEFT JOIN responses r ON r.session_id = s.id
       WHERE sv.study_id = $1 ${sessionFilter}
       GROUP BY sv.vendor_id, v.name, sv.vendor_cpi, sv.target_completes`,
      [studyId]
    );
    return rows;
  }

  async getVendorAnalytics(vendorId: string, verified?: boolean): Promise<any[]> {
    let sessionFilter = '';
    if (verified === true) {
      sessionFilter = 'AND sess.id IN (SELECT session_id FROM responses)';
    } else if (verified === false) {
      sessionFilter = 'AND sess.id NOT IN (SELECT session_id FROM responses WHERE session_id IS NOT NULL)';
    }

    const { rows } = await this.pool.query(
      `SELECT
         s.id    AS study_id,
         s.title AS study_title,
         s.study_code,
         s.client_cpi,
         sv.vendor_cpi,
         sv.target_completes,
         COUNT(DISTINCT sess.id)                                                        AS total_sessions,
         COUNT(DISTINCT CASE WHEN r.final_status = 'COMPLETE'        THEN r.id END)    AS completes,
         COUNT(DISTINCT CASE WHEN r.final_status = 'TERMINATE'       THEN r.id END)    AS terminates,
         COUNT(DISTINCT CASE WHEN r.final_status = 'QUOTA_FULL'      THEN r.id END)    AS quota_full,
         COUNT(DISTINCT CASE WHEN r.final_status = 'SECURITY_REJECT' THEN r.id END)    AS security_rejects,
         COUNT(DISTINCT CASE WHEN r.is_counted = true                THEN r.id END)    AS counted_completes
       FROM study_vendors sv
       JOIN studies s ON s.id = sv.study_id
       LEFT JOIN sessions sess ON sess.study_id = sv.study_id AND sess.vendor_id = sv.vendor_id
       LEFT JOIN responses r ON r.session_id = sess.id
       WHERE sv.vendor_id = $1 ${sessionFilter}
       GROUP BY s.id, s.title, s.study_code, s.client_cpi, sv.vendor_cpi, sv.target_completes`,
      [vendorId]
    );
    return rows;
  }

  async getQuotasByStudy(studyId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM quotas WHERE study_id = $1 ORDER BY created_at',
      [studyId]
    );
    return rows;
  }

  async updateQuotaAchievement(quotaId: string, achieved: number): Promise<any> {
    const { rows } = await this.pool.query(
      `UPDATE quotas
       SET achieved   = $1,
           remaining  = GREATEST(0, target - $1),
           status     = CASE WHEN $1 >= target THEN 'FULL' ELSE status END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [achieved, quotaId]
    );
    if (rows[0]) return rows[0];
    throw new Error('Failed to update quota');
  }

  async createAuditLog(log: Partial<any>): Promise<any> {
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO audit_logs ("user", action, entity, entity_id, before, after, timestamp, ip)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,NOW(),$7)
         RETURNING *`,
        [
          log.user ?? 'system', log.action, log.entity, log.entity_id,
          log.before ? JSON.stringify(log.before) : null,
          log.after ? JSON.stringify(log.after) : null,
          log.ip ?? null,
        ]
      );
      return rows[0] ?? null;
    } catch (err) {
      console.error('[AuditLog] Failed to write:', err);
      return null;
    }
  }

  async getAuditLogs(filters?: { entity?: string; action?: string; limit?: number }): Promise<any[]> {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    if (filters?.entity) { params.push(filters.entity); sql += ` AND entity = $${params.length}`; }
    if (filters?.action) { params.push(filters.action); sql += ` AND action = $${params.length}`; }
    const limit = filters?.limit ?? 100;
    sql += ` ORDER BY timestamp DESC LIMIT ${limit}`;
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  private parseValidInet(ipStr?: string | null): string | null {
    if (!ipStr || typeof ipStr !== 'string') return null;
    const trimmed = ipStr.trim();
    if (trimmed === 'unknown' || trimmed === 'localhost' || trimmed === '::1') return '127.0.0.1';
    const ipv4Match = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipv4Match) return ipv4Match[1];
    if (trimmed.includes(':') && /^[0-9a-fA-F:]+$/.test(trimmed)) return trimmed;
    return null;
  }

  async updateUserLastLogin(userId: string, ip?: string, userAgent?: string): Promise<void> {
    const safeIp = this.parseValidInet(ip);
    await this.pool.query(
      `UPDATE users SET
         last_login_at = NOW(),
         failed_login_attempts = 0,
         locked_until = NULL,
         last_failed_login_at = NULL,
         last_login_ip = COALESCE($2::inet, last_login_ip),
         last_login_user_agent = COALESCE($3, last_login_user_agent)
       WHERE id = $1`,
      [userId, safeIp, userAgent ?? null]
    );
  }

  async recordFailedLogin(userId: string, ip: string, userAgent: string): Promise<{ failedAttempts: number; lockedUntil: Date | null }> {
    // Atomically increment failure count and lock if threshold exceeded
    const maxAttempts = 5;
    const lockMinutes = 15;
    const { rows } = await this.pool.query(
      `UPDATE users SET
         failed_login_attempts = failed_login_attempts + 1,
         last_failed_login_at = NOW(),
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= $2 THEN NOW() + ($3 || ' minutes')::interval
           ELSE locked_until
         END
       WHERE id = $1
       RETURNING failed_login_attempts, locked_until`,
      [userId, maxAttempts, String(lockMinutes)]
    );
    const r = rows[0] || { failed_login_attempts: 0, locked_until: null };
    return { failedAttempts: r.failed_login_attempts, lockedUntil: r.locked_until };
  }

  async recordLoginAudit(entry: {
    userId: string | null;
    emailAttempted: string;
    success: boolean;
    failureReason?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    const safeIp = this.parseValidInet(entry.ip);
    await this.pool.query(
      `INSERT INTO login_audit (user_id, email_attempted, success, failure_reason, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5::inet, $6, NOW())`,
      [entry.userId, entry.emailAttempted, entry.success, entry.failureReason ?? null, safeIp, entry.userAgent ?? null]
    );
  }

  async updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET password_hash = $2, password_changed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [userId, newPasswordHash]
    );
  }

  async unlockUser(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_failed_login_at = NULL WHERE id = $1`,
      [userId]
    );
  }

  async unassignVendorFromStudy(studyId: string, vendorId: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      "UPDATE study_vendors SET status = 'INACTIVE', updated_at = NOW() WHERE study_id = $1 AND vendor_id = $2 RETURNING *",
      [studyId, vendorId]
    );
    return rows[0] ?? null;
  }

  async getResponseWithDetails(id: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      `SELECT r.*, s.title as study_title, s.study_code, v.name as vendor_name
       FROM (
         SELECT id, study_id, vendor_id, final_status, updated_at, uid, 'VERIFIED' as verification_status FROM responses
         UNION ALL
         SELECT id, study_id, vendor_id, 'TERMINATE' as final_status, created_at as updated_at, uid, 'UNVERIFIED' as verification_status FROM fake_click_events
       ) r
       LEFT JOIN studies s ON s.id = r.study_id
       LEFT JOIN vendors v ON v.id = r.vendor_id
       WHERE r.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async createQuota(arg1: any, arg2?: any): Promise<any> {
    if (typeof arg1 === 'string') {
      const table = arg1 as 'project_quotas' | 'country_quotas' | 'link_quotas';
      const data = arg2;
      const entityKey = table === 'project_quotas' ? 'project_id' : table === 'country_quotas' ? 'country_id' : 'link_id';
      const { rows } = await this.pool.query(
        `INSERT INTO ${table} (name, quota_type, target, criteria_json, ${entityKey})
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.name, data.quota_type, data.target || 0, JSON.stringify(data.criteria_json || {}), data[entityKey]]
      );
      return rows[0];
    }
    const quota = arg1;
    const { rows } = await this.pool.query(
      `INSERT INTO quotas (study_id, name, target, achieved, remaining, status, criteria_json, created_at, updated_at)
       VALUES ($1, $2, $3, 0, $3, 'OPEN', $4::jsonb, NOW(), NOW())
       RETURNING *`,
      [quota.study_id, quota.name, quota.target, JSON.stringify(quota.criteria_json ?? {})]
    );
    return rows[0];
  }

  async getResponsesForExport(filters: { study_id?: string; vendor_id?: string; status?: string }): Promise<any[]> {
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (filters.study_id) { params.push(filters.study_id); where += ` AND r.study_id = $${params.length}`; }
    if (filters.vendor_id) { params.push(filters.vendor_id); where += ` AND r.vendor_id = $${params.length}`; }
    if (filters.status) { params.push(filters.status); where += ` AND r.final_status = $${params.length}`; }

    const { rows } = await this.pool.query(
      `SELECT r.*, s.title as study_title, s.study_code, v.name as vendor_name
       FROM responses r
       JOIN studies s ON s.id = r.study_id
       JOIN vendors v ON v.id = r.vendor_id
       ${where}
       ORDER BY r.updated_at DESC
       LIMIT 5000`,
      params
    );
    return rows;
  }

  async getVendorPerformanceExport(studyId?: string): Promise<any[]> {
    const params: any[] = [];
    const studyFilter = studyId
      ? (() => { params.push(studyId); return `AND sv.study_id = $${params.length}`; })()
      : '';

    const { rows } = await this.pool.query(
      `SELECT
         v.id, v.vendor_code, v.name, v.status,
         sv.study_id, sv.vendor_cpi, sv.target_completes,
         s.title as study_title,
         COUNT(DISTINCT sess.id)                                                          AS starts,
         COUNT(DISTINCT CASE WHEN r.final_status = 'COMPLETE'        THEN r.id END)      AS completes,
         COUNT(DISTINCT CASE WHEN r.is_counted = true                THEN r.id END)      AS counted_completes,
         COUNT(DISTINCT CASE WHEN r.final_status = 'TERMINATE'       THEN r.id END)      AS terminates,
         COUNT(DISTINCT CASE WHEN r.final_status = 'QUOTA_FULL'      THEN r.id END)      AS quota_full,
         COUNT(DISTINCT CASE WHEN r.final_status = 'SECURITY_REJECT' THEN r.id END)      AS security_rejects,
         ROUND(COUNT(DISTINCT CASE WHEN r.is_counted = true THEN r.id END)::numeric
               * sv.vendor_cpi, 2)                                                        AS vendor_cost
       FROM vendors v
       JOIN study_vendors sv ON sv.vendor_id = v.id
       JOIN studies s ON s.id = sv.study_id
       LEFT JOIN sessions sess ON sess.study_id = sv.study_id AND sess.vendor_id = sv.vendor_id
       LEFT JOIN responses r ON r.session_id = sess.id
       WHERE 1=1 ${studyFilter}
       GROUP BY v.id, v.vendor_code, v.name, v.status, sv.study_id, sv.vendor_cpi, sv.target_completes, s.title
       ORDER BY v.name`,
      params
    );
    return rows;
  }

  async getFinanceExport(studyId?: string, verified?: boolean): Promise<any[]> {
    let sessionFilter = '';
    if (verified === true) {
      sessionFilter = 'AND sess.id IN (SELECT session_id FROM responses)';
    } else if (verified === false) {
      sessionFilter = 'AND sess.id NOT IN (SELECT session_id FROM responses WHERE session_id IS NOT NULL)';
    }

    const params: any[] = [];
    const studyFilter = studyId
      ? (() => { params.push(studyId); return `AND s.id = $${params.length}`; })()
      : '';

    const { rows } = await this.pool.query(
      `SELECT
         s.id           AS study_id,
         s.study_code,
         s.title,
         s.client_cpi,
         s.status       AS study_status,
         COUNT(DISTINCT sv.vendor_id)                                                       AS vendor_count,
         COUNT(DISTINCT sess.id)                                                            AS total_starts,
         COUNT(DISTINCT CASE WHEN r.is_counted = true   THEN r.id END)                     AS counted_completes,
         COUNT(DISTINCT CASE WHEN r.final_status = 'COMPLETE' THEN r.id END)               AS raw_completes,
         COALESCE(vc.vendor_cost, 0)                                                        AS vendor_cost,
         ROUND(COUNT(DISTINCT CASE WHEN r.is_counted = true THEN r.id END)::numeric
               * s.client_cpi, 2)                                                           AS client_revenue,
         ROUND(COUNT(DISTINCT CASE WHEN r.is_counted = true THEN r.id END)::numeric
               * s.client_cpi - COALESCE(vc.vendor_cost, 0), 2)                            AS gross_margin
       FROM studies s
       LEFT JOIN study_vendors sv ON sv.study_id = s.id
       LEFT JOIN sessions sess ON sess.study_id = s.id AND sess.vendor_id = sv.vendor_id ${sessionFilter}
       LEFT JOIN responses r ON r.session_id = sess.id
       LEFT JOIN LATERAL (
         SELECT ROUND(SUM(sv2.vendor_cpi * vr.counted_completes)::numeric, 2) AS vendor_cost
         FROM study_vendors sv2
         LEFT JOIN LATERAL (
           SELECT COUNT(DISTINCT CASE WHEN r2.is_counted = true THEN r2.id END) AS counted_completes
           FROM sessions sess2
           LEFT JOIN responses r2 ON r2.session_id = sess2.id
           WHERE sess2.study_id = s.id AND sess2.vendor_id = sv2.vendor_id
         ) vr ON true
         WHERE sv2.study_id = s.id
       ) vc ON true
       WHERE 1=1 ${studyFilter}
       GROUP BY s.id, s.study_code, s.title, s.client_cpi, s.status, vc.vendor_cost
       ORDER BY s.created_at DESC`,
      params
    );
    return rows;
  }

  async getResponses(filters: {
    study_id?: string;
    vendor_id?: string;
    status?: string;
    uid?: string;
    search?: string;
    device?: string;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
  }): Promise<{ rows: any[]; total: number }> {
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.study_id) {
      params.push(filters.study_id);
      where += ` AND (r.study_id::text = $${params.length} OR s.study_code = $${params.length} OR s.external_offer_id = $${params.length})`;
    }
    if (filters.vendor_id) {
      params.push(filters.vendor_id);
      where += ` AND r.vendor_id::text = $${params.length}`;
    }
    if (filters.status) {
      const st = filters.status.toUpperCase();
      if (st === 'COMPLETE') {
        where += ` AND r.final_status IN ('COMPLETE', 'COMPLETED', 'SUCCESS')`;
      } else if (st === 'TERMINATE') {
        where += ` AND r.final_status IN ('TERMINATE', 'TERMINATED', 'FAILED')`;
      } else if (st === 'OVER QUOTA' || st === 'QUOTA_FULL' || st === 'QUOTA') {
        where += ` AND r.final_status IN ('QUOTA_FULL', 'QUOTA', 'OVER QUOTA')`;
      } else if (st === 'QUALITY TERM' || st === 'SECURITY_REJECT' || st === 'QUALITY_TERM') {
        where += ` AND r.final_status IN ('SECURITY_REJECT', 'QUALITY_TERM', 'QUALITY TERM')`;
      } else if (st === 'SURVEY CLOSED' || st === 'EXPIRED' || st === 'CLOSED') {
        where += ` AND r.final_status IN ('EXPIRED', 'CLOSED', 'SURVEY CLOSED')`;
      } else {
        params.push(st);
        where += ` AND r.final_status ILIKE $${params.length}`;
      }
    }
    if (filters.uid) {
      params.push(`%${filters.uid.trim()}%`);
      where += ` AND r.uid ILIKE $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search.trim()}%`);
      where += ` AND (
        r.uid ILIKE $${params.length} OR
        s.study_code ILIKE $${params.length} OR
        s.title ILIKE $${params.length} OR
        COALESCE(s.external_offer_id, '') ILIKE $${params.length} OR
        COALESCE(sess.user_agent, '') ILIKE $${params.length} OR
        COALESCE(sess.ip_hash, '') ILIKE $${params.length} OR
        COALESCE(re.ip_address::text, '') ILIKE $${params.length}
      )`;
    }

    if (filters.start_date) {
      params.push(filters.start_date);
      where += ` AND r.created_at >= $${params.length}::timestamp`;
    }
    if (filters.end_date) {
      params.push(filters.end_date);
      where += ` AND r.created_at <= $${params.length}::timestamp`;
    }

    // Sorting
    let orderBy = 'ORDER BY r.created_at DESC';
    const order = (filters.sort_order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    if (filters.sort_by === 'uid') {
      orderBy = `ORDER BY r.uid ${order}`;
    } else if (filters.sort_by === 'project') {
      orderBy = `ORDER BY COALESCE(s.study_code, s.external_offer_id, s.title) ${order}`;
    } else if (filters.sort_by === 'status') {
      orderBy = `ORDER BY r.final_status ${order}`;
    } else if (filters.sort_by === 'device') {
      orderBy = `ORDER BY COALESCE(sess.user_agent, '') ${order}`;
    } else if (filters.sort_by === 'timestamp' || filters.sort_by === 'created_at') {
      orderBy = `ORDER BY r.created_at ${order}`;
    }

    const limit = Math.min(Math.max(1, filters.limit ?? 25), 5000);
    const offset = Math.max(0, ((filters.page ?? 1) - 1) * limit);

    const dataSql = `
      WITH unified_responses AS (
        SELECT id, session_id, study_id, vendor_id, uid, final_status, created_at, updated_at, terminal_at, first_terminal_event, NULL as rejection_reason, NULL as raw_payload, NULL as fake_ip, NULL as fake_ua, 'VERIFIED' as _source_type FROM responses
        UNION ALL
        SELECT id, NULL as session_id, study_id, vendor_id, uid, 'TERMINATE' as final_status, created_at, created_at as updated_at, created_at as terminal_at, 'fake_click' as first_terminal_event, rejection_reason, raw_payload, ip_address as fake_ip, user_agent as fake_ua, 'UNVERIFIED' as _source_type FROM fake_click_events
      )
      SELECT 
        r.id,
        r.session_id,
        r.study_id,
        r.vendor_id,
        r.uid,
        r.final_status,
        r.created_at,
        r.updated_at,
        r.terminal_at,
        r.first_terminal_event,
        s.title AS study_title,
        s.study_code,
        s.external_offer_id,
        s.country AS study_country,
        v.name AS vendor_name,
        v.vendor_code,
        COALESCE(
          re.ip_address::text,
          (re.raw_payload->>'ip')::text,
          NULLIF(sess.ip_hash, ''),
          r.fake_ip,
          '127.0.0.1'
        ) AS ip_address,
        COALESCE(re.user_agent, sess.user_agent, r.fake_ua, '') AS user_agent,
        sess.landing_url,
        sess.started_at,
        COALESCE(sess.country_detected, s.country, '—') AS country_detected,
        sess.session_token,
        COALESCE(p.project_code, s.study_code) AS project_code,
        COALESCE(p.name, s.title) AS project_name,
        r._source_type AS verification_status,
        r.rejection_reason,
        r.raw_payload
      FROM unified_responses r
      LEFT JOIN studies s ON s.id = r.study_id
      LEFT JOIN vendors v ON v.id = r.vendor_id
      LEFT JOIN projects p ON (UPPER(p.project_code) = UPPER(s.study_code))
      LEFT JOIN sessions sess ON sess.id = r.session_id
      LEFT JOIN LATERAL (
        SELECT ip_address, user_agent, raw_payload
        FROM response_events 
        WHERE session_id = r.session_id
        ORDER BY created_at DESC 
        LIMIT 1
      ) re ON true
      ${where}
      ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countSql = `
      WITH unified_responses AS (
        SELECT id, session_id, study_id, vendor_id, uid, final_status, created_at, updated_at, terminal_at, first_terminal_event, NULL as rejection_reason, NULL as raw_payload, NULL as fake_ip, NULL as fake_ua, 'VERIFIED' as _source_type FROM responses
        UNION ALL
        SELECT id, NULL as session_id, study_id, vendor_id, uid, 'TERMINATE' as final_status, created_at, created_at as updated_at, created_at as terminal_at, 'fake_click' as first_terminal_event, rejection_reason, raw_payload, ip_address as fake_ip, user_agent as fake_ua, 'UNVERIFIED' as _source_type FROM fake_click_events
      )
      SELECT COUNT(*) 
      FROM unified_responses r
      LEFT JOIN studies s ON s.id = r.study_id
      LEFT JOIN vendors v ON v.id = r.vendor_id
      LEFT JOIN sessions sess ON sess.id = r.session_id
      LEFT JOIN LATERAL (
        SELECT ip_address, user_agent 
        FROM response_events 
        WHERE session_id = r.session_id AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)
        ORDER BY created_at DESC 
        LIMIT 1
      ) re ON true
      ${where}
    `;

    const [dataRes, countRes] = await Promise.all([
      this.pool.query(dataSql, params),
      this.pool.query(countSql, params),
    ]);

    // Map rows and detect device
    const rows = dataRes.rows.map((r: any) => {
      const ua = r.user_agent || '';
      let device = 'Desktop';
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        device = 'Tablet';
      } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|hpwOS|Opera M(obi|ini)/i.test(ua)) {
        device = 'Mobile';
      }

      // Map status enum to exact required display names: COMPLETE, TERMINATE, OVER QUOTA, QUALITY TERM, SURVEY CLOSED
      let statusDisplay = 'COMPLETE';
      const sUpper = (r.final_status || '').toUpperCase();
      if (['COMPLETE', 'COMPLETED', 'SUCCESS'].includes(sUpper)) {
        statusDisplay = 'COMPLETE';
      } else if (['TERMINATE', 'TERMINATED', 'FAILED'].includes(sUpper)) {
        statusDisplay = 'TERMINATE';
      } else if (['QUOTA_FULL', 'QUOTA', 'OVER QUOTA'].includes(sUpper)) {
        statusDisplay = 'OVER QUOTA';
      } else if (['SECURITY_REJECT', 'QUALITY_TERM', 'PURPLE'].includes(sUpper)) {
        statusDisplay = 'QUALITY TERM';
      } else if (['EXPIRED', 'CLOSED', 'SURVEY CLOSED'].includes(sUpper)) {
        statusDisplay = 'SURVEY CLOSED';
      } else {
        statusDisplay = sUpper || 'COMPLETE';
      }

      const projectDisplay = r.study_code || r.external_offer_id || r.study_title || r.study_id;

      // Country
      const countryDisplay = r.study_country || r.country_detected || 'US';

      // LOI Calculation
      let loiSec = 0;
      if (r.terminal_at && r.started_at) {
        loiSec = Math.max(0, Math.round((new Date(r.terminal_at).getTime() - new Date(r.started_at).getTime()) / 1000));
      } else if (r.updated_at && r.created_at) {
        loiSec = Math.max(0, Math.round((new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 1000));
      }
      const loiMins = Math.floor(loiSec / 60);
      const loiRemainingSecs = Math.floor(loiSec % 60);
      const loiFormatted = `${String(loiMins).padStart(2, '0')}:${String(loiRemainingSecs).padStart(2, '0')}`;

      return {
        ...r,
        project: projectDisplay,
        project_code: r.study_code || r.external_offer_id || projectDisplay,
        project_name: r.study_title || 'Market Research Survey Project',
        supplier_token: r.vendor_code || r.vendor_name || r.vendor_id,
        country: countryDisplay,
        device,
        status: statusDisplay,
        raw_status: r.final_status,
        started_at: r.started_at || r.created_at,
        loi_seconds: loiSec,
        loi_formatted: loiFormatted,
      };
    });

    let finalRows = rows;
    if (filters.device && ['Desktop', 'Mobile', 'Tablet'].includes(filters.device)) {
      finalRows = rows.filter((r: any) => r.device === filters.device);
    }

    return { rows: finalRows, total: parseInt(countRes.rows[0]?.count || '0', 10) };
  }

  // --- Fake Click Events -------------------------------------------------------

  async recordFakeClick(event: {
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
  }): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO fake_click_events
         (study_id, vendor_id, project_id, uid, normalized_uid, rejection_reason,
          raw_payload, ip_address, ip_hash, user_agent, provider)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)
       RETURNING *`,
      [
        event.study_id || null,
        event.vendor_id || null,
        event.project_id || null,
        event.uid,
        event.normalized_uid,
        event.rejection_reason,
        JSON.stringify(event.raw_payload ?? {}),
        event.ip_address || null,
        event.ip_hash || null,
        event.user_agent || null,
        event.provider || null,
      ]
    );
    return rows[0];
  }

  async getFakeClicks(filters?: {
    study_id?: string;
    uid?: string;
    rejection_reason?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: any[]; total: number }> {
    let sql = 'SELECT * FROM fake_click_events WHERE 1=1';
    let countSql = 'SELECT COUNT(*) FROM fake_click_events WHERE 1=1';
    const params: any[] = [];

    if (filters?.study_id) {
      params.push(filters.study_id);
      sql += ` AND study_id = $${params.length}`;
      countSql += ` AND study_id = $${params.length}`;
    }
    if (filters?.uid) {
      params.push(`%${filters.uid}%`);
      sql += ` AND uid ILIKE $${params.length}`;
      countSql += ` AND uid ILIKE $${params.length}`;
    }
    if (filters?.rejection_reason) {
      params.push(filters.rejection_reason);
      sql += ` AND rejection_reason = $${params.length}`;
      countSql += ` AND rejection_reason = $${params.length}`;
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataRes, countRes] = await Promise.all([
      this.pool.query(sql, params),
      this.pool.query(countSql, params.slice(0, params.length - 2)),
    ]);

    return { rows: dataRes.rows, total: parseInt(countRes.rows[0]?.count || '0', 10) };
  }

  async getFakeClickStats(studyId: string): Promise<any> {
    const { rows } = await this.pool.query(
      `SELECT rejection_reason, COUNT(*) AS count
       FROM fake_click_events
       WHERE study_id = $1
       GROUP BY rejection_reason
       ORDER BY count DESC`,
      [studyId]
    );
    return rows;
  }

  // --- Credential Vault --------------------------------------------------------

  async createCredentialVault(entry: any): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO credential_vault
         (created_by, study_id, vendor_id, label, credential_type, username,
          encrypted_password, iv, auth_tag, encrypted_extra, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        entry.created_by, entry.study_id || null, entry.vendor_id || null,
        entry.label, entry.credential_type || 'LOGIN_PASSWORD', entry.username,
        entry.encrypted_password, entry.iv, entry.auth_tag,
        entry.encrypted_extra ? JSON.stringify(entry.encrypted_extra) : null,
        entry.notes || null, entry.status || 'ACTIVE',
      ]
    );
    return rows[0];
  }

  async getCredentialVaultById(id: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      "SELECT * FROM credential_vault WHERE id = $1 AND status != 'DELETED'",
      [id]
    );
    return rows[0] ?? null;
  }

  async getCredentialVaults(filters?: {
    study_id?: string;
    vendor_id?: string;
    created_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: any[]; total: number }> {
    let where = "status != 'DELETED'";
    const params: any[] = [];
    if (filters?.study_id) { params.push(filters.study_id); where += ` AND study_id = $${params.length}`; }
    if (filters?.vendor_id) { params.push(filters.vendor_id); where += ` AND vendor_id = $${params.length}`; }
    if (filters?.created_by) { params.push(filters.created_by); where += ` AND created_by = $${params.length}`; }
    const countRes = await this.pool.query(`SELECT COUNT(*) FROM credential_vault WHERE ${where}`, params);
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    params.push(limit, offset);
    const { rows } = await this.pool.query(
      `SELECT * FROM credential_vault WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { rows, total: parseInt(countRes.rows[0]?.count || '0', 10) };
  }

  async updateCredentialVault(id: string, fields: any): Promise<any> {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = ['label', 'username', 'encrypted_password', 'iv', 'auth_tag', 'encrypted_extra', 'notes', 'status', 'last_accessed_at', 'last_accessed_by'];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(key === 'encrypted_extra' ? JSON.stringify(fields[key]) : fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) return null;
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE credential_vault SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async deleteCredentialVault(id: string): Promise<void> {
    await this.pool.query("UPDATE credential_vault SET status = 'DELETED', updated_at = NOW() WHERE id = $1", [id]);
  }

  async logVaultAccess(vaultEntryId: string, action: string, performedBy: string, ipAddress?: string | null, userAgent?: string | null): Promise<void> {
    try {
      await this.pool.query(
        "INSERT INTO credential_vault_audit (vault_entry_id, action, performed_by, ip_address, user_agent) VALUES ($1,$2,$3,$4,$5)",
        [vaultEntryId, action, performedBy, ipAddress || null, userAgent || null]
      );
    } catch (err: any) {
      console.error('[VaultAudit] Failed to log:', err.message);
    }
  }

  async getVaultAuditLog(vaultId: string, limit = 50): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT va.*, u.full_name as performer_name, u.email as performer_email
       FROM credential_vault_audit va
       LEFT JOIN users u ON u.id = va.performed_by
       WHERE va.vault_entry_id = $1
       ORDER BY va.created_at DESC LIMIT $2`,
      [vaultId, limit]
    );
    return rows;
  }
  // ═════════════════════════════════════════════════════════════════════════════
  // GOAL 2: PROJECT MANAGEMENT & MULTI-COUNTRY ARCHITECTURE
  // ═════════════════════════════════════════════════════════════════════════════

  // ── Projects ───────────────────────────────────────────────────────────────
  async createProject(data: {
    project_code: string; name: string; description?: string;
    client_id?: string; created_by?: string;
    client_rate?: number; vendor_rate?: number; currency?: string;
    // Survey tracking config (new)
    client_name?: string; survey_url?: string; uid_param?: string; uid_placeholder?: string;
  }): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO projects
         (project_code, name, description, client_id, created_by, client_rate, vendor_rate, currency,
          client_name, survey_url, uid_param, uid_placeholder)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        data.project_code,
        data.name,
        data.description || null,
        data.client_id || null,
        data.created_by || null,
        data.client_rate !== undefined ? data.client_rate : 70,
        data.vendor_rate !== undefined ? data.vendor_rate : 50,
        data.currency || 'INR',
        data.client_name || null,
        data.survey_url || null,
        data.uid_param || null,
        data.uid_placeholder || null,
      ]
    );
    const project = rows[0];

    // Ensure a backing study exists for foreign key constraints on sessions/response_events
    try {
      const { rows: existingStudy } = await this.pool.query('SELECT id FROM studies WHERE study_code = $1', [data.project_code]);
      if (!existingStudy[0]) {
        await this.pool.query(
          `INSERT INTO studies (study_code, client_id, title, description, status, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'LIVE', $5, NOW(), NOW()) ON CONFLICT (study_code) DO NOTHING`,
          [data.project_code, data.client_id || null, data.name, data.description || null, data.created_by || 'system']
        );
      }
    } catch (e: any) {
      console.warn('[DB] Warning syncing backing study for project:', e?.message);
    }

    return project;
  }

  async getProjects(filters?: { status?: string; client_id?: string }): Promise<any[]> {
    let sql = 'SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON c.id = p.client_id';
    const conds: string[] = []; const params: any[] = [];
    if (filters?.status) { params.push(filters.status); conds.push(`p.status = $${params.length}`); }
    if (filters?.client_id) { params.push(filters.client_id); conds.push(`p.client_id = $${params.length}`); }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY p.created_at DESC';
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  async getProjectById(id: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      `SELECT p.*, c.name as client_name FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id WHERE p.id = $1`, [id]
    );
    return rows[0] ?? null;
  }

  async updateProject(id: string, fields: Partial<any>): Promise<any | null> {
    const allowed = [
      'name', 'description', 'status', 'client_id', 'client_rate', 'vendor_rate', 'currency',
      'client_name', 'survey_url', 'uid_param', 'uid_placeholder',
    ];
    const sets: string[] = []; const params: any[] = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) { params.push(fields[key]); sets.push(`${key} = $${params.length}`); }
    }
    if (sets.length === 0) return null;
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE projects SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params
    );
    return rows[0] ?? null;
  }

  async deleteProject(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async launchProject(id: string): Promise<{ success: boolean; errors?: string[] }> {
    const project = await this.getProjectById(id);
    if (!project) return { success: false, errors: ['Project not found'] };
    if (!['DRAFT', 'CONFIGURING', 'VALIDATING'].includes(project.status)) {
      return { success: false, errors: [`Cannot launch project in ${project.status} status`] };
    }
    const errors: string[] = [];
    const countries = await this.getCountries(id);
    if (countries.length === 0) {
      errors.push('At least one country is required');
    } else {
      for (const c of countries) {
        const links = await this.getProjectLinks(c.id);
        if (links.length === 0) {
          errors.push(`Country ${c.country_name} has no survey links`);
        } else {
          for (const l of links) {
            const vendors = await this.getLinkVendorAssignments(l.id);
            if (vendors.length === 0) {
              errors.push(`Link ${l.link_code} has no vendor assignments`);
            }
          }
        }
      }
    }
    if (errors.length > 0) return { success: false, errors };
    await this.updateProject(id, { status: 'LIVE' });
    return { success: true };
  }

  // ── Countries ──────────────────────────────────────────────────────────────
  async createCountry(data: {
    project_id: string; country_code: string; country_name: string;
  }): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO project_countries (project_id, country_code, country_name)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.project_id, data.country_code, data.country_name]
    );
    return rows[0];
  }

  async getCountries(projectId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM project_countries WHERE project_id = $1 ORDER BY country_name`, [projectId]
    );
    return rows;
  }

  async getCountryById(id: string): Promise<any | null> {
    const { rows } = await this.pool.query('SELECT * FROM project_countries WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async updateCountry(id: string, fields: Partial<any>): Promise<any | null> {
    const allowed = ['country_name', 'status'];
    const sets: string[] = []; const params: any[] = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) { params.push(fields[key]); sets.push(`${key} = $${params.length}`); }
    }
    if (sets.length === 0) return null;
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE project_countries SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params
    );
    return rows[0] ?? null;
  }

  async deleteCountry(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM project_countries WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  // ── Survey Links ───────────────────────────────────────────────────────────
  async createProjectLink(data: {
    country_id: string; link_code: string; link_name: string;
    url: string; provider_id?: string; uid_mode?: string;
    uid_param?: string; uid_placeholder?: string;
    vendor_id?: string; target_completes?: number;
  }): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO project_links
         (country_id, link_code, link_name, url, provider_id, uid_mode,
          uid_param, uid_placeholder, vendor_id, target_completes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        data.country_id, data.link_code, data.link_name, data.url,
        data.provider_id || null, data.uid_mode || 'PROVIDED_UID',
        data.uid_param || null, data.uid_placeholder || null,
        data.vendor_id || null, data.target_completes || null,
      ]
    );
    return rows[0];
  }

  async getProjectLinks(countryId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM project_links WHERE country_id = $1 ORDER BY created_at`, [countryId]
    );
    return rows;
  }

  async getLinkById(id: string): Promise<any | null> {
    const { rows } = await this.pool.query('SELECT * FROM project_links WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async updateLink(id: string, fields: Partial<any>): Promise<any | null> {
    const allowed = ['link_name', 'url', 'provider_id', 'uid_mode', 'status',
                     'uid_param', 'uid_placeholder', 'vendor_id', 'target_completes'];
    const sets: string[] = []; const params: any[] = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) { params.push(fields[key]); sets.push(`${key} = $${params.length}`); }
    }
    if (sets.length === 0) return null;
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE project_links SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params
    );
    return rows[0] ?? null;
  }

  async deleteLink(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM project_links WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  // ── Link-Vendor Assignments ────────────────────────────────────────────────
  async assignVendorToLink(data: {
    link_id: string; vendor_id: string; vendor_cpi?: number;
    target_completes?: number; max_completes?: number;
  }): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO link_vendor_assignments (link_id, vendor_id, vendor_cpi, target_completes, max_completes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (link_id, vendor_id) DO UPDATE SET
         vendor_cpi = EXCLUDED.vendor_cpi, target_completes = EXCLUDED.target_completes,
         max_completes = EXCLUDED.max_completes, updated_at = NOW()
       RETURNING *`,
      [data.link_id, data.vendor_id, data.vendor_cpi || 0, data.target_completes || 0, data.max_completes || 0]
    );
    return rows[0];
  }

  async getLinkVendorAssignments(linkId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT lva.*, v.name as vendor_name FROM link_vendor_assignments lva
       LEFT JOIN vendors v ON v.id = lva.vendor_id WHERE lva.link_id = $1`, [linkId]
    );
    return rows;
  }

  async removeVendorFromLink(linkId: string, vendorId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM link_vendor_assignments WHERE link_id = $1 AND vendor_id = $2', [linkId, vendorId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ── Quotas (generic) ───────────────────────────────────────────────────────

  async getQuotas(table: 'project_quotas' | 'country_quotas' | 'link_quotas', entityId: string): Promise<any[]> {
    const entityKey = table === 'project_quotas' ? 'project_id' : table === 'country_quotas' ? 'country_id' : 'link_id';
    const { rows } = await this.pool.query(
      `SELECT * FROM ${table} WHERE ${entityKey} = $1 ORDER BY created_at`, [entityId]
    );
    return rows;
  }

  async updateQuota(table: 'project_quotas' | 'country_quotas' | 'link_quotas', id: string, fields: Partial<any>): Promise<any | null> {
    const allowed = ['name', 'quota_type', 'target', 'achieved', 'status', 'criteria_json'];
    const sets: string[] = []; const params: any[] = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(key === 'criteria_json' ? JSON.stringify(fields[key]) : fields[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) return null;
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${table} SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params
    );
    return rows[0] ?? null;
  }

  async deleteQuota(table: 'project_quotas' | 'country_quotas' | 'link_quotas', id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  // ── Project Analytics ──────────────────────────────────────────────────────
  async getProjectAnalytics(projectId: string): Promise<any> {
    const { rows: [project] } = await this.pool.query(
      'SELECT * FROM projects WHERE id = $1', [projectId]
    );
    const { rows: countries } = await this.pool.query(
      'SELECT COUNT(*) as total FROM project_countries WHERE project_id = $1', [projectId]
    );
    const { rows: links } = await this.pool.query(
      `SELECT COUNT(*) as total FROM project_links pl
       JOIN project_countries pc ON pc.id = pl.country_id WHERE pc.project_id = $1`, [projectId]
    );
    const { rows: assignments } = await this.pool.query(
      `SELECT COUNT(*) as total FROM link_vendor_assignments lva
       JOIN project_links pl ON pl.id = lva.link_id
       JOIN project_countries pc ON pc.id = pl.country_id WHERE pc.project_id = $1`, [projectId]
    );
    const { rows: quotRows } = await this.pool.query(
      `SELECT COALESCE(SUM(pq.target), 0) as target, COALESCE(SUM(pq.achieved), 0) as achieved
       FROM project_quotas pq WHERE pq.project_id = $1`, [projectId]
    );
    return {
      project, countries: parseInt(countries[0].total, 10),
      links: parseInt(links[0].total, 10), vendorAssignments: parseInt(assignments[0].total, 10),
      quotas: { target: parseInt(quotRows[0].target, 10), achieved: parseInt(quotRows[0].achieved, 10) },
    };
  }

  // ── Country Analytics ──────────────────────────────────────────────────────
  async getCountryAnalytics(countryId: string): Promise<any> {
    const { rows: [country] } = await this.pool.query('SELECT * FROM project_countries WHERE id = $1', [countryId]);
    const { rows: links } = await this.pool.query(
      'SELECT COUNT(*) as total FROM project_links WHERE country_id = $1', [countryId]
    );
    const { rows: assignments } = await this.pool.query(
      `SELECT COUNT(*) as total FROM link_vendor_assignments lva
       JOIN project_links pl ON pl.id = lva.link_id WHERE pl.country_id = $1`, [countryId]
    );
    const { rows: quotRows } = await this.pool.query(
      `SELECT COALESCE(SUM(cq.target), 0) as target, COALESCE(SUM(cq.achieved), 0) as achieved
       FROM country_quotas cq WHERE cq.country_id = $1`, [countryId]
    );
    return {
      country, links: parseInt(links[0].total, 10),
      vendorAssignments: parseInt(assignments[0].total, 10),
      quotas: { target: parseInt(quotRows[0].target, 10), achieved: parseInt(quotRows[0].achieved, 10) },
    };
  }

  // ── Link Analytics ─────────────────────────────────────────────────────────
  async getLinkAnalytics(linkId: string): Promise<any> {
    const { rows: [link] } = await this.pool.query('SELECT * FROM project_links WHERE id = $1', [linkId]);
    const { rows: assignments } = await this.pool.query(
      `SELECT lva.*, v.name as vendor_name FROM link_vendor_assignments lva
       LEFT JOIN vendors v ON v.id = lva.vendor_id WHERE lva.link_id = $1`, [linkId]
    );
    const { rows: quotRows } = await this.pool.query(
      `SELECT COALESCE(SUM(lq.target), 0) as target, COALESCE(SUM(lq.achieved), 0) as achieved
       FROM link_quotas lq WHERE lq.link_id = $1`, [linkId]
    );
    return {
      link, vendorAssignments: assignments,
      quotas: { target: parseInt(quotRows[0].target, 10), achieved: parseInt(quotRows[0].achieved, 10) },
    };
  }
}

// Initialize the database instance after class definition
// creation from module load to first query, preventing FUNCTION_INVOCATION_FAILED on Vercel
let databaseInstance: any = null;

function getDbInstance(): any {
  if (databaseInstance) return databaseInstance;
  if (USE_SQLITE) {
    console.log('[DB] Using SQLite for local development');
    // Synchronously require better-sqlite3 only when actually needed
    const sqliteModule = require('./sqlite');
    sqliteModule.initDatabase(config.authSecret);
    databaseInstance = sqliteModule.sqliteDb;
  } else {
    console.log('[DB] Using PostgreSQL (Supabase)');
    databaseInstance = new Database();
  }
  return databaseInstance;
}

export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getDbInstance();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
  apply(_target, thisArg, args) {
    return getDbInstance()(...args);
  },
});