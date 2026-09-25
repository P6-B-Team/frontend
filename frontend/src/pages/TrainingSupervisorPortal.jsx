import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  CalendarDays,
  Users,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  MapPin,
  UserCheck,
  Award,
  RefreshCw,
  Send,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Toast from '../components/Toast';
import {
  getCourses,
  getCourseTasks,
  getStudents,
  getBays,
  getUsers,
  getTrainingSessions,
  createTrainingSession,
  getSessionConflicts,
  publishTrainingSession,
  enrollStudents,
  recordAttendance,
  recordAssessment,
  signoffAssessment,
} from '../services/trainingService';

/* ------------------------------ أدوات مساعدة عامة ------------------------------ */
const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const extractApiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

// كشف تعارض الحوض/المدرب القادم من الباك إند (BAY_DOUBLE_BOOKED / RESOURCE_CONFLICT)
const isBayConflictError = (err) => {
  const data = err?.response?.data || {};
  const hay =
    `${data?.error?.code || data?.code || ''} ${data?.error?.message || data?.message || ''}`.toUpperCase();
  if (hay.includes('BAY_DOUBLE_BOOKED') || hay.includes('RESOURCE_CONFLICT')) return true;
  return ['BAY', 'CONFLICT', 'OVERLAP', 'DOUBLE_BOOKED'].some((k) => hay.includes(k));
};

const BAY_CONFLICT_MESSAGE = 'تعارض في جدول الحوض: الحوض محجوز في هذا التوقيت';

const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-EG');
};

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};

