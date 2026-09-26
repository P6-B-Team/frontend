import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  ShoppingCart,
  Zap,
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
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col justify-between h-screen sticky top-0 font-sans text-right select-none flex-shrink-0">
      <div>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>

            <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              مهنة
            </span>

            <span className="px-2.5 py-1 bg-blue-600 text-white rounded-xl text-[11px] font-black tracking-wider uppercase leading-none shadow-xs">
              PRO
            </span>
          </div>

          <p className="text-[10px] text-slate-400 font-medium mr-1 mt-1">
            نظام إدارة الورش والتدريب
          </p>
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

      {/* Footer Section (Logout Button Only) */}
      <div className="p-4 border-t border-slate-100">
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