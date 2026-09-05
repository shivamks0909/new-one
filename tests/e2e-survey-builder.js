/**
 * Survey Builder MVP - Local E2E Test Script
 * Run: node tests/e2e-survey-builder.js
 */
const path = require('path');
const fs = require('fs');

process.env.USE_SQLITE = 'true';
process.env.NODE_ENV = 'development';
process.env.AUTH_SECRET = 'test-auth-secret-32chars';
process.env.CALLBACK_SECRET = 'test-callback-secret-32c';
process.env.PORT = '3000';

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'test-survey-builder.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

let passed = 0, failed = 0, total = 0;
function assert(cond, msg) {
  total++;
  if (cond) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.log('  FAIL: ' + msg); }
}

async function run() {
  console.log('\n=== Survey Builder MVP - Local E2E Tests ===\n');
  console.log('1. Database Schema & Seed Data');
  const sqliteModule = require('../src/db/sqlite');
  sqliteModule.initDatabase('test-auth-secret-32chars');
  const db = sqliteModule.sqliteDb;

  const tables = await db.pool.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const tnames = tables.rows.map(function(r) { return r.name; });
  assert(tnames.indexOf('users') >= 0, 'users table exists');
  assert(tnames.indexOf('clients') >= 0, 'clients table exists');
  assert(tnames.indexOf('vendors') >= 0, 'vendors table exists');
  assert(tnames.indexOf('studies') >= 0, 'studies table exists');
  assert(tnames.indexOf('survey_groups') >= 0, 'survey_groups table exists');
  assert(tnames.indexOf('survey_questions') >= 0, 'survey_questions table exists');
  assert(tnames.indexOf('tracking_links') >= 0, 'tracking_links table exists');
  assert(tnames.indexOf('sessions') >= 0, 'sessions table exists');
  assert(tnames.indexOf('responses') >= 0, 'responses table exists');
  assert(tnames.indexOf('quotas') >= 0, 'quotas table exists');

  console.log('\n2. Seed Data');
  var users = await db.pool.query('SELECT * FROM users ORDER BY created_at');
  assert(users.rows.length >= 3, 'At least 3 users (got ' + users.rows.length + ')');
  var clients = await db.pool.query('SELECT * FROM clients');
  assert(clients.rows.length >= 2, 'At least 2 clients (got ' + clients.rows.length + ')');
  var vendors = await db.pool.query('SELECT * FROM vendors');
  assert(vendors.rows.length >= 2, 'At least 2 vendors');
  var studies = await db.pool.query('SELECT * FROM studies');
  assert(studies.rows.length >= 2, 'At least 2 studies');

  var study1 = studies.rows.find(function(s) { return s.title.indexOf('Beverage') >= 0; });
  assert(!!study1, 'Beverage study exists');
  var study2 = studies.rows.find(function(s) { return s.title.indexOf('Car') >= 0; });
  assert(!!study2, 'Car Ownership study exists');

  console.log('\n3. Survey Groups');
  var groups1 = (await db.pool.query('SELECT * FROM survey_groups WHERE study_id = ? ORDER BY group_order', [study1.id])).rows;
  assert(groups1.length >= 2, 'Beverage has 2+ groups (got ' + groups1.length + ')');
  assert(groups1[0].title === 'Demographics', 'Group 1 is Demographics');
  assert(groups1[1].title === 'Brand Usage', 'Group 2 is Brand Usage');

  console.log('\n4. Survey Questions');
  var questions1 = (await db.pool.query('SELECT * FROM survey_questions WHERE study_id = ? ORDER BY question_order', [study1.id])).rows;
  assert(questions1.length >= 5, 'Beverage has 5+ questions (got ' + questions1.length + ')');
  var q1 = questions1[0];
  assert(q1.question_text === 'What is your age group?', 'Q1 text correct');
  assert(q1.question_type === 'L', 'Q1 type is L');
  assert(q1.is_mandatory === 1, 'Q1 is mandatory');

  var q3 = questions1.find(function(q) { return q.question_code === 'Q3'; });
  assert(q3 && q3.question_type === 'M', 'Q3 is multiple choice');
  var q5 = questions1.find(function(q) { return q.question_code === 'Q5'; });
  assert(q5 && q5.question_type === 'N', 'Q5 is numeric');
  assert(q5.is_mandatory === 0, 'Q5 is optional');

  var ageOpts = JSON.parse(q1.answer_options);
  assert(ageOpts.indexOf('18-24') >= 0 && ageOpts.indexOf('55+') >= 0, 'Answer options parse correctly');

  console.log('\n5. Tracking Links');
  var links = (await db.pool.query('SELECT * FROM tracking_links')).rows;
  assert(links.length >= 2, 'At least 2 tracking links');
  assert(links[0].link_code === 'BEV001', 'BEV001 link exists');
  assert(links[1].link_code === 'AUTO001', 'AUTO001 link exists');

  console.log('\n6. Tenant Isolation');
  var bevUser = users.rows.find(function(u) { return u.email === 'sarah@beverageco.com'; });
  var pepsiVendor = vendors.rows.find(function(v) { return v.vendor_code === 'VND-PEPSI'; });
  assert(!!bevUser, 'BeverageCo user exists');
  assert(bevUser.vendor_id === pepsiVendor.id, 'BeverageCo user linked to PepsiCo vendor');
  assert(study1.client_id !== study2.client_id, 'Studies have different client_ids');

  console.log('\n7. Question Type Coverage');
  var allQs = (await db.pool.query('SELECT * FROM survey_questions')).rows;
  var types = {};
  allQs.forEach(function(q) { types[q.question_type_name] = true; });
  assert(types.single_choice, 'Has single_choice');
  assert(types.multiple_choice, 'Has multiple_choice');
  assert(types.numeric, 'Has numeric');
  assert(types.long_text, 'Has long_text');

  console.log('\n8. Status Flow');
  assert(study1.status === 'DRAFT', 'Study starts as DRAFT');
  await db.pool.query('UPDATE studies SET status = ?, ls_survey_id = ?, ls_survey_status = ? WHERE id = ?', ['LIVE', 123456, 'ACTIVE', study1.id]);
  var s1 = (await db.pool.query('SELECT * FROM studies WHERE id = ?', [study1.id])).rows[0];
  assert(s1.status === 'LIVE', 'Can set to LIVE');
  assert(s1.ls_survey_id === 123456, 'LS survey ID stored');
  await db.pool.query('UPDATE studies SET status = ?, ls_survey_status = ? WHERE id = ?', ['DRAFT', 'INACTIVE', study1.id]);
  var s1b = (await db.pool.query('SELECT * FROM studies WHERE id = ?', [study1.id])).rows[0];
  assert(s1b.status === 'DRAFT', 'Can unpublish to DRAFT');

  console.log('\n9. Cross-company Isolation');
  assert(study1.client_id !== study2.client_id, 'Different companies own different studies');
  assert(groups1[0].study_id === study1.id, 'Groups scoped to their study');

  console.log('\n10. File Structure');
  var files = [
    'src/services/limeSurvey/limeSurveyProxy.ts',
    'src/routes/surveyBuilder.ts',
    'src/app/dashboard/surveys/page.tsx',
    'src/app/dashboard/surveys/builder/page.tsx',
    '.env.local',
    'docker-compose.limesurvey.yml',
    'tests/e2e-survey-builder.js',
  ];
  files.forEach(function(f) {
    assert(fs.existsSync(path.join(__dirname, '..', f)), 'Exists: ' + f);
  });

  console.log('\n==========================================');
  console.log('  Passed: ' + passed + ' / ' + total);
  if (failed > 0) console.log('  Failed: ' + failed + ' / ' + total);
  console.log('==========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(function(err) { console.error(err); process.exit(1); });