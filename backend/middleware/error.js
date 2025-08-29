// middleware/error.js

/**
 * Optional 404 "not found" handler.
 * Put this BEFORE errorHandler in your app, AFTER all routes.
 * app.use(notFound);
 */
function notFound(req, res, _next) {
  res.status(404).json({
    error: {
      message: "Route not found",
      path: req.originalUrl,
      method: req.method,
    },
  });
}

/**
 * Centralized error handler.
 * Usage order in app:
 *   app.use(celebrateErrors()); // from "celebrate"
 *   app.use(errorHandler);
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isProd = process.env.NODE_ENV === "production";
  const traceId = req.headers["x-request-id"] || undefined;

  // Default response scaffold
  let status = err.status || err.statusCode || 500;
  const payload = {
    error: {
      message: err.message || "Internal Server Error",
      code: normalizeCode(err),
      details: undefined,
      traceId,
    },
  };

  // ---------- Known error types ----------

  // Body parser / JSON syntax error
  // Express reports this as SyntaxError with "body" in err
  if (err instanceof SyntaxError && "body" in err) {
    status = 400;
    payload.error.message = "Invalid JSON payload";
  }

  // Celebrate/Joi validation errors (celebrateErrors() already formats many)
  // But in case something bubbles up:
  if (err.joi || err.isJoi || err.details?.body || err.details?.query || err.details?.params) {
    status = 400;
    const details = (err.details?.body || err.details?.query || err.details?.params || err.details || [])
      .map?.((d) => ({ path: d.path?.join?.(".") || d.path, message: d.message })) || undefined;
    payload.error.message = "Validation failed";
    payload.error.details = details;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    status = 400;
    payload.error.message = "Validation failed";
    payload.error.details = Object.entries(err.errors).map(([field, e]) => ({
      path: field,
      message: e.message,
    }));
  }

  // Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === "CastError") {
    status = 400;
    payload.error.message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongo duplicate key (E11000)
  if (err.code === 11000 || err.code === "11000") {
    status = 409;
    payload.error.message = "Duplicate value";
    payload.error.details = Object.keys(err.keyValue || {}).map((k) => ({
      path: k,
      message: `Duplicate ${k}: ${err.keyValue[k]}`,
    }));
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    status = 401;
    payload.error.message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    status = 401;
    payload.error.message = "Token expired";
  }

  // Rate limit (express-rate-limit)
  if (err.status === 429 || err.name === "RateLimitError") {
    status = 429;
    payload.error.message = "Too many requests";
  }

  // Allow explicit override via err.status/err.statusCode set earlier
  payload.error.status = status;

  // Only include a stack in non-production
  if (!isProd) {
    payload.error.stack = err.stack;
  }

  // Log server-side (avoid leaking sensitive info to client)
  // You can swap console.error with a proper logger (e.g., pino, winston)
  console.error(`[${new Date().toISOString()}]`, {
    status,
    message: err.message,
    code: payload.error.code,
    path: req.originalUrl,
    method: req.method,
    traceId,
    stack: err.stack,
  });

  return res.status(status).json(payload);
}

// Helper to standardize error codes
function normalizeCode(err) {
  if (err.code && typeof err.code === "string") return err.code;
  if (err.code && typeof err.code === "number") return `E_${err.code}`;
  if (err.name === "ValidationError") return "VALIDATION_ERROR";
  if (err.name === "CastError") return "CAST_ERROR";
  if (err.name === "JsonWebTokenError") return "JWT_ERROR";
  if (err.name === "TokenExpiredError") return "JWT_EXPIRED";
  if (err.code === 11000 || err.code === "11000") return "DUPLICATE_KEY";
  if (err.name === "RateLimitError") return "RATE_LIMIT";
  if (err.joi || err.isJoi) return "JOI_VALIDATION_ERROR";
  return "INTERNAL_ERROR";
}

module.exports = {
  notFound,
  errorHandler,
};
