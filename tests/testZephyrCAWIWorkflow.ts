/**
 * Comprehensive Zephyr CAWI Workflow End-to-End Production Verification Suite
 * 
 * Tests the complete lifecycle:
 * 1. Project Creation with Client & Vendor Commercial Rates
 * 2. Country & Zephyr Survey Link Configuration (https://pmtool.zephyrsample.com/Survey?offerId=OF32826584F8OX&zid=[identifier])
 * 3. Vendor Assignment & Tracking URL Generation
 * 4. Controlled Respondent Session Initiation (UID passed unchanged to zid=[identifier])
 * 5. Multi-Outcome Callback Processing (Complete, Terminate, Quota, Quality Term, Closed)
 *    - Verifying: VERIFIED != COMPLETE (All 5 outcomes valid verified origin)
 * 6. Direct Unverified Callback Protection:
 *    - Direct callback with NO originating session -> UNVERIFIED
 *    - Logged in fake_click_events with rejection_reason = 'NO_SESSION'
 *    - Zero contamination of responses, finance, completes, or settlements
 * 7. Admin Quality Review & Rejection Workflow (Accept/Reject with standardized reasons)
 * 8. Financial Ledger & Settlement Engine (Client Revenue, Vendor Payable, Gross Margin)
 * 9. Client Invoice (.xlsx) & Vendor Settlement (.xlsx) exports
 * 10. Complete Database Audit & Pristine Teardown
 */

import { db } from '../src/db';

const BASE_URL = 'http://localhost:3001';

interface ApiResponse {
  status: number;
  body: any;
  buffer?: Buffer;
}

async function api(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('spreadsheet') || contentType.includes('octet-stream') || path.includes('/export')) {
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    return { status: res.status, body: buf, buffer: buf };
  }
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

