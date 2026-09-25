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

/**
 * POST /jobs — فتح بطاقة عمل جديدة (WST-FR-03)
 * payload: { customerId, vehicleId, complaint, serviceType, priority?, receivedMileage, ... }
 */
export const createJob = async (payload) => {
  const response = await api.post('/jobs', payload);
  return unwrap(response);
};

/**
 * GET /customers — البحث في العملاء (لاختيار عميل بطاقة العمل)
 * يدعم: q (بحث), page, pageSize
 */
export const getCustomers = async ({ q, page, pageSize } = {}) => {
  const params = {};
  if (q) params.q = q;
  if (page) params.page = page;
  if (pageSize) params.pageSize = pageSize;

  const response = await api.get('/customers', { params });
  return unwrap(response);
};

/**
 * POST /customers — تسجيل عميل جديد
 * payload: { name (مطلوب), phone?, email?, preferredContact? }
 */
export const createCustomer = async ({ name, phone, email, preferredContact }) => {
  const payload = { name };
  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (preferredContact) payload.preferredContact = preferredContact;

  const response = await api.post('/customers', payload);
  return unwrap(response);
};

/**
 * GET /customers/:id/vehicles — مركبات عميل معين (للاختيار في بطاقة العمل)
 */
export const getCustomerVehicles = async (customerId) => {
  const response = await api.get(`/customers/${customerId}/vehicles`);
  return unwrap(response);
};

/**
 * POST /customers/:id/vehicles — تسجيل مركبة جديدة لعميل
 * payload: { plateNo, vin, make, model (مطلوبة), year?, mileage? }
 */
export const createVehicle = async (customerId, { plateNo, vin, make, model, year, mileage }) => {
  const payload = { plateNo, vin, make, model };
  if (year !== undefined && year !== null && year !== '') payload.year = Number(year);
  if (mileage !== undefined && mileage !== null && mileage !== '') payload.mileage = Number(mileage);

  const response = await api.post(`/customers/${customerId}/vehicles`, payload);
  return unwrap(response);
};

/**
 * POST /jobs/:id/parts/issue — صرف قطعة على كارت صيانة (خصم ذري من المخزون)
 * body: { partId, storeId, quantity } — سعر البيع يُقرأ من الكتالوج في الباك إند
 */
export const issuePartToJob = async (jobId, { partId, storeId, quantity }) => {
  const response = await api.post(`/jobs/${jobId}/parts/issue`, {
    partId,
    storeId,
    quantity: Number(quantity),
  });
  return unwrap(response);
};
/**
 * GET /jobs/:id/invoice-preview — معاينة حساب الفاتورة:
 * ساعات العمل والقطع المصروفة ونسبة الضريبة والإعدادات بدون حفظ (WST-FR-09)
 * يدعم خصم اختياري: discount
 */
export const getInvoicePreview = async (id, discount) => {
  const params = {};
  if (discount !== undefined && discount !== null && discount !== '' && !Number.isNaN(Number(discount))) {
    params.discount = Number(discount);
  }

  const response = await api.get(`/jobs/${id}/invoice-preview`, { params });
  return unwrap(response);
};

/**
 * POST /jobs/:id/invoices — إصدار الفاتورة المحسوبة من العمالة والقطع والخدمات الخارجية
 * payload: { discount? }
 */
export const issueInvoice = async (id, discount) => {
  const payload = {};
  if (discount !== undefined && discount !== null && discount !== '' && !Number.isNaN(Number(discount))) {
    payload.discount = Number(discount);
  }

  const response = await api.post(`/jobs/${id}/invoices`, payload);
  return unwrap(response);
};
