import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { getCurrentUser } from '../../services/dashboardService';

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then((data) => setUser(data))
      .catch((err) => console.error('Error fetching user:', err));
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between">
      {/* Mobile Menu Button */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile Info Only */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <h4 className="text-xs font-bold text-slate-900">
            {user?.displayName || 'مدير الورشة'}
          </h4>
          <p className="text-[10px] text-slate-400 font-medium">
            {user?.roles?.[0] || 'WORKSHOP_MANAGER'}
          </p>
        </div>
        <div className="w-9 h-9 bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center justify-center text-xs border border-blue-200">
          {user?.displayName ? user.displayName.substring(0, 2) : 'مد'}
        </div>
      </div>
    </header>
  );
}