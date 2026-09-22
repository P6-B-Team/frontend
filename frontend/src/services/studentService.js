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