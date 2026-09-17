import crypto from 'crypto';
import { db } from '../db';
import { config } from '../config';

export type BlockTone = 'RUDE' | 'POLITE' | 'NEUTRAL' | 'CUSTOM';

export interface DuplicateCheckResult {
  blocked: boolean;
  softWarning?: boolean;
  blockType?: 'IP' | 'UID';
  reason?: string;
  referenceId?: string;
  tone?: BlockTone;
  headline?: string;
  message?: string;
  projectName?: string;
  projectCode?: string;
  uid?: string;
  blockedAt?: string;
  previousUsedAt?: string;
}

export function hashIp(ip: string): { saltedHash: string; rawHash: string } {
  const cleanIp = (ip || '127.0.0.1').split(',')[0].trim();
  const rawHash = crypto.createHash('sha256').update(cleanIp).digest('hex');
  const saltedHash = crypto.createHash('sha256').update(cleanIp + (config.authSecret || 'salt')).digest('hex');
  return { saltedHash, rawHash };
}

export function generateReferenceId(type: 'IP' | 'UID'): string {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `BLK-${type}-${rand}`;
}

export function getBlockMessage(
  type: 'IP' | 'UID',
  tone: BlockTone = 'RUDE',
  customIpMessage?: string | null,
  customUidMessage?: string | null
): { headline: string; message: string } {
  if (tone === 'CUSTOM') {
    if (type === 'IP' && customIpMessage?.trim()) {
      return { headline: 'Duplicate Entry Restricted', message: customIpMessage.trim() };
    }
    if (type === 'UID' && customUidMessage?.trim()) {
      return { headline: 'Identifier Already Recorded', message: customUidMessage.trim() };
    }
  }

  if (type === 'IP') {
    switch (tone) {
      case 'POLITE':
        return {
          headline: 'Survey Already Completed',
          message: 'Aapne yeh survey pehle hi safaltapoorvak poora kar liya hai. Ek respondent sirf ek baar survey de sakta hai. Sahyog ke liye dhanyawaad!',
        };
      case 'NEUTRAL':
        return {
          headline: 'Submission Restricted',
          message: 'Our records show a verified complete from this network for this study.',
        };
      case 'RUDE':
      default:
        return {
          headline: 'Pehle Hi Complete Hai!',
          message: 'Bhai, tumne is survey ko pehle hi complete kar liya hai. Fir gaand kyu marwa rahe ho?',
        };
    }
  } else {
    // UID
    switch (tone) {
      case 'POLITE':
        return {
          headline: 'Identifier In Use',
          message: 'Yeh respondent ID is survey me pehle darj ho chuki hai. Kripya naye link ya ID ke sath prayaas karein.',
        };
      case 'NEUTRAL':
        return {
          headline: 'Identifier Already Registered',
          message: 'This participant UID has an existing record on this project.',
        };
      case 'RUDE':
      default:
        return {
          headline: 'UID Pehle Se Used Hai!',
          message: 'Ye UID is project me pehle use ho chuka hai. Naya UID lekar aao, ya vendor se naya le lo.',
        };
    }
  }
}

/**
 * Checks for duplicate IP (after COMPLETE) or duplicate UID (in any status)
 * within the specified project.
 */
