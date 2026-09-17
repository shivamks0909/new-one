import express, { Response } from 'express';
import ExcelJS from 'exceljs';
import { db } from '../db';
import { authenticate, authorize, AuthRequest, verifyJwt } from '../auth/middleware';
import { config } from '../config';

const router = express.Router();

const STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB (Supabase free tier quota)

// Middleware supporting header Bearer token OR ?token= query parameter for direct download
async function authenticateDownload(req: AuthRequest, res: Response, next: any) {
  const queryToken = req.query.token as string | undefined;
  if (queryToken && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  return authenticate(req, res, next);
}

// ── GET /api/database/stats ──────────────────────────────────────────
router.get('/stats', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Database overall size
    let dbSizePretty = '0 MB';
    let dbSizeBytes = 0;
    try {
      const sizeRes = await db.pool.query('SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as raw');
      dbSizePretty = sizeRes.rows[0]?.size || '0 MB';
      dbSizeBytes = Number(sizeRes.rows[0]?.raw || 0);
    } catch (e: any) {
      console.warn('[DB Stats] Could not query pg_database_size:', e.message);
    }

    const usagePercent = Number(((dbSizeBytes / STORAGE_LIMIT_BYTES) * 100).toFixed(2));

    // Get individual table sizes
    let tableSizes: any[] = [];
    try {
      const tsRes = await db.pool.query(`
        SELECT 
          table_name,
          pg_size_pretty(pg_total_relation_size('"' || table_name || '"')) as size_pretty,
          pg_total_relation_size('"' || table_name || '"') as bytes
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY bytes DESC
      `);
      tableSizes = tsRes.rows.map(r => ({
        tableName: r.table_name,
        sizePretty: r.size_pretty,
        bytes: Number(r.bytes),
      }));
    } catch (e: any) {
      console.warn('[DB Stats] Table size query failed:', e.message);
    }

    // High level metrics
    const [projRes, sessRes, respRes, compRes, fakeRes, logsRes, usersRes] = await Promise.all([
      db.pool.query('SELECT COUNT(*) as c FROM projects').catch(() => ({ rows: [{ c: 0 }] })),
      db.pool.query('SELECT COUNT(*) as c FROM sessions').catch(() => ({ rows: [{ c: 0 }] })),
      db.pool.query('SELECT COUNT(*) as c FROM responses').catch(() => ({ rows: [{ c: 0 }] })),
      db.pool.query("SELECT COUNT(*) as c FROM responses WHERE final_status='COMPLETED'").catch(() => ({ rows: [{ c: 0 }] })),
      db.pool.query('SELECT COUNT(*) as c FROM fake_click_events').catch(() => ({ rows: [{ c: 0 }] })),
      db.pool.query('SELECT COUNT(*) as c FROM audit_logs').catch(() => ({ rows: [{ c: 0 }] })),
      db.pool.query('SELECT COUNT(*) as c FROM users').catch(() => ({ rows: [{ c: 0 }] })),
    ]);

    const counts = {
      projects: Number(projRes.rows[0]?.c || 0),
      sessions: Number(sessRes.rows[0]?.c || 0),
      responses: Number(respRes.rows[0]?.c || 0),
      completes: Number(compRes.rows[0]?.c || 0),
      fakeClicks: Number(fakeRes.rows[0]?.c || 0),
      auditLogs: Number(logsRes.rows[0]?.c || 0),
      users: Number(usersRes.rows[0]?.c || 0),
    };

    return res.json({
      success: true,
      data: {
        dbSizePretty,
        dbSizeBytes,
        storageLimitBytes: STORAGE_LIMIT_BYTES,
        storageLimitPretty: '500 MB',
        usagePercent,
        counts,
        tableSizes,
      },
    });
  } catch (err: any) {
    console.error('[DB Stats] Error:', err);
    return res.status(500).json({ success: false, error: { message: err.message || 'Failed to fetch database stats' } });
  }
});

