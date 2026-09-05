import express from 'express';
import cors from 'cors';
import routes from './routes';
import path from 'path';
import fs from 'fs';
import { config } from './config';

const app = express();
const port = config.port;

// Production-ready CORS allowing local development, opinioninsights.in and any Vercel deployment preview
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.endsWith('.vercel.app') || 
      origin.includes('opinioninsights.in');
    return callback(null, isAllowed);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── API routes ─────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Health check (API) ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      environment: process.env.NODE_ENV || (process.env.VERCEL ? 'production' : 'development'),
      version: '1.0.0',
    },
  });
});

// ─── Static files and SPA dashboard with resilient path discovery ──────
const staticCandidates = [
  path.resolve(__dirname, 'src/app/public/static'),
  path.resolve(__dirname, '../src/app/public/static'),
  path.resolve(__dirname, '../opi.opinioninsights.in/opi.opinioninsights.in/static'),
  path.resolve(__dirname, '../public/static'),
  path.resolve(__dirname, '../dist/app/public/static'),
  path.resolve(process.cwd(), 'src/app/public/static'),
  path.resolve(process.cwd(), 'opi.opinioninsights.in/opi.opinioninsights.in/static'),
  path.resolve(process.cwd(), 'public/static'),
];

for (const p of staticCandidates) {
  if (fs.existsSync(p)) {
    app.use('/static', express.static(p));
  }
}

function resolveDashboardFile(): string {
  const candidates = [
    path.resolve(__dirname, 'src/app/public/dashboard.html'),
    path.resolve(__dirname, '../src/app/public/dashboard.html'),
    path.resolve(__dirname, '../opi.opinioninsights.in/opi.opinioninsights.in/dashboard.html'),
    path.resolve(process.cwd(), 'src/app/public/dashboard.html'),
    path.resolve(process.cwd(), 'opi.opinioninsights.in/opi.opinioninsights.in/dashboard.html'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const dashboardFile = resolveDashboardFile();

// Serve dashboard on /dashboard and fallback for direct browser loads
app.get('/dashboard', (_req, res) => {
  res.sendFile(resolveDashboardFile());
});

// Also mount routes at root for endpoints like /s/:projectCode and /redirect/:status
app.use('/', routes);

// ─── Root homepage ──────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.sendFile(resolveDashboardFile());
});

// ─── Root health (no prefix) ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'CAWI Fieldwork Tracking Platform is running',
  });
});

// ─── Server start (Non-Vercel environment) ──────────────────────────────
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 CAWI Fieldwork Tracking Platform running on port ${port}`);
    console.log(`📍 Health check: http://localhost:${port}/api/health`);
    console.log(`📍 Dashboard:    http://localhost:${port}/dashboard`);
    console.log(`📍 Start:        http://localhost:${port}/api/start/:linkCode?uid=ABC123`);
    console.log(`📍 Callback:     http://localhost:${port}/api/callback`);
  });
}

export default app;
