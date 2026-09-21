import { useState, useEffect } from 'react';
import { Search, Bell, Menu, Plus } from 'lucide-react';
import { getCurrentUser } from '../../services/dashboardService';

export default function Navbar({ onOpenNewJobModal }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then((data) => setUser(data))
      .catch((err) => console.error('Error fetching user:', err));
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between">
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="ابحث عن مركبة، أمر عمل، أو طالب..."
            className="w-full pl-4 pr-10 py-2 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
        </div>
      </div>

      {/* User Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Quick New Job Action */}
        <button
          onClick={onOpenNewJobModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>بطاقة عمل جديدة</span>
        </button>

        {/* Notifications Icon */}
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl relative transition">
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2 border-2 border-white" />
        </button>

        {/* Profile Info */}
        <div className="flex items-center gap-3 pr-3 border-r border-slate-200">
          <div className="w-9 h-9 bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center justify-center text-xs">
            {user?.displayName ? user.displayName.substring(0, 2) : 'مد'}
          </div>
          <div className="text-right hidden sm:block">
            <h4 className="text-xs font-bold text-slate-900">
              {user?.displayName || 'مدير الورشة'}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              {user?.roles?.[0] || 'WORKSHOP_MANAGER'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}