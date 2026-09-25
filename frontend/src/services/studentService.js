import api from './api';

export const getStudentProfile = async () => {
  const response = await api.get('/me/student');
  return response.data?.data || response.data;
};

export const getStudentSessions = async (page = 1, pageSize = 10) => {
  const response = await api.get(`/me/sessions?page=${page}&pageSize=${pageSize}`);
  return response.data?.data || response.data;
};

export const getStudentAttendance = async () => {
  const response = await api.get('/me/attendance');
  return response.data?.data || response.data;
};

export const getStudentResults = async () => {
  const response = await api.get('/me/results');
  return response.data?.data || response.data;
};

export const getStudentCompetencies = async () => {
  const response = await api.get('/me/competencies');
  return response.data?.data || response.data;
};

export const getStudentCertificates = async () => {
  const response = await api.get('/me/certificates');
  return response.data?.data || response.data;
};

/**
 * GET /me/certificates/:id/qr — إعادة توليد رمز QR للتحقق من الشهادة (WST-FR-12)
 * يستجيب بـ SVG أو رابط صورة PNG data URL لرابط التحقق العام
 */
export const getStudentCertificateQr = async (id, format = 'png') => {
  const response = await api.get(`/me/certificates/${id}/qr`, { params: { format } });
  return response.data?.data || response.data;
};

/**
 * جلب صورة رمز QR من qrUrl كـ Blob مع ترفق توكن Authorization
 * (وسم <img> لا يدعم Headers، لذلك يُجلب المحتوى أولاً ثم يُعرض كـ object URL)
 */
export const getCertificateQrBlob = async (qrUrl) => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const response = await api.get(qrUrl, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};