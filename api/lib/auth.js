// api/lib/auth.js
// Session management, password hashing, OTP utilities

import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-change-this';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ─────────────────────────────────────────────
// PASSWORD UTILITIES
// ─────────────────────────────────────────────

/**
 * Hash a password using SHA-256 with a random salt.
 * Returns a string in the format: salt:hash
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash.
 */
export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const attempt = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
}

// ─────────────────────────────────────────────
// SESSION TOKENS
// ─────────────────────────────────────────────

/**
 * Create a signed session token containing user info.
 * Format: base64(payload).base64(hmac_signature)
 */
export function createSessionToken(user) {
  const payload = {
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    name: user.name,
    iat: Date.now(),
    exp: Date.now() + SESSION_DURATION_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verify and decode a session token.
 * Returns the payload or null if invalid/expired.
 */
export function verifySessionToken(token) {
  if (!token) return null;
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;

    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract session from incoming request cookies.
 */
export function getSessionFromRequest(req) {
  const cookieHeader = req.headers?.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  return verifySessionToken(cookies['4np_session']);
}

/**
 * Build a Set-Cookie header string for session.
 */
export function buildSessionCookie(token) {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = SESSION_DURATION_MS / 1000;
  return [
    `4np_session=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    isProd ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

/**
 * Build a cookie header to clear the session.
 */
export function clearSessionCookie() {
  return '4np_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict';
}

// ─────────────────────────────────────────────
// OTP UTILITIES
// ─────────────────────────────────────────────

/**
 * Generate a 6-digit OTP code.
 */
export function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Hash an OTP for safe storage.
 */
export function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp + SESSION_SECRET).digest('hex');
}

/**
 * Verify an OTP against its stored hash.
 */
export function verifyOTP(otp, storedHash) {
  const attempt = crypto.createHash('sha256').update(otp + SESSION_SECRET).digest('hex');
  return attempt === storedHash;
}

/**
 * Calculate OTP expiry timestamp.
 */
export function otpExpiresAt() {
  return new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
}

// ─────────────────────────────────────────────
// PERMISSION MATRIX
// ─────────────────────────────────────────────

export const ROLES = {
  admin: 'admin',
  manager: 'manager',
  cashier: 'cashier',
  stock_manager: 'stock_manager',
  technician: 'technician',
};

const PERMISSIONS = {
  // Users module
  'users.view': ['admin'],
  'users.create': ['admin'],
  'users.edit': ['admin'],
  'users.delete': ['admin'],

  // Products
  'products.view': ['admin', 'manager', 'cashier', 'stock_manager'],
  'products.create': ['admin', 'manager', 'stock_manager'],
  'products.edit': ['admin', 'manager', 'stock_manager'],
  'products.delete': ['admin', 'manager'],

  // Categories / Brands
  'categories.manage': ['admin', 'manager', 'stock_manager'],
  'brands.manage': ['admin', 'manager', 'stock_manager'],

  // Inventory
  'inventory.view': ['admin', 'manager', 'cashier', 'stock_manager'],
  'inventory.adjust': ['admin', 'manager', 'stock_manager'],

  // POS / Sales
  'sales.create': ['admin', 'manager', 'cashier'],
  'sales.view': ['admin', 'manager', 'cashier'],
  'sales.discount': ['admin', 'manager'], // Apply discounts beyond threshold
  'sales.cancel': ['admin', 'manager'],
  'sales.return': ['admin', 'manager', 'cashier'],

  // Purchases
  'purchases.view': ['admin', 'manager', 'stock_manager'],
  'purchases.create': ['admin', 'manager', 'stock_manager'],
  'purchases.edit': ['admin', 'manager'],
  'purchases.delete': ['admin'],

  // Customers
  'customers.view': ['admin', 'manager', 'cashier'],
  'customers.create': ['admin', 'manager', 'cashier'],
  'customers.edit': ['admin', 'manager', 'cashier'],
  'customers.delete': ['admin', 'manager'],

  // Suppliers
  'suppliers.view': ['admin', 'manager', 'stock_manager'],
  'suppliers.manage': ['admin', 'manager'],

  // Payments
  'payments.view': ['admin', 'manager', 'cashier'],
  'payments.create': ['admin', 'manager', 'cashier'],
  'payments.delete': ['admin'],

  // Expenses
  'expenses.view': ['admin', 'manager'],
  'expenses.create': ['admin', 'manager'],
  'expenses.delete': ['admin'],

  // Reports
  'reports.view': ['admin', 'manager'],
  'reports.export': ['admin', 'manager'],

  // Warranties
  'warranties.view': ['admin', 'manager', 'cashier', 'technician'],
  'warranties.manage': ['admin', 'manager', 'technician'],

  // Repairs
  'repairs.view': ['admin', 'manager', 'cashier', 'technician'],
  'repairs.create': ['admin', 'manager', 'cashier'],
  'repairs.update': ['admin', 'manager', 'technician'],
  'repairs.delete': ['admin'],

  // Settings
  'settings.view': ['admin', 'manager'],
  'settings.edit': ['admin'],

  // Activity logs
  'logs.view': ['admin'],
};

/**
 * Check if a role has a given permission.
 */
export function hasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Middleware-style function to require auth and optionally check permission.
 * Returns { user } on success, throws on failure.
 */
export function requireAuth(req, permission = null) {
  const session = getSessionFromRequest(req);
  if (!session) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  if (permission && !hasPermission(session.role, permission)) {
    const err = new Error('Insufficient permissions');
    err.statusCode = 403;
    throw err;
  }
  return { user: session };
}
