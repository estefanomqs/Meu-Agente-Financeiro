import React from 'react';
import { AreaChart, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { Transaction, Subscription, AccountSettings } from '../types';
import { getEffectiveAmount, getEstimatedPaymentDate } from '../utils';

interface Props {
  transactions: Transaction[];
  subscriptions: Subscription[];
  currentBalance: number;
  accountSettings: AccountSettings[];
}

export const ForecastChart: React.FC<Props> = ({ transactions, subscriptions, currentBalance, accountSettings }) => {
  const monthsToForecast = 6;
  const data = [];
  const now = new Date();

  // Helper to find settings for a transaction
  const getSettings = (accountName: string) => accountSettings.find(s => s.accountId === accountName);

  // 1. Calculate Average Baseline (Income - Non-Credit Expenses)
  // We want to forecast "Predictable Cash Flow".
  // Fixed Income + Avg Variable Debit Expenses + Subscriptions
  
  // Simplified logic for this demo:
  // We assume Future Income = Avg Past Income
  // We assume Future Expense = Specific Installments + Avg Variable Spend
  
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const relevantTx = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
  let totalIncome = 0;
  let totalVariableExpense = 0;

  relevantTx.forEach(t => {
     if (t.type === 'income') {
        totalIncome += getEffectiveAmount(t);
     } else if (!t.isInstallment) {
        // If it's a one-off expense, add to average
        totalVariableExpense += getEffectiveAmount(t);
     }
  });

  const avgIncome = totalIncome / 3 || 0;
  const avgVariable = totalVariableExpense / 3 || 0;
  const subsTotal = subscriptions.reduce((acc, s) => acc + s.value, 0);
  
  const baseMonthlyFlow = avgIncome - avgVariable - subsTotal;

  // 2. Build Month-by-Month Projection
  let simulatedBalance = currentBalance;

  for (let i = 0; i <= monthsToForecast; i++) {
    const forecastDate = new Date();
    forecastDate.setMonth(now.getMonth() + i);
    forecastDate.setDate(1); // Reference point

    let monthSpecificDebt = 0;

    // Calculate Installments & Deferred Credit Card Payments falling in this month
    transactions.forEach(t => {
       if (t.type === 'expense') {
          if (t.isInstallment && t.installmentsTotal) {
             // For installments, we calculate the payment date of EACH installment
             // If the payment date (adjusted by credit card logic) falls in 'forecastDate' month, add it.
             const tDate = new Date(t.date);
             const settings = getSettings(t.account);
             
             // Check all installments
             for (let inst = 0; inst < t.installmentsTotal; inst++) {
                // Nominal date of installment (e.g. 1st month, 2nd month...)
                const nominalDate = new Date(tDate);
                nominalDate.setMonth(tDate.getMonth() + inst);
                
                // Effective Payment Date (Credit Card Logic)
                const payDate = getEstimatedPaymentDate(nominalDate.toISOString(), t.paymentMethod === 'Crédito' ? settings : undefined);

                if (payDate.getMonth() === forecastDate.getMonth() && payDate.getFullYear() === forecastDate.getFullYear()) {
                   monthSpecificDebt += (getEffectiveAmount(t) / t.installmentsTotal);
                }
             }
          } else if (t.paymentMethod === 'Crédito') {
             // One-off Credit Card Purchase
             // Check if the payment falls in this forecast month
             const settings = getSettings(t.account);
             const payDate = getEstimatedPaymentDate(t.date, settings);
             
             if (payDate.getMonth() === forecastDate.getMonth() && payDate.getFullYear() === forecastDate.getFullYear()) {
                // Warning: This transaction is already in "Avg Variable" if it was recent. 
                // To avoid double counting, we only project "Future" credit card debts from "Past" transactions that haven't been paid yet.
                // Or simplified: We assume AvgVariable covers new spending, and this loop covers "Existing Debt being paid off".
                // Since this is a simple forecast: let's only count if it is a specific known future commitment or a very recent transaction not yet paid.
                // For simplicity in this demo, we skip one-off credit card lag to avoid complexity, 
                // focusing heavily on Installments which are the main "Future Debt".
             }
          }
       }
    });

    if (i > 0) {
       simulatedBalance += baseMonthlyFlow;
       simulatedBalance -= monthSpecificDebt;
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