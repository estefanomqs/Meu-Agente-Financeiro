import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction } from '../types';
import { getEffectiveAmount, getInstallmentValue, formatCurrency } from '../utils';

interface Props {
  transactions: Transaction[];
  privacy: boolean;
}

export const ExpenseChart: React.FC<Props> = ({ transactions, privacy }) => {
  const dataMap: Record<string, number> = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  transactions.forEach(t => {
     // Only expenses
     if (t.type !== 'expense') return;

     let amount = 0;
     
     // Check date
     const tDate = new Date(t.date);
     
     if (t.isInstallment && t.installmentsTotal) {
        // Simple logic: Is this installment active this month?
        const startTotalMonths = tDate.getFullYear() * 12 + tDate.getMonth();
        const currentTotalMonths = currentYear * 12 + currentMonth;
        const diff = currentTotalMonths - startTotalMonths;
        
        if (diff >= 0 && diff < t.installmentsTotal) {
           amount = getInstallmentValue(t);
        }
     } else {
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
           amount = getEffectiveAmount(t);
        }
     }

     if (amount > 0) {
        dataMap[t.category] = (dataMap[t.category] || 0) + amount;
     }
  });

  const data = Object.entries(dataMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);

  const getColor = (cat: string) => {
     const colors: Record<string, string> = {
        'Alimentação': '#fb7185', // rose-400
        'Mercado': '#fb923c', // orange-400
        'Mercadinho': '#fdba74', // orange-300
        'Transporte': '#fbbf24', // amber-400
        'Moradia': '#60a5fa', // blue-400
        'Lazer': '#f472b6', // pink-400
        'Saúde': '#34d399', // emerald-400
        'Educação': '#818cf8', // indigo-400
        'Assinaturas': '#a78bfa', // purple-400
        'Compras': '#22d3ee', // cyan-400
        'Outros': '#a1a1aa' // zinc-400
     };
     return colors[cat] || '#71717a';
  };

  if (data.length === 0) return (
     <div className="h-64 flex items-center justify-center text-zinc-500 border border-zinc-800 rounded-2xl border-dashed">
        Sem gastos este mês.
     </div>
  );

  return (
    <div className="h-72 w-full bg-surface p-4 rounded-2xl border border-zinc-800 flex flex-col">
      <h3 className="font-semibold mb-2 text-white text-sm">Distribuição de Gastos</h3>
      
      <div className="flex flex-1 min-h-0 items-center gap-2">
         {/* Chart Section */}
         <div className="w-1/2 h-full min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie
                     data={data}
                     cx="50%"
                     cy="50%"
                     innerRadius={45}
                     outerRadius={65}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                  >
                     {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                     ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', padding: '8px' }}
                     itemStyle={{ color: '#ffffff', fontSize: '12px' }}
                     formatter={(value: number) => privacy ? '••••' : formatCurrency(value)}
                  />
               </PieChart>
            </ResponsiveContainer>
            
            {/* Center Total Text (Optional) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <span className="text-[10px] text-zinc-500 font-medium">Total</span>
            </div>
         </div>

         {/* Custom Legend Section */}
         <div className="w-1/2 h-full overflow-y-auto custom-scrollbar pr-2">
            <div className="flex flex-col gap-2">
               {data.map((item) => {
                  const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                  return (
                     <div key={item.name} className="flex justify-between items-center text-xs group">
                        <div className="flex items-center gap-2 overflow-hidden">
                           <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColor(item.name) }}></div>
                           <span className="text-zinc-300 truncate group-hover:text-white transition-colors" title={item.name}>
                              {item.name}
                           </span>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2">
                           <span className="font-medium text-white">
                              {formatCurrency(item.value, privacy)}
                           </span>
                           <span className="text-[10px] text-zinc-500">
                              {percent.toFixed(1)}%
                           </span>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>
      </div>
    </div>
  );
};