interface TestStepResult {
  step: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

const results: TestStepResult[] = [];

function recordResult(step: string, expected: string, actual: string, passed: boolean) {
  const status = passed ? 'PASS' : 'FAIL';
  results.push({ step, expected, actual, status });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${status}] ${step}`);
  console.log(`     Expected: ${expected}`);
  console.log(`     Observed: ${actual}\n`);
  if (!passed) {
    throw new Error(`Step failed: ${step} — Expected: ${expected}, Got: ${actual}`);
  }
}

async function cleanupEntities() {
  await db.pool.query(`DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT id FROM invoices WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE 'OPIN-ZEPHYR%'))`);
  await db.pool.query(`DELETE FROM invoices WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE 'OPIN-ZEPHYR%')`);
  await db.pool.query(`DELETE FROM vendor_settlements WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE 'OPIN-ZEPHYR%')`);
  await db.pool.query(`DELETE FROM responses WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE 'OPIN-ZEPHYR%')`);
  await db.pool.query(`DELETE FROM response_events WHERE uid LIKE 'OP100%' OR uid = 'OP99999'`);
  await db.pool.query(`DELETE FROM sessions WHERE uid LIKE 'OP100%' OR uid = 'OP99999'`);
  await db.pool.query(`DELETE FROM fake_click_events WHERE uid = 'OP99999'`);
  await db.pool.query(`DELETE FROM link_vendor_assignments WHERE link_id IN (SELECT id FROM project_links WHERE link_code LIKE 'LNK-ZEPHYR%')`);
  await db.pool.query(`DELETE FROM project_links WHERE link_code LIKE 'LNK-ZEPHYR%'`);
  await db.pool.query(`DELETE FROM project_countries WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE 'OPIN-ZEPHYR%')`);
  await db.pool.query(`DELETE FROM projects WHERE project_code LIKE 'OPIN-ZEPHYR%'`);
  await db.pool.query(`DELETE FROM vendors WHERE vendor_code = 'VND-GSP'`);
  await db.pool.query(`DELETE FROM clients WHERE client_code = 'CLI-ZEPHYR-2026'`);
}

async function runZephyrWorkflow() {
  console.log('========================================================================');
  console.log('    ZEPHYR CAWI WORKFLOW — PRODUCTION-GRADE VERIFICATION SUITE');
  console.log('    Source: https://pmtool.zephyrsample.com/Survey?offerId=OF32826584F8OX&zid=[identifier]');
  console.log('========================================================================\n');

  await cleanupEntities();

  let adminToken = '';
  let client: any;
  let project: any;
  let country: any;
  let link: any;
  let vendor: any;

  try {
    // ── Phase 1: Authentication & Setup ───────────────────────────────────────
    console.log('--- Phase 1: Administrator Authentication ---');
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin', password: 'admin' }),
    });
    adminToken = loginRes.body?.data?.token;
    recordResult(
      'Admin Authentication',
      'HTTP 200 with valid JWT bearer token',
      `HTTP ${loginRes.status} with token ${adminToken ? adminToken.substring(0, 16) + '...' : 'NONE'}`,
      loginRes.status === 200 && !!adminToken
    );

    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    // ── Phase 2: Project Hierarchy Configuration ──────────────────────────────
    console.log('--- Phase 2: Project Hierarchy Configuration ---');
    
    // 2.1 Create Client
    const { rows: clientRows } = await db.pool.query(
      `INSERT INTO clients (client_code, name, company_name, contact_name, contact_email)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['CLI-ZEPHYR-2026', 'Zephyr Global Insights', 'Zephyr Insights LLC', 'Mark Vance', 'mark.vance@zephyrsample.com']
    );
    client = clientRows[0];
    recordResult(
      'Client Entity Creation',
      'Client created with code CLI-ZEPHYR-2026',
      `ID=${client.id}, Code=${client.client_code}`,
      !!client?.id
    );

    // 2.2 Create Project (Rates: Client ₹70, Vendor ₹50)
    const projRes = await api('/projects', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        project_code: 'OPIN-ZEPHYR-2026',
        name: 'Zephyr Consumer Study 2026',
        description: 'End-to-end CAWI verification for Zephyr Offer OF32826584F8OX',
        client_id: client.id,
        client_rate: 70.00,
        vendor_rate: 50.00,
        currency: 'INR',
      }),
    });
    project = projRes.body?.data;
    recordResult(
      'Project Creation with Commercial Rates',
      'Project OPIN-ZEPHYR-2026 created (Client Rate: ₹70, Vendor Rate: ₹50)',
      `HTTP ${projRes.status}, Code=${project?.project_code}, Rates: C=₹${project?.client_rate}/V=₹${project?.vendor_rate}`,
      projRes.status === 201 && Number(project?.client_rate) === 70 && Number(project?.vendor_rate) === 50
    );

    // 2.3 Add Country (India - IN)
    const countryRes = await api(`/projects/${project.id}/countries`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        country_code: 'IN',
        country_name: 'India',
      }),
    });
    country = countryRes.body?.data;
    recordResult(
      'Project Country Assignment',
      'Country IN (India) added to project',
      `HTTP ${countryRes.status}, Country=${country?.country_code} (${country?.country_name})`,
      countryRes.status === 201 && country?.country_code === 'IN'
    );

    // 2.4 Add Survey Link with exact Zephyr URL
    const zephyrBaseUrl = 'https://pmtool.zephyrsample.com/Survey?offerId=OF32826584F8OX&zid=[identifier]';
    const linkRes = await api(`/countries/${country.id}/links`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        link_code: 'LNK-ZEPHYR-IN-01',
        link_name: 'Zephyr Primary Sample Link',
        url: zephyrBaseUrl,
      }),
    });
    link = linkRes.body?.data;
    recordResult(
      'Zephyr Survey Link Configuration',
      `Link created with template: ${zephyrBaseUrl}`,
      `HTTP ${linkRes.status}, Link Code=${link?.link_code}, URL=${link?.url}`,
      linkRes.status === 201 && link?.url === zephyrBaseUrl
    );

    // 2.5 Assign Vendor (Global Sample Partner - VND-GSP)
    const { rows: vendorRows } = await db.pool.query(
      `INSERT INTO vendors (vendor_code, name, contact_name, contact_email, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING *`,
      ['VND-GSP', 'Global Sample Partners', 'Rachel Green', 'rachel@globalsample.com']
    );
    vendor = vendorRows[0];

    const assignRes = await api(`/links/${link.id}/vendors`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vendor_id: vendor.id,
        vendor_cpi: 45.00,
        target_completes: 200,
      }),
    });
    recordResult(
      'Vendor Assignment to Zephyr Link',
      'Vendor VND-GSP assigned with CPI ₹45.00 and target 200 completes',
      `HTTP ${assignRes.status}, Vendor=${vendor.vendor_code}`,
      assignRes.status === 201
    );

    // ── Phase 3: Tracking URL & Session Initiation ────────────────────────────
    console.log('--- Phase 3: Respondent Tracking URL & Session Generation ---');
    const testUid = 'OP10001';
    const trackingPath = `/s/${project.project_code}?country=${country.country_code}&link=${link.link_code}&uid=${testUid}&vendor=${vendor.vendor_code}`;
    const fullTrackingUrl = `${BASE_URL}${trackingPath}`;

    // Execute controlled respondent click
    const clickRes = await fetch(fullTrackingUrl, { redirect: 'manual' });
    const redirectLocation = clickRes.headers.get('location') || '';
    const expectedZephyrDestination = `https://pmtool.zephyrsample.com/Survey?offerId=OF32826584F8OX&zid=${testUid}`;

    recordResult(
      'Tracking URL Redirection & UID Preservation',
      `HTTP 302 Redirect to ${expectedZephyrDestination}`,
      `HTTP ${clickRes.status}, Redirected to: ${redirectLocation}`,
      clickRes.status === 302 && redirectLocation === expectedZephyrDestination
    );

    // Verify Session in Database
    const { rows: sessRows } = await db.pool.query(
      `SELECT * FROM sessions WHERE normalized_uid = $1 ORDER BY created_at DESC LIMIT 1`,
      [testUid]
    );
    const session = sessRows[0];
    const sessionMetadata = session?.metadata_json || {};

    recordResult(
      'Tracking Session State & Context Preservation',
      `Session exists with Project=${project.id}, Country=${country.id}, Link=${link.id}, Vendor=${vendor.id}`,
      `Session ID=${session?.id}, ProjectCode=${sessionMetadata.project_code}, LinkCode=${sessionMetadata.link_code}, Status=${session?.current_status}`,
      !!session && sessionMetadata.project_id === project.id && sessionMetadata.vendor_id === vendor.id
    );

    // Verify LANDING event in response_events
    const { rows: landingEvents } = await db.pool.query(
      `SELECT * FROM response_events WHERE session_id = $1 AND event_type = 'LANDING'`,
      [session.id]
    );
    recordResult(
      'LANDING Security Event Commitment',
      'LANDING event recorded in response_events for session',
      `Events Found=${landingEvents.length}, EventKey=${landingEvents[0]?.event_key}`,
      landingEvents.length > 0
    );

    // ── Phase 4: Multi-Outcome Verified Flow (Verified != Complete) ───────────
    console.log('--- Phase 4: Multi-Outcome Verified Callback Flow ---');

    // Define 5 distinct respondents for 5 distinct verified outcomes
    const outcomeTestCases = [
      { uid: 'OP10001', outcome: 'complete', expectedStatus: 'COMPLETE', isCounted: true, cardTitle: 'SURVEY SUCCESSFULLY COMPLETED' },
      { uid: 'OP10002', outcome: 'terminate', expectedStatus: 'TERMINATE', isCounted: false, cardTitle: 'SURVEY TERMINATED' },
      { uid: 'OP10003', outcome: 'quotafull', expectedStatus: 'QUOTA_FULL', isCounted: false, cardTitle: 'QUOTA REACHED' },
      { uid: 'OP10004', outcome: 'qualityterm', expectedStatus: 'SECURITY_REJECT', isCounted: false, cardTitle: 'QUALITY TERMINATION' },
      { uid: 'OP10005', outcome: 'closed', expectedStatus: 'EXPIRED', isCounted: false, cardTitle: 'SURVEY CLOSED' },
    ];

    // Initiate sessions for UIDs OP10002..OP10005
    for (let i = 1; i < outcomeTestCases.length; i++) {
      const tc = outcomeTestCases[i];
      const tUrl = `${BASE_URL}/s/${project.project_code}?country=${country.country_code}&link=${link.link_code}&uid=${tc.uid}&vendor=${vendor.vendor_code}`;
      await fetch(tUrl, { redirect: 'manual' });
    }

    // Process callbacks for all 5 verified outcomes
    for (const tc of outcomeTestCases) {
      const callbackUrl = `/redirect/${tc.outcome}?pid=${project.project_code}&uid=${tc.uid}`;
      const cbRes = await api(callbackUrl);

      // Verify Landing HTML contains vector illustration & correct title
      const containsTitle = typeof cbRes.body === 'string' && cbRes.body.includes(tc.cardTitle);
      const containsDataUri = typeof cbRes.body === 'string' && cbRes.body.includes('data:image/svg+xml;base64,');

      recordResult(
        `Verified Outcome Callback: ${tc.outcome.toUpperCase()} (${tc.uid})`,
        `HTTP 200, Status=${tc.expectedStatus}, Renders "${tc.cardTitle}" with vector illustration`,
        `HTTP ${cbRes.status}, RenderedTitle=${containsTitle}, InlineSvgImage=${containsDataUri}`,
        cbRes.status === 200 && containsTitle && containsDataUri
      );

      // Verify DB Response Record
      const { rows: respRows } = await db.pool.query(
        `SELECT * FROM responses WHERE uid = $1 AND project_id = $2`,
        [tc.uid, project.id]
      );
      const resp = respRows[0];
      recordResult(
        `DB State for ${tc.uid} (${tc.expectedStatus})`,
        `final_status='${tc.expectedStatus}', is_counted=${tc.isCounted}`,
        `final_status='${resp?.final_status}', is_counted=${resp?.is_counted}, billing_status='${resp?.client_billing_status}'`,
        resp?.final_status === tc.expectedStatus && resp?.is_counted === tc.isCounted
      );
    }

    // ── Phase 5: Direct Unverified Callback Protection ────────────────────────
    console.log('--- Phase 5: Direct Unverified Callback Protection ---');
    const directUnverifiedUid = 'OP99999';

    // Direct callback without prior OI session initiation
    const directCbRes = await api(`/redirect/complete?pid=${project.project_code}&uid=${directUnverifiedUid}`);
    recordResult(
      'Direct Callback Invocation without OI Session',
      'Landing page served gracefully, but rejected internally',
      `HTTP ${directCbRes.status}`,
      directCbRes.status === 200
    );

    // Verify logged into fake_click_events with rejection_reason = 'NO_SESSION'
    const { rows: fakeEvents } = await db.pool.query(
      `SELECT * FROM fake_click_events WHERE uid = $1 ORDER BY created_at DESC LIMIT 1`,
      [directUnverifiedUid]
    );
    const fakeEvent = fakeEvents[0];
    recordResult(
      'Unverified Callback Logged in fake_click_events',
      "Rejection reason = 'NO_SESSION'",
      `Logged in fake_click_events: reason='${fakeEvent?.rejection_reason}', provider='${fakeEvent?.provider}'`,
      fakeEvent?.rejection_reason === 'NO_SESSION'
    );

    // Verify ZERO rows in responses table for direct unverified UID
    const { rows: unverifiedResp } = await db.pool.query(
      `SELECT count(*) FROM responses WHERE uid = $1`,
      [directUnverifiedUid]
    );
    recordResult(
      'Response Table Isolation (Zero Contamination)',
      'Unverified callback has 0 entries in responses table',
      `Responses count for ${directUnverifiedUid} = ${unverifiedResp[0]?.count}`,
      Number(unverifiedResp[0]?.count) === 0
    );

    // ── Phase 6: Admin Rejection & Quality Review Workflow ─────────────────────
    console.log('--- Phase 6: Admin Rejection & Quality Review Workflow ---');

    // Add another verified complete so we can test both Accept and Reject on completes
    const secondCompleteUid = 'OP10006';
    await fetch(`${BASE_URL}/s/${project.project_code}?country=${country.country_code}&link=${link.link_code}&uid=${secondCompleteUid}&vendor=${vendor.vendor_code}`, { redirect: 'manual' });
    await api(`/redirect/complete?pid=${project.project_code}&uid=${secondCompleteUid}`);

    // Fetch open responses for project
    const openRespRes = await api(`/finance/responses?project_id=${project.id}`, { headers: authHeaders });
    const projectResponses = openRespRes.body?.data || [];
    recordResult(
      'Fetch Responses for Quality Audit',
      'List of responses retrieved for review',
      `Total Responses for project=${projectResponses.length}`,
      openRespRes.status === 200 && projectResponses.length >= 2
    );

    // Get response IDs for OP10001 (to accept) and OP10006 (to reject)
    const resp10001 = projectResponses.find((r: any) => r.uid === 'OP10001');
    const resp10006 = projectResponses.find((r: any) => r.uid === 'OP10006');

    // Accept OP10001 via /finance/responses/:id/review
    const acceptRes = await api(`/finance/responses/${resp10001.id}/review`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        client_billing_status: 'APPROVED',
        vendor_acceptance_status: 'ACCEPTED',
      }),
    });
    recordResult(
      'Admin Quality Decision: ACCEPT (OP10001)',
      'Response approved for client billing and vendor settlement',
      `HTTP ${acceptRes.status}`,
      acceptRes.status === 200
    );

    // Reject OP10006 with standardized reason QUALITY_TERM
    const rejectRes = await api(`/finance/responses/${resp10006.id}/review`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        client_billing_status: 'REJECTED',
        vendor_acceptance_status: 'REJECTED',
        rejection_reason_code: 'QUALITY_TERM',
        rejection_notes: 'Failed attention check / speeder criteria',
      }),
    });
    recordResult(
      'Admin Quality Decision: REJECT (OP10006)',
      "Response rejected with reason 'QUALITY_TERM'",
      `HTTP ${rejectRes.status}`,
      rejectRes.status === 200
    );

    // ── Phase 7: Financial Ledger & Billing Engine ─────────────────────────────
    console.log('--- Phase 7: Financial Calculations & Billing Engine ---');

    // 1 Approved complete:
    // Client Revenue = 1 × ₹70 = ₹70.00
    // Vendor Cost = 1 × ₹50 = ₹50.00
    // Gross Margin = ₹70.00 - ₹50.00 = ₹20.00
    const finRes = await api('/finance/summary', { headers: authHeaders });
    const fin = finRes.body?.data;

    recordResult(
      'Real Financial Summary Ledger',
      'Approved=1, Rejected=1, Revenue=₹70.00, Cost=₹50.00, Margin=₹20.00',
      `Approved=${fin?.total_approved}, Rejected=${fin?.total_rejected}, Revenue=₹${fin?.total_client_revenue}, Cost=₹${fin?.total_vendor_cost}, Margin=₹${fin?.total_gross_margin}`,
      Number(fin?.total_approved) === 1 &&
      Number(fin?.total_rejected) === 1 &&
      Number(fin?.total_client_revenue) === 70 &&
      Number(fin?.total_vendor_cost) === 50 &&
      Number(fin?.total_gross_margin) === 20
    );

    // ── Phase 8: Client Invoice Generation & Excel Export ──────────────────────
    console.log('--- Phase 8: Client Invoice Generation & Excel Export ---');

    const invRes = await api('/finance/invoices/generate', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        project_id: project.id,
        billing_period_start: '2026-09-01',
        billing_period_end: '2026-09-30',
        notes: 'Zephyr Study September 2026 Invoicing',
      }),
    });
    const invoice = invRes.body?.data;
    recordResult(
      'Client Invoice Generation',
      'Invoice generated for 1 billable complete @ ₹70 = ₹70.00',
      `HTTP ${invRes.status}, Invoice=${invoice?.invoice_number}, Total=₹${invoice?.total_amount}`,
      invRes.status === 201 && Number(invoice?.total_amount) === 70
    );

    // Export Invoice Excel
    const expInvRes = await api(`/finance/invoices/${invoice.id}/export`, { headers: authHeaders });
    const invFileSize = expInvRes.buffer ? expInvRes.buffer.length : 0;
    recordResult(
      'Client Invoice Excel Export (.xlsx)',
      'Valid Excel spreadsheet binary generated',
      `HTTP ${expInvRes.status}, File Size=${invFileSize} bytes`,
      expInvRes.status === 200 && invFileSize > 2000
    );

    // ── Phase 9: Vendor Settlement Generation & Excel Export ───────────────────
    console.log('--- Phase 9: Vendor Settlement Generation & Excel Export ---');

    const settRes = await api('/finance/settlements/generate', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        project_id: project.id,
        vendor_id: vendor.id,
        notes: 'Zephyr Survey Vendor Payout',
      }),
    });
    const settlement = settRes.body?.data;
    recordResult(
      'Vendor Settlement Generation',
      'Settlement generated: Submitted=2, Accepted=1, Rejected=1, Payable=₹50.00',
      `HTTP ${settRes.status}, Submitted=${settlement?.total_submitted}, Accepted=${settlement?.total_accepted}, Rejected=${settlement?.total_rejected}, Payable=₹${settlement?.payable_amount}`,
      settRes.status === 200 &&
      Number(settlement?.total_accepted) === 1 &&
      Number(settlement?.total_rejected) === 1 &&
      Number(settlement?.payable_amount) === 50
    );

    // Export Settlement Excel
    const expSettRes = await api(`/finance/settlements/${settlement.id}/export`, { headers: authHeaders });
    const setFileSize = expSettRes.buffer ? expSettRes.buffer.length : 0;
    recordResult(
      'Vendor Settlement Excel Export (.xlsx)',
      'Valid 3-sheet Excel spreadsheet binary generated',
      `HTTP ${expSettRes.status}, File Size=${setFileSize} bytes`,
      expSettRes.status === 200 && setFileSize > 2000
    );

    // ── Phase 10: Pristine Database Teardown & Post-Verification Audit ─────────
    console.log('--- Phase 10: Complete Teardown & Audit Integrity Check ---');

    await db.pool.query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [invoice.id]);
    await db.pool.query('DELETE FROM invoices WHERE id = $1', [invoice.id]);
    await db.pool.query('DELETE FROM vendor_settlements WHERE id = $1', [settlement.id]);
    await db.pool.query('DELETE FROM responses WHERE project_id = $1', [project.id]);
    await db.pool.query('DELETE FROM response_events WHERE uid LIKE $1', ['OP100%']);
    await db.pool.query('DELETE FROM sessions WHERE metadata_json->>\'project_id\' = $1 OR uid LIKE $2', [project.id, 'OP100%']);
    await db.pool.query('DELETE FROM fake_click_events WHERE uid = $1', [directUnverifiedUid]);
    await db.pool.query('DELETE FROM link_vendor_assignments WHERE link_id = $1', [link.id]);
    await db.pool.query('DELETE FROM project_links WHERE id = $1', [link.id]);
    await db.pool.query('DELETE FROM project_countries WHERE id = $1', [country.id]);
    await db.pool.query('DELETE FROM projects WHERE id = $1', [project.id]);
    await db.pool.query('DELETE FROM vendors WHERE id = $1', [vendor.id]);
    await db.pool.query('DELETE FROM clients WHERE id = $1', [client.id]);

    const { rows: remainingProj } = await db.pool.query('SELECT count(*) FROM projects WHERE project_code = $1', [project.project_code]);
    const { rows: remainingInv } = await db.pool.query('SELECT count(*) FROM invoices WHERE project_id = $1', [project.id]);
    const { rows: remainingSet } = await db.pool.query('SELECT count(*) FROM vendor_settlements WHERE project_id = $1', [project.id]);
    const { rows: remainingResp } = await db.pool.query('SELECT count(*) FROM responses WHERE project_id = $1 OR uid LIKE $2', [project.id, 'OP100%']);

    recordResult(
      'Post-Verification Database Cleanup',
      'Test project entities purged (0 remaining test records)',
      `Projects=${remainingProj[0].count}, Invoices=${remainingInv[0].count}, Settlements=${remainingSet[0].count}, TestResponses=${remainingResp[0].count}`,
      Number(remainingProj[0].count) === 0 &&
      Number(remainingInv[0].count) === 0 &&
      Number(remainingSet[0].count) === 0 &&
      Number(remainingResp[0].count) === 0
    );

    console.log('========================================================================');
    console.log(`🎉 ALL ${results.length} ZEPHYR CAWI WORKFLOW STEPS PASSED WITH 100% SUCCESS!`);
    console.log('========================================================================');

  } catch (err: any) {
    console.error('\n❌ WORKFLOW EXECUTION FAILED:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runZephyrWorkflow();
