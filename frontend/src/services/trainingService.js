import api from './api';

/**
 * كل استجابات الباك إند تستخدم المغلف { data, meta, error }
 * نقوم بفك المغلف وإرجاع البيانات الفعلية فقط — بدون أي بيانات وهمية.
 */
const unwrap = (response) => response?.data?.data ?? null;

/* ------------------------------- البيانات المرجعية ------------------------------- */

/** GET /courses — قائمة المساقات التدريبية */
export const getCourses = async () => {
  const response = await api.get('/courses');
  return unwrap(response);
};

/** GET /courses/:id/tasks — المهام العملية للمساق مع ربط الكفاءات (WST-FR-11) */
export const getCourseTasks = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/tasks`);
  return unwrap(response);
};

/** GET /students — قائمة المتدربين */
export const getStudents = async () => {
  const response = await api.get('/students');
  return unwrap(response);
};

/** GET /bays — أحواض الورشة (لجدولة الجلسات وكشف التعارض) */
export const getBays = async () => {
  const response = await api.get('/bays');
  return unwrap(response);
};

/** GET /users — مستخدمو المنظمة (لالتقاط المشرفين/المدربين) */
export const getUsers = async () => {
  const response = await api.get('/users');
  return unwrap(response);
};

/* --------------------------------- الجلسات التدريبية -------------------------------- */

/** GET /training-sessions — قائمة الجلسات (يدعم status) */
export const getTrainingSessions = async ({ status } = {}) => {
  const params = {};
  if (status) params.status = status;

  const response = await api.get('/training-sessions', { params });
  return unwrap(response);
};

/**
 * POST /training-sessions — إنشاء جلسة كمسودة (WST-FR-10)
 * payload: { courseId, title?, startsAt, endsAt, bayId?, mentorId?, groupId?, capacity }
 */
export const createTrainingSession = async (payload) => {
  const response = await api.post('/training-sessions', payload);
  return unwrap(response);
};

/** GET /training-sessions/:id/conflicts — تعارضات الحوض/المدرب/الفني للجلسة */
export const getSessionConflicts = async (id) => {
  const response = await api.get(`/training-sessions/${id}/conflicts`);
  return unwrap(response);
};

/** POST /training-sessions/:id/publish — نشر الجلسة (يُرفض بـ BAY_DOUBLE_BOOKED/RESOURCE_CONFLICT) */
export const publishTrainingSession = async (id) => {
  const response = await api.post(`/training-sessions/${id}/publish`);
  return unwrap(response);
};

/** POST /training-sessions/:id/enrollments — تسجيل متدربين (الطاقة الاستيعابية مفروضة)
 *  المفتاح المتوقع من الباك إند هو studentIds حصراً (حسب apis.json)
 */
export const enrollStudents = async (id, studentIds) => {
  const ids = Array.isArray(studentIds) ? studentIds.map(String) : [];
  console.log('[trainingService] enrollStudents →', { sessionId: id, studentIds: ids });
  try {
    const response = await api.post(`/training-sessions/${id}/enrollments`, { studentIds: ids });
    console.log('[trainingService] enrollStudents response:', response?.data);
    return unwrap(response);
  } catch (err) {
    console.error('[trainingService] enrollStudents FAILED:', {
      sessionId: id,
      studentIds: ids,
      status: err?.response?.status,
      data: err?.response?.data,
    });
    throw err;
  }
};

/** POST /training-sessions/:id/attendance — تسجيل الحضور (PRESENT | ABSENT | LATE) */
export const recordAttendance = async (id, { studentId, status }) => {
  const response = await api.post(`/training-sessions/${id}/attendance`, { studentId, status });
  return unwrap(response);
};

/**
 * POST /training-sessions/:id/assessments — تسجيل تقييم مهمة عملية (WST-FR-11)
 * يُسجَّل دائماً بحالة PENDING_SIGNATURE حتى اعتماد المشرف
 * payload: { studentId, taskId, result, timeOnTask, mentorNote? }
 */
export const recordAssessment = async (id, { studentId, taskId, result, timeOnTask, mentorNote }) => {
  const payload = { studentId, taskId, result, timeOnTask: Number(timeOnTask) || 0 };
  if (mentorNote) payload.mentorNote = mentorNote;

  const response = await api.post(`/training-sessions/${id}/assessments`, payload);
  return unwrap(response);
};

/** POST /assessments/:id/signoff — اعتماد المشرف (لا يمكن أن يكون المُسجِّل نفسه) */
export const signoffAssessment = async (assessmentId) => {
  const response = await api.post(`/assessments/${assessmentId}/signoff`);
  return unwrap(response);
};
