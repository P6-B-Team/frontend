import axios from 'axios';

// عنوان الباك إند موحّد وصارم: localhost فقط — لا أي نطاق إنتاجي أو IP عن بُعد (مصدر أخطاء CORS)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  // لا يُرفق أي Authorization مع تسجيل الدخول نفسه (توكن قديم يجبر Preflight على هيدر غير مسموح به → CORS)
  const isLoginRequest = (config.url || '').includes('/auth/login');
  if (token && !isLoginRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