// ── GET /api/database/export ─────────────────────────────────────────
router.get('/export', authenticateDownload, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Opinion Insights Fieldwork System';
    wb.created = new Date();

    const BRAND_DARK = 'FF0F172A';
    const BRAND_TEAL = 'FF00BFA5';
    const BRAND_BORDER = 'FFE2E8F0';
    const ZEBRA_LIGHT = 'FFF8FAFC';

    const applyHeaderStyle = (row: ExcelJS.Row, bgArgb = BRAND_DARK) => {
      row.height = 28;
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: BRAND_BORDER } },
          bottom: { style: 'medium', color: { argb: BRAND_TEAL } },
        };
      });
    };

    const applyDataRowStyle = (row: ExcelJS.Row, isEven: boolean) => {
      row.height = 20;
      row.eachCell((cell) => {
        if (typeof cell.value === 'string' && /^[=+\-@\t\r]/.test(cell.value)) {
          cell.value = "'" + cell.value;
        }
        cell.font = { name: 'Segoe UI', size: 9.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: BRAND_BORDER } },
          bottom: { style: 'thin', color: { argb: BRAND_BORDER } },
          left: { style: 'thin', color: { argb: BRAND_BORDER } },
          right: { style: 'thin', color: { argb: BRAND_BORDER } },
        };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_LIGHT } };
        }
        cell.alignment = { vertical: 'middle' };
      });
    };

    const autoFitColumns = (ws: ExcelJS.Worksheet) => {
      ws.columns.forEach((col: any) => {
        let maxLen = 10;
        col.eachCell({ includeEmpty: true }, (cell: any) => {
          const valStr = cell.value ? cell.value.toString() : '';
          if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 50);
        });
        col.width = maxLen + 4;
      });
    };

    // Sheet 1: System Overview
    const wsSum = wb.addWorksheet('System Overview');
    wsSum.views = [{ state: 'normal' }];

    const dbSizeRes = await db.pool.query('SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as raw').catch(() => ({ rows: [] }));
    const dbPretty = dbSizeRes.rows[0]?.size || '16 MB';
    const dbRaw = Number(dbSizeRes.rows[0]?.raw || 0);
    const pct = ((dbRaw / STORAGE_LIMIT_BYTES) * 100).toFixed(2);

    const [projCnt, sessCnt, respCnt, compCnt, fakeCnt] = await Promise.all([
      db.pool.query('SELECT COUNT(*) as c FROM projects').then(r => r.rows[0]?.c || 0).catch(() => 0),
      db.pool.query('SELECT COUNT(*) as c FROM sessions').then(r => r.rows[0]?.c || 0).catch(() => 0),
      db.pool.query('SELECT COUNT(*) as c FROM responses').then(r => r.rows[0]?.c || 0).catch(() => 0),
      db.pool.query("SELECT COUNT(*) as c FROM responses WHERE final_status='COMPLETED'").then(r => r.rows[0]?.c || 0).catch(() => 0),
      db.pool.query('SELECT COUNT(*) as c FROM fake_click_events').then(r => r.rows[0]?.c || 0).catch(() => 0),
    ]);

    wsSum.mergeCells('A1:F1');
    const titleCell = wsSum.getCell('A1');
    titleCell.value = 'OPINION INSIGHTS — MASTER DATABASE ARCHIVE';
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    wsSum.getRow(1).height = 38;

    wsSum.addRow([]);
    wsSum.addRow(['Storage Metric', 'Value', 'Status', 'Limit / Quota', 'Usage %']);
    applyHeaderStyle(wsSum.getRow(3), BRAND_TEAL);
    wsSum.addRow(['Database Size', dbPretty, 'Healthy', '500 MB', `${pct}%`]);
    applyDataRowStyle(wsSum.getRow(4), false);

    wsSum.addRow([]);
    wsSum.addRow(['Entity / Metric', 'Total Records', 'Description']);
    applyHeaderStyle(wsSum.getRow(6), BRAND_DARK);
    wsSum.addRow(['Total Projects', projCnt, 'Fieldwork projects created']);
    applyDataRowStyle(wsSum.getRow(7), false);
    wsSum.addRow(['Total Survey Sessions', sessCnt, 'Unique respondent tracking attempts']);
    applyDataRowStyle(wsSum.getRow(8), true);
    wsSum.addRow(['Total Terminal Responses', respCnt, 'Recorded completes, terms, quota hits']);
    applyDataRowStyle(wsSum.getRow(9), false);
    wsSum.addRow(['Verified Completes', compCnt, 'Legitimate completed surveys']);
    applyDataRowStyle(wsSum.getRow(10), true);
    wsSum.addRow(['Security Intercepts & Fake Clicks', fakeCnt, 'Fraudulent or direct unverified attempts blocked']);
    applyDataRowStyle(wsSum.getRow(11), false);
    autoFitColumns(wsSum);

    // Sheet 2: Projects
    const wsProj = wb.addWorksheet('Projects');
    wsProj.views = [{ state: 'frozen', ySplit: 1 }];
    wsProj.columns = [
      { header: 'Project Code', key: 'project_code' },
      { header: 'Project Name', key: 'name' },
      { header: 'Status', key: 'status' },
      { header: 'Client', key: 'client_name' },
      { header: 'Client Rate', key: 'client_rate' },
      { header: 'Vendor Rate', key: 'vendor_rate' },
      { header: 'Currency', key: 'currency' },
      { header: 'Survey URL', key: 'survey_url' },
      { header: 'Created Date', key: 'created_at' },
    ];
    applyHeaderStyle(wsProj.getRow(1));

    const projRows = await db.pool.query('SELECT * FROM projects ORDER BY created_at DESC').catch(() => ({ rows: [] }));
    projRows.rows.forEach((r: any, idx: number) => {
      wsProj.addRow({
        project_code: r.project_code,
        name: r.name,
        status: r.status,
        client_name: r.client_name,
        client_rate: Number(r.client_rate || 0),
        vendor_rate: Number(r.vendor_rate || 0),
        currency: r.currency || 'USD',
        survey_url: r.survey_url,
        created_at: r.created_at ? new Date(r.created_at).toISOString().slice(0, 19).replace('T', ' ') : '',
      });
      applyDataRowStyle(wsProj.lastRow!, idx % 2 === 1);
    });
    wsProj.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } };
    autoFitColumns(wsProj);

    // Sheet 3: Responses
    const wsResp = wb.addWorksheet('Responses');
    wsResp.views = [{ state: 'frozen', ySplit: 1 }];
    wsResp.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Project Code', key: 'project_code' },
      { header: 'UID', key: 'uid' },
      { header: 'Final Status', key: 'final_status' },
      { header: 'Verification Type', key: 'verification' },
      { header: 'Client Billing', key: 'client_billing_status' },
      { header: 'Vendor Acceptance', key: 'vendor_acceptance_status' },
      { header: 'LOI (Sec)', key: 'loi_seconds' },
      { header: 'Rejection Reason', key: 'rejection_reason' },
      { header: 'Timestamp', key: 'created_at' },
    ];
    applyHeaderStyle(wsResp.getRow(1), 'FF0D9488');

    const respData = await db.pool.query(`
      SELECT r.*, p.project_code 
      FROM responses r 
      LEFT JOIN projects p ON p.id = r.project_id 
      ORDER BY r.created_at DESC
    `).catch(() => ({ rows: [] }));

    respData.rows.forEach((r: any, idx: number) => {
      const isUnverified = r.callback_source === 'DIRECT_UNVERIFIED' || r.rejection_reason?.includes('UNVERIFIED');
      wsResp.addRow({
        id: r.id,
        project_code: r.project_code || 'N/A',
        uid: r.uid,
        final_status: r.final_status,
        verification: isUnverified ? 'UNVERIFIED' : 'VERIFIED',
        client_billing_status: r.client_billing_status || 'PENDING',
        vendor_acceptance_status: r.vendor_acceptance_status || 'PENDING',
        loi_seconds: r.loi_seconds || 0,
        rejection_reason: r.rejection_reason || '',
        created_at: r.created_at ? new Date(r.created_at).toISOString().slice(0, 19).replace('T', ' ') : '',
      });
      const dRow = wsResp.lastRow!;
      applyDataRowStyle(dRow, idx % 2 === 1);

      const statusCell = dRow.getCell('final_status');
      if (r.final_status === 'COMPLETED') {
        statusCell.font = { color: { argb: 'FF16A34A' }, bold: true };
      } else if (r.final_status === 'TERMINATED') {
        statusCell.font = { color: { argb: 'FFDC2626' } };
      } else if (r.final_status === 'QUOTA_FULL') {
        statusCell.font = { color: { argb: 'FFD97706' } };
      }
    });
    wsResp.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };
    autoFitColumns(wsResp);

    // Sheet 4: Survey Sessions
    const wsSess = wb.addWorksheet('Sessions');
    wsSess.views = [{ state: 'frozen', ySplit: 1 }];
    wsSess.columns = [
      { header: 'Session Token', key: 'session_token' },
      { header: 'UID', key: 'uid' },
      { header: 'Status', key: 'current_status' },
      { header: 'Country', key: 'country_detected' },
      { header: 'IP Address', key: 'ip' },
      { header: 'Started At', key: 'started_at' },
      { header: 'Completed At', key: 'completed_at' },
    ];
    applyHeaderStyle(wsSess.getRow(1));

    const sessData = await db.pool.query(`SELECT * FROM sessions ORDER BY created_at DESC LIMIT 5000`).catch(() => ({ rows: [] }));
    sessData.rows.forEach((r: any, idx: number) => {
      wsSess.addRow({
        session_token: r.session_token,
        uid: r.uid,
        current_status: r.current_status || r.initial_status,
        country_detected: r.country_detected || 'N/A',
        ip: r.ip || 'Masked',
        started_at: r.started_at ? new Date(r.started_at).toISOString().slice(0, 19).replace('T', ' ') : '',
        completed_at: r.completed_at ? new Date(r.completed_at).toISOString().slice(0, 19).replace('T', ' ') : '',
      });
      applyDataRowStyle(wsSess.lastRow!, idx % 2 === 1);
    });
    wsSess.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } };
    autoFitColumns(wsSess);

    // Sheet 5: Security & Fake Clicks
    const wsFake = wb.addWorksheet('Security & Intercepts');
    wsFake.views = [{ state: 'frozen', ySplit: 1 }];
    wsFake.columns = [
      { header: 'Event ID', key: 'id' },
      { header: 'Project Code', key: 'project_code' },
      { header: 'UID', key: 'uid' },
      { header: 'Reason / Detection', key: 'rejection_reason' },
      { header: 'IP Address', key: 'ip_address' },
      { header: 'User Agent', key: 'user_agent' },
      { header: 'Detected At', key: 'created_at' },
    ];
    applyHeaderStyle(wsFake.getRow(1), 'FF991B1B');

    const fakeData = await db.pool.query(`
      SELECT f.*, p.project_code 
      FROM fake_click_events f 
      LEFT JOIN projects p ON p.id = f.project_id 
      ORDER BY f.created_at DESC 
      LIMIT 5000
    `).catch(() => ({ rows: [] }));

    fakeData.rows.forEach((r: any, idx: number) => {
      wsFake.addRow({
        id: r.id,
        project_code: r.project_code || 'DIRECT_ATTEMPT',
        uid: r.uid,
        rejection_reason: r.rejection_reason,
        ip_address: r.ip_address || 'N/A',
        user_agent: (r.user_agent || '').slice(0, 80),
        created_at: r.created_at ? new Date(r.created_at).toISOString().slice(0, 19).replace('T', ' ') : '',
      });
      applyDataRowStyle(wsFake.lastRow!, idx % 2 === 1);
    });
    wsFake.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } };
    autoFitColumns(wsFake);

    // Send response as Excel file stream
    const fileName = `OpinionInsights-Database-Export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    return res.end();
  } catch (err: any) {
    console.error('[DB Export] Error:', err);
    return res.status(500).json({ success: false, error: { message: err.message || 'Export failed' } });
  }
});

// ── POST /api/database/reset ─────────────────────────────────────────
router.post('/reset', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const { confirmation, mode = 'FIELDWORK_ONLY' } = req.body;

  if (confirmation !== 'RESET-CONFIRM') {
    return res.status(400).json({
      success: false,
      error: { code: 'CONFIRMATION_REQUIRED', message: 'You must type RESET-CONFIRM to execute database reset.' },
    });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let summary: Record<string, number> = {};

    if (mode === 'FIELDWORK_ONLY') {
      // Wipes responses, sessions, fake clicks, logs, settlements, invoices
      // Keeps projects, links, users, clients, vendors
      const tablesToClean = [
        'invoice_line_items',
        'responses',
        'response_events',
        'sessions',
        'fake_click_events',
        'vendor_settlements',
        'invoices',
        'login_audit',
        'audit_logs',
      ];

      for (const tbl of tablesToClean) {
        const delRes = await client.query(`DELETE FROM "${tbl}"`);
        summary[tbl] = delRes.rowCount || 0;
      }
    } else if (mode === 'FULL_RESET') {
      // Comprehensive project & fieldwork wipe
      // NEVER wipes: users, vendors, clients, credential_vault, _migrations
      const fullTables = [
        'invoice_line_items',
        'responses',
        'response_events',
        'sessions',
        'fake_click_events',
        'vendor_settlements',
        'invoices',
        'link_quotas',
        'link_vendor_assignments',
        'project_links',
        'country_quotas',
        'project_countries',
        'project_quotas',
        'rate_audit',
        'projects',
        'quotas',
        'survey_questions',
        'survey_groups',
        'tracking_links',
        'study_vendors',
        'studies',
        'login_audit',
        'audit_logs',
      ];

      for (const tbl of fullTables) {
        try {
          const delRes = await client.query(`DELETE FROM "${tbl}"`);
          summary[tbl] = delRes.rowCount || 0;
        } catch (tblErr: any) {
          console.warn(`[Reset] Table ${tbl} deletion notice:`, tblErr.message);
        }
      }
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { message: 'Invalid reset mode' } });
    }

    // Insert fresh audit entry so the system remembers who reset it
    try {
      await client.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        req.user?.id || null,
        'DATABASE_RESET',
        'DATABASE',
        mode,
        JSON.stringify({ mode, timestamp: new Date().toISOString(), summary }),
      ]);
    } catch {
      // ignore if audit_logs schema differs
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        mode,
        message: mode === 'FIELDWORK_ONLY' 
          ? 'Fieldwork responses, sessions, and logs successfully reset.' 
          : 'Full project and fieldwork database successfully reset. Admin accounts and clients preserved.',
        deletedCounts: summary,
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[DB Reset] Transaction error:', err);
    return res.status(500).json({ success: false, error: { message: err.message || 'Reset failed' } });
  } finally {
    client.release();
  }
});

export default router;
