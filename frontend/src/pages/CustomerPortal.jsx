import { useState, useEffect } from 'react';
import { ShoppingBag, Wrench, LogOut, Package } from 'lucide-react';
import api from '../services/api';

export default function CustomerPortal() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchCustomerJobs = async () => {
      try {
        const res = await api.get('/jobs?pageSize=5');
        setJobs(res.data?.data || []);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerJobs();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between bg-slate-800 p-5 rounded-2xl mb-8 border border-slate-700 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xl border border-emerald-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">بوابة خدمات العملاء والمخزون</h1>
            <p className="text-xs text-slate-400">مرحباً بك، {user.displayName || user.name || user.fullName || 'عميل الورشة'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-xl border border-red-500/20 transition"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>

      {/* Action Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              طلب قطع غيار صيانة
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            يمكنك طلب واستعراض قطع الغيار المتاحة في المخزون وحجزها مباشرة لورشتك أو لسيارتك.
          </p>
          <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition">
            تصفح كارت قطع الغيار
          </button>
        </div>

        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-400" />
              متابعة حالة صيانة المركبة
            </h3>
          </div>
          {loading ? (
            <p className="text-xs text-slate-400">جاري التحميل...</p>
          ) : jobs.length > 0 ? (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="p-3 bg-slate-800 rounded-lg text-xs flex justify-between">
                  <span>{job.title || `أمر صيانة #${job.id}`}</span>
                  <span className="text-emerald-400">{job.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              لا توجد طلبات صيانة نشطة حالياً.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}