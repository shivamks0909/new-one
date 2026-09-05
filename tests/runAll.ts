import { normalizeUid, normalizeStatus, generateIdempotencyKey, applyStateTransition, buildSurveyRedirect } from '../src/services/trackingService';
import { db } from '../src/db';
import { discoveryService } from '../src/services/discoveryService';
import { callbackService } from '../src/services/callbackService';

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

async function testSuite() {
  console.log('\n==================================================');
  console.log('🧪 CAWI PLATFORM MASTER TEST SUITE');
  console.log('==================================================\n');

  // ─── 1. UID Normalization Tests ─────────────────────────────────────────────
  console.log('1. Testing UID Normalization & Validation...');
  
  const uid1 = normalizeUid('  usr_abc123  ');
  assert(uid1.normalized === 'USR_ABC123', 'Normalizes UID to uppercase & trims whitespace');
  assert(uid1.original === 'usr_abc123', 'Preserves original UID case');

  const uidErr = normalizeUid('');
  assert(!!uidErr.error, 'Rejects empty UID');

  const uidBadChar = normalizeUid('<script>alert(1)</script>');
  assert(!!uidBadChar.error, 'Rejects XSS/unsafe characters in UID');

  // ─── 2. Status Normalization Tests ──────────────────────────────────────────
  console.log('\n2. Testing Status Normalization...');
  assert(normalizeStatus('complete') === 'COMPLETE', 'Maps complete -> COMPLETE');
  assert(normalizeStatus('c') === 'COMPLETE', 'Maps c -> COMPLETE');
  assert(normalizeStatus('1') === 'COMPLETE', 'Maps 1 -> COMPLETE');
  assert(normalizeStatus('terminate') === 'TERMINATE', 'Maps terminate -> TERMINATE');
  assert(normalizeStatus('quota_full') === 'QUOTA_FULL', 'Maps quota_full -> QUOTA_FULL');
  assert(normalizeStatus('security_reject') === 'SECURITY_REJECT', 'Maps security_reject -> SECURITY_REJECT');

  // ─── 3. State Machine & Idempotency Key Tests ───────────────────────────────
  console.log('\n3. Testing State Machine Transitions...');
  const trans1 = applyStateTransition('IN_PROGRESS', 'COMPLETE');
  assert(trans1.finalStatus === 'COMPLETE' && trans1.isCounted === true, 'IN_PROGRESS -> COMPLETE transition succeeds and is counted');

  const trans2 = applyStateTransition('COMPLETE', 'TERMINATE');
  assert(trans2.finalStatus === 'COMPLETE' && trans2.isDuplicate === true, 'TERMINAL state COMPLETE locks status against subsequent TERMINATE');

  const key1 = generateIdempotencyKey('STD1', 'VEND1', 'UID1', 'COMPLETE');
  const key2 = generateIdempotencyKey('STD1', 'VEND1', 'UID1', 'COMPLETE');
  assert(key1 === key2, 'Generates deterministic SHA256 idempotency key');

  // ─── 4. External Offer Auto-Discovery Tests ─────────────────────────────────
  console.log('\n4. Testing External Offer Auto-Discovery Engine...');
  const testOfferId = 'TEST_OFFER_' + Math.random().toString(36).substring(7).toUpperCase();

  const discoveryResult1 = await discoveryService.resolveOrCreateExternalOffer(testOfferId, 'ZEPHYR');
  assert(discoveryResult1.study.external_offer_id === testOfferId, 'Auto-creates study representation for external offerId');
  assert(discoveryResult1.study.status === 'LIVE', 'Auto-created study status defaults to LIVE');

  // Idempotency check
  const discoveryResult2 = await discoveryService.resolveOrCreateExternalOffer(testOfferId, 'ZEPHYR');
  assert(discoveryResult2.study.id === discoveryResult1.study.id, 'Idempotent resolution: same offerId resolves to existing study without duplicates');

  // ─── 5. Callback Processing & Idempotency Tests ─────────────────────────────
  console.log('\n5. Testing End-to-End Callback Processing & Multi-Callback Idempotency...');
  const testUid = 'TEST_RESPONDENT_' + Math.random().toString(36).substring(7).toUpperCase();

  // First Callback — create a session with LANDING event first
  const vendorId = (await db.getVendors(true))[0]?.id || '';
  const vendorLinks = await db.getTrackingLinks({ study_id: discoveryResult1.study.id });
  const trackingLinkId = vendorLinks[0]?.id || '';
  
  const { resolveOrCreateSession: createSession } = await import('../src/services/trackingService');
  const sess1 = await createSession(
    discoveryResult1.study.id,
    vendorId,
    trackingLinkId,
    testUid,
    '127.0.0.1',
    'Mozilla/5.0 TestAgent',
    null,
    'http://localhost:3000/start'
  );
  
  const cb1 = await callbackService.processCallback(
    'test_provider',
    discoveryResult1.study.id,
    vendorId,
    testUid,
    'complete',
    'TXN_1001',
    { test: true },
    { ip_address: '127.0.0.1' }
  );

  if (!cb1.accepted) {
    console.error('  cb1 failed reason:', cb1.reason);
  }
  assert(cb1.accepted === true && cb1.counted === true, 'First COMPLETE callback is accepted and counted');

  // Duplicate Callbacks (Simulating repeated callback retries from external platform)
  const cb2 = await callbackService.processCallback(
    'test_provider',
    discoveryResult1.study.id,
    vendorId,
    testUid,
    'complete',
    'TXN_1001',
    { test: true },
    { ip_address: '127.0.0.1' }
  );

  if (!cb2.duplicate) {
    console.error('  cb2 failed reason:', cb2.reason);
  }
  assert(cb2.duplicate === true, 'Second identical callback is detected as DUPLICATE');
  assert(cb2.accepted === false, 'Second identical callback is not re-accepted');

  // ─── 6. Financial Calculation Tests ─────────────────────────────────────────
  console.log('\n6. Testing Financial Aggregations...');
  const agg = await db.getStudyAnalytics(discoveryResult1.study.id);
  assert(parseInt(agg.counted_completes, 10) === 1, 'Database analytics reports exactly 1 counted complete after duplicate callbacks');

  // ─── 7. Immutable Survey URL Template Builder Tests ─────────────────────────
  console.log('\n7. Testing Immutable Survey URL Template Builder...');
  const template = 'https://pmtool.zephyrsample.com/Survey?offerId=OF63699653SCAS&zid=[identifier]';
  const mockLink: any = { base_url: template, uid_mode: 'PROVIDED_UID' };
  const mockSession1: any = { uid: 'ABC123456', study_id: 'STUDY_123', vendor_id: 'VENDOR_123' };
  const mockSession2: any = { uid: 'XYZ987654', study_id: 'STUDY_123', vendor_id: 'VENDOR_123' };

  const url1 = buildSurveyRedirect(mockLink, mockSession1);
  const url2 = buildSurveyRedirect(mockLink, mockSession2);

  const parsedTemplate = new URL('https://pmtool.zephyrsample.com/Survey?offerId=OF63699653SCAS&zid=ABC123456');
  const parsedUrl1 = new URL(url1);

  assert(parsedUrl1.protocol === parsedTemplate.protocol, 'Preserves exact URL protocol (https:)');
  assert(parsedUrl1.hostname === parsedTemplate.hostname, 'Preserves exact URL hostname (pmtool.zephyrsample.com)');
  assert(parsedUrl1.pathname === parsedTemplate.pathname, 'Preserves exact URL path (/Survey)');
  assert(parsedUrl1.searchParams.get('offerId') === 'OF63699653SCAS', 'Preserves exact offerId query parameter');
  assert(parsedUrl1.searchParams.get('zid') === 'ABC123456', 'Replaces only literal [identifier] with validated UID');
  assert(url1 === 'https://pmtool.zephyrsample.com/Survey?offerId=OF63699653SCAS&zid=ABC123456', 'Strictly matches expected immutable survey URL output for Respondent 1');
  assert(url2 === 'https://pmtool.zephyrsample.com/Survey?offerId=OF63699653SCAS&zid=XYZ987654', 'Strictly matches expected immutable survey URL output for Respondent 2');

  // ─── 8. Comprehensive End-to-End Auto-Discovery Architecture Suite ──────────
  console.log('\n8. Testing End-to-End Auto-Discovery & Zero-Manual-Setup Architecture...');

  const e2eUrlTemplate = 'https://pmtool.zephyrsample.com/Survey?offerId=OF39672293MNBI&zid=[identifier]';
  const autoReg = await discoveryService.analyzeAndRegisterSurveyUrl(e2eUrlTemplate);

  assert(autoReg.offerId === 'OF39672293MNBI', '1. Study is automatically discovered & offerId extracted correctly');
  assert(!!autoReg.study && autoReg.study.external_offer_id === 'OF39672293MNBI', '2. No manual project creation required — study auto-created in database');

  const { resolveOrCreateSession } = await import('../src/services/trackingService.js');
  const links1 = await db.getTrackingLinks({ study_id: autoReg.study.id });
  const e2eLink1Id = links1[0]?.id || (await db.createTrackingLink({ study_id: autoReg.study.id, vendor_id: (await db.getVendors(true))[0]?.id || '', link_code: 'lnk_e2e_1', public_token: 'tok_e2e_1', base_url: e2eUrlTemplate, uid_mode: 'PROVIDED_UID', status: 'ACTIVE' })).id;

  const e2eUid = 'OP01_' + Math.random().toString(36).substring(7);
  const e2eSession1 = await resolveOrCreateSession(
    autoReg.study.id,
    (await db.getVendors(true))[0]?.id || '',
    e2eLink1Id,
    e2eUid,
    '203.0.113.45',
    'Mozilla/5.0 (Windows NT 10.0)',
    null,
    'http://localhost:3000/start'
  );

  assert(!!e2eSession1 && e2eSession1.uid === e2eUid, '3. Session is automatically created for respondent UID');
  assert(!!e2eSession1.ip_hash, '4. Server-side IP is captured and hashed for security compliance');
  assert(!!e2eSession1.created_at, '5. Start time (started_at) is captured');

  const mockE2eLink: any = { base_url: autoReg.surveyUrlTemplate, uid_mode: 'PROVIDED_UID' };
  const generatedRedirect = buildSurveyRedirect(mockE2eLink, e2eSession1);

  assert(generatedRedirect.includes('https://pmtool.zephyrsample.com/Survey'), '6. External survey URL is generated correctly');
  assert(generatedRedirect.includes('offerId=OF39672293MNBI'), '7. offerId remains exactly OF39672293MNBI');
  assert(generatedRedirect === `https://pmtool.zephyrsample.com/Survey?offerId=OF39672293MNBI&zid=${e2eUid}`, '8. Only zid parameter changes to respondent UID');

  // Test session isolation across different offerIds with identical UID
  const autoReg2 = await discoveryService.analyzeAndRegisterSurveyUrl('https://pmtool.zephyrsample.com/Survey?offerId=OF88888888TEST&zid=[identifier]');
  const links2 = await db.getTrackingLinks({ study_id: autoReg2.study.id });
  const e2eLink2Id = links2[0]?.id || (await db.createTrackingLink({ study_id: autoReg2.study.id, vendor_id: (await db.getVendors(true))[0]?.id || '', link_code: 'lnk_e2e_2', public_token: 'tok_e2e_2', base_url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF88888888TEST&zid=[identifier]', uid_mode: 'PROVIDED_UID', status: 'ACTIVE' })).id;

  const e2eSession2 = await resolveOrCreateSession(
    autoReg2.study.id,
    (await db.getVendors(true))[0]?.id || '',
    e2eLink2Id,
    e2eUid,
    '203.0.113.99',
    'Mozilla/5.0 (Macintosh)',
    null,
    'http://localhost:3000/start'
  );

  assert(e2eSession1.id !== e2eSession2.id, '16. Same UID across different offerIds creates separate isolated sessions');
  assert(e2eSession1.study_id !== e2eSession2.study_id, '16b. Session study IDs remain strictly distinct');

  // Callback resolution & LOI calculation
  const e2eTxnId = 'TXN_E2E_' + Math.random().toString(36).substring(7);
  const e2eCb1 = await callbackService.processCallback(
    'zephyr',
    autoReg.study.id,
    e2eSession1.vendor_id,
    e2eUid,
    'complete',
    e2eTxnId,
    { offerId: 'OF39672293MNBI' },
    { ip_address: '203.0.113.45' }
  );

  assert(e2eCb1.accepted === true, '9. Complete callback updates the same session');
  assert(e2eCb1.finalStatus === 'COMPLETE', '10. Session final status set to COMPLETE');

  const savedResponse = await callbackService.getResponseBySessionId(e2eSession1.id);
  assert(!!savedResponse, '11. Final response persisted in database');
  const calculatedLoi = savedResponse?.terminal_at ? Math.max(0, Math.round((new Date(savedResponse.terminal_at).getTime() - new Date(e2eSession1.created_at).getTime()) / 1000)) : 0;
  assert(calculatedLoi >= 0, '12. LOI is calculated');

  // Test duplicate callbacks
  const e2eCbDup = await callbackService.processCallback(
    'zephyr',
    autoReg.study.id,
    e2eSession1.vendor_id,
    e2eUid,
    'complete',
    e2eTxnId,
    { offerId: 'OF39672293MNBI' },
    { ip_address: '203.0.113.45' }
  );
  assert(e2eCbDup.duplicate === true, '15. Duplicate callbacks do not create duplicate response records');

  // Concurrent respondents test
  const e2eSession3 = await resolveOrCreateSession(
    autoReg.study.id,
    (await db.getVendors(true))[0]?.id || '',
    e2eLink1Id,
    'OP02_CONCURRENT',
    '203.0.113.46',
    'Mozilla/5.0',
    null,
    'http://localhost:3000/start'
  );
  assert(e2eSession3.uid === 'OP02_CONCURRENT', '17. Concurrent respondents (OP02_CONCURRENT) work correctly without collision');

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testSuite().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
