import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'app.db')
  : path.join(process.cwd(), 'data/app.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

const hashPassword = (password: string, secret: string) => {
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function run(sql: string, params?: any[]) { return getDb().prepare(sql).run(...(params || [])); }
function get(sql: string, params?: any[]) { return getDb().prepare(sql).get(...(params || [])); }
function all(sql: string, params?: any[]) { return getDb().prepare(sql).all(...(params || [])); }

export function initDatabase(authSecret: string) {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, auth_user_id TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'OPERATOR', vendor_id TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), last_login_at TEXT);
    CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, client_code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, company_name TEXT, contact_name TEXT, contact_email TEXT, contact_phone TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY, vendor_code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, contact_name TEXT, contact_email TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS studies (id TEXT PRIMARY KEY, study_code TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, country TEXT, market TEXT, language TEXT, survey_url TEXT, survey_platform TEXT, target_completes INTEGER NOT NULL DEFAULT 0, loi_minutes INTEGER NOT NULL DEFAULT 0, incidence_rate INTEGER NOT NULL DEFAULT 50, client_cpi REAL NOT NULL DEFAULT 0, start_at TEXT, end_at TEXT, status TEXT NOT NULL DEFAULT 'DRAFT', security_level TEXT DEFAULT 'standard', ls_survey_id INTEGER, ls_survey_status TEXT DEFAULT 'NONE', created_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS study_vendors (id TEXT PRIMARY KEY, study_id TEXT NOT NULL, vendor_id TEXT NOT NULL, vendor_cpi REAL NOT NULL DEFAULT 0, target_completes INTEGER NOT NULL DEFAULT 0, max_completes INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'ACTIVE', allowed_country TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS tracking_links (id TEXT PRIMARY KEY, study_id TEXT NOT NULL, vendor_id TEXT NOT NULL, link_code TEXT NOT NULL UNIQUE, public_token TEXT NOT NULL UNIQUE, base_url TEXT NOT NULL, destination_url TEXT NOT NULL, uid_mode TEXT NOT NULL DEFAULT 'PROVIDED_UID', status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, session_token TEXT NOT NULL UNIQUE, study_id TEXT NOT NULL, vendor_id TEXT NOT NULL, tracking_link_id TEXT, uid TEXT NOT NULL, normalized_uid TEXT NOT NULL, external_uid TEXT, ip_hash TEXT NOT NULL, user_agent TEXT, country_detected TEXT, referrer TEXT, landing_url TEXT NOT NULL, initial_status TEXT NOT NULL DEFAULT 'STARTED', current_status TEXT NOT NULL DEFAULT 'STARTED', started_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT, terminated_at TEXT, expires_at TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}', rejection_reason TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS response_events (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, study_id TEXT NOT NULL, vendor_id TEXT NOT NULL, uid TEXT NOT NULL, event_type TEXT NOT NULL, source TEXT, raw_payload TEXT NOT NULL, normalized_payload TEXT, event_key TEXT NOT NULL UNIQUE, ip_address TEXT, user_agent TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS responses (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, study_id TEXT NOT NULL, vendor_id TEXT NOT NULL, uid TEXT NOT NULL, final_status TEXT NOT NULL DEFAULT 'IN_PROGRESS', first_terminal_event TEXT, terminal_at TEXT, is_counted INTEGER NOT NULL DEFAULT 0, counted_at TEXT, rejection_reason TEXT, callback_source TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS quotas (id TEXT PRIMARY KEY, study_id TEXT NOT NULL, name TEXT NOT NULL, target INTEGER NOT NULL DEFAULT 0, achieved INTEGER NOT NULL DEFAULT 0, remaining INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'OPEN', criteria_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT, "user" TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, "before" TEXT, "after" TEXT, timestamp TEXT NOT NULL DEFAULT (datetime('now')), ip TEXT);
    CREATE TABLE IF NOT EXISTS survey_groups (id TEXT PRIMARY KEY, study_id TEXT NOT NULL, ls_group_id INTEGER DEFAULT 0, title TEXT NOT NULL, description TEXT DEFAULT '', group_order INTEGER NOT NULL DEFAULT 0, relevance_expression TEXT DEFAULT '1', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS survey_questions (id TEXT PRIMARY KEY, study_id TEXT NOT NULL, group_id TEXT NOT NULL, ls_question_id INTEGER DEFAULT 0, question_code TEXT, question_text TEXT NOT NULL DEFAULT '', question_type TEXT NOT NULL DEFAULT 'L', question_type_name TEXT DEFAULT 'single_choice', is_mandatory INTEGER NOT NULL DEFAULT 0, question_order INTEGER NOT NULL DEFAULT 0, relevance_expression TEXT DEFAULT '1', answer_options TEXT NOT NULL DEFAULT '[]', attributes TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  `);

  const userCount = get('SELECT COUNT(*) as count FROM users') as { count: number };
  if (userCount.count === 0) {
    const u = () => crypto.randomUUID();
    const n = new Date().toISOString();
    const pw = hashPassword('admin123', authSecret);
    const cA = u(), cB = u(), vP = u(), vT = u(), s1 = u(), s2 = u();
    const g1 = u(), g2 = u(), g3 = u(), g4 = u();

    run(`INSERT INTO clients (id, client_code, name, company_name, contact_name, contact_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [cA, 'CLI-BEV', 'BeverageCo International', 'BeverageCo Inc.', 'Sarah Johnson', 'sarah@beverageco.com', 'ACTIVE', n, n]);
    run(`INSERT INTO clients (id, client_code, name, company_name, contact_name, contact_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [cB, 'CLI-AUTO', 'AutoWorks Corp', 'AutoWorks Corp', 'Mike Chen', 'mike@autoworks.com', 'ACTIVE', n, n]);
    run(`INSERT INTO vendors (id, vendor_code, name, contact_name, contact_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [vP, 'VND-PEPSI', 'PepsiCo Research', 'John Smith', 'john@pepsico.com', 'ACTIVE', n, n]);
    run(`INSERT INTO vendors (id, vendor_code, name, contact_name, contact_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [vT, 'VND-TOYOTA', 'Toyota Insights', 'Lisa Park', 'lisa@toyota.com', 'ACTIVE', n, n]);
    run(`INSERT INTO users (id, auth_user_id, full_name, email, password_hash, role, vendor_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), u(), 'Admin User', 'admin@opinioninsights.io', pw, 'ADMIN', null, 'ACTIVE', n, n]);
    run(`INSERT INTO users (id, auth_user_id, full_name, email, password_hash, role, vendor_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), u(), 'Sarah Johnson', 'sarah@beverageco.com', pw, 'OPERATOR', vP, 'ACTIVE', n, n]);
    run(`INSERT INTO users (id, auth_user_id, full_name, email, password_hash, role, vendor_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), u(), 'Mike Chen', 'mike@autoworks.com', pw, 'OPERATOR', vT, 'ACTIVE', n, n]);
    run(`INSERT INTO studies (id, study_code, client_id, title, description, language, target_completes, loi_minutes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [s1, 'STY-BEV-001', cA, 'Consumer Beverage Usage Study', 'Understanding beverage consumption patterns', 'en', 500, 15, 'DRAFT', n, n]);
    run(`INSERT INTO studies (id, study_code, client_id, title, description, language, target_completes, loi_minutes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [s2, 'STY-AUTO-001', cB, 'Car Ownership & Satisfaction Survey', 'Measuring car ownership satisfaction', 'en', 300, 20, 'DRAFT', n, n]);
    run(`INSERT INTO survey_groups (id, study_id, ls_group_id, title, description, group_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [g1, s1, 1, 'Demographics', 'Tell us about yourself', 1, n, n]);
    run(`INSERT INTO survey_groups (id, study_id, ls_group_id, title, description, group_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [g2, s1, 2, 'Brand Usage', 'Your beverage preferences', 2, n, n]);
    run(`INSERT INTO survey_groups (id, study_id, ls_group_id, title, description, group_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [g3, s2, 3, 'Ownership Details', 'About your vehicle', 1, n, n]);
    run(`INSERT INTO survey_groups (id, study_id, ls_group_id, title, description, group_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [g4, s2, 4, 'Satisfaction', 'Rate your experience', 2, n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, g1, 1, 'Q1', 'What is your age group?', 'L', 'single_choice', 1, 1, JSON.stringify(['18-24','25-34','35-44','45-54','55+']), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, g1, 2, 'Q2', 'What is your gender?', 'L', 'single_choice', 1, 2, JSON.stringify(['Male','Female','Non-binary','Prefer not to say']), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, g1, 3, 'Q3', 'Which beverages do you consume regularly?', 'M', 'multiple_choice', 1, 3, JSON.stringify(['Water','Coffee','Tea','Soft Drinks','Juice','Energy Drinks','Alcohol']), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, g2, 4, 'Q4', 'Which brands of soft drinks are you aware of?', 'M', 'multiple_choice', 1, 1, JSON.stringify(['Coca-Cola','Pepsi','Sprite','Fanta','Mountain Dew','Dr Pepper']), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, g2, 5, 'Q5', 'How many soft drinks do you consume per week?', 'N', 'numeric', 0, 2, JSON.stringify([]), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, g2, 6, 'Q6', 'Which soft drink brand is your favorite?', 'L', 'single_choice', 1, 3, JSON.stringify(['Coca-Cola','Pepsi','Sprite','Fanta','Other']), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s2, g3, 7, 'Q1', 'What type of vehicle do you own?', 'L', 'single_choice', 1, 1, JSON.stringify(['Sedan','SUV','Truck','Hatchback','Coupe']), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s2, g3, 8, 'Q2', 'How many vehicles does your household own?', 'N', 'numeric', 1, 2, JSON.stringify([]), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s2, g4, 9, 'Q3', 'How satisfied are you with your vehicle? (1-10)', 'N', 'numeric', 1, 1, JSON.stringify([]), '{}', n, n]);
    run(`INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s2, g4, 10, 'Q4', 'What improvements would you like to see?', 'U', 'long_text', 0, 2, JSON.stringify([]), '{}', n, n]);
    run(`INSERT INTO tracking_links (id, study_id, vendor_id, link_code, public_token, base_url, destination_url, uid_mode, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, vP, 'BEV001', 'tok_bev_'+crypto.randomBytes(8).toString('hex'), 'https://survey.oi.io', 'https://survey.oi.io/s/bev001', 'PROVIDED_UID', 'ACTIVE', n, n]);
    run(`INSERT INTO tracking_links (id, study_id, vendor_id, link_code, public_token, base_url, destination_url, uid_mode, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s2, vT, 'AUTO001', 'tok_auto_'+crypto.randomBytes(8).toString('hex'), 'https://survey.oi.io', 'https://survey.oi.io/s/auto001', 'PROVIDED_UID', 'ACTIVE', n, n]);
    const sess1 = u();
    run(`INSERT INTO sessions (id, session_token, study_id, vendor_id, uid, normalized_uid, ip_hash, user_agent, landing_url, current_status, started_at, last_seen_at, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [sess1, 'sess_'+crypto.randomBytes(8).toString('hex'), s1, vP, 'uid_bev_001', 'uid_bev_001', 'hash1', 'Mozilla/5.0', 'https://survey.oi.io/s/bev001', 'STARTED', n, n, new Date(Date.now()+1800000).toISOString(), n, n]);
    run(`INSERT INTO responses (id, session_id, study_id, vendor_id, uid, final_status, is_counted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), sess1, s1, vP, 'uid_bev_001', 'COMPLETED', 1, n, n]);
    run(`INSERT INTO quotas (id, study_id, name, target, achieved, remaining, status, criteria_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, 'Age 18-24 Male', 100, 12, 88, 'OPEN', JSON.stringify({age:'18-24',gender:'Male'}), n, n]);
    run(`INSERT INTO quotas (id, study_id, name, target, achieved, remaining, status, criteria_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s1, 'Age 25-34 Female', 100, 45, 55, 'OPEN', JSON.stringify({age:'25-34',gender:'Female'}), n, n]);
    run(`INSERT INTO quotas (id, study_id, name, target, achieved, remaining, status, criteria_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u(), s2, 'SUV Owners', 50, 50, 0, 'CLOSED', JSON.stringify({vehicle_type:'SUV'}), n, n]);
    console.log('Seed data: 2 companies, 2 vendors, 3 users, 2 studies, 4 groups, 10 questions, 2 links, 1 session, 1 response, 3 quotas');
  }
}
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Database Export Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export const sqliteDb = {
  pool: {
    query: async (sql: string, params?: any[]) => {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT') || trimmed.includes('sqlite_master')) {
        return { rows: all(sql, params) };
      }
      run(sql, params);
      return { rows: [] };
    }
  },
  getUserByEmail: async (email: string) => get('SELECT * FROM users WHERE email = ?', [email]),
  getUserById: async (id: string) => get('SELECT * FROM users WHERE id = ?', [id]),
  getAllUsers: async () => all('SELECT * FROM users ORDER BY created_at'),
  createUser: async (user: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO users (id, auth_user_id, full_name, email, password_hash, role, vendor_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, user.auth_user_id, user.full_name, user.email, user.password_hash, user.role || 'OPERATOR', user.vendor_id || null, user.status || 'ACTIVE', now, now]);
    return get('SELECT * FROM users WHERE id = ?', [id]);
  },
  updateUser: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['full_name', 'email', 'password_hash', 'role', 'vendor_id', 'status']) {
      if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); }
    }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE users SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM users WHERE id = ?', [id]);
  },
  deleteUser: async (id: string) => { run('DELETE FROM users WHERE id = ?', [id]); },
  getClient: async (id: string) => get('SELECT * FROM clients WHERE id = ?', [id]),
  getAllClients: async () => all('SELECT * FROM clients ORDER BY created_at'),
  createClient: async (c: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO clients (id, client_code, name, company_name, contact_name, contact_email, contact_phone, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, c.client_code, c.name, c.company_name || '', c.contact_name || '', c.contact_email || '', c.contact_phone || '', c.notes || '', c.status || 'ACTIVE', now, now]);
    return get('SELECT * FROM clients WHERE id = ?', [id]);
  },
  updateClient: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['client_code', 'name', 'company_name', 'contact_name', 'contact_email', 'contact_phone', 'notes', 'status']) {
      if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); }
    }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE clients SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM clients WHERE id = ?', [id]);
  },
  deleteClient: async (id: string) => { run('DELETE FROM clients WHERE id = ?', [id]); },
  getVendor: async (id: string) => get('SELECT * FROM vendors WHERE id = ?', [id]),
  getAllVendors: async () => all('SELECT * FROM vendors ORDER BY created_at'),
  createVendor: async (v: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO vendors (id, vendor_code, name, contact_name, contact_email, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, v.vendor_code, v.name, v.contact_name || '', v.contact_email || '', v.status || 'ACTIVE', v.notes || '', now, now]);
    return get('SELECT * FROM vendors WHERE id = ?', [id]);
  },
  updateVendor: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['vendor_code', 'name', 'contact_name', 'contact_email', 'status', 'notes']) {
      if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); }
    }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE vendors SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM vendors WHERE id = ?', [id]);
  },
  deleteVendor: async (id: string) => { run('DELETE FROM vendors WHERE id = ?', [id]); },
  getStudy: async (id: string) => get('SELECT * FROM studies WHERE id = ?', [id]),
  getAllStudies: async () => all('SELECT * FROM studies ORDER BY created_at'),
  createStudy: async (s: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO studies (id, study_code, client_id, title, description, country, market, language, survey_url, survey_platform, target_completes, loi_minutes, incidence_rate, client_cpi, start_at, end_at, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, s.study_code, s.client_id, s.title, s.description || '', s.country || '', s.market || '', s.language || 'en', s.survey_url || '', s.survey_platform || 'LIMESURVEY', s.target_completes || 0, s.loi_minutes || 0, s.incidence_rate || 50, s.client_cpi || 0, s.start_at || null, s.end_at || null, s.status || 'DRAFT', s.created_by || null, now, now]);
    return get('SELECT * FROM studies WHERE id = ?', [id]);
  },
  updateStudy: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['study_code', 'client_id', 'title', 'description', 'country', 'market', 'language', 'survey_url', 'survey_platform', 'target_completes', 'loi_minutes', 'incidence_rate', 'client_cpi', 'start_at', 'end_at', 'status']) {
      if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); }
    }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE studies SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM studies WHERE id = ?', [id]);
  },
  deleteStudy: async (id: string) => { run('DELETE FROM studies WHERE id = ?', [id]); },
  getStudyVendors: async (studyId: string) => all('SELECT * FROM study_vendors WHERE study_id = ?', [studyId]),
  linkStudyVendor: async (sv: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO study_vendors (id, study_id, vendor_id, vendor_cpi, target_completes, max_completes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, sv.study_id, sv.vendor_id, sv.vendor_cpi || 0, sv.target_completes || 0, sv.max_completes || 0, sv.status || 'ACTIVE', now, now]);
    return get('SELECT * FROM study_vendors WHERE id = ?', [id]);
  },
  unlinkStudyVendor: async (studyId: string, vendorId: string) => { run('DELETE FROM study_vendors WHERE study_id = ? AND vendor_id = ?', [studyId, vendorId]); },
  updateStudyVendor: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['vendor_cpi', 'target_completes', 'max_completes', 'status', 'allowed_country']) {
      if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); }
    }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE study_vendors SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM study_vendors WHERE id = ?', [id]);
  },
  getTrackingLink: async (id: string) => get('SELECT * FROM tracking_links WHERE id = ?', [id]),
  getTrackingLinkByToken: async (token: string) => get('SELECT * FROM tracking_links WHERE public_token = ?', [token]),
  getTrackingLinkByCode: async (code: string) => get('SELECT * FROM tracking_links WHERE link_code = ?', [code]),
  getTrackingLinksForStudy: async (studyId: string) => all('SELECT * FROM tracking_links WHERE study_id = ?', [studyId]),
  createTrackingLink: async (tl: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO tracking_links (id, study_id, vendor_id, link_code, public_token, base_url, destination_url, uid_mode, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, tl.study_id, tl.vendor_id, tl.link_code, tl.public_token, tl.base_url, tl.destination_url, tl.uid_mode || 'PROVIDED_UID', tl.status || 'ACTIVE', now, now]);
    return get('SELECT * FROM tracking_links WHERE id = ?', [id]);
  },
  updateTrackingLink: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['status', 'destination_url']) { if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); } }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE tracking_links SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM tracking_links WHERE id = ?', [id]);
  },
  deleteTrackingLink: async (id: string) => { run('DELETE FROM tracking_links WHERE id = ?', [id]); },
  getSessionByToken: async (token: string) => get('SELECT * FROM sessions WHERE session_token = ?', [token]),
  getSessionsForStudy: async (studyId: string, limit = 100, offset = 0) => all('SELECT * FROM sessions WHERE study_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [studyId, limit, offset]),
  createSession: async (s: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO sessions (id, session_token, study_id, vendor_id, tracking_link_id, uid, normalized_uid, external_uid, ip_hash, user_agent, country_detected, referrer, landing_url, initial_status, current_status, started_at, last_seen_at, expires_at, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, s.session_token, s.study_id, s.vendor_id, s.tracking_link_id || null, s.uid, s.normalized_uid, s.external_uid || null, s.ip_hash, s.user_agent || '', s.country_detected || '', s.referrer || '', s.landing_url || '', 'STARTED', 'STARTED', now, now, s.expires_at || new Date(Date.now()+1800000).toISOString(), s.metadata_json || '{}', now, now]);
    return get('SELECT * FROM sessions WHERE id = ?', [id]);
  },
  updateSession: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['current_status', 'completed_at', 'terminated_at', 'last_seen_at']) { if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); } }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE sessions SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM sessions WHERE id = ?', [id]);
  },
  createResponseEvent: async (e: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO response_events (id, session_id, study_id, vendor_id, uid, event_type, source, raw_payload, normalized_payload, event_key, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, e.session_id, e.study_id, e.vendor_id, e.uid, e.event_type, e.source || '', e.raw_payload, e.normalized_payload || null, e.event_key, e.ip_address || '', e.user_agent || '', now]);
    return get('SELECT * FROM response_events WHERE id = ?', [id]);
  },
  getResponsesForStudy: async (studyId: string, limit = 100, offset = 0) => all('SELECT * FROM responses WHERE study_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [studyId, limit, offset]),
  getResponseBySession: async (sessionId: string) => get('SELECT * FROM responses WHERE session_id = ?', [sessionId]),
  getResponses: async (filters: any = {}, limit = 100, offset = 0) => {
    const conditions: string[] = []; const params: any[] = [];
    if (filters.study_id) { conditions.push('r.study_id = ?'); params.push(filters.study_id); }
    if (filters.vendor_id) { conditions.push('r.vendor_id = ?'); params.push(filters.vendor_id); }
    if (filters.final_status) { conditions.push('r.final_status = ?'); params.push(filters.final_status); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = get(`SELECT COUNT(*) as count FROM responses r ${where}`, params);
    const dataRes = all(`SELECT r.* FROM responses r ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { rows: dataRes, total: countRes?.count || 0 };
  },
  createResponse: async (r: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO responses (id, session_id, study_id, vendor_id, uid, final_status, first_terminal_event, terminal_at, is_counted, rejection_reason, callback_source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, r.session_id, r.study_id, r.vendor_id, r.uid, r.final_status || 'IN_PROGRESS', r.first_terminal_event || null, r.terminal_at || null, r.is_counted || 0, r.rejection_reason || null, r.callback_source || null, now, now]);
    return get('SELECT * FROM responses WHERE id = ?', [id]);
  },
  updateResponse: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['final_status', 'first_terminal_event', 'terminal_at', 'is_counted', 'counted_at', 'rejection_reason', 'callback_source']) { if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); } }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE responses SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM responses WHERE id = ?', [id]);
  },
  getQuotasForStudy: async (studyId: string) => all('SELECT * FROM quotas WHERE study_id = ?', [studyId]),
  createQuota: async (q: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO quotas (id, study_id, name, target, achieved, remaining, status, criteria_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, q.study_id, q.name, q.target || 0, q.achieved || 0, q.remaining || q.target || 0, q.status || 'OPEN', q.criteria_json || '{}', now, now]);
    return get('SELECT * FROM quotas WHERE id = ?', [id]);
  },
  updateQuota: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['target', 'achieved', 'remaining', 'status']) { if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); } }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE quotas SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM quotas WHERE id = ?', [id]);
  },
  getAuditLogs: async (filters: any = {}, limit = 100, offset = 0) => {
    const conditions: string[] = []; const params: any[] = [];
    if (filters.entity) { conditions.push('entity = ?'); params.push(filters.entity); }
    if (filters.entity_id) { conditions.push('entity_id = ?'); params.push(filters.entity_id); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = get(`SELECT COUNT(*) as count FROM audit_logs ${where}`, params);
    const dataRes = all(`SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { rows: dataRes, total: countRes?.count || 0 };
  },
  createAuditLog: async (log: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO audit_logs (id, user_id, "user", action, entity, entity_id, "before", "after", timestamp, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, log.user_id || null, log.user, log.action, log.entity, log.entity_id, log.before || null, log.after || null, log.timestamp || now, log.ip || null]);
  },
  getFakeClicks: async (filters: any = {}, limit = 100, offset = 0) => {
    const conditions: string[] = ['rejection_reason IS NOT NULL']; const params: any[] = [];
    if (filters.study_id) { conditions.push('study_id = ?'); params.push(filters.study_id); }
    if (filters.uid) { conditions.push('uid = ?'); params.push(filters.uid); }
    if (filters.rejection_reason) { conditions.push('rejection_reason = ?'); params.push(filters.rejection_reason); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const countRes = get(`SELECT COUNT(*) as count FROM sessions ${where}`, params);
    const dataRes = all(`SELECT * FROM sessions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { rows: dataRes, total: countRes?.count || 0 };
  },
  getFakeClickStats: async (studyId: string) => all('SELECT rejection_reason, COUNT(*) as count FROM sessions WHERE study_id = ? AND rejection_reason IS NOT NULL GROUP BY rejection_reason', [studyId]),
  getDashboardStats: async () => {
    const studies = get('SELECT COUNT(*) as count FROM studies') as { count: number };
    const sessions = get('SELECT COUNT(*) as count FROM sessions') as { count: number };
    const responses = get('SELECT COUNT(*) as count FROM responses') as { count: number };
    const vendors = get('SELECT COUNT(*) as count FROM vendors') as { count: number };
    return { studies: studies.count, sessions: sessions.count, responses: responses.count, vendors: vendors.count };
  },
  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Survey Builder Methods Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  getStudyLsMapping: async (studyId: string) => get('SELECT ls_survey_id, ls_survey_status FROM studies WHERE id = ?', [studyId]),
  updateStudyLsMapping: async (studyId: string, lsSurveyId: number, status: string) => {
    run('UPDATE studies SET ls_survey_id = ?, ls_survey_status = ?, updated_at = ? WHERE id = ?', [lsSurveyId, status, new Date().toISOString(), studyId]);
    return get('SELECT * FROM studies WHERE id = ?', [studyId]);
  },
  updateStudySurveyUrl: async (studyId: string, url: string) => {
    run('UPDATE studies SET survey_url = ?, updated_at = ? WHERE id = ?', [url, new Date().toISOString(), studyId]);
  },
  getSurveyGroups: async (studyId: string) => all('SELECT * FROM survey_groups WHERE study_id = ? ORDER BY group_order', [studyId]),
  createSurveyGroup: async (group: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO survey_groups (id, study_id, ls_group_id, title, description, group_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, group.study_id, group.ls_group_id || 0, group.title, group.description || '', group.group_order || 0, now, now]);
    return get('SELECT * FROM survey_groups WHERE id = ?', [id]);
  },
  updateSurveyGroup: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['title', 'description', 'group_order', 'ls_group_id', 'relevance_expression']) {
      if (fields[k] !== undefined) { params.push(fields[k]); sets.push(`${k} = ?`); }
    }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE survey_groups SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM survey_groups WHERE id = ?', [id]);
  },
  deleteSurveyGroup: async (id: string) => { run('DELETE FROM survey_groups WHERE id = ?', [id]); },
  getSurveyQuestions: async (studyId: string) => all('SELECT * FROM survey_questions WHERE study_id = ? ORDER BY question_order', [studyId]),
  getSurveyQuestionById: async (id: string) => get('SELECT * FROM survey_questions WHERE id = ?', [id]),
  createSurveyQuestion: async (q: any) => {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    run('INSERT INTO survey_questions (id, study_id, group_id, ls_question_id, question_code, question_text, question_type, question_type_name, is_mandatory, question_order, relevance_expression, answer_options, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, q.study_id, q.group_id, q.ls_question_id || 0, q.question_code || null, q.question_text || '', q.question_type || 'L', q.question_type_name || 'single_choice', q.is_mandatory ? 1 : 0, q.question_order || 0, q.relevance_expression || '1', JSON.stringify(q.answer_options || []), JSON.stringify(q.attributes || {}), now, now]);
    return get('SELECT * FROM survey_questions WHERE id = ?', [id]);
  },
  updateSurveyQuestion: async (id: string, fields: any) => {
    const sets: string[] = []; const params: any[] = [];
    for (const k of ['question_text', 'question_type', 'question_type_name', 'is_mandatory', 'question_order', 'question_code', 'relevance_expression', 'answer_options', 'attributes']) {
      if (fields[k] !== undefined) {
        const val = (k === 'answer_options' || k === 'attributes') ? JSON.stringify(fields[k]) : (k === 'is_mandatory' ? (fields[k] ? 1 : 0) : fields[k]);
        params.push(val); sets.push(`${k} = ?`);
      }
    }
    if (sets.length === 0) return null;
    params.push(new Date().toISOString(), id);
    run(`UPDATE survey_questions SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params);
    return get('SELECT * FROM survey_questions WHERE id = ?', [id]);
  },
  deleteSurveyQuestion: async (id: string) => { run('DELETE FROM survey_questions WHERE id = ?', [id]); },
  reorderSurveyQuestions: async (studyId: string, orderedIds: string[]) => {
    const stmt = getDb().prepare('UPDATE survey_questions SET question_order = ?, updated_at = ? WHERE id = ? AND study_id = ?');
    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i++) { stmt.run(i + 1, now, orderedIds[i], studyId); }
  },
  reorderSurveyGroups: async (studyId: string, orderedIds: string[]) => {
    const stmt = getDb().prepare('UPDATE survey_groups SET group_order = ?, updated_at = ? WHERE id = ? AND study_id = ?');
    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i++) { stmt.run(i + 1, now, orderedIds[i], studyId); }
  },
};