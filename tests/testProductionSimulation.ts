import assert from 'assert';
import ExcelJS from 'exceljs';
import { db } from '../src/db';

const BASE_URL = 'http://localhost:3001/api';

async function runSimulation() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🚀 RUNNING FULL PRODUCTION SIMULATION & REGRESSION TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // ── PHASE 1: Authentication & Role Enforcement ────────────────────────────
  console.log('👉 [PHASE 1] Authenticating Admin & Vendor Users & Testing RBAC...');
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cawi.io', password: 'admin' }),
  });
  assert.strictEqual(adminRes.status, 200, 'Admin login failed');
  const adminToken = (await adminRes.json()).data.token;

  const vendorRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vendor@test.com', password: 'vendor123' }),
  });
  assert.strictEqual(vendorRes.status, 200, 'Vendor login failed');
  const vendorToken = (await vendorRes.json()).data.token;

  // RBAC validation
  const vendorForbiddenRes = await fetch(`${BASE_URL}/finance/invoices/preview?project_id=11111111-1111-1111-1111-111111111111`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  assert.strictEqual(vendorForbiddenRes.status, 403, 'Vendor must be forbidden from invoices preview');
  console.log('   ✓ Admin and Vendor authenticated. Role isolation (RBAC) verified.\n');

  // ── PHASE 2: Create Test Client, Project & Zephyr Survey Links ─────────────
  console.log('👉 [PHASE 2] Setting up Project Hierarchy with Zephyr Survey Links...');
  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const testProjectCode = `PRJ-SIM-${testSuffix}`;

  const client = await db.createClient({
    client_code: `CLI-SIM-${testSuffix}`,
    name: 'Simulation Global Research Corp',
  });

  const project = await db.createProject({
    project_code: testProjectCode,
    name: `Enterprise CAWI Simulation ${testSuffix}`,
    client_id: client.id,
    status: 'LIVE',
    client_rate: 70.00,
    vendor_rate: 50.00,
    currency: 'INR',
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // 3 Countries: IN, US, GB via API
  const cResIN = await fetch(`${BASE_URL}/projects/${project.id}/countries`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ country_code: 'IN', country_name: 'India' }),
  });
  const country = (await cResIN.json()).data;

  await fetch(`${BASE_URL}/projects/${project.id}/countries`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ country_code: 'US', country_name: 'United States' }),
  });

  await fetch(`${BASE_URL}/projects/${project.id}/countries`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ country_code: 'GB', country_name: 'United Kingdom' }),
  });

  // Vendor
  const vendor = await db.createVendor({
    vendor_code: `VND-SIM-${testSuffix}`,
    name: 'Global Sample Solutions Inc',
    contact_email: `sim_vendor_${testSuffix}@globalsample.com`,
  });

  // Survey links with Zephyr placeholder via API
  const zephyrTemplate = 'https://pmtool.zephyrsample.com/Survey?offerId=OF32826584F8OX&zid=[identifier]';
  const linkRes = await fetch(`${BASE_URL}/countries/${country.id}/links`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      link_code: `lnk_zephyr_${testSuffix}`,
      link_name: 'Zephyr Production Link',
      url: zephyrTemplate,
    }),
  });
  const link = (await linkRes.json()).data;

  await fetch(`${BASE_URL}/links/${link.id}/vendors`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      vendor_id: vendor.id,
      vendor_cpi: 50.00,
      target_completes: 200,
    }),
  });

  // Backing study and tracking link for /start endpoint testing
  const study = await db.createStudy({
    study_code: `STD-SIM-${testSuffix}`,
    title: 'Zephyr Backing Study',
    client_id: client.id,
    status: 'LIVE',
  });

  await db.assignVendorToStudy({
    study_id: study.id,
    vendor_id: vendor.id,
    allocated_quota: 1000,
    vendor_cpi: 50.00,
    status: 'ACTIVE',
  });

  const trackingLink = await db.createTrackingLink({
    study_id: study.id,
    vendor_id: vendor.id,
    link_code: `lnk_zephyr_${testSuffix}`,
    destination_url: zephyrTemplate,
    base_url: zephyrTemplate,
    uid_mode: 'PROVIDED_UID',
    status: 'ACTIVE',
  });
  console.log(`   ✓ Project ${project.project_code} (Client Rate: ₹70, Vendor Rate: ₹50) & Zephyr links configured.\n`);

  // ── PHASE 3: Zephyr Tracking & UID Substitution Verification ──────────────
  console.log('👉 [PHASE 3] Testing /start/:linkCode with Zephyr survey redirect...');
  const testSampleUid = `OP-ZEPHYR-SAMPLE-${testSuffix}`;
  const startRes = await fetch(`${BASE_URL}/start/${trackingLink.link_code}?uid=${testSampleUid}`, {
    redirect: 'manual',
  });
  assert.strictEqual(startRes.status, 302, 'Start endpoint must return 302 redirect');
  const redirectLocation = startRes.headers.get('location') || '';
  const expectedZephyrUrl = `https://pmtool.zephyrsample.com/Survey?offerId=OF32826584F8OX&zid=${testSampleUid}`;
  assert.strictEqual(redirectLocation, expectedZephyrUrl, 'Redirect URL must substitute [identifier] with UID exactly');
  console.log(`   ✓ Zephyr redirect URL verified: ${redirectLocation}`);

  // ── PHASE 4: Seed 220 Submissions (200 Verified + 20 Unverified) ───────────
  console.log('👉 [PHASE 4] Generating 220 Submissions (200 Verified + 20 Unverified)...');
  const clientDb = await db.pool.connect();
  try {
    await clientDb.query('BEGIN');

    const sessPlaceholders: string[] = [];
    const sessValues: any[] = [];
    const eventPlaceholders: string[] = [];
    const eventValues: any[] = [];
    const respPlaceholders: string[] = [];
    const respValues: any[] = [];

    for (let i = 1; i <= 200; i++) {
      const uid = `OP-VER-${String(i).padStart(5, '0')}`;
      const sessId = crypto.randomUUID();
      const respId = crypto.randomUUID();

      let status = 'COMPLETE';
      if (i > 160 && i <= 175) status = 'TERMINATE';
      else if (i > 175 && i <= 185) status = 'QUOTA_FULL';
      else if (i > 185 && i <= 195) status = 'QUALITY_TERM';
      else if (i > 195) status = 'SURVEY_CLOSED';

      const sIdx = (i - 1) * 9;
      sessPlaceholders.push(`($${sIdx + 1}::uuid, $${sIdx + 2}, $${sIdx + 3}::uuid, $${sIdx + 4}::uuid, $${sIdx + 5}::uuid, $${sIdx + 6}, $${sIdx + 7}, $${sIdx + 8}, $${sIdx + 9}, NOW() - interval '2 hours', NOW() + interval '24 hours', '{"country_code":"IN"}'::jsonb)`);
      sessValues.push(sessId, `sess_${testProjectCode}_${uid}`, study.id, vendor.id, trackingLink.id, uid, uid, `hash_${uid}`, status);

      const eIdx = (i - 1) * 5;
      eventPlaceholders.push(`($${eIdx + 1}::uuid, $${eIdx + 2}::uuid, $${eIdx + 3}::uuid, $${eIdx + 4}, 'LANDING', 'test', $${eIdx + 5}, '{}'::jsonb)`);
      eventValues.push(sessId, study.id, vendor.id, uid, `key-land-${testProjectCode}-${uid}`);

      const rIdx = (i - 1) * 7;
      respPlaceholders.push(`($${rIdx + 1}::uuid, $${rIdx + 2}::uuid, $${rIdx + 3}::uuid, $${rIdx + 4}::uuid, $${rIdx + 5}::uuid, $${rIdx + 6}, $${rIdx + 7}, 'PENDING', 'PENDING', 360, NOW() - interval '1 hour', NOW() - interval '2 hours')`);
      respValues.push(respId, sessId, study.id, project.id, vendor.id, uid, status);
    }

    await clientDb.query(`
      INSERT INTO sessions (
        id, session_token, study_id, vendor_id, tracking_link_id,
        uid, normalized_uid, ip_hash, current_status, created_at, expires_at, metadata_json
      ) VALUES ${sessPlaceholders.join(',')}
    `, sessValues);

    await clientDb.query(`
      INSERT INTO response_events (
        session_id, study_id, vendor_id, uid, event_type, source, event_key, raw_payload
      ) VALUES ${eventPlaceholders.join(',')}
    `, eventValues);

    await clientDb.query(`
      INSERT INTO responses (
        id, session_id, study_id, project_id, vendor_id, uid,
        final_status, client_billing_status, vendor_acceptance_status, loi_seconds,
        terminal_at, created_at
      ) VALUES ${respPlaceholders.join(',')}
    `, respValues);

    // 20 Unverified records in fake_click_events
    const fakePlaceholders: string[] = [];
    const fakeValues: any[] = [];
    for (let j = 1; j <= 20; j++) {
      const fakeUid = `OP-UNVER-${String(j).padStart(5, '0')}`;
      const fIdx = (j - 1) * 5;
      fakePlaceholders.push(`($${fIdx + 1}::uuid, $${fIdx + 2}::uuid, $${fIdx + 3}, $${fIdx + 4}, 'NO_SESSION', $${fIdx + 5}::jsonb, 'direct_callback', NOW() - interval '30 minutes')`);
      fakeValues.push(vendor.id, project.id, fakeUid, fakeUid, JSON.stringify({ pid: project.project_code, uid: fakeUid, project_id: project.id }));
    }

    await clientDb.query(`
      INSERT INTO fake_click_events (
        vendor_id, project_id, uid, normalized_uid,
        rejection_reason, raw_payload, provider, created_at
      ) VALUES ${fakePlaceholders.join(',')}
    `, fakeValues);

    await clientDb.query('COMMIT');
  } catch (e) {
    await clientDb.query('ROLLBACK');
    throw e;
  } finally {
    clientDb.release();
  }
  console.log('   ✓ Seeded 200 Verified responses + 20 Unverified direct callback records.\n');

  // ── PHASE 5: Quality Decisions (160 Accepted, 40 Rejected) ────────────────
  console.log('👉 [PHASE 5] Executing Quality Review: 160 Accepted, 40 Rejected...');
  await db.pool.query(`
    UPDATE responses
    SET client_billing_status = 'APPROVED',
        vendor_acceptance_status = 'ACCEPTED',
        updated_at = NOW()
    WHERE project_id = $1 AND uid IN (
      SELECT uid FROM responses WHERE project_id = $1 ORDER BY uid ASC LIMIT 160
    )
  `, [project.id]);

  await db.pool.query(`
    UPDATE responses
    SET client_billing_status = 'REJECTED',
        vendor_acceptance_status = 'REJECTED',
        rejection_reason_code = 'QUALITY_ISSUE',
        rejection_reason = 'Failed attention check / speeder',
        updated_at = NOW()
    WHERE project_id = $1 AND uid IN (
      SELECT uid FROM responses WHERE project_id = $1 AND vendor_acceptance_status = 'PENDING' ORDER BY uid ASC LIMIT 25
    )
  `, [project.id]);

  await db.pool.query(`
    UPDATE responses
    SET client_billing_status = 'REJECTED',
        vendor_acceptance_status = 'REJECTED',
        rejection_reason_code = 'DUPLICATE',
        rejection_reason = 'Duplicate IP / Device fingerprint',
        updated_at = NOW()
    WHERE project_id = $1 AND uid IN (
      SELECT uid FROM responses WHERE project_id = $1 AND vendor_acceptance_status = 'PENDING' ORDER BY uid ASC LIMIT 10
    )
  `, [project.id]);

  await db.pool.query(`
    UPDATE responses
    SET client_billing_status = 'REJECTED',
        vendor_acceptance_status = 'REJECTED',
        rejection_reason_code = 'FRAUD',
        rejection_reason = 'Bot heuristic match',
        updated_at = NOW()
    WHERE project_id = $1 AND uid IN (
      SELECT uid FROM responses WHERE project_id = $1 AND vendor_acceptance_status = 'PENDING' ORDER BY uid ASC LIMIT 5
    )
  `, [project.id]);

  console.log('   ✓ Quality review decisions updated in database.\n');

  // ── PHASE 6: Invoice Pre-flight Audit ─────────────────────────────────────
  console.log('👉 [PHASE 6] Auditing GET /finance/invoices/preview...');
  const nowStr = new Date().toISOString().split('T')[0];
  const prevRes = await fetch(`${BASE_URL}/finance/invoices/preview?project_id=${project.id}&start_date=${nowStr}&end_date=${nowStr}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(prevRes.status, 200, 'Invoice preview failed');
  const prevData = (await prevRes.json()).data;

  assert.strictEqual(prevData.total_activity, 220, 'Total activity must be 220');
  assert.strictEqual(prevData.total_verified, 200, 'Total verified must be 200');
  assert.strictEqual(prevData.total_unverified, 20, 'Total unverified must be 20');
  assert.strictEqual(prevData.total_accepted, 160, 'Total accepted must be 160');
  assert.strictEqual(prevData.total_rejected, 40, 'Total rejected must be 40');
  assert.strictEqual(prevData.eligible_billing_count, 160, 'Eligible count must be 160');
  assert.strictEqual(Number(prevData.client_rate), 70, 'Client rate must be 70');
  assert.strictEqual(Number(prevData.final_amount), 11200, 'Final invoice amount must be 11,200 (160 * 70)');
  assert.strictEqual(prevData.eligible_records.length, 160, 'Eligible UIDs array length must be 160');
  assert.strictEqual(prevData.unverified_records.length, 20, 'Unverified UIDs array length must be 20');
  console.log('   ✓ Invoice Preview: 160 Eligible × ₹70 = ₹11,200 (Unverified traffic strictly excluded).\n');

  // ── PHASE 7: Generate Invoice & Double-Billing Prevention ─────────────────
  console.log('👉 [PHASE 7] Generating Invoice & Testing Double-Billing Prevention...');
  const genInvRes = await fetch(`${BASE_URL}/finance/invoices/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      project_id: project.id,
      start_date: nowStr,
      end_date: nowStr,
      notes: 'Production Simulation Invoiced Batch',
    }),
  });
  assert.ok(genInvRes.status === 200 || genInvRes.status === 201, `Invoice generation failed: ${genInvRes.status}`);
  const invoice = (await genInvRes.json()).data;
  assert.strictEqual(Number(invoice.total_amount), 11200, 'Invoice total amount must be 11,200');

  // Double-billing prevention check
  const reInvRes = await fetch(`${BASE_URL}/finance/invoices/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      project_id: project.id,
      start_date: nowStr,
      end_date: nowStr,
    }),
  });
  assert.strictEqual(reInvRes.status, 400, 'Second invoice generation for same completes must fail');
  console.log('   ✓ Invoice generated successfully. Double-billing prevention verified.\n');

  // ── PHASE 8: Historical Rate Immutability ──────────────────────────────────
  console.log('👉 [PHASE 8] Testing Historical Rate Immutability...');
  await db.updateProject(project.id, { client_rate: 95.00, vendor_rate: 65.00 });
  const { rows: checkInv } = await db.pool.query('SELECT * FROM invoices WHERE id = $1', [invoice.id]);
  assert.strictEqual(Number(checkInv[0].total_amount), 11200, 'Existing invoice total must not change');
  assert.strictEqual(Number(checkInv[0].client_rate), 70, 'Existing invoice rate must remain 70');
  console.log('   ✓ Immutability confirmed: Updating project rates did not alter previous invoice.\n');

  // ── PHASE 9: Vendor Settlement Calculation & Generation ───────────────────
  console.log('👉 [PHASE 9] Generating Vendor Settlement...');
  const settlePrevRes = await fetch(`${BASE_URL}/finance/settlements/preview?project_id=${project.id}&vendor_id=${vendor.id}&start_date=${nowStr}&end_date=${nowStr}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(settlePrevRes.status, 200, 'Settlement preview failed');
  const settleData = (await settlePrevRes.json()).data;

  // With updated vendor rate ₹65:
  // Gross: 200 * 65 = 13000
  // Deduction: 40 * 65 = 2600
  // Payable: 160 * 65 = 10400
  assert.strictEqual(Number(settleData.vendor_rate), 65);
  assert.strictEqual(Number(settleData.total_submitted), 220);
  assert.strictEqual(Number(settleData.total_verified), 200);
  assert.strictEqual(Number(settleData.total_unverified), 20);
  assert.strictEqual(Number(settleData.total_accepted), 160);
  assert.strictEqual(Number(settleData.total_rejected), 40);
  assert.strictEqual(Number(settleData.gross_submitted_value), 13000);
  assert.strictEqual(Number(settleData.rejection_deduction), 2600);
  assert.strictEqual(Number(settleData.payable_amount), 10400);

  const genSettleRes = await fetch(`${BASE_URL}/finance/settlements/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      project_id: project.id,
      vendor_id: vendor.id,
      start_date: nowStr,
      end_date: nowStr,
    }),
  });
  assert.strictEqual(genSettleRes.status, 200, 'Settlement generation failed');
  const settlement = (await genSettleRes.json()).data;
  assert.strictEqual(Number(settlement.payable_amount), 10400);
  console.log('   ✓ Vendor Settlement generated: Net Payable ₹10,400 (Gross ₹13,000 − Deductions ₹2,600).\n');

  // ── PHASE 10: Multi-Sheet Enterprise Excel Workbook Validation ────────────
  console.log('👉 [PHASE 10] Validating 7-Sheet Vendor Settlement Excel Export...');
  const exportRes = await fetch(`${BASE_URL}/finance/settlements/${settlement.id}/export`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(exportRes.status, 200, 'Settlement export failed');
  const excelBuffer = Buffer.from(await exportRes.arrayBuffer());

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelBuffer as any);

  const expectedSheets = [
    'Settlement Summary',
    'All Submitted IDs',
    'Verified IDs',
    'Unverified IDs',
    'Accepted IDs',
    'Rejected IDs',
    'Rejection Summary',
  ];
  const sheetNames = workbook.worksheets.map(ws => ws.name);
  for (const expected of expectedSheets) {
    assert(sheetNames.includes(expected), `Workbook missing required sheet: ${expected}`);
  }
  console.log('   ✓ All 7 required worksheets verified in workbook.');

  // Verify CRITICAL constraint: ZERO frozen panes
  for (const ws of workbook.worksheets) {
    const views = ws.views || [];
    assert(!views.some((v: any) => v.state === 'frozen'), `Worksheet '${ws.name}' must have NO frozen panes`);
  }
  console.log('   ✓ Zero frozen panes constraint verified across all sheets.');

  // Validate Client Invoice Excel Export
  console.log('   Validating Client Invoice Excel Export...');
  const invExpRes = await fetch(`${BASE_URL}/finance/invoices/${invoice.id}/export`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(invExpRes.status, 200, 'Invoice export failed');
  const invBuffer = Buffer.from(await invExpRes.arrayBuffer());
  const invWb = new ExcelJS.Workbook();
  await invWb.xlsx.load(invBuffer as any);
  assert.strictEqual(invWb.worksheets.length, 3, 'Invoice workbook must have 3 worksheets');
  for (const ws of invWb.worksheets) {
    const views = ws.views || [];
    assert(!views.some((v: any) => v.state === 'frozen'), `Invoice worksheet '${ws.name}' must have NO frozen panes`);
  }
  console.log('   ✓ Client Invoice workbook verified: 3 sheets, 0 frozen panes.\n');

  // ── PHASE 11: Cleanup Simulation Records ──────────────────────────────────
  console.log('👉 [PHASE 11] Cleaning up test simulation data from database...');
  await db.pool.query('DELETE FROM fake_click_events WHERE project_id = $1', [project.id]);
  await db.pool.query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [invoice.id]);
  await db.pool.query('DELETE FROM invoices WHERE id = $1', [invoice.id]);
  await db.pool.query('DELETE FROM responses WHERE project_id = $1', [project.id]);
  await db.pool.query('DELETE FROM vendor_settlements WHERE id = $1', [settlement.id]);
  await db.pool.query('DELETE FROM response_events WHERE study_id = $1', [study.id]);
  await db.pool.query('DELETE FROM sessions WHERE study_id = $1', [study.id]);
  await db.pool.query('DELETE FROM link_vendor_assignments WHERE link_id = $1', [trackingLink.id]);
  await db.pool.query('DELETE FROM tracking_links WHERE id = $1', [trackingLink.id]);
  await db.pool.query('DELETE FROM project_countries WHERE project_id = $1', [project.id]);
  await db.pool.query('DELETE FROM projects WHERE id = $1', [project.id]);
  await db.pool.query('DELETE FROM study_vendors WHERE study_id = $1', [study.id]);
  await db.pool.query('DELETE FROM studies WHERE id = $1', [study.id]);
  await db.pool.query('DELETE FROM vendors WHERE id = $1', [vendor.id]);
  await db.pool.query('DELETE FROM clients WHERE id = $1', [client.id]);
  console.log('   ✓ Cleaned up all simulation test records.\n');

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🎉 FULL PRODUCTION SIMULATION TEST PASSED WITH 100% SUCCESS!');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

runSimulation().catch((err) => {
  console.error('\n❌ SIMULATION TEST FAILED:', err);
  process.exit(1);
});
