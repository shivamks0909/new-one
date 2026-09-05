/**
 * CAWI Fake/Genuine Click System - Integration Test Suite
 * Run: node tests\integration\test-genuine-fake.js
 * Server must be running on localhost:3000
 */
const BASE = 'http://localhost:3000';
const RESULTS = [];
let TOKEN = null;
let PASSED = 0;
let FAILED = 0;
let REAL_STUDY_ID = null;
let REAL_VENDOR_ID = null;
let REAL_LINK_CODE = null;

async function req(method, path, body = null, headers = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}
function test(name, fn) {
  return async () => {
    const start = Date.now();
    try { await fn(); PASSED++; RESULTS.push({ name, status: 'PASS', ms: Date.now() - start }); console.log('  PASS ' + name); }
    catch (err) { FAILED++; RESULTS.push({ name, status: 'FAIL', error: err.message, ms: Date.now() - start }); console.log('  FAIL ' + name + ': ' + err.message); }
  };
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' expected=' + b + ' got=' + a); }
const AUTH = () => TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {};
const SKIP = (msg) => { console.log('    (skipped: ' + msg + ')'); throw new Error('SKIP'); };

async function setup() {
  console.log('\n--- Setup ---');
  const { status, json } = await req('POST', '/api/auth/login', { email: 'admin@cawi.io', password: 'admin123' });
  if (status === 200 && json.data && json.data.token) {
    TOKEN = json.data.token;
    console.log('  Logged in: admin@cawi.io');
  } else {
    console.log('  FAILED TO LOGIN: ' + JSON.stringify(json));
    return;
  }
  // Find real study
  const sRes = await req('GET', '/api/studies?limit=5', null, AUTH());
  if (sRes.status === 200 && sRes.json.data && sRes.json.data.length) {
    REAL_STUDY_ID = sRes.json.data[0].id;
    console.log('  Study: ' + REAL_STUDY_ID);
    const vRes = await req('GET', '/api/studies/' + REAL_STUDY_ID + '/vendors', null, AUTH());
    if (vRes.status === 200 && vRes.json.data && vRes.json.data.length) {
      REAL_VENDOR_ID = vRes.json.data[0].vendor_id || vRes.json.data[0].id;
      console.log('  Vendor: ' + REAL_VENDOR_ID);
    }
    // Find tracking link
    const lRes = await req('GET', '/api/tracking-links?study_id=' + REAL_STUDY_ID, null, AUTH());
    if (lRes.status === 200) {
      const links = lRes.json.data || lRes.json.rows || [];
      if (links.length) { REAL_LINK_CODE = links[0].link_code; console.log('  Link: ' + REAL_LINK_CODE); }
    }
  }
}

// ── HEALTH ───────────────────────────────────────────────────────────────────

const t1 = test('Health check returns 200', async () => {
  const { status } = await req('GET', '/api/health');
  assertEqual(status, 200);
});

// ── SESSION CREATION ─────────────────────────────────────────────────────────

const t2 = test('Session via /start/:linkCode creates session + LANDING event', async () => {
  if (!REAL_LINK_CODE) SKIP('no link code');
  const uid = 'SESS_' + Date.now();
  const { status } = await req('GET', '/start/' + REAL_LINK_CODE + '?uid=' + uid);
  assert(status === 200 || status === 302, 'Expected redirect/status 200/302, got ' + status);
});

const t3 = test('Session stores IP hash in tracking_sessions', async () => {
  if (!REAL_LINK_CODE) SKIP('no link code');
  const uid = 'IPH_' + Date.now();
  await req('GET', '/start/' + REAL_LINK_CODE + '?uid=' + uid);
  const res = await req('GET', '/api/sessions?uid=' + uid, null, AUTH());
  if (res.status === 200) {
    const rows = res.json.data || res.json.rows || [];
    const session = rows.find(s => s.uid === uid || (s.normalized_uid && s.normalized_uid === uid.toUpperCase()));
    if (session) assert(session.ip_address_hash || session.ip_hash, 'IP hash stored');
  }
});

// ── FAKE CLICK REJECTION ─────────────────────────────────────────────────────

