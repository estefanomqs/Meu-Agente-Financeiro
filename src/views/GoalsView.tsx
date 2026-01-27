import React from 'react';
import { Target, Plus } from 'lucide-react';
import { AppData } from '../types';
import { formatCurrency } from '../utils';

interface GoalsViewProps {
  data: AppData;
  privacyMode: boolean;
  onAddGoal: () => void;
  onDeposit: (id: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ data, privacyMode, onAddGoal, onDeposit }) => {
  return (
    <div className="animate-in slide-in-from-bottom-4">
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold">Cofres & Objetivos</h2>
         <button onClick={onAddGoal} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90">+ Novo Cofre</button>
       </div>
       {data.goals.length === 0 ? (
         <div className="bg-surface p-8 rounded-2xl border border-zinc-800 text-center">
            <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Nenhum objetivo criado ainda.</p>
         </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {data.goals.map(goal => {
             const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
             return (
               <div key={goal.id} className="bg-surface p-6 rounded-2xl border border-zinc-800 relative group">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-white">{goal.name}</h3>
                    <div className="flex gap-2">
                       <button onClick={() => onDeposit(goal.id)} className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
                       <Target className="w-5 h-5 text-zinc-500" />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                     <span className="text-zinc-400">Atual: {formatCurrency(goal.currentValue, privacyMode)}</span>
                     <span className="text-zinc-400">Meta: {formatCurrency(goal.targetValue, privacyMode)}</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                     <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="mt-2 text-right text-xs text-primary font-medium">{progress.toFixed(1)}%</div>
               </div>
             );
           })}
         </div>
       )}
    </div>
  );
};