const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT email, role, status, vendor_id FROM users WHERE role = 'VENDOR' LIMIT 5")
  .then(r => { console.table(r.rows); pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
