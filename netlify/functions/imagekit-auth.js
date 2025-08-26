// netlify/functions/imagekit-auth.js
const crypto = require('crypto');

function parseAllowlist() {
  // Comma-separated list of allowed origins, e.g.:
  // https://yourapp.netlify.app,https://www.yourdomain.com,http://localhost:5173
  const raw = process.env.CORS_ORIGINS || '';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function wildcardToRegex(pattern) {
  // Supports patterns like "https://*.example.com"
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function isOriginAllowed(origin, allowlist) {
  if (!origin) return true; // server-to-server or same-origin (no Origin header)
  try {
    const test = origin; // include scheme + host (and port)
    return allowlist.some(allowed => {
      if (allowed.includes('*')) return wildcardToRegex(allowed).test(test);
      return allowed === test;
    });
  } catch {
    return false;
  }
}

function corsHeaders(origin, allowlist) {
  const base = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  if (origin && isOriginAllowed(origin, allowlist)) {
    return { ...base, 'Access-Control-Allow-Origin': origin };
  }
  return base;
}

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowlist = parseAllowlist();
  const headers = corsHeaders(origin, allowlist);

  // Require explicit allowlist for browsers
  if ((method === 'GET' || method === 'POST' || method === 'OPTIONS') && !isOriginAllowed(origin, allowlist)) {
    // If no Origin header at all, we allow (server-to-server); otherwise block
    if (origin) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'CORS origin not allowed' }) };
    }
  }

  // Handle preflight quickly
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (method !== 'GET' && method !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    // Don’t leak config details
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  // Short-lived auth (configurable, clamped 30–600s)
  const ttlSec = (() => {
    const n = parseInt(process.env.IK_AUTH_TTL || '120', 10);
    return Math.min(Math.max(isNaN(n) ? 120 : n, 30), 600);
  })();

  try {
    const token = crypto.randomBytes(32).toString('hex'); // 64-char token
    const expire = Math.floor(Date.now() / 1000) + ttlSec;
    const signature = crypto
      .createHmac('sha1', privateKey)
      .update(token + expire.toString())
      .digest('hex');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token, expire, signature }),
    };
  } catch {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
