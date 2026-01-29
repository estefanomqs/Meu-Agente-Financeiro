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

   // --- DESKTOP COMPONENTS ---
   const IncomeCard = () => (
      <div className="bg-surface border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all h-full">
         <div className="flex items-center gap-3 mb-4">
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

   const CommitmentsCard = () => (
      <div className="bg-surface border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all h-full">
         <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
               </div>
               <span className="text-sm font-medium text-zinc-400">Compromissos</span>
            </div>
            <div className="text-right">
               <span className="text-[10px] text-zinc-500 block">Próximo Mês</span>
               <span className="text-xs font-bold text-zinc-300">{formatCurrency(stats.nextCommitments, privacyMode)}</span>
            </div>
         </div>
         <div className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(stats.commitments, privacyMode)}
         </div>
         <div className="mt-2 text-xs text-zinc-500">
            Faturas + Contas Fixas
         </div>
      </div>
   );

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
            {/* Card 1: Combined (Starts at 0 scroll) */}
            <div className="min-w-[85vw] snap-center">
               <MobileCombinedCard />
            </div>
            {/* Card 2: Balance (Second Priority) */}
            <div className="min-w-[85vw] snap-center">
               <BalanceCard />
            </div>
            {/* Card 3: Forecast (Last) */}
            <div className="min-w-[85vw] snap-center">
               <ForecastCardWrapper />
            </div>
         </div>

         {/* 1. DESKTOP LAYOUT (GRID) - Visible ONLY on Desktop */}
         <div className="hidden md:grid grid-cols-3 gap-6">
            {/* Order: Income, Commitments, Balance */}
            <IncomeCard />
            <CommitmentsCard />
            <BalanceCard />
            {/* Full Width Forecast */}
            <div className="col-span-3">
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