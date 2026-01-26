import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Transaction, Subscription } from '../types';
import { getEffectiveAmount } from '../utils';

interface Props {
  transactions: Transaction[];
  subscriptions: Subscription[];
  currentBalance: number;
}

export const ForecastChart: React.FC<Props> = ({ transactions, subscriptions, currentBalance }) => {
  // Simple Forecasting Logic
  const monthsToForecast = 6;
  const data = [];

  // Calculate Average Income/Fixed Expenses
  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  const relevantTx = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
  
  let totalIncome = 0;
  let totalExpense = 0; // Only non-installments
  
  relevantTx.forEach(t => {
    // We only use NON-installment expenses for the "Average Variable Spend" calculation
    // Installments are calculated precisely based on their dates
    const val = getEffectiveAmount(t);
    if (t.type === 'income') {
      totalIncome += val;
    } else if (!t.isInstallment) {
      totalExpense += val;
    }
  });

  // Monthly Average
  const avgIncome = totalIncome / 3 || 0;
  const avgVariableExpense = totalExpense / 3 || 0; 
  const monthlySubscriptionCost = subscriptions.reduce((acc, s) => acc + s.value, 0);

  // Base Net Flow (Income - Variable - Subs)
  const baseNetFlow = avgIncome - avgVariableExpense - monthlySubscriptionCost;

  let simulatedBalance = currentBalance;

  for (let i = 0; i <= monthsToForecast; i++) {
    const forecastDate = new Date();
    forecastDate.setMonth(now.getMonth() + i);
    forecastDate.setDate(1); // Compare months

    // Calculate Installments due in this specific month
    let monthInstallmentDebt = 0;

    transactions.forEach(t => {
      if (t.isInstallment && t.installmentsTotal && t.installmentsTotal > 0 && t.type === 'expense') {
         const tDate = new Date(t.date);
         
         // Calculate the start month of the transaction
         // Month difference
         const monthDiff = (forecastDate.getFullYear() - tDate.getFullYear()) * 12 + (forecastDate.getMonth() - tDate.getMonth());
         
         // If monthDiff is >= 0 and < installmentsTotal, we owe a slice
         if (monthDiff >= 0 && monthDiff < t.installmentsTotal) {
           const effectiveTotal = getEffectiveAmount(t);
           // Crucial: The monthly cost is Total / Count
           const monthlySlice = effectiveTotal / t.installmentsTotal;
           monthInstallmentDebt += monthlySlice;
         }
      }
    });

    // For the current month (i=0), we assume currentBalance ALREADY reflects transactions made so far.
    // However, for PROJECTION, we add the base flow.
    // To smooth it out: Month 0 is just "Now". Month 1 is "Now + Flow".
    
    if (i > 0) {
      simulatedBalance += baseNetFlow;
      simulatedBalance -= monthInstallmentDebt;
    }

    data.push({
      name: i === 0 ? 'Atual' : forecastDate.toLocaleString('pt-BR', { month: 'short' }),
      balance: Math.round(simulatedBalance),
    });
  }

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="name" stroke="#52525b" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#a855f7' }}
            formatter={(val: number) => [`R$ ${val}`, 'Saldo Projetado']}
          />
          <Area type="monotone" dataKey="balance" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};