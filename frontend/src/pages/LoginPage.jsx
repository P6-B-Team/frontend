import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Wrench } from 'lucide-react';
import { login } from '../services/authService';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const data = await login(email, password);
      
      const token = data?.accessToken || data?.token || data?.data?.token;
      const user = data?.user || data?.data?.user || {};
      
      let userRole = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : 'WORKSHOP_MANAGER');
      userRole = String(userRole).toUpperCase().trim();

      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('accessToken', token);
      }
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', userRole);

      // التوجيه المباشر حسب دور المستخدم
      if (userRole === 'STUDENT' || userRole === 'TRAINEE') {
        window.location.href = '/student';
      } else if (['TRAINING_SUPERVISOR', 'MENTOR'].includes(userRole)) {
        window.location.href = '/training-supervisor';
      } else if (['STOREKEEPER', 'STORE_SUPERVISOR', 'PROCUREMENT', 'PROCUREMENT_APPROVER', 'FINANCE_VIEWER', 'CUSTOMER', 'BUYER'].includes(userRole)) {
        window.location.href = '/parts-requisition';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Auth Error:', error);
      setErrorMessage(
        'حدث خطأ، يرجى التأكد من البيانات وإعادة المحاولة'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-slate-100">
        
        {/* اللوجو وشعار النظام المعدل */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative mb-3">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30 ring-4 ring-blue-50">
              <Wrench className="w-7 h-7 transform -rotate-12" />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-md border-2 border-white uppercase tracking-wider">
              PRO
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">مهنة</h1>
            <span className="text-2xl font-black text-blue-600">PRO</span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">نظام إدارة الورش والتدريب العملي</p>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">مرحباً بك مجدداً</h2>
          <p className="text-xs text-slate-500">سجّل الدخول للوصول إلى مساحة العمل الخاصة بك</p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition text-slate-800"
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition text-slate-800"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              تذكرني
            </label>
            <a href="#forgot" className="text-blue-600 font-semibold hover:underline">نسيت كلمة المرور؟</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all mt-4 disabled:opacity-50"
          >
            {loading ? 'جاري المعالجة...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="mt-8 text-[11px] text-slate-400 text-center border-t border-slate-100 pt-4">
          © 2026 مهنة PRO - جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}