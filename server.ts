// DevMeDoAnDrOiD
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

if (process.env.TRUST_PROXY === 'true' || isProd) {
  app.set('trust proxy', 1);
}

function getClientIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Firebase project used to verify citizen identity tokens server-side.
let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'shoha-one';
let firebaseClientId = process.env.FIREBASE_OAUTH_CLIENT_ID || '';
try {
  const cfgPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    firebaseProjectId = process.env.FIREBASE_PROJECT_ID || cfg.projectId || firebaseProjectId;
    firebaseClientId = process.env.FIREBASE_OAUTH_CLIENT_ID || cfg.oAuthClientId || '';
  }
} catch (err) {
  console.warn('Unable to read local firebase config overrides', err);
}

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // API responses may contain session or user data; never let browsers or
  // intermediary proxies cache them.
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
  }

  // Content Security Policy is applied in production only because the Vite
  // development server relies on inline scripts and websocket connections.
  if (isProd) {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.googleapis.com https://*.googleusercontent.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com",
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
      "worker-src 'self' blob:"
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);
  }

  // Same-origin guard for state-changing API calls (defense-in-depth; the API
  // does not use cookies, but this blocks cross-site form/fetch abuse).
  if (req.path.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        const requestHost = req.headers.host;
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
          .split(',')
          .map(o => o.trim())
          .filter(Boolean);
        const isAllowed =
          originHost === requestHost ||
          allowedOrigins.some(o => {
            try { return new URL(o).host === originHost; } catch { return o === origin; }
          });
        if (!isAllowed) {
          return res.status(403).json({ error: 'طلب غير مصرح به من مصدر خارجي' });
        }
      } catch {
        return res.status(403).json({ error: 'مصدر الطلب غير صالح' });
      }
    }
  }

  next();
});

app.use(express.json({ limit: '5mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'Shaha Directory Server',
    time: new Date().toISOString()
  });
});

// In-Memory Rate Limiter for Login Protection
interface RateLimitRecord {
  count: number;
  blockedUntil: number;
}
const loginRateLimitMap = new Map<string, RateLimitRecord>();

function checkLoginRateLimit(ip: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip);
  if (!record) return { allowed: true };

  if (record.blockedUntil > now) {
    const remaining = Math.ceil((record.blockedUntil - now) / 60000);
    return { allowed: false, waitMinutes: remaining };
  }

  // Reset if block expired
  if (record.blockedUntil > 0 && record.blockedUntil <= now) {
    loginRateLimitMap.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedLogin(ip: string) {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip) || { count: 0, blockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000; // block for 15 minutes
  }
  loginRateLimitMap.set(ip, record);
}

function recordSuccessfulLogin(ip: string) {
  loginRateLimitMap.delete(ip);
}

// Periodically drop expired login limiter records so the map cannot grow
// without bound on long-running processes.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginRateLimitMap.entries()) {
    if (record.blockedUntil > 0 && record.blockedUntil <= now) {
      loginRateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref?.();

// Generic fixed-window rate limiter for public write endpoints.
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    if (rateLimitBuckets.size > 10000) {
      for (const [k, b] of rateLimitBuckets.entries()) {
        if (b.resetAt <= now) rateLimitBuckets.delete(k);
      }
      if (rateLimitBuckets.size > 10000) rateLimitBuckets.clear();
    }
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: `تم تجاوز عدد الطلبات المسموح به. يرجى المحاولة بعد ${Math.ceil(retryAfter / 60)} دقيقة.`
      });
    }
    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

// ---------------------------------------------------------------------------
// Firebase ID token verification (server-side)
// Uses Google's tokeninfo endpoint so the signature, audience, issuer and
// expiry are validated by Google. Never trust an email sent by the client.
// ---------------------------------------------------------------------------
interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name?: string;
}

