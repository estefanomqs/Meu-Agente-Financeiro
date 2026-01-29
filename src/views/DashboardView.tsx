import React, { useState, useMemo } from 'react';
import {
   Wallet, TrendingUp, CreditCard,
   ChevronLeft, ChevronRight, ArrowRight,
   Upload, Sparkles, TrendingDown
} from 'lucide-react';
import { Transaction, AppData, ViewState } from '../types';
import { formatCurrency, getEffectiveAmount, getInstallmentValue, getInstallmentDates } from '../utils';
import { ForecastChart } from '../components/ForecastChart';
import { TransactionRow } from '../components/TransactionRow';
import { InsightHero } from '../components/InsightHero';
import { FinancialDistribution } from '../components/FinancialDistribution';

interface DashboardViewProps {
   data: AppData;
   privacyMode: boolean;
   onEditTransaction: (t: Transaction) => void;
   onDeleteTransaction: (id: string) => void;
   setView: (v: ViewState) => void;
   onOpenImport: () => void;
   userName: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
   data, privacyMode, onEditTransaction, onDeleteTransaction, setView, onOpenImport, userName
}) => {
   const [dashboardDate, setDashboardDate] = useState(new Date());

   const stats = useMemo(() => {
      const targetMonth = dashboardDate.getMonth();
      const targetYear = dashboardDate.getFullYear();
      const nextMonthDate = new Date(dashboardDate);
      nextMonthDate.setMonth(targetMonth + 1);
      const nextMonth = nextMonthDate.getMonth();
      const nextYear = nextMonthDate.getFullYear();

      let income = 0;
      let cashExpenses = 0;
      let commitments = 0;
      let nextCommitments = 0;

      data.transactions.forEach(t => {
         const amount = getEffectiveAmount(t);
         const isCredit = t.paymentMethod === 'Crédito';
         const foundSettings = data.accountSettings.find(s => s.accountId === t.account);
         const settings = foundSettings || (isCredit ? { accountId: t.account, closingDay: 1, dueDay: 10 } : undefined);
         const isMatch = (d: Date, m: number, y: number) => d.getMonth() === m && d.getFullYear() === y;

         if (t.type === 'income') {
            const dates = getInstallmentDates(t, settings);
            dates.forEach(d => {
               if (isMatch(d, targetMonth, targetYear)) income += (t.installmentsTotal ? getInstallmentValue(t) : amount);
            });
         } else {
            const installmentValue = t.installmentsTotal ? getInstallmentValue(t) : amount;
            const dates = getInstallmentDates(t, settings);
            dates.forEach(d => {
               if (isMatch(d, targetMonth, targetYear)) {
                  if (isCredit) commitments += installmentValue;
                  else cashExpenses += installmentValue;
               }
               if (isMatch(d, nextMonth, nextYear)) {
                  if (isCredit) nextCommitments += installmentValue;
               }
            });
         }
      });

      const totalExpenses = cashExpenses + commitments;
      const balance = income - totalExpenses;
      const expenseRatio = income > 0 ? Math.min((totalExpenses / income) * 100, 100) : (totalExpenses > 0 ? 100 : 0);

      return { income, cashExpenses, commitments, nextCommitments, totalExpenses, balance, expenseRatio };
   }, [data.transactions, data.accountSettings, dashboardDate]);

   // --- HORIZON CARD LOGIC ---
   const creditStats = useMemo(() => {
      const today = new Date();
      const m0 = today.getMonth();
      const y0 = today.getFullYear();

      const m1Date = new Date(y0, m0 + 1, 1);
      const m2Date = new Date(y0, m0 + 2, 1);

      let bill0 = 0;
      let bill1 = 0;
      let bill2 = 0;

      data.transactions.forEach(t => {
         if (t.paymentMethod !== 'Crédito') return;

         const amount = getInstallmentValue(t);
         const foundSettings = data.accountSettings.find(s => s.accountId === t.account);
         const settings = foundSettings || { accountId: t.account, closingDay: 1, dueDay: 10 };
         const dates = getInstallmentDates(t, settings);

         dates.forEach(d => {
            if (d.getMonth() === m0 && d.getFullYear() === y0) bill0 += amount;
            if (d.getMonth() === m1Date.getMonth() && d.getFullYear() === m1Date.getFullYear()) bill1 += amount;
            if (d.getMonth() === m2Date.getMonth() && d.getFullYear() === m2Date.getFullYear()) bill2 += amount;
         });
      });

      // Danger Logic
      const currentDay = today.getDate();
      const isDanger = currentDay > 20 && bill1 > (bill0 * 0.7) && bill0 > 0;

      return { bill0, bill1, bill2, isDanger };
   }, [data.transactions, data.accountSettings]);

   // --- MOBILE COMPONENTS ---
   const MobileCombinedCard = () => (
      <div className="bg-surface border border-zinc-800 rounded-3xl p-5 relative overflow-hidden h-full flex flex-col justify-center">
         {/* Income Section */}
         <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800/50">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
               </div>
               <span className="text-sm font-medium text-zinc-400">Entradas</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
               {formatCurrency(stats.income, privacyMode)}
            </span>
         </div>

         {/* Expense/Commitments Section */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
               </div>
               <span className="text-sm font-medium text-zinc-400">Saídas</span>
            </div>
            <div className="text-right">
               <span className="text-xl font-bold text-white tracking-tight block">
                  {formatCurrency(stats.commitments, privacyMode)}
               </span>
            </div>
         </div>

         {/* Peek at Next Month (Tiny Footer) */}
         <div className="mt-3 pt-3 border-t border-zinc-800/30 flex justify-between items-center px-1">
            <span className="text-[10px] text-zinc-500">Próximo Mês</span>
            <span className="text-[10px] font-bold text-zinc-400">{formatCurrency(stats.nextCommitments, privacyMode)}</span>
         </div>
      </div>
   );

   // --- DESKTOP COMPONENTS ---
   const IncomeCard = () => (
      <div className="bg-surface border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all h-full flex flex-col justify-center">
         <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
               <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Receitas</span>
         </div>
         <div className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(stats.income, privacyMode)}
         </div>
      </div>
   );

   const HorizonCard = () => {
      const { bill0, bill1, bill2, isDanger } = creditStats;

      return (
         <div className={`
            relative rounded-3xl p-0 overflow-hidden h-full border transition-all duration-500 group
            bg-gradient-to-br from-surface to-surfaceHighlight
            ${isDanger ? 'border-orange-500/30 shadow-[0_0_40px_-10px_rgba(249,115,22,0.15)]' : 'border-zinc-800 hover:border-zinc-700'}
         `}>
            {/* Background Glow */}
            {isDanger && <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none"></div>}

            {/* MOBILE LAYOUT (< md) - Split View */}
            <div className="md:hidden flex h-full relative z-10">
               {/* Left: Current Bill */}
               <div className="flex-1 p-5 flex flex-col justify-center border-r border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                     <CreditCard className="w-4 h-4 text-zinc-400" />
                     <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Atual</span>
                  </div>
                  <span className="text-2xl font-bold text-white tracking-tight">
                     {formatCurrency(bill0, privacyMode)}
                  </span>
                  <div className="mt-2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                     <div className="h-full bg-primary w-full rounded-full opacity-80"></div>
                  </div>
               </div>

               {/* Right: Next Bill */}
               <div className="flex-1 p-5 flex flex-col justify-center bg-black/20">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Próxima</span>
                     {isDanger && <TrendingUp className="w-3 h-3 text-orange-500 animate-pulse" />}
                  </div>
                  <span className={`text-xl font-bold tracking-tight ${isDanger ? 'text-orange-400' : 'text-zinc-300'}`}>
                     {formatCurrency(bill1, privacyMode)}
                  </span>
                  <div className="mt-2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                     <div
                        className={`h-full rounded-full transition-all ${isDanger ? 'bg-orange-500' : 'bg-zinc-500'}`}
                        style={{ width: bill0 > 0 ? `${Math.min((bill1 / bill0) * 100, 100)}%` : '0%' }}
                     ></div>
                  </div>
               </div>
            </div>

            {/* DESKTOP LAYOUT (>= md) - Timeline View */}
            <div className="hidden md:flex flex-col justify-between h-full p-6 relative z-10">
               <div className="flex items-center gap-2 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isDanger ? 'bg-orange-500/10 border-orange-500/20' : 'bg-primary/10 border-primary/20'}`}>
                     <CreditCard className={`w-5 h-5 ${isDanger ? 'text-orange-500' : 'text-primary'}`} />
                  </div>
                  <div>
                     <h3 className="font-bold text-white leading-tight">Horizonte de Faturas</h3>
                     <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Previsão 90 Dias</p>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-8 items-center">
                  {/* Month 0 */}
                  <div className="relative">
                     <span className="text-xs text-zinc-500 mb-1 block">Mês Atual</span>
                     <span className="text-xl font-bold text-white block mb-2">{formatCurrency(bill0, privacyMode)}</span>
                     <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-400 w-full" />
                     </div>
                     {/* Connector */}
                     <div className="absolute top-1/2 -right-6 text-zinc-700">
                        <ArrowRight className="w-4 h-4" />
                     </div>
                  </div>

                  {/* Month 1 */}
                  <div className="relative">
                     <span className="text-xs text-zinc-500 mb-1 block">Próximo</span>
                     <span className={`text-xl font-bold block mb-2 ${isDanger ? 'text-orange-400' : 'text-zinc-300'}`}>
                        {formatCurrency(bill1, privacyMode)}
                     </span>
                     <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                           className={`h-full transition-all ${isDanger ? 'bg-orange-500' : 'bg-zinc-500'}`}
                           style={{ width: bill0 > 0 ? `${Math.min((bill1 / bill0) * 100, 100)}%` : '0%' }}
                        />
                     </div>
                     {/* Connector */}
                     <div className="absolute top-1/2 -right-6 text-zinc-700">
                        <ArrowRight className="w-4 h-4" />
                     </div>
                  </div>

                  {/* Month 2 */}
                  <div>
                     <span className="text-xs text-zinc-500 mb-1 block">Futuro</span>
                     <span className="text-xl font-bold text-zinc-400 block mb-2">{formatCurrency(bill2, privacyMode)}</span>
                     <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-600" style={{ width: bill0 > 0 ? `${Math.min((bill2 / bill0) * 100, 100)}%` : '0%' }} />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      );
   };

   // Shared Balance Card
   const BalanceCard = () => (
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all shadow-xl h-full flex flex-col justify-between">
         <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -mr-16 -mt-16 opacity-20 transition-all duration-1000 ${stats.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
         <div className="relative z-10 sticky top-0">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 backdrop-blur-md">
                  <Wallet className="w-5 h-5 text-zinc-100" />
               </div>
               <span className="text-sm font-medium text-zinc-300">Fluxo Líquido</span>
            </div>
            <div className={`text-3xl font-bold tracking-tight ${stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
               {formatCurrency(stats.balance, privacyMode)}
            </div>
            <div className="mt-4 w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
               <div
                  className={`h-full rounded-full transition-all duration-1000 ${stats.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(stats.expenseRatio, 100)}%` }}
               ></div>
            </div>
         </div>
      </div>
   );

   const ForecastCardWrapper = () => (
      <div className="bg-surface rounded-3xl border border-zinc-800 p-6 md:p-8 h-full">
         <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-white">Fluxo do Mês</h3>
         </div>
         <ForecastChart
            transactions={data.transactions}
            subscriptions={data.subscriptions}
            currentBalance={stats.balance}
            accountSettings={data.accountSettings}
         />
      </div>
   );

   return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 pb-10 max-w-6xl mx-auto">
         {/* 0. HERO & NAVIGATION */}
         <div className="space-y-4">
            <InsightHero data={data} userName={userName} />

            {/* HEADER: Date Navigation */}
            <div className="flex items-center justify-center gap-4">
               <button onClick={() => setDashboardDate(new Date(dashboardDate.setMonth(dashboardDate.getMonth() - 1)))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
               </button>
               <h2 className="text-xl font-bold text-white capitalize">
                  {dashboardDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
               </h2>
               <button onClick={() => setDashboardDate(new Date(dashboardDate.setMonth(dashboardDate.getMonth() + 1)))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
               </button>
            </div>
         </div>

         {/* 1. MOBILE LAYOUT (CAROUSEL) - Visible ONLY on Mobile */}
         <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory px-4 -mx-4 pb-6 gap-4 no-scrollbar">
            {/* Card 1: Horizon (Bills) - PRIMARY FOCUS */}
            <div className="min-w-[85vw] snap-center">
               <HorizonCard />
            </div>
            {/* Card 2: Balance */}
            <div className="min-w-[85vw] snap-center">
               <BalanceCard />
            </div>
            {/* Card 3: Combined (Original) - Kept as Summary */}
            <div className="min-w-[85vw] snap-center">
               <MobileCombinedCard />
            </div>
            {/* Card 4: Forecast */}
            <div className="min-w-[85vw] snap-center">
               <ForecastCardWrapper />
            </div>
         </div>

         {/* 1. DESKTOP LAYOUT (GRID) - 4 COLS Logic for Horizon Span */}
         <div className="hidden md:grid grid-cols-4 gap-6">
            <div className="col-span-1">
               <IncomeCard />
            </div>
            <div className="col-span-1">
               <BalanceCard />
            </div>
            {/* Horizon spans 2 columns */}
            <div className="col-span-2">
               <HorizonCard />
            </div>
            {/* Full Width Forecast */}
            <div className="col-span-4">
               <ForecastCardWrapper />
            </div>
         </div>

         {/* 2. PIE CHARTS */}
         <FinancialDistribution
            transactions={data.transactions}
            accountSettings={data.accountSettings}
            currentDate={dashboardDate}
            privacy={privacyMode}
         />

         {/* 3. RECENT TRANSACTIONS */}
         <div className="mt-4">
            <div className="flex items-center justify-between mb-4 px-2">
               <h3 className="text-xl font-bold text-white">Últimas Movimentações</h3>
               <button onClick={() => setView('transactions')} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                  Ver Extrato Completo <ArrowRight className="w-4 h-4" />
               </button>
            </div>
            <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800/50 shadow-xl">
               {data.transactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map(t => (
                     <TransactionRow
                        key={t.id}
                        t={t}
                        privacy={privacyMode}
                        onDeleteClick={onDeleteTransaction}
                        onEditClick={onEditTransaction}
                     />
                  ))}
               {data.transactions.length === 0 && (
                  <div className="p-16 text-center">
                     <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                        <Sparkles className="w-6 h-6 text-zinc-600" />
                     </div>
                     <h3 className="text-zinc-300 font-medium mb-1">Tudo limpo por aqui</h3>
                     <p className="text-zinc-500 text-sm">Nenhuma transação registrada neste período.</p>
                  </div>
               )}
            </div>
         </div>

         {/* 4. QUICK ACTIONS STRIP */}
         <div className="grid grid-cols-2 gap-4">
            <button onClick={onOpenImport} className="bg-surface hover:bg-zinc-800 border border-zinc-800 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] group">
               <Upload className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
               <span className="text-sm font-medium text-zinc-300">Importar Extrato</span>
            </button>
            <button onClick={() => setView('goals')} className="bg-surface hover:bg-zinc-800 border border-zinc-800 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] group">
               <Sparkles className="w-5 h-5 text-zinc-400 group-hover:text-pink-400 transition-colors" />
               <span className="text-sm font-medium text-zinc-300">Metas & Sonhos</span>
            </button>
         </div>
      </div>
   );
};