import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import routes from '../src/routes';
import { db } from '../src/db';
import { issueJwt } from '../src/auth/middleware';

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

async function runVendorAcceptanceTest() {
  console.log('\n========================================================================');
  console.log('🚀 FINAL ACCEPTANCE TEST: VENDOR USER MANAGEMENT + ISOLATION');
  console.log('========================================================================\n');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', routes);
  app.use('/', routes);

  const baseUrl = 'https://opinion-insights-cawi.vercel.app';
  console.log(`[TestTarget] Running against ${baseUrl}`);

  try {
    // 1. Authenticate Admin
    console.log('--- Step 1: Admin Authentication ---');
    const adminToken = issueJwt({
      sub: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN',
      email: 'admin@cawi.io',
    });
    assert(!!adminToken, 'Admin authentication token created');

    // Clean up test vendors if they exist
    await db.pool.query("DELETE FROM users WHERE email IN ('vendor_a@test.com', 'vendor_b@test.com')");
    await db.pool.query("DELETE FROM vendors WHERE contact_email IN ('vendor_a@test.com', 'vendor_b@test.com')");

    // 2. Create Vendor A and Vendor B as Admin
    console.log('\n--- Step 2: Create Vendors ---');

    // Need corresponding vendor records to assign to projects and users
    const { rows: vaRows } = await db.pool.query("INSERT INTO vendors (name, contact_email, vendor_code) VALUES ('Vendor A', 'vendor_a@test.com', 'VA001') RETURNING id");
    const vA_db_id = vaRows[0].id;
    
    const { rows: vbRows } = await db.pool.query("INSERT INTO vendors (name, contact_email, vendor_code) VALUES ('Vendor B', 'vendor_b@test.com', 'VB002') RETURNING id");
    const vB_db_id = vbRows[0].id;

    const createVendorA = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ email: 'vendor_a@test.com', password: 'password123', full_name: 'Vendor A', role: 'VENDOR', vendor_id: vA_db_id })
    });
    const vaJson = await createVendorA.json();
    assert(createVendorA.status === 200 || createVendorA.status === 201, `Vendor A created. Msg: ${JSON.stringify(vaJson)}`);

    const createVendorB = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ email: 'vendor_b@test.com', password: 'password123', full_name: 'Vendor B', role: 'VENDOR', vendor_id: vB_db_id })
    });
    const vbJson = await createVendorB.json();
    assert(createVendorB.status === 200 || createVendorB.status === 201, `Vendor B created. Msg: ${JSON.stringify(vbJson)}`);

    const vendorAId = vaJson.user?.id || vaJson.data?.id;
    const vendorBId = vbJson.user?.id || vbJson.data?.id;

    // 3. Create Project & Assign Vendors
    console.log('\n--- Step 3: Create Project & Assign Vendors ---');
    const createRes = await fetch(`${baseUrl}/api/projects/create-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Vendor Isolation Test',
        client_name: 'Client Inc.',
        survey_url: 'https://test.com/survey?uid=[identifier]',
        client_rate: 70,
        vendor_rate: 50,
        countries: [
          { code: 'FR', vendor_id: vA_db_id, survey_url: 'https://test.com/survey?uid=[identifier]&c=FR' },
          { code: 'IN', vendor_id: vB_db_id, survey_url: 'https://test.com/survey?uid=[identifier]&c=IN' }
        ],
      }),
    });
    const createJson = await createRes.json();
    assert(createRes.status === 200 || createRes.status === 201, `Project created. Msg: ${JSON.stringify(createJson)}`);
    const project = createJson.data.project;
    const countries = createJson.data.countries;

    // 4. Vendor Login & Isolation Test
    console.log('\n--- Step 4: Vendor Login & Isolation Test ---');
    const loginARes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vendor_a@test.com', password: 'password123' })
    });
    const loginAJson = await loginARes.json();
    assert(loginARes.status === 200, 'Vendor A logged in successfully');
    const vendorAToken = loginAJson.data?.token || loginAJson.token;

    // Try to access projects as Vendor (Should fail)
    const projRes = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${vendorAToken}` }
    });
    assert(projRes.status === 403, `Vendor A blocked from Projects API (Status: ${projRes.status})`);


    // Complete flow for FR and IN
    const ts = Date.now();
    const testUidFR = 'FRUID' + ts;
    const testUidIN = 'INUID' + ts;
    const testUidFake = 'FAKE' + ts;
    await fetch(`${baseUrl}/track?code=${project.project_code}&country=FR&uid=${testUidFR}`, { redirect: 'manual' });
    await fetch(`${baseUrl}/redirect/complete?pid=${project.project_code}&country=FR&uid=${testUidFR}`);

    await fetch(`${baseUrl}/track?code=${project.project_code}&country=IN&uid=${testUidIN}`, { redirect: 'manual' });
    await fetch(`${baseUrl}/redirect/complete?pid=${project.project_code}&country=IN&uid=${testUidIN}`);

    // --- NEW: Fake/Unverified Callback ---
    console.log('\n--- Step 4.5: Generate Unverified Activity ---');
    await fetch(`${baseUrl}/redirect/complete?pid=${project.project_code}&country=FR&uid=${testUidFake}`);
    
    // Admin check Analytics Summary
    const analyticsRes = await fetch(`${baseUrl}/api/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const analyticsJson = await analyticsRes.json();
    assert(analyticsRes.status === 200, 'Admin can fetch analytics summary');
    assert(analyticsJson.data.unverified_activity > 0, `Unverified activity logged: ${analyticsJson.data.unverified_activity}`);

    // Admin check Responses API includes UNVERIFIED
    const adminRespRes = await fetch(`${baseUrl}/api/responses/review?project_id=${project.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminRespJson = await adminRespRes.json();
    const unverifiedFound = (adminRespJson.data || []).find((r) => r.verification_status === 'UNVERIFIED' && r.uid === testUidFake);
    assert(!!unverifiedFound, 'Admin Responses API includes UNVERIFIED callback');



    // Check responses for Vendor A
    const respARes = await fetch(`${baseUrl}/api/responses`, {
      headers: { Authorization: `Bearer ${vendorAToken}` }
    });
    const respAJson = await respARes.json();
    assert(respARes.status === 200, `Vendor A can access Responses API. Msg: ${JSON.stringify(respAJson)}`);
    
    const responsesA = respAJson.data || respAJson.responses || [];
    assert(responsesA.length === 1 && responsesA[0].uid === testUidFR, `Vendor A only sees FR response. Got: ${JSON.stringify(responsesA)}`);

    // Vendor Deactivation Test
    console.log('\n--- Step 5: Vendor Deactivation Test ---');
    await fetch(`${baseUrl}/api/admin/users/${vendorAId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'SUSPENDED' })
    });

    const loginA2Res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vendor_a@test.com', password: 'password123' })
    });
    assert(loginA2Res.status === 401 || loginA2Res.status === 403, `Suspended Vendor A login blocked (Status: ${loginA2Res.status})`);

    // Vendor Delete Test
    console.log('\n--- Step 6: Vendor Delete Test ---');
    const delRes = await fetch(`${baseUrl}/api/admin/users/${vendorAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(delRes.status === 200, 'Vendor A deleted by Admin');

    const { rows: rRows } = await db.pool.query("SELECT * FROM responses WHERE uid = $1", [testUidFR]);
    assert(rRows.length === 1, `Historical responses retained after vendor delete. Got: ${JSON.stringify(rRows)}`);

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    process.exit(failed > 0 ? 1 : 0);
  }

  console.log('\n========================================================================');
  console.log(`🏆 FINAL ACCEPTANCE TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runVendorAcceptanceTest();
