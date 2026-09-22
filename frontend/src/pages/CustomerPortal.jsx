import { useState, useEffect } from 'react';
import { 
  ShoppingBag, Wrench, LogOut, Package, Search, 
  ShoppingCart, ShieldCheck, Check, Loader2
} from 'lucide-react';
import { getParts } from '../services/inventoryService';
import { getJobs } from '../services/jobService';

export default function CustomerPortal() {
  const [activeTab, setActiveTab] = useState('store');
  const [parts, setParts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  const [loadingParts, setLoadingParts] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    async function loadStoreData() {
      try {
        setLoadingParts(true);
        const data = await getParts({ page: 1, pageSize: 50 });
        const list = Array.isArray(data) ? data : data?.items || data?.rows || [];
        setParts(list);
      } catch (err) {
        console.error('Error loading parts:', err);
        setParts([]);
      } finally {
        setLoadingParts(false);
      }
    }

    async function loadCustomerJobs() {
      try {
        setLoadingJobs(true);
        const data = await getJobs({ pageSize: 10 });
        const list = Array.isArray(data) ? data : data?.items || data?.rows || [];
        setJobs(list);
      } catch (err) {
        console.error('Error loading jobs:', err);
        setJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    }

    loadStoreData();
    loadCustomerJobs();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  // 🔒 دالة الإضافة إلى السلة مع التحقق من حد المخزون المتاح
  const addToCart = (part) => {
    const stock = Number(part.total_on_hand ?? part.totalOnHand ?? part.on_hand ?? 0);

    setCart((prev) => {
      const exists = prev.find((item) => item.id === part.id);
      const currentQty = exists ? exists.qty : 0;

      if (currentQty >= stock) {
        alert(`عذراً! الكمية المتاحة في المخزون لهذا المنتج هي (${stock}) فقط.`);
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

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const price = Number(item.sell_price ?? item.sellPrice ?? 0);
    return sum + price * item.qty;
  }, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setOrderSuccess(true);
    setCart([]);
    setTimeout(() => setOrderSuccess(false), 4000);
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
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center font-bold border border-blue-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                متجر قطع الغيار والصيانة
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                  مهنة Store
                </span>
              </h1>
              {userName && (
                <p className="text-xs text-slate-500">مرحباً بك، {userName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('store')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeTab === 'store' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تصفح المنتجات
              </button>
              <button
                onClick={() => setActiveTab('my-jobs')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'my-jobs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                طلبات الصيانة ({jobs.length})
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
        {orderSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-3 text-xs font-bold">
            <Check className="w-5 h-5 shrink-0" />
            <span>تم استلام طلب قطع الغيار بنجاح! سيقوم فريق الورشة بتجهيز الطلب والتواصل معك.</span>
          </div>
        )}

        {activeTab === 'store' && (
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
                    const price = Number(part.sell_price ?? part.sellPrice ?? 0);
                    const stock = Number(part.total_on_hand ?? part.totalOnHand ?? part.on_hand ?? 0);
                    const cartItem = cart.find((c) => c.id === part.id);
                    const inCartQty = cartItem ? cartItem.qty : 0;
                    const isMaxReached = inCartQty >= stock;
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
                            <span className="text-[10px] text-slate-400 font-medium block">السعر</span>
                            <span className="text-base font-extrabold text-blue-400">
                              {price > 0 ? `${price.toLocaleString('en-US')} ج.م` : 'حسب الطلب'}
                            </span>
                          </div>

                          <button
                            onClick={() => addToCart(part)}
                            disabled={!inStock || isMaxReached}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {isMaxReached ? 'أقصى كمية' : 'إضافة'}
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
                    <ShoppingCart className="w-5 h-5 text-blue-400" />
                    سلة الحجز
                  </h3>
                  <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    {cart.reduce((a, c) => a + c.qty, 0)} عناصر
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    السلة فارغة حالياً. اختر القطع التي تحتاجها وحجزها مباشرة.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs"
                      >
                        <div>
                          <p className="font-bold text-white">{item.name || item.name_ar}</p>
                          <p className="text-[10px] text-blue-400">
                            {item.qty} × {Number(item.sell_price || item.sellPrice || 0).toLocaleString('en-US')} ج.م
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 hover:text-red-300 text-[11px] font-bold px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/20"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {cart.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">الإجمالي التقديري</span>
                      <span className="text-lg font-black text-blue-400">
                        {cartTotal.toLocaleString('en-US')} ج.م
                      </span>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/30 transition"
                    >
                      تأكيد حجز قطع الغيار
                    </button>
                  </div>
                )}

                <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ضمان واستلام مباشر
                  </div>
                  <p className="text-slate-400">يتم حجز القطع من أرصدة المخزون وتأكيدها عند زيارة الورشة.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my-jobs' && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                سجل طلبات الصيانة والمركبات
              </h3>
              <p className="text-xs text-slate-400 mt-1">متابعة دقيقة وحية لحالة أوامر العمل داخل الورشة</p>
            </div>

            {loadingJobs ? (
              <div className="py-12 text-center">
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin mx-auto" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold">
                لا توجد كروت صيانة نشطة لك حالياً في قاعدة البيانات.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex flex-col justify-between space-y-4"
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}