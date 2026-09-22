import api from './api';

/**
 * كل استجابات الباك إند تستخدم المغلف { data, meta, error }
 * نقوم بفك المغلف وإرجاع البيانات الفعلية فقط — بدون أي بيانات وهمية.
 */
const unwrap = (response) => response?.data?.data ?? null;

/**
 * GET /purchase-orders — قائمة أوامر الشراء
 */
export const getPurchaseOrders = async ({ status } = {}) => {
  const params = {};
  if (status) params.status = status;

  const response = await api.get('/purchase-orders', { params });
  return unwrap(response);
};

/**
 * GET /purchase-orders/:id — أمر شراء مع البنود والموافقات وإشعارات الاستلام
 */
export const getPurchaseOrder = async (id) => {
  const response = await api.get(`/purchase-orders/${id}`);
  return unwrap(response);
};

/**
 * POST /purchase-orders — إنشاء أمر شراء كمسودة
 * payload: { vendorId, lines: [{ partId, quantity, unitCost }] }
 */
export const createPurchaseOrder = async ({ vendorId, lines }) => {
  const response = await api.post('/purchase-orders', { vendorId, lines });
  return unwrap(response);
};

/**
 * POST /purchase-orders/:id/submit — إرسال أمر الشراء للموافقة
 */
export const submitPurchaseOrder = async (id) => {
  const response = await api.post(`/purchase-orders/${id}/submit`);
  return unwrap(response);
};

/**
 * POST /purchase-orders/:id/approvals — تسجيل قرار موافقة (فصل المهام مفروض من الباك إند)
 * decision ∈ APPROVED | REJECTED
 */
export const decidePurchaseOrder = async (id, { decision, note } = {}) => {
  const payload = { decision };
  if (note) payload.note = note;

  const response = await api.post(`/purchase-orders/${id}/approvals`, payload);
  return unwrap(response);
};

/**
 * POST /purchase-orders/:id/goods-receipts — تسجيل إشعار استلام بحالة PENDING (بدون حركة مخزون)
 * payload: { storeId, lines: [{ purchaseOrderLineId, acceptedQty, rejectedQty }] }
 */
export const createGoodsReceipt = async (poId, { storeId, lines }) => {
  const response = await api.post(`/purchase-orders/${poId}/goods-receipts`, { storeId, lines });
  return unwrap(response);
};

/**
 * POST /goods-receipts/:id/accept — قبول إشعار الاستلام
 * هذا هو المسار الوحيد الذي يزيد المخزون فعلياً.
 */
export const acceptGoodsReceipt = async (id) => {
  const response = await api.post(`/goods-receipts/${id}/accept`);
  return unwrap(response);
};

/**
 * POST /goods-receipts/:id/reject — رفض إشعار الاستلام (المخزون لا يتأثر)
 */
export const rejectGoodsReceipt = async (id, reason) => {
  const response = await api.post(`/goods-receipts/${id}/reject`, { reason });
  return unwrap(response);
};

/**
 * GET /vendors — قائمة الموردين
 */
export const getVendors = async () => {
  const response = await api.get('/vendors');
  return unwrap(response);
};