export async function checkDuplicateEntry(params: {
  projectId: string;
  projectCode: string;
  projectName: string;
  countryCode?: string;
  ipAddress: string;
  rawUid: string;
  normalizedUid: string;
  userAgent?: string | null;
}): Promise<DuplicateCheckResult> {
  const {
    projectId,
    projectCode,
    projectName,
    countryCode,
    ipAddress,
    rawUid,
    normalizedUid,
    userAgent,
  } = params;

  // 1. Fetch Project Fraud Configuration
  const { rows: pRows } = await db.pool.query(
    `SELECT id, name, project_code, block_duplicate_ip, block_duplicate_uid,
            soft_duplicate_mode, block_tone, allow_nat_ip, custom_ip_message, custom_uid_message
     FROM projects WHERE id = $1`,
    [projectId]
  );
  const project = pRows[0];
  if (!project) return { blocked: false };

  const blockDuplicateIp = project.block_duplicate_ip ?? true;
  const blockDuplicateUid = project.block_duplicate_uid ?? true;
  const softMode = project.soft_duplicate_mode ?? false;
  const tone: BlockTone = (project.block_tone || 'RUDE').toUpperCase() as BlockTone;
  const allowNatIp = project.allow_nat_ip ?? false;

  const { saltedHash, rawHash } = hashIp(ipAddress);

  // 2. Check IP Whitelist
  const { rows: wlRows } = await db.pool.query(
    `SELECT * FROM ip_access_rules
     WHERE (ip_hash = $1 OR ip_hash = $2)
       AND rule_type = 'WHITELIST'
       AND (project_id = $3 OR project_id IS NULL)
     LIMIT 1`,
    [saltedHash, rawHash, projectId]
  );
  const isIpWhitelisted = wlRows.length > 0;

  // 3. Rule B: Check duplicate UID in any status under same project
  if (blockDuplicateUid) {
    const { rows: uidRows } = await db.pool.query(
      `SELECT s.id, s.current_status, s.created_at
       FROM sessions s
       WHERE (s.metadata_json->>'project_id' = $1::text OR s.metadata_json->>'project_code' = $2)
         AND s.normalized_uid = $3
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [projectId, projectCode, normalizedUid]
    );

    if (uidRows.length > 0) {
      const prevSession = uidRows[0];
      const refId = generateReferenceId('UID');
      const { headline, message } = getBlockMessage('UID', tone, project.custom_ip_message, project.custom_uid_message);
      const prevDate = prevSession.created_at ? new Date(prevSession.created_at).toISOString() : new Date().toISOString();

      // Log attempt
      await db.pool.query(
        `INSERT INTO blocked_entry_attempts
          (project_id, country_code, block_type, value_hash, raw_value, reason, reference_id, ip_address, ip_hash, user_agent, tone)
         VALUES ($1, $2, 'UID', $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          projectId,
          countryCode || null,
          crypto.createHash('sha256').update(normalizedUid).digest('hex'),
          rawUid,
          `Duplicate UID '${rawUid}' already recorded (status: ${prevSession.current_status})`,
          refId,
          ipAddress,
          rawHash,
          userAgent || null,
          tone,
        ]
      );

      if (softMode) {
        return {
          blocked: false,
          softWarning: true,
          blockType: 'UID',
          reason: `Soft duplicate UID detected`,
          referenceId: refId,
        };
      }

      return {
        blocked: true,
        blockType: 'UID',
        reason: `Duplicate UID '${rawUid}' in project '${projectCode}'`,
        referenceId: refId,
        tone,
        headline,
        message,
        projectName,
        projectCode,
        uid: rawUid,
        blockedAt: new Date().toISOString(),
        previousUsedAt: prevDate,
      };
    }
  }

  // 4. Rule A: Check duplicate IP with prior COMPLETE under same project
  if (blockDuplicateIp && !isIpWhitelisted && !allowNatIp) {
    const { rows: ipRows } = await db.pool.query(
      `SELECT s.id, r.final_status, s.created_at
       FROM sessions s
       JOIN responses r ON r.session_id = s.id
       WHERE (s.metadata_json->>'project_id' = $1::text OR r.project_id = $1::uuid)
         AND (s.ip_hash = $2 OR s.ip_hash = $3)
         AND (r.final_status = 'COMPLETE' OR r.first_terminal_event = 'COMPLETE')
       LIMIT 1`,
      [projectId, saltedHash, rawHash]
    );

    if (ipRows.length > 0) {
      const refId = generateReferenceId('IP');
      const { headline, message } = getBlockMessage('IP', tone, project.custom_ip_message, project.custom_uid_message);

      // Log attempt
      await db.pool.query(
        `INSERT INTO blocked_entry_attempts
          (project_id, country_code, block_type, value_hash, raw_value, reason, reference_id, ip_address, ip_hash, user_agent, tone)
         VALUES ($1, $2, 'IP', $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          projectId,
          countryCode || null,
          rawHash,
          ipAddress,
          `Duplicate IP submitted prior COMPLETE on project '${projectCode}'`,
          refId,
          ipAddress,
          rawHash,
          userAgent || null,
          tone,
        ]
      );

      if (softMode) {
        return {
          blocked: false,
          softWarning: true,
          blockType: 'IP',
          reason: `Soft duplicate IP detected`,
          referenceId: refId,
        };
      }

      return {
        blocked: true,
        blockType: 'IP',
        reason: `Duplicate IP '${ipAddress}' with previous COMPLETE`,
        referenceId: refId,
        tone,
        headline,
        message,
        projectName,
        projectCode,
        uid: rawUid,
        blockedAt: new Date().toISOString(),
      };
    }
  }

  return { blocked: false };
}
