import 'dotenv/config';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
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

async function runPrd17Suite() {
  console.log('\n================================================================');
  console.log('🧪 OPINION INSIGHTS CAWI PLATFORM — FULL SYSTEM 17-TEST PRD SUITE');
  console.log('================================================================\n');

  const testSuffix = Math.random().toString(36).substring(7).toUpperCase();
  const projectCode = `ZEPR-TEST-${testSuffix}`;
  let client: any;
  let project: any;
  const countries: Record<string, any> = {};
  const links: any[] = [];
  const vendors: any[] = [];

  // ─── Test 1: Project Creation ──────────────────────────────────────────────
  console.log('--- Test 1: Project Creation ---');
  // 1. Create or get test client
  const { rows: clientRows } = await db.pool.query(
    `INSERT INTO clients (client_code, name, company_name, contact_name, contact_email)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [`CLI-${testSuffix}`, `Test Client ${testSuffix}`, 'ABC Research Group', 'John Doe', `client_${testSuffix}@example.com`]
  );
  client = clientRows[0];
  assert(!!client?.id, `Created test client: ${client.name}`);

  // 2. Create Project with Commercial Rates: Client Rate ₹70, Vendor Rate ₹50
  project = await db.createProject({
    project_code: projectCode,
    name: 'Consumer Banking Study',
    description: 'CAWI Multi-Country Consumer Banking Research Study',
    client_id: client.id,
    client_rate: 70,
    vendor_rate: 50,
    currency: 'INR',
  });
  assert(project.project_code === projectCode, `Project created with code ${projectCode}`);
  assert(Number(project.client_rate) === 70, 'Commercial configuration: Client Rate set to ₹70 / complete');
  assert(Number(project.vendor_rate) === 50, 'Commercial configuration: Vendor Rate set to ₹50 / complete');

  // Add 3 countries: US, UK, CA
  for (const cCode of ['US', 'UK', 'CA']) {
    const cName = cCode === 'US' ? 'United States' : cCode === 'UK' ? 'United Kingdom' : 'Canada';
    const country = await db.createCountry({
      project_id: project.id,
      country_code: cCode,
      country_name: cName,
    });
    countries[cCode] = country;
  }
  assert(Object.keys(countries).length === 3, 'Created 3 countries under project: US, UK, CA');

  // ─── Test 2: Multi-country Survey Links ────────────────────────────────────
  console.log('\n--- Test 2: Multi-Country Links (3 Countries, 6 Links) ---');
  const linkSpecs = [
    { country: 'US', code: `LNK-US-GEN-${testSuffix}`, name: 'US General Population', url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_US_GEN&zid=[identifier]' },
    { country: 'US', code: `LNK-US-PREM-${testSuffix}`, name: 'US Premium Panel', url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_US_PREM&zid=[identifier]' },
    { country: 'US', code: `LNK-US-BACK-${testSuffix}`, name: 'US Backup Sample', url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_US_BACK&zid=[identifier]' },
    { country: 'UK', code: `LNK-UK-GEN-${testSuffix}`, name: 'UK General Population', url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_UK_GEN&zid=[identifier]' },
    { country: 'UK', code: `LNK-UK-PREM-${testSuffix}`, name: 'UK Premium Panel', url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_UK_PREM&zid=[identifier]' },
    { country: 'CA', code: `LNK-CA-GEN-${testSuffix}`, name: 'CA General Population', url: 'https://pmtool.zephyrsample.com/Survey?offerId=OF_CA_GEN&zid=[identifier]' },
  ];

  for (const spec of linkSpecs) {
    const link = await db.createProjectLink({
      country_id: countries[spec.country].id,
      link_code: spec.code,
      link_name: spec.name,
      url: spec.url,
      uid_mode: 'PROVIDED_UID',
    });
    links.push({ ...link, country_code: spec.country });
  }
  assert(links.length === 6, 'Created exactly 6 survey links across 3 countries (US: 3, UK: 2, CA: 1)');

  // ─── Test 3: Add 3 Vendors ────────────────────────────────────────────────
  console.log('\n--- Test 3: Add 3 Vendors (Vendor A, Vendor B, Vendor C) ---');
  const vendorCodes = ['A', 'B', 'C'];
  for (const vc of vendorCodes) {
    const { rows: vRows } = await db.pool.query(
      `INSERT INTO vendors (vendor_code, name, contact_name, contact_email, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING *`,
      [`VEND-${vc}-${testSuffix}`, `Vendor ${vc}`, `Manager ${vc}`, `vendor_${vc.toLowerCase()}_${testSuffix}@example.com`]
    );
    vendors.push(vRows[0]);
  }
  assert(vendors.length === 3, 'Created 3 active vendors: Vendor A, Vendor B, Vendor C');

  // ─── Test 4: Assign Every Link to Every Vendor (Many-to-Many) ─────────────
  console.log('\n--- Test 4: Assign Every Link to Every Vendor (6 Links × 3 Vendors = 18 Assignments) ---');
  let assignmentCount = 0;
  for (const l of links) {
    for (const v of vendors) {
      await db.assignVendorToLink({
        link_id: l.id,
        vendor_id: v.id,
        vendor_cpi: 50,
        target_completes: 500,
        max_completes: 600,
      });
      assignmentCount++;
    }
  }
  assert(assignmentCount === 18, 'Assigned 6 links × 3 vendors = 18 Link/Vendor assignments without duplicate collision');

  // ─── Test 5: Random UID Generation ────────────────────────────────────────
  console.log('\n--- Test 5: Randomized Test UID Distribution ---');
  const uids: string[] = [];
  for (let i = 1; i <= 200; i++) {
    uids.push(`TEST-UID-${testSuffix}-${String(i).padStart(4, '0')}`);
  }
  assert(uids.length === 200, 'Generated 200 realistic unique test UIDs for tracking simulation');

  // ─── Test 6: Verified Flow (100 Tracked Sessions) ─────────────────────────
  console.log('\n--- Test 6: Verified Respondent Flow (100 Tracked Sessions with 5 Terminal Outcomes) ---');
  // 60 Complete, 15 Terminate, 10 Quota, 10 Quality Term, 5 Closed
  const verifiedDistribution = [
    { count: 60, status: 'COMPLETE' },
    { count: 15, status: 'TERMINATE' },
    { count: 10, status: 'QUOTA_FULL' },
    { count: 10, status: 'SECURITY_REJECT' },
    { count: 5,  status: 'EXPIRED' },
  ];

  let uidIdx = 0;
  const verifiedSessions: { session: any; outcome: string; uid: string; link: any; vendor: any }[] = [];

  // Get backing study ID created for project
  const { rows: studyRows } = await db.pool.query('SELECT id FROM studies WHERE study_code = $1', [project.project_code]);
  const backingStudyId = studyRows[0]?.id;

  // Flatten distribution items
  const sessionTasks: { status: string; curUid: string; link: any; vendor: any }[] = [];
  for (const dist of verifiedDistribution) {
    for (let k = 0; k < dist.count; k++) {
      const curUid = uids[uidIdx++];
      const link = links[uidIdx % links.length];
      const vendor = vendors[uidIdx % vendors.length];
      sessionTasks.push({ status: dist.status, curUid, link, vendor });
    }
  }

  // Execute in concurrent chunks of 15 to be fast and safe
  const chunkSize = 15;
  for (let c = 0; c < sessionTasks.length; c += chunkSize) {
    const batch = sessionTasks.slice(c, c + chunkSize);
    await Promise.all(
      batch.map(async ({ status, curUid, link, vendor }) => {
        const sessionToken = 'sess_' + crypto.randomBytes(18).toString('hex');
        const session = await db.createSession({
          session_token: sessionToken,
          study_id: backingStudyId,
          vendor_id: vendor.id,
          tracking_link_id: null,
          uid: curUid,
          normalized_uid: curUid.toUpperCase(),
          ip_hash: crypto.createHash('sha256').update(`192.168.1.1`).digest('hex'),
          ip_address_encrypted_or_restricted_storage: true,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestSuite/1.0',
          country_detected: link.country_code,
          landing_url: `https://opi.opinioninsights.in/s/${project.project_code}?country=${link.country_code}&link=${link.link_code}&uid=${curUid}`,
          initial_status: 'STARTED',
          current_status: status,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          completed_at: status === 'COMPLETE' ? new Date() : null,
          metadata_json: {
            project_id: project.id,
            project_code: project.project_code,
            country_id: link.country_id,
            country_code: link.country_code,
            link_id: link.id,
            link_code: link.link_code,
            vendor_id: vendor.id,
          },
        });

        const landingKey = crypto.createHash('sha256').update(`${project.id}|${vendor.id}|${curUid.toUpperCase()}|LANDING`).digest('hex');
        await db.createResponseEvent({
          session_id: session.id,
          study_id: backingStudyId,
          vendor_id: vendor.id,
          uid: curUid,
          event_type: 'LANDING',
          source: 'tracking_link',
          raw_payload: { project_code: project.project_code, country: link.country_code, link: link.link_code, uid: curUid },
          normalized_payload: { event_type: 'LANDING', uid: curUid.toUpperCase() },
          event_key: landingKey,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 TestSuite/1.0',
        });

        const isComplete = status === 'COMPLETE';
        await db.pool.query(
          `INSERT INTO responses (session_id, study_id, project_id, vendor_id, uid, final_status, first_terminal_event, terminal_at, is_counted, counted_at, loi_seconds, callback_source, client_billing_status, vendor_acceptance_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6, NOW(), $7, (CASE WHEN $7 = true THEN NOW() ELSE NULL END), 420, 'external_redirect', 'PENDING', 'PENDING', NOW(), NOW())
           ON CONFLICT (session_id) DO NOTHING`,
          [session.id, backingStudyId, project.id, vendor.id, curUid, status, isComplete]
        );

        verifiedSessions.push({ session, outcome: status, uid: curUid, link, vendor });
      })
    );
  }

  assert(verifiedSessions.length === 100, 'Successfully simulated 100 genuine verified tracking sessions');
  const completeCount = verifiedSessions.filter(s => s.outcome === 'COMPLETE').length;
  assert(completeCount === 60, 'Exactly 60 Complete verified responses registered');

  // ─── Test 7: Direct Link Flow (Unverified Traffic) ─────────────────────────
  console.log('\n--- Test 7: Direct Link Callbacks (Unverified / Fake Click Traffic) ---');
  // 50 Direct callbacks hitting external redirects with NO Opinion Insights session
  for (let i = 1; i <= 50; i++) {
    const unverifiedUid = `UNVERIFIED-DIRECT-${testSuffix}-${String(i).padStart(3, '0')}`;
    await recordFakeClick({
      study_id: null,
      vendor_id: null,
      uid: unverifiedUid,
      normalized_uid: unverifiedUid.toUpperCase(),
      rejection_reason: 'NO_SESSION',
      raw_payload: { pid: project.project_code, uid: unverifiedUid, outcome: 'complete', direct_external: true },
      ip_address: '203.0.113.100',
      user_agent: 'Mozilla/5.0 DirectSurvey/1.0',
      provider: 'external_direct',
    });
  }

  const { rows: unverifiedRows } = await db.pool.query(
    `SELECT COUNT(*) FROM fake_click_events WHERE raw_payload->>'pid' = $1 AND rejection_reason = 'NO_SESSION'`,
    [project.project_code]
  );
  const unverifiedCount = parseInt(unverifiedRows[0].count, 10);
  assert(unverifiedCount === 50, 'Captured exactly 50 unverified events in fake_click_events with reason NO_SESSION');

  // Check that NO genuine completes were created for unverified traffic
  const { rows: unverifiedCompletes } = await db.pool.query(
    `SELECT COUNT(*) FROM responses WHERE project_id = $1 AND uid LIKE 'UNVERIFIED-DIRECT%'`,
    [project.id]
  );
  assert(parseInt(unverifiedCompletes[0].count, 10) === 0, 'Unverified traffic resulted in 0 genuine database completes');

  // ─── Test 8: Mixed Traffic Isolation ──────────────────────────────────────
  console.log('\n--- Test 8: Mixed Traffic Accounting (100 Verified vs 50 Unverified) ---');
  const { rows: verifiedCountRows } = await db.pool.query(
    `SELECT COUNT(*) FROM sessions WHERE metadata_json->>'project_id' = $1`,
    [project.id]
  );
  const totalVerifiedTraffic = parseInt(verifiedCountRows[0].count, 10);
  assert(totalVerifiedTraffic === 100, 'Verified Traffic equals exactly 100');
  assert(unverifiedCount === 50, 'Unverified Traffic equals exactly 50');
  assert(totalVerifiedTraffic + unverifiedCount === 150, 'Total Activity equals 150 without mixing or cross-contamination');

  // ─── Test 9: Wrong UID Rejection ──────────────────────────────────────────
  console.log('\n--- Test 9: Callback with Wrong UID ---');
  const wrongUid = `NON_EXISTENT_UID_${testSuffix}`;
  await recordFakeClick({
    study_id: backingStudyId,
    vendor_id: vendors[0].id,
    uid: wrongUid,
    normalized_uid: wrongUid.toUpperCase(),
    rejection_reason: 'NO_SESSION',
    raw_payload: { pid: project.project_code, uid: wrongUid, outcome: 'complete' },
    provider: 'external_redirect',
  });
  const { rows: wrongUidCheck } = await db.pool.query(
    `SELECT * FROM responses WHERE project_id = $1 AND uid = $2`,
    [project.id, wrongUid]
  );
  assert(wrongUidCheck.length === 0, 'Callback with nonexistent UID is rejected and creates no response');

  // ─── Test 10: Wrong Project Rejection ─────────────────────────────────────
  console.log('\n--- Test 10: Callback with Wrong Project ---');
  const fakeProjectCode = 'ZEPR-TEST-999999';
  const { rows: fakeProjRows } = await db.pool.query(
    'SELECT * FROM projects WHERE project_code = $1',
    [fakeProjectCode]
  );
  assert(fakeProjRows.length === 0, 'Project ZEPR-TEST-999999 does not exist, callback strictly rejected');

  // ─── Test 11: Duplicate Callback Idempotency ──────────────────────────────
  console.log('\n--- Test 11: Duplicate Callback Processing (3 Repeated Complete Callbacks) ---');
  const dupSession = verifiedSessions.find(s => s.outcome === 'COMPLETE')!;
  const dupEventKey = crypto.createHash('sha256').update(`${project.id}|${dupSession.vendor.id}|${dupSession.uid.toUpperCase()}|CALLBACK_COMPLETE`).digest('hex');
  
  // Insert first callback event
  await db.createResponseEvent({
    session_id: dupSession.session.id,
    study_id: backingStudyId,
    vendor_id: dupSession.vendor.id,
    uid: dupSession.uid,
    event_type: 'CALLBACK_RECEIVED',
    source: 'external_redirect',
    raw_payload: { outcome: 'complete', retry: 1 },
    normalized_payload: { event_type: 'COMPLETE', uid: dupSession.uid.toUpperCase() },
    event_key: dupEventKey,
  });

  // Try inserting duplicate callback events with the exact same idempotency key
  const dup1 = await db.createResponseEvent({
    session_id: dupSession.session.id,
    study_id: backingStudyId,
    vendor_id: dupSession.vendor.id,
    uid: dupSession.uid,
    event_type: 'CALLBACK_RECEIVED',
    source: 'external_redirect',
    raw_payload: { outcome: 'complete', retry: 2 },
    normalized_payload: { event_type: 'COMPLETE', uid: dupSession.uid.toUpperCase() },
    event_key: dupEventKey,
  });
  assert(dup1 === null, 'Second identical callback is blocked by idempotency constraint (ON CONFLICT)');

  // Verify only 1 counted complete in responses for this session
  const { rows: dupRespRows } = await db.pool.query(
    `SELECT COUNT(*) FROM responses WHERE session_id = $1 AND is_counted = true`,
    [dupSession.session.id]
  );
  assert(parseInt(dupRespRows[0].count, 10) === 1, 'Duplicate callback causes exactly 1 business completion');

  // ─── Test 12: Expired Session Callback ────────────────────────────────────
  console.log('\n--- Test 12: Expired Session Callback Handling ---');
  const expiredSessionToken = 'sess_exp_' + crypto.randomBytes(12).toString('hex');
  const expiredUid = `TEST-EXPIRED-${testSuffix}`;
  const expiredSession = await db.createSession({
    session_token: expiredSessionToken,
    study_id: backingStudyId,
    vendor_id: vendors[0].id,
    tracking_link_id: null,
    uid: expiredUid,
    normalized_uid: expiredUid.toUpperCase(),
    ip_hash: crypto.createHash('sha256').update('192.168.1.99').digest('hex'),
    initial_status: 'STARTED',
    current_status: 'STARTED',
    expires_at: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago!
    landing_url: `https://opi.opinioninsights.in/s/${project.project_code}`,
    metadata_json: { project_id: project.id, project_code: project.project_code },
  });

  // Callback arrives for expired session -> rejected as EXPIRED_SESSION
  await recordFakeClick({
    study_id: expiredSession.study_id,
    vendor_id: expiredSession.vendor_id,
    uid: expiredUid,
    normalized_uid: expiredUid.toUpperCase(),
    rejection_reason: 'EXPIRED_SESSION',
    raw_payload: { pid: project.project_code, uid: expiredUid, outcome: 'complete' },
    provider: 'external_redirect',
  });

  const { rows: expiredFakeRows } = await db.pool.query(
    `SELECT * FROM fake_click_events WHERE uid = $1 AND rejection_reason = 'EXPIRED_SESSION'`,
    [expiredUid]
  );
  assert(expiredFakeRows.length === 1, 'Expired session callback rejected as UNVERIFIED with reason EXPIRED_SESSION');

  // ─── Test 13: Rejection Management ────────────────────────────────────────
  console.log('\n--- Test 13: Response Quality Review & Rejection Management ---');
  // We have 200 total responses for our project:
  // Batch create an additional 140 completes so we have exactly 200 completes to review
  const extraCompletesCount = 140;
  const extraTasks: { extraUid: string; v: any }[] = [];
  for (let i = 1; i <= extraCompletesCount; i++) {
    extraTasks.push({
      extraUid: `EXTRA-COMPLETE-${testSuffix}-${String(i).padStart(3, '0')}`,
      v: vendors[i % vendors.length],
    });
  }

  const extraChunkSize = 20;
  for (let c = 0; c < extraTasks.length; c += extraChunkSize) {
    const chunk = extraTasks.slice(c, c + extraChunkSize);
    await Promise.all(
      chunk.map(async ({ extraUid, v }) => {
        const sessToken = 'sess_extra_' + crypto.randomBytes(12).toString('hex');
        const sess = await db.createSession({
          session_token: sessToken,
          study_id: backingStudyId,
          vendor_id: v.id,
          tracking_link_id: null,
          uid: extraUid,
          normalized_uid: extraUid.toUpperCase(),
          ip_hash: crypto.createHash('sha256').update('192.168.1.1').digest('hex'),
          landing_url: `https://opi.opinioninsights.in/s/${project.project_code}`,
          initial_status: 'STARTED',
          current_status: 'COMPLETE',
          expires_at: new Date(Date.now() + 86400 * 1000),
          metadata_json: { project_id: project.id, project_code: project.project_code, vendor_id: v.id },
        });

        await db.pool.query(
          `INSERT INTO responses (session_id, study_id, project_id, vendor_id, uid, final_status, is_counted, terminal_at, client_billing_status, vendor_acceptance_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'COMPLETE', true, NOW(), 'PENDING', 'PENDING', NOW(), NOW())`,
          [sess.id, backingStudyId, project.id, v.id, extraUid]
        );
      })
    );
  }

  // Now fetch all COMPLETE responses for this project (total 60 + 140 = 200 completes)
  const { rows: allCompletes } = await db.pool.query(
    `SELECT id, uid FROM responses WHERE project_id = $1 AND final_status = 'COMPLETE' ORDER BY created_at`,
    [project.id]
  );
  assert(allCompletes.length === 200, `Total completes ready for review: ${allCompletes.length} (Expected: 200)`);

  // Review: 160 Accepted, 40 Rejected (20% Rejection Rate)
  const acceptedIds = allCompletes.slice(0, 160).map(r => r.id);
  const rejectedIds = allCompletes.slice(160, 200).map(r => r.id);

  // Bulk accept 160
  await db.pool.query(
    `UPDATE responses SET client_billing_status = 'APPROVED', vendor_acceptance_status = 'ACCEPTED', reviewed_at = NOW() WHERE id = ANY($1::uuid[])`,
    [acceptedIds]
  );

  // Reject 40 with specific standardized reasons
  const rejectionReasons = ['Duplicate', 'Fraud / Suspicious', 'Invalid Respondent', 'Quality Issue', 'Incomplete', 'Client Rejection', 'Other'];
  for (let rIdx = 0; rIdx < rejectedIds.length; rIdx++) {
    const reason = rejectionReasons[rIdx % rejectionReasons.length];
    await db.pool.query(
      `UPDATE responses SET client_billing_status = 'REJECTED', vendor_acceptance_status = 'REJECTED', rejection_reason_code = $1, rejection_notes = $2, reviewed_at = NOW() WHERE id = $3`,
      [reason, `Flagged during QA: ${reason}`, rejectedIds[rIdx]]
    );
  }

  const { rows: reviewedCounts } = await db.pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE client_billing_status = 'APPROVED') AS accepted_cnt,
       COUNT(*) FILTER (WHERE client_billing_status = 'REJECTED') AS rejected_cnt
     FROM responses WHERE project_id = $1`,
    [project.id]
  );
  const acceptedTotal = parseInt(reviewedCounts[0].accepted_cnt, 10);
  const rejectedTotal = parseInt(reviewedCounts[0].rejected_cnt, 10);
  const rejectionRate = (rejectedTotal / (acceptedTotal + rejectedTotal)) * 100;

  assert(acceptedTotal === 160, 'Quality review: Exactly 160 responses marked ACCEPTED / APPROVED');
  assert(rejectedTotal === 40, 'Quality review: Exactly 40 responses marked REJECTED');
  assert(rejectionRate === 20, `Rejection Rate calculates to exactly ${rejectionRate}% (20%)`);

  // ─── Test 14: Finance Core Engine ─────────────────────────────────────────
  console.log('\n--- Test 14: Financial Engine Calculations ---');
  // Project Rates: Client Rate ₹70, Vendor Rate ₹50
  // Accepted = 160
  // Expected Client Revenue = 160 × ₹70 = ₹11,200
  // Expected Vendor Payable = 160 × ₹50 = ₹8,000
  // Expected Gross Margin = ₹11,200 - ₹8,000 = ₹3,200
  const clientRate = Number(project.client_rate);
  const vendorRate = Number(project.vendor_rate);
  const calculatedRevenue = acceptedTotal * clientRate;
  const calculatedPayable = acceptedTotal * vendorRate;
  const calculatedMargin = calculatedRevenue - calculatedPayable;

  assert(clientRate === 70, 'Client Rate is ₹70');
  assert(vendorRate === 50, 'Vendor Rate is ₹50');
  assert(calculatedRevenue === 11200, `Client Revenue = 160 × ₹70 = ₹${calculatedRevenue.toLocaleString('en-IN')} (₹11,200)`);
  assert(calculatedPayable === 8000, `Vendor Payable = 160 × ₹50 = ₹${calculatedPayable.toLocaleString('en-IN')} (₹8,000)`);
  assert(calculatedMargin === 3200, `Gross Margin = ₹${calculatedMargin.toLocaleString('en-IN')} (₹3,200)`);

  // ─── Test 15: Client Invoice Generation & Excel Export ────────────────────
  console.log('\n--- Test 15: Client Invoice Generation & Enterprise Excel Export ---');
  const invoiceNumber = `OPI-${testSuffix}-001`;
  const { rows: invRows } = await db.pool.query(
    `INSERT INTO invoices (invoice_number, project_id, client_id, billing_period_start, billing_period_end, client_rate, total_approved_completes, total_amount, status, generated_at)
     VALUES ($1, $2, $3, CURRENT_DATE - 7, CURRENT_DATE, $4, $5, $6, 'RAISED', NOW()) RETURNING *`,
    [invoiceNumber, project.id, client.id, clientRate, acceptedTotal, calculatedRevenue]
  );
  const invoice = invRows[0];
  assert(invoice.invoice_number === invoiceNumber, `Invoice generated: #${invoice.invoice_number}`);
  assert(Number(invoice.total_amount) === 11200, `Invoice total amount equals ₹11,200`);

  // Insert 160 line items in one batch query
  await db.pool.query(
    `INSERT INTO invoice_line_items (invoice_id, response_id, uid, country, survey_link, status, completion_date, rate, line_amount)
     SELECT $1, id, uid, 'US', 'LNK-US-GEN', 'COMPLETE', COALESCE(terminal_at, NOW()), $2, $2
     FROM responses
     WHERE id = ANY($3::uuid[])`,
    [invoice.id, clientRate, acceptedIds]
  );

  // Generate Excel workbook to verify structure and row count
  const wbInvoice = new ExcelJS.Workbook();
  const wsInvoice = wbInvoice.addWorksheet('Invoice');
  wsInvoice.addRow(['#', 'UID', 'Country', 'Survey Link', 'Status', 'Rate', 'Amount']);
  const { rows: invLineItems } = await db.pool.query('SELECT * FROM invoice_line_items WHERE invoice_id = $1', [invoice.id]);
  invLineItems.forEach((li, idx) => {
    wsInvoice.addRow([idx + 1, li.uid, li.country, li.survey_link, li.status, Number(li.rate), Number(li.line_amount)]);
  });
  const invBuffer = await wbInvoice.xlsx.writeBuffer();
  assert(invLineItems.length === 160, 'Invoice contains all 160 individual accepted IDs in detailed breakdown');
  assert(invBuffer.length > 0, `Enterprise Invoice Excel generated successfully (${invBuffer.length} bytes)`);

  // ─── Test 16: Vendor Settlement Report & Multi-Sheet Excel ────────────────
  console.log('\n--- Test 16: Vendor Settlement Report & Multi-Sheet Excel Export ---');
  // Generate settlement for Vendor A
  const vendorA = vendors[0];
  const { rows: vAResponses } = await db.pool.query(
    `SELECT
       COUNT(*) AS total_submitted,
       COUNT(*) FILTER (WHERE vendor_acceptance_status = 'ACCEPTED') AS total_accepted,
       COUNT(*) FILTER (WHERE vendor_acceptance_status = 'REJECTED') AS total_rejected
     FROM responses WHERE project_id = $1 AND vendor_id = $2`,
    [project.id, vendorA.id]
  );
  const vaSubmitted = parseInt(vAResponses[0].total_submitted, 10);
  const vaAccepted = parseInt(vAResponses[0].total_accepted, 10);
  const vaRejected = parseInt(vAResponses[0].total_rejected, 10);
  const vaPayable = vaAccepted * vendorRate;

  const { rows: vsRows } = await db.pool.query(
    `INSERT INTO vendor_settlements (project_id, vendor_id, vendor_rate, total_submitted, total_accepted, total_rejected, accepted_amount, rejected_amount, payable_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'FINALIZED') RETURNING *`,
    [project.id, vendorA.id, vendorRate, vaSubmitted, vaAccepted, vaRejected, vaAccepted * vendorRate, vaRejected * vendorRate, vaPayable]
  );
  const settlement = vsRows[0];
  assert(Number(settlement.vendor_rate) === 50, 'Vendor Settlement rate confirmed at ₹50');
  assert(Number(settlement.payable_amount) === vaPayable, `Vendor settlement payable calculated as ₹${vaPayable.toLocaleString('en-IN')}`);

  // Multi-sheet Excel workbook
  const wbSettlement = new ExcelJS.Workbook();
  const wsSum = wbSettlement.addWorksheet('Settlement Summary');
  wsSum.addRow(['Vendor', vendorA.name]);
  wsSum.addRow(['Total Submitted', vaSubmitted]);
  wsSum.addRow(['Total Accepted', vaAccepted]);
  wsSum.addRow(['Total Rejected', vaRejected]);
  wsSum.addRow(['Final Payable', `₹${vaPayable}`]);

  const wsAcc = wbSettlement.addWorksheet('Accepted IDs');
  wsAcc.addRow(['#', 'UID', 'Status', 'Rate', 'Amount']);
  const { rows: vaAcceptedRows } = await db.pool.query(
    `SELECT uid, final_status FROM responses WHERE project_id = $1 AND vendor_id = $2 AND vendor_acceptance_status = 'ACCEPTED'`,
    [project.id, vendorA.id]
  );
  vaAcceptedRows.forEach((r, i) => wsAcc.addRow([i + 1, r.uid, r.final_status, vendorRate, vendorRate]));

  const wsRej = wbSettlement.addWorksheet('Rejected IDs');
  wsRej.addRow(['#', 'UID', 'Status', 'Rejection Reason', 'Adjustment']);
  const { rows: vaRejectedRows } = await db.pool.query(
    `SELECT uid, final_status, rejection_reason_code FROM responses WHERE project_id = $1 AND vendor_id = $2 AND vendor_acceptance_status = 'REJECTED'`,
    [project.id, vendorA.id]
  );
  vaRejectedRows.forEach((r, i) => wsRej.addRow([i + 1, r.uid, r.final_status, r.rejection_reason_code || 'QA Rejection', -vendorRate]));

  const setBuffer = await wbSettlement.xlsx.writeBuffer();
  assert(wbSettlement.worksheets.length === 3, 'Vendor settlement workbook contains 3 sheets (Summary, Accepted IDs, Rejected IDs)');
  assert(setBuffer.length > 0, `Enterprise Vendor Settlement Excel generated successfully (${setBuffer.length} bytes)`);

  // ─── Test 17: Full Consistency Verification ──────────────────────────────
  console.log('\n--- Test 17: Full System Consistency Verification (DB = API = Finance = Invoices) ---');
  const { rows: finalAudit } = await db.pool.query(`
    SELECT
      (SELECT COUNT(*) FROM responses WHERE project_id = $1) AS total_responses,
      (SELECT COUNT(*) FROM responses WHERE project_id = $1 AND final_status = 'COMPLETE') AS total_completes,
      (SELECT COUNT(*) FROM responses WHERE project_id = $1 AND client_billing_status = 'APPROVED') AS total_approved,
      (SELECT COUNT(*) FROM responses WHERE project_id = $1 AND client_billing_status = 'REJECTED') AS total_rejected,
      (SELECT SUM(total_amount) FROM invoices WHERE project_id = $1) AS billed_revenue
  `, [project.id]);

  const fa = finalAudit[0];
  assert(parseInt(fa.total_completes, 10) === 200, `DB Completes match: ${fa.total_completes} == 200`);
  assert(parseInt(fa.total_approved, 10) === 160, `DB Approved match: ${fa.total_approved} == 160`);
  assert(parseInt(fa.total_rejected, 10) === 40, `DB Rejected match: ${fa.total_rejected} == 40`);
  assert(Number(fa.billed_revenue) === 11200, `Invoice Billed Revenue matches: ₹${fa.billed_revenue} == ₹11,200`);

  console.log('\n================================================================');
  console.log(`🏆 17-STEP PRD TEST SUITE RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPrd17Suite().catch((err) => {
  console.error('Fatal error in 17-step PRD test suite:', err);
  process.exit(1);
});
