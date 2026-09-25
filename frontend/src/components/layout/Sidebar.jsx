import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  ShoppingCart,
  GraduationCap,
  PackagePlus,
  Gauge,
  LogOut
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const currentRole = (() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const fromUser =
        storedUser?.role || (Array.isArray(storedUser?.roles) ? storedUser.roles[0] : '');
      const raw = fromUser || localStorage.getItem('role') || '';
      return String(raw).toUpperCase().trim();
    } catch {
      return String(localStorage.getItem('role') || '').toUpperCase().trim();
    }
  })();

  const INVENTORY_ROLES = ['WORKSHOP_MANAGER', 'STOREKEEPER', 'STORE_SUPERVISOR', 'ADMIN', 'MANAGER'];
  const PROCUREMENT_ROLES = [
    'WORKSHOP_MANAGER',
    'PROCUREMENT',
    'PROCUREMENT_APPROVER',
    'STOREKEEPER',
    'STORE_SUPERVISOR',
    'ADMIN',
    'MANAGER',
  ];

  const canViewInventory = INVENTORY_ROLES.includes(currentRole);
  const canViewProcurement = PROCUREMENT_ROLES.includes(currentRole);
  const canViewStockSection = canViewInventory || canViewProcurement;
  // كتالوج وطلب قطع الغيار: لأمين المخزن ومستشار الخدمة والفني والمديرين
  const PARTS_LINK_ROLES = ['STOREKEEPER', 'STORE_SUPERVISOR', 'SERVICE_ADVISOR', 'TECHNICIAN', 'WORKSHOP_MANAGER', 'ADMIN', 'MANAGER'];
  const canViewPartsLink = PARTS_LINK_ROLES.includes(currentRole);
  // MENTOR / TRAINING_SUPERVISOR: training portal ONLY — hide Dashboard + Job Cards
  const userRole = localStorage.getItem('role') || currentRole;
  const normalizedRole = String(userRole || currentRole).toUpperCase().trim();
  const isTrainingOnly =
    normalizedRole === 'MENTOR' || normalizedRole === 'TRAINING_SUPERVISOR';
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
          {/* Main Section — hidden for MENTOR / TRAINING_SUPERVISOR */}
          {!isTrainingOnly && (
            <div>
              <p className="px-3 text-[11px] font-bold text-slate-400 mb-2">نظرة عامة</p>
              <nav className="space-y-1">
                <Link to="/dashboard" className={linkCls(isActive('/dashboard'))}>
                  <LayoutDashboard className={iconCls(isActive('/dashboard'))} />
                  <span>لوحة التحكم</span>
                </Link>
              </nav>
            </div>
          )}

          {/* Workshop Management */}
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 mb-2">إدارة الورشة</p>
            <nav className="space-y-1">
              {!isTrainingOnly && (
                <Link to="/jobs" className={linkCls(isActive('/jobs'))}>
                  <ClipboardList className={iconCls(isActive('/jobs'))} />
                  <span>بطاقات العمل</span>
                </Link>
              )}
              <Link to="/training-supervisor" className={linkCls(isActive('/training-supervisor'))}>
                <GraduationCap className={iconCls(isActive('/training-supervisor'))} />
                <span>إدارة التدريب العملي</span>
              </Link>
            </nav>
          </div>

          {/* Inventory, Purchasing & Parts Requisition — مخفي عن MENTOR و TRAINING_SUPERVISOR */}
          {(canViewStockSection || canViewPartsLink) && (
            <div>
              <p className="px-3 text-[11px] font-bold text-slate-400 mb-2">المخزون والمشتريات</p>
              <nav className="space-y-1">
                {canViewPartsLink && (
                  <Link to="/parts-requisition" className={linkCls(isActive('/parts-requisition'))}>
                    <PackagePlus className={iconCls(isActive('/parts-requisition'))} />
                    <span>كتالوج وطلب قطع الغيار</span>
                  </Link>
                )}
                {canViewInventory && (
                  <Link to="/inventory" className={linkCls(isActive('/inventory'))}>
                    <Boxes className={iconCls(isActive('/inventory'))} />
                    <span>المخزون وقطع الغيار</span>
                  </Link>
                )}
                {canViewProcurement && (
                  <Link to="/purchase-orders" className={linkCls(isActive('/purchase-orders'))}>
                    <ShoppingCart className={iconCls(isActive('/purchase-orders'))} />
                    <span>أوامر الشراء</span>
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Footer Section (Logout Button) */}
      <div className="p-4 border-t border-slate-100">
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