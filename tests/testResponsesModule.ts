import ExcelJS from 'exceljs';
import { db } from '../src/db';
import assert from 'assert';

async function testResponsesModule() {
  console.log('\n==================================================');
  console.log('🧪 TESTING RESPONSES MODULE & EXCEL VALIDATION');
  console.log('==================================================\n');

  // 1. Test db.getResponses API
  const res = await db.getResponses({ page: 1, limit: 25 });
  console.log(`✓ 1. getResponses returned ${res.rows.length} rows (Total: ${res.total})`);
  assert(Array.isArray(res.rows), 'getResponses must return rows array');

  if (res.rows.length > 0) {
    const sample = res.rows[0];
    console.log(`✓ 2. Primary Columns Check:`);
    console.log(`   - UID: ${sample.uid}`);
    console.log(`   - Project: ${sample.project}`);
    console.log(`   - IP Address: ${sample.ip_address}`);
    console.log(`   - Device: ${sample.device}`);
    console.log(`   - User Agent: ${sample.user_agent.slice(0, 30)}...`);
    console.log(`   - Status: ${sample.status}`);
    console.log(`   - Timestamp: ${sample.created_at}`);

    assert(sample.uid !== undefined, 'UID must be present');
    assert(sample.project !== undefined, 'Project must be present');
    assert(sample.ip_address !== undefined, 'IP Address must be present');
    assert(sample.device !== undefined, 'Device must be present');
    assert(sample.user_agent !== undefined, 'User Agent must be present');
    assert(sample.status !== undefined, 'Status must be present');
    assert(sample.created_at !== undefined, 'Timestamp must be present');
  }

  // 2. Test Excel Generation
  console.log('\n✓ 3. Generating & Validating Excel Workbook (.xlsx)...');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Opinion Insights CAWI Platform';
  
  const worksheet = workbook.addWorksheet('Responses', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  worksheet.columns = [
    { header: 'UID', key: 'uid', width: 28 },
    { header: 'Project', key: 'project', width: 25 },
    { header: 'IP Address', key: 'ip_address', width: 18 },
    { header: 'Device', key: 'device', width: 15 },
    { header: 'User Agent', key: 'user_agent', width: 60 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Timestamp', key: 'timestamp', width: 28 },
  ];

  // Add rows
  res.rows.forEach(r => {
    worksheet.addRow({
      uid: String(r.uid || ''),
      project: String(r.project || ''),
      ip_address: String(r.ip_address || ''),
      device: String(r.device || 'Desktop'),
      user_agent: String(r.user_agent || ''),
      status: String(r.status || 'COMPLETE'),
      timestamp: r.created_at ? new Date(r.created_at) : new Date(),
    });
  });

  worksheet.autoFilter = `A1:G${res.rows.length + 1}`;

  const buffer = await workbook.xlsx.writeBuffer();
  console.log(`✓ Excel binary buffer generated successfully (${buffer.byteLength} bytes)`);

  // 3. Programmatically Read back the generated Excel Buffer & Validate
  const readWorkbook = new ExcelJS.Workbook();
  await readWorkbook.xlsx.load(buffer as any);

  const readSheet = readWorkbook.getWorksheet('Responses');
  assert(readSheet !== undefined, 'Worksheet "Responses" must exist');

  const headers: string[] = [];
  readSheet.getRow(1).eachCell(cell => {
    headers.push(String(cell.value));
  });

  const expectedHeaders = ['UID', 'Project', 'IP Address', 'Device', 'User Agent', 'Status', 'Timestamp'];
  console.log(`✓ Header verification: [${headers.join(' | ')}]`);
  assert.deepStrictEqual(headers, expectedHeaders, 'Exact 7 columns must match in exact order');

  const view = readSheet.views[0] as any;
  assert(view.state === 'frozen' && view.ySplit === 1, 'Header row must be frozen');
  console.log('✓ Frozen Header Verified (ySplit = 1)');

  assert(readSheet.autoFilter !== undefined, 'AutoFilter must be configured');
  console.log('✓ AutoFilter Verified');

  console.log('\n==================================================');
  console.log('✅ ALL RESPONSES MODULE & EXCEL TESTS PASSED!');
  console.log('==================================================\n');
  process.exit(0);
}

testResponsesModule().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
