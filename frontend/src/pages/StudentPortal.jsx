import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart2, FileCheck, Clock, Award, 
  TrendingUp, Search, Bell, LogOut, User,
  Calendar, AlertCircle, RefreshCw,
  X, Download, QrCode, ShieldCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  getStudentProfile, 
  getStudentSessions, 
  getStudentAttendance, 
  getStudentResults, 
  getStudentCompetencies, 
  getStudentCertificates,
  getStudentCertificateQr,
  getCertificateQrBlob
} from '../services/studentService';

// ==== أدوات التنسيق والترجمة — كل القيم تأتي من الباك إند بدون بيانات وهمية ====
const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const formatDate = (v, withTime = true) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return withTime ? d.toLocaleString('ar-EG') : d.toLocaleDateString('ar-EG');
};

const formatMinutes = (v) => {
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return '—';
  if (n === 0) return '0 دقيقة';
  if (n < 60) return `${n} دقيقة`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m > 0 ? `${h} ساعة و${m} دقيقة` : `${h} ساعة`;
};

const SESSION_STATUS_AR = {
  DRAFT: 'مسودة',
  PUBLISHED: 'منشورة',
  ACTIVE: 'جارية',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغية',
};

const ATTENDANCE_MAP = {
  PRESENT: { label: 'حاضر', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  LATE: { label: 'متأخر', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  ABSENT: { label: 'غائب', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
};
const PENDING_ATTENDANCE = {
  label: 'بانتظار التقييم',
  cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
};

const RESULT_MAP = {
  PASS: { label: 'ناجح (PASS)', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  PASSED: { label: 'ناجح (PASS)', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  FAIL: { label: 'راسب (FAIL)', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  FAILED: { label: 'راسب (FAIL)', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  NEEDS_IMPROVEMENT: {
    label: 'يحتاج تحسين (NEEDS_IMPROVEMENT)',
    cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
};
const PENDING_RESULT = {
  label: 'بانتظار التقييم',
  cls: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
};

const resultInfo = (res) => {
  const r = (res?.result || '').toUpperCase();
  return RESULT_MAP[r] || PENDING_RESULT;
};

// حالة اعتماد تقييم المشرف (توقيع المشرف لا يمكن أن يكون نفس المدرس المسجّل)
const signoffInfo = (res) => {
  const status = (res?.status || res?.signoffStatus || res?.signoff_status || '').toUpperCase();
  const signed =
    Boolean(res?.signedAt || res?.signed_at || res?.signoff?.signedAt || res?.signoff?.signed_at) ||
    status === 'SIGNED' ||
    status === 'SIGNED_OFF' ||
    status === 'APPROVED';
  return signed
    ? { label: 'معتمد من المشرف', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' }
    : { label: 'بانتظار توقيع المشرف', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
};

const taskTitle = (res) =>
  res?.taskTitle ||
  res?.task?.title_ar ||
  res?.task?.title ||
  res?.taskName ||
  res?.title ||
  'مهمة عملية';

const sessionBay = (s) =>
  s?.bay?.name_ar || s?.bay?.name || s?.bayName || s?.bay_name || s?.bay?.code || '';
const sessionMentor = (s) =>
  s?.mentor?.displayName || s?.mentor?.name || s?.mentorName || s?.mentor_name || '';

// عنوان الشهادة كما يعيده الباك إند مباشرة: course_name (مثل "Brake Systems Practical")
// ثم course_code، وأخيراً نص افتراضي
const certCourse = (c) => c?.course_name || c?.course_code || 'شهادة تدريب عملي';
const isIssuedCert = (c) => (c?.status || 'ISSUED').toUpperCase() === 'ISSUED';

// تطبيع استجابة خدمة QR: صورة PNG data URL أو SVG + رابط التحقق العام
const normalizeQr = (payload) => {
  if (!payload) return {};
  if (typeof payload === 'string') {
    const value = payload.trim();
    return value.startsWith('<svg') ? { svg: value } : { image: value };
  }
  const raw =
    payload.qr ??
    payload.qrcode ??
    payload.qrCode ??
    payload.image ??
    payload.dataUrl ??
    payload.data_url ??
    payload.png ??
    payload.svg ??
    payload.value;
  const url =
    payload.url ??
    payload.verifyUrl ??
    payload.verificationUrl ??
    payload.verification_url ??
    payload.link ??
    '';
  if (typeof raw === 'string' && raw.trim().startsWith('<svg')) {
    return { svg: raw.trim(), url, token: payload.token };
  }
  return { image: raw || '', url, token: payload.token };
};

const toPercent = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n <= 1 ? n * 100 : n));
};

const competencyLabel = (c) =>
  c?.name_ar || c?.name || c?.title_ar || c?.title || c?.label || '—';

const competencyAcquired = (c) => {
  if (c?.acquired !== undefined) return Boolean(c.acquired);
  if (c?.achieved !== undefined) return Boolean(c.achieved);
  if (c?.covered !== undefined) return Boolean(c.covered);
  if (c?.passed !== undefined) return Boolean(c.passed);
  const st = String(c?.status || '').toUpperCase();
  return ['ACQUIRED', 'ACHIEVED', 'COVERED', 'PASSED', 'COMPLETED'].includes(st);
};

/**
 * تطبيع استجابة /me/competencies — تغطية الكفاءات وفجوات الاعتماد لكل مساق
 * يدعم: خريطة coverage، مصفوفة مساقات بداخلها كفاءات، أو قائمة مسطّحة للكفاءات
 */
const normalizeCompetencies = (payload) => {
  if (!payload) return [];

  if (payload.coverage && typeof payload.coverage === 'object' && !Array.isArray(payload.coverage)) {
    return Object.entries(payload.coverage).map(([key, value]) => ({
      label: key,
      acquired: null,
      required: null,
      percent: toPercent(value) ?? 0,
      items: [],
    }));
  }

  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.courses)
      ? payload.courses
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.coverage)
            ? payload.coverage
            : Array.isArray(payload.rows)
              ? payload.rows
              : [];

  if (rawList.length === 0) return [];

  // قائمة مسطّحة للكفاءات بدون مساقات → مجموعة واحدة "المكتسب مقابل المطلوب"
  const looksFlat = rawList.every(
    (e) =>
      !e?.courseName && !e?.course && !e?.course_id && (e?.name || e?.name_ar || e?.title || e?.competency)
  );
  if (looksFlat) {
    const items = rawList.map((e) => ({
      label: competencyLabel(e?.competency || e),
      acquired: competencyAcquired(e?.competency || e),
    }));
    const acquired = items.filter((i) => i.acquired).length;
    return [
      {
        label: 'كفاءات ومهارات المساق',
        acquired,
        required: items.length,
        percent: items.length > 0 ? Math.round((acquired / items.length) * 100) : 0,
        items,
      },
    ];
  }

  return rawList.map((entry) => {
    const nested = toArray(entry?.competencies || entry?.skills || entry?.items);
    const label =
      entry?.courseName ||
      entry?.course_name ||
      (entry?.course && (entry.course.name_ar || entry.course.name)) ||
      entry?.name_ar ||
      entry?.name ||
      entry?.title ||
      'مساق التدريب';

    const acquiredRaw = Number(
      entry?.acquired ?? entry?.acquiredCount ?? entry?.covered ?? entry?.achieved
    );
    const requiredRaw = Number(
      entry?.required ?? entry?.requiredCount ?? entry?.total ?? entry?.totalCompetencies
    );

    let acquired = Number.isNaN(acquiredRaw) ? null : acquiredRaw;
    let required = Number.isNaN(requiredRaw) ? null : requiredRaw;
    let percent = toPercent(entry?.coverage ?? entry?.percent ?? entry?.ratio ?? entry?.coveragePercent);

    const items = nested.map((c) => ({
      label: competencyLabel(c),
      acquired: competencyAcquired(c),
    }));

    if (acquired === null && items.length > 0) acquired = items.filter((i) => i.acquired).length;
    if (required === null && items.length > 0) required = items.length;
    if (percent === null && acquired !== null && required) {
      percent = Math.round((acquired / required) * 100);
    }

    return { label, acquired, required, percent: percent ?? 0, items };
  });
};

export default function StudentPortal() {
  const [activeTab, setActiveTab] = useState('analytics');
  
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [results, setResults] = useState([]);
  const [competencies, setCompetencies] = useState(null);
  const [certificates, setCertificates] = useState([]);

  // منظر الشهادة + رمز التحقق QR (WST-FR-12)
  const [selectedCert, setSelectedCert] = useState(null);
  const [certQr, setCertQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  // بديل احترافي عند فشل جلب رمز QR (مثل TOKEN_UNRECOVERABLE) — بدون لافتة خطأ حمراء
  const [qrFallback, setQrFallback] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllStudentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profData, sessData, attData, resData, compData, certData] = await Promise.all([
          getStudentProfile().catch(() => null),
          getStudentSessions().catch(() => []),
          getStudentAttendance().catch(() => null),
          getStudentResults().catch(() => []),
          getStudentCompetencies().catch(() => null),
          getStudentCertificates().catch(() => []),
        ]);

        setProfile(profData);
        setSessions(Array.isArray(sessData) ? sessData : sessData?.items || sessData?.data || []);
        setAttendance(attData);
        setResults(Array.isArray(resData) ? resData : resData?.items || resData?.data || []);
        setCompetencies(compData);
        setCertificates(Array.isArray(certData) ? certData : certData?.items || certData?.data || []);
      } catch (err) {
        console.error('Error fetching student portal data:', err);
        setError('حدث خطأ أثناء تحميل بيانات الطالب. يرجى التأكد من الاتصال بالسيرفر.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllStudentData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  // تحويل استجابة خدمة QR إلى حالة العرض — لو كانت فارغة نتحول للبديل الاحترافي
  const applyQrPayload = (payload) => {
    const normalized = normalizeQr(payload);
    if (normalized.image || normalized.svg) {
      setCertQr(normalized);
    } else {
      setQrFallback(true);
    }
  };

  // فتح منظر الشهادة وتحميل رمز التحقق:
  // الأولوية لـ cert.qrUrl (يُجلب كـ Blob مع توكن المصادقة)، ثم خدمة /me/certificates/:id/qr،
  // وأي فشل (مثل TOKEN_UNRECOVERABLE للشهادات القديمة) → بديل "معتمدة إلكترونياً" بدون لافتة خطأ حمراء
  const openCertificate = async (cert) => {
    if (!cert?.id || !isIssuedCert(cert)) return;
    if (certQr?.objectUrl && certQr.image) URL.revokeObjectURL(certQr.image);
    setSelectedCert(cert);
    setCertQr(null);
    setQrFallback(false);
    setQrLoading(true);
    try {
      if (cert.qrUrl) {
        // qrUrl نسبي (يبدأ بـ /api/) → نسبقه بعنوان الباك إند المحلي
        const fullQrUrl = cert.qrUrl.startsWith('http')
          ? cert.qrUrl
          : `http://localhost:4000${cert.qrUrl}`;
        try {
          const blob = await getCertificateQrBlob(fullQrUrl);
          if (!blob || !String(blob.type || '').startsWith('image/')) {
            throw new Error('QR response is not an image');
          }
          setCertQr({ image: URL.createObjectURL(blob), objectUrl: true, url: fullQrUrl });
        } catch (blobErr) {
          console.warn(
            'QR blob fetch failed (قد يكون TOKEN_UNRECOVERABLE للشهادات القديمة):',
            blobErr
          );
          applyQrPayload(await getStudentCertificateQr(cert.id, 'png'));
        }
      } else {
        applyQrPayload(await getStudentCertificateQr(cert.id, 'png'));
      }
    } catch (err) {
      // TOKEN_UNRECOVERABLE أو أي خطأ آخر → عرض البديل بدون لافتة خطأ حمراء
      console.warn('QR unavailable, showing fallback (قد يكون TOKEN_UNRECOVERABLE):', err);
      setQrFallback(true);
    } finally {
      setQrLoading(false);
    }
  };

  const closeCertificate = () => {
    if (certQr?.objectUrl && certQr.image) URL.revokeObjectURL(certQr.image);
    setSelectedCert(null);
    setCertQr(null);
    setQrFallback(false);
  };

  const attendanceRatio = attendance?.ratio !== undefined 
    ? (attendance.ratio * 100).toFixed(1) 
    : (attendance?.percentage ?? 0);

  const completedSessions = sessions.filter(s => s.status === 'COMPLETED' || s.attendanceStatus === 'PRESENT').length;
  const passedTasks = results.filter(r => r.result === 'PASS' || r.status === 'PASSED').length;
  const totalTasks = results.length;
  const passedRatio = totalTasks > 0 ? ((passedTasks / totalTasks) * 100).toFixed(0) : 0;

  // تغطية الكفاءات الديناميكية من /me/competencies (WST-FR-12)
  const compGroups = normalizeCompetencies(competencies);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col justify-between p-4 hidden md:flex">
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-lg font-bold text-blue-600 flex items-center gap-2">
                <span className="p-1.5 bg-blue-600 text-white rounded-lg text-xs">PRO</span>
                مهنة
              </h2>
              <p className="text-[10px] text-slate-400">بوابة الطلاب والتدريب العملي</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              تحليلات الأداء
            </button>

            <button 
              onClick={() => setActiveTab('sessions')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'sessions' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              الجلسات والحضور
            </button>

            <button 
              onClick={() => setActiveTab('results')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'results' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              المهام والتقييمات
            </button>
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-medium text-red-600 hover:bg-red-50 p-2.5 rounded-xl transition mt-auto"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Top Header */}
        <header className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 mb-6">
          <div className="relative w-72">
            <input 
              type="text" 
              placeholder="ابحث في الجلسات أو المهام..." 
              className="w-full pl-4 pr-9 py-2 bg-slate-50 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 bg-amber-500 rounded-full absolute top-1.5 right-1.5" />
            </button>
            <div className="flex items-center gap-2.5 bg-slate-50 pr-3 pl-1.5 py-1 rounded-xl border border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{profile?.fullName || profile?.displayName || profile?.name}</p>
                <p className="text-[10px] text-slate-400">{profile?.studentNo || profile?.id}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-lg flex items-center justify-center text-xs">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-bold text-slate-600">جاري تحميل بيانات الطالب من الباك إند...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-semibold flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* Title Section */}
            <div className="mb-6">
              <h1 className="text-2xl font-black text-slate-900 mb-1">لوحة تحليلات المتدرب</h1>
              <p className="text-xs text-slate-500">سجل البيانات المباشر الخاص بالجلسات التدريبية، نتائج التقييمات، وتغطية الكفاءات.</p>
            </div>

            {/* 4 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-xs text-slate-400 mb-1">نسبة الحضور الإجمالية</p>
                <h3 className="text-2xl font-extrabold mb-2">{attendanceRatio}%</h3>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(Number(attendanceRatio), 100)}%` }} />
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-400 mb-1">نسبة اجتياز المهام</p>
                <h3 className="text-2xl font-extrabold mb-2">{passedRatio}%</h3>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${passedRatio}%` }} />
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xs text-slate-400 mb-1">الشهادات الصادرة</p>
                <h3 className="text-2xl font-extrabold mb-2">{certificates.length}</h3>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xs text-slate-400 mb-1">الجلسات المكتملة</p>
                <h3 className="text-2xl font-extrabold mb-2">{completedSessions} / {sessions.length}</h3>
              </div>
            </div>

            {/* Main Tabs View */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Competencies Progress */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold">تغطية الكفاءات والمهارات</h3>
                  <p className="text-xs text-slate-400">الفجوات والمهارات المطلوبة للشهادة النهائيّة</p>

                  {compGroups.length > 0 ? (
                    <div className="space-y-4 pt-2">
                      {compGroups.map((g, gi) => (
                        <div key={gi} className="space-y-1.5">
                          <div className="flex justify-between text-xs gap-2">
                            <span className="text-slate-300 font-semibold">{g.label}</span>
                            <span className="text-emerald-400 font-bold shrink-0">
                              {g.acquired !== null && g.required !== null
                                ? `${g.acquired} / ${g.required} · `
                                : ''}
                              {Math.round(g.percent)}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                g.percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(Number(g.percent) || 0, 100)}%` }}
                            />
                          </div>
                          {g.items.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {g.items.map((it, ii) => (
                                <span
                                  key={ii}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    it.acquired
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  {it.acquired ? '✓ ' : ''}
                                  {it.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 pt-4">لا توجد تفاصيل كفاءات متوفرة حالياً.</p>
                  )}
                </div>

                {/* Issued Certificates */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold">الشهادات المكتسبة</h3>
                  <p className="text-xs text-slate-400">الشهادات الرسمية الصادرة والاعتمادات</p>

                  <div className="space-y-3 pt-2">
                    {certificates.length > 0 ? (
                      certificates.map((cert) => {
                        const issued = isIssuedCert(cert);
                        return (
                          <div
                            key={cert.id}
                            role="button"
                            tabIndex={issued ? 0 : -1}
                            onClick={() => issued && openCertificate(cert)}
                            onKeyDown={(e) => {
                              if (issued && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                openCertificate(cert);
                              }
                            }}
                            className={`p-3.5 bg-slate-800/80 rounded-xl border flex items-center justify-between gap-3 transition ${
                              issued
                                ? 'border-slate-700/80 cursor-pointer hover:border-amber-400/50 hover:bg-slate-800 focus:outline-none focus:border-amber-400/60'
                                : 'border-slate-700/80 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Award className="w-6 h-6 text-amber-400 shrink-0" />
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">
                                  {certCourse(cert)}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                  تاريخ الإصدار:{' '}
                                  {formatDate(
                                    cert.issuedAt || cert.issue_date || cert.createdAt || cert.created_at,
                                    false
                                  )}
                                </p>
                                {issued && (
                                  <p className="text-[10px] text-blue-400 font-bold mt-0.5">
                                    اضغط لعرض الشهادة ورمز التحقق QR
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full font-bold border shrink-0 ${
                                issued
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}
                            >
                              {issued ? 'ISSUED · معتمدة' : cert.status || '—'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        لم يتم إصدار شهادات بعد. قم بإنهاء المتطلبات والكفاءات للحصول على الشهادة.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-bold mb-4">جدول الجلسات المسجل بها</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 pb-3">
                        <th className="py-3 px-4 font-semibold">عنوان الجلسة</th>
                        <th className="py-3 px-4 font-semibold">تاريخ البداية</th>
                        <th className="py-3 px-4 font-semibold">الحوض التدريبي</th>
                        <th className="py-3 px-4 font-semibold">المشرف</th>
                        <th className="py-3 px-4 font-semibold">حالة الجلسة</th>
                        <th className="py-3 px-4 font-semibold">حالة الحضور</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sessions.length > 0 ? (
                        sessions.map((sess) => {
                          const att =
                            ATTENDANCE_MAP[
                              String(sess.attendanceStatus || sess.attendance_status || '').toUpperCase()
                            ] || PENDING_ATTENDANCE;
                          const bay = sessionBay(sess);
                          const mentor = sessionMentor(sess);
                          return (
                            <tr key={sess.id} className="hover:bg-slate-800/50">
                              <td className="py-3.5 px-4 font-bold text-white">
                                {sess.title || sess.sessionTitle || sess.courseName || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-slate-300">
                                {formatDate(sess.startsAt || sess.starts_at)}
                              </td>
                              <td className="py-3.5 px-4 text-slate-300">{bay || '—'}</td>
                              <td className="py-3.5 px-4 text-slate-300">{mentor || '—'}</td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full text-[10px] font-semibold border border-slate-700">
                                  {SESSION_STATUS_AR[String(sess.status || '').toUpperCase()] ||
                                    sess.status ||
                                    '—'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${att.cls}`}
                                >
                                  {att.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-500">
                            لا توجد جلسات مسجلة حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'results' && (
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-bold mb-4">نتائج المهام العملية والتقييمات</h3>
                <div className="space-y-3">
                  {results.length > 0 ? (
                    results.map((res) => {
                      const resultBadge = resultInfo(res);
                      const signBadge = signoffInfo(res);
                      return (
                        <div
                          key={res.id}
                          className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white">{taskTitle(res)}</h4>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {res.sessionTitle || res.session?.title
                                  ? `${res.sessionTitle || res.session?.title} · `
                                  : ''}
                                {formatDate(
                                  res.assessedAt || res.assessed_at || res.created_at || res.createdAt,
                                  false
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-bold ${resultBadge.cls}`}
                              >
                                {resultBadge.label}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-bold ${signBadge.cls}`}
                              >
                                {signBadge.label}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/60">
                              <p className="text-slate-500 font-bold mb-1">زمن التنفيذ على المهمة</p>
                              <p className="text-slate-200 font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                {formatMinutes(res.timeOnTask ?? res.time_on_task)}
                              </p>
                            </div>
                            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/60">
                              <p className="text-slate-500 font-bold mb-1">ملاحظات المشرف</p>
                              <p className="text-slate-300 leading-relaxed">
                                {res.mentorNote || res.mentor_note || 'لا توجد ملاحظات مسجلة على هذه المهمة.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">لا توجد نتائج تقييمات مسجلة حالياً.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {/* منظر الشهادة + رمز التحقق QR (WST-FR-12) — يُرسم في body مباشرة لضمان طباعة صفحة واحدة */}
        {selectedCert &&
          createPortal(
            <div
              id="certificate-modal-container"
              className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
              dir="rtl"
            >
            <style>{`
              @page {
                size: landscape;
                margin: 0;
              }
              @media print {
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  height: 100% !important;
                  max-height: 100% !important;
                  overflow: hidden !important;
                  background: #ffffff !important;
                }
                /* إخفاء كامل لكل التخطيطات الخلفية — يمنع توليد صفحات طباعة إضافية */
                body > *:not(#certificate-modal-container) {
                  display: none !important;
                }
                /* نافذة الشهادة هي الجذر الوحيد المطبوع */
                #certificate-modal-container {
                  position: static !important;
                  inset: auto !important;
                  display: block !important;
                  padding: 0 !important;
                  overflow: visible !important;
                  background: #ffffff !important;
                }
                #certificate-modal-container .no-print {
                  display: none !important;
                }
                /* حاوية الشهادة تأخذ عرض الصفحة كاملاً */
                #certificate-modal-container .certificate-canvas {
                  width: 100% !important;
                  max-width: none !important;
                  margin: 0 !important;
                  display: block !important;
                }
                .certificate-sheet, .certificate-sheet * {
                  visibility: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                /* ورقة واحدة بالضبط: بلا انقسام داخلي وبلا ارتفاع زائد */
                .certificate-sheet {
                  position: static !important;
                  width: 100% !important;
                  height: 100vh !important;
                  max-height: 100vh !important;
                  margin: 0 !important;
                  overflow: hidden !important;
                  border-radius: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 14mm 18mm !important;
                  background: #ffffff !important;
                  box-sizing: border-box !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                }
                .certificate-sheet .diploma-frame {
                  height: 100% !important;
                  border: 3px double #b45309 !important;
                  outline: 8px solid #0f172a !important;
                  outline-offset: -6px !important;
                  padding: 20px 28px !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  box-sizing: border-box !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>
            <div
              className="certificate-backdrop fixed inset-0 bg-slate-900/70 backdrop-blur-sm no-print"
              onClick={() => {
                if (!qrLoading) closeCertificate();
              }}
            />

            {/* الحاوية الكلية للمودال */}
            <div className="certificate-canvas relative w-full max-w-4xl my-auto z-10 flex flex-col items-center">
              {/* شريط أدوات علوي خارج إطار الشهادة المطبوع */}
              <div className="w-full flex items-center justify-between pb-3 px-2 text-white no-print">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-400/30">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold">
                      معاينة شهادة التخرج والتدريب العملي
                    </h2>
                    <p className="text-[11px] text-slate-300">
                      شهادة رسمية معتمدة قابلة للطباعة والتحقق الفوري عبر رمز الاستجابة السريعة
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/30 transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>طباعة / حفظ PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeCertificate}
                    disabled={qrLoading}
                    className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition disabled:opacity-40"
                    aria-label="إغلاق"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ورقة الشهادة الرسمية - Diploma Canvas */}
              <div className="certificate-sheet relative bg-white text-slate-900 rounded-2xl w-full p-4 sm:p-7 shadow-2xl overflow-hidden border border-amber-900/20">
                {/* إطار دبلوم فاخر مزدوج (Dark Blue + Gold) مع لمسات الزوايا */}
                <div className="diploma-frame relative rounded-xl border-2 border-amber-600/80 p-5 sm:p-7 bg-gradient-to-b from-amber-50/20 via-white to-amber-50/20 outline outline-6 outline-slate-900 -outline-offset-6">
                  {/* زخارف الزوايا الأربع العريقة */}
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-600 pointer-events-none" />
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-600 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-600 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-600 pointer-events-none" />

                  {/* محتوى الشهادة الرسمي */}
                  <div className="relative text-center space-y-3">
                    {/* الشعار وترويسة الدبلوم الفاخرة */}
                    <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 border-2 border-white ring-4 ring-amber-200">
                      <Award className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-black tracking-widest text-amber-700">
                        مركز التدريب المهني وصيانة السيارات المتطورة
                      </p>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        شهادة إتمام تدريب عملي معتمدة
                      </h1>
                      <p
                        className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wider"
                        dir="ltr"
                      >
                        Certificate of Completion
                      </p>
                    </div>

                  {/* اسم الطالب والبرنامج التدريبي بمحاذاة وسطية أنيقة */}
                  <div className="text-center my-4 space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                      يشهد المركز بأن المتدرب / الطالب:
                    </p>

                    <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-wide border-b-2 border-dashed border-amber-500/50 inline-block px-8 pb-1">
                      {selectedCert.student_name ||
                        selectedCert.studentName ||
                        profile?.fullName ||
                        profile?.displayName ||
                        profile?.name ||
                        'طالب الدبلوم الفني'}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                      قد اجتاز بنجاح كافة متطلبات التدريب المهني والتطبيقي وفق معايير الجودة والكفاءة الميدانية في برنامج:
                    </p>

                    <div>
                      <span className="text-base sm:text-xl font-black text-amber-900 bg-amber-100/70 border border-amber-300 px-5 py-1.5 rounded-xl inline-block shadow-sm">
                        {certCourse(selectedCert)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-1 text-[11px] sm:text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400 font-medium">رقم الاعتماد: </span>
                        <span className="font-mono font-bold text-slate-800" dir="ltr">
                          {selectedCert.id ? String(selectedCert.id).slice(0, 18) : 'WST-CERT-VERIFIED'}
                        </span>
                      </div>
                      <span className="text-slate-300 hidden sm:inline">|</span>
                      <div>
                        <span className="text-slate-400 font-medium">تاريخ الإصدار: </span>
                        <span className="font-bold text-slate-800">
                          {formatDate(
                            selectedCert.issue_date ||
                              selectedCert.issuedAt ||
                              selectedCert.createdAt ||
                              selectedCert.created_at,
                            false
                          )}
                        </span>
                      </div>
                      <span className="text-slate-300 hidden sm:inline">|</span>
                      <div>
                        <span className="text-slate-400 font-medium">حالة الاعتماد: </span>
                        <span className="font-bold text-emerald-700">
                          {(selectedCert.status || 'ISSUED').toUpperCase() === 'ISSUED'
                            ? 'معتمدة ورسمية (ISSUED)'
                            : selectedCert.status || 'معتمدة'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* التذييل الرسمي: رمز التحقق QR + التوقيعات المعتمدة */}
                  <div className="pt-5 mt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 items-end gap-5 sm:gap-4 text-center">
                    {/* توقيع مشرف التدريب */}
                    <div className="space-y-1.5 order-2 sm:order-1">
                      <div className="h-9 flex items-end justify-center">
                        <span className="font-serif italic text-base text-slate-600 font-bold tracking-wider">
                          Eng. Supervisor
                        </span>
                      </div>
                      <div className="w-36 mx-auto border-t border-slate-400" />
                      <p className="text-xs font-bold text-slate-800">توقيع مشرف التدريب</p>
                      <p className="text-[10px] text-slate-400">Training Supervisor</p>
                    </div>

                    {/* رمز التحقق + شارة الاعتماد الإلكتروني */}
                    <div className="order-1 sm:order-2 flex flex-col items-center justify-center">
                      <div className="w-24 h-24 p-1.5 bg-white border border-slate-300 rounded-lg shadow-sm flex items-center justify-center">
                        {qrLoading ? (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                            <span className="text-[9px] font-bold">جاري التحميل...</span>
                          </div>
                        ) : qrFallback ? (
                          <QRCodeSVG
                            value={`http://localhost:4000/api/v1/me/certificates/${selectedCert.id}`}
                            size={84}
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                            level="M"
                          />
                        ) : certQr?.svg ? (
                          <div
                            className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                            dangerouslySetInnerHTML={{ __html: certQr.svg }}
                          />
                        ) : certQr?.image ? (
                          <img
                            src={certQr.image}
                            alt="رمز التحقق"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QRCodeSVG
                            value={`http://localhost:4000/api/v1/me/certificates/${selectedCert.id}`}
                            size={84}
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                            level="M"
                          />
                        )}
                      </div>

                      <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-300 rounded-full text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-black">معتمدة إلكترونياً</span>
                        <span className="text-[9px] text-emerald-600">· Digitally Verified</span>
                      </div>

                      {/* ملاحظة مساعدة تظهر على الشاشة فقط وتُخفى عند الطباعة */}
                      <p className="text-[9px] text-slate-400 mt-1 max-w-[15rem] leading-tight text-center no-print">
                        امسح الرمز للتحقق الفوري من صحة الشهادة
                      </p>
                    </div>

                    {/* توقيع مدير الورشة */}
                    <div className="space-y-1.5 order-3">
                      <div className="h-9 flex items-end justify-center">
                        <span className="font-serif italic text-base text-slate-600 font-bold tracking-wider">
                          Workshop Director
                        </span>
                      </div>
                      <div className="w-36 mx-auto border-t border-slate-400" />
                      <p className="text-xs font-bold text-slate-800">توقيع مدير الورشة</p>
                      <p className="text-[10px] text-slate-400">Workshop Manager</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      </main>
    </div>
  );
}