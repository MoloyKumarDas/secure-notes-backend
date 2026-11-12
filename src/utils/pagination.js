const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function getPagination(query) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

function buildMeta(total, page, limit) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = { getPagination, buildMeta };
