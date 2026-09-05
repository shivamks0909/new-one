import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
    vendor_id?: string | null;
  };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function clearExpiredBuckets() {
  const now = Date.now();
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetAt < now) rateLimitStore.delete(k);
  }
}
setInterval(clearExpiredBuckets, 60000);

function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = rateLimitStore.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, bucket);
    return true;
  }
  bucket.count++;
  return bucket.count <= maxRequests;
}

export function rateLimitMiddleware(maxRequests: number, windowMs?: number) {
  const ms = windowMs ?? config.rateLimitWindowMs;
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `rl:${req.path}:${ip}`;
    if (!rateLimit(key, maxRequests, ms)) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
      });
    }
    return next();
  };
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function verifyJwt(token: string, secret: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const signingInput = `${parts[0]}.${parts[1]}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64url');
    if (expectedSig !== parts[2]) return null;
    const payload = JSON.parse(base64urlDecode(parts[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authorization header with Bearer token required' },
    });
  }
  const token = authHeader.slice(7);

  const payload = verifyJwt(token, config.authSecret);
  if (payload) {
    req.user = {
      id: payload.sub || payload.user_id,
      role: payload.role || 'OPERATOR',
      email: payload.email || '',
      vendor_id: payload.vendor_id || null,
    };
    return next();
  }

  const supabasePayload = verifyJwt(token, config.supabaseAnonKey);
  if (supabasePayload) {
    try {
      const user = await db.getUserByAuthId(supabasePayload.sub || '');
      req.user = {
        id: user?.id || supabasePayload.sub,
        role: user?.role || 'OPERATOR',
        email: user?.email || supabasePayload.email || '',
        vendor_id: user?.vendor_id || null,
      };
    } catch {
      req.user = { id: supabasePayload.sub, role: 'OPERATOR', email: supabasePayload.email || '' };
    }
    return next();
  }

  return res.status(401).json({
    success: false,
    error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' },
  });
}

export function authorize(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Role '${user.role}' is not permitted to perform this action` },
      });
    }
    next();
  };
}

export function issueJwt(payload: { sub: string; role: string; email: string; vendor_id?: string | null }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 8 * 3600,
  })).toString('base64url');
  const signingInput = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', config.authSecret).update(signingInput).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function captureRawBody(req: Request, _res: Response, buf: Buffer) {
  req.rawBody = buf.toString('utf8');
}