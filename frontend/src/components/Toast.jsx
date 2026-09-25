import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

/**
 * توست عربي RTL بسيط للنجاح/الخطأ — يُغلق تلقائياً بعد 4.5 ثانية
 * props: toast = { type: 'success' | 'error', message } | null
 */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => onClose(), 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none" dir="rtl">
      <div
        className={`pointer-events-auto w-full max-w-md flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold ${
          isSuccess
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 shrink-0" />
        )}
        <span className="flex-1 leading-relaxed">{toast.message}</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/5 rounded-lg transition"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}