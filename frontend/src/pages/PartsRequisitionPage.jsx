import { useState, useEffect, useCallback } from 'react';
import {
  Package, Wrench, LogOut, Search, PackagePlus,
  ClipboardList, ShieldCheck, Check, Loader2, AlertCircle, X
} from 'lucide-react';
import Toast from '../components/Toast';
import { getParts, getStores } from '../services/inventoryService';
import { getJobs, issuePartToJob } from '../services/jobService';

/* ------------------------------ أدوات مساعدة ------------------------------ */
const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const extractApiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

const partStock = (p) => Number(p?.total_on_hand ?? p?.totalOnHand ?? p?.on_hand ?? 0);

const partLabel = (p) => p?.name || p?.name_ar || p?.sku || 'قطعة';
const jobLabel = (j) =>
  `${j?.job_no || j?.jobNo || j?.id}${j?.vehicleInfo ? ` — ${j.vehicleInfo}` : ''}`;

// كروت الصيانة النشطة فقط (قابلة لصرف القطع عليها)
const ACTIVE_JOB_STATUSES = ['OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'ASSIGNED'];
const isActiveJob = (job) => {
  const st = String(job?.status || '').toUpperCase();
  if (!st) return true;
  return ACTIVE_JOB_STATUSES.includes(st);
};

export default function PartsRequisitionPage() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [parts, setParts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [requisition, setRequisition] = useState([]); // قائمة طلب الصرف (بدل سلة الشراء)
  const [selectedJobId, setSelectedJobId] = useState('');

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [loadingParts, setLoadingParts] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingParts(true);
        const data = await getParts({ page: 1, pageSize: 50 });
        setParts(toList(data));
      } catch (err) {
        console.error('Error loading parts:', err);
        setParts([]);
      } finally {
        setLoadingParts(false);
      }
    }

    async function loadJobCards() {
      try {
        setLoadingJobs(true);
        const data = await getJobs({ pageSize: 50 });
        setJobs(toList(data));
      } catch (err) {
        console.error('Error loading job cards:', err);
        setJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    }

    loadCatalog();
    loadJobCards();
  }, []);

  const activeJobs = jobs.filter(isActiveJob);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  // 🔒 الإضافة إلى قائمة طلب الصرف مع التحقق من الرصيد المتاح
  const addToRequisition = (part) => {
    const stock = partStock(part);

    setRequisition((prev) => {
      const exists = prev.find((item) => item.id === part.id);
      const currentQty = exists ? exists.qty : 0;

      if (currentQty >= stock) {
        setToast({ type: 'error', message: `الرصيد المتاح في المخزون لهذه القطعة (${stock}) فقط.` });
        return prev;
      }

      if (exists) {
        return prev.map((item) =>
          item.id === part.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [...prev, { ...part, qty: 1 }];
    });
  };

  const updateRequisitionQty = (id, qty) => {
    const next = Math.max(1, Number(qty) || 1);
    setRequisition((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const stock = partStock(item);
        return { ...item, qty: Math.min(next, Math.max(1, stock)) };
      })
    );
  };

  const removeFromRequisition = (id) => {
    setRequisition((prev) => prev.filter((item) => item.id !== id));
  };

  const requisitionTotalQty = requisition.reduce((a, c) => a + c.qty, 0);

  // 📦 إصدار طلب صرف القطع على كارت الصيانة المحدد — POST /jobs/:id/parts/issue لكل قطعة
  const handleIssueRequisition = async () => {
    if (isSubmittingOrder) return;
    if (!selectedJobId) {
      setToast({ type: 'error', message: 'يرجى اختيار كارت الصيانة قبل إصدار طلب الصرف.' });
      return;
    }
    if (requisition.length === 0) {
      setToast({ type: 'error', message: 'قائمة الصرف فارغة — أضف قطعة واحدة على الأقل من الكتالوج.' });
      return;
    }

    try {
      setIsSubmittingOrder(true);

      // المخزن الافتراضي الأول (سعر البيع يُقرأ من الكتالوج في الباك إند)
      let defaultStoreId = null;
      try {
        const stores = toList(await getStores());
        defaultStoreId = stores[0]?.id || null;
      } catch (storeErr) {
        console.warn('تعذر جلب المخازن — سيُعتمد على المخزن الافتراضي في الباك إند:', storeErr);
      }

      const issued = [];
      const failed = [];
      for (const item of requisition) {
        try {
          await issuePartToJob(selectedJobId, {
            partId: item.id,
            storeId: item.storeId || defaultStoreId,
            quantity: item.qty,
          });
          issued.push(item);
        } catch (itemErr) {
          console.error('Part issue error:', itemErr?.response?.data || itemErr);
          failed.push({ part: partLabel(item), reason: extractApiError(itemErr, 'خطأ غير معروف') });
        }
      }

      // تحديث الأرصدة محلياً للقطع المصروفة بنجاح
      if (issued.length > 0) {
        const issuedIds = new Set(issued.map((i) => i.id));
        setParts((prevParts) =>
          prevParts.map((p) => {
            if (!issuedIds.has(p.id)) return p;
            const spent = issued.find((i) => i.id === p.id)?.qty || 0;
            const updatedStock = Math.max(0, partStock(p) - spent);
            return { ...p, total_on_hand: updatedStock, totalOnHand: updatedStock, on_hand: updatedStock };
          })
        );
      }

      const jobRef = jobLabel(activeJobs.find((j) => String(j.id) === String(selectedJobId)) || {});
      if (issued.length > 0 && failed.length === 0) {
        setRequisition([]);
        setToast({ type: 'success', message: `تم إصدار طلب الصرف (${issued.length} قطعة) على كارت الصيانة ${jobRef} وخصمها من المخزون.` });
      } else if (issued.length > 0 && failed.length > 0) {
        setRequisition((prev) => prev.filter((r) => issued.some((i) => i.id === r.id)));
        setToast({ type: 'error', message: `تم صرف ${issued.length} قطعة، وفشل ${failed.length}: ${failed.map((f) => f.part).join('، ')}.` });
      } else {
        setToast({ type: 'error', message: `تعذر إصدار طلب الصرف: ${failed[0]?.reason || 'خطأ من السيرفر.'}` });
      }
    } catch (err) {
      console.error('Requisition submission error:', err);
      setToast({ type: 'error', message: extractApiError(err, 'تعذر إصدار طلب الصرف. حاول مرة أخرى.') });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const categories = ['ALL', ...new Set(parts.map((p) => p.category).filter(Boolean))];

  const filteredParts = parts.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.name_ar?.includes(search);
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const userName = user.displayName || user.name || user.email || '';

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">
      <Toast toast={toast} onClose={closeToast} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center font-bold border border-blue-500/20">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                طلب صرف قطع الغيار والكتالوج الداخلي
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                  استخدام داخلي — الورشة
                </span>
              </h1>
              {userName && (
                <p className="text-xs text-slate-500">مرحباً، {userName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeTab === 'catalog' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كتالوج القطع
              </button>
              <button
                onClick={() => setActiveTab('job-cards')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'job-cards' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                كروت الصيانة النشطة ({activeJobs.length})
              </button>
            </nav>

            <button
              onClick={handleLogout}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث باسم قطعة الغيار، الكود (SKU)..."
                    className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>

                {categories.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                          selectedCategory === cat
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {cat === 'ALL' ? 'جميع التصنيفات' : cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loadingParts ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-bold">جاري تحميل المنتجات المتاحة من المخزون...</p>
                </div>
              ) : filteredParts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs font-bold shadow-sm">
                  لا توجد قطع غيار مطابقة للبحث حالياً.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredParts.map((part) => {
                    const stock = Number(part.total_on_hand ?? part.totalOnHand ?? part.on_hand ?? 0);
                    const reqItem = requisition.find((c) => c.id === part.id);
                    const inReqQty = reqItem ? reqItem.qty : 0;
                    const isMaxReached = inReqQty >= stock;
                    const inStock = stock > 0;

                    return (
                      <div
                        key={part.id}
                        className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            {part.category && (
                              <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                                {part.category}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                inStock
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                            >
                              {inStock ? `متوفر (${stock})` : 'غير متوفر'}
                            </span>
                          </div>

                          <div className="w-12 h-12 bg-white/10 text-blue-400 rounded-2xl flex items-center justify-center mb-3 border border-white/10">
                            <Package className="w-6 h-6" />
                          </div>

                          <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">
                            {part.name || part.name_ar}
                          </h3>
                          <p className="text-[11px] text-slate-400 mb-3">
                            SKU: {part.sku || '—'}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-2">
                          <div>
                            <span className="text-[10px] text-slate-400 font-medium block">المصروف من القائمة</span>
                            <span className="text-base font-extrabold text-blue-400">
                              {inReqQty > 0 ? `${inReqQty} / ${stock}` : '—'}
                            </span>
                          </div>

                          <button
                            onClick={() => addToRequisition(part)}
                            disabled={!inStock || isMaxReached}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            {isMaxReached ? 'أقصى كمية' : 'إضافة للصرف'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl sticky top-28 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                    قائمة طلب الصرف
                  </h3>
                  <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    {requisitionTotalQty} قطعة
                  </span>
                </div>

                {/* اختيار كارت الصيانة — إلزامي */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    اختر كارت الصيانة <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">— اختر كارت الصيانة —</option>
                    {loadingJobs ? (
                      <option value="" disabled>جاري تحميل كروت الصيانة...</option>
                    ) : activeJobs.length === 0 ? (
                      <option value="" disabled>لا توجد كروت صيانة نشطة</option>
                    ) : (
                      activeJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {jobLabel(job)}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {requisition.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    قائمة الصرف فارغة. اختر القطع من الكتالوج لصرفها على كارت الصيانة.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {requisition.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-white flex-1">{partLabel(item)}</p>
                          <button
                            onClick={() => removeFromRequisition(item.id)}
                            className="p-1 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg border border-red-500/20"
                            title="إزالة"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-slate-400">
                            الرصيد المتاح: {Number(item.total_on_hand ?? item.totalOnHand ?? item.on_hand ?? 0)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateRequisitionQty(item.id, e.target.value)}
                              className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 text-center"
                            />
                            <span className="text-[10px] text-slate-400">قطعة</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {requisition.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">إجمالي القطع المطلوبة</span>
                      <span className="text-lg font-black text-blue-400">{requisitionTotalQty}</span>
                    </div>

                    <button
                      onClick={handleIssueRequisition}
                      disabled={isSubmittingOrder || !selectedJobId}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSubmittingOrder ? 'جاري إصدار طلب الصرف...' : 'إصدار طلب صرف للمخزن'}
                    </button>

                    {!selectedJobId && (
                      <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        يجب اختيار كارت الصيانة أولاً لإصدار الصرف.
                      </p>
                    )}
                  </div>
                )}

                <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    صرف ذري من المخزون
                  </div>
                  <p className="text-slate-400">
                    تُخصم القطع مباشرة على كارت الصيانة المحدد (خصم ذري يمنع السالب) وتُحتسب ضمن أمر العمل.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'job-cards' && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                كروت الصيانة النشطة — أوامر العمل الجارية
              </h3>
              <p className="text-xs text-slate-400 mt-1">اختر كارت الصيانة من قائمة الصرف لإسناد قطع الغيار إليه</p>
            </div>

            {loadingJobs ? (
              <div className="py-12 text-center">
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin mx-auto" />
              </div>
            ) : activeJobs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold">
                لا توجد كروت صيانة نشطة حالياً في قاعدة البيانات.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setActiveTab('catalog');
                    }}
                    className={`p-5 rounded-2xl border text-right flex flex-col justify-between space-y-4 transition ${
                      String(selectedJobId) === String(job.id)
                        ? 'bg-blue-600/20 border-blue-500/50 ring-1 ring-blue-500/40'
                        : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-blue-400">
                          {job.job_no || job.jobNo || job.id}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">
                          {job.vehicleInfo || (job.vehicle ? `${job.vehicle.make || ''} ${job.vehicle.model || ''}`.trim() : '')}
                        </h4>
                      </div>
                      {job.status && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-bold">
                          {job.status}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      {(job.service_type || job.serviceType) && (
                        <div className="flex justify-between">
                          <span>نوع الخدمة:</span>
                          <span className="text-slate-200 font-bold">{job.service_type || job.serviceType}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>الشكوى:</span>
                        <span className="text-slate-200">{job.complaint || '—'}</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {String(selectedJobId) === String(job.id)
                        ? 'الكارت المحدد لطلب الصرف'
                        : 'اختيار هذا الكارت لطلب الصرف'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}