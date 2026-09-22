import api from './api';

/**
 * كل استجابات الباك إند تستخدم المغلف { data, meta, error }
 * نقوم بفك المغلف وإرجاع البيانات الفعلية فقط — بدون أي بيانات وهمية.
 */
const unwrap = (response) => response?.data?.data ?? null;

/**
 * GET /jobs — قائمة بطاقات العمل
 * يدعم: status, q (بحث), page, pageSize
 */
export const getJobs = async ({ status, q, page, pageSize } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (q) params.q = q;
  if (page) params.page = page;
  if (pageSize) params.pageSize = pageSize;

  const response = await api.get('/jobs', { params });
  return unwrap(response);
};

/**
 * GET /jobs/:id — بطاقة عمل مع الجدول الزمني والعمالة والقطع والموافقات والفاتورة
 */
export const getJob = async (id) => {
  const response = await api.get(`/jobs/${id}`);
  return unwrap(response);
};

/**
 * POST /jobs/:id/transitions — تحريك بطاقة العمل عبر آلة الحالات
 * toStatus ∈ IN_PROGRESS | QUALITY_CHECK | READY | DELIVERED | CANCELLED
 */
export const transitionJob = async (id, toStatus, reason) => {
  const payload = { toStatus };
  if (reason) payload.reason = reason;

  const response = await api.post(`/jobs/${id}/transitions`, payload);
  return unwrap(response);
};

/**
 * PATCH /jobs/:id — إسناد الحوض والفني والجدولة (الخطوة 2 من سير العمل)
 * يقبل حقلاً أو أكثر: bayId, technicianId, priority, expectedAt,
 * scheduledStartAt, scheduledEndAt, estimateAmount, complaint, serviceType
 */
export const updateJob = async (id, payload) => {
  const response = await api.patch(`/jobs/${id}`, payload);
  return unwrap(response);
};

/**
 * GET /bays — قائمة أحواض الورشة (للاختيار في الإسناد)
 */
export const getBays = async () => {
  const response = await api.get('/bays');
  return unwrap(response);
};

/**
 * GET /users — مستخدمو المنظمة (للاختيار الفني المسؤول)
 */
export const getUsers = async () => {
  const response = await api.get('/users');
  return unwrap(response);
};

/**
 * GET /jobs/:id/work-items — قائمة فحص العمل على بطاقة العمل (WST-FR-04)
 */
export const getJobWorkItems = async (id) => {
  const response = await api.get(`/jobs/${id}/work-items`);
  return unwrap(response);
};
