import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const poolsApi = {
  list: (params) => api.get('/pools', { params }),
  get: (id) => api.get(`/pools/${id}`),
  create: (data) => api.post('/pools', data),
  update: (id, data) => api.put(`/pools/${id}`, data),
  updateStatus: (id, data) => api.post(`/pools/${id}/status`, data),
  getLogs: (id) => api.get(`/pools/${id}/logs`)
};

export const usersApi = {
  list: (params) => api.get('/users', { params }),
  get: (username) => api.get(`/users/${username}`)
};

export const waterQualityApi = {
  list: (params) => api.get('/water-quality', { params }),
  create: (data) => api.post('/water-quality', data)
};

export const mineralsApi = {
  list: (params) => api.get('/minerals', { params }),
  create: (data) => api.post('/minerals', data)
};

export const disinfectionApi = {
  list: (params) => api.get('/disinfection', { params }),
  create: (data) => api.post('/disinfection', data)
};

export const drainageApi = {
  list: (params) => api.get('/drainage', { params }),
  create: (data) => api.post('/drainage', data)
};

export const maintenanceApi = {
  list: (params) => api.get('/maintenance', { params }),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data)
};

export const closuresApi = {
  list: (params) => api.get('/closures', { params }),
  create: (data) => api.post('/closures', data),
  reopen: (id) => api.post(`/closures/${id}/reopen`)
};

export const frontdeskApi = {
  list: (params) => api.get('/frontdesk', { params }),
  create: (data) => api.post('/frontdesk', data)
};

export const patrolsApi = {
  list: (params) => api.get('/patrols', { params }),
  create: (data) => api.post('/patrols', data)
};

export const complaintsApi = {
  list: (params) => api.get('/complaints', { params }),
  get: (id) => api.get(`/complaints/${id}`),
  create: (data) => api.post('/complaints', data),
  update: (id, data) => api.put(`/complaints/${id}`, data)
};

export const compensationsApi = {
  list: (params) => api.get('/compensations', { params }),
  create: (data) => api.post('/compensations', data),
  update: (id, data) => api.put(`/compensations/${id}`, data)
};

export const statsApi = {
  overview: () => api.get('/stats/overview'),
  poolDetail: (poolId) => api.get(`/stats/pool/${poolId}`)
};

export const poolAbnormalReportsApi = {
  list: (params) => api.get('/pool-abnormal-reports', { params }),
  get: (id) => api.get(`/pool-abnormal-reports/${id}`),
  create: (data) => api.post('/pool-abnormal-reports', data),
  updateStatus: (id, data) => api.put(`/pool-abnormal-reports/${id}/status`, data)
};

export const poolAbnormalDecisionsApi = {
  list: (params) => api.get('/pool-abnormal-decisions', { params }),
  create: (data) => api.post('/pool-abnormal-decisions', data)
};

export const guestNotificationsApi = {
  list: (params) => api.get('/guest-notifications', { params }),
  create: (data) => api.post('/guest-notifications', data)
};

export const retestRecordsApi = {
  list: (params) => api.get('/retest-records', { params }),
  create: (data) => api.post('/retest-records', data)
};

export const groupConflictsApi = {
  list: (params) => api.get('/group-conflicts', { params }),
  get: (id) => api.get(`/group-conflicts/${id}`),
  create: (data) => api.post('/group-conflicts', data),
  updateStatus: (id, data) => api.put(`/group-conflicts/${id}/status`, data),
  updateArrival: (id, data) => api.put(`/group-conflicts/${id}/arrival`, data)
};

export const conflictAdjustmentsApi = {
  list: (params) => api.get('/conflict-adjustments', { params }),
  create: (data) => api.post('/conflict-adjustments', data)
};

export default api;
