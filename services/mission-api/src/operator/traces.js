import { getTraceLinks, getTraceLink } from '@asc3nd/core/trace-links';
import { loadTenantContext } from './tenant-context.js';
import { operatorSuccess, operatorError } from './response.js';

export function listTraces(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { surface, runId } = req.query;
    const traces = getTraceLinks({ tenantId, surface: surface || undefined, runId: runId || undefined });
    return operatorSuccess(res, { traces, tenantId });
  } catch (e) {
    return operatorError(res, 'TRACES_ERROR', e.message, 500);
  }
}

export function getTrace(req, res) {
  try {
    const { tenantId } = loadTenantContext(req);
    const { id } = req.params;
    const trace = getTraceLink({ tenantId, id });
    if (!trace) return operatorError(res, 'NOT_FOUND', `Trace ${id} not found`, 404);
    return operatorSuccess(res, { trace });
  } catch (e) {
    return operatorError(res, 'TRACE_ERROR', e.message, 500);
  }
}
