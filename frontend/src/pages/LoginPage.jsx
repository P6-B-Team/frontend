import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Gauge } from 'lucide-react';
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

      // التوجيه المباشر
      if (userRole === 'STUDENT' || userRole === 'TRAINEE') {
        window.location.href = '/student';
      } else if (['STOREKEEPER', 'STORE_SUPERVISOR', 'PROCUREMENT', 'PROCUREMENT_APPROVER', 'FINANCE_VIEWER', 'CUSTOMER', 'BUYER'].includes(userRole)) {
        window.location.href = '/customer';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Auth Error:', error);
      setErrorMessage(
        error.response?.data?.message || 'حدث خطأ، يرجى التأكد من البيانات والاتصال بالباك إند'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">مرحباً بك مجدداً</h2>
            <p className="text-sm text-slate-500">سجّل الدخول للوصول إلى مساحة العمل الخاصة بك</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl text-center font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition text-slate-800"
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
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition text-slate-800"
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
        </div>

        <div className="md:col-span-5 bg-blue-600 p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-end gap-3 z-10">
            <div className="text-left">
              <h3 className="text-lg font-bold tracking-tight">مهنة PRO</h3>
              <p className="text-[10px] text-blue-100 opacity-90">نظام إدارة الورش والتدريب</p>
            </div>
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
              <Gauge className="w-6 h-6" />
            </div>
          </div>

          <div className="my-auto py-8 z-10">
            <span className="text-xs bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-blue-100 mb-4 inline-block font-medium">
              منصة واحدة لإدارة كل عملياتك
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold leading-snug mb-4">
              شغّل ورشتك بكفاءة، <br /> وطوّر مهارات فريقك.
            </h1>
            <p className="text-xs md:text-sm text-blue-100/90 leading-relaxed max-w-sm">
              تابع الأعمال والمخزون والتدريب من لوحة تحكم موحدة مصممة لفرق الورش الحديثة.
            </p>
          </div>

          <div className="text-[11px] text-blue-200/70 text-center z-10">
            © 2026 مهنة PRO - جميع الحقوق محفوظة
          </div>
        </div>
      </div>
    </div>
  );
}