import api from '../api';

const buildParams = (params = {}) => {
  const next = { ...params };
  Object.keys(next).forEach((key) => {
    if (next[key] === undefined || next[key] === null || next[key] === '') delete next[key];
  });
  return next;
};

const unwrapData = (response) => response?.data?.data ?? response?.data;

const normalizeError = (error) => {
  const status = error?.response?.status;
  const payload = error?.response?.data;
  const code = payload?.code || payload?.error_code || (typeof payload?.error === 'string' ? payload.error : '');
  const message = payload?.message || payload?.error || error?.message || 'Recovery request failed.';

  return {
    status,
    code: String(code || '').toUpperCase(),
    message: String(message),
    unavailable: status === 404 && !code,
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

export const recoveryApi = {
  listIncidents: ({ status } = {}) => call(() => api.get('/dashboard/recovery/incidents', {
    params: buildParams({ status }),
  })),

  getIncident: ({ incidentId }) => call(() => api.get(`/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}`)),

  listCandidates: ({ incidentId }) => call(() => api.get(`/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}/candidates`)),

  runPreflight: ({ incidentId }) => call(() => api.post(`/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}/preflight`)),

  listVersions: ({ resource }) => call(() => api.get(`/dashboard/recovery/resources/${encodeURIComponent(resource)}/versions`)),

  listRequests: ({ status } = {}) => call(() => api.get('/dashboard/recovery/requests', {
    params: buildParams({ status }),
  })),

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
