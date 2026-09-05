require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const email = 'admin@opinioninsights.io';
const password = 'admin123';
const secret = 'oi-platform-auth-secret-change-in-production-32chars';
const passwordHash = crypto.createHmac('sha256', secret).update(password).digest('hex');

async function createUser() {
  try {
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('User already exists:', existing.rows[0].email);
      // Update password
      await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email]);
      console.log('Password updated');
    } else {
      const result = await db.query(
        `INSERT INTO users (auth_user_id, full_name, email, role, status, password_hash, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        ['Admin User', email, 'ADMIN', 'ACTIVE', passwordHash]
      );
      console.log('User created:', result.rows[0].email);
    }
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.end();
  }
}

createUser();
