import api from './api';

/**
 * دالة تسجيل الدخول
 * تقوم بإرسال البريد الإلكتروني وكلمة المرور للباك إند،
 * وتخزين التوكنات بداخل localStorage عند النجاح.
 */
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  
  // الباك إند يعيد التوكن بداخل response.data.data
  const tokenData = response.data?.data || response.data;

  if (tokenData?.accessToken) {
    localStorage.setItem('accessToken', tokenData.accessToken);
    if (tokenData.refreshToken) {
      localStorage.setItem('refreshToken', tokenData.refreshToken);
    }
  }

  return response.data;
};

/**
 * دالة تسجيل الخروج
 */
export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/';
};