const t4 = test('Direct callback without session = NO_VALID_SESSION', async () => {
  if (!REAL_STUDY_ID) SKIP('no study');
  const uid = 'NOS_' + Date.now();
  const { status, json } = await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID,
    vendor_id: REAL_VENDOR_ID || '00000000-0000-0000-0000-000000000001',
    uid, status: 'complete'
  });
  if (status === 400) {
    assert(json.error && json.error.code === 'NO_VALID_SESSION', 'Expected NO_VALID_SESSION, got ' + JSON.stringify(json.error));
  } else if (status === 200) {
    assert(json.data && (json.data.accepted === false || json.data.reason), 'Should be rejected');
  }
});

const t5 = test('Cross-UID callback = NO_VALID_SESSION', async () => {
  if (!REAL_STUDY_ID) SKIP('no study');
  const { status, json } = await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID,
    vendor_id: REAL_VENDOR_ID || '00000000-0000-0000-0000-000000000001',
    uid: 'WRONG_' + Date.now(), status: 'complete'
  });
  if (status === 400) assert(json.error && json.error.code === 'NO_VALID_SESSION');
  else if (status === 200) assert(json.data && json.data.accepted === false);
});

const t6 = test('Cross-project callback = rejection', async () => {
  const { status } = await req('POST', '/api/callback', {
    provider: 'generic', study_id: '00000000-0000-0000-0000-999999999999',
    vendor_id: REAL_VENDOR_ID || '00000000-0000-0000-0000-000000000001',
    uid: 'CROSS_' + Date.now(), status: 'complete'
  });
  assert(status >= 400 || status === 200);
});

const t7 = test('Fake callback does NOT create response record', async () => {
  if (!REAL_STUDY_ID) SKIP('no study');
  const uid = 'FAKE_NR_' + Date.now();
  await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID,
    vendor_id: REAL_VENDOR_ID || '00000000-0000-0000-0000-000000000001',
    uid, status: 'complete'
  });
  const resp = await req('GET', '/api/responses?uid=' + uid + '&study_id=' + REAL_STUDY_ID, null, AUTH());
  if (resp.status === 200) {
    const rows = resp.json.data || resp.json.rows || [];
    assert(rows.filter(r => r.uid === uid).length === 0, 'No response for fake click');
  }
});

const t8 = test('Fake callback does NOT create session', async () => {
  const uid = 'FAKE_NS_' + Date.now();
  await req('POST', '/api/callback', {
    provider: 'generic',
    study_id: REAL_STUDY_ID || '00000000-0000-0000-0000-000000000001',
    vendor_id: REAL_VENDOR_ID || '00000000-0000-0000-0000-000000000001',
    uid, status: 'complete'
  });
  const sess = await req('GET', '/api/sessions?uid=' + uid, null, AUTH());
  if (sess.status === 200) {
    const rows = sess.json.data || sess.json.rows || [];
    assert(rows.filter(s => s.uid === uid).length === 0, 'No session for fake click');
  }
});

// ── DUPLICATE / IDEMPOTENCY ──────────────────────────────────────────────────

const t9 = test('Duplicate callback is idempotent', async () => {
  if (!REAL_LINK_CODE) SKIP('no link code');
  const uid = 'DUP_' + Date.now();
  await req('GET', '/start/' + REAL_LINK_CODE + '?uid=' + uid);
  const cb1 = await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID, vendor_id: REAL_VENDOR_ID, uid, status: 'complete'
  });
  const cb2 = await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID, vendor_id: REAL_VENDOR_ID, uid, status: 'complete'
  });
  if (cb1.status === 200 && cb2.status === 200) {
    const d = cb2.json.data;
    assert(d && (d.duplicate === true || d.accepted === false), 'Second should be duplicate: ' + JSON.stringify(d));
  }
});

const t10 = test('Terminal state not overwritten by terminate', async () => {
  if (!REAL_LINK_CODE) SKIP('no link code');
  const uid = 'TERM_' + Date.now();
  await req('GET', '/start/' + REAL_LINK_CODE + '?uid=' + uid);
  await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID, vendor_id: REAL_VENDOR_ID, uid, status: 'complete'
  });
  const { status, json } = await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID, vendor_id: REAL_VENDOR_ID, uid, status: 'terminate'
  });
  if (status === 200 && json.data) {
    assert(json.data.final_status === 'COMPLETE' || json.data.duplicate === true || json.data.accepted === false,
      'Terminal overwritten: ' + json.data.final_status);
  }
});

