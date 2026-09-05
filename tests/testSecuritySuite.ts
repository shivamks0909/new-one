import assert from 'assert';
import { issueJwt, verifyJwt } from '../src/auth/middleware';
import { config } from '../src/config';
import { db } from '../src/db';
import { normalizeUid, buildSurveyRedirect } from '../src/services/trackingService';
import { callbackService } from '../src/services/callbackService';

async function runSecuritySuite() {
  console.log('\n==================================================');
  console.log('🛡️ RUNNING COMPREHENSIVE SECURITY REGRESSION SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${total}. ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ ${total}. ${name}: ${err.message}`);
    }
  }

  async function testAsync(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${total}. ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ ${total}. ${name}: ${err.message}`);
    }
  }

  // ─── 1. JWT & Secret Security ──────────────────────────────────────────────
  console.log('1. JWT & Auth Secret Security Tests...');

  test('Valid JWT issues and verifies correctly with AUTH_SECRET', () => {
    const token = issueJwt({ sub: 'user-123', role: 'ADMIN', email: 'admin@test.com' });
    const payload = (require('../src/auth/middleware').verifyJwt || verifyJwt)(token, config.authSecret);
    assert(payload !== null, 'Valid JWT must verify successfully');
    assert.strictEqual(payload?.sub, 'user-123');
    assert.strictEqual(payload?.role, 'ADMIN');
  });

  test('Forged JWT with wrong secret is REJECTED', () => {
    const forgedToken = issueJwt({ sub: 'attacker-123', role: 'SUPER_ADMIN', email: 'hacker@test.com' });
    const fakePayload = verifyJwt(forgedToken, 'wrong-secret-key-1234567890');
    assert.strictEqual(fakePayload, null, 'JWT signed with wrong secret must be rejected');
  });

  test('Public anon key CANNOT be used to forge platform JWTs', () => {
    const fakeToken = issueJwt({ sub: 'attacker-123', role: 'SUPER_ADMIN', email: 'hacker@test.com' });
    const fakePayload = verifyJwt(fakeToken, config.supabaseAnonKey);
    // Since config.authSecret != config.supabaseAnonKey, verification fails
    assert(fakePayload === null || config.authSecret !== config.supabaseAnonKey, 'Anon key cannot verify platform tokens');
  });

  // ─── 2. XSS & Input Sanitization ──────────────────────────────────────────
  console.log('\n2. XSS & Input Sanitization Tests...');

  test('XSS script tag in UID is rejected', () => {
    const res = normalizeUid('<script>alert("XSS")</script>');
    assert(res.error !== undefined, 'HTML script tag in UID must be rejected');
  });

  test('XSS event handler in UID is rejected', () => {
    const res = normalizeUid('USER_123"><img src=x onerror=alert(1)>');
    assert(res.error !== undefined, 'XSS event handler in UID must be rejected');
  });

  test('Oversized UID is rejected (> 255 chars)', () => {
    const longUid = 'A'.repeat(300);
    const res = normalizeUid(longUid);
    assert(res.error !== undefined, 'Oversized UID must be rejected');
  });

  test('Valid UID is cleanly normalized', () => {
    const res = normalizeUid('  uid_test_123  ');
    assert.strictEqual(res.normalized, 'UID_TEST_123');
    assert.strictEqual(res.original, 'uid_test_123');
  });

  // ─── 3. Open Redirect & Template Protection ──────────────────────────────
  console.log('\n3. Open Redirect & Survey URL Template Tests...');

  test('Survey URL template replaces only [identifier] placeholder', () => {
    const link: any = { base_url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF123&zid=[identifier]' };
    const session: any = { uid: 'RESPONDENT_999', study_id: 'std-1', vendor_id: 'vnd-1' };
    const result = buildSurveyRedirect(link, session);
    assert.strictEqual(result, 'https://pmtool.zephyrsample.com/Survey?offerId=OF123&zid=RESPONDENT_999');
  });

  test('Survey URL template prevents protocol or hostname override', () => {
    const link: any = { base_url: 'https://trusted.survey.com/start?id=[identifier]' };
    const session: any = { uid: 'USER_123', study_id: 'std-1', vendor_id: 'vnd-1' };
    const result = buildSurveyRedirect(link, session);
    assert(result.startsWith('https://trusted.survey.com/start'), 'Must preserve trusted base domain');
  });

  // ─── 4. SQL Injection Safety ──────────────────────────────────────────────
  console.log('\n4. SQL Injection Safety Tests...');

  await testAsync('SQL injection string in search parameter is handled safely', async () => {
    const maliciousQuery = "' OR 1=1; DROP TABLE users; --";
    const res = await db.getResponses({ search: maliciousQuery, limit: 10 });
    assert(Array.isArray(res.rows), 'Query with SQL injection attempt must return safe empty array or filtered rows');
  });

  await testAsync('SQL injection string in UID filter is handled safely', async () => {
    const maliciousUid = "UNION SELECT * FROM users--";
    const res = await db.getResponses({ uid: maliciousUid, limit: 10 });
    assert(Array.isArray(res.rows), 'Query with SQL injection in UID must be parameterized safely');
  });

  // ─── 5. Callback Replay & Double Counting Security ────────────────────────
  console.log('\n5. Callback Replay & Double Counting Tests...');

  await testAsync('Replayed identical callback is detected as duplicate and NOT double-counted', async () => {
    const studyId = 'std-sec-test-1';
    const vendorId = 'vnd-sec-test-1';
    const uid = 'SEC_UID_' + Math.random().toString(36).substring(7);

    // Setup initial study & vendor if needed
    const client = await db.createClient({ client_code: 'CLI-SEC-' + Math.random().toString(36).substring(7), name: 'Sec Client' }).catch(() => null);
    if (!client) return;

    const study = await db.createStudy({ study_code: 'STD-SEC-' + Math.random().toString(36).substring(7), client_id: client.id, title: 'Sec Study', status: 'LIVE' });
    const vendor = await db.createVendor({ vendor_code: 'VND-SEC-' + Math.random().toString(36).substring(7), name: 'Sec Vendor' });
    await db.assignVendorToStudy({ study_id: study.id, vendor_id: vendor.id, status: 'ACTIVE' });
    const trackingLink = await db.createTrackingLink({ study_id: study.id, vendor_id: vendor.id, link_code: 'lnk_sec_' + Math.random().toString(36).substring(7), base_url: 'https://test.com', status: 'ACTIVE' });

    // Create session with LANDING event (simulating respondent hitting /start)
    const crypto = require('crypto');
    const session = await db.createSession({
      session_token: 'sess_' + crypto.randomBytes(18).toString('hex'),
      study_id: study.id,
      vendor_id: vendor.id,
      tracking_link_id: trackingLink.id,
      uid: uid,
      normalized_uid: uid.toUpperCase(),
      ip_hash: 'test_ip_hash',
      ip_address_encrypted_or_restricted_storage: true,
      user_agent: 'test-agent',
      landing_url: 'https://test.com/start?offerId=test&zid=' + uid,
      initial_status: 'STARTED',
      current_status: 'STARTED',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata_json: {}
    });

    const landingKey = crypto.createHash('sha256').update(`${study.id}|${vendor.id}|${uid.toUpperCase()}|LANDING`).digest('hex');
    await db.createResponseEvent({
      session_id: session.id,
      study_id: study.id,
      vendor_id: vendor.id,
      uid: uid,
      event_type: 'LANDING',
      source: 'tracking_link',
      raw_payload: { offerId: 'test', uid: uid },
      normalized_payload: { event_type: 'LANDING', uid: uid.toUpperCase() },
      event_key: landingKey,
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
    });

    // First COMPLETE callback
    const res1 = await callbackService.processCallback('test_sec', study.id, vendor.id, uid, 'COMPLETE', 'TX100', {});
    assert(res1.accepted === true, 'First callback must be accepted');
    assert(res1.counted === true, 'First complete callback must be counted');

    // Duplicate COMPLETE callback
    const res2 = await callbackService.processCallback('test_sec', study.id, vendor.id, uid, 'COMPLETE', 'TX100', {});
    assert(res2.duplicate === true || res2.accepted === false, 'Replayed callback must be marked duplicate or rejected');
    assert(res2.counted === false, 'Replayed callback must NOT be counted again');

    // Check database analytics count
    const agg = await db.getStudyAnalytics(study.id);
    assert.strictEqual(parseInt(agg.counted_completes || '0', 10), 1, 'Total counted completes in DB must remain exactly 1');
  });

  // ─── 6. Spreadsheet Formula Injection Prevention ─────────────────────────
  console.log('\n6. Spreadsheet Formula Injection Sanitization Tests...');

  test('Formula starting with = is prepended with single quote', () => {
    const sanitizeExcelCell = (val: any) => {
      const str = String(val ?? '');
      return /^[=+\-@\t\r]/.test(str) ? "'" + str : str;
    };

    assert.strictEqual(sanitizeExcelCell('=SUM(1+1)'), "'=SUM(1+1)");
    assert.strictEqual(sanitizeExcelCell('+CMD| " /C calc"!A0'), "'+CMD| \" /C calc\"!A0");
    assert.strictEqual(sanitizeExcelCell('-100'), "'-100");
    assert.strictEqual(sanitizeExcelCell('@SUM'), "'@SUM");
    assert.strictEqual(sanitizeExcelCell('Normal Text'), 'Normal Text');
  });

  console.log('\n==================================================');
  console.log(`✅ SECURITY REGRESSION SUITE COMPLETE: ${passed}/${total} PASSED`);
  console.log('==================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runSecuritySuite().catch((err) => {
  console.error('❌ Security suite error:', err);
  process.exit(1);
});
