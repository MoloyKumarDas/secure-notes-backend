const httpError = require('./httpError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireString(value, field, { min = 1, max = 200 } = {}) {
  if (typeof value !== 'string') throw httpError(400, `${field} must be a string`);
  const v = value.trim();
  if (v.length < min) throw httpError(400, `${field} must be at least ${min} character(s)`);
  if (v.length > max) throw httpError(400, `${field} must be at most ${max} characters`);
  return v;
}

function requireEmail(value) {
  const v = requireString(value, 'email', { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(v)) throw httpError(400, 'email is not valid');
  return v;
}

function requirePassword(value) {
  if (typeof value !== 'string') throw httpError(400, 'password must be a string');
  if (value.length < 8) throw httpError(400, 'password must be at least 8 characters');
  if (value.length > 72) throw httpError(400, 'password must be at most 72 characters'); // bcrypt limit
  return value;
}

function normalizeInterests(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw httpError(400, 'interests must be an array of strings');
  if (value.length > 20) throw httpError(400, 'at most 20 interests allowed');
  const cleaned = value.map((i) => {
    if (typeof i !== 'string') throw httpError(400, 'interests must be an array of strings');
    return i.trim().toLowerCase();
  });
  if (cleaned.some((i) => !i || i.length > 50)) {
    throw httpError(400, 'each interest must be 1-50 characters');
  }
  return [...new Set(cleaned)];
}

function normalizeRole(value) {
  if (value === undefined) return undefined;
  if (value !== 'user' && value !== 'admin') throw httpError(400, 'role must be "user" or "admin"');
  return value;
}

module.exports = { requireString, requireEmail, requirePassword, normalizeInterests, normalizeRole };
