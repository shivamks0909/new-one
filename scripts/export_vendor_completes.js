const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function exportCompletes() {
  const query = `
    SELECT 
      f.id,
      f.uid,
      COALESCE(s.study_code, s.external_offer_id, f.raw_payload->>'pid', '') AS study_identifier,
      s.title AS study_title,
      v.name AS vendor_name,
      COALESCE(
        UPPER(f.raw_payload->>'claimed_status'),
        UPPER(f.raw_payload->>'outcome'),
        UPPER(f.raw_payload->'query'->>'status'),
        UPPER(f.raw_payload->>'status')
      ) AS resolved_status,
      f.rejection_reason,
      f.ip_address,
      f.created_at
    FROM fake_click_events f
    LEFT JOIN studies s ON s.id = f.study_id
    LEFT JOIN vendors v ON v.id = f.vendor_id
    WHERE LOWER(COALESCE(
      f.raw_payload->>'claimed_status',
      f.raw_payload->>'outcome',
      f.raw_payload->'query'->>'status',
      f.raw_payload->>'status',
      ''
    )) IN ('complete', 'completed', 'success')
    ORDER BY f.created_at DESC;
  `;

  const { rows } = await pool.query(query);
  console.log(`Fetched ${rows.length} complete records.`);

  const headers = ['id', 'uid', 'study_identifier', 'study_title', 'vendor_name', 'resolved_status', 'rejection_reason', 'ip_address', 'created_at'];
  const csvLines = [headers.join(',')];

  for (const r of rows) {
    const line = [
      `"${r.id || ''}"`,
      `"${r.uid || ''}"`,
      `"${(r.study_identifier || '').replace(/"/g, '""')}"`,
      `"${(r.study_title || '').replace(/"/g, '""')}"`,
      `"${(r.vendor_name || '').replace(/"/g, '""')}"`,
      `"${r.resolved_status || ''}"`,
      `"${r.rejection_reason || ''}"`,
      `"${r.ip_address || ''}"`,
      `"${r.created_at ? new Date(r.created_at).toISOString() : ''}"`
    ];
    csvLines.push(line.join(','));
  }

  const outputPath = path.join(process.cwd(), 'vendor_actual_completes.csv');
  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
  console.log(`Successfully exported to ${outputPath}`);

  await pool.end();
}

exportCompletes().catch(err => {
  console.error(err);
  pool.end();
  process.exit(1);
});
