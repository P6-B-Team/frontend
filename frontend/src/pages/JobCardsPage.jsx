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
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { getJobs } from '../services/jobService';

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

  const totalPages = meta?.totalPages ?? meta?.total_pages ?? null;
  const currentPage = meta?.page ?? page;

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
              <span className="text-slate-600 font-semibold">بطاقات العمل</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">بطاقات العمل</h1>
            <p className="text-xs text-slate-500 mt-1">
              جميع أوامر الصيانة المسجلة — تُقرأ مباشرة من قاعدة البيانات
            </p>
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
        </main>
      </div>
    </div>
  );
}
