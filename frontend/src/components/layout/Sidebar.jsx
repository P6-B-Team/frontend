import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  ShoppingCart,
  Gauge,
  Sparkles,
  FileText,
  LogOut
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const linkCls = (active) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
      active ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'
    }`;
  const iconCls = (active) => `w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`;

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

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
              <Link to="/dashboard" className={linkCls(isActive('/dashboard'))}>
                <LayoutDashboard className={iconCls(isActive('/dashboard'))} />
                <span>لوحة التحكم</span>
              </Link>
            </nav>
          </div>

          {/* Workshop Management */}
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 mb-2">إدارة الورشة</p>
            <nav className="space-y-1">
              <Link to="/jobs" className={linkCls(isActive('/jobs'))}>
                <ClipboardList className={iconCls(isActive('/jobs'))} />
                <span>بطاقات العمل</span>
              </Link>
            </nav>
          </div>

          {/* Inventory & Purchasing */}
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 mb-2">المخزون والمشتريات</p>
            <nav className="space-y-1">
              <Link to="/inventory" className={linkCls(isActive('/inventory'))}>
                <Boxes className={iconCls(isActive('/inventory'))} />
                <span>المخزون وقطع الغيار</span>
              </Link>
              <Link to="/purchase-orders" className={linkCls(isActive('/purchase-orders'))}>
                <ShoppingCart className={iconCls(isActive('/purchase-orders'))} />
                <span>أوامر الشراء</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Footer Section (AI Widget + Logout Button) */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* AI Widget */}
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

        {/* LogOut Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}