const verifiedTokenCache = new Map<string, { user: VerifiedFirebaseUser; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  if (certsExpiresAt > Date.now() && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(FIREBASE_CERTS_URL, { signal: AbortSignal.timeout(6000) });
  if (!resp.ok) {
    if (Object.keys(cachedCerts).length > 0) return cachedCerts;
    throw new Error(`Failed to fetch Firebase certs: ${resp.status}`);
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await resp.json()) as Record<string, string>;
  certsExpiresAt = Date.now() + Math.max(60, maxAgeSec) * 1000;
  return cachedCerts;
}

function decodeBase64UrlJson<T>(segment: string): T | null {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8')) as T;
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(idToken?: string): Promise<VerifiedFirebaseUser | null> {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 4096) return null;

  const tokenDigest = crypto.createHash('sha256').update(idToken).digest('hex');
  const cached = verifiedTokenCache.get(tokenDigest);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    user_id?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    exp?: number;
    iat?: number;
    auth_time?: number;
  }>(payloadB64);

  if (!header || !payload) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${firebaseProjectId}`;

  if (payload.iss === expectedIssuer && header.alg === 'RS256' && header.kid) {
    try {
      const certs = await getFirebasePublicCerts();
      let cert = certs[header.kid];
      if (!cert) {
        certsExpiresAt = 0;
        const refreshed = await getFirebasePublicCerts();
        cert = refreshed[header.kid];
      }
      if (!cert) return null;

      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(`${headerB64}.${payloadB64}`);
      verifier.end();
      const signatureValid = verifier.verify(cert, Buffer.from(signatureB64, 'base64url'));
      if (!signatureValid) return null;

      const audienceOk = payload.aud === firebaseProjectId;
      const expOk = typeof payload.exp === 'number' && payload.exp > nowSec;
      const iatOk = typeof payload.iat === 'number' && payload.iat <= nowSec + 300;
      const authTimeOk = payload.auth_time === undefined || (typeof payload.auth_time === 'number' && payload.auth_time <= nowSec + 300);
      const sub = payload.sub || payload.user_id;
      const subOk = typeof sub === 'string' && sub.length > 0 && sub.length <= 128;
      const emailOk = typeof payload.email === 'string' && payload.email.length > 0;
      const verifiedEmailOk = payload.email_verified === true || payload.email_verified === 'true';

      if (!audienceOk || !expOk || !iatOk || !authTimeOk || !subOk || !emailOk || !verifiedEmailOk) {
        return null;
      }

      const user: VerifiedFirebaseUser = {
        uid: sub,
        email: payload.email as string,
        name: payload.name
      };
      if (verifiedTokenCache.size > 500) verifiedTokenCache.clear();
      verifiedTokenCache.set(tokenDigest, {
        user,
        expiresAt: Math.min(Date.now() + TOKEN_CACHE_TTL_MS, (payload.exp as number) * 1000)
      });
      return user;
    } catch (err) {
      console.warn('Firebase JWT verification failed:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, string>;
    const audienceOk = data.aud === firebaseProjectId || (firebaseClientId && data.aud === firebaseClientId);
    const issuerOk =
      data.iss === 'https://accounts.google.com' ||
      data.iss === 'accounts.google.com' ||
      data.iss === expectedIssuer;
    const emailVerified = data.email_verified === 'true' || (data.email_verified as unknown) === true;
    const notExpired = Number(data.exp) * 1000 > Date.now();
    const uid = data.user_id || data.sub;

    if (!audienceOk || !issuerOk || !emailVerified || !notExpired || !uid || !data.email) {
      return null;
    }

    const user: VerifiedFirebaseUser = { uid, email: data.email, name: data.name };
    if (verifiedTokenCache.size > 500) verifiedTokenCache.clear();
    verifiedTokenCache.set(tokenDigest, { user, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
    return user;
  } catch (err) {
    console.warn('Firebase token verification failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

function extractFirebaseToken(req: express.Request): string | undefined {
  const headerToken = req.headers['x-firebase-id-token'];
  if (typeof headerToken === 'string' && headerToken) return headerToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const value = authHeader.slice(7);
    // Admin tokens are two base64url parts separated by a dot; Firebase ID
    // tokens are JWTs with three parts. Only treat JWTs as Firebase tokens.
    if (value.split('.').length === 3) return value;
  }
  return undefined;
}

// Secure Session Secret & Auth Storage
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET && isProd) {
  console.warn(
    'SECURITY WARNING: SESSION_SECRET is not set. A random secret was generated; admin sessions will be invalidated on every restart.'
  );
}
const AUTH_FILE = path.join(__dirname, '.admin_auth.json');
const AUDIT_FILE = path.join(__dirname, '.audit_logs.json');
const USERS_FILE = path.join(__dirname, '.users.json');
const ADMIN_MEMBERS_FILE = path.join(__dirname, '.admin_members.json');
const LISTINGS_STORE_FILE = path.join(__dirname, '.listings_store.json');

const OWNER_EMAIL = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
if (isProd && !OWNER_EMAIL) {
  console.error('OWNER_EMAIL is required in production. Refusing to start.');
  process.exit(1);
}

const ALL_PERMISSIONS = [
  'manage_listings',
  'manage_categories',
  'manage_requests',
  'manage_reports',
  'manage_blood',
  'manage_charity',
  'manage_emergency',
  'manage_users',
  'manage_admins',
  'manage_settings',
  'manage_ads',
  'manage_badges',
  'manage_reviews',
  'manage_aid'
];

interface AdminAuthStore {
  salt: string;
  hash: string;
  isFirstLogin: boolean;
  updatedAt: string;
}

interface AuditRecord {
  id: string;
  action: string;
  adminUser: string;
  target?: string;
  timestamp: string;
  details?: string;
}

interface UserRecordStore {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  role: 'user' | 'admin' | 'owner';
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedUntil?: string; // ISO string or 'permanent'
  createdAt: string;
  lastLoginAt?: string;
}

interface AdminMemberStore {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'moderator';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastActive?: string;
}

// Password hashing helpers
function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, generatedSalt, 100000, 64, 'sha512');
  return {
    salt: generatedSalt,
    hash: derivedKey.toString('hex')
  };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  const derivedHex = Buffer.from(derivedKey.toString('hex'));
  const stored = Buffer.from(storedHash);
  if (derivedHex.length !== stored.length) return false;
  return crypto.timingSafeEqual(derivedHex, stored);
}

// Auth Store
function getAuthStore(): AdminAuthStore {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = fs.readFileSync(AUTH_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading auth file, reinitializing', err);
  }

  let initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!initialPassword) {
    if (isProd) {
      // Never ship a hard-coded production password. Generate a one-time
      // password and print it once so the owner can sign in and rotate it.
      initialPassword = crypto.randomBytes(12).toString('base64url');
      console.warn(
        'SECURITY: INITIAL_ADMIN_PASSWORD was not set. Generated one-time admin password:',
        initialPassword,
        '— change it immediately after the first login.'
      );
    } else {
      initialPassword = crypto.randomBytes(12).toString('base64url');
      console.warn('DEV ONLY: generated one-time admin password:', initialPassword);
    }
  }
  if (process.env.INITIAL_ADMIN_PASSWORD && initialPassword.length < 8) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be at least 8 characters long.');
  }
  const { salt, hash } = hashPassword(initialPassword);
  const initialStore: AdminAuthStore = {
    salt,
    hash,
    isFirstLogin: true,
    updatedAt: new Date().toISOString()
  };
  saveAuthStore(initialStore);
  return initialStore;
}

function saveAuthStore(store: AdminAuthStore) {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save auth store', err);
  }
}

let usersStoreCache: UserRecordStore[] | null = null;
function getUsersStore(): UserRecordStore[] {
  if (usersStoreCache) return usersStoreCache;
  try {
    if (fs.existsSync(USERS_FILE)) {
      usersStoreCache = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      return usersStoreCache!;
    }
  } catch (err) {
    console.error('Failed to read users file', err);
  }
  usersStoreCache = [];
  return usersStoreCache;
}

function saveUsersStore(users: UserRecordStore[]) {
  usersStoreCache = users;
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save users store', err);
  }
}

let adminMembersCache: AdminMemberStore[] | null = null;
function getAdminMembersStore(): AdminMemberStore[] {
  if (adminMembersCache) return adminMembersCache;
  try {
    if (fs.existsSync(ADMIN_MEMBERS_FILE)) {
      adminMembersCache = JSON.parse(fs.readFileSync(ADMIN_MEMBERS_FILE, 'utf-8'));
      return adminMembersCache!;
    }
  } catch (err) {
    console.error('Failed to read admin members file', err);
  }

  const defaultOwner: AdminMemberStore = {
    id: 'owner_shaha',
    email: OWNER_EMAIL,
    name: 'المهندس المشرف (Owner)',
    role: 'owner',
    permissions: ALL_PERMISSIONS,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const initialList = [defaultOwner];
  saveAdminMembersStore(initialList);
  return initialList;
}

function saveAdminMembersStore(members: AdminMemberStore[]) {
  const ownerIndex = members.findIndex(m => m.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
  if (ownerIndex === -1) {
    members.unshift({
      id: 'owner_shaha',
      email: OWNER_EMAIL,
      name: 'المهندس المشرف (Owner)',
      role: 'owner',
      permissions: ALL_PERMISSIONS,
      isActive: true,
      createdAt: new Date().toISOString()
    });
  } else {
    members[ownerIndex].role = 'owner';
    members[ownerIndex].isActive = true;
    members[ownerIndex].permissions = ALL_PERMISSIONS;
  }

  adminMembersCache = members;
  try {
    fs.writeFileSync(ADMIN_MEMBERS_FILE, JSON.stringify(members, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save admin members store', err);
  }
}

// Audit logs storage
function getAuditLogs(): AuditRecord[] {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const data = fs.readFileSync(AUDIT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // empty
  }
  return [];
}

function appendAuditLog(record: Omit<AuditRecord, 'id' | 'timestamp'>) {
  const logs = getAuditLogs();
  const entry: AuditRecord = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    ...record
  };
  logs.unshift(entry);
  if (logs.length > 500) logs.pop();
  try {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save audit log', err);
  }
}

// Token creation & verification
interface TokenPayload {
  role: 'owner' | 'super_admin' | 'admin' | 'moderator';
  email: string;
  name: string;
  permissions: string[];
  exp: number;
}

function generateAdminToken(email: string, role: TokenPayload['role'] = 'admin', name = 'المشرف', permissions: string[] = ALL_PERMISSIONS): string {
  const payload: TokenPayload = {
    role,
    email,
    name,
    permissions,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyAdminToken(token?: string): { valid: boolean; payload?: TokenPayload } {
  if (!token) return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [data, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false };
  }

  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

// Authentication & Authorization middlewares
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const verification = verifyAdminToken(token);

  if (!verification.valid || !verification.payload) {
    return res.status(401).json({ error: 'غير مصرح لك بالوصول. يلزم تسجيل دخول المشرف.' });
  }

  (req as any).adminSession = verification.payload;
  (req as any).adminEmail = verification.payload.email;
  next();
}

function requirePermission(requiredPermission: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session: TokenPayload = (req as any).adminSession;
    if (!session) {
      return res.status(401).json({ error: 'جلسة المشرف غير صالحة' });
    }

    // Owner and Super Admin have unrestricted permissions
    if (session.role === 'owner' || session.role === 'super_admin') {
      return next();
    }

    if (session.permissions && session.permissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      error: `ليس لديك صلاحية لإجراء هذه العملية (${requiredPermission}). راجع مالك النظام.`
    });
  };
}

function requireOwner(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session: TokenPayload = (req as any).adminSession;
  if (!session || (session.role !== 'owner' && session.email.toLowerCase() !== OWNER_EMAIL.toLowerCase())) {
    return res.status(403).json({ error: 'هذه العملية محصورة على مالك النظام الرئيسي (Owner) فقط.' });
  }
  next();
}

// ==================== API Endpoints ====================

// 1. Admin login with password
app.post('/api/admin/login', (req, res) => {
  const clientIp = getClientIp(req);

  const rateCheck = checkLoginRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `تم تجاوز الحد الأقصى للمحاولات الخاطئة. يرجى الانتظار ${rateCheck.waitMinutes} دقيقة قبل المحاولة مجدداً.`
    });
  }

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'يرجى إدخال كلمة المرور' });
  }
  if (password.length > 200) {
    return res.status(400).json({ error: 'كلمة المرور غير صالحة' });
  }

  const store = getAuthStore();
  const isValid = verifyPassword(password, store.salt, store.hash);

  if (!isValid) {
    recordFailedLogin(clientIp);
    appendAuditLog({
      action: 'LOGIN_FAILED',
      adminUser: 'مجهول',
      details: `محاولة تسجيل دخول فاشلة من IP: ${clientIp}`
    });
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }

  recordSuccessfulLogin(clientIp);
  const token = generateAdminToken('admin@shaha-directory.eg', 'super_admin', 'مدير النظام الرئيسي', ALL_PERMISSIONS);
  appendAuditLog({
    action: 'LOGIN_SUCCESS',
    adminUser: 'مدير النظام الرئيسي',
    details: 'تسجيل دخول ناجح للوحة الإدارة عبر كلمة المرور'
  });

  return res.json({
    success: true,
    token,
    mustChangePassword: store.isFirstLogin,
    admin: {
      role: 'super_admin',
      name: 'مشرف دليل شها',
      email: 'admin@shaha-directory.eg',
      permissions: ALL_PERMISSIONS
    }
  });
});

// 2. Firebase Auth admin verification & RBAC check.
// The client must send a real Firebase ID token; the identity is derived from
// Google's verified token payload, never from a caller-supplied email.
app.post(
  '/api/admin/google-verify',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: 'google-verify' }),
  async (req, res) => {
    const verified = await verifyFirebaseIdToken(extractFirebaseToken(req));
    if (!verified) {
      return res.status(401).json({ error: 'تعذر التحقق من هوية الحساب. يرجى تسجيل الدخول من جديد.' });
    }

    const normalizedEmail = verified.email.toLowerCase().trim();
    const members = getAdminMembersStore();
    const member = members.find(m => m.email.toLowerCase() === normalizedEmail);

    // Check if owner (email comes from the verified token)
    if (normalizedEmail === OWNER_EMAIL.toLowerCase()) {
      const token = generateAdminToken(
        verified.email,
        'owner',
        verified.name || 'مالك النظام',
        ALL_PERMISSIONS
      );
      appendAuditLog({
        action: 'OWNER_LOGIN',
        adminUser: verified.email,
        details: `تسجيل دخول مالك النظام الرئيسي (${verified.uid})`
      });
      return res.json({
        success: true,
        token,
        mustChangePassword: false,
        admin: {
          role: 'owner',
          name: verified.name || 'المهندس المشرف',
          email: verified.email,
          permissions: ALL_PERMISSIONS
        }
      });
    }

    // Check if registered active moderator
    if (member && member.isActive) {
      const role = member.role || 'moderator';
      const permissions = member.permissions || [];
      const token = generateAdminToken(verified.email, role, member.name, permissions);
      appendAuditLog({
        action: 'MODERATOR_LOGIN',
        adminUser: verified.email,
        details: `تسجيل دخول مشرف (${member.name} - ${role})`
      });
      return res.json({
        success: true,
        token,
        mustChangePassword: false,
        admin: {
          role,
          name: member.name,
          email: verified.email,
          permissions
        }
      });
    }

    return res.status(403).json({ error: 'هذا الحساب ليس لديه صلاحيات إدارية على دليل شها' });
  }
);

// 3. Verify session
app.get('/api/admin/session', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const verification = verifyAdminToken(token);

  if (!verification.valid || !verification.payload) {
    return res.status(401).json({ valid: false });
  }

  const store = getAuthStore();
  return res.json({
    valid: true,
    email: verification.payload.email,
    role: verification.payload.role,
    name: verification.payload.name,
    permissions: verification.payload.permissions,
    mustChangePassword: verification.payload.role === 'super_admin' ? store.isFirstLogin : false
  });
});

// 4. Change admin password
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'يرجى تقديم كلمة المرور الحالية والجديدة' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 8 خانات' });
  }
  if (newPassword.length > 200 || typeof currentPassword !== 'string' || currentPassword.length > 200) {
    return res.status(400).json({ error: 'كلمة المرور غير صالحة' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'يجب أن تختلف كلمة المرور الجديدة عن الحالية' });
  }

  const store = getAuthStore();
  const isCurrentValid = verifyPassword(currentPassword, store.salt, store.hash);

  if (!isCurrentValid) {
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }

  const { salt, hash } = hashPassword(newPassword);
  store.salt = salt;
  store.hash = hash;
  store.isFirstLogin = false;
  store.updatedAt = new Date().toISOString();
  saveAuthStore(store);

  appendAuditLog({
    action: 'PASSWORD_CHANGED',
    adminUser: (req as any).adminEmail || 'admin',
    details: 'تم تغيير كلمة المرور الإدارية بنجاح'
  });

  return res.json({ success: true, message: 'تم تحديث كلمة المرور الإدارية بنجاح' });
});

// 5. User Synchronization (requires a verified Firebase ID token)
app.post(
  '/api/users/sync',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 60, keyPrefix: 'users-sync' }),
  async (req, res) => {
    const verified = await verifyFirebaseIdToken(extractFirebaseToken(req));
    if (!verified) {
      return res.status(401).json({ error: 'تعذر التحقق من هوية المستخدم' });
    }

    const { displayName, photoURL, phone } = req.body || {};
    const safeDisplayName =
      typeof displayName === 'string' ? displayName.trim().slice(0, 120) : '';
    const safePhotoURL =
      typeof photoURL === 'string' && /^https:\/\//i.test(photoURL) ? photoURL.slice(0, 500) : '';
    const safePhone =
      typeof phone === 'string' && /^[0-9+\-\s]{6,20}$/.test(phone.trim()) ? phone.trim() : '';

    const users = getUsersStore();
    let user = users.find(u => u.id === verified.uid || u.email.toLowerCase() === verified.email.toLowerCase());

    const now = new Date().toISOString();

    if (!user) {
      user = {
        id: verified.uid,
        email: verified.email,
        displayName: safeDisplayName || verified.name || 'مواطن من شها',
        photoURL: safePhotoURL,
        phone: safePhone,
        role: verified.email.toLowerCase() === OWNER_EMAIL.toLowerCase() ? 'owner' : 'user',
        isBanned: false,
        createdAt: now,
        lastLoginAt: now
      };
      users.push(user);
    } else {
      user.lastLoginAt = now;
      user.email = verified.email;
      if (safeDisplayName) user.displayName = safeDisplayName;
      if (safePhotoURL) user.photoURL = safePhotoURL;
      if (safePhone) user.phone = safePhone;
    }

    // Check ban expiry if set
    if (user.isBanned && user.bannedUntil && user.bannedUntil !== 'permanent') {
      if (new Date(user.bannedUntil).getTime() < Date.now()) {
        user.isBanned = false;
        user.banReason = undefined;
        user.bannedUntil = undefined;
      }
    }

    saveUsersStore(users);

    if (user.isBanned) {
      return res.status(403).json({
        error: user.banReason || 'تم إيقاف هذا الحساب من استخدام خدمات المنصة',
        isBanned: true,
        banReason: user.banReason,
        bannedUntil: user.bannedUntil
      });
    }

    return res.json({ success: true, user });
  }
);

// 6. Check own ban status (requires a verified Firebase ID token)
app.get('/api/users/check-status', async (req, res) => {
  const verified = await verifyFirebaseIdToken(extractFirebaseToken(req));
  if (!verified) {
    return res.status(401).json({ error: 'تعذر التحقق من هوية المستخدم' });
  }

  const users = getUsersStore();
  const user = users.find(u => u.id === verified.uid || u.email.toLowerCase() === verified.email.toLowerCase());

  if (!user) {
    return res.json({ isBanned: false });
  }

  // Auto-expire ban if time passed
  if (user.isBanned && user.bannedUntil && user.bannedUntil !== 'permanent') {
    if (new Date(user.bannedUntil).getTime() < Date.now()) {
      user.isBanned = false;
      saveUsersStore(users);
      return res.json({ isBanned: false });
    }
  }

  return res.json({
    isBanned: user.isBanned,
    banReason: user.banReason,
    bannedUntil: user.bannedUntil
  });
});

// 7. Admin: List all Users
app.get('/api/admin/users', requireAdmin, requirePermission('manage_users'), (req, res) => {
  const { search, status } = req.query;
  let users = getUsersStore();

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    users = users.filter(
      u =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q))
    );
  }

  if (status === 'banned') {
    users = users.filter(u => u.isBanned);
  } else if (status === 'active') {
    users = users.filter(u => !u.isBanned);
  }

  return res.json({ users });
});

// 8. Admin: Ban User
app.post('/api/admin/users/ban', requireAdmin, requirePermission('manage_users'), (req, res) => {
  const { userId, email, reason, durationDays } = req.body || {};
  if (!userId && !email) {
    return res.status(400).json({ error: 'معرف المستخدم أو البريد مطلوب' });
  }

  if (typeof email === 'string' && email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'لا يمكن حظر مالك النظام الرئيسي' });
  }

  const users = getUsersStore();
  const user = users.find(
    u =>
      (typeof userId === 'string' && u.id === userId) ||
      (typeof email === 'string' && u.email.toLowerCase() === email.toLowerCase().trim())
  );

  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  if (user.email.toLowerCase() === OWNER_EMAIL.toLowerCase() || user.role === 'owner') {
    return res.status(403).json({ error: 'لا يمكن حظر مالك النظام الرئيسي' });
  }

  const safeReason =
    typeof reason === 'string' && reason.trim()
      ? reason.trim().slice(0, 300)
      : 'مخالفة سياسات وقواعد دليل شها';
  const parsedDays = durationDays !== undefined ? Number(durationDays) : 0;
  if (durationDays !== undefined && (!Number.isFinite(parsedDays) || parsedDays < 0 || parsedDays > 3650)) {
    return res.status(400).json({ error: 'مدة الحظر غير صالحة' });
  }

  user.isBanned = true;
  user.banReason = safeReason;
  user.bannedAt = new Date().toISOString();

  if (parsedDays > 0) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + Math.round(parsedDays));
    user.bannedUntil = expiry.toISOString();
  } else {
    user.bannedUntil = 'permanent';
  }

  saveUsersStore(users);

  appendAuditLog({
    action: 'USER_BANNED',
    adminUser: (req as any).adminEmail || 'admin',
    target: user.email || user.displayName,
    details: `حظر المستخدم: ${safeReason} (المدة: ${parsedDays > 0 ? Math.round(parsedDays) + ' يوم' : 'دائم'})`
  });

  return res.json({ success: true, user });
});

// 9. Admin: Unban User
app.post('/api/admin/users/unban', requireAdmin, requirePermission('manage_users'), (req, res) => {
  const { userId, email } = req.body;
  const users = getUsersStore();
  const user = users.find(u => (userId && u.id === userId) || (email && u.email.toLowerCase() === email.toLowerCase()));

  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  user.isBanned = false;
  user.banReason = undefined;
  user.bannedAt = undefined;
  user.bannedUntil = undefined;
  saveUsersStore(users);

  appendAuditLog({
    action: 'USER_UNBANNED',
    adminUser: (req as any).adminEmail || 'admin',
    target: user.email || user.displayName,
    details: 'إلغاء حظر المستخدم واستعادة صلاحياته'
  });

  return res.json({ success: true, user });
});

// 10. Admin Members Management (RBAC) - List
app.get('/api/admin/members', requireAdmin, (req, res) => {
  const members = getAdminMembersStore();
  return res.json({ members });
});

app.post('/api/admin/members', requireAdmin, requireOwner, (req, res) => {
  const { email, name, role, permissions } = req.body || {};
  if (typeof email !== 'string' || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'الاسم والبريد الإلكتروني مطلوبان' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail) || normalizedEmail.length > 150) {
    return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صالحة' });
  }

  const members = getAdminMembersStore();
  const existing = members.find(m => m.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'هذا البريد مسجل بالفعل في فريق الإدارة' });
  }

  const filteredPermissions = Array.isArray(permissions)
    ? permissions.filter((p): p is string => typeof p === 'string' && ALL_PERMISSIONS.includes(p))
    : ['manage_listings', 'manage_requests'];

  const newMember: AdminMemberStore = {
    id: 'admin_' + Date.now(),
    email: normalizedEmail,
    name: name.trim().slice(0, 120),
    role: role === 'admin' ? 'admin' : 'moderator',
    permissions: filteredPermissions.length > 0 ? filteredPermissions : ['manage_listings'],
    isActive: true,
    createdAt: new Date().toISOString()
  };

  members.push(newMember);
  saveAdminMembersStore(members);

  appendAuditLog({
    action: 'ADMIN_MEMBER_ADDED',
    adminUser: (req as any).adminEmail || OWNER_EMAIL,
    target: newMember.email,
    details: `إضافة مشرف جديد (${newMember.name}) بصلاحيات: ${newMember.permissions.join(', ')}`
  });

  return res.json({ success: true, member: newMember });
});

app.put('/api/admin/members/:id', requireAdmin, requireOwner, (req, res) => {
  const { id } = req.params;
  const { name, role, permissions, isActive } = req.body || {};

  const members = getAdminMembersStore();
  const member = members.find(m => m.id === id);

  if (!member) {
    return res.status(404).json({ error: 'المشرف غير موجود' });
  }

  if (member.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'لا يمكن تعديل صلاحيات أو تعطيل حساب مالك النظام الرئيسي' });
  }

  if (typeof name === 'string' && name.trim()) member.name = name.trim().slice(0, 120);
  if (role === 'admin' || role === 'moderator') member.role = role;
  if (Array.isArray(permissions)) {
    member.permissions = permissions.filter((p): p is string => typeof p === 'string' && ALL_PERMISSIONS.includes(p));
  }
  if (typeof isActive === 'boolean') member.isActive = isActive;

  saveAdminMembersStore(members);

  appendAuditLog({
    action: 'ADMIN_MEMBER_UPDATED',
    adminUser: (req as any).adminEmail || OWNER_EMAIL,
    target: member.email,
    details: `تحديث بيانات المشرف (${member.name}) - الحالة: ${member.isActive ? 'نشط' : 'معطل'}`
  });

  return res.json({ success: true, member });
});

// 13. Owner Only: Delete moderator
app.delete('/api/admin/members/:id', requireAdmin, requireOwner, (req, res) => {
  const { id } = req.params;
  let members = getAdminMembersStore();
  const member = members.find(m => m.id === id);

  if (!member) {
    return res.status(404).json({ error: 'المشرف غير موجود' });
  }

  // Protect owner
  if (member.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'لا يمكن حذف حساب مالك النظام الرئيسي نهائياً' });
  }

  members = members.filter(m => m.id !== id);
  saveAdminMembersStore(members);

  appendAuditLog({
    action: 'ADMIN_MEMBER_DELETED',
    adminUser: (req as any).adminEmail || OWNER_EMAIL,
    target: member.email,
    details: `حذف المشرف (${member.name}) من النظام`
  });

  return res.json({ success: true });
});

// 14. Audit logs endpoint
app.get('/api/admin/audit-logs', requireAdmin, (_req, res) => {
  const logs = getAuditLogs();
  return res.json({ logs });
});

app.post('/api/admin/log-action', requireAdmin, (req, res) => {
  const { action, target, details } = req.body || {};
  if (typeof action !== 'string' || !action.trim()) {
    return res.status(400).json({ error: 'Action is required' });
  }

  appendAuditLog({
    action: action.trim().slice(0, 80),
    adminUser: (req as any).adminEmail || 'مشرف النظام',
    target: typeof target === 'string' ? target.trim().slice(0, 150) : undefined,
    details: typeof details === 'string' ? details.trim().slice(0, 500) : undefined
  });
  return res.json({ success: true });
});

// 16. Security audit status
app.get('/api/admin/security-status', requireAdmin, (_req, res) => {
  return res.json({
    encryption: {
      passwordHashing: 'PBKDF2-SHA512 (100,000 iterations)',
      sessionTokens: 'HMAC-SHA256 Signed with Cryptographic Salt',
      clientVault: 'AES-GCM 256-bit with PBKDF2 Key Derivation'
    },
    rateLimiting: {
      status: 'active',
      loginProtection: '5 failed attempts triggers 15-minute lockout',
      currentlyTrackedIps: loginRateLimitMap.size
    },
    database: {
      provider: 'Google Cloud Firestore',
      rulesEnforced: true,
      rolesProtected: ['admins', 'audit_logs', 'service_requests', 'reports', 'advertisements']
    },
    headers: {
      hsts: 'Enabled (max-age=31536000)',
      xFrameOptions: 'SAMEORIGIN',
      xContentTypeOptions: 'nosniff',
      xssProtection: '1; mode=block'
    }
  });
});

// 17. Persistent Listings Store Helpers & APIs
function getListingsStore(): any[] {
  try {
    if (fs.existsSync(LISTINGS_STORE_FILE)) {
      const data = fs.readFileSync(LISTINGS_STORE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read listings store', err);
  }
  return [];
}

function saveListingsStore(listings: any[]) {
  try {
    fs.writeFileSync(LISTINGS_STORE_FILE, JSON.stringify(listings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save listings store', err);
  }
}

// Get all server-persisted listings (hidden records are not exposed publicly)
app.get('/api/listings', (_req, res) => {
  const listings = getListingsStore().filter(l => l && l.status !== 'hidden');
  return res.json({ success: true, listings });
});

// Fields a non-admin listing owner is never allowed to change.
const OWNER_PROTECTED_LISTING_FIELDS = [
  'isVerified',
  'verificationBadges',
  'verificationHistory',
  'primaryBadgeId',
  'isFeatured',
  'qualityScore',
  'qualityIssues',
  'completenessLevel',
  'ownerUserId',
  'claimStatus',
  'status'
] as const;

// Save or update listing (admin token OR verified listing owner)
app.post(
  '/api/listings/save',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 120, keyPrefix: 'listings-save' }),
  async (req, res) => {
    const authHeader = req.headers.authorization;
    const adminToken =
      authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7).split('.').length === 2
        ? authHeader.slice(7)
        : undefined;
    const adminVerification = verifyAdminToken(adminToken);

    let verifiedOwnerUid: string | null = null;
    if (!adminVerification.valid) {
      const firebaseUser = await verifyFirebaseIdToken(extractFirebaseToken(req));
      if (!firebaseUser) {
        return res.status(401).json({ error: 'يلزم تسجيل الدخول لتعديل أو إضافة خدمة.' });
      }
      verifiedOwnerUid = firebaseUser.uid;
    } else {
      const session = adminVerification.payload;
      const isPrivileged = session?.role === 'owner' || session?.role === 'super_admin' || session?.permissions?.includes('manage_listings');
      if (!isPrivileged) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لإدارة الخدمات (manage_listings).' });
      }
    }

    const listing = req.body?.listing;
    if (!listing || typeof listing !== 'object' || !listing.id || !listing.name) {
      return res.status(400).json({ error: 'بيانات الخدمة غير صالحة أو الاسم مفقود' });
    }
    if (typeof listing.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(listing.id)) {
      return res.status(400).json({ error: 'معرف الخدمة غير صالح' });
    }
    if (typeof listing.name !== 'string' || listing.name.trim().length < 2 || listing.name.length > 150) {
      return res.status(400).json({ error: 'اسم الخدمة غير صالح' });
    }

    const store = getListingsStore();
    const existingIdx = store.findIndex(l => l.id === listing.id);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      const existing = store[existingIdx];

      if (!adminVerification.valid) {
        if (!existing.ownerUserId || existing.ownerUserId !== verifiedOwnerUid) {
          return res.status(403).json({ error: 'ليس لديك صلاحية لتعديل هذا الملف التعريفي' });
        }
      }

      const sanitized = { ...listing };
      if (!adminVerification.valid) {
        // Owners cannot escalate verification, ownership, or visibility.
        for (const field of OWNER_PROTECTED_LISTING_FIELDS) {
          if (field === 'ownerUserId' || field === 'claimStatus') {
            sanitized[field] = existing[field];
          } else {
            delete sanitized[field];
          }
        }
        sanitized.ownerUserId = existing.ownerUserId;
      }

      store[existingIdx] = {
        ...existing,
        ...sanitized,
        id: existing.id,
        updatedAt: now
      };
    } else {
      if (!adminVerification.valid) {
        if (!verifiedOwnerUid) {
          return res.status(403).json({ error: 'تعذر التحقق من ملكية الخدمة' });
        }
        listing.isVerified = false;
        listing.isFeatured = false;
        listing.ownerUserId = verifiedOwnerUid;
        listing.claimStatus = 'claimed';
        listing.status = 'active';
      }
      store.push({ ...listing, updatedAt: now });
    }

    saveListingsStore(store);

    const actor = adminVerification.valid
      ? adminVerification.payload?.email || 'admin'
      : `owner:${verifiedOwnerUid}`;
    appendAuditLog({
      action: existingIdx >= 0 ? 'UPDATE_LISTING' : 'CREATE_LISTING',
      adminUser: actor,
      target: listing.name,
      details: `حفظ بيانات الخدمة: ${listing.name}`
    });

    return res.json({ success: true, listing: store.find(l => l.id === listing.id) });
  }
);

app.delete('/api/listings/:id', requireAdmin, requirePermission('manage_listings'), (req, res) => {
  const id = req.params.id;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return res.status(400).json({ error: 'معرف الخدمة غير صالح' });
  }
  let store = getListingsStore();
  const target = store.find(l => l.id === id);
  store = store.filter(l => l.id !== id);
  saveListingsStore(store);

  appendAuditLog({
    action: 'DELETE_LISTING',
    adminUser: (req as any).adminEmail || 'admin',
    target: target?.name || id,
    details: `حذف الخدمة نهائياً: ${target?.name || id}`
  });

  return res.json({ success: true });
});

// Unknown API routes must not fall through to the SPA HTML response.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'المسار المطلوب غير موجود' });
});

// Mount Vite or static server
async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.resolve(__dirname, 'dist');
    app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '7d', immutable: true }));
    app.use(express.static(distPath, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Centralized error handler (registered after routes so it can catch them).
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (res.headersSent) return;
      const status = Number((err as any).status || (err as any).statusCode || 500);

      if (status >= 500) {
        console.error('Unhandled server error:', err);
      }

      res.status(status).json({
        error:
          status === 400
            ? 'صيغة الطلب غير صالحة'
            : status === 404
              ? 'المسار المطلوب غير موجود'
              : isProd
                ? 'حدث خطأ غير متوقع في الخادم'
                : err.message
      });
    }
  );

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Shaha Directory server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
