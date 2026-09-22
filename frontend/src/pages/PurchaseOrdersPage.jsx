import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  RotateCcw,
  X,
  Truck,
  FileText,
  Check,
  Ban,
  Send,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  submitPurchaseOrder,
  decidePurchaseOrder,
  acceptGoodsReceipt,
  rejectGoodsReceipt,
} from '../services/purchasingService';

const PO_STATUS = {
  DRAFT: { label: 'مسودة', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  PENDING_APPROVAL: { label: 'بانتظار الموافقة', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  APPROVED: { label: 'معتمد', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  REJECTED: { label: 'مرفوض', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  PARTIALLY_RECEIVED: { label: 'استلام جزئي', cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  RECEIVED: { label: 'تم الاستلام', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  CLOSED: { label: 'مغلق', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const RECEIPT_STATUS = {
  PENDING: { label: 'بانتظار القبول', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  ACCEPTED: { label: 'تم القبول', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  REJECTED: { label: 'مرفوض', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const PO_STATUS_FILTERS = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
];

const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const formatMoney = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatQty = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('en-US');
};

const formatDateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ar-EG');
};

const extractApiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

const poBadge = (status) =>
  PO_STATUS[status] || { label: status || '—', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };

const receiptBadge = (status) =>
  RECEIPT_STATUS[status] || { label: status || '—', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [poStatus, setPoStatus] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [showPoReject, setShowPoReject] = useState(false);
  const [poRejectNote, setPoRejectNote] = useState('');
  const [showRejectFor, setShowRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const payload = await getPurchaseOrders({ status: poStatus || undefined });
      setPos(toList(payload));
    } catch (err) {
      console.error('Error loading purchase orders:', err);
      setPos([]);
      setListError('تعذر تحميل أوامر الشراء من السيرفر. يرجى المحاولة مرة أخرى.');
    } finally {
      setListLoading(false);
    }
  }, [poStatus]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await getPurchaseOrder(id);
      setDetail(data);
    } catch (err) {
      console.error('Error loading purchase order detail:', err);
      setDetail(null);
      setDetailError('تعذر تحميل تفاصيل أمر الشراء من السيرفر.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    async function run() {
      await loadList();
    }
    run();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return undefined;
    async function run() {
      await loadDetail(selectedId);
    }
    run();
    return undefined;
  }, [selectedId, loadDetail]);

  const handleSelect = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setActionError(null);
    setActionSuccess(null);
    setShowPoReject(false);
    setShowRejectFor(null);
    setPoRejectNote('');
    setRejectReason('');
  };

  const afterAction = async (message) => {
    setActionSuccess(message);
    await loadDetail(selectedId);
    loadList();
  };

  const handleSubmitPO = async () => {
    setActionError(null);
    setActionSuccess(null);
    setBusyAction('submit');
    try {
      await submitPurchaseOrder(selectedId);
      await afterAction('تم إرسال أمر الشراء للموافقة بنجاح');
    } catch (err) {
      console.error('Submit error:', err);
      setActionError(extractApiError(err, 'تعذر إرسال أمر الشراء للموافقة.'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDecision = async (decision) => {
    setActionError(null);
    setActionSuccess(null);
    setBusyAction(decision === 'APPROVED' ? 'approve' : 'reject-po');
    try {
      await decidePurchaseOrder(selectedId, {
        decision,
        note: decision === 'REJECTED' ? poRejectNote.trim() || undefined : undefined,
      });
      setShowPoReject(false);
      setPoRejectNote('');
      await afterAction(decision === 'APPROVED' ? 'تم اعتماد أمر الشراء بنجاح' : 'تم رفض أمر الشراء');
    } catch (err) {
      console.error('Decision error:', err);
      setActionError(extractApiError(err, 'تعذر تسجيل قرار الموافقة. قد يكون القرار مسجلاً مسبقاً.'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAcceptReceipt = async (receiptId) => {
    setActionError(null);
    setActionSuccess(null);
    setBusyAction(receiptId);
    try {
      await acceptGoodsReceipt(receiptId);
      await afterAction('تم قبول إشعار الاستلام — أُضيفت الكميات إلى المخزون');
    } catch (err) {
      console.error('Accept receipt error:', err);
      setActionError(extractApiError(err, 'تعذر قبول إشعار الاستلام.'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleRejectReceipt = async (receiptId) => {
    setActionError(null);
    setActionSuccess(null);
    setBusyAction(receiptId);
    try {
      await rejectGoodsReceipt(receiptId, rejectReason.trim());
      setShowRejectFor(null);
      setRejectReason('');
      await afterAction('تم رفض إشعار الاستلام — لم يتأثر المخزون');
    } catch (err) {
      console.error('Reject receipt error:', err);
      setActionError(extractApiError(err, 'تعذر رفض إشعار الاستلام.'));
    } finally {
      setBusyAction(null);
    }
  };

  const poNo = (p) => p.po_no || p.poNo || '';
  const vendorName = (p) => p.vendor?.name || p.vendor_name || p.vendorName || '';
  const totalAmount = (p) => p.total_amount ?? p.totalAmount;
  const submittedAt = (p) => p.submitted_at || p.submittedAt;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar />

        <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* العنوان */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>الرئيسية</span>
              <span>/</span>
              <span className="text-slate-600 font-semibold">أوامر الشراء</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">أوامر الشراء</h1>
            <p className="text-xs text-slate-500 mt-1">
              متابعة أوامر الشراء وإشعارات الاستلام — القبول هو المسار الوحيد لإضافة المخزون
            </p>
          </div>

          {/* تصفية الحالة */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-3">
            <select
              value={poStatus}
              onChange={(e) => setPoStatus(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            >
              <option value="">كل الحالات</option>
              {PO_STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {PO_STATUS[s]?.label || s}
                </option>
              ))}
            </select>
            <button
              onClick={loadList}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              <RotateCcw className="w-4 h-4" />
              تحديث
            </button>
          </div>

          {/* خطأ القائمة */}
          {listError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{listError}</span>
              <button
                onClick={loadList}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* جدول أوامر الشراء */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">قائمة أوامر الشراء</h3>
                <p className="text-xs text-slate-400">اضغط على أي أمر لعرض بنوده وإشعارات الاستلام</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-800">
                    <th className="py-3 px-4 font-semibold">رقم الأمر</th>
                    <th className="py-3 px-4 font-semibold">المورد</th>
                    <th className="py-3 px-4 font-semibold">الحالة</th>
                    <th className="py-3 px-4 font-semibold">الإجمالي</th>
                    <th className="py-3 px-4 font-semibold">تاريخ الإرسال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {listLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <Loader2 className="w-7 h-7 text-blue-500 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : pos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        لا توجد أوامر شراء مطابقة في قاعدة البيانات.
                      </td>
                    </tr>
                  ) : (
                    pos.map((p) => {
                      const badge = poBadge(p.status);
                      const active = selectedId === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => handleSelect(p.id)}
                          className={`transition cursor-pointer ${
                            active ? 'bg-blue-950/60' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-4 px-4 font-bold text-blue-400">{poNo(p) || '—'}</td>
                          <td className="py-4 px-4 font-bold text-white">{vendorName(p) || '—'}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold text-emerald-400">{formatMoney(totalAmount(p))}</td>
                          <td className="py-4 px-4 text-slate-400">{formatDateTime(submittedAt(p)) || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* تفاصيل أمر الشراء */}
          {selectedId && (
            <div className="space-y-4">
              {detailLoading ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-500">جاري تحميل تفاصيل أمر الشراء...</p>
                </div>
              ) : detailError ? (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="flex-1">{detailError}</span>
                  <button
                    onClick={() => loadDetail(selectedId)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : detail ? (
                <>
                  {actionError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span className="flex-1">{actionError}</span>
                      <button onClick={() => setActionError(null)} className="p-1 hover:bg-red-100 rounded-lg transition">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {actionSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span className="flex-1">{actionSuccess}</span>
                      <button onClick={() => setActionSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg transition">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* ترويسة التفاصيل */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{poNo(detail) || 'أمر شراء'}</h3>
                          <p className="text-[11px] text-slate-400">{vendorName(detail) || '—'}</p>
                        </div>
                        {(() => {
                          const b = poBadge(detail.status);
                          return (
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${b.cls}`}>
                              {b.label}
                            </span>
                          );
                        })()}
                      </div>
                      <button
                        onClick={() => handleSelect(selectedId)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="إغلاق التفاصيل"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">المورد</p>
                        <p className="font-bold text-slate-800">{vendorName(detail) || '—'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">الإجمالي</p>
                        <p className="font-bold text-slate-800">{formatMoney(detail.total_amount ?? detail.totalAmount)}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">تاريخ الإرسال</p>
                        <p className="font-bold text-slate-800">
                          {formatDateTime(detail.submitted_at || detail.submittedAt) || '—'}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-1">عدد البنود</p>
                        <p className="font-bold text-slate-800">
                          {(detail.lines || detail.purchase_order_lines || detail.purchaseOrderLines || []).length}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                      {detail.status === 'DRAFT' && (
                        <button
                          onClick={handleSubmitPO}
                          disabled={busyAction !== null}
                          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                          {busyAction === 'submit' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          إرسال للموافقة
                        </button>
                      )}

                      {detail.status === 'PENDING_APPROVAL' && !showPoReject && (
                        <>
                          <button
                            onClick={() => handleDecision('APPROVED')}
                            disabled={busyAction !== null}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                          >
                            {busyAction === 'approve' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            اعتماد الأمر
                          </button>
                          <button
                            onClick={() => setShowPoReject(true)}
                            disabled={busyAction !== null}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50"
                          >
                            <Ban className="w-4 h-4" />
                            رفض الأمر
                          </button>
                        </>
                      )}

                      {detail.status === 'PENDING_APPROVAL' && showPoReject && (
                        <>
                          <input
                            type="text"
                            value={poRejectNote}
                            onChange={(e) => setPoRejectNote(e.target.value)}
                            placeholder="سبب الرفض (اختياري)..."
                            className="flex-1 min-w-[200px] px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                          <button
                            onClick={() => handleDecision('REJECTED')}
                            disabled={busyAction !== null}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                          >
                            {busyAction === 'reject-po' && <Loader2 className="w-4 h-4 animate-spin" />}
                            تأكيد الرفض
                          </button>
                          <button
                            onClick={() => {
                              setShowPoReject(false);
                              setPoRejectNote('');
                            }}
                            className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                          >
                            تراجع
                          </button>
                        </>
                      )}
                    </div>

                  </div>

                  {/* بنود أمر الشراء */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 mb-4">بنود أمر الشراء</h4>
                    {(detail.lines || detail.purchase_order_lines || detail.purchaseOrderLines || []).length === 0 ? (
                      <p className="text-xs text-slate-400">لا توجد بنود مسجلة على هذا الأمر.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100">
                              <th className="py-2.5 px-3 font-semibold">القطعة</th>
                              <th className="py-2.5 px-3 font-semibold">الكمية المطلوبة</th>
                              <th className="py-2.5 px-3 font-semibold">تكلفة الوحدة</th>
                              <th className="py-2.5 px-3 font-semibold">المستلم</th>
                              <th className="py-2.5 px-3 font-semibold">الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(detail.lines || detail.purchase_order_lines || detail.purchaseOrderLines || []).map((l, idx) => {
                              const qty = l.ordered_qty ?? l.orderedQty;
                              const cost = l.unit_cost ?? l.unitCost;
                              const lineTotal =
                                qty !== null && qty !== undefined && cost !== null && cost !== undefined
                                  ? Number(qty) * Number(cost)
                                  : null;
                              return (
                                <tr key={l.id || idx}>
                                  <td className="py-3 px-3">
                                    <div className="font-bold text-slate-800">
                                      {l.part?.name || l.part_name || l.partName || l.name || '—'}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {l.part?.sku || l.part_sku || l.partSku || l.sku || ''}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-slate-600">{formatQty(qty)}</td>
                                  <td className="py-3 px-3 text-slate-600">{formatMoney(cost)}</td>
                                  <td className="py-3 px-3 text-slate-600">{formatQty(l.received_qty ?? l.receivedQty)}</td>
                                  <td className="py-3 px-3 font-bold text-slate-800">{formatMoney(lineTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* قرارات الموافقات */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 mb-4">قرارات الموافقات</h4>
                    {(detail.approvals || detail.purchase_approvals || detail.purchaseApprovals || []).length === 0 ? (
                      <p className="text-xs text-slate-400">لم تُسجل أي قرارات موافقة بعد.</p>
                    ) : (
                      <div className="space-y-2">
                        {(detail.approvals || detail.purchase_approvals || detail.purchaseApprovals || []).map((a, idx) => {
                          const approved = a.decision === 'APPROVED';
                          return (
                            <div
                              key={a.id || idx}
                              className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {a.approved_by?.display_name ||
                                    a.approved_by?.displayName ||
                                    a.approved_by?.name ||
                                    a.approved_by_name ||
                                    a.approvedBy?.displayName ||
                                    '—'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {[
                                    formatDateTime(a.approved_at || a.approvedAt),
                                    a.note,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  approved
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                                }`}
                              >
                                {approved ? 'معتمد' : 'مرفوض'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* إشعارات الاستلام */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                      <Truck className="w-4 h-4 text-blue-600" />
                      إشعارات الاستلام
                      <span className="text-[10px] font-medium text-slate-400">
                        (قبول الإشعار هو المسار الوحيد لإضافة الكميات للمخزون)
                      </span>
                    </h4>
                    {(detail.goods_receipts || detail.goodsReceipts || detail.receipts || []).length === 0 ? (
                      <p className="text-xs text-slate-400">لا توجد إشعارات استلام مسجلة على هذا الأمر.</p>
                    ) : (
                      <div className="space-y-3">
                        {(detail.goods_receipts || detail.goodsReceipts || detail.receipts || []).map((r, idx) => {
                          const badge = receiptBadge(r.status);
                          const isPending = (r.status || '').toUpperCase() === 'PENDING';
                          const busy = busyAction === r.id;
                          return (
                            <div key={r.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-800">
                                    {r.gr_no || r.grNo || r.receipt_no || r.receiptNo || `إشعار #${idx + 1}`}
                                  </span>
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                                    {badge.label}
                                  </span>
                                </div>
                                {isPending && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleAcceptReceipt(r.id)}
                                      disabled={busyAction !== null}
                                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition disabled:opacity-50"
                                    >
                                      {busy ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                      قبول الاستلام
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowRejectFor(r.id);
                                        setRejectReason('');
                                      }}
                                      disabled={busyAction !== null}
                                      className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl text-[11px] font-bold hover:bg-red-500/20 transition disabled:opacity-50"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      رفض
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 text-[10px] text-slate-400">
                                <span>أُنشئ: {formatDateTime(r.created_at || r.createdAt) || '—'}</span>
                                <span>قُبل: {formatDateTime(r.accepted_at || r.acceptedAt) || '—'}</span>
                              </div>

                              {isPending && showRejectFor === r.id && (
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                                  <input
                                    type="text"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="سبب الرفض (مطلوب)..."
                                    className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                                  />
                                  <button
                                    onClick={() => handleRejectReceipt(r.id)}
                                    disabled={!rejectReason.trim() || busyAction !== null}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold transition disabled:opacity-50"
                                  >
                                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    تأكيد الرفض
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowRejectFor(null);
                                      setRejectReason('');
                                    }}
                                    className="px-3.5 py-2 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-bold hover:bg-slate-200 transition"
                                  >
                                    تراجع
                                  </button>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </>
              ) : null}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

