import api from '../api';

const buildParams = (params = {}) => {
  const next = { ...params };
  Object.keys(next).forEach((key) => {
    if (next[key] === undefined || next[key] === null || next[key] === '') delete next[key];
  });
  return next;
};

const unwrapData = (response) => response?.data?.data ?? response?.data;

const unwrapEnvelope = (response) => response?.data ?? response;

const normalizeError = (error) => {
  const status = error?.response?.status;
  const payload = error?.response?.data;
  const data = payload?.data ?? payload;
  const code = payload?.code || payload?.error_code || data?.code || data?.error_code || (typeof payload?.error === 'string' ? payload.error : '');
  const message = payload?.message
    || payload?.error
    || data?.message
    || (data?.status ? `Recovery verification returned ${data.status}.` : '')
    || error?.message
    || 'Recovery request failed.';

  return {
    status,
    code: String(code || '').toUpperCase(),
    message: String(message),
    data,
    // A structured 404 from the recovery handler means a missing tenant-scoped
    // record, not that the recovery feature itself is unavailable.
    unavailable: status === 404 && !code && !payload?.error && !payload?.message,
    original: error,
  };
};

const call = async (request) => {
  try {
    const response = await request();
    return unwrapData(response);
  } catch (error) {
    throw normalizeError(error);
  }
};

const callEnvelope = async (request) => {
  try {
    return unwrapEnvelope(await request());
  } catch (error) {
    throw normalizeError(error);
  }
};

export const recoveryApi = {
  listIncidents: ({ status } = {}) => call(() => api.get('/dashboard/recovery/incidents', {
    params: buildParams({ status }),
  })),

  getIncident: ({ incidentId }) => call(() => api.get(`/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}`)),

  listCandidates: ({ incidentId }) => call(() => api.get(`/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}/candidates`)),

  runPreflight: ({ incidentId }) => call(() => api.post(`/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}/preflight`)),

  listVersions: ({ resource }) => call(() => api.get(`/dashboard/recovery/resources/${encodeURIComponent(resource)}/versions`)),

  // Recovery incidents keep the tampered payload protected. The tenant-scoped
  // audit-log endpoint supplies the current payload for the before-recovery UI.
  listAuditLogsByResource: ({ resource }) => call(() => api.get(`/dashboard/logs/by-resource/${encodeURIComponent(resource)}`)),

  listRequests: ({ status } = {}) => call(() => api.get('/dashboard/recovery/requests', {
    params: buildParams({ status }),
  })),

  listEvents: ({ page = 1, pageSize = 100, resultStatus, resource, includeLegacy = false } = {}) => callEnvelope(() => api.get('/dashboard/recovery/events', {
    params: buildParams({
      page,
      page_size: pageSize,
      result_status: resultStatus,
      resource,
      include_legacy: includeLegacy,
    }),
  })),

  getEvent: ({ eventId }) => call(() => api.get(`/dashboard/recovery/events/${encodeURIComponent(eventId)}`)),

  verifyEvent: ({ eventId }) => call(() => api.get(`/dashboard/recovery/events/${encodeURIComponent(eventId)}/verify`)),

  getRequest: ({ requestId }) => call(() => api.get(`/dashboard/recovery/requests/${encodeURIComponent(requestId)}`)),

  createRequest: ({ incidentId, selectedLogId, reason, idempotencyKey }) => call(() => api.post('/dashboard/recovery/requests', {
    incident_id: incidentId,
    selected_log_id: selectedLogId,
    reason,
    idempotency_key: idempotencyKey,
  })),

  executeRequest: ({ requestId }) => call(() => api.post(`/dashboard/recovery/requests/${encodeURIComponent(requestId)}/execute`)),
};

export { normalizeError };
