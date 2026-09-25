import api from './api';

export const getWorkshopDashboard = async () => {
  const response = await api.get('/dashboards/workshop');
  return response.data?.data || response.data;
};

export const getInventoryDashboard = async () => {
  const response = await api.get('/dashboards/inventory');
  return response.data?.data || response.data;
};

export const getTrainingDashboard = async () => {
  const response = await api.get('/dashboards/training');
  return response.data?.data || response.data;
};

export const getRecentJobs = async () => {
  const response = await api.get('/jobs?pageSize=5');
  return response.data?.data || response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/me');
  return response.data?.data || response.data;
};

/**
 * GET /settings — إعدادات المنشأة (نسبة الضريبة والحدود) — تُستخدم في حساب الفاتورة
 */
export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data?.data || response.data;
};