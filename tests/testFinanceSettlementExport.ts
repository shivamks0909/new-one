/**
 * tests/testFinanceSettlementExport.ts
 *
 * Comprehensive end-to-end automated test suite for:
 *  1. Verified vs Unverified traffic separation in Finance & Invoicing
 *  2. Pre-flight invoice preview with UID-level inspection
 *  3. Invoicing creation with immutable snapshot & double-billing prevention
 *  4. Historical rate immutability (later project rate changes do not alter raised invoices)
 *  5. Vendor Settlement calculation (Submitted, Verified, Unverified, Accepted, Rejected, Rej %, Gross, Deductions, Payable)
 *  6. 7-Sheet Vendor Settlement Enterprise Excel Workbook generation (WITHOUT freeze panes)
 *  7. Client Invoice Excel Export (WITHOUT freeze panes)
 *  8. UID integrity: Full UIDs without truncation across all worksheets
 */

import assert from 'assert';
import ExcelJS from 'exceljs';
import { db } from '../src/db';

const BASE_URL = 'http://localhost:3001';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, json, text, buffer: () => Buffer.from(text) };
}

async function runTest() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🚀 STARTING FINANCE, INVOICE & VENDOR SETTLEMENT 7-SHEET WORKBOOK TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Step 0: Login as Admin
  console.log('👉 [STEP 0] Authenticating Admin user...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin', password: 'admin' }),
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, `Admin login failed: ${JSON.stringify(loginData)}`);
  const token = loginData.data?.token || loginData.token;
  assert(token, 'Missing auth token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('   ✓ Admin authenticated successfully.\n');

  // Step 1: Create Test Client, Project and Vendor
  console.log('👉 [STEP 1] Creating Test Client, Project and Vendor...');
  const clientCode = `CLI-FIN-${Date.now().toString().slice(-4)}`;
  const { rows: clientRows } = await db.pool.query(
    `INSERT INTO clients (client_code, name, company_name, contact_name, contact_email)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [clientCode, 'Apex Research Corp', 'Apex Research Corp', 'David Lee', 'david@apexresearch.com']
  );
  const testClient = clientRows[0];

  const testProjectCode = `PRJ-FIN-${Date.now().toString().slice(-6)}`;
  const projRes = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      project_code: testProjectCode,
      name: 'Finance & Settlement Verification Study',
      description: 'Test project for multi-sheet vendor settlement workbook',
      client_id: testClient.id,
      client_rate: 70.00,
      vendor_rate: 50.00,
      currency: 'INR',
    }),
  });
  const projData = await projRes.json();
  assert.strictEqual(projRes.status, 201, `Failed to create project: ${projData.message}`);
  const project = projData.data;
  console.log(`   ✓ Created Project ${project.project_code} (ID: ${project.id}) with Client Rate: ₹70, Vendor Rate: ₹50`);

  // Get or Create corresponding Study for session FK compliance
  const { rows: existingStudies } = await db.pool.query(
    'SELECT * FROM studies WHERE study_code = $1',
    [project.project_code]
  );
  let study = existingStudies[0];
  if (!study) {
    const { rows: studyRows } = await db.pool.query(`
      INSERT INTO studies (
        study_code, client_id, title, target_completes, loi_minutes,
        incidence_rate, client_cpi, status
      ) VALUES ($1, $2, $3, 1000, 10, 100, 70, 'LIVE') RETURNING id
    `, [project.project_code, testClient.id, project.name]);
    study = studyRows[0];
  }

  // Create Country
  const countryRes = await fetch(`${BASE_URL}/projects/${project.id}/countries`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ country_code: 'IN', country_name: 'India' }),
  });
  const countryData = await countryRes.json();
  const country = countryData.data;

  // Create Vendor
  const vendorCode = `VND-SETTLE-${Date.now().toString().slice(-4)}`;
  const vendorRes = await fetch(`${BASE_URL}/vendors`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      vendor_code: vendorCode,
      name: 'Prime Sample Vendor Pvt Ltd',
      contact_name: 'Rajesh Kumar',
      contact_email: 'rajesh@primesample.in',
      status: 'ACTIVE',
    }),
  });
  const vendorData = await vendorRes.json();
  const vendor = vendorData.data;
  console.log(`   ✓ Created Vendor ${vendor.name} (${vendor.vendor_code}, ID: ${vendor.id})`);

  // Create Project Link & Assignment
  const linkCode = `lnk_${testProjectCode.toLowerCase()}_in`;
  const linkRes = await fetch(`${BASE_URL}/countries/${country.id}/links`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      link_code: linkCode,
      link_name: 'IN Main Survey',
      url: `https://surveys.cawi.io/s/${testProjectCode}?id=[identifier]`,
    }),
  });
  const linkData = await linkRes.json();
  const link = linkData.data;

  await fetch(`${BASE_URL}/links/${link.id}/vendors`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      vendor_id: vendor.id,
      vendor_cpi: 50.00,
      target_completes: 200,
    }),
  });
  console.log(`   ✓ Link and Vendor Assignment configured successfully.\n`);

  // Step 2: Generate Traffic
  // 200 Verified records (160 Completes + 40 Terminates)
  // 20 Unverified records (direct callbacks into fake_click_events with NO_SESSION)
  console.log('👉 [STEP 2] Seeding 220 Fieldwork Activity records...');
  console.log('   - 200 Verified sessions (with valid landing origin)');
  console.log('   - 20 Unverified direct callbacks (NO_SESSION recorded in fake_click_events)');

  const verifiedSessionIds: string[] = [];
  const verifiedResponseIds: string[] = [];

  // Seed 200 verified sessions in ultra-fast batch
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const cryptoModule = await import('crypto');
    const sessPlaceholders: string[] = [];
    const sessValues: any[] = [];
    const eventPlaceholders: string[] = [];
    const eventValues: any[] = [];
    const respPlaceholders: string[] = [];
    const respValues: any[] = [];

    for (let i = 1; i <= 200; i++) {
      const uid = `OP-VER-${String(i).padStart(5, '0')}`;
      const sessId = cryptoModule.randomUUID();
      const respId = cryptoModule.randomUUID();
      const status = i <= 160 ? 'COMPLETE' : 'TERMINATE';

      verifiedSessionIds.push(sessId);
      verifiedResponseIds.push(respId);

      const sIdx = (i - 1) * 8;
      sessPlaceholders.push(`($${sIdx + 1}::uuid, $${sIdx + 2}, $${sIdx + 3}::uuid, $${sIdx + 4}::uuid, null, $${sIdx + 5}, $${sIdx + 6}, $${sIdx + 7}, $${sIdx + 8}, NOW() - interval '2 hours', NOW() + interval '24 hours', '{}'::jsonb)`);
      sessValues.push(sessId, `sess_${testProjectCode}_${uid}`, study.id, vendor.id, uid, uid, `hash_${uid}`, status);

      const eIdx = (i - 1) * 5;
      eventPlaceholders.push(`($${eIdx + 1}::uuid, $${eIdx + 2}::uuid, $${eIdx + 3}::uuid, $${eIdx + 4}, 'LANDING', 'test', $${eIdx + 5}, '{}'::jsonb)`);
      eventValues.push(sessId, study.id, vendor.id, uid, `key-land-${testProjectCode}-${uid}`);

      const rIdx = (i - 1) * 7;
      respPlaceholders.push(`($${rIdx + 1}::uuid, $${rIdx + 2}::uuid, $${rIdx + 3}::uuid, $${rIdx + 4}::uuid, $${rIdx + 5}::uuid, $${rIdx + 6}, $${rIdx + 7}, 'PENDING', 'PENDING', 420, NOW() - interval '1 hour', NOW() - interval '2 hours')`);
      respValues.push(respId, sessId, study.id, project.id, vendor.id, uid, status);
    }

    await client.query(`
      INSERT INTO sessions (
        id, session_token, study_id, vendor_id, tracking_link_id,
        uid, normalized_uid, ip_hash, current_status, created_at, expires_at, metadata_json
      ) VALUES ${sessPlaceholders.join(',')}
    `, sessValues);

    await client.query(`
      INSERT INTO response_events (
        session_id, study_id, vendor_id, uid, event_type, source, event_key, raw_payload
      ) VALUES ${eventPlaceholders.join(',')}
    `, eventValues);

    await client.query(`
      INSERT INTO responses (
        id, session_id, study_id, project_id, vendor_id, uid,
        final_status, client_billing_status, vendor_acceptance_status, loi_seconds,
        terminal_at, created_at
      ) VALUES ${respPlaceholders.join(',')}
    `, respValues);

    // Seed 20 Unverified records in fake_click_events
    const fakePlaceholders: string[] = [];
    const fakeValues: any[] = [];
    for (let j = 1; j <= 20; j++) {
      const fakeUid = `OP-UNVER-${String(j).padStart(5, '0')}`;
      const fIdx = (j - 1) * 5;
      fakePlaceholders.push(`($${fIdx + 1}::uuid, $${fIdx + 2}::uuid, $${fIdx + 3}, $${fIdx + 4}, 'NO_SESSION', $${fIdx + 5}::jsonb, 'external_redirect', NOW() - interval '45 minutes')`);
      fakeValues.push(vendor.id, project.id, fakeUid, fakeUid, JSON.stringify({ pid: project.project_code, uid: fakeUid, project_id: project.id, query: { vid: vendor.id } }));
    }

    await client.query(`
      INSERT INTO fake_click_events (
        vendor_id, project_id, uid, normalized_uid,
        rejection_reason, raw_payload, provider, created_at
      ) VALUES ${fakePlaceholders.join(',')}
    `, fakeValues);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  console.log('   ✓ Seeding complete: 200 Verified responses + 20 Unverified fake clicks.\n');

  // Step 3: Perform Quality Review
  // Of 200 verified records:
  // - 160 Accepted (APPROVED, ACCEPTED)
  // - 30 Rejected: QUALITY_ISSUE (Speeding)
  // - 10 Rejected: DUPLICATE (Duplicate IP)
  console.log('👉 [STEP 3] Performing Quality Review & Commercial Acceptance Decisions...');
  const acceptedIds = verifiedResponseIds.slice(0, 160);
  const rejQualityIds = verifiedResponseIds.slice(160, 190);
  const rejDuplicateIds = verifiedResponseIds.slice(190, 200);

  // Bulk Accept 160
  const acceptRes = await fetch(`${BASE_URL}/finance/responses/bulk-review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      response_ids: acceptedIds,
      client_billing_status: 'APPROVED',
      vendor_acceptance_status: 'ACCEPTED',
    }),
  });
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptRes.status, 200, 'Failed bulk accept');
  assert.strictEqual(acceptData.updated, 160, 'Expected 160 accepted');

  // Bulk Reject 30 Quality Issues
  const rejQRes = await fetch(`${BASE_URL}/finance/responses/bulk-review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      response_ids: rejQualityIds,
      client_billing_status: 'REJECTED',
      vendor_acceptance_status: 'REJECTED',
      rejection_reason_code: 'QUALITY_ISSUE',
      rejection_notes: 'Respondent speeding through grid questions',
    }),
  });
  const rejQData = await rejQRes.json();
  assert.strictEqual(rejQData.updated, 30, 'Expected 30 quality rejections');

  // Bulk Reject 10 Duplicates
  const rejDRes = await fetch(`${BASE_URL}/finance/responses/bulk-review`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      response_ids: rejDuplicateIds,
      client_billing_status: 'REJECTED',
      vendor_acceptance_status: 'REJECTED',
      rejection_reason_code: 'DUPLICATE',
      rejection_notes: 'Duplicate respondent fingerprint detected',
    }),
  });
  const rejDData = await rejDRes.json();
  assert.strictEqual(rejDData.updated, 10, 'Expected 10 duplicate rejections');
  console.log('   ✓ Quality review applied: 120 Accepted, 30 Quality Rejections, 10 Duplicate Rejections.\n');

  // Step 4: Test Pre-Flight Invoice Preview API
  console.log('👉 [STEP 4] Testing GET /finance/invoices/preview (Pre-flight Audit)...');
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().slice(0, 10);

  const prevRes = await fetch(`${BASE_URL}/finance/invoices/preview?project_id=${project.id}&billing_period_start=${yesterday}&billing_period_end=${today}`, {
    headers: authHeaders,
  });
  const prevData = await prevRes.json();
  assert.strictEqual(prevRes.status, 200, 'Invoice preview failed');
  const d = prevData.data;

  console.log('   --- Preview Results ---');
  console.log(`   Total Activity:    ${d.total_activity} (Expected: 220)`);
  console.log(`   Verified Traffic:  ${d.total_verified} (Expected: 200)`);
  console.log(`   Unverified (Audit):${d.total_unverified} (Expected: 20)`);
  console.log(`   Accepted / Apprvd: ${d.total_accepted} (Expected: 160)`);
  console.log(`   Rejected Completes:${d.total_rejected} (Expected: 40)`);
  console.log(`   Pending Review:    ${d.total_pending} (Expected: 0)`);
  console.log(`   Eligible Billable: ${d.eligible_billing_count} (Expected: 160)`);
  console.log(`   Client Rate:       ₹${d.client_rate} (Expected: 70)`);
  console.log(`   Gross Invoiced:    ₹${d.gross_amount} (Expected: 11200)`);
  console.log(`   Final Invoice Amt: ₹${d.final_amount} (Expected: 11200)`);

  assert.strictEqual(d.total_activity, 220, 'Total activity must be 220');
  assert.strictEqual(d.total_verified, 200, 'Total verified must be 200');
  assert.strictEqual(d.total_unverified, 20, 'Total unverified must be 20');
  assert.strictEqual(d.eligible_billing_count, 160, 'Eligible count must be 160');
  assert.strictEqual(d.total_rejected, 40, 'Rejected count must be 40');
  assert.strictEqual(d.client_rate, 70, 'Client rate must be 70');
  assert.strictEqual(d.final_amount, 160 * 70, 'Final invoice amount must be 160 * 70 = 11200');
  assert.strictEqual(d.eligible_records.length, 160, 'Should have 160 eligible records');
  assert.strictEqual(d.unverified_records.length, 20, 'Should have 20 unverified records');
  assert.strictEqual(d.unverified_records[0].billable, false, 'Unverified must be marked billable: false');
  assert.strictEqual(d.unverified_records[0].rate, 0, 'Unverified rate must be 0');
  // UID integrity
  assert(d.eligible_records[0].uid.startsWith('OP-VER-'), 'UID must not be truncated');
  assert(d.unverified_records[0].uid.startsWith('OP-UNVER-'), 'UID must not be truncated');
  console.log('   ✓ Invoice Preview mathematical model and UID integrity verified!\n');

  // Step 5: Test Raising Invoice & Double-Billing Prevention
  console.log('👉 [STEP 5] Testing POST /finance/invoices/generate & Double-Billing Prevention...');
  const genInvRes = await fetch(`${BASE_URL}/finance/invoices/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      project_id: project.id,
      billing_period_start: yesterday,
      billing_period_end: today,
      notes: 'Initial monthly commercial billing',
    }),
  });
  const genInvData = await genInvRes.json();
  assert.strictEqual(genInvRes.status, 201, `Invoice generation failed: ${genInvData.message}`);
  const invoice = genInvData.data;
  console.log(`   ✓ Generated Invoice: ${invoice.invoice_number} (Total Amount: ₹${invoice.total_amount})`);
  assert.strictEqual(Number(invoice.total_amount), 11200, 'Invoice total must be 11200');
  assert.strictEqual(invoice.total_approved_completes, 160, 'Invoice completes must be 160');
  assert.strictEqual(invoice.total_activity, 220, 'Snapshot total activity must be 220');
  assert.strictEqual(invoice.total_verified, 200, 'Snapshot total verified must be 200');
  assert.strictEqual(invoice.total_unverified, 20, 'Snapshot total unverified must be 20');

  // Verify Double-Billing Prevention:
  console.log('   Testing double billing prevention on same period...');
  const prevAgainRes = await fetch(`${BASE_URL}/finance/invoices/preview?project_id=${project.id}&billing_period_start=${yesterday}&billing_period_end=${today}`, {
    headers: authHeaders,
  });
  const prevAgainData = await prevAgainRes.json();
  assert.strictEqual(prevAgainData.data.eligible_billing_count, 0, 'Eligible count must be 0 after invoicing');
  assert.strictEqual(prevAgainData.data.already_invoiced_count, 160, 'Already invoiced count must be 160');

  const duplicateGenRes = await fetch(`${BASE_URL}/finance/invoices/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      project_id: project.id,
      billing_period_start: yesterday,
      billing_period_end: today,
    }),
  });
  assert.strictEqual(duplicateGenRes.status, 400, 'Duplicate invoice generation must return 400');
  console.log('   ✓ Double-billing successfully blocked! No duplicate invoice could be raised.\n');

  // Step 6: Test Historical Rate Immutability
  console.log('👉 [STEP 6] Testing Historical Rate Immutability...');
  console.log('   Updating project rates: Client Rate ₹70 -> ₹95, Vendor Rate ₹50 -> ₹65...');
  const ratePatchRes = await fetch(`${BASE_URL}/projects/${project.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      client_rate: 95.00,
      vendor_rate: 65.00,
    }),
  });
  assert.strictEqual(ratePatchRes.status, 200, 'Rate update failed');

  // Verify that previously generated invoice STILL has client_rate = 70 and total_amount = 11200
  const fetchInvRes = await fetch(`${BASE_URL}/finance/invoices/${invoice.id}`, { headers: authHeaders });
  const fetchInvData = await fetchInvRes.json();
  assert.strictEqual(Number(fetchInvData.data.client_rate), 70, 'Historic invoice client_rate must remain 70');
  assert.strictEqual(Number(fetchInvData.data.total_amount), 11200, 'Historic invoice total_amount must remain 11200');
  console.log('   ✓ Historical rate immutability verified: project rate change did not alter existing invoice!\n');

  // Step 7: Test Vendor Settlement Generation & Calculations
  console.log('👉 [STEP 7] Testing Vendor Settlement Calculations & Generation...');
  const settlePrevRes = await fetch(`${BASE_URL}/finance/settlements/preview?project_id=${project.id}&vendor_id=${vendor.id}&billing_period_start=${yesterday}&billing_period_end=${today}`, {
    headers: authHeaders,
  });
  const settlePrevData = await settlePrevRes.json();
  assert.strictEqual(settlePrevRes.status, 200, 'Settlement preview failed');
  const sp = settlePrevData.data;

  console.log('   --- Vendor Settlement Preview ---');
  console.log(`   Vendor Rate:          ₹${sp.vendor_rate} (Expected: 65)`);
  console.log(`   Total Submitted:      ${sp.total_submitted} (Expected: 220)`);
  console.log(`   Verified Count:       ${sp.total_verified} (Expected: 200)`);
  console.log(`   Unverified (Audit):   ${sp.total_unverified} (Expected: 20)`);
  console.log(`   Accepted Submissions: ${sp.total_accepted} (Expected: 160)`);
  console.log(`   Rejected Submissions: ${sp.total_rejected} (Expected: 40)`);
  console.log(`   Rejection %:          ${sp.rejection_percentage}% (Expected: 20.00%)`);
  console.log(`   Gross Submitted Value:₹${sp.gross_submitted_value} (Expected: 200 * 65 = 13000)`);
  console.log(`   Rejection Deduction:  ₹${sp.rejection_deduction} (Expected: 40 * 65 = 2600)`);
  console.log(`   Final Payable Amount: ₹${sp.payable_amount} (Expected: 160 * 65 = 10400)`);

  assert.strictEqual(sp.total_submitted, 220);
  assert.strictEqual(sp.total_verified, 200);
  assert.strictEqual(sp.total_unverified, 20);
  assert.strictEqual(sp.total_accepted, 160);
  assert.strictEqual(sp.total_rejected, 40);
  assert.strictEqual(sp.rejection_percentage, 20);
  assert.strictEqual(sp.gross_submitted_value, 200 * 65);
  assert.strictEqual(sp.rejection_deduction, 40 * 65);
  assert.strictEqual(sp.payable_amount, 160 * 65);
  assert.strictEqual(sp.gross_submitted_value - sp.rejection_deduction, sp.payable_amount);

  // Generate the settlement
  const genSettleRes = await fetch(`${BASE_URL}/finance/settlements/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      project_id: project.id,
      vendor_id: vendor.id,
      billing_period_start: yesterday,
      billing_period_end: today,
      notes: 'Final reconciled fieldwork payout',
    }),
  });
  const genSettleData = await genSettleRes.json();
  assert.strictEqual(genSettleRes.status, 200, 'Settlement generation failed');
  const settlement = genSettleData.data;
  assert.strictEqual(Number(settlement.payable_amount), 10400, 'Settlement payable amount must be 10400');
  console.log('   ✓ Vendor Settlement generated and snapshot persisted successfully.\n');

  // Step 8: Validate the 7-Sheet Vendor Settlement Excel Workbook (NO FREEZING)
  console.log('👉 [STEP 8] Validating 7-Sheet Vendor Settlement Excel Export (/finance/settlements/:id/export)...');
  const exportRes = await fetch(`${BASE_URL}/finance/settlements/${settlement.id}/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(exportRes.status, 200, 'Settlement export failed');
  const excelBuffer = Buffer.from(await exportRes.arrayBuffer());

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelBuffer as any);

  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  console.log(`   Found ${workbook.worksheets.length} worksheets:`, sheetNames);

  // Assert minimum 7 required sheets with exact names
  const expectedSheets = [
    'Settlement Summary',
    'All Submitted IDs',
    'Verified IDs',
    'Unverified IDs',
    'Accepted IDs',
    'Rejected IDs',
    'Rejection Summary',
  ];
  for (const expected of expectedSheets) {
    assert(sheetNames.includes(expected), `Workbook missing required worksheet: ${expected}`);
  }
  console.log('   ✓ All 7 required worksheets verified present with exact titles.');

  // Verify CRITICAL constraint: NO freeze panes on ANY sheet
  for (const ws of workbook.worksheets) {
    const views = ws.views || [];
    const isFrozen = views.some((v: any) => v.state === 'frozen');
    assert.strictEqual(isFrozen, false, `Sheet "${ws.name}" MUST NOT have frozen panes!`);
  }
  console.log('   ✓ Freeze pane constraint verified: Zero worksheets contain frozen panes.');

  // Validate Sheet 1: Settlement Summary
  const wsSum = workbook.getWorksheet('Settlement Summary')!;
  let summaryFoundTotal = false;
  let summaryPayableMatch = false;
  wsSum.eachRow((row) => {
    const rValues = row.values as any[];
    if (rValues && rValues.includes('Total Activity / Submitted')) {
      assert.strictEqual(rValues[3], 220, 'Settlement summary total activity must be 220');
      summaryFoundTotal = true;
    }
    if (rValues && rValues.includes('FINAL PAYABLE AMOUNT')) {
      assert(String(rValues[3]).includes('10,400') || rValues[3] === 10400, 'Final payable must be ₹10,400.00');
      summaryPayableMatch = true;
    }
  });
  assert(summaryFoundTotal, 'Settlement Summary should contain Total Activity row');
  assert(summaryPayableMatch, 'Settlement Summary should contain Final Payable amount of ₹10,400.00');
  console.log('   ✓ Sheet 1 (Settlement Summary) contents and financial calculations verified.');

  // Validate Sheet 2: All Submitted IDs (220 rows + header + total)
  const wsAll = workbook.getWorksheet('All Submitted IDs')!;
  const allUids: string[] = [];
  wsAll.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && row.getCell(2).value && row.getCell(2).value !== 'TOTAL') {
      allUids.push(String(row.getCell(2).value));
    }
  });
  assert.strictEqual(allUids.length, 220, `All Submitted IDs must contain 220 rows, got ${allUids.length}`);
  // Check full UID without truncation
  assert(allUids.some((u) => u === 'OP-VER-00001'), 'Full UID OP-VER-00001 must be preserved');
  assert(allUids.some((u) => u === 'OP-UNVER-00001'), 'Full UID OP-UNVER-00001 must be preserved');
  console.log('   ✓ Sheet 2 (All Submitted IDs) contains 220 complete UIDs without truncation.');

  // Validate Sheet 3: Verified IDs (200 rows)
  const wsVer = workbook.getWorksheet('Verified IDs')!;
  const verUids: string[] = [];
  wsVer.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && row.getCell(2).value && row.getCell(2).value !== 'TOTAL') {
      verUids.push(String(row.getCell(2).value));
    }
  });
  assert.strictEqual(verUids.length, 200, `Verified IDs must contain 200 rows, got ${verUids.length}`);
  console.log('   ✓ Sheet 3 (Verified IDs) contains exactly 200 verified session records.');

  // Validate Sheet 4: Unverified IDs (20 rows)
  const wsUnv = workbook.getWorksheet('Unverified IDs')!;
  const unvUids: string[] = [];
  wsUnv.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && row.getCell(2).value && !String(row.getCell(2).value).includes('TOTAL')) {
      unvUids.push(String(row.getCell(2).value));
      assert.strictEqual(row.getCell(8).value, 'UNVERIFIED', 'Verification status must be UNVERIFIED');
      assert.strictEqual(Number(row.getCell(13).value), 0, 'Vendor Rate must be 0 for unverified');
      assert.strictEqual(Number(row.getCell(16).value), 0, 'Final payable must be 0 for unverified');
    }
  });
  assert.strictEqual(unvUids.length, 20, `Unverified IDs must contain 20 rows, got ${unvUids.length}`);
  console.log('   ✓ Sheet 4 (Unverified IDs) contains 20 unverified records with ₹0.00 payable.');

  // Validate Sheet 5: Accepted IDs (160 rows)
  const wsAcc = workbook.getWorksheet('Accepted IDs')!;
  const accUids: string[] = [];
  wsAcc.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && row.getCell(2).value && row.getCell(2).value !== 'TOTAL') {
      accUids.push(String(row.getCell(2).value));
      assert.strictEqual(Number(row.getCell(16).value), 65, 'Final payable must be ₹65.00 for accepted complete');
    }
  });
  assert.strictEqual(accUids.length, 160, `Accepted IDs must contain 160 rows, got ${accUids.length}`);
  console.log('   ✓ Sheet 5 (Accepted IDs) contains 160 accepted completes.');

  // Validate Sheet 6: Rejected IDs (40 rows)
  const wsRej = workbook.getWorksheet('Rejected IDs')!;
  const rejUids: string[] = [];
  wsRej.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && row.getCell(2).value && !String(row.getCell(2).value).includes('TOTAL')) {
      rejUids.push(String(row.getCell(2).value));
      assert.strictEqual(Number(row.getCell(15).value), 65, 'Deduction must be ₹65.00 for rejected item');
      assert.strictEqual(Number(row.getCell(16).value), 0, 'Final payable must be ₹0.00 for rejected item');
    }
  });
  assert.strictEqual(rejUids.length, 40, `Rejected IDs must contain 40 rows, got ${rejUids.length}`);
  console.log('   ✓ Sheet 6 (Rejected IDs) contains 40 rejected records with deductions.');

  // Validate Sheet 7: Rejection Summary (Grouped aggregation)
  const wsRejSum = workbook.getWorksheet('Rejection Summary')!;
  let foundQuality = false;
  let foundDuplicate = false;
  let totalRejSumDeduction = 0;
  wsRejSum.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const code = String(row.getCell(2).value);
      const count = Number(row.getCell(4).value);
      const ded = Number(row.getCell(7).value);
      if (code === 'QUALITY_ISSUE') {
        assert.strictEqual(count, 30, 'Quality rejections count must be 30');
        assert.strictEqual(ded, 30 * 65, 'Quality deduction must be 30 * 65 = 1950');
        foundQuality = true;
      }
      if (code === 'DUPLICATE') {
        assert.strictEqual(count, 10, 'Duplicate rejections count must be 10');
        assert.strictEqual(ded, 10 * 65, 'Duplicate deduction must be 10 * 65 = 650');
        foundDuplicate = true;
      }
      if (code === 'TOTAL') {
        assert.strictEqual(count, 40, 'Rejection summary total count must be 40');
        totalRejSumDeduction = ded;
      }
    }
  });
  assert(foundQuality, 'Rejection Summary must aggregate QUALITY_ISSUE');
  assert(foundDuplicate, 'Rejection Summary must aggregate DUPLICATE');
  assert.strictEqual(totalRejSumDeduction, 40 * 65, 'Rejection summary total deduction must be 2600');
  console.log('   ✓ Sheet 7 (Rejection Summary) verified: Correct aggregation by reason code & deductions.\n');

  // Step 9: Validate Client Invoice Excel Export
  console.log('👉 [STEP 9] Validating Client Invoice Excel Export (/finance/invoices/:id/export)...');
  const invExportRes = await fetch(`${BASE_URL}/finance/invoices/${invoice.id}/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(invExportRes.status, 200, 'Invoice export failed');
  const invBuffer = Buffer.from(await invExportRes.arrayBuffer());

  const invWorkbook = new ExcelJS.Workbook();
  await invWorkbook.xlsx.load(invBuffer as any);
  const invSheetNames = invWorkbook.worksheets.map((ws) => ws.name);
  console.log(`   Found ${invWorkbook.worksheets.length} invoice worksheets:`, invSheetNames);
  assert(invSheetNames.includes('Invoice Summary'), 'Missing Invoice Summary sheet');
  assert(invSheetNames.includes('Billable Line Items'), 'Missing Billable Line Items sheet');
  assert(invSheetNames.includes('Unverified Activity (Audit)'), 'Missing Unverified Activity sheet');

  // Verify no frozen panes in invoice workbook
  for (const ws of invWorkbook.worksheets) {
    const isFrozen = (ws.views || []).some((v: any) => v.state === 'frozen');
    assert.strictEqual(isFrozen, false, `Invoice sheet "${ws.name}" MUST NOT have frozen panes!`);
  }
  console.log('   ✓ Invoice Excel export verified: No frozen panes, includes Unverified Activity audit sheet.');

  // Step 10: Cleanup Test Data
  console.log('👉 [STEP 10] Cleaning up test records from database...');
  await db.pool.query('DELETE FROM invoice_line_items WHERE invoice_id=$1', [invoice.id]);
  await db.pool.query('DELETE FROM invoices WHERE id=$1', [invoice.id]);
  await db.pool.query('DELETE FROM responses WHERE project_id=$1', [project.id]);
  await db.pool.query('DELETE FROM response_events WHERE session_id=ANY($1::uuid[])', [verifiedSessionIds]);
  await db.pool.query('DELETE FROM sessions WHERE id=ANY($1::uuid[])', [verifiedSessionIds]);
  await db.pool.query('DELETE FROM fake_click_events WHERE project_id=$1', [project.id]);
  await db.pool.query('DELETE FROM vendor_settlements WHERE id=$1', [settlement.id]);
  await db.pool.query('DELETE FROM link_vendor_assignments WHERE vendor_id=$1', [vendor.id]);
  await db.pool.query('DELETE FROM project_links WHERE id=$1', [link.id]);
  await db.pool.query('DELETE FROM project_countries WHERE id=$1', [country.id]);
  await db.pool.query('DELETE FROM projects WHERE id=$1', [project.id]);
  await db.pool.query('DELETE FROM vendors WHERE id=$1', [vendor.id]);
  console.log('   ✓ Cleaned up test data.\n');

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL 10 PHASES OF INVOICING & VENDOR SETTLEMENT TEST PASSED WITH 100% SUCCESS!');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
