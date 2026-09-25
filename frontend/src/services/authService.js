import api from './api';

/**
 * ملاحظة CORS: هذا الملف لا يحتوي أي عنوان URL يدوياً (لا IP بعيد ولا نطاق إنتاجي).
 * كل الطلبات تمر عبر النسخة الموحدة في api.js التي تستخدم
 * baseURL: 'http://localhost:4000/api/v1' بشكل صارم.
 */
const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/**
 * دالة تسجيل الدخول
 * تقوم بإرسال البريد الإلكتروني وكلمة المرور للباك إند،
 * وتخزين التوكن بداخل localStorage (accessToken) مع بيانات المستخدم (user).
 */
export const login = async (email, password) => {
  const response = await api.post(
    '/auth/login',
    { email, password },
    { headers: JSON_HEADERS }
  );

  // الباك إند يعيد التوكن بداخل response.data.data
  const tokenData = response.data?.data || response.data;

  if (tokenData?.accessToken) {
    localStorage.setItem('accessToken', tokenData.accessToken);
    if (tokenData.refreshToken) {
      localStorage.setItem('refreshToken', tokenData.refreshToken);
    }
  }

  // حفظ بيانات المستخدم بجوار التوكن (accessToken + user)
  const user = tokenData?.user || response.data?.user;
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  return response.data;
};

/**
 * دالة تسجيل الخروج
 * تمسح التوكن القديم بالكامل (token/accessToken) حتى لا يُرفق مع
 * طلب تسجيل الدخول التالي ويسبب خطأ CORS في Preflight.
 */
export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  window.location.href = '/';
};