/* ------------------------------ تسميات وحالات ------------------------------ */
const SESSION_STATUS = {
  DRAFT: { label: 'مسودة', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  PUBLISHED: { label: 'منشورة', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  IN_PROGRESS: { label: 'جارية', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  COMPLETED: { label: 'مكتملة', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  CANCELLED: { label: 'ملغية', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};
const SESSION_STATUS_FILTERS = ['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'];

const ATTENDANCE_OPTIONS = [
  { value: 'PRESENT', label: 'حاضر', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { value: 'ABSENT', label: 'غائب', cls: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { value: 'LATE', label: 'متأخر', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
];
const ATTENDANCE_BADGE = {
  PRESENT: { label: 'حاضر', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  ABSENT: { label: 'غائب', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  LATE: { label: 'متأخر', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

const RESULT_OPTIONS = [
  { value: 'PASS', label: 'ناجح (PASS)', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { value: 'FAIL', label: 'راسب (FAIL)', cls: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { value: 'NEEDS_IMPROVEMENT', label: 'يحتاج تحسين', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
];

const resultBadge = (result) => {
  const found = RESULT_OPTIONS.find((r) => r.value === String(result || '').toUpperCase());
  return found || { label: result || 'بانتظار التقييم', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
};

const studentLabel = (s) =>
  s?.full_name || s?.fullName || s?.user?.displayName || s?.name || s?.student_no || 'متدرب';
const studentNo = (s) => s?.student_no || s?.studentNo || '';
const courseLabel = (c) => c?.name_ar || c?.name || c?.code || '—';
const bayLabel = (b) => b?.name_ar || b?.name || b?.code || '';
const mentorLabel = (u) => u?.displayName || u?.name || u?.email || '';

const inputCls =
  'w-full px-3 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition';
const labelCls = 'block text-[11px] font-bold text-slate-600 mb-1.5';

/* --------------------- استخراج متدربي الجلسة وحضورها من الحمولة --------------------- */
// عدد المسجلين — يدعم كل الأشكال القادمة من الباك إند
const enrolledCountFor = (session) => {
  if (!session) return 0;
  if (Array.isArray(session.enrollments) && session.enrollments.length > 0) return session.enrollments.length;
  if (Array.isArray(session.students) && session.students.length > 0) return session.students.length;
  return session.enrolledCount || session.enrolled_count || session.students_count || 0;
};

const rosterFromSession = (session) => {
  const embedded = [
    ...toList(session?.enrollments),
    ...toList(session?.students),
    ...toList(session?.attendances),
  ];
  const list = [];
  const seen = new Set();
  embedded.forEach((row) => {
    const st = row?.student || row;
    const id = st?.id || row?.student_id || row?.studentId || st?.student_id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    list.push({ id, name: studentLabel(st), no: studentNo(st) });
  });
  return list;
};

const attendanceFromSession = (session) => {
  const map = {};
  toList(session?.attendances).forEach((row) => {
    const sid = row?.student_id || row?.studentId || row?.student?.id;
    if (sid && row?.status) map[sid] = row.status;
  });
  return map;
};

export default function TrainingSupervisorPortal() {
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const showToast = (type, message) => setToast({ type, message });

  // البيانات المرجعية
  const [courses, setCourses] = useState([]);
  const [bays, setBays] = useState([]);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);

  // الجلسات
  const [sessions, setSessions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  // نافذة الجدولة
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);
  const [conflictBanner, setConflictBanner] = useState(null);
  const [form, setForm] = useState({
    courseId: '',
    title: '',
    startsAt: '',
    endsAt: '',
    bayId: '',
    mentorId: '',
    capacity: '10',
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // تفاصيل الجلسة: الحضور والتقييمات والاعتماد
  const [activeSession, setActiveSession] = useState(null);
  const [courseTasks, setCourseTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [sessionConflicts, setSessionConflicts] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [attendanceBusy, setAttendanceBusy] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [studentsPage, setStudentsPage] = useState(1);
  const STUDENTS_PER_PAGE = 10;
  const [grading, setGrading] = useState({});
  const [gradingOpen, setGradingOpen] = useState(null);
  const [gradingBusy, setGradingBusy] = useState(null);
  const [publishBusy, setPublishBusy] = useState(null);
  const [signoffBusy, setSignoffBusy] = useState(false);

  // المدربون المتاحون للجلسات (MENTOR / مشرف تدريب)
  const mentors = useMemo(
    () =>
      users.filter((u) =>
        (u?.roles || []).some((r) =>
          ['MENTOR', 'TRAINING_SUPERVISOR'].includes(String(r).toUpperCase())
        )
      ),
    [users]
  );

  const visibleSessions = useMemo(
    () =>
      statusFilter
        ? sessions.filter((s) => String(s.status || '').toUpperCase() === statusFilter)
        : sessions,
    [sessions, statusFilter]
  );

  const pendingAssessments = assessments.filter(
    (a) => String(a.status || 'PENDING_SIGNATURE').toUpperCase() === 'PENDING_SIGNATURE'
  );

  const roster = useMemo(() => {
    // المسجلون في الجلسة أولاً
    if (!activeSession) return [];
    const fromSession = rosterFromSession(activeSession);
    if (fromSession.length > 0) {
      return fromSession.map((r) => {
        const match = students.find((s) => s.id === r.id);
        return { ...r, name: r.name || studentLabel(match), no: r.no || studentNo(match) };
      });
    }
    // FALLBACK: الجلسة بلا مسجلين — اعرض كل المتاحين حتى يتمكن المدرب من تقييم الحضور والمهام
    return students.map((s) => ({
      id: s.id,
      name: studentLabel(s),
      no: studentNo(s),
      fallback: true,
    }));
  }, [activeSession, students]);

  const totalStudentPages = Math.max(1, Math.ceil(roster.length / STUDENTS_PER_PAGE));
  const safeStudentsPage = Math.min(studentsPage, totalStudentPages);
  const pagedRoster = roster.slice(
    (safeStudentsPage - 1) * STUDENTS_PER_PAGE,
    safeStudentsPage * STUDENTS_PER_PAGE
  );

  const courseForSession = useCallback(
    (session) =>
      session?.course ||
      courses.find((c) => c.id === (session?.course_id || session?.courseId)) ||
      null,
    [courses]
  );

  const bayForSession = useCallback(
    (session) =>
      session?.bay?.name_ar ||
      session?.bay?.name ||
      session?.bay_name ||
      session?.bayName ||
      bayLabel(bays.find((b) => b.id === (session?.bay_id || session?.bayId))),
    [bays]
  );

  const mentorForSession = useCallback(
    (session) =>
      session?.mentor?.displayName ||
      session?.mentor_name ||
      session?.mentorName ||
      mentorLabel(users.find((u) => u.id === (session?.mentor_id || session?.mentorId))),
    [users]
  );

  // تحميل قائمة الجلسات التدريبية
  const loadSessions = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const payload = await getTrainingSessions();
      setSessions(toList(payload));
    } catch (err) {
      console.error('Error loading sessions:', err);
      setListError(extractApiError(err, 'تعذر تحميل الجلسات التدريبية من السيرفر.'));
      setSessions([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  // تحميل البيانات المرجعية (المساقات، الأحواض، المستخدمون، المتدربون) عند أول تحميل
  useEffect(() => {
    async function run() {
      await loadSessions();
      try {
        const [coursesData, baysData, usersData, studentsData] = await Promise.all([
          getCourses().catch(() => []),
          getBays().catch(() => []),
          getUsers().catch(() => []),
          getStudents().catch(() => []),
        ]);
        setCourses(toList(coursesData));
        setBays(toList(baysData));
        setUsers(toList(usersData));
        setStudents(toList(studentsData));
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    }
    run();
  }, [loadSessions]);

  // فتح تفاصيل الجلسة: مهام المساق العملية + تعارضات الحوض
  // FALLBACK: إن كانت الجلسة بلا مسجلين نعيد جلب كل الطلاب حتى لا تظهر شاشة فارغة
  const openSession = async (session) => {
    setActiveSession(session);
    setStudentsPage(1);
    setAttendance(attendanceFromSession(session));
    setAssessments(toList(session?.assessments));
    setGrading({});
    setGradingOpen(null);
    setSessionConflicts([]);
    setCourseTasks([]);

    if (rosterFromSession(session).length === 0) {
      try {
        const fresh = await getStudents();
        const list = toList(fresh);
        if (list.length > 0) setStudents(list);
      } catch (err) {
        console.error('Fallback students fetch failed:', err?.response?.data || err);
      }
    }

    const courseId = session?.course_id || session?.courseId || session?.course?.id;
    if (courseId) {
      setTasksLoading(true);
      try {
        const tasks = await getCourseTasks(courseId);
        setCourseTasks(toList(tasks));
      } catch (err) {
        console.error('Error loading course tasks:', err);
        setCourseTasks([]);
      } finally {
        setTasksLoading(false);
      }
    }

    if (session?.id) {
      try {
        const conflicts = await getSessionConflicts(session.id);
        setSessionConflicts(toList(conflicts));
      } catch {
        // بعض الجلسات لا تُرجع بيانات تعارضات — لا نُفشل العرض
        setSessionConflicts([]);
      }
    }
  };

  const openCreateModal = () => {
    setForm({
      courseId: '',
      title: '',
      startsAt: '',
      endsAt: '',
      bayId: '',
      mentorId: '',
      capacity: '10',
    });
    setSelectedStudentIds([]);
    setFormError(null);
    setConflictBanner(null);
    setShowCreate(true);
  };

  const toggleStudentSelection = (id) =>
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // جدولة جلسة جديدة + معالجة تعارض الحوض بلباقة (WST-FR-10)
  const handleCreateSession = async (e) => {
    e.preventDefault();
    setFormError(null);
    setConflictBanner(null);

    if (!form.courseId) {
      setFormError('يرجى اختيار المساق التدريبي.');
      return;
    }
    if (!form.startsAt || !form.endsAt) {
      setFormError('وقت البداية والنهاية مطلوبان.');
      return;
    }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setFormError('وقت النهاية يجب أن يكون بعد وقت البداية.');
      return;
    }
    const capacity = Number(form.capacity);
    if (Number.isNaN(capacity) || capacity <= 0) {
      setFormError('الطاقة الاستيعابية يجب أن تكون أكبر من صفر.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        courseId: form.courseId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        capacity,
      };
      if (form.title.trim()) payload.title = form.title.trim();
      if (form.bayId) payload.bayId = form.bayId;
      if (form.mentorId) payload.mentorId = form.mentorId;

      console.log('[TrainingSupervisorPortal] create payload:', payload);
      const created = await createTrainingSession(payload);
      console.log('[TrainingSupervisorPortal] create response (unwrapped):', created);
      const newId =
        created?.id ||
        created?.session?.id ||
        created?.session_id ||
        created?.sessionId ||
        created?.data?.id;
      console.log('[TrainingSupervisorPortal] new session id:', newId);

      let enrolledCount = 0;
      let enrollFailedMsg = null;
      if (newId && selectedStudentIds.length > 0) {
        try {
          const enrollRes = await enrollStudents(newId, selectedStudentIds);
          console.log('[TrainingSupervisorPortal] enroll response (unwrapped):', enrollRes);
          // استجابة التسجيل قد تُرجع عدداً أو قائمة — نلتقط أي شكل
          const enrollList = Array.isArray(enrollRes)
            ? enrollRes
            : Array.isArray(enrollRes?.enrollments)
              ? enrollRes.enrollments
              : Array.isArray(enrollRes?.items)
                ? enrollRes.items
                : null;
          enrolledCount =
            enrollList?.length ??
            enrollRes?.enrolled_count ??
            enrollRes?.enrolledCount ??
            selectedStudentIds.length;
        } catch (enrollErr) {
          console.error(
            'Enroll students error:',
            enrollErr?.response?.data || enrollErr
          );
          enrollFailedMsg = extractApiError(
            enrollErr,
            'تم إنشاء الجلسة لكن تعذر تسجيل المتدربين.'
          );
        }
      }

      setShowCreate(false);
      const enrolledIdsSnapshot = [...selectedStudentIds];
      await loadSessions();
      if (newId && enrolledIdsSnapshot.length > 0 && !enrollFailedMsg) {
        // دمج متفائل: قائمة الجلسات قد لا تُرجع مصفوفة enrollments
        // فنحقنها محلياً ليظهر العدّ فوراً (3 / 10) حتى لو أهملها الـ GET
        setSessions((prev) =>
          prev.map((s) =>
            s.id === newId
              ? {
                  ...s,
                  enrollments:
                    toList(s.enrollments).length > 0
                      ? s.enrollments
                      : enrolledIdsSnapshot.map((sid) => ({ student_id: sid })),
                }
              : s
          )
        );
      }
      if (enrollFailedMsg) {
        showToast('error', enrollFailedMsg);
      } else if (selectedStudentIds.length > 0) {
        showToast(
          'success',
          `تم إنشاء الجلسة وتسجيل ${enrolledCount} متدرب (${enrolledCount} / ${capacity}).`
        );
      } else {
        showToast('success', 'تم إنشاء الجلسة التدريبية كمسودة بنجاح.');
      }
    } catch (err) {
      console.error('Create session error:', err);
      if (isBayConflictError(err)) setConflictBanner(BAY_CONFLICT_MESSAGE);
      setFormError(extractApiError(err, 'تعذر إنشاء الجلسة التدريبية. يرجى المحاولة مرة أخرى.'));
    } finally {
      setCreating(false);
    }
  };

  // نشر الجلسة — الباك إند يرفض التعارض بـ BAY_DOUBLE_BOOKED / RESOURCE_CONFLICT
  const handlePublish = async (session) => {
    setPublishBusy(session.id);
    setConflictBanner(null);
    try {
      await publishTrainingSession(session.id);
      showToast('success', 'تم نشر الجلسة التدريبية واعتماد توقيتها.');
      await loadSessions();
      if (activeSession?.id === session.id) {
        setActiveSession({ ...activeSession, status: 'PUBLISHED' });
      }
    } catch (err) {
      console.error('Publish session error:', err);
      if (isBayConflictError(err)) {
        setConflictBanner(BAY_CONFLICT_MESSAGE);
      } else {
        showToast('error', extractApiError(err, 'تعذر نشر الجلسة التدريبية.'));
      }
    } finally {
      setPublishBusy(null);
    }
  };

  // تسجيل حضور متدرب (PRESENT / ABSENT / LATE)
  const handleAttendance = async (studentId, status) => {
    setAttendanceBusy(`${studentId}:${status}`);
    try {
      await recordAttendance(activeSession.id, { studentId, status });
      setAttendance((prev) => ({ ...prev, [studentId]: status }));
      showToast('success', 'تم تسجيل حالة الحضور.');
    } catch (err) {
      console.error('Attendance error:', err);
      showToast('error', extractApiError(err, 'تعذر تسجيل الحضور من السيرفر.'));
    } finally {
      setAttendanceBusy(null);
    }
  };

  const updateGrading = (studentId, patch) =>
    setGrading((prev) => ({
      ...prev,
      [studentId]: {
        taskId: '',
        result: 'PASS',
        timeOnTask: '',
        mentorNote: '',
        ...(prev[studentId] || {}),
        ...patch,
      },
    }));

  // تسجيل تقييم مهمة عملية (يُسجَّل PENDING_SIGNATURE بانتظار اعتماد المشرف) — WST-FR-11
  const submitAssessment = async (student) => {
    const entry = grading[student.id] || {};
    if (!entry.taskId) {
      showToast('error', 'يرجى اختيار المهمة العملية قبل تسجيل التقييم.');
      return;
    }
    if (entry.timeOnTask === '' || Number.isNaN(Number(entry.timeOnTask))) {
      showToast('error', 'يرجى إدخال الزمن المستغرق على المهمة بالدقائق.');
      return;
    }

    setGradingBusy(student.id);
    try {
      const created = await recordAssessment(activeSession.id, {
        studentId: student.id,
        taskId: entry.taskId,
        result: entry.result,
        timeOnTask: Number(entry.timeOnTask),
        mentorNote: (entry.mentorNote || '').trim() || undefined,
      });

      setAssessments((prev) => {
        const rest = prev.filter(
          (a) => !(a.studentId === student.id && a.taskId === entry.taskId)
        );
        return [
          ...rest,
          {
            id: created?.id || created?.assessment?.id,
            studentId: student.id,
            taskId: entry.taskId,
            result: entry.result,
            timeOnTask: Number(entry.timeOnTask),
            mentorNote: entry.mentorNote,
            status: created?.status || 'PENDING_SIGNATURE',
          },
        ];
      });
      setGradingOpen(null);
      showToast('success', 'تم تسجيل التقييم — بانتظار اعتماد المشرف.');
    } catch (err) {
      console.error('Assessment error:', err);
      showToast('error', extractApiError(err, 'تعذر تسجيل التقييم من السيرفر.'));
    } finally {
      setGradingBusy(null);
    }
  };

  // اعتماد المشرف على تقييمات الجلسة — يُقفل الدرجات ويحدّث الكفاءات في الباك إند
  const handleSignoff = async () => {
    if (pendingAssessments.length === 0) {
      showToast('error', 'لا توجد تقييمات بانتظار الاعتماد في هذه الجلسة.');
      return;
    }

    setSignoffBusy(true);
    let signed = 0;
    let failed = 0;

    for (const item of pendingAssessments) {
      if (!item.id) {
        failed += 1;
        continue;
      }
      try {
        await signoffAssessment(item.id);
        signed += 1;
        setAssessments((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, status: 'SIGNED' } : a))
        );
      } catch (err) {
        console.error('Signoff error:', err);
        failed += 1;
      }
    }

    setSignoffBusy(false);
    if (signed > 0) {
      showToast('success', `تم اعتماد ${signed} تقييم وتحديث كفاءات المتدربين.`);
    }
    if (failed > 0) {
      showToast('error', `تعذر اعتماد ${failed} تقييم — تأكد من صلاحية دور المشرف.`);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar />

        <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* العنوان وأزرار التحكم */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span>الرئيسية</span>
                <span>/</span>
                <span className="text-slate-600 font-semibold">إدارة التدريب العملي</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                بوابة مشرف التدريب والمدرب
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                جدولة الجلسات العملية، تسجيل الحضور، وتقييم المهام واعتمادها (WST-FR-10 /
                WST-FR-11)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadSessions()}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition"
              >
                <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
                تحديث
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                جدولة جلسة جديدة
              </button>
            </div>
          </div>

          {/* لافتة تعارض الحوض (BAY_DOUBLE_BOOKED) */}
          {conflictBanner && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p>{conflictBanner}</p>
                <button
                  type="button"
                  onClick={() => setConflictBanner(null)}
                  className="mt-1 text-[10px] font-bold text-red-500 underline"
                >
                  إخفاء التنبيه
                </button>
              </div>
            </div>
          )}

          {/* خطأ تحميل قائمة الجلسات */}
          {listError && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{listError}</span>
            </div>
          )}
          {/* مؤشرات سريعة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
              <CalendarDays className="w-4 h-4 text-blue-400 mb-3" />
              <p className="text-xs text-slate-400 mb-1">إجمالي الجلسات</p>
              <h3 className="text-2xl font-extrabold">{sessions.length}</h3>
            </div>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-3" />
              <p className="text-xs text-slate-400 mb-1">جلسات منشورة</p>
              <h3 className="text-2xl font-extrabold">
                {sessions.filter((s) => String(s.status || '').toUpperCase() === 'PUBLISHED').length}
              </h3>
            </div>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
              <Users className="w-4 h-4 text-purple-400 mb-3" />
              <p className="text-xs text-slate-400 mb-1">المتدربون المسجلون</p>
              <h3 className="text-2xl font-extrabold">{students.length}</h3>
            </div>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
              <Award className="w-4 h-4 text-amber-400 mb-3" />
              <p className="text-xs text-slate-400 mb-1">تقييمات بانتظار الاعتماد</p>
              <h3 className="text-2xl font-extrabold">{pendingAssessments.length}</h3>
            </div>
          </div>
          {/* جدول الجلسات */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                الجلسات التدريبية المجدولة
              </h3>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
              >
                <option value="">كل الحالات</option>
                {SESSION_STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>{SESSION_STATUS[s]?.label || s}</option>
                ))}
              </select>
            </div>

            {listLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold text-slate-400">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                جاري تحميل الجلسات من السيرفر...
              </div>
            ) : visibleSessions.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-500">لا توجد جلسات تدريبية مطابقة.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-3 font-semibold">الجلسة / المساق</th>
                      <th className="py-3 px-3 font-semibold">التوقيت</th>
                      <th className="py-3 px-3 font-semibold">الحوض</th>
                      <th className="py-3 px-3 font-semibold">المدرب</th>
                      <th className="py-3 px-3 font-semibold">المسجلون</th>
                      <th className="py-3 px-3 font-semibold">الحالة</th>
                      <th className="py-3 px-3 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {visibleSessions.map((session) => {
                      const st =
                        SESSION_STATUS[String(session.status || '').toUpperCase()] || {
                          label: session.status || '—',
                          cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
                        };
                      const stUpper = String(session.status || '').toUpperCase();
                      const isSelected = activeSession?.id === session.id;

                      return (
                        <tr
                          key={session.id}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-slate-800/60 ring-1 ring-blue-500/40' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-white">
                              {session.title || courseLabel(courseForSession(session))}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {courseLabel(courseForSession(session))}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-slate-300">
                            <div>{formatDateTime(session.starts_at || session.startsAt)}</div>
                            <div className="text-[11px] text-slate-500">
                              حتى {formatTime(session.ends_at || session.endsAt)}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-slate-300">
                            {bayForSession(session) || '—'}
                          </td>
                          <td className="py-3.5 px-3 text-slate-300">
                            {mentorForSession(session) || '—'}
                          </td>
                          <td className="py-3.5 px-3 text-slate-300">
                            {enrolledCountFor(session)} /{' '}
                            {session.capacity ?? '—'}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${st.cls}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => openSession(session)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                                  isSelected
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white'
                                }`}
                              >
                                {isSelected ? 'معروضة حالياً' : 'إدارة وتقييم'}
                              </button>
                              {stUpper === 'DRAFT' && (
                                <button
                                  type="button"
                                  onClick={() => handlePublish(session)}
                                  disabled={publishBusy === session.id}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {publishBusy === session.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  نشر
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* تفاصيل الجلسة: الحضور والتقييمات والاعتماد (WST-FR-11) */}
          {activeSession ? (
            <div className="space-y-4">
              {/* ملخص الجلسة النشطة */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                      {activeSession.title || courseLabel(courseForSession(activeSession))}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      المساق: {courseLabel(courseForSession(activeSession))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {String(activeSession.status || '').toUpperCase() === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => handlePublish(activeSession)}
                        disabled={publishBusy === activeSession.id}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {publishBusy === activeSession.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        نشر الجلسة
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveSession(null)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition"
                      title="إغلاق التفاصيل"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> التوقيت
                    </p>
                    <p className="font-bold text-slate-800">
                      {formatDateTime(activeSession.starts_at || activeSession.startsAt)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      حتى {formatTime(activeSession.ends_at || activeSession.endsAt)}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> الحوض
                    </p>
                    <p className="font-bold text-slate-800">
                      {bayForSession(activeSession) || '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> المدرب
                    </p>
                    <p className="font-bold text-slate-800">
                      {mentorForSession(activeSession) || '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> المسجلون
                    </p>
                    <p className="font-bold text-slate-800">
                      {roster.length} / {activeSession.capacity ?? '—'}
                    </p>
                  </div>
                </div>

                {/* تحذير تعارضات الجلسة */}
                {sessionConflicts.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[11px] font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <p>{BAY_CONFLICT_MESSAGE}</p>
                      <ul className="mt-1 space-y-0.5 font-semibold">
                        {sessionConflicts.map((c, i) => (
                          <li key={c.id || i}>
                            •{' '}
                            {c.message ||
                              c.reason ||
                              `${c.type || 'تعارض'}: ${c.starts_at || c.startsAt || ''}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              {/* سجل الحضور العملي */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  سجل الحضور العملي
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                    {roster.length} متدرب
                  </span>
                </h4>
                {roster.length > 0 && roster[0]?.fallback && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-[11px] font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>الجلسة بلا مسجلين — يُعرض جميع المتدربين المتاحين ليتسنى تقييم الحضور والمهام.</span>
                  </div>
                )}

                {roster.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    لا يوجد متدربون مسجلون في هذه الجلسة بعد.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100">
                          <th className="py-2.5 px-3 font-semibold">المتدرب</th>
                          <th className="py-2.5 px-3 font-semibold">الحالة المسجلة</th>
                          <th className="py-2.5 px-3 font-semibold">تسجيل الحضور</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagedRoster.map((student) => {
                          const current = attendance[student.id];
                          const badge = current
                            ? ATTENDANCE_BADGE[String(current).toUpperCase()]
                            : null;
                          return (
                            <tr key={student.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-800">{student.name}</div>
                                {student.no && (
                                  <div className="text-[11px] text-slate-400">
                                    رقم المتدرب: {student.no}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {badge ? (
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.cls}`}
                                  >
                                    {badge.label}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400">لم يُسجَّل بعد</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {ATTENDANCE_OPTIONS.map((opt) => {
                                    const busy = attendanceBusy === `${student.id}:${opt.value}`;
                                    const active =
                                      String(current || '').toUpperCase() === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleAttendance(student.id, opt.value)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition disabled:opacity-50 flex items-center gap-1 ${
                                          active
                                            ? opt.cls
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                        }`}
                                      >
                                        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* اعتماد المشرف على التقييمات */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <h4 className="text-sm font-extrabold flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      اعتماد المشرف على التقييمات
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-5">
                      الاعتماد يُقفل الدرجات ويحدّث كفاءات المتدربين تلقائياً في الباك إند.
                      لا يمكن للمدرب المُسجِّل اعتماد تقييمه بنفسه.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignoff}
                    disabled={signoffBusy || pendingAssessments.length === 0}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-xl text-xs font-extrabold transition flex items-center gap-2"
                  >
                    {signoffBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {pendingAssessments.length > 0
                      ? `اعتماد ${pendingAssessments.length} تقييم`
                      : 'لا توجد تقييمات معلقة'}
                  </button>
                </div>

                {assessments.length === 0 ? (
                  <p className="mt-4 py-4 text-center text-xs text-slate-500">
                    لم تُسجَّل أي تقييمات مهام لهذه الجلسة بعد.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {assessments.map((a, i) => {
                      const rb = resultBadge(a.result);
                      const signed = String(a.status || '').toUpperCase() === 'SIGNED';
                      const stu = roster.find((r) => r.id === a.studentId);
                      const task = courseTasks.find((t) => t.id === a.taskId);
                      return (
                        <div
                          key={a.id || `${a.studentId}-${a.taskId}-${i}`}
                          className="flex items-center justify-between gap-3 flex-wrap p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs"
                        >
                          <div>
                            <p className="font-bold text-white">{stu?.name || 'متدرب'}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {task?.name_ar || task?.name || task?.title || 'مهمة'} •{' '}
                              {a.timeOnTask ?? '—'} دقيقة
                              {a.mentorNote ? ` • ${a.mentorNote}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${rb.cls}`}
                            >
                              {rb.label}
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                signed
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {signed ? 'معتمَد' : 'بانتظار الاعتماد'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                  {/* ترقيم صفحات قائمة الطلاب */}
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      صفحة {safeStudentsPage} من {totalStudentPages} — إجمالي {roster.length} متدرب
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={safeStudentsPage <= 1}
                        onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        السابق
                      </button>
                      <button
                        type="button"
                        disabled={safeStudentsPage >= totalStudentPages}
                        onClick={() => setStudentsPage((p) => Math.min(totalStudentPages, p + 1))}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        التالي
                      </button>
                    </div>
                  </div>

              {/* تقييم المهام العملية */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  تقييم المهام العملية
                </h4>
                <p className="text-[11px] text-slate-400 mb-4">
                  سجّل نتيجة كل متدرب في مهمة عملية مع الزمن المستغرق وملاحظة المدرب — يُحفظ
                  التقييم بانتظار اعتماد المشرف.
                </p>

                {tasksLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-slate-400">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    جاري تحميل المهام العملية للمساق...
                  </div>
                ) : courseTasks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    لا توجد مهام عملية مرتبطة بمساق هذه الجلسة.
                  </p>
                ) : roster.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    لا يوجد متدربون مسجلون في هذه الجلسة.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {roster.map((student) => {
                      const entry = grading[student.id] || {};
                      const open = gradingOpen === student.id;
                      const busy = gradingBusy === student.id;
                      const studentAssess = assessments.filter(
                        (a) => a.studentId === student.id
                      );
                      return (
                        <div
                          key={student.id}
                          className="border border-slate-200 rounded-xl overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setGradingOpen(open ? null : student.id);
                              if (!grading[student.id] && courseTasks.length > 0) {
                                updateGrading(student.id, { taskId: courseTasks[0].id });
                              }
                            }}
                            className="w-full flex items-center justify-between gap-2 p-3.5 hover:bg-slate-50 transition text-right"
                          >
                            <div>
                              <p className="text-xs font-extrabold text-slate-800">
                                {student.name}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {studentAssess.length > 0
                                  ? `${studentAssess.length} تقييم مسجَّل`
                                  : 'بدون تقييمات بعد'}
                              </p>
                            </div>
                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
                              {open ? 'إخفاء التقييم' : 'تقييم مهمة'}
                            </span>
                          </button>
                          {open && (
                            <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className={labelCls}>المهمة العملية</label>
                                <select
                                  value={entry.taskId || ''}
                                  onChange={(e) => updateGrading(student.id, { taskId: e.target.value })}
                                  className={inputCls}
                                >
                                  <option value="">اختر المهمة</option>
                                  {courseTasks.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name_ar || t.name || t.title || t.code}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className={labelCls}>النتيجة</label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {RESULT_OPTIONS.map((opt) => {
                                    const active = (entry.result || 'PASS') === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => updateGrading(student.id, { result: opt.value })}
                                        className={`px-2.5 py-2 rounded-lg text-[10px] font-bold border transition ${
                                          active ? opt.cls : 'bg-white text-slate-500 border-slate-200'
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div>
                                <label className={labelCls}>الزمن المستغرق (دقيقة)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={entry.timeOnTask ?? ''}
                                  onChange={(e) => updateGrading(student.id, { timeOnTask: e.target.value })}
                                  placeholder="مثال: 45"
                                  className={inputCls}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>ملاحظة المدرب</label>
                                <input
                                  type="text"
                                  value={entry.mentorNote || ''}
                                  onChange={(e) => updateGrading(student.id, { mentorNote: e.target.value })}
                                  placeholder="ملاحظات حول أداء المتدرب"
                                  className={inputCls}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => submitAssessment(student)}
                                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                                  حفظ التقييم (بانتظار اعتماد المشرف)
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-200/80">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">
                اختر جلسة من الجدول أعلاه لإدارة الحضور والتقييمات
              </p>
              <p className="text-xs text-slate-400 mt-1">
                اضغط زر «إدارة وتقييم» بجانب أي جلسة لعرض المتدربين وتسجيل الحضور والمهام العملية.
              </p>
            </div>
          )}
        </main>
      </div>

      <Toast toast={toast} onClose={closeToast} />
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <form
            onSubmit={handleCreateSession}
            className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5"
          >
            {/* عنوان النافذة */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  جدولة جلسة تدريب عملية جديدة
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  تُنشأ الجلسة كمسودة أولاً ثم تُنشر بعد التأكد من عدم تعارض الحوض.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* خطأ النموذج */}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* حقول الجلسة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>المساق التدريبي *</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">اختر المساق</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {courseLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>عنوان الجلسة (اختياري)</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="مثال: تدريب عملي — الفرامل"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>وقت البداية *</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>وقت النهاية *</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>حوض الورشة</label>
                <select
                  value={form.bayId}
                  onChange={(e) => setForm((p) => ({ ...p, bayId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">بدون حوض محدد</option>
                  {bays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bayLabel(b)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>المدرب المسؤول</label>
                <select
                  value={form.mentorId}
                  onChange={(e) => setForm((p) => ({ ...p, mentorId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">بدون مدرب محدد</option>
                  {mentors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {mentorLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>الطاقة الاستيعابية *</label>
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            {/* تسجيل المتدربين */}
            <div>
              <p className={labelCls}>
                تسجيل المتدربين ({selectedStudentIds.length} محدد)
              </p>
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {students.length === 0 ? (
                  <p className="p-4 text-center text-[11px] text-slate-400">
                    لا يوجد متدربون مسجلون في النظام.
                  </p>
                ) : (
                  students.map((s) => {
                    const checked = selectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2.5 p-2.5 cursor-pointer text-xs transition ${
                          checked ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudentSelection(s.id)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="font-bold text-slate-800 flex-1">
                          {studentLabel(s)}
                        </span>
                        {studentNo(s) && (
                          <span className="text-[10px] text-slate-400">{studentNo(s)}</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* أزرار الحفظ */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ الجلسة كمسودة
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


