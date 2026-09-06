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

async function runProjectPauseResumeTest() {
  console.log('\n========================================================================');
  console.log('🚀 E2E ACCEPTANCE TEST: PROJECT PAUSE / RESUME CONTROL');
  console.log('========================================================================\n');

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

  let createdProjectId: string | null = null;
  let projectCode: string = '';

  try {
    // 1. Prepare Auth Tokens
    console.log('--- Step 1: Authentication Setup ---');
    const adminToken = issueJwt({
      sub: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN',
      email: 'admin@opinioninsights.in',
    });
    const vendorToken = issueJwt({
      sub: '00000000-0000-0000-0000-000000000002',
      role: 'VENDOR',
      email: 'vendor@test.com',
      vendor_id: '00000000-0000-0000-0000-000000000002'
    });

    assert(!!adminToken, 'Admin JWT issued');
    assert(!!vendorToken, 'Vendor JWT issued');

    // 2. Create Project (Should default to ACTIVE)
    console.log('\n--- Step 2: Create Test Project ---');
    const createRes = await fetch(`${baseUrl}/api/projects/create-full`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'France Consumer Study Pause Test ' + Date.now(),
        client_name: 'Test Client Corp',
        client_rate: 80.0,
        vendor_rate: 50.0,
        currency: 'INR',
        countries: [
          {
            code: 'FR',
            survey_url: 'https://client-survey.com/survey?offer=FR999&rid=[identifier]',
            target_completes: 50,
          },
        ],
      }),
    });

    const createData = await createRes.json();
    assert(createRes.status === 201 && createData.success, 'Project created via /projects/create-full');
    const project = createData.data.project || createData.data;
    createdProjectId = project.id;
    projectCode = project.project_code;
    assert(!!projectCode && projectCode.startsWith('OPI'), `Project code auto-generated correctly: ${projectCode}`);
    assert(project.status === 'ACTIVE', `Initial project status is ACTIVE (was: ${project.status})`);

    // Verify in DB directly
    const dbProjectCheck = await db.pool.query("SELECT status FROM projects WHERE id = $1", [createdProjectId]);
    assert(dbProjectCheck.rows[0].status === 'ACTIVE', 'DB status column confirmed ACTIVE');

    // 3. Test Launch URL while ACTIVE
    console.log('\n--- Step 3: Launch URL when ACTIVE ---');
    const trackUrlActive = `${baseUrl}/track?code=${projectCode}&country=FR&uid=UID_ACTIVE_001`;
    const launchActiveRes = await fetch(trackUrlActive, { redirect: 'manual' });

    assert(
      launchActiveRes.status === 302,
      `Active project redirect status is 302 (got ${launchActiveRes.status})`
    );
    const location = launchActiveRes.headers.get('location') || '';
    assert(
      location.includes('client-survey.com') && location.includes('UID_ACTIVE_001'),
      `Redirected to client survey URL with populated UID: ${location}`
    );

    // Verify session was created in DB
    const activeSessions = await db.pool.query(
      "SELECT id, current_status, uid FROM sessions WHERE metadata_json->>'project_id' = $1 AND uid = $2",
      [createdProjectId, 'UID_ACTIVE_001']
    );
    assert(activeSessions.rows.length === 1, 'Genuine session created in DB for UID_ACTIVE_001');
    const activeSessionId = activeSessions.rows[0].id;

    // 4. Security Check: Vendor Authorization
    console.log('\n--- Step 4: Security & Authorization (Vendor vs Admin) ---');
    
    // Vendor tries to pause
    const vendorPauseRes = await fetch(`${baseUrl}/api/projects/${createdProjectId}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vendorToken}`,
      },
    });
    assert(vendorPauseRes.status === 403, `Vendor pause attempt denied with 403 Forbidden (got ${vendorPauseRes.status})`);

    // Vendor tries to resume
    const vendorResumeRes = await fetch(`${baseUrl}/api/projects/${createdProjectId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vendorToken}`,
      },
    });
    assert(vendorResumeRes.status === 403, `Vendor resume attempt denied with 403 Forbidden (got ${vendorResumeRes.status})`);

    // Vendor tries to change status via PATCH /status
    const vendorPatchRes = await fetch(`${baseUrl}/api/projects/${createdProjectId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({ status: 'PAUSED' }),
    });
    assert(vendorPatchRes.status === 403, `Vendor PATCH status attempt denied with 403 Forbidden (got ${vendorPatchRes.status})`);

    // Unauthenticated request
    const unauthPauseRes = await fetch(`${baseUrl}/api/projects/${createdProjectId}/pause`, {
      method: 'POST',
    });
    assert(unauthPauseRes.status === 401, `Unauthenticated pause attempt denied with 401 (got ${unauthPauseRes.status})`);

    // 5. Admin Pauses Project
    console.log('\n--- Step 5: Admin Pauses Project ---');
    const adminPauseRes = await fetch(`${baseUrl}/api/projects/${createdProjectId}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const pauseData = await adminPauseRes.json();
    assert(adminPauseRes.status === 200 && pauseData.success, 'Admin paused project successfully');
    assert(pauseData.data.status === 'PAUSED', `Returned project status is PAUSED (was: ${pauseData.data.status})`);

    // Check DB status
    const dbPausedCheck = await db.pool.query("SELECT status FROM projects WHERE id = $1", [createdProjectId]);
    assert(dbPausedCheck.rows[0].status === 'PAUSED', 'DB confirms project status is PAUSED');

    // Check audit_logs
    const auditLogs = await db.pool.query(
      "SELECT action, entity, entity_id, \"user\" FROM audit_logs WHERE entity_id = $1 AND action = 'PROJECT_PAUSED' ORDER BY timestamp DESC LIMIT 1",
      [createdProjectId]
    );
    assert(auditLogs.rows.length > 0, 'Audit log recorded for PROJECT_PAUSED');
    assert(auditLogs.rows[0].action === 'PROJECT_PAUSED', 'Audit action is PROJECT_PAUSED');

    // 6. Test Launch URL while PAUSED (HTML browser request)
    console.log('\n--- Step 6: Launch URL when PAUSED (Browser / HTML) ---');
    const trackUrlPaused = `${baseUrl}/track?code=${projectCode}&country=FR&uid=UID_PAUSED_002`;
    const launchPausedHtmlRes = await fetch(trackUrlPaused, {
      redirect: 'manual',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    assert(
      launchPausedHtmlRes.status === 200,
      `Paused project returns HTTP 200 (not 302 redirect) for browser (got ${launchPausedHtmlRes.status})`
    );
    assert(
      launchPausedHtmlRes.headers.get('x-project-status') === 'PAUSED',
      'Response header X-Project-Status is PAUSED'
    );
    assert(
      launchPausedHtmlRes.headers.get('x-survey-paused') === 'true',
      'Response header X-Survey-Paused is true'
    );

    const htmlBody = await launchPausedHtmlRes.text();
    assert(htmlBody.includes('Project Paused'), 'HTML page contains "Project Paused" title');
    assert(
      htmlBody.includes('temporarily paused'),
      'HTML page explains project is temporarily paused'
    );

    // Verify NO new session was created for UID_PAUSED_002
    const blockedSessions = await db.pool.query(
      "SELECT id FROM sessions WHERE metadata_json->>'project_id' = $1 AND uid = $2",
      [createdProjectId, 'UID_PAUSED_002']
    );
    assert(blockedSessions.rows.length === 0, 'Zero new sessions created in DB while paused');

    // 7. Test Launch URL while PAUSED (API / JSON request)
    console.log('\n--- Step 7: Launch URL when PAUSED (API / JSON) ---');
    const launchPausedJsonRes = await fetch(
      `${baseUrl}/track?code=${projectCode}&country=FR&uid=UID_PAUSED_003`,
      {
        redirect: 'manual',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    assert(
      launchPausedJsonRes.status === 423,
      `API request returns 423 Locked for paused project (got ${launchPausedJsonRes.status})`
    );
    const jsonBody = await launchPausedJsonRes.json();
    assert(jsonBody.code === 'PROJECT_PAUSED', `JSON response has error code PROJECT_PAUSED: ${jsonBody.code}`);

    // Verify NO session for UID_PAUSED_003
    const blockedJsonSessions = await db.pool.query(
      "SELECT id FROM sessions WHERE metadata_json->>'project_id' = $1 AND uid = $2",
      [createdProjectId, 'UID_PAUSED_003']
    );
    assert(blockedJsonSessions.rows.length === 0, 'Zero new sessions created for JSON caller while paused');

    // 8. Verify Existing In-Progress Session Remains Intact
    console.log('\n--- Step 8: Existing In-Progress Session Integrity ---');
    // UID_ACTIVE_001 session should still exist and be intact
    const existingSession = await db.pool.query("SELECT * FROM sessions WHERE id = $1", [activeSessionId]);
    assert(existingSession.rows.length === 1, 'Pre-existing active session intact in database');

    // Complete callback for existing session: /r/complete?pid=...&uid=...
    const completeCallbackRes = await fetch(`${baseUrl}/r/complete?pid=${projectCode}&uid=UID_ACTIVE_001`, {
      redirect: 'manual',
    });
    assert(
      completeCallbackRes.status === 200 || completeCallbackRes.status === 302,
      `Existing session completion processed safely (status ${completeCallbackRes.status})`
    );

    // Verify session was not corrupted
    const completedSessionCheck = await db.pool.query("SELECT * FROM sessions WHERE id = $1", [activeSessionId]);
    assert(
      completedSessionCheck.rows[0].current_status === 'COMPLETE' || completedSessionCheck.rows[0].current_status === 'STARTED',
      `Existing session remains healthy in database: current_status=${completedSessionCheck.rows[0].current_status}`
    );

    // 9. Admin Resumes Project
    console.log('\n--- Step 9: Admin Resumes Project ---');
    const adminResumeRes = await fetch(`${baseUrl}/api/projects/${createdProjectId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const resumeData = await adminResumeRes.json();
    assert(adminResumeRes.status === 200 && resumeData.success, 'Admin resumed project successfully');
    assert(resumeData.data.status === 'ACTIVE', `Returned project status is ACTIVE (was: ${resumeData.data.status})`);

    // Verify DB status
    const dbActiveCheck = await db.pool.query("SELECT status FROM projects WHERE id = $1", [createdProjectId]);
    assert(dbActiveCheck.rows[0].status === 'ACTIVE', 'DB confirms project status is ACTIVE again');

    // Verify audit log
    const resumeAuditLogs = await db.pool.query(
      "SELECT action, entity, entity_id FROM audit_logs WHERE entity_id = $1 AND action = 'PROJECT_RESUMED' ORDER BY timestamp DESC LIMIT 1",
      [createdProjectId]
    );
    assert(resumeAuditLogs.rows.length > 0, 'Audit log recorded for PROJECT_RESUMED');

    // 10. Test Launch URL works again after resume
    console.log('\n--- Step 10: Launch URL works again after Resume ---');
    const trackUrlResumed = `${baseUrl}/track?code=${projectCode}&country=FR&uid=UID_RESUMED_004`;
    const launchResumedRes = await fetch(trackUrlResumed, { redirect: 'manual' });

    assert(
      launchResumedRes.status === 302,
      `Resumed project redirect status is 302 again (got ${launchResumedRes.status})`
    );
    const resumedLocation = launchResumedRes.headers.get('location') || '';
    assert(
      resumedLocation.includes('client-survey.com') && resumedLocation.includes('UID_RESUMED_004'),
      `Redirected to client survey URL with populated UID: ${resumedLocation}`
    );

    const resumedSessions = await db.pool.query(
      "SELECT id, current_status FROM sessions WHERE metadata_json->>'project_id' = $1 AND uid = $2",
      [createdProjectId, 'UID_RESUMED_004']
    );
    assert(resumedSessions.rows.length === 1, 'Genuine session created in DB for UID_RESUMED_004 after resume');

  } catch (err: any) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    // 11. Cleanup all dummy data
    console.log('\n--- Step 11: Cleanup Test Dummy Data ---');
    if (createdProjectId) {
      try {
        const proj = (await db.pool.query("SELECT project_code FROM projects WHERE id = $1", [createdProjectId])).rows[0];
        const code = proj?.project_code || projectCode;
        if (code) {
          await db.pool.query("DELETE FROM responses WHERE study_id IN (SELECT id FROM studies WHERE study_code = $1)", [code]);
          await db.pool.query("DELETE FROM response_events WHERE study_id IN (SELECT id FROM studies WHERE study_code = $1)", [code]);
          await db.pool.query("DELETE FROM sessions WHERE metadata_json->>'project_id' = $1 OR study_id IN (SELECT id FROM studies WHERE study_code = $2)", [createdProjectId, code]);
          await db.pool.query("DELETE FROM study_vendors WHERE study_id IN (SELECT id FROM studies WHERE study_code = $1)", [code]);
          await db.pool.query("DELETE FROM tracking_links WHERE study_id IN (SELECT id FROM studies WHERE study_code = $1)", [code]);
          await db.pool.query("DELETE FROM studies WHERE study_code = $1", [code]);
        }
        await db.pool.query("DELETE FROM project_links WHERE country_id IN (SELECT id FROM project_countries WHERE project_id = $1)", [createdProjectId]);
        await db.pool.query("DELETE FROM project_countries WHERE project_id = $1", [createdProjectId]);
        await db.pool.query("DELETE FROM audit_logs WHERE entity_id = $1", [createdProjectId]);
        await db.pool.query("DELETE FROM projects WHERE id = $1", [createdProjectId]);
        console.log(`  ✓ Cleaned up dummy project ID ${createdProjectId} and all related records.`);
      } catch (cleanErr: any) {
        console.error('Cleanup error:', cleanErr);
      }
    }

    if (projectCode) {
      const remaining = await db.pool.query("SELECT count(*) FROM projects WHERE project_code = $1", [projectCode]);
      assert(parseInt(remaining.rows[0].count) === 0, 'Confirmed 0 dummy projects remaining in database');
    }

    server.close();
  }

  console.log('\n========================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runProjectPauseResumeTest().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
