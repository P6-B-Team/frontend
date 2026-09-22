import api from './api';

/**
 * كل استجابات الباك إند تستخدم المغلف { data, meta, error }
 * نقوم بفك المغلف وإرجاع البيانات الفعلية فقط — بدون أي بيانات وهمية.
 */
const unwrap = (response) => response?.data?.data ?? null;

/**
 * GET /parts — كارت القطع مع الأرصدة المجمعة
 * يدعم: q (بحث), page, pageSize
 */
export const getParts = async ({ q, page, pageSize } = {}) => {
  const params = {};
  if (q) params.q = q;
  if (page) params.page = page;
  if (pageSize) params.pageSize = pageSize;

  const response = await api.get('/parts', { params });
  return unwrap(response);
};

/**
 * GET /stores — قائمة مخازن القطع
 */
export const getStores = async () => {
  const response = await api.get('/stores');
  return unwrap(response);
};

/**
 * GET /stock/balances — أرصدة المخزون لكل مخزن / قطعة
 */
export const getStockBalances = async ({ storeId } = {}) => {
  const params = {};
  if (storeId) params.storeId = storeId;

  const response = await api.get('/stock/balances', { params });
  return unwrap(response);
};

/**
 * GET /stock/movements — سجل حركات المخزون غير القابل للتعديل
 * يدعم: partId, page, pageSize
 */
export const getStockMovements = async ({ partId, page, pageSize } = {}) => {
  const params = {};
  if (partId) params.partId = partId;
  if (page) params.page = page;
  if (pageSize) params.pageSize = pageSize;

  const response = await api.get('/stock/movements', { params });
  return unwrap(response);
};

/**
 * POST /stock/adjustments — تسوية مخزون مصرح بها مع السبب
 */
export const createStockAdjustment = async ({ storeId, partId, delta, reason }) => {
  const response = await api.post('/stock/adjustments', { storeId, partId, delta, reason });
  return unwrap(response);
};

/**
 * POST /stock/transfers — تحويل مخزون بين المخازن
 */
export const createStockTransfer = async ({ fromStoreId, toStoreId, partId, quantity, reason }) => {
  const response = await api.post('/stock/transfers', {
    fromStoreId,
    toStoreId,
    partId,
    quantity,
    reason,
  });
  return unwrap(response);
};

/**
 * GET /stock/alerts — القطع عند أو تحت الحد الأدنى مع اقتراح إعادة الطلب
 */
export const getStockAlerts = async () => {
  const response = await api.get('/stock/alerts');
  return unwrap(response);
};