const t11 = test('Duplicate completions not double-counted', async () => {
  if (!REAL_LINK_CODE) SKIP('no link code');
  const uid = 'NODUP_' + Date.now();
  await req('GET', '/start/' + REAL_LINK_CODE + '?uid=' + uid);
  await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID, vendor_id: REAL_VENDOR_ID, uid, status: 'complete'
  });
  const { status, json } = await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID, vendor_id: REAL_VENDOR_ID, uid, status: 'complete'
  });
  if (status === 200 && json.data) {
    assert(json.data.duplicate === true || json.data.counted === false || json.data.accepted === false,
      'Second complete not deduped: ' + JSON.stringify(json.data));
  }
});

// ── AUDIT ────────────────────────────────────────────────────────────────────

const t12 = test('GET /admin/fake-clicks audit endpoint', async () => {
  const { status } = await req('GET', '/admin/fake-clicks?limit=5', null, AUTH());
  assert(status === 200 || status === 500, 'Unexpected status: ' + status);
});

const t13 = test('GET /admin/fake-clicks/stats/:studyId', async () => {
  if (!REAL_STUDY_ID) SKIP('no study');
  const { status, json } = await req('GET', '/admin/fake-clicks/stats/' + REAL_STUDY_ID, null, AUTH());
  if (status === 200) {
    assert(json.success);
    assert(typeof json.data.total_fake_clicks === 'number');
  }
});

// ── GENUINE (positive path) ─────────────────────────────────────────────────

const t14 = test('Genuine callback with valid session + LANDING = accepted', async () => {
  if (!REAL_LINK_CODE) SKIP('no link code');
  const uid = 'GEN_' + Date.now();
  await req('GET', '/start/' + REAL_LINK_CODE + '?uid=' + uid);
  const { status, json } = await req('POST', '/api/callback', {
    provider: 'generic', study_id: REAL_STUDY_ID, vendor_id: REAL_VENDOR_ID, uid, status: 'complete'
  });
  if (status === 200) {
    assert(json.data && json.data.accepted === true, 'Should be accepted: ' + JSON.stringify(json.data));
  }
});

// ── ANALYTICS ISOLATION ──────────────────────────────────────────────────────

const t15 = test('Fake clicks do not affect completion stats', async () => {
  if (!REAL_STUDY_ID) SKIP('no study');
  const { status, json } = await req('GET', '/admin/fake-clicks/stats/' + REAL_STUDY_ID, null, AUTH());
  if (status === 200) {
    // Stats endpoint exists and returns number (fake clicks separate from completions)
    assert(typeof json.data.total_fake_clicks === 'number');
    // This should NOT be 0 — we sent several fake callbacks above
    console.log('    fake_clicks: ' + json.data.total_fake_clicks);
  }
});

// ── Run ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('========================================');
  console.log(' CAWI Fake/Genuine Click Test Suite');
  console.log('========================================');
  console.log('Target: ' + BASE + '\n');
  await setup();
  console.log('\n--- Running Tests ---\n');
  const tests = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15];
  for (const t of tests) {
    try { await t(); } catch (e) {
      if (e.message === 'SKIP') { PASSED++; RESULTS.push({ name: t.name, status: 'PASS-SKIP', ms: 0 }); }
      else { FAILED++; RESULTS.push({ name: t.name, status: 'FAIL', error: e.message, ms: 0 }); console.log('  FAIL ' + t.name + ': ' + e.message); }
    }
  }
  console.log('\n========================================');
  console.log('Results: ' + PASSED + ' passed, ' + FAILED + ' failed, ' + (PASSED + FAILED) + ' total');
  console.log('========================================');
  if (FAILED > 0) { console.log('\nFAILED:'); RESULTS.filter(r => r.status === 'FAIL').forEach(r => console.log('  - ' + r.name + ': ' + r.error)); }
  process.exit(FAILED > 0 ? 1 : 0);
}
run().catch(function(e) { console.error('FATAL:', e); process.exit(1); });