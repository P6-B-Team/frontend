import { useState, useEffect } from 'react';
import { 
  BarChart2, FileCheck, Clock, Award, 
  TrendingUp, LogOut, User,
  Calendar, AlertCircle, RefreshCw, Zap
} from 'lucide-react';
import { 
  getStudentProfile, 
  getStudentSessions, 
  getStudentAttendance, 
  getStudentResults, 
  getStudentCompetencies, 
  getStudentCertificates 
} from '../services/studentService';

export default function StudentPortal() {
  const [activeTab, setActiveTab] = useState('analytics');
  
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [results, setResults] = useState([]);
  const [competencies, setCompetencies] = useState(null);
  const [certificates, setCertificates] = useState([]);
  
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

  const attendanceRatio = attendance?.ratio !== undefined 
    ? (attendance.ratio * 100).toFixed(1) 
    : (attendance?.percentage ?? 0);

  const completedSessions = sessions.filter(s => s.status === 'COMPLETED' || s.attendanceStatus === 'PRESENT').length;
  const passedTasks = results.filter(r => r.result === 'PASS' || r.status === 'PASSED').length;
  const totalTasks = results.length;
  const passedRatio = totalTasks > 0 ? ((passedTasks / totalTasks) * 100).toFixed(0) : 0;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col justify-between p-4 hidden md:flex">
        <div>
          {/* Brand Header - Exact Matching Logo Design */}
          <div className="pb-6 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <Zap className="w-5 h-5 fill-current" />
              </div>

              <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                مهنة
              </span>

              <span className="px-2.5 py-1 bg-blue-600 text-white rounded-xl text-[11px] font-black tracking-wider uppercase leading-none shadow-xs">
                PRO
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-semibold mr-1 mt-1">
              بوابة الطلاب والتدريب العملي
            </p>
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
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header - Student Badge Only */}
        <div className="flex items-center justify-end mb-8">
          <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-200/90 shadow-sm">
            <span className="text-sm font-bold text-slate-800 tracking-wide">
              {profile?.fullName || profile?.displayName || profile?.name || 'Student 1'}
            </span>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100/80 shadow-xs">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>

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

                  {competencies?.coverage ? (
                    <div className="space-y-3 pt-2">
                      {Object.entries(competencies.coverage).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-semibold">{key}</span>
                            <span className="text-emerald-400 font-bold">{Number(value)}%</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Number(value)}%` }} />
                          </div>
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
                      certificates.map((cert) => (
                        <div key={cert.id} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Award className="w-6 h-6 text-amber-400" />
                            <div>
                              <h4 className="text-xs font-bold text-white">{cert.title || cert.courseName}</h4>
                              <p className="text-[10px] text-slate-400">{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('ar-EG') : cert.createdAt}</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
                            {cert.status || 'معتمدة'}
                          </span>
                        </div>
                      ))
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
                        <th className="py-3 px-4 font-semibold">حالة الجلسة</th>
                        <th className="py-3 px-4 font-semibold">حالة الحضور</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sessions.length > 0 ? (
                        sessions.map((sess) => (
                          <tr key={sess.id} className="hover:bg-slate-800/50">
                            <td className="py-3.5 px-4 font-bold text-white">{sess.title || sess.courseName}</td>
                            <td className="py-3.5 px-4 text-slate-300">{sess.startsAt && new Date(sess.startsAt).toLocaleString('ar-EG')}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full text-[10px] font-semibold border border-slate-700">
                                {sess.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                sess.attendanceStatus === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                sess.attendanceStatus === 'ABSENT' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {sess.attendanceStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-slate-500">لا توجد جلسات مسجلة حالياً.</td>
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
                    results.map((res) => (
                      <div key={res.id} className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{res.taskTitle || res.taskName}</h4>
                          <p className="text-[10px] text-slate-400 mt-1">{res.mentorNote}</p>
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            res.status === 'PENDING_SIGNATURE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            res.result === 'PASS' || res.result === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {res.status || res.result}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">لا توجد نتائج تقييمات مسجلة حالياً.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}