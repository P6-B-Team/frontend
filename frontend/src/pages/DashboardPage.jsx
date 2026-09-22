import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { 
  Wrench, 
  Package, 
  Activity, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import { 
  getWorkshopDashboard, 
  getInventoryDashboard, 
  getRecentJobs 
} from '../services/dashboardService';

export default function DashboardPage() {
  const [workshopData, setWorkshopData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [ws, inv, jobs] = await Promise.all([
          getWorkshopDashboard().catch(() => null),
          getInventoryDashboard().catch(() => null),
          getRecentJobs().catch(() => []),
        ]);

        setWorkshopData(ws);
        setInventoryData(inv);
        setRecentJobs(Array.isArray(jobs) ? jobs : jobs?.items || jobs?.data || []);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-600">جاري تحميل بيانات لوحة التحكم من قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  // --- 1️⃣ معالجة واستخلاص البيانات المباشرة من الباك إند (workshopData) ---
  const jobsByStage = workshopData?.jobsByStage || [];
  
  // تحويل مصفوفة الحالات إلى Object لسهولة الوصول المباشر
  const stageCounts = jobsByStage.reduce((acc, item) => {
    acc[item.status] = Number(item.count) || 0;
    return acc;
  }, {});

  const inProgressCount = stageCounts['IN_PROGRESS'] || 0;
  const qualityCheckCount = stageCounts['QUALITY_CHECK'] || 0;
  const receivedCount = stageCounts['RECEIVED'] || 0;
  const readyCount = stageCounts['READY'] || 0;
  const diagnosisCount = stageCounts['DIAGNOSIS'] || 0;
  const repairCount = stageCounts['REPAIR'] || 0;

  // إجمالي الأعمال النشطة (كل الحالات ما عدا المسلمة والمغلقة)
  const activeJobs = inProgressCount + qualityCheckCount + receivedCount + readyCount + diagnosisCount + repairCount;
  const totalStatusJobs = jobsByStage.reduce((sum, item) => sum + Number(item.count), 0);

  // 2. حساب الأحواض والمخزون
  const activeBays = activeJobs > 0 ? Math.min(activeJobs, 16) : 0;
  const totalBays = 16;
  const bayUtilization = totalBays > 0 ? ((activeBays / totalBays) * 100).toFixed(1) : '0.0';

  const lowStock = inventoryData?.lowStockCount ?? inventoryData?.alertsCount ?? 0;
  const jobsList = recentJobs || [];

  // مساعد الحالات والترجمة
  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { label: 'قيد التنفيذ', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'QUALITY_CHECK':
        return { label: 'فحص الجودة', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'RECEIVED':
        return { label: 'تم الاستلام', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'READY':
        return { label: 'جاهز للتسليم', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'DELIVERED':
        return { label: 'تم التسليم', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
      case 'DIAGNOSIS':
        return { label: 'فحص وتشخيص', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      case 'REPAIR':
        return { label: 'صيانة', bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
      default:
        return { label: status || 'معلق', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar />

        <main className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>الرئيسية</span>
              <span>/</span>
              <span className="text-slate-600 font-semibold">لوحة التحكم</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم</h1>
            <p className="text-xs text-slate-500 mt-1">
              إليك ملخص أداء الورشة والمخزون المباشر من قاعدة البيانات
            </p>
          </div>

          {/* 1️⃣ Top Stat Cards (موزعة على 3 أعمدة) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* الأعمال النشطة */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between h-44 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>مباشر</span>
                </span>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                  <Wrench className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">الأعمال النشطة</p>
                <h3 className="text-3xl font-extrabold tracking-tight">{activeJobs}</h3>
              </div>
            </div>

            {/* أصناف مخزون منخفض */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between h-44 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>تنبيه</span>
                </span>
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center backdrop-blur-md border border-amber-500/20">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">أصناف مخزون منخفض</p>
                <h3 className="text-3xl font-extrabold tracking-tight">{lowStock}</h3>
              </div>
            </div>

            {/* استغلالية الأحواض */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between h-44 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Activity className="w-3.5 h-3.5" />
                  <span>موزعة</span>
                </span>
                <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center backdrop-blur-md border border-purple-500/20">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">استغلالية الأحواض</p>
                <h3 className="text-3xl font-extrabold tracking-tight">{bayUtilization}%</h3>
              </div>
            </div>

          </div>

          {/* 2️⃣ Middle Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* حالة أعمال الورشة */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold">حالة أعمال الورشة</h3>
                <p className="text-xs text-slate-400">توزيع بطاقات العمل حسب المرحلة الحالية</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-3 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-slate-300">قيد التنفيذ ({inProgressCount + repairCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-slate-300">فحص الجودة والتشخيص ({qualityCheckCount + diagnosisCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-slate-300">تم الاستلام ({receivedCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-300">جاهز للتسليم ({readyCount})</span>
                  </div>
                </div>

                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-blue-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${(((inProgressCount + repairCount) / (totalStatusJobs || 1)) * 100) || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-purple-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${(((qualityCheckCount + diagnosisCount) / (totalStatusJobs || 1)) * 100) || 0}, 100`} strokeDashoffset={`-${(((inProgressCount + repairCount) / (totalStatusJobs || 1)) * 100) || 0}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-amber-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${((receivedCount / (totalStatusJobs || 1)) * 100) || 0}, 100`} strokeDashoffset={`-${((((inProgressCount + repairCount) + (qualityCheckCount + diagnosisCount)) / (totalStatusJobs || 1)) * 100) || 0}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${((readyCount / (totalStatusJobs || 1)) * 100) || 0}, 100`} strokeDashoffset={`-${((((inProgressCount + repairCount) + (qualityCheckCount + diagnosisCount) + receivedCount) / (totalStatusJobs || 1)) * 100) || 0}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-bold block">{totalStatusJobs}</span>
                    <span className="text-[10px] text-slate-400">إجمالي الأعمال</span>
                  </div>
                </div>
              </div>
            </div>

            {/* تفاصيل استغلالية الأحواض */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold">استغلالية الأحواض</h3>
                <p className="text-xs text-slate-400">نسبة الاستخدام اليومي للورشة</p>
              </div>

              <div className="my-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-extrabold tracking-tight">{bayUtilization}%</span>
                </div>

                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(Number(bayUtilization), 100)}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>{activeBays} حوض نشط</span>
                <span>من أصل {totalBays}</span>
              </div>
            </div>

          </div>

          {/* 3️⃣ جدول أحدث بطاقات العمل */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">آخر بطاقات العمل</h3>
                <p className="text-xs text-slate-400">أحدث كروت الصيانة المسجلة في الورشة</p>
              </div>
              <a href="/jobs" className="text-xs text-blue-400 font-bold hover:underline">
                عرض الكل
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-800 pb-3">
                    <th className="py-3 px-4 font-semibold">رقم البطاقة</th>
                    <th className="py-3 px-4 font-semibold">العميل / المركبة</th>
                    <th className="py-3 px-4 font-semibold">الفني</th>
                    <th className="py-3 px-4 font-semibold">الحالة</th>
                    <th className="py-3 px-4 font-semibold">التقدم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {jobsList.length > 0 ? (
                    jobsList.map((job) => {
                      const badge = getStatusBadge(job.status);
                      const jobProgress = job.progressPercentage ?? (job.status === 'DELIVERED' ? 100 : job.status === 'READY' ? 100 : job.status === 'QUALITY_CHECK' ? 85 : job.status === 'IN_PROGRESS' ? 50 : 20);
                      
                      return (
                        <tr key={job.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-4 px-4 font-bold text-blue-400">
                            {job.job_no || job.jobNumber || `JC-${job.id?.substring(0, 5)}`}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-white">{job.customerName || job.customer?.name || 'عميل الورشة'}</div>
                            <div className="text-[11px] text-slate-400">
                              {job.vehicleInfo || (job.vehicle ? `${job.vehicle.make || ''} ${job.vehicle.model || ''} · ${job.vehicle.plateNo || ''}` : 'مركبة غير محددة')}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-300">
                            {job.technicianName || job.technician?.displayName || 'غير محدد'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-300 w-8">{jobProgress}%</span>
                              <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-white h-full rounded-full" 
                                  style={{ width: `${jobProgress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500 text-xs">
                        لا توجد بطاقات عمل مسجلة حالياً في قاعدة البيانات.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}