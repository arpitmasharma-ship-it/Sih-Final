function getPagination(query, defaults = {}) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(
    defaults.maxLimit || 100,
    Math.max(1, parseInt(query.limit || String(defaults.limit || 10), 10) || 10)
  );
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { getPagination };
