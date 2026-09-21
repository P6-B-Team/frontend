import { 
  LayoutDashboard, 
  BarChart3, 
  Car, 
  ClipboardList, 
  Wrench, 
  Boxes, 
  ShoppingCart, 
  Gauge,
  Sparkles,
  FileText
} from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col justify-between h-screen sticky top-0 font-sans text-right select-none">
      <div>
        {/* Logo Section */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">مهنة PRO</h1>
              <p className="text-[10px] text-slate-400 font-medium">نظام إدارة الورش والتدريب</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-4 space-y-6">
          {/* Main Section */}
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 mb-2">نظرة عامة</p>
            <nav className="space-y-1">
              <a
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm transition"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>لوحة التحكم</span>
              </a>
              <a
                href="#analytics"
                className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition"
              >
                <BarChart3 className="w-5 h-5 text-slate-400" />
                <span>التحليلات والتقارير</span>
              </a>
            </nav>
          </div>

          {/* Workshop Management */}
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 mb-2">إدارة الورشة</p>
            <nav className="space-y-1">
              <a
                href="#reception"
                className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition"
              >
                <Car className="w-5 h-5 text-slate-400" />
                <span>استقبال المركبات</span>
              </a>
              <a
                href="#jobs"
                className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition"
              >
                <ClipboardList className="w-5 h-5 text-slate-400" />
                <span>بطاقات العمل</span>
              </a>
              <a
                href="#schedule"
                className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition"
              >
                <Wrench className="w-5 h-5 text-slate-400" />
                <span>جدول الورشة</span>
              </a>
            </nav>
          </div>

          {/* Inventory & Purchasing */}
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 mb-2">المخزون والمشتريات</p>
            <nav className="space-y-1">
              <a
                href="#inventory"
                className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition"
              >
                <Boxes className="w-5 h-5 text-slate-400" />
                <span>المخزون وقطع الغيار</span>
              </a>
              <a
                href="#purchases"
                className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition"
              >
                <ShoppingCart className="w-5 h-5 text-slate-400" />
                <span>أوامر الشراء</span>
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* AI Assistant Widget Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">مساعد مهنة الذكي</h4>
              <p className="text-[10px] text-amber-700">3 توصيات جديدة</p>
            </div>
          </div>
          <button className="w-full py-2 bg-white hover:bg-amber-100/50 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition">
            <span>عرض التوصيات</span>
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}