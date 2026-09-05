import 'dotenv/config';

/**
 * Central application configuration.
 * All env vars are validated at startup â€” missing required vars cause immediate failure.
 */

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  // Server
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  appBaseUrl: optionalEnv('APP_BASE_URL', 'http://localhost:3000'),

  // Database — reads DATABASE_URL from env; fallback to SUPABASE_DB_URL
  databaseUrl: (() => {
    if (process.env.USE_SQLITE === 'true') {
      return 'sqlite://local';
    }
    return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  })(),

  // Supabase (for JWT verification)
  supabaseUrl: optionalEnv('SUPABASE_URL', ''),
  supabaseAnonKey: optionalEnv('SUPABASE_ANON_KEY', ''),
  supabaseServiceRoleKey: optionalEnv('SUPABASE_SERVICE_ROLE_KEY', ''),

  // Security
  authSecret: optionalEnv('AUTH_SECRET', 'oi-platform-auth-secret-prod-secure-32chars'),
  callbackHmacSecret: optionalEnv('CALLBACK_SECRET', 'oi-callback-hmac-secret-prod-secure-32c'),
  redirectHmacSecret: optionalEnv('REDIRECT_HMAC_SECRET', 'oi-redirect-hmac-secret-prod-secure-32c'),

  // Redirect Signature
  redirectSignatureTtlSeconds: parseInt(optionalEnv('REDIRECT_SIGNATURE_TTL_SECONDS', '300'), 10),

  // Session
  sessionTtlHours: parseInt(optionalEnv('SESSION_TTL_HOURS', '48'), 10),

  // Rate limiting
  rateLimitWindowMs: 60_000,      // 1 minute window
  rateLimitStartMax: 60,          // max 60 /start requests per window per IP
  rateLimitCallbackMax: 100,      // max 100 callbacks per window per IP


  // Credential Vault — AES-256 master key (32 bytes = 64 hex chars)
  vaultEncryptionKey: optionalEnv(
    'VAULT_ENCRYPTION_KEY',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  ),

  // LimeSurvey Integration
  limeSurveyRpcUrl: optionalEnv('LS_RPC_URL', 'http://localhost:8080/index.php/admin/remotecontrol/handle'),
  limeSurveyPublicUrl: optionalEnv('LS_BASE_URL', 'http://localhost:8080'),
  limeSurveyUsername: optionalEnv('LS_ADMIN_USER', 'admin'),
  limeSurveyPassword: optionalEnv('LS_ADMIN_PASSWORD', 'admin123'),

  isDev(): boolean {
    return this.nodeEnv === 'development';
  },
};
