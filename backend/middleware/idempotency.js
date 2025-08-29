const IdempotencyKey = require("../models/IdempotencyKey");

async function useIdempotency(req, res, next) {
  try {
    const key = req.headers["idempotency-key"];
    if (!key) return next();

    const found = await IdempotencyKey.findOne({ key });
    if (found) return res.json(found.result);

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      try { await IdempotencyKey.create({ key, result: body }); } catch (e) { console.error(e); }
      return originalJson(body);
    };

    next();
  } catch (err) { next(err); }
}

module.exports = { useIdempotency };
