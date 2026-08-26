function ok(res, data, { status = 200, message } = {}) {
  return res.status(status).json({ success: true, message, data });
}

function created(res, data, message = 'Created') {
  return ok(res, data, { status: 201, message });
}

function paginated(res, { items, page, limit, total }) {
  return res.status(200).json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

module.exports = { ok, created, paginated };
