import React from 'react';
import { AppData, Budget } from '../types';
import { getEffectiveAmount } from '../utils';
import { BudgetCard } from '../components/BudgetCard';

interface BudgetsViewProps {
  data: AppData;
  privacyMode: boolean;
  onSetBudget: (b: Omit<Budget, 'id'>) => void;
  onDeleteBudget: (id: string) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ data, privacyMode, onSetBudget, onDeleteBudget }) => {
  return (
    <div className="animate-in slide-in-from-bottom-4">
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold">Orçamentos Mensais</h2>
         <div className="flex gap-2">
           <button onClick={() => {
             const cat = prompt("Categoria (Ex: Alimentação):");
             if(cat) {
               const limit = prompt("Limite Mensal (R$):");
               if(limit) onSetBudget({ category: cat, limit: parseFloat(limit) });
             }
           }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90">
             + Novo Orçamento
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.budgets.map(b => {
             const spent = data.transactions.reduce((acc, t) => {
                if(t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() === new Date().getMonth()) {
                   return acc + getEffectiveAmount(t);
                }
                return acc;
             }, 0);

             return <BudgetCard 
                key={b.id} 
                category={b.category} 
                limit={b.limit} 
                spent={spent} 
                privacy={privacyMode} 
                onEdit={() => {
                   const newLimit = prompt(`Novo limite para ${b.category}:`, b.limit.toString());
                   if(newLimit) onSetBudget({ category: b.category, limit: parseFloat(newLimit) });
                }}
                onDelete={() => {
                  if(confirm("Excluir orçamento?")) onDeleteBudget(b.id);
                }}
             />
          })}
       </div>
       {data.budgets.length === 0 && (
          <div className="p-8 text-center text-zinc-500 border border-zinc-800 rounded-2xl border-dashed">
             Defina tetos de gastos para suas categorias para acompanhar o progresso aqui.
          </div>
       )}
    </div>
  );
};