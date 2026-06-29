// services/mission-api/src/operator/response.js

// Standardized JSON response helpers for operator API

export function operatorSuccess(res, payload = {}, status = 200) {
  return res.status(status).json({ ok: true, ...payload });
}

export function operatorError(res, code = 'ERROR', message = 'An error occurred', status = 400) {
  return res.status(status).json({ ok: false, error: { code, message } });
}
