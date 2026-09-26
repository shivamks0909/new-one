const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Connecting to database...');
  const count = await pool.query('SELECT COUNT(*) FROM fake_click_events');
  console.log('Total fake_click_events:', count.rows[0].count);

  const breakdown = await pool.query(`
    SELECT 
      COALESCE(
        UPPER(raw_payload->>'claimed_status'),
        UPPER(raw_payload->>'outcome'),
        UPPER(raw_payload->'query'->>'status'),
        UPPER(raw_payload->>'status'),
        'UNKNOWN'
      ) AS actual_claimed_status,
      COUNT(*) AS total_count
    FROM fake_click_events
    GROUP BY 1
    ORDER BY 2 DESC;
  `);
  console.log('Breakdown by actual claimed status:');
  console.table(breakdown.rows);

  const dateBreakdown = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COALESCE(
        UPPER(raw_payload->>'claimed_status'),
        UPPER(raw_payload->>'outcome'),
        UPPER(raw_payload->'query'->>'status'),
        UPPER(raw_payload->>'status'),
        'UNKNOWN'
      ) AS status,
      COUNT(*) AS count
    FROM fake_click_events
    GROUP BY 1, 2
    ORDER BY 1 DESC, 3 DESC;
  `);
  console.log('\nBreakdown by Date & Status:');
  console.table(dateBreakdown.rows);

  const vendorCompletes = await pool.query(`
    SELECT 
      uid,
      study_id,
      vendor_id,
      rejection_reason,
      COALESCE(
        UPPER(raw_payload->>'claimed_status'),
        UPPER(raw_payload->>'outcome'),
        UPPER(raw_payload->'query'->>'status'),
        UPPER(raw_payload->>'status')
      ) AS resolved_status,
      created_at
    FROM fake_click_events
    WHERE LOWER(COALESCE(
      raw_payload->>'claimed_status',
      raw_payload->>'outcome',
      raw_payload->'query'->>'status',
      raw_payload->>'status',
      ''
    )) IN ('complete', 'completed', 'success')
    ORDER BY created_at DESC;
  `);

  console.log(`\nFound ${vendorCompletes.rows.length} actual COMPLETE records in fake_click_events:`);
  console.table(vendorCompletes.rows.slice(0, 15));

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  pool.end();
  process.exit(1);
});
