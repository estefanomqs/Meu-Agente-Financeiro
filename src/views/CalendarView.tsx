import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { Transaction, AppData } from '../types';
import { getEffectiveAmount, getInstallmentValue, getActiveInstallmentIndex, ACCOUNTS, CATEGORIES } from '../utils';
import { TransactionRow } from '../components/TransactionRow';

interface CalendarViewProps {
  data: AppData;
  privacyMode: boolean;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  data, privacyMode, onEditTransaction, onDeleteTransaction
}) => {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterAccount, setFilterAccount] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'highest' | 'lowest'>('desc');

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startOffset = firstDay.getDay(); 
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calendarDate]);

  const checkFilters = (t: Transaction) => {
    if (filterCategory !== 'Todas' && t.category !== filterCategory) return false;
    if (filterAccount !== 'Todos' && t.account !== filterAccount) return false;
    return true;
  };

  const getTransactionsForDate = (year: number, month: number, day: number) => {
    const targetDate = new Date(year, month, day);
    let realTransactions: {t: Transaction, sortVal: number}[] = [];
    let ghostTransactions: {t: Transaction, index: number, sortVal: number}[] = [];
    let subscriptionTransactions: {t: Transaction, sortVal: number}[] = [];

    data.transactions.forEach(t => {
      if (!checkFilters(t)) return;
      const tDate = new Date(t.date);
      const isCreationDay = tDate.getDate() === day && tDate.getMonth() === month && tDate.getFullYear() === year;

      if (isCreationDay) {
        realTransactions.push({ t, sortVal: getEffectiveAmount(t) });
      } else {
        if (t.isInstallment && tDate.getDate() === day) {
           const idx = getActiveInstallmentIndex(t, targetDate);
           if (idx !== null && idx > 1) ghostTransactions.push({ t, index: idx, sortVal: getInstallmentValue(t) });
        }
      }
    });

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    data.subscriptions.forEach(sub => {
       const effectiveDueDay = Math.min(sub.dueDay, daysInCurrentMonth);
       if (effectiveDueDay === day) {
          const mockSubT: Transaction = {
            id: `sub-${sub.id}-${year}-${month}`,
            amount: sub.value,
            origin: sub.name,
            category: 'Assinaturas',
            account: 'Recorrente',
            paymentMethod: 'Automático',
            date: new Date(year, month, day).toISOString(),
            type: 'expense',
            tags: ['Assinatura'],
            isInstallment: false,
            isShared: false
          };
          if (checkFilters(mockSubT)) subscriptionTransactions.push({ t: mockSubT, sortVal: sub.value });
       }
    });

    const sortFn = (a: any, b: any) => {
        if (sortOrder === 'highest') return b.sortVal - a.sortVal;
        if (sortOrder === 'lowest') return a.sortVal - b.sortVal;
        return 0; 
    };

    realTransactions.sort(sortFn);
    ghostTransactions.sort(sortFn);
    subscriptionTransactions.sort(sortFn);

    return { 
        real: realTransactions.map(x => x.t), 
        ghost: ghostTransactions.map(x => ({t: x.t, index: x.index})), 
        subs: subscriptionTransactions.map(x => x.t) 
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
       <div className="lg:col-span-1 space-y-4 h-fit sticky top-4">
          <div className="bg-surface rounded-2xl border border-zinc-800 p-4">
             <div className="flex gap-2 mb-2 overflow-x-auto custom-scrollbar pb-2">
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white min-w-[100px]"><option value="Todas">Categ: Todas</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white min-w-[100px]"><option value="Todos">Conta: Todas</option>{ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}</select>
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white min-w-[100px]"><option value="desc">Recentes</option><option value="highest">Maior Valor</option><option value="lowest">Menor Valor</option></select>
             </div>
          </div>

          <div className="bg-surface rounded-2xl border border-zinc-800 p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold capitalize">{calendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} className="p-2 hover:bg-zinc-800 rounded-lg"><ChevronLeft className="w-5 h-5"/></button>
                  <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="p-2 hover:bg-zinc-800 rounded-lg"><ChevronRight className="w-5 h-5"/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center mb-2">
                {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-zinc-500 text-xs font-bold">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={idx} className="aspect-square"></div>;
                  const { real, ghost, subs } = getTransactionsForDate(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                  const hasExpense = real.some(t => t.type === 'expense') || ghost.length > 0;
                  const hasIncome = real.some(t => t.type === 'income');
                  const hasSub = subs.length > 0;
                  const isSelected = selectedDay === day;
                  return (
                    <button key={idx} onClick={() => setSelectedDay(day)} className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border ${isSelected ? 'bg-primary/20 border-primary text-white' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'}`}>
                      <span className="text-sm font-medium">{day}</span>
                      <div className="flex gap-1 mt-1 h-2">
                        {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>}
                        {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>}
                        {hasSub && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                      </div>
                    </button>
                  )
                })}
              </div>
          </div>
       </div>

       <div className="lg:col-span-2">
         {selectedDay ? (
           <div className="bg-surface rounded-2xl border border-zinc-800 overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <div><h3 className="font-semibold">Dia {selectedDay}</h3><p className="text-xs text-zinc-500">Filtros aplicados</p></div>
                <button onClick={() => setSelectedDay(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <div className="divide-y divide-zinc-800/50">
                 {(() => {
                    const { real, ghost, subs } = getTransactionsForDate(calendarDate.getFullYear(), calendarDate.getMonth(), selectedDay);
                    if (real.length === 0 && ghost.length === 0 && subs.length === 0) return <div className="p-8 text-center text-zinc-500">Nada registrado.</div>;
                    return (
                      <>
                        {real.map(t => <TransactionRow key={t.id} t={t} privacy={privacyMode} onDeleteClick={onDeleteTransaction} onEditClick={onEditTransaction} isBillView={true} />)}
                        {subs.map(t => <TransactionRow key={t.id} t={t} privacy={privacyMode} isSubscription={true} />)}
                        {ghost.map(({t, index}) => <TransactionRow key={`${t.id}-ghost-${index}`} t={t} privacy={privacyMode} isGhost={true} ghostIndex={index} />)}
                      </>
                    );
                 })()}
              </div>
           </div>
         ) : (
           <div className="h-full flex items-center justify-center text-zinc-600 border border-zinc-800/50 rounded-2xl border-dashed min-h-[300px]">
              <div className="text-center"><Calendar className="w-12 h-12 mx-auto mb-2 opacity-50"/><p>Selecione um dia</p></div>
           </div>
         )}
       </div>
    </div>
  );
};