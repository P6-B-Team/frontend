import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  Search,
  ClipboardList,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  User,
  Car,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Toast from '../components/Toast';
import {
  getJobs,
  createJob,
  getCustomers,
  createCustomer,
  getCustomerVehicles,
  createVehicle,
} from '../services/jobService';

// حالات بطاقة العمل كما هي معرفة في آلة الحالات بالباك إند
const JOB_STATUSES = [
  { value: 'RECEIVED', label: 'تم الاستلام' },
  { value: 'IN_PROGRESS', label: 'قيد التنفيذ' },
  { value: 'QUALITY_CHECK', label: 'فحص الجودة' },
  { value: 'READY', label: 'جاهز للتسليم' },
  { value: 'DELIVERED', label: 'تم التسليم' },
  { value: 'CANCELLED', label: 'ملغي' },
];

const getStatusBadge = (status) => {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: 'قيد التنفيذ', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'QUALITY_CHECK':
      return { label: 'فحص الجودة', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    case 'RECEIVED':
      return { label: 'تم الاستلام', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    case 'READY':
      return { label: 'جاهز للتسليم', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'DELIVERED':
      return { label: 'تم التسليم', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    case 'CANCELLED':
      return { label: 'ملغي', cls: 'bg-red-500/20 text-red-400 border-red-500/30' };
    default:
      return { label: status || '—', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
  }
};

const getPriorityBadge = (priority) => {
  switch ((priority || '').toUpperCase()) {
    case 'URGENT':
      return { label: 'عاجل', cls: 'bg-red-500/20 text-red-300 border-red-500/30' };
    case 'HIGH':
      return { label: 'مرتفع', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 'LOW':
      return { label: 'منخفض', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    case 'NORMAL':
      return { label: 'عادي', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    default:
      return { label: priority || '—', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
  }
};

// تطبيع قائمة مهما كان شكل الاستجابة (مصفوفة أو { items, meta })
const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const extractMeta = (payload) => {
  if (Array.isArray(payload)) return null;
  return payload?.meta || payload?.pagination || null;
};

const extractApiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

const inputCls =
  'w-full px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition';

const labelCls = 'block text-[11px] font-bold text-slate-600 mb-1.5';

const segCls = (active) =>
  `flex-1 py-2 rounded-xl text-[11px] font-bold transition ${
    active
      ? 'bg-blue-50 text-blue-600 border border-blue-200'
      : 'bg-slate-50 text-slate-500 border border-transparent hover:bg-slate-100'
  }`;

const formatDateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ar-EG');
};

export default function JobCardsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // بحث بتأخير بسيط لتقليل الطلبات
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getJobs({
        status: status || undefined,
        q: search || undefined,
        page,
        pageSize: 10,
      });
      setJobs(toList(payload));
      setMeta(extractMeta(payload));
    } catch (err) {
      console.error('Error loading jobs:', err);
      setJobs([]);
      setMeta(null);
      setError('تعذر تحميل بطاقات العمل من السيرفر. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    async function run() {
      await loadJobs();
    }
    run();
  }, [loadJobs]);

  // ===== نافذة إنشاء بطاقة عمل جديدة (WST-FR-03 / WST-FR-04) =====
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  const [customerMode, setCustomerMode] = useState('select'); // 'select' | 'new'
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  const [vehicleMode, setVehicleMode] = useState('select'); // 'select' | 'new'
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [newVehicle, setNewVehicle] = useState({
    plateNo: '',
    vin: '',
    make: '',
    model: '',
    year: '',
    mileage: '',
  });

  const [complaint, setComplaint] = useState('');
  const [serviceTypeInput, setServiceTypeInput] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [receivedMileage, setReceivedMileage] = useState('');

  const closeToast = useCallback(() => setToast(null), []);
  const showToast = (type, message) => setToast({ type, message });

  const loadCustomers = useCallback(async (q) => {
    setCustomersLoading(true);
    try {
      const payload = await getCustomers({ q: q || undefined, page: 1, pageSize: 50 });
      setCustomers(toList(payload));
    } catch (err) {
      console.error('Error loading customers:', err);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  // تحميل العملاء عند فتح النافذة + بحث بتأخير
  useEffect(() => {
    if (!showCreateModal) return undefined;
    const timer = setTimeout(
      () => loadCustomers(customerQuery.trim()),
      customerQuery.trim() ? 400 : 0
    );
    return () => clearTimeout(timer);
  }, [showCreateModal, customerQuery, loadCustomers]);

  // تحميل مركبات العميل المختار من القائمة
  useEffect(() => {
    if (!showCreateModal || customerMode !== 'select' || !customerId) return undefined;
    let cancelled = false;
    async function run() {
      setVehiclesLoading(true);
      setVehicleId('');
      try {
        const payload = await getCustomerVehicles(customerId);
        if (!cancelled) setVehicles(toList(payload));
      } catch (err) {
        console.error('Error loading vehicles:', err);
        if (!cancelled) setVehicles([]);
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [showCreateModal, customerMode, customerId]);

  const openCreateModal = () => {
    setCustomerMode('select');
    setCustomerQuery('');
    setCustomerId('');
    setCustomers([]);
    setNewCustomer({ name: '', phone: '', email: '' });
    setVehicleMode('select');
    setVehicleId('');
    setVehicles([]);
    setNewVehicle({ plateNo: '', vin: '', make: '', model: '', year: '', mileage: '' });
    setComplaint('');
    setServiceTypeInput('');
    setPriority('NORMAL');
    setReceivedMileage('');
    setFormError(null);
    setShowCreateModal(true);
  };

  const switchCustomerMode = (mode) => {
    setCustomerMode(mode);
    setFormError(null);
    if (mode === 'new') {
      setVehicleMode('new');
      setVehicleId('');
    } else {
      setVehicleMode('select');
    }
  };

  const jobNo = (job) => job.job_no || job.jobNo || '';
  const customerName = (job) => job.customerName || job.customer?.name || job.customer_name || '';
  const vehicleLabel = (job) => {
    const make = job.vehicle?.make || job.vehicle_make || job.vehicleMake || '';
    const model = job.vehicle?.model || job.vehicle_model || job.vehicleModel || '';
    const plate =
      job.vehicle?.plate_no || job.vehicle?.plateNo || job.vehicle_plate_no || job.vehiclePlateNo || '';
    const title = [make, model].filter(Boolean).join(' ');
    return [title, plate].filter(Boolean).join(' · ');
  };
  const technicianName = (job) =>
    job.technicianName || job.technician?.displayName || job.technician?.name || job.technician_name || '';
  const serviceType = (job) => job.service_type || job.serviceType || '';

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (customerMode === 'new' && !newCustomer.name.trim()) {
      setFormError('اسم العميل الجديد مطلوب.');
      return;
    }
    if (customerMode === 'select' && !customerId) {
      setFormError('يرجى اختيار العميل من القائمة أو تسجيل عميل جديد.');
      return;
    }
    if (vehicleMode === 'select' && !vehicleId) {
      setFormError('يرجى اختيار المركبة من قائمة مركبات العميل أو تسجيل مركبة جديدة.');
      return;
    }
    if (
      vehicleMode === 'new' &&
      (!newVehicle.plateNo.trim() ||
        !newVehicle.vin.trim() ||
        !newVehicle.make.trim() ||
        !newVehicle.model.trim())
    ) {
      setFormError('حقول المركبة مطلوبة: رقم اللوحة، رقم الهيكل (VIN)، الماركة، والموديل.');
      return;
    }
    if (!complaint.trim()) {
      setFormError('وصف شكوى العميل مطلوب.');
      return;
    }
    if (!serviceTypeInput.trim()) {
      setFormError('نوع الخدمة مطلوب.');
      return;
    }
    if (
      receivedMileage === '' ||
      Number.isNaN(Number(receivedMileage)) ||
      Number(receivedMileage) < 0
    ) {
      setFormError('عداد الكيلومترات عند الاستلام مطلوب ويجب أن يكون رقماً صحيحاً.');
      return;
    }

    setSubmitting(true);
    try {
      let resolvedCustomerId = customerId;
      if (customerMode === 'new') {
        const createdCustomer = await createCustomer({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim() || undefined,
          email: newCustomer.email.trim() || undefined,
        });
        resolvedCustomerId = createdCustomer?.id ?? createdCustomer?.customer?.id ?? '';
        if (!resolvedCustomerId) {
          showToast('error', 'تم إنشاء العميل لكن لم يُرجع المعرّف — يرجى إعادة المحاولة.');
          return;
        }
      }

      let resolvedVehicleId = vehicleId;
      if (vehicleMode === 'new') {
        const createdVehicle = await createVehicle(resolvedCustomerId, {
          plateNo: newVehicle.plateNo.trim(),
          vin: newVehicle.vin.trim(),
          make: newVehicle.make.trim(),
          model: newVehicle.model.trim(),
          year: newVehicle.year.trim() || undefined,
          mileage: newVehicle.mileage.trim() || undefined,
        });
        resolvedVehicleId = createdVehicle?.id ?? createdVehicle?.vehicle?.id ?? '';
        if (!resolvedVehicleId) {
          showToast('error', 'تم إنشاء المركبة لكن لم يُرجع المعرّف — يرجى إعادة المحاولة.');
          return;
        }
      }

      const createdJob = await createJob({
        customerId: resolvedCustomerId,
        vehicleId: resolvedVehicleId,
        complaint: complaint.trim(),
        serviceType: serviceTypeInput.trim(),
        priority,
        receivedMileage: Number(receivedMileage),
      });

      setShowCreateModal(false);
      const newJobNo = createdJob?.job_no || createdJob?.jobNo;
      showToast(
        'success',
        newJobNo ? `تم إنشاء بطاقة العمل ${newJobNo} بنجاح.` : 'تم إنشاء بطاقة العمل بنجاح.'
      );

      // تحديث القائمة ديناميكياً بعد الإنشاء
      if (page !== 1) {
        setPage(1);
      } else {
        await loadJobs();
      }
    } catch (err) {
      console.error('Create job error:', err);
      showToast(
        'error',
        extractApiError(err, 'تعذر إنشاء بطاقة العمل من السيرفر. يرجى المحاولة مرة أخرى.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = meta?.totalPages ?? meta?.total_pages ?? null;
  const currentPage = meta?.page ?? page;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar />

        <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* العنوان */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span>الرئيسية</span>
                <span>/</span>
                <span className="text-slate-600 font-semibold">بطاقات العمل</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">بطاقات العمل</h1>
              <p className="text-xs text-slate-500 mt-1">
                جميع أوامر الصيانة المسجلة — تُقرأ مباشرة من قاعدة البيانات
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              بطاقة عمل جديدة
            </button>
          </div>

          {/* أدوات التصفية والبحث */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث برقم البطاقة أو اسم العميل أو رقم اللوحة..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            >
              <option value="">كل الحالات</option>
              {JOB_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              onClick={loadJobs}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              <RotateCcw className="w-4 h-4" />
              تحديث
            </button>
          </div>

          {/* خطأ التحميل */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                onClick={loadJobs}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* جدول بطاقات العمل */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">قائمة بطاقات العمل</h3>
                  <p className="text-xs text-slate-400">اضغط على أي بطاقة لعرض تفاصيلها الكاملة</p>
                </div>
              </div>
              {meta?.total !== undefined && meta?.total !== null && (
                <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                  {meta.total} بطاقة
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-800">
                    <th className="py-3 px-4 font-semibold">رقم البطاقة</th>
                    <th className="py-3 px-4 font-semibold">العميل / المركبة</th>
                    <th className="py-3 px-4 font-semibold">نوع الخدمة</th>
                    <th className="py-3 px-4 font-semibold">الأولوية</th>
                    <th className="py-3 px-4 font-semibold">الحالة</th>
                    <th className="py-3 px-4 font-semibold">الفني</th>
                    <th className="py-3 px-4 font-semibold">تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <span className="text-sm text-slate-400 font-bold">
                              جاري تحميل بطاقات العمل من قاعدة البيانات...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : jobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                              <ClipboardList className="w-6 h-6 text-slate-500" />
                            </div>
                            <span className="text-sm text-slate-400 font-bold">لا توجد بطاقات عمل مطابقة للبحث الحالي</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => {
                        const statusBadge = getStatusBadge(job.status);
                        const priorityBadge = getPriorityBadge(job.priority);
                        return (
                          <tr
                            key={job.id}
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            className="hover:bg-slate-800/40 transition cursor-pointer"
                          >
                            <td className="py-4 px-4 font-bold text-blue-400">{jobNo(job) || '—'}</td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-white">{customerName(job) || '—'}</div>
                              <div className="text-[11px] text-slate-400">{vehicleLabel(job) || '—'}</div>
                            </td>
                            <td className="py-4 px-4 font-medium text-slate-300">{serviceType(job) || '—'}</td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${priorityBadge.cls}`}>
                                {priorityBadge.label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-medium text-slate-300">{technicianName(job) || '—'}</td>
                            <td className="py-4 px-4 text-slate-400">
                              {formatDateTime(job.created_at || job.createdAt) || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}

                </tbody>
              </table>
            </div>

            {/* ترقيم الصفحات */}
            {totalPages && totalPages > 1 ? (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </button>
                <span className="text-xs text-slate-400 font-bold">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            ) : null}

          </div>

          {/* نافذة إنشاء بطاقة عمل جديدة */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => {
                  if (!submitting) setShowCreateModal(false);
                }}
              />
              <form
                onSubmit={handleCreateJob}
                className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5"
              >
                {/* عنوان النافذة */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">بطاقة عمل جديدة</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      سجّل العميل والمركبة والشكوى — تُحفظ مباشرة في قاعدة البيانات
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={submitting}
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition disabled:opacity-40"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 flex items-center gap-2 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{formError}</span>
                  </div>
                )}

                {/* العميل */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500">العميل</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => switchCustomerMode('select')}
                      className={segCls(customerMode === 'select')}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        اختيار عميل موجود
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchCustomerMode('new')}
                      className={segCls(customerMode === 'new')}
                    >
                      تسجيل عميل جديد
                    </button>
                  </div>

                  {customerMode === 'select' ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={customerQuery}
                          onChange={(e) => setCustomerQuery(e.target.value)}
                          placeholder="ابحث عن عميل بالاسم أو رقم الهاتف..."
                          className={`${inputCls} pr-9 pl-9`}
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                        {customersLoading && (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute left-3 top-3" />
                        )}
                      </div>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">— اختر العميل —</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.phone ? ` — ${c.phone}` : ''}
                          </option>
                        ))}
                      </select>
                      {customers.length === 0 && !customersLoading && (
                        <p className="text-[11px] text-slate-400">
                          لا يوجد عملاء مطابقون — يمكنك تسجيل عميل جديد من الزر أعلاه.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>اسم العميل *</label>
                        <input
                          type="text"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          placeholder="الاسم الكامل"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>رقم الهاتف</label>
                        <input
                          type="text"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          placeholder="01xxxxxxxxx"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>البريد الإلكتروني</label>
                        <input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          placeholder="name@example.com"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* المركبة */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500">المركبة</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={customerMode === 'new'}
                      onClick={() => setVehicleMode('select')}
                      className={`${segCls(vehicleMode === 'select')} ${
                        customerMode === 'new' ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <Car className="w-3.5 h-3.5" />
                        اختيار مركبة موجودة
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleMode('new')}
                      className={segCls(vehicleMode === 'new')}
                    >
                      تسجيل مركبة جديدة
                    </button>
                  </div>

                  {vehicleMode === 'select' ? (
                    !customerId ? (
                      <p className="text-[11px] text-slate-400">
                        اختر العميل أولاً لعرض مركباته المسجلة.
                      </p>
                    ) : vehiclesLoading ? (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold py-2">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        جاري تحميل مركبات العميل...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={vehicleId}
                          onChange={(e) => {
                            const vid = e.target.value;
                            setVehicleId(vid);
                            const v = vehicles.find((x) => String(x.id) === vid);
                            const mileage = v?.mileage;
                            if (mileage !== undefined && mileage !== null && mileage !== '') {
                              setReceivedMileage(String(mileage));
                            }
                          }}
                          className={inputCls}
                        >
                          <option value="">— اختر المركبة —</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {[v.make, v.model].filter(Boolean).join(' ')} —{' '}
                              {v.plate_no || v.plateNo || ''}
                            </option>
                          ))}
                        </select>
                        {vehicles.length === 0 && (
                          <p className="text-[11px] text-slate-400">
                            لا توجد مركبات مسجلة لهذا العميل — سجّل مركبة جديدة من الزر أعلاه.
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>رقم اللوحة *</label>
                        <input
                          type="text"
                          value={newVehicle.plateNo}
                          onChange={(e) => setNewVehicle({ ...newVehicle, plateNo: e.target.value })}
                          placeholder="أ ب ج 1234"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>رقم الهيكل (VIN) *</label>
                        <input
                          type="text"
                          value={newVehicle.vin}
                          onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                          placeholder="17 خانة"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>الماركة *</label>
                        <input
                          type="text"
                          value={newVehicle.make}
                          onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                          placeholder="تويوتا / نيسان..."
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>الموديل *</label>
                        <input
                          type="text"
                          value={newVehicle.model}
                          onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                          placeholder="كورولا / صني..."
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>سنة الصنع</label>
                        <input
                          type="number"
                          min="1900"
                          max="2100"
                          value={newVehicle.year}
                          onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                          placeholder="2020"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>العداد (كم)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={newVehicle.mileage}
                          onChange={(e) => setNewVehicle({ ...newVehicle, mileage: e.target.value })}
                          placeholder="0"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* تفاصيل الخدمة */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500">تفاصيل الخدمة</p>
                  <div>
                    <label className={labelCls}>شكوى العميل *</label>
                    <textarea
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                      rows={3}
                      placeholder="صف المشكلة التي أبلغ عنها العميل..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>نوع الخدمة *</label>
                      <input
                        type="text"
                        value={serviceTypeInput}
                        onChange={(e) => setServiceTypeInput(e.target.value)}
                        placeholder="مثال: صيانة دورية"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>الأولوية *</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className={inputCls}
                      >
                        <option value="LOW">منخفض</option>
                        <option value="NORMAL">عادي</option>
                        <option value="HIGH">مرتفع</option>
                        <option value="URGENT">عاجل</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>عداد الكيلومترات عند الاستلام *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={receivedMileage}
                      onChange={(e) => setReceivedMileage(e.target.value)}
                      placeholder="0"
                      className={inputCls}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      يُملأ تلقائياً من عداد المركبة المختارة ويمكن تعديله.
                    </p>
                  </div>
                </div>

                {/* أزرار النافذة */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {submitting ? 'جاري الإنشاء...' : 'إنشاء بطاقة العمل'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={submitting}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          <Toast toast={toast} onClose={closeToast} />
        </main>
      </div>
    </div>
  );
}
