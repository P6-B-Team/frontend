import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Search,
  Package,
  Boxes,
  ArrowLeftRight,
  RotateCcw,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import {
  getParts,
  getStores,
  getStockBalances,
  getStockMovements,
} from '../services/inventoryService';

const TABS = [
  { key: 'parts', label: 'كارت القطع', icon: Package },
  { key: 'balances', label: 'أرصدة المخزون', icon: Boxes },
  { key: 'movements', label: 'حركات المخزون', icon: ArrowLeftRight },
];

const MOVEMENT_TYPES = {
  RECEIPT: { label: 'استلام', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  ISSUE: { label: 'صرف', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ADJUSTMENT: { label: 'تسوية', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  TRANSFER: { label: 'تحويل', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  TRANSFER_IN: { label: 'تحويل وارد', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  TRANSFER_OUT: { label: 'تحويل صادر', cls: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  RETURN: { label: 'مرتجع', cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  REVERSAL: { label: 'عكس صرف', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const formatMoney = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatQty = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('en-US');
};

const formatDateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ar-EG');
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('parts');

  // كارت القطع
  const [parts, setParts] = useState([]);
  const [partsMeta, setPartsMeta] = useState(null);
  const [partsSearchInput, setPartsSearchInput] = useState('');
  const [partsSearch, setPartsSearch] = useState('');
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState(null);

  // المخازن والأرصدة
  const [stores, setStores] = useState([]);
  const [balances, setBalances] = useState([]);
  const [storeFilter, setStoreFilter] = useState('');
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState(null);

  // حركات المخزون
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState(null);

  const loadParts = useCallback(async () => {
    setPartsLoading(true);
    setPartsError(null);
    try {
      const payload = await getParts({
        q: partsSearch || undefined,
        page: 1,
        pageSize: 50,
      });
      setParts(toList(payload));
      setPartsMeta(Array.isArray(payload) ? null : payload?.meta || payload?.pagination || null);
    } catch (err) {
      console.error('Error loading parts:', err);
      setParts([]);
      setPartsMeta(null);
      setPartsError('تعذر تحميل كارت القطع من السيرفر.');
    } finally {
      setPartsLoading(false);
    }
  }, [partsSearch]);

  const loadStores = useCallback(async () => {
    try {
      const data = await getStores();
      setStores(toList(data));
    } catch (err) {
      console.error('Error loading stores:', err);
      setStores([]);
    }
  }, []);

  const loadBalances = useCallback(async () => {
    setBalancesLoading(true);
    setBalancesError(null);
    try {
      const data = await getStockBalances({ storeId: storeFilter || undefined });
      setBalances(toList(data));
    } catch (err) {
      console.error('Error loading balances:', err);
      setBalances([]);
      setBalancesError('تعذر تحميل أرصدة المخزون من السيرفر.');
    } finally {
      setBalancesLoading(false);
    }
  }, [storeFilter]);

  const loadMovements = useCallback(async () => {
    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const data = await getStockMovements({ page: 1, pageSize: 20 });
      setMovements(toList(data));
    } catch (err) {
      console.error('Error loading movements:', err);
      setMovements([]);
      setMovementsError('تعذر تحميل حركات المخزون من السيرفر.');
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  // بحث بتأخير لكارت القطع
  useEffect(() => {
    const timer = setTimeout(() => setPartsSearch(partsSearchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [partsSearchInput]);

  useEffect(() => {
    if (activeTab !== 'parts') return undefined;
    async function run() {
      await loadParts();
    }
    run();
    return undefined;
  }, [activeTab, partsSearch, loadParts]);

  useEffect(() => {
    if (activeTab !== 'balances') return undefined;
    async function run() {
      await loadStores();
    }
    run();
    return undefined;
  }, [activeTab, loadStores]);

  useEffect(() => {
    if (activeTab !== 'balances') return undefined;
    async function run() {
      await loadBalances();
    }
    run();
    return undefined;
  }, [activeTab, storeFilter, loadBalances]);

  useEffect(() => {
    if (activeTab !== 'movements') return undefined;
    async function run() {
      await loadMovements();
    }
    run();
    return undefined;
  }, [activeTab, loadMovements]);

  // بحث أسماء المخازن من القائمة المحملة
  const storeLabel = (row) => {
    const nested = row.store?.code || row.store?.name || row.store_name || row.storeName;
    if (nested) return nested;
    const sid = row.store_id || row.storeId;
    const s = stores.find((x) => x.id === sid);
    return s?.code || s?.name || '';
  };

  const partLabel = (row) => {
    const sku = row.part?.sku || row.part_sku || row.partSku || row.sku || '';
    const name = row.part?.name || row.part_name || row.partName || row.name || '';
    return [sku, name].filter(Boolean).join(' — ');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar />

        <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* العنوان */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>الرئيسية</span>
              <span>/</span>
              <span className="text-slate-600 font-semibold">المخزون</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">المخزون وقطع الغيار</h1>
            <p className="text-xs text-slate-500 mt-1">
              كارت القطع والأرصدة وحركات المخزون — تُقرأ مباشرة من قاعدة البيانات
            </p>
          </div>

          {/* التبويبات */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2 flex gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
                    active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* تبويب كارت القطع */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={partsSearchInput}
                    onChange={(e) => setPartsSearchInput(e.target.value)}
                    placeholder="ابحث برقم الـ SKU أو اسم القطعة..."
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
                <button
                  onClick={loadParts}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  تحديث
                </button>
              </div>

              {partsError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="flex-1">{partsError}</span>
                  <button
                    onClick={loadParts}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">كارت القطع</h3>
                      <p className="text-xs text-slate-400">كتالوج قطع الغيار مع الأرصدة المجمعة</p>
                    </div>
                  </div>
                  {partsMeta?.total !== undefined && partsMeta?.total !== null && (
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                      {partsMeta.total} قطعة
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-800">
                        <th className="py-3 px-3 font-semibold">SKU</th>
                        <th className="py-3 px-3 font-semibold">اسم القطعة</th>
                        <th className="py-3 px-3 font-semibold">التصنيف</th>
                        <th className="py-3 px-3 font-semibold">الحد الأدنى</th>
                        <th className="py-3 px-3 font-semibold">الحد الأعلى</th>
                        <th className="py-3 px-3 font-semibold">متوسط التكلفة</th>
                        <th className="py-3 px-3 font-semibold">سعر البيع</th>
                        <th className="py-3 px-3 font-semibold">الرصيد الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {partsLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <Loader2 className="w-7 h-7 text-blue-500 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : parts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-500">
                            لا توجد قطع مطابقة في قاعدة البيانات.
                          </td>
                        </tr>
                      ) : (
                        parts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-3 font-bold text-blue-400">{p.sku || '—'}</td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-white">{p.name || '—'}</div>
                              <div className="text-[11px] text-slate-400">{p.name_ar || p.nameAr || ''}</div>
                            </td>
                            <td className="py-3.5 px-3 text-slate-300">{p.category || '—'}</td>
                            <td className="py-3.5 px-3 text-slate-300">{formatQty(p.min_level ?? p.minLevel)}</td>
                            <td className="py-3.5 px-3 text-slate-300">{formatQty(p.max_level ?? p.maxLevel)}</td>
                            <td className="py-3.5 px-3 text-slate-300">{formatMoney(p.average_cost ?? p.averageCost)}</td>
                            <td className="py-3.5 px-3 text-slate-300">{formatMoney(p.sell_price ?? p.sellPrice)}</td>
                            <td className="py-3.5 px-3 font-bold text-emerald-400">
                              {formatQty(p.total_on_hand ?? p.totalOnHand ?? p.on_hand ?? p.onHand)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* تبويب أرصدة المخزون */}
          {activeTab === 'balances' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-3">
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-100/80 border border-transparent rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                >
                  <option value="">كل المخازن</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `${s.code} — ${s.name || ''}` : s.name || s.code}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadBalances}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  تحديث
                </button>
              </div>

              {balancesError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="flex-1">{balancesError}</span>
                  <button
                    onClick={loadBalances}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">أرصدة المخزون</h3>
                    <p className="text-xs text-slate-400">الرصيد الفعلي والمحجوز لكل قطعة في كل مخزن</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-800">
                        <th className="py-3 px-3 font-semibold">المخزن</th>
                        <th className="py-3 px-3 font-semibold">القطعة</th>
                        <th className="py-3 px-3 font-semibold">الرصيد</th>
                        <th className="py-3 px-3 font-semibold">المحجوز</th>
                        <th className="py-3 px-3 font-semibold">المتاح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {balancesLoading ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                            <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : balances.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-slate-500">
                            لا توجد أرصدة مسجلة في قاعدة البيانات.
                          </td>
                        </tr>
                      ) : (
                        balances.map((b) => {
                          const onHand = b.on_hand ?? b.onHand;
                          const reserved = b.reserved ?? b.reservedQty ?? b.reserved_quantity;
                          const available =
                            onHand !== null && onHand !== undefined && reserved !== null && reserved !== undefined
                              ? Number(onHand) - Number(reserved)
                              : null;
                          return (
                            <tr key={b.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-3.5 px-3 font-bold text-slate-200">{storeLabel(b) || '—'}</td>
                              <td className="py-3.5 px-3 text-slate-300">{partLabel(b) || '—'}</td>
                              <td className="py-3.5 px-3 font-bold text-white">{formatQty(onHand)}</td>
                              <td className="py-3.5 px-3 text-amber-400">{formatQty(reserved)}</td>
                              <td className="py-3.5 px-3 font-bold text-emerald-400">{formatQty(available)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* تبويب حركات المخزون */}
          {activeTab === 'movements' && (
            <div className="space-y-4">
              {movementsError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="flex-1">{movementsError}</span>
                  <button
                    onClick={loadMovements}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
                      <ArrowLeftRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">حركات المخزون</h3>
                      <p className="text-xs text-slate-400">السجل غير القابل للتعديل — أحدث 20 حركة</p>
                    </div>
                  </div>
                  <button
                    onClick={loadMovements}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    تحديث
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-800">
                        <th className="py-3 px-3 font-semibold">التاريخ</th>
                        <th className="py-3 px-3 font-semibold">النوع</th>
                        <th className="py-3 px-3 font-semibold">المخزن</th>
                        <th className="py-3 px-3 font-semibold">القطعة</th>
                        <th className="py-3 px-3 font-semibold">الكمية</th>
                        <th className="py-3 px-3 font-semibold">تكلفة الوحدة</th>
                        <th className="py-3 px-3 font-semibold">الرصيد بعدها</th>
                        <th className="py-3 px-3 font-semibold">السبب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {movementsLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <Loader2 className="w-7 h-7 text-purple-500 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : movements.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-500">
                            لا توجد حركات مخزون مسجلة في قاعدة البيانات.
                          </td>
                        </tr>
                      ) : (
                        movements.map((m) => {
                          const type = MOVEMENT_TYPES[(m.type || '').toUpperCase()] || {
                            label: m.type || '—',
                            cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
                          };
                          return (
                            <tr key={m.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-3.5 px-3 text-slate-400">
                                {formatDateTime(m.created_at || m.createdAt) || '—'}
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${type.cls}`}>
                                  {type.label}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 font-bold text-slate-200">{storeLabel(m) || '—'}</td>
                              <td className="py-3.5 px-3 text-slate-300">{partLabel(m) || '—'}</td>
                              <td className="py-3.5 px-3 font-bold text-white">{formatQty(m.quantity)}</td>
                              <td className="py-3.5 px-3 text-slate-300">
                                {formatMoney(m.unit_cost ?? m.unitCost)}
                              </td>
                              <td className="py-3.5 px-3 text-emerald-400">
                                {formatQty(m.balance_after ?? m.balanceAfter)}
                              </td>
                              <td className="py-3.5 px-3 text-slate-400">{m.reason || '—'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}


