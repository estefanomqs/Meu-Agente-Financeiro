import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { FileSpreadsheet, MessageCircle, CheckSquare, Square, Trash2, Search, Filter, Tag, ChevronLeft, ChevronRight, Calendar, BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, AppData } from '../types';
import { getEffectiveAmount, getInstallmentValue, getEstimatedPaymentDate, formatCurrency } from '../utils'; // <--- Garanta que getEstimatedPaymentDate está importado
import { TransactionRow } from '../components/TransactionRow';

interface TransactionsViewProps {
   data: AppData;
   privacyMode: boolean;
   onEditTransaction: (t: Transaction) => void;
   onDeleteTransaction: (id: string) => void;
   onExportCSV: (items: any[]) => void;
   onWhatsApp: (items: any[], start: string, end: string) => void;
   onBulkDelete: (ids: Set<string>) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
   data, privacyMode, onEditTransaction, onDeleteTransaction, onExportCSV, onWhatsApp, onBulkDelete
}) => {
   // State Principal: Data Selecionada (Mês/Ano)
   const [currentDate, setCurrentDate] = useState(new Date());

   // Filters
   const [filterCategory, setFilterCategory] = useState('Todas');
   const [filterAccount, setFilterAccount] = useState('Todos');
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedTag, setSelectedTag] = useState<string | null>(null); // Smart Tag Selection
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [showChart, setShowChart] = useState(true);

   // Refs for Scrolling
   const monthsContainerRef = useRef<HTMLDivElement>(null);
   const hasInitialScrolled = useRef(false);

   // --- DATA PROCESSING ---

   // 1. Gera a lista de meses para navegação (Range: +/- 12 meses)
   const monthsList = useMemo(() => {
      const list = [];
      const today = new Date();
      for (let i = -12; i <= 12; i++) {
         const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
         list.push(d);
      }
      return list;
   }, []);

   // 2. Extrai Tags Únicas (Smart Tags)
   const uniqueTags = useMemo(() => {
      const tags = new Set<string>();
      data.transactions.forEach(t => {
         t.tags?.forEach(tag => tags.add(tag));
      });
      return Array.from(tags).sort();
   }, [data.transactions]);

   // Auto-scroll e Centralização do Mês Selecionado (Native API + RAF)
   useLayoutEffect(() => {
      const scrollToCenter = () => {
         // Encontra o index
         const index = monthsList.findIndex(d =>
            d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
         );

         if (index !== -1) {
            const activeBtn = document.getElementById(`month-btn-${index}`);
            if (activeBtn && monthsContainerRef.current) {
               const behavior = hasInitialScrolled.current ? 'smooth' : 'auto';

               // API Nativa do Browser - Mais confiável em diferentes resoluções
               activeBtn.scrollIntoView({
                  behavior: behavior,
                  block: 'nearest',
                  inline: 'center'
               });

               hasInitialScrolled.current = true;
            }
         }
      };

      // Tenta imediatamente (Layout Effect)
      scrollToCenter();

      // Garante uma segunda tentativa no próximo frame (para Desktop/Layout Shifts)
      requestAnimationFrame(() => scrollToCenter());

   }, [currentDate, monthsList]);

   // --- HELPER DE DATA REAL (CORRIGIDO) ---
   // Determina onde a transação deve aparecer no extrato
   const getDisplayDate = (t: Transaction): Date => {
      // 1. Débito, Pix, Dinheiro -> Data Original da Compra
      if (t.paymentMethod !== 'Crédito') {
         const d = new Date(t.date);
         // Ajuste de fuso para garantir que '2023-11-01' não vire '2023-10-31'
         if (t.date.length === 10) d.setHours(12, 0, 0, 0);
         return d;
      }

      // 2. Crédito -> Data da Fatura (Vencimento Real ou Estimado)
      const settings = data.accountSettings.find(a => a.accountId === t.account);
      if (settings) {
         return getEstimatedPaymentDate(t.date, settings);
      }

      // Fallback se não achar config
      const d = new Date(t.date);
      if (t.date.length === 10) d.setHours(12, 0, 0, 0);
      return d;
   };

   // 3. Dados do Gráfico (Panorama de 6 meses)
   const chartData = useMemo(() => {
      // Mapa: "YYYY-MM" -> Total
      const totals: Record<string, number> = {};

      // Inicializa 6 meses em volta da data atual
      const rangeStart = new Date(currentDate);
      rangeStart.setMonth(rangeStart.getMonth() - 3);
      const rangeEnd = new Date(currentDate);
      rangeEnd.setMonth(rangeEnd.getMonth() + 3);

      data.transactions.forEach(t => {
         // Logica de projeção para o gráfico
         if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal <= 1) {
            const tDate = getDisplayDate(t);
            if (t.type === 'expense') {
               const key = `${tDate.getFullYear()}-${tDate.getMonth()}`;
               totals[key] = (totals[key] || 0) + getEffectiveAmount(t);
            }
         } else {
            const total = t.installmentsTotal || 1;
            // Para parcelas, a primeira data segue a regra do cartão
            const firstDate = getDisplayDate(t);
            const val = getInstallmentValue(t);

            for (let i = 0; i < total; i++) {
               const instDate = new Date(firstDate);
               instDate.setMonth(firstDate.getMonth() + i);

               if (t.type === 'expense') {
                  const key = `${instDate.getFullYear()}-${instDate.getMonth()}`;
                  totals[key] = (totals[key] || 0) + val;
               }
            }
         }
      });

      // Formata para Recharts
      const dataPoints = [];
      for (let i = -3; i <= 3; i++) {
         const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
         const key = `${d.getFullYear()}-${d.getMonth()}`;
         const isCurrent = i === 0;
         dataPoints.push({
            name: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
            fullDate: d,
            value: totals[key] || 0,
            isCurrent
         });
      }
      return dataPoints;
   }, [data.transactions, currentDate]);

   // 4. Transações do Mês Selecionado (Listing)
   const { groupedTransactions, summary } = useMemo(() => {
      // Intervalo do Mês Selecionado (Start 00:00 -> End 23:59)
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);

      let rawList: { t: Transaction, isGhost: boolean, ghostIndex?: number, overrideAmount?: number, sortDate: number, displayDate: number }[] = [];
      const searchLower = searchTerm.toLowerCase();

      data.transactions.forEach(t => {
         // --- Filters Clean ---
         const matchesSearch = !searchTerm ||
            t.origin.toLowerCase().includes(searchLower) ||
            t.category.toLowerCase().includes(searchLower) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchLower)));

         const matchesTag = !selectedTag || (t.tags && t.tags.includes(selectedTag));

         if (!matchesSearch || !matchesTag) return;
         if (filterCategory !== 'Todas' && t.category !== filterCategory) return;
         if (filterAccount !== 'Todos' && t.account !== filterAccount) return;

         // --- DATA & PARCELAMENTO ---
         if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal <= 1) {
            // Pagamento Único
            const displayDate = getDisplayDate(t);

            // FILTRO RIGOROSO: Só mostra se cair no mês
            if (displayDate >= start && displayDate <= end) {
               rawList.push({
                  t,
                  isGhost: false,
                  sortDate: displayDate.getTime(),
                  displayDate: displayDate.getTime()
               });
            }
         } else {
            // Recorrência / Parcelado
            const initialDate = getDisplayDate(t);
            const val = getInstallmentValue(t);

            for (let i = 0; i < t.installmentsTotal; i++) {
               // Projeta a parcela i meses à frente
               const parcelDate = new Date(initialDate);
               parcelDate.setMonth(initialDate.getMonth() + i);

               // FILTRO RIGOROSO: Só mostra se essa parcela específica cair no mês
               if (parcelDate >= start && parcelDate <= end) {
                  rawList.push({
                     t,
                     isGhost: i > 0, // A partir da 2ª é fantasma (futura)
                     ghostIndex: i + 1,
                     overrideAmount: val,
                     sortDate: parcelDate.getTime(),
                     displayDate: parcelDate.getTime()
                  });
               }
            }
         }
      });

      // Ordenar: Mais recentes primeiro
      rawList.sort((a, b) => b.sortDate - a.sortDate);

      // Agrupar
      const groups: Record<string, typeof rawList> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      rawList.forEach(item => {
         const dateKey = new Date(item.sortDate).toISOString().split('T')[0];
         if (!groups[dateKey]) groups[dateKey] = [];
         groups[dateKey].push(item);

         const val = item.overrideAmount || getEffectiveAmount(item.t);
         if (item.t.type === 'income') totalIncome += val;
         else totalExpense += val;
      });

      const sortedGroups = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));

      return {
         groupedTransactions: sortedGroups,
         summary: { income: totalIncome, expense: totalExpense, balance: totalIncome - Math.abs(totalExpense) }
      };
   }, [data.transactions, currentDate, filterCategory, filterAccount, searchTerm, selectedTag]);


   // --- HANDLERS ---
   const toggleSelection = (id: string) => {
      setSelectedIds(prev => {
         const newSet = new Set(prev);
         if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
         return newSet;
      });
   };

   const selectAll = () => {
      const allIds = new Set<string>();
      groupedTransactions.forEach(([_, items]) => items.forEach(i => !i.isGhost && allIds.add(i.t.id)));
      setSelectedIds(prev => prev.size === allIds.size ? new Set() : allIds);
   };

   const formatDateHeader = (dateString: string) => {
      const date = new Date(dateString + 'T12:00:00');
      return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).format(date).toUpperCase();
   };

   return (
      <div className="space-y-4 animate-in fade-in pb-24 relative">

         {/* 1. Header: Month Navigation & Chart */}
         <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-4 pb-2 border-b border-zinc-800 space-y-4">

            {/* Month Selector Carousel */}
            <div className="relative group">
               <div
                  ref={monthsContainerRef}
                  className="flex overflow-x-auto gap-4 px-4 pb-2 scrollbar-hide snap-x snap-mandatory mask-gradient"
                  style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' } as any}
               >
                  {monthsList.map((month, idx) => {
                     const isSelected = month.getMonth() === currentDate.getMonth() && month.getFullYear() === currentDate.getFullYear();
                     return (
                        <button
                           key={idx}
                           id={`month-btn-${idx}`}
                           onClick={() => setCurrentDate(month)}
                           className={`snap-center shrink-0 flex flex-col items-center justify-center min-w-[80px] py-2 rounded-xl transition-all ${isSelected ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
                        >
                           <span className={`text-xs uppercase font-bold tracking-widest ${isSelected ? 'text-primary' : 'text-zinc-500'}`}>
                              {month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                           </span>
                           <span className={`text-[10px] ${isSelected ? 'text-white' : 'text-zinc-600'}`}>
                              {month.getFullYear()}
                           </span>
                           {isSelected && <div className="w-1 h-1 bg-primary rounded-full mt-1"></div>}
                        </button>
                     );
                  })}
               </div>

               {/* Arrow Controls (Desktop) */}
               <button
                  onClick={() => {
                     const prev = new Date(currentDate);
                     prev.setMonth(prev.getMonth() - 1);
                     setCurrentDate(prev);
                     monthsContainerRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-sm rounded-r-full text-white opacity-0 group-hover:opacity-100 transition-opacity md:flex hidden"
               >
                  <ChevronLeft className="w-4 h-4" />
               </button>
               <button
                  onClick={() => {
                     const next = new Date(currentDate);
                     next.setMonth(next.getMonth() + 1);
                     setCurrentDate(next);
                     monthsContainerRef.current?.scrollBy({ left: 100, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-sm rounded-l-full text-white opacity-0 group-hover:opacity-100 transition-opacity md:flex hidden"
               >
                  <ChevronRight className="w-4 h-4" />
               </button>
            </div>

            {/* Monthly Trend Chart (Collapsible or Mini) */}
            <div className={`transition-all duration-300 overflow-hidden ${showChart ? 'h-32 opacity-100' : 'h-0 opacity-0'}`}>
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                     <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Gastos']}
                        labelFormatter={() => ''}
                     />
                     <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                           <Cell
                              key={`cell-${index}`}
                              fill={entry.isCurrent ? '#f97316' : '#27272a'}
                              className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                              onClick={() => setCurrentDate(entry.fullDate)}
                           />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>

            {/* Config & Search Bar */}
            <div className="flex flex-col gap-3 px-2">
               <div className="flex gap-2">
                  <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                     <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar transações..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-primary transition-all shadow-inner"
                     />
                  </div>
                  <button onClick={() => setShowChart(!showChart)} className={`p-2.5 rounded-xl border transition-all ${showChart ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                     <BarChartIcon className="w-5 h-5 transform rotate-90" />
                  </button>
               </div>

               {/* Smart Tags Horizontal List */}
               {uniqueTags.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2 mask-gradient-right">
                     {uniqueTags.map(tag => {
                        const isActive = selectedTag === tag;
                        return (
                           <button
                              key={tag}
                              onClick={() => setSelectedTag(isActive ? null : tag)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
                                 ${isActive
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                                 }`}
                           >
                              <Tag className={`w-3 h-3 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                              {tag}
                           </button>
                        );
                     })}
                  </div>
               )}
            </div>

            {/* Summary Strip */}
            <div className="flex items-center justify-between px-2 text-xs font-medium border-t border-white/5 pt-2">
               <div className="flex gap-4">
                  <span className="text-emerald-400">Entradas: {formatCurrency(summary.income, privacyMode)}</span>
                  <span className="text-red-400">Saídas: {formatCurrency(Math.abs(summary.expense), privacyMode)}</span>
               </div>
               <span className={`${summary.balance >= 0 ? 'text-emerald-500' : 'text-red-500'} font-bold`}>
                  {formatCurrency(summary.balance, privacyMode)}
               </span>
            </div>
         </div>

         {/* 2. Timeline List */}
         <div className="space-y-6">
            {groupedTransactions.length === 0 ? (
               <div className="py-20 text-center flex flex-col items-center">
                  <Calendar className="w-12 h-12 text-zinc-800 mb-4" />
                  <p className="text-zinc-500">Nenhuma movimentação em {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}.</p>
               </div>
            ) : (
               groupedTransactions.map(([dateKey, items]) => {
                  const dayBalance = items.reduce((acc, curr) => {
                     const val = curr.overrideAmount || getEffectiveAmount(curr.t);
                     return curr.t.type === 'income' ? acc + val : acc - Math.abs(val);
                  }, 0);

                  return (
                     <div key={dateKey} className="relative">
                        <div className="sticky top-[180px] z-20 bg-background/80 backdrop-blur-sm py-2 px-2 border-b border-zinc-800/50 flex justify-between items-center -mx-2">
                           <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                              {formatDateHeader(dateKey)}
                           </h3>
                           <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 ${dayBalance >= 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                              {dayBalance > 0 ? '+' : ''}{dayBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </span>
                        </div>

                        <div className="bg-surface rounded-2xl border border-zinc-800 divide-y divide-zinc-800/50 overflow-hidden shadow-sm mt-2">
                           {items.map((item, idx) => (
                              <TransactionRow
                                 key={`${item.t.id}-${idx}`}
                                 t={item.t}
                                 privacy={privacyMode}
                                 onDeleteClick={onDeleteTransaction}
                                 onEditClick={onEditTransaction}
                                 isGhost={item.isGhost}
                                 ghostIndex={item.ghostIndex}
                                 overrideAmount={item.overrideAmount}
                                 isSelected={selectedIds.has(item.t.id)}
                                 onSelect={toggleSelection}
                                 displayDate={item.sortDate}
                              />
                           ))}
                        </div>
                     </div>
                  );
               })
            )}
         </div>

         {/* Bulk Actions */}
         {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-surfaceHighlight border border-zinc-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in">
               <span className="text-sm font-medium text-white">{selectedIds.size} selecionados</span>
               <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-400 hover:text-white">Cancelar</button>
               <button onClick={() => onBulkDelete(selectedIds)} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-red-600 transition-colors">
                  <Trash2 className="w-3 h-3" /> Excluir
               </button>
            </div>
         )}
      </div>
   );
};