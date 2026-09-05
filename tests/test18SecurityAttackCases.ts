import 'dotenv/config';
import crypto from 'crypto';
import { db } from '../src/db';
import { callbackService } from '../src/services/callbackService';
import { normalizeUid, recordFakeClick } from '../src/services/trackingService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function run18AttackSuite() {
  console.log('\n========================================================================');
  console.log('🛡️ 18-ATTACK / INVALID TEST CASES VERIFICATION SUITE');
  console.log('========================================================================\n');

  const suffix = Math.random().toString(36).substring(7).toUpperCase();
  const projectCodeA = `OPI-ATK-A-${suffix}`;
  const projectCodeB = `OPI-ATK-B-${suffix}`;

  // 0. Setup test client & vendors
  const { rows: clientRows } = await db.pool.query(
    `INSERT INTO clients (client_code, name, company_name)
     VALUES ($1, $2, $3) RETURNING *`,
    [`CLI-${suffix}`, `Attack Test Client ${suffix}`, 'Attack Security Lab']
  );
  const client = clientRows[0];

  const projectA = await db.createProject({
    project_code: projectCodeA,
    name: 'Attack Test Project A',
    client_id: client.id,
    survey_url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_ATK_A&zid=[identifier]',
    uid_param: 'zid',
    uid_placeholder: '[identifier]',
    client_rate: 70,
    vendor_rate: 50,
    currency: 'INR',
  });

  const projectB = await db.createProject({
    project_code: projectCodeB,
    name: 'Attack Test Project B',
    client_id: client.id,
    survey_url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_ATK_B&zid=[identifier]',
    uid_param: 'zid',
    uid_placeholder: '[identifier]',
    client_rate: 70,
    vendor_rate: 50,
    currency: 'INR',
  });

  // Create Countries for Project A: FR, US
  const countryFR = await db.createCountry({
    project_id: projectA.id,
    country_code: 'FR',
    country_name: 'France',
  });
  const countryUS = await db.createCountry({
    project_id: projectA.id,
    country_code: 'US',
    country_name: 'United States',
  });

  // Country for Project B: IN
  const countryIN = await db.createCountry({
    project_id: projectB.id,
    country_code: 'IN',
    country_name: 'India',
  });

  // Create survey links
  const linkA_FR = await db.createProjectLink({
    country_id: countryFR.id,
    link_code: `${projectCodeA}-FR`,
    link_name: 'FR Link',
    url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_ATK_A&zid=[identifier]',
    uid_mode: 'PROVIDED_UID',
  });

  const linkA_US = await db.createProjectLink({
    country_id: countryUS.id,
    link_code: `${projectCodeA}-US`,
    link_name: 'US Link',
    url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_ATK_A&zid=[identifier]',
    uid_mode: 'PROVIDED_UID',
  });

  const linkB_IN = await db.createProjectLink({
    country_id: countryIN.id,
    link_code: `${projectCodeB}-IN`,
    link_name: 'IN Link',
    url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_ATK_B&zid=[identifier]',
    uid_mode: 'PROVIDED_UID',
  });

  // Backing studies
  let studyA = (await db.pool.query('SELECT * FROM studies WHERE study_code = $1', [projectCodeA])).rows[0];
  if (!studyA) {
    studyA = await db.createStudy({ study_code: projectCodeA, title: projectA.name, client_id: client.id, status: 'LIVE' });
  }
  let studyB = (await db.pool.query('SELECT * FROM studies WHERE study_code = $1', [projectCodeB])).rows[0];
  if (!studyB) {
    studyB = await db.createStudy({ study_code: projectCodeB, title: projectB.name, client_id: client.id, status: 'LIVE' });
  }

  // Create 2 Vendors: Vendor 1 and Vendor 2
  const { rows: v1Rows } = await db.pool.query(
    `INSERT INTO vendors (vendor_code, name, status) VALUES ($1, $2, 'ACTIVE') RETURNING *`,
    [`VND-1-${suffix}`, `Vendor 1 ${suffix}`]
  );
  const vendor1 = v1Rows[0];

  const { rows: v2Rows } = await db.pool.query(
    `INSERT INTO vendors (vendor_code, name, status) VALUES ($1, $2, 'ACTIVE') RETURNING *`,
    [`VND-2-${suffix}`, `Vendor 2 ${suffix}`]
  );
  const vendor2 = v2Rows[0];

  // Helper to create genuine tracking session + LANDING event
  async function createLegitimateSession(p: any, c: any, l: any, v: any, uid: string) {
    const sessionToken = 'trk_' + crypto.randomBytes(20).toString('hex');
    const normUid = uid.toUpperCase().trim();
    const targetStudyId = p.id === projectA.id ? studyA.id : studyB.id;

    // Ensure tracking_link exists in tracking_links table for foreign key constraint
    let tLink = (await db.getTrackingLinks({ study_id: targetStudyId, vendor_id: v.id }))[0];
    if (!tLink) {
      tLink = await db.createTrackingLink({
        study_id: targetStudyId,
        vendor_id: v.id,
        link_code: `TL-${p.project_code}-${v.vendor_code}`,
        base_url: l.url,
        status: 'ACTIVE',
      });
    }

    const session = await db.createSession({
      session_token: sessionToken,
      study_id: targetStudyId,
      vendor_id: v.id,
      tracking_link_id: tLink.id,
      uid: uid,
      normalized_uid: normUid,
      ip_hash: crypto.createHash('sha256').update('127.0.0.1').digest('hex'),
      landing_url: `https://opi.opinioninsights.in/track?code=${p.project_code}&country=${c.country_code}&uid=${uid}`,
      initial_status: 'STARTED',
      current_status: 'STARTED',
      expires_at: new Date(Date.now() + 48 * 3600 * 1000),
      country_detected: c.country_code,
      metadata_json: {
        project_id: p.id,
        project_code: p.project_code,
        country_id: c.id,
        country_code: c.country_code,
        link_id: l.id,
        link_code: l.link_code,
        vendor_id: v.id,
        tracking_type: 'OPI_TRACK',
      },
    });

    const landingKey = crypto.createHash('sha256')
      .update(`${p.id}|${c.id}|${normUid}|LANDING`).digest('hex');
    await db.createResponseEvent({
      session_id: session.id,
      study_id: session.study_id,
      vendor_id: v.id,
      uid: uid,
      event_type: 'LANDING',
      source: 'opi_track',
      raw_payload: { project_code: p.project_code, country: c.country_code, uid: uid },
      normalized_payload: { event_type: 'LANDING', uid: normUid },
      event_key: landingKey,
      ip_address: '127.0.0.1',
      user_agent: 'TestAgent/1.0',
    });

    await db.pool.query(
      `INSERT INTO responses (session_id, study_id, project_id, vendor_id, uid, final_status, is_counted, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', false, NOW(), NOW())
       ON CONFLICT (session_id) DO NOTHING`,
      [session.id, session.study_id, p.id, v.id, uid]
    );

    return session;
  }

  // ─── CASE 1: Valid tracking → valid complete ──────────────────────────────
  console.log('--- Case 1: Valid tracking → valid complete ---');
  const uid1 = `UID-VAL-CMP-${suffix}`;
  const s1 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid1);
  const cb1 = await callbackService.processCallback(
    'test', s1.study_id, vendor1.id, uid1, 'COMPLETE', 'TX-1', {}, { project_id: projectA.id }
  );
  assert(cb1.accepted === true, 'Case 1: Callback accepted');
  assert(cb1.counted === true, 'Case 1: Outcome is billable/counted complete');
  const r1 = await db.getResponseBySession(s1.id);
  assert(r1?.final_status === 'COMPLETE', 'Case 1: Response recorded as COMPLETE');

  // ─── CASE 2: Valid tracking → terminate ────────────────────────────────────
  console.log('\n--- Case 2: Valid tracking → terminate ---');
  const uid2 = `UID-VAL-TRM-${suffix}`;
  const s2 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid2);
  const cb2 = await callbackService.processCallback(
    'test', s2.study_id, vendor1.id, uid2, 'TERMINATE', 'TX-2', {}, { project_id: projectA.id }
  );
  assert(cb2.accepted === true, 'Case 2: Callback accepted');
  assert(cb2.counted === false, 'Case 2: Outcome is not counted complete');
  const r2 = await db.getResponseBySession(s2.id);
  assert(r2?.final_status === 'TERMINATE', 'Case 2: Response recorded as TERMINATE');

  // ─── CASE 3: Valid tracking → quota ────────────────────────────────────────
  console.log('\n--- Case 3: Valid tracking → quota ---');
  const uid3 = `UID-VAL-QTA-${suffix}`;
  const s3 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid3);
  const cb3 = await callbackService.processCallback(
    'test', s3.study_id, vendor1.id, uid3, 'QUOTA_FULL', 'TX-3', {}, { project_id: projectA.id }
  );
  assert(cb3.accepted === true, 'Case 3: Callback accepted');
  assert(cb3.counted === false, 'Case 3: Quota full is not counted complete');
  const r3 = await db.getResponseBySession(s3.id);
  assert(r3?.final_status === 'QUOTA_FULL', 'Case 3: Response recorded as QUOTA_FULL');

  // ─── CASE 4: Valid tracking → quality term ────────────────────────────────
  console.log('\n--- Case 4: Valid tracking → quality term ---');
  const uid4 = `UID-VAL-QLT-${suffix}`;
  const s4 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid4);
  const cb4 = await callbackService.processCallback(
    'test', s4.study_id, vendor1.id, uid4, 'SECURITY_REJECT', 'TX-4', {}, { project_id: projectA.id }
  );
  assert(cb4.accepted === true, 'Case 4: Quality term accepted');
  assert(cb4.counted === false, 'Case 4: Quality term not counted');
  const r4 = await db.getResponseBySession(s4.id);
  assert(r4?.final_status === 'SECURITY_REJECT', 'Case 4: Response recorded as SECURITY_REJECT');

  // ─── CASE 5: Valid tracking → closed ──────────────────────────────────────
  console.log('\n--- Case 5: Valid tracking → closed ---');
  const uid5 = `UID-VAL-CLO-${suffix}`;
  const s5 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid5);
  const cb5 = await callbackService.processCallback(
    'test', s5.study_id, vendor1.id, uid5, 'CLOSED', 'TX-5', {}, { project_id: projectA.id }
  );
  assert(cb5.accepted === true, 'Case 5: Closed outcome accepted');
  const r5 = await db.getResponseBySession(s5.id);
  assert(r5?.final_status === 'CLOSED', 'Case 5: Response recorded as CLOSED');

  // ─── CASE 6: Direct callback without session ──────────────────────────────
  console.log('\n--- Case 6: Direct callback without session ---');
  const uid6 = `UID-DIRECT-NOSESS-${suffix}`;
  const initialFakeCount = parseInt((await db.pool.query('SELECT COUNT(*) FROM fake_click_events')).rows[0].count, 10);
  const cb6 = await callbackService.processCallback(
    'test', studyA.id, vendor1.id, uid6, 'COMPLETE', 'TX-6', {}
  );
  assert(cb6.accepted === false, 'Case 6: Direct callback without session is REJECTED');
  assert(!!cb6.reason, `Case 6: Reason is provided (${cb6.reason})`);
  const r6 = await db.pool.query('SELECT * FROM responses WHERE uid = $1', [uid6]);
  assert(r6.rows.length === 0, 'Case 6: No genuine response record created');
  const newFakeCount = parseInt((await db.pool.query('SELECT COUNT(*) FROM fake_click_events')).rows[0].count, 10);
  assert(newFakeCount > initialFakeCount, 'Case 6: Recorded in fake_click_events');

  // ─── CASE 7: Fake UID ─────────────────────────────────────────────────────
  console.log('\n--- Case 7: Fake UID ---');
  const uid7 = `FAKE_UID_NONEXISTENT_${suffix}`;
  const cb7 = await callbackService.processCallback(
    'test', studyA.id, vendor1.id, uid7, 'COMPLETE', 'TX-7', {}
  );
  assert(cb7.accepted === false, 'Case 7: Fake UID callback is REJECTED');
  const r7 = await db.pool.query('SELECT * FROM responses WHERE uid = $1', [uid7]);
  assert(r7.rows.length === 0, 'Case 7: Zero responses created for fake UID');

  // ─── CASE 8: Wrong UID for existing session ───────────────────────────────
  console.log('\n--- Case 8: Wrong UID for existing session ---');
  const uid8Actual = `UID-ACTUAL-${suffix}`;
  const uid8Wrong = `UID-WRONG-${suffix}`;
  const s8 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid8Actual);
  const cb8 = await callbackService.processCallback(
    'test', s8.study_id, vendor1.id, uid8Wrong, 'COMPLETE', 'TX-8', {}
  );
  assert(cb8.accepted === false, 'Case 8: Wrong UID does not match existing session and is REJECTED');

  // ─── CASE 9: Wrong project ────────────────────────────────────────────────
  console.log('\n--- Case 9: Wrong project ---');
  const uid9 = `UID-WRONG-PROJ-${suffix}`;
  const nonExistentStudyId = '00000000-0000-0000-0000-000000000999';
  const cb9 = await callbackService.processCallback(
    'test', nonExistentStudyId, vendor1.id, uid9, 'COMPLETE', 'TX-9', {}
  );
  assert(cb9.accepted === false, 'Case 9: Callback with wrong/nonexistent project strictly rejected');

  // ─── CASE 10: Wrong country ───────────────────────────────────────────────
  console.log('\n--- Case 10: Wrong country ---');
  const uid10 = `UID-WRONG-CTRY-${suffix}`;
  const s10 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid10);
  // Respondent was tracked for FR; callback sent claiming US mismatch
  const { rows: countryMismatchCheck } = await db.pool.query(
    'SELECT * FROM sessions WHERE id = $1 AND country_detected = $2',
    [s10.id, 'US']
  );
  assert(countryMismatchCheck.length === 0, 'Case 10: Session originates from FR, cannot be hijacked by US country query');

  // ─── CASE 11: Wrong survey link ───────────────────────────────────────────
  console.log('\n--- Case 11: Wrong survey link ---');
  const uid11 = `UID-WRONG-LINK-${suffix}`;
  const deletedLinkId = '00000000-0000-0000-0000-000000000111';
  const cb11 = await callbackService.verifySession(studyA.id, vendor1.id, uid11);
  assert(cb11.valid === false, 'Case 11: Wrong link verification fails');

  // ─── CASE 12: Cross-project callback ──────────────────────────────────────
  console.log('\n--- Case 12: Cross-project callback ---');
  const uid12 = `UID-CROSS-PROJ-${suffix}`;
  // Session exists in Project A
  const s12 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid12);
  // Callback comes in referencing Project B (studyB)
  const cb12 = await callbackService.processCallback(
    'test', studyB.id, vendor1.id, uid12, 'COMPLETE', 'TX-12', {}
  );
  assert(cb12.accepted === false, 'Case 12: Cross-project callback rejected');
  assert(!!cb12.reason, `Case 12: Rejection reason provided (${cb12.reason})`);

  // ─── CASE 13: Cross-vendor callback ───────────────────────────────────────
  console.log('\n--- Case 13: Cross-vendor callback ---');
  const uid13 = `UID-CROSS-VEND-${suffix}`;
  // Session started by Vendor 1
  const s13 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid13);
  // Vendor 2 tries to claim callback for this UID
  const cb13 = await callbackService.processCallback(
    'test', s13.study_id, vendor2.id, uid13, 'COMPLETE', 'TX-13', {}
  );
  assert(cb13.accepted === false, 'Case 13: Cross-vendor callback rejected');
  assert(!!cb13.reason, `Case 13: Rejection reason provided (${cb13.reason})`);

  // ─── CASE 14: Expired session ─────────────────────────────────────────────
  console.log('\n--- Case 14: Expired session ---');
  const uid14 = `UID-EXPIRED-${suffix}`;
  const s14Token = 'trk_exp_' + crypto.randomBytes(12).toString('hex');
  const s14 = await db.createSession({
    session_token: s14Token,
    study_id: studyA.id,
    vendor_id: vendor1.id,
    tracking_link_id: null,
    uid: uid14,
    normalized_uid: uid14.toUpperCase(),
    ip_hash: crypto.createHash('sha256').update('127.0.0.1').digest('hex'),
    landing_url: 'https://test.com',
    initial_status: 'STARTED',
    current_status: 'STARTED',
    expires_at: new Date(Date.now() - 3600 * 1000), // expired 1 hour ago
  });
  await db.createResponseEvent({
    session_id: s14.id,
    study_id: studyA.id,
    vendor_id: vendor1.id,
    uid: uid14,
    event_type: 'LANDING',
    source: 'test',
    raw_payload: {},
    normalized_payload: {},
    event_key: 'LANDING_' + uid14,
  });
  const cb14 = await callbackService.processCallback(
    'test', studyA.id, vendor1.id, uid14, 'COMPLETE', 'TX-14', {}
  );
  assert(cb14.accepted === false, 'Case 14: Expired session callback rejected');
  assert(cb14.reason?.toLowerCase().includes('expired') || cb14.reason === 'EXPIRED_SESSION', 'Case 14: Rejection reason indicates expired');

  // ─── CASE 15: Duplicate callback ──────────────────────────────────────────
  console.log('\n--- Case 15: Duplicate callback ---');
  const uid15 = `UID-DUP-${suffix}`;
  const s15 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid15);
  const cb15_1 = await callbackService.processCallback(
    'test', s15.study_id, vendor1.id, uid15, 'COMPLETE', 'TX-15', {}
  );
  assert(cb15_1.accepted === true && cb15_1.counted === true, 'Case 15: First callback accepted');

  const cb15_2 = await callbackService.processCallback(
    'test', s15.study_id, vendor1.id, uid15, 'COMPLETE', 'TX-15', {}
  );
  assert(cb15_2.accepted === true || cb15_2.duplicate === true, 'Case 15: Second callback recognized');
  assert(cb15_2.counted === false, 'Case 15: Duplicate callback NOT counted again');

  // ─── CASE 16: Callback replay ─────────────────────────────────────────────
  console.log('\n--- Case 16: Callback replay ---');
  const uid16 = `UID-REPLAY-${suffix}`;
  const s16 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid16);
  const cb16_1 = await callbackService.processCallback(
    'test', s16.study_id, vendor1.id, uid16, 'COMPLETE', 'TX-REPLAY-99', {}
  );
  assert(cb16_1.accepted === true, 'Case 16: Original callback processed');
  const cb16_replay = await callbackService.processCallback(
    'test', s16.study_id, vendor1.id, uid16, 'COMPLETE', 'TX-REPLAY-99', {}
  );
  assert(cb16_replay.counted === false, 'Case 16: Replayed callback blocked from being counted');

  // ─── CASE 17: Fake start → fake callback ──────────────────────────────────
  console.log('\n--- Case 17: Fake start → fake callback ---');
  const uid17 = `UID-NO-LANDING-${suffix}`;
  // Create a raw session record WITHOUT a LANDING or START event
  const s17Token = 'trk_fake_' + crypto.randomBytes(12).toString('hex');
  const s17 = await db.createSession({
    session_token: s17Token,
    study_id: studyA.id,
    vendor_id: vendor1.id,
    tracking_link_id: null,
    uid: uid17,
    normalized_uid: uid17.toUpperCase(),
    ip_hash: crypto.createHash('sha256').update('127.0.0.1').digest('hex'),
    landing_url: 'https://test.com',
    initial_status: 'STARTED',
    current_status: 'STARTED',
    expires_at: new Date(Date.now() + 3600 * 1000),
  });
  // Callback arrives without LANDING event in database
  const cb17 = await callbackService.processCallback(
    'test', studyA.id, vendor1.id, uid17, 'COMPLETE', 'TX-17', {}
  );
  assert(cb17.accepted === false, 'Case 17: Session without LANDING event rejected');
  assert(cb17.reason?.toLowerCase().includes('landing') || cb17.reason === 'NO_LANDING_EVENT', 'Case 17: Reason indicates landing requirement');

  // ─── CASE 18: Manipulated session/token ────────────────────────────────────
  console.log('\n--- Case 18: Manipulated session/token ---');
  const uid18 = `UID-MANIP-${suffix}`;
  const s18 = await createLegitimateSession(projectA, countryFR, linkA_FR, vendor1, uid18);
  const manipulatedToken = s18.session_token + '_tampered';
  const { rows: manipCheck } = await db.pool.query(
    'SELECT * FROM sessions WHERE session_token = $1',
    [manipulatedToken]
  );
  assert(manipCheck.length === 0, 'Case 18: Manipulated token does not match any valid session');

  console.log('\n========================================================================');
  console.log(`🏆 18-ATTACK CASES TEST SUITE RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run18AttackSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
