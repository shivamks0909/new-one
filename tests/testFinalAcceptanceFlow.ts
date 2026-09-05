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

async function runAcceptanceTest() {
  console.log('\n========================================================================');
  console.log('🚀 FINAL ACCEPTANCE TEST: OPINION INSIGHTS SURVEY TRACKING WORKFLOW');
  console.log('========================================================================\n');

  // Setup express server on a dynamic port
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', routes);
  app.use('/', routes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestServer] Running on ${baseUrl}\n`);

  try {
    // 1. Authenticate Admin
    console.log('--- Step 1: Admin Authentication ---');
    const adminToken = issueJwt({
      sub: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN',
      email: 'admin@cawi.io',
      full_name: 'Super Admin',
    });
    assert(!!adminToken, 'Admin authentication token created');

    // 2. Create Project: Paste Client Survey URL, Client Name, Client Project Name, FR & IN
    console.log('\n--- Step 2: Create Project (Paste Survey URL, Add FR, Add IN) ---');
    const surveyUrl = 'https://pmtool.zephyrsample.com/Survey?offerId=OF32826584F8OX&zid=[identifier]';
    const clientProjectName = 'Global Consumer Study ' + Math.random().toString(36).substring(7).toUpperCase();
    const clientName = 'Zephyr Sample Inc.';

    const createRes = await fetch(`${baseUrl}/api/projects/create-full`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: clientProjectName,
        client_name: clientName,
        survey_url: surveyUrl,
        client_rate: 70,
        vendor_rate: 50,
        countries: [{ code: 'FR' }, { code: 'IN' }],
      }),
    });

    const createJson: any = await createRes.json();
    assert(createRes.status === 200 || createRes.status === 201, `Project creation returned 200 or 201 (Got ${createRes.status})`);
    assert(createJson.success === true, 'Project creation succeeded');
    const project = createJson.data.project;
    const countries = createJson.data.countries;

    console.log(`  Project Code: ${project.project_code}`);
    console.log(`  Client Survey URL: ${project.survey_url}`);
    console.log(`  Detected UID Param: ${project.uid_param}`);
    console.log(`  Detected UID Placeholder: ${project.uid_placeholder}`);

    assert(project.project_code.startsWith('OPI'), `Project code automatically generated (${project.project_code})`);
    assert(project.uid_param === 'zid', `Detected UID parameter is 'zid' (Got: ${project.uid_param})`);
    assert(project.uid_placeholder === '[identifier]', `Detected placeholder is '[identifier]' (Got: ${project.uid_placeholder})`);
    assert(countries.length === 2, 'Project created with exactly 2 countries (FR, IN)');

    // 3. System generates OPI launch links for each country
    console.log('\n--- Step 3: Verify Generated Opinion Insights Launch Links ---');
    const frCountry = countries.find((c: any) => c.country_code === 'FR');
    const inCountry = countries.find((c: any) => c.country_code === 'IN');

    assert(!!frCountry, 'FR country configuration exists');
    assert(!!inCountry, 'IN country configuration exists');
    assert(frCountry.opi_launch_url.includes(`/track?code=${project.project_code}&country=FR&uid={UID}`), 'FR launch link generated correctly');
    assert(inCountry.opi_launch_url.includes(`/track?code=${project.project_code}&country=IN&uid={UID}`), 'IN launch link generated correctly');
    console.log(`  FR Launch URL: ${frCountry.opi_launch_url}`);
    console.log(`  IN Launch URL: ${inCountry.opi_launch_url}`);

    // 4. Open launch link with UID -> Session created, LANDING recorded, Redirect to client survey
    console.log('\n--- Step 4: Open Launch Link with UID (VDFERRER) ---');
    const testUid = 'VDFERRER';
    const trackUrl = `${baseUrl}/track?code=${project.project_code}&country=FR&uid=${testUid}`;

    const trackRes = await fetch(trackUrl, {
      redirect: 'manual', // do not auto-follow to inspect 302 and Location
    });

    assert(trackRes.status === 302, `Tracking request redirected with 302 (Got ${trackRes.status})`);
    const location = trackRes.headers.get('location') || '';
    console.log(`  Redirect Location: ${location}`);

    const expectedRedirect = `https://pmtool.zephyrsample.com/Survey?offerId=OF32826584F8OX&zid=${testUid}`;
    assert(location === expectedRedirect, `Redirected to exact client survey replacing only UID: ${location}`);

    // Verify session in DB
    const { rows: sessRows } = await db.pool.query(
      `SELECT * FROM sessions WHERE metadata_json->>'project_id' = $1 AND uid = $2`,
      [project.id, testUid]
    );
    assert(sessRows.length === 1, 'Genuine tracking session created in database');
    const session = sessRows[0];
    assert(!!session.session_token, `Session has strong secure session_token (${session.session_token})`);
    assert(session.initial_status === 'STARTED', 'Session initial_status is STARTED');

    // Verify LANDING event
    const { rows: eventRows } = await db.pool.query(
      `SELECT * FROM response_events WHERE session_id = $1 AND event_type = 'LANDING'`,
      [session.id]
    );
    assert(eventRows.length === 1, 'LANDING tracking event successfully recorded');

    // 5. Client sends COMPLETE callback -> Existing session matched, genuine evaluated, response updated
    console.log('\n--- Step 5: Client sends /redirect/complete Callback ---');
    const completeUrl = `${baseUrl}/redirect/complete?pid=${project.project_code}&country=FR&uid=${testUid}`;
    const cbRes = await fetch(completeUrl);
    assert(cbRes.status === 200, `Callback returned 200 OK (Got ${cbRes.status})`);
    const cbHtml = await cbRes.text();
    assert(cbHtml.includes('COMPLETE') || cbHtml.includes('SURVEY SUCCESSFULLY COMPLETED'), 'Status page rendered Complete');
    assert(cbHtml.includes('GENUINE') || cbHtml.includes('VERIFIED'), 'Outcome evaluated as GENUINE / VERIFIED');

    // Verify database response record
    const { rows: respRows } = await db.pool.query(
      `SELECT * FROM responses WHERE session_id = $1`,
      [session.id]
    );
    assert(respRows.length === 1, 'Response record updated for existing session');
    const response = respRows[0];
    assert(response.final_status === 'COMPLETE', `Response status set to COMPLETE (Got: ${response.final_status})`);
    assert(response.is_counted === true, 'Response is_counted marked TRUE for genuine complete');

    // 6. Test other callbacks for remaining countries/sessions (TERMINATE, QUOTAFULL, QUALITYTERM, CLOSED)
    console.log('\n--- Step 6: Test Multi-Outcome Verification (TERMINATE, QUOTAFULL, QUALITYTERM, CLOSED) ---');
    const outcomes = [
      { type: 'terminate', uid: 'UID_TERM_01', expectedStatus: 'TERMINATE', counted: false },
      { type: 'quotafull', uid: 'UID_QUOTA_02', expectedStatus: 'QUOTA_FULL', counted: false },
      { type: 'qualityterm', uid: 'UID_QUAL_03', expectedStatus: 'SECURITY_REJECT', counted: false },
      { type: 'closed', uid: 'UID_CLOSE_04', expectedStatus: 'CLOSED', counted: false },
    ];

    for (const item of outcomes) {
      // 1. Launch /track
      await fetch(`${baseUrl}/track?code=${project.project_code}&country=IN&uid=${item.uid}`, { redirect: 'manual' });
      // 2. Send callback
      const res = await fetch(`${baseUrl}/redirect/${item.type}?pid=${project.project_code}&country=IN&uid=${item.uid}`);
      assert(res.status === 200, `Callback /redirect/${item.type} returned 200`);
      // 3. Verify DB response
      const { rows: rRows } = await db.pool.query(
        `SELECT * FROM responses WHERE uid = $1 AND project_id = $2`,
        [item.uid, project.id]
      );
      assert(rRows.length === 1, `Response record created for ${item.uid}`);
      assert(rRows[0].final_status === item.expectedStatus, `${item.type} outcome mapped to ${item.expectedStatus}`);
      assert(rRows[0].is_counted === item.counted, `is_counted is ${item.counted} for ${item.type}`);
    }

    // 7. Verify Dashboard Update
    console.log('\n--- Step 7: Verify Dashboard Metrics ---');
    const dashRes = await fetch(`${baseUrl}/api/sessions?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dashJson: any = await dashRes.json();
    const projectSessions = (dashJson.data || dashJson.sessions || []).filter(
      (s: any) => s.metadata_json?.project_id === project.id
    );
    assert(projectSessions.length === 5, `Dashboard tracks all 5 sessions for this project (Got ${projectSessions.length})`);

    const { rows: completeCount } = await db.pool.query(
      `SELECT COUNT(*) FROM responses WHERE project_id = $1 AND final_status = 'COMPLETE' AND is_counted = true`,
      [project.id]
    );
    assert(parseInt(completeCount[0].count, 10) === 1, 'Exactly 1 genuine complete recorded on dashboard');

    console.log('\n========================================================================');
    console.log(`🏆 FINAL ACCEPTANCE TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

  } finally {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTest().catch((err) => {
  console.error('Fatal acceptance test error:', err);
  process.exit(1);
});
