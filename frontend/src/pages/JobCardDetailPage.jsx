import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Wrench,
  User,
  FileText,
  History,
  ListChecks,
  Save,
  X,
  ClipboardList,
  Package,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import {
  getJob,
  transitionJob,
  updateJob,
  getBays,
  getUsers,
  getJobWorkItems,
} from '../services/jobService';

const STATUS_AR = {
  RECEIVED: 'تم الاستلام',
  IN_PROGRESS: 'قيد التنفيذ',
  QUALITY_CHECK: 'فحص الجودة',
  READY: 'جاهز للتسليم',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
  DIAGNOSIS: 'فحص وتشخيص',
  REPAIR: 'صيانة',
};

const getStatusBadge = (status) => {
  const map = {
    IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    QUALITY_CHECK: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    RECEIVED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    READY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    DELIVERED: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return {
    label: STATUS_AR[status] || status || '—',
    cls: map[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
};

// الانتقالات المتاحة من كل حالة كما تسمح بها آلة الحالات في الباك إند
const NEXT_TRANSITIONS = {
  RECEIVED: [{ to: 'IN_PROGRESS', label: 'بدء التنفيذ', cls: 'bg-blue-600 hover:bg-blue-700' }],
  IN_PROGRESS: [{ to: 'QUALITY_CHECK', label: 'إحالة لفحص الجودة', cls: 'bg-purple-600 hover:bg-purple-700' }],
  QUALITY_CHECK: [{ to: 'READY', label: 'اعتماد الجاهزية', cls: 'bg-emerald-600 hover:bg-emerald-700' }],
  READY: [{ to: 'DELIVERED', label: 'تأكيد التسليم', cls: 'bg-slate-900 hover:bg-slate-800' }],
};

const CANCELLABLE = ['RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY'];

const WORK_ITEM_STATUS = {
  PENDING: { label: 'معلقة', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  IN_PROGRESS: { label: 'قيد التنفيذ', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  COMPLETED: { label: 'مكتملة', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  NOT_APPLICABLE: { label: 'لا تنطبق', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
};

const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const formatDateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ar-EG');
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

// تحويل قيمة تاريخ من الباك إند إلى صيغة datetime-local
const toDateTimeInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const extractApiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

// بناء نموذج الإسناد من بيانات البطاقة الفعلية القادمة من الباك إند — بدون أي قيم افتراضية
const buildAssignmentForm = (jobData) => ({
  bayId: jobData?.bay_id || jobData?.bayId || '',
  technicianId:
    jobData?.assigned_technician_id ||
    jobData?.assignedTechnicianId ||
    jobData?.technician_id ||
    jobData?.technicianId ||
    '',
  expectedAt: toDateTimeInput(jobData?.expected_at || jobData?.expectedAt),
  scheduledStartAt: toDateTimeInput(jobData?.scheduled_start_at || jobData?.scheduledStartAt),
  scheduledEndAt: toDateTimeInput(jobData?.scheduled_end_at || jobData?.scheduledEndAt),
  estimateAmount: jobData?.estimate_amount ?? jobData?.estimateAmount ?? '',
});

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-800/60">
    <span className="text-[11px] text-slate-400 font-medium shrink-0">{label}</span>
    <span className="text-xs font-bold text-slate-100 text-left">{value || '—'}</span>
  </div>
);

export default function JobCardDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [bays, setBays] = useState([]);
  const [users, setUsers] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [transitioningTo, setTransitioningTo] = useState(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({
    bayId: '',
    technicianId: '',
    expectedAt: '',
    scheduledStartAt: '',
    scheduledEndAt: '',
    estimateAmount: '',
  });

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [jobData, workItemsData] = await Promise.all([
        getJob(id),
        getJobWorkItems(id).catch(() => null),
      ]);
      setJob(jobData);
      setForm(buildAssignmentForm(jobData));
      setWorkItems(toList(workItemsData));
    } catch (err) {
      console.error('Error loading job detail:', err);
      setJob(null);
      setError('تعذر تحميل تفاصيل بطاقة العمل من السيرفر. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    async function run() {
      await loadDetail();
    }
    run();
  }, [loadDetail]);

  useEffect(() => {
    getBays()
      .then((d) => setBays(toList(d)))
      .catch(() => setBays([]));
    getUsers()
      .then((d) => setUsers(toList(d)))
      .catch(() => setUsers([]));
  }, []);

  const status = job?.status || '';
  const transitions = NEXT_TRANSITIONS[status] || [];
  const canCancel = CANCELLABLE.includes(status);

  const jobNo = job?.job_no || job?.jobNo || '';
  const customerName = job?.customer?.name || job?.customerName || job?.customer_name || '';
  const vehicleLabel = () => {
    const make = job?.vehicle?.make || job?.vehicle_make || job?.vehicleMake || '';
    const model = job?.vehicle?.model || job?.vehicle_model || job?.vehicleModel || '';
    return [make, model].filter(Boolean).join(' ');
  };
  const plateNo =
    job?.vehicle?.plate_no || job?.vehicle?.plateNo || job?.vehicle_plate_no || job?.vehiclePlateNo || '';
  const serviceType = job?.service_type || job?.serviceType || '';

  const bayName = () => {
    const bayId = job?.bay_id || job?.bayId;
    const fromList = bays.find((b) => b.id === bayId);
    return fromList?.name || fromList?.code || job?.bay?.name || job?.bay_name || job?.bayName || '';
  };
  const technicianDisplay = () => {
    const techId =
      job?.assigned_technician_id || job?.assignedTechnicianId || job?.technician_id || job?.technicianId;
    const fromList = users.find((u) => u.id === techId);
    return (
      fromList?.display_name ||
      fromList?.displayName ||
      fromList?.name ||
      job?.technician?.display_name ||
      job?.technician?.displayName ||
      job?.technicianName ||
      ''
    );
  };

  const timeline = job?.timeline || job?.stage_history || job?.stageHistory || job?.history || [];
  const laborEntries = job?.labor_entries || job?.laborEntries || job?.labor || [];
  const issuedParts = job?.job_parts || job?.jobParts || job?.parts || [];

  const approval = job?.customer_approval_status || job?.customerApprovalStatus || '';
  const approvalBadge = (() => {
    if (approval === 'APPROVED')
      return { label: 'تمت الموافقة', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (approval === 'REJECTED')
      return { label: 'مرفوض من العميل', cls: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (approval === 'PENDING')
      return { label: 'بانتظار موافقة العميل', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return { label: approval, cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
  })();

  const handleTransition = async (toStatus) => {
    setActionError(null);
    setActionSuccess(null);
    setTransitioningTo(toStatus);
    try {
      await transitionJob(id, toStatus, cancelReason.trim() || undefined);
      setActionSuccess('تم تحديث حالة أمر العمل بنجاح');
      setShowCancel(false);
      setCancelReason('');
      await loadDetail();
    } catch (err) {
      console.error('Transition error:', err);
      setActionError(
        extractApiError(err, 'تعذر تنفيذ انتقال الحالة. قد يكون الانتقال غير مسموح من الحالة الحالية.')
      );
    } finally {
      setTransitioningTo(null);
    }
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const payload = {};
    if (form.bayId) payload.bayId = form.bayId;
    if (form.technicianId) payload.technicianId = form.technicianId;
    if (form.expectedAt) payload.expectedAt = new Date(form.expectedAt).toISOString();
    if (form.scheduledStartAt) payload.scheduledStartAt = new Date(form.scheduledStartAt).toISOString();
    if (form.scheduledEndAt) payload.scheduledEndAt = new Date(form.scheduledEndAt).toISOString();
    if (form.estimateAmount !== '' && form.estimateAmount !== null && form.estimateAmount !== undefined) {
      payload.estimateAmount = Number(form.estimateAmount);
    }

    if (Object.keys(payload).length === 0) {
      setActionError('لا توجد تغييرات لحفظها.');
      return;
    }

    setSavingAssignment(true);
    try {
      await updateJob(id, payload);
      setActionSuccess('تم حفظ الإسناد والجدولة بنجاح');
      await loadDetail();
    } catch (err) {
      console.error('Assignment error:', err);
      setActionError(
        extractApiError(err, 'تعذر حفظ الإسناد. قد يكون الحوض محجوزاً في نفس الفترة الزمنية.')
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-xs font-bold text-slate-600">جاري تحميل تفاصيل بطاقة العمل...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar />

        <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* العنوان */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link to="/jobs" className="flex items-center gap-1 hover:text-blue-600 transition font-medium">
                <ArrowRight className="w-3.5 h-3.5" />
                بطاقات العمل
              </Link>
              <span>/</span>
              <span className="text-slate-600 font-semibold">{jobNo || 'بطاقة عمل'}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{jobNo || 'بطاقة عمل'}</h1>
              {(() => {
                const b = getStatusBadge(status);
                return (
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${b.cls}`}>
                    {b.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-5 flex items-center gap-3 text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <Link
                to="/jobs"
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition"
              >
                العودة لبطاقات العمل
              </Link>
            </div>
          ) : !job ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-400 font-bold">
              لا توجد بيانات لهذه البطاقة.
            </div>
          ) : (
            <>
              {/* رسائل النجاح والخطأ للأفعال */}
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* العمود الرئيسي */}
                <div className="lg:col-span-2 space-y-6">
                  {/* بيانات أمر العمل */}
                  <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl">
                    <h3 className="text-base font-bold flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-blue-400" />
                      بيانات أمر العمل
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <InfoRow label="العميل" value={customerName} />
                      <InfoRow label="المركبة" value={vehicleLabel()} />
                      <InfoRow label="رقم اللوحة" value={plateNo} />
                      <InfoRow label="نوع الخدمة" value={serviceType} />
                      <InfoRow
                        label="عداد الاستلام"
                        value={formatQty(job.received_mileage ?? job.receivedMileage)}
                      />
                      <InfoRow
                        label="قيمة التقدير"
                        value={formatMoney(job.estimate_amount ?? job.estimateAmount)}
                      />
                      <InfoRow
                        label="التسليم المتوقع"
                        value={formatDateTime(job.expected_at || job.expectedAt)}
                      />
                      <InfoRow label="الحوض الحالي" value={bayName()} />
                      <InfoRow label="الفني الحالي" value={technicianDisplay()} />
                      <InfoRow
                        label="موافقة العميل"
                        value={
                          approval ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${approvalBadge.cls}`}
                            >
                              {approvalBadge.label}
                            </span>
                          ) : (
                            ''
                          )
                        }
                      />
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-800">
                      <p className="text-[11px] text-slate-400 font-medium mb-1">شكوى العميل</p>
                      <p className="text-xs text-slate-100 leading-relaxed">{job.complaint || '—'}</p>
                    </div>
                  </div>

                  {/* قائمة فحص العمل */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 mb-4">
                      <ListChecks className="w-5 h-5 text-blue-600" />
                      قائمة فحص العمل
                    </h3>
                    {workItems.length === 0 ? (
                      <p className="text-xs text-slate-400">لا توجد بنود فحص مسجلة على هذه البطاقة.</p>
                    ) : (
                      <div className="space-y-2">
                        {workItems.map((w) => {
                          const ws = WORK_ITEM_STATUS[w.status] || {
                            label: w.status || '—',
                            cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
                          };
                          return (
                            <div
                              key={w.id}
                              className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-slate-900 text-white text-[10px] font-bold rounded-lg flex items-center justify-center shrink-0">
                                  {w.sequence ?? '·'}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{w.description || '—'}</p>
                                  {w.description_ar || w.descriptionAr ? (
                                    <p className="text-[10px] text-slate-400">{w.description_ar || w.descriptionAr}</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {w.required === false && <span className="text-[10px] text-slate-400">اختياري</span>}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${ws.cls}`}>
                                  {ws.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* السجل الزمني للحالات */}
                  <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl">
                    <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                      <History className="w-5 h-5 text-purple-400" />
                      السجل الزمني للحالات
                    </h3>
                    {timeline.length === 0 ? (
                      <p className="text-xs text-slate-500">لا توجد انتقالات حالة مسجلة بعد.</p>
                    ) : (
                      <div className="space-y-4">
                        {timeline.map((t, idx) => {
                          const from = t.from_status || t.fromStatus || '';
                          const to = t.to_status || t.toStatus || '';
                          const who =
                            t.changed_by?.display_name ||
                            t.changed_by?.displayName ||
                            t.changedBy?.displayName ||
                            t.changed_by_name ||
                            '';
                          const details = [formatDateTime(t.changed_at || t.changedAt), who, t.reason]
                            .filter(Boolean)
                            .join(' · ');
                          return (
                            <div key={t.id || idx} className="flex items-start gap-3">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                              <div className="flex-1 pb-3 border-b border-slate-800/60">
                                <p className="text-xs font-bold">
                                  {from ? `${STATUS_AR[from] || from} → ` : ''}
                                  {STATUS_AR[to] || to}
                                </p>
                                {details ? <p className="text-[10px] text-slate-400 mt-0.5">{details}</p> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ساعات العمل */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 mb-4">
                      <User className="w-5 h-5 text-blue-600" />
                      ساعات العمل المسجلة
                    </h3>
                    {laborEntries.length === 0 ? (
                      <p className="text-xs text-slate-400">لا توجد ساعات عمل مسجلة على هذه البطاقة.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100">
                              <th className="py-2.5 px-3 font-semibold">الفني</th>
                              <th className="py-2.5 px-3 font-semibold">الدقائق</th>
                              <th className="py-2.5 px-3 font-semibold">سعر الساعة</th>
                              <th className="py-2.5 px-3 font-semibold">قابلة للفوترة</th>
                              <th className="py-2.5 px-3 font-semibold">ملاحظة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {laborEntries.map((l, idx) => {
                              const billable = l.billable ?? l.is_billable ?? true;
                              return (
                                <tr key={l.id || idx}>
                                  <td className="py-3 px-3 font-bold text-slate-800">
                                    {l.technician?.display_name ||
                                      l.technician?.displayName ||
                                      l.technician_name ||
                                      l.technicianName ||
                                      '—'}
                                  </td>
                                  <td className="py-3 px-3 text-slate-600">{formatQty(l.minutes)}</td>
                                  <td className="py-3 px-3 text-slate-600">
                                    {formatMoney(l.rate_snapshot ?? l.rateSnapshot)}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                        billable
                                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                          : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                      }`}
                                    >
                                      {billable ? 'نعم' : 'لا'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-slate-500">{l.note || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* القطع المصروفة */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 mb-4">
                      <Package className="w-5 h-5 text-blue-600" />
                      القطع المصروفة
                    </h3>
                    {issuedParts.length === 0 ? (
                      <p className="text-xs text-slate-400">لا توجد قطع مصروفة على هذه البطاقة.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100">
                              <th className="py-2.5 px-3 font-semibold">القطعة</th>
                              <th className="py-2.5 px-3 font-semibold">الكمية</th>
                              <th className="py-2.5 px-3 font-semibold">تكلفة الوحدة</th>
                              <th className="py-2.5 px-3 font-semibold">الحالة</th>
                              <th className="py-2.5 px-3 font-semibold">وقت الصرف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {issuedParts.map((p, idx) => (
                              <tr key={p.id || idx}>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-800">
                                    {p.part?.name || p.part_name || p.partName || p.name || '—'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {p.part?.sku || p.part_sku || p.partSku || p.sku || ''}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-600">{formatQty(p.quantity)}</td>
                                <td className="py-3 px-3 text-slate-600">
                                  {formatMoney(p.unit_cost_snapshot ?? p.unitCostSnapshot ?? p.unit_cost ?? p.unitCost)}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                    {p.status || '—'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-500">
                                  {formatDateTime(p.issued_at || p.issuedAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* العمود الجانبي */}
                <div className="space-y-6">
                  {/* انتقالات الحالة */}
                  <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-blue-400" />
                      انتقالات الحالة
                    </h3>
                    <div className="space-y-2">
                      {transitions.length > 0 ? (
                        transitions.map((t) => (
                          <button
                            key={t.to}
                            onClick={() => handleTransition(t.to)}
                            disabled={transitioningTo !== null}
                            className={`w-full py-3 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 ${t.cls}`}
                          >
                            {transitioningTo === t.to && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t.label}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">
                          لا توجد انتقالات متاحة من الحالة الحالية.
                        </p>
                      )}
                    </div>

                    {canCancel &&
                      (showCancel ? (
                        <div className="space-y-2 pt-3 border-t border-slate-800">
                          <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="سبب الإلغاء (مطلوب)..."
                            rows={2}
                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTransition('CANCELLED')}
                              disabled={!cancelReason.trim() || transitioningTo !== null}
                              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {transitioningTo === 'CANCELLED' && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              )}
                              تأكيد الإلغاء
                            </button>
                            <button
                              onClick={() => {
                                setShowCancel(false);
                                setCancelReason('');
                              }}
                              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
                            >
                              تراجع
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCancel(true)}
                          disabled={transitioningTo !== null}
                          className="w-full py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50"
                        >
                          إلغاء أمر العمل
                        </button>
                      ))}
                  </div>

                  {/* الإسناد والجدولة */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 mb-4">
                      <Wrench className="w-5 h-5 text-blue-600" />
                      الإسناد والجدولة
                    </h3>
                    <form onSubmit={handleSaveAssignment} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          الحوض (الباي)
                        </label>
                        <select
                          value={form.bayId}
                          onChange={(e) => setForm({ ...form, bayId: e.target.value })}
                          className="w-full px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                        >
                          <option value="">— بدون حوض —</option>
                          {bays.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.code ? `${b.code} — ${b.name || ''}` : b.name || b.code}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          الفني المسؤول
                        </label>
                        <select
                          value={form.technicianId}
                          onChange={(e) => setForm({ ...form, technicianId: e.target.value })}
                          className="w-full px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                        >
                          <option value="">— بدون فني —</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.display_name || u.displayName || u.name || u.email || ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            بداية الجدولة
                          </label>
                          <input
                            type="datetime-local"
                            value={form.scheduledStartAt}
                            onChange={(e) => setForm({ ...form, scheduledStartAt: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            نهاية الجدولة
                          </label>
                          <input
                            type="datetime-local"
                            value={form.scheduledEndAt}
                            onChange={(e) => setForm({ ...form, scheduledEndAt: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            التسليم المتوقع
                          </label>
                          <input
                            type="datetime-local"
                            value={form.expectedAt}
                            onChange={(e) => setForm({ ...form, expectedAt: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            قيمة التقدير
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.estimateAmount}
                            onChange={(e) => setForm({ ...form, estimateAmount: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={savingAssignment}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {savingAssignment ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        حفظ الإسناد
                      </button>

                    </form>
                  </div>

                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
