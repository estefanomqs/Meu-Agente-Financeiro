import React, { useState, useMemo } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, CreditCard, 
  ChevronLeft, ChevronRight, CalendarClock, ArrowRight,
  MoreHorizontal
} from 'lucide-react';
import { Transaction, AppData, ViewState } from '../types';
import { formatCurrency, getEffectiveAmount, getInstallmentValue, getEstimatedPaymentDate } from '../utils';
import { ForecastChart } from '../components/ForecastChart';
import { ExpenseChart } from '../components/ExpenseChart';
import { TransactionRow } from '../components/TransactionRow';

interface DashboardViewProps {
  data: AppData;
  privacyMode: boolean;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  setView: (v: ViewState) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  data, privacyMode, onEditTransaction, onDeleteTransaction, setView 
}) => {
  const [dashboardDate, setDashboardDate] = useState(new Date());

  const stats = useMemo(() => {
    const targetMonth = dashboardDate.getMonth();
    const targetYear = dashboardDate.getFullYear();

    // Cálculo do Mês Seguinte (Para previsão de fatura futura)
    const nextMonthDate = new Date(dashboardDate);
    nextMonthDate.setMonth(targetMonth + 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextYear = nextMonthDate.getFullYear();

    let income = 0;
    let cashExpenses = 0; // Débito, Pix, Dinheiro (Sai na hora)
    let currentBill = 0; // Cartão que vence NESTE mês selecionado
    let nextBill = 0;    // Cartão que vence no PRÓXIMO mês

    data.transactions.forEach(t => {
      const amount = getEffectiveAmount(t);
      const isCredit = t.paymentMethod === 'Crédito';
      const foundSettings = data.accountSettings.find(s => s.accountId === t.account);
      const settings = foundSettings || (isCredit ? { accountId: t.account, closingDay: 1, dueDay: 10 } : undefined);

      if (t.type === 'income') {
        const tDate = new Date(t.date);
        if (tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear) {
           income += amount;
        }
      } else {
        // Lógica de Despesa
        if (t.isInstallment && t.installmentsTotal) {
           const installmentValue = getInstallmentValue(t);
           const tDate = new Date(t.date);
           
           for (let i = 0; i < t.installmentsTotal; i++) {
              const nominalDate = new Date(tDate);
              nominalDate.setMonth(tDate.getMonth() + i);
              const payDate = getEstimatedPaymentDate(nominalDate.toISOString(), isCredit ? settings : undefined);

              // Se cair neste mês
              if (payDate.getMonth() === targetMonth && payDate.getFullYear() === targetYear) {
                 if (isCredit) currentBill += installmentValue;
                 else cashExpenses += installmentValue;
              }

              // Se cair no mês que vem (Apenas crédito interessa prever)
              if (isCredit && payDate.getMonth() === nextMonth && payDate.getFullYear() === nextYear) {
                 nextBill += installmentValue;
              }
           }
        } else {
           // À Vista / Parcela Única
           const payDate = getEstimatedPaymentDate(t.date, isCredit ? settings : undefined);

           if (payDate.getMonth() === targetMonth && payDate.getFullYear() === targetYear) {
              if (isCredit) currentBill += amount;
              else cashExpenses += amount;
           }

           if (isCredit && payDate.getMonth() === nextMonth && payDate.getFullYear() === nextYear) {
              nextBill += amount;
           }
        }
      }
    });

    const totalExpenses = cashExpenses + currentBill;
    const balance = income - totalExpenses;
    const expenseRatio = income > 0 ? Math.min((totalExpenses / income) * 100, 100) : (totalExpenses > 0 ? 100 : 0);

    return { income, cashExpenses, currentBill, nextBill, totalExpenses, balance, expenseRatio };
  }, [data.transactions, data.accountSettings, dashboardDate]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-10">
      
      {/* 1. SELETOR DE DATA (Obrigatório para navegação estilo Organizze) */}
      <div className="flex items-center justify-between bg-surface p-2 rounded-2xl border border-zinc-800 w-full max-w-md mx-auto mb-8 shadow-lg shadow-black/20">
        <button 
          onClick={() => setDashboardDate(new Date(dashboardDate.setMonth(dashboardDate.getMonth() - 1)))} 
          className="p-3 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
        >
           <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
           <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest text-[10px]">Competência</h2>
           <span className="text-lg font-bold text-white capitalize">
             {dashboardDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
           </span>
        </div>
        <button 
          onClick={() => setDashboardDate(new Date(dashboardDate.setMonth(dashboardDate.getMonth() + 1)))} 
          className="p-3 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
        >
           <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 2. GRID PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
         
         {/* COLUNA ESQUERDA: Saúde Financeira */}
         <div className="md:col-span-7 flex flex-col gap-6">
            
            {/* Card de Saldo */}
            <div className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-3xl border border-zinc-800 relative overflow-hidden shadow-2xl">
               <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -mr-16 -mt-16 opacity-20 ${stats.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                     <span className="flex items-center gap-2 text-zinc-400 text-sm font-medium bg-zinc-800/50 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
                        <Wallet className="w-4 h-4" /> Sobras do Mês
                     </span>
                  </div>
                  <div className="mb-6">
                     <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${stats.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                        {formatCurrency(stats.balance, privacyMode)}
                     </h1>
                  </div>
                  {/* Barra de Progresso */}
                  <div className="space-y-2">
                     <div className="flex justify-between text-xs font-medium">
                        <span className="text-zinc-400">Gastos: {formatCurrency(stats.totalExpenses, privacyMode)}</span>
                        <span className="text-zinc-400">Receitas: {formatCurrency(stats.income, privacyMode)}</span>
                     </div>
                     <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-800">
                        <div 
                           className={`h-full rounded-full transition-all duration-1000 ease-out ${stats.expenseRatio > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                           style={{ width: `${stats.expenseRatio}%` }}
                        ></div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Gráfico de Previsão */}
            <div className="bg-surface p-6 rounded-3xl border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary"/> Fluxo Futuro
                   </h3>
                </div>
                <ForecastChart 
                  transactions={data.transactions} 
                  subscriptions={data.subscriptions} 
                  currentBalance={stats.balance} 
                  accountSettings={data.accountSettings}
                />
            </div>
         </div>

         {/* COLUNA DIREITA: Cartões e Detalhes */}
         <div className="md:col-span-5 flex flex-col gap-6">
            
            {/* Widget de Cartão de Crédito */}
            <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
               <div className="p-6 border-b border-zinc-800/50">
                  <h3 className="font-semibold text-white flex items-center gap-2 mb-1">
                     <CreditCard className="w-5 h-5 text-primary" /> Fatura de Cartão
                  </h3>
                  <p className="text-xs text-zinc-500">Total somado de todos os cartões</p>
               </div>
               <div className="p-6 pb-2">
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-xs font-medium text-orange-400 bg-orange-400/10 px-2 py-1 rounded-md border border-orange-400/20">
                        Vence em {dashboardDate.toLocaleString('pt-BR', { month: 'short' })}
                     </span>
                  </div>
                  <div className="text-3xl font-bold text-white tracking-tight mb-1">
                     {formatCurrency(stats.currentBill, privacyMode)}
                  </div>
               </div>
               {/* Espiada no Mês Seguinte */}
               <div className="mx-4 mb-4 p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-xs text-zinc-500 mb-1">Próxima Fatura (Estimada)</p>
                        <p className="text-lg font-semibold text-zinc-300">
                           {formatCurrency(stats.nextBill, privacyMode)}
                        </p>
                     </div>
                     <button 
                       onClick={() => setDashboardDate(new Date(dashboardDate.setMonth(dashboardDate.getMonth() + 1)))}
                       className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                     >
                        <ArrowRight className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </div>

            {/* Gráfico de Pizza */}
            <ExpenseChart transactions={data.transactions} privacy={privacyMode} />
         </div>
      </div>

      {/* 3. LISTA DE MOVIMENTAÇÕES RECENTES */}
      <div className="mt-8">
         <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-bold text-white">Últimas Movimentações</h3>
            <button onClick={() => setView('transactions')} className="text-sm text-primary hover:text-primary/80 transition-colors">Ver Tudo</button>
         </div>
         <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800/50">
            {data.transactions.slice(0, 5).map(t => (
               <TransactionRow 
                  key={t.id} 
                  t={t} 
                  privacy={privacyMode} 
                  onDeleteClick={onDeleteTransaction} 
                  onEditClick={onEditTransaction} 
               />
            ))}
            {data.transactions.length === 0 && (
               <div className="p-12 text-center text-zinc-500">Nenhuma transação neste período.</div>
            )}
         </div>
      </div>
    </div>
  );
};