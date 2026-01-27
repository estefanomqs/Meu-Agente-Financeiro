import React from 'react';
import { formatCurrency } from '../utils';

interface Props {
  category: string;
  limit: number;
  spent: number;
  privacy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const BudgetCard: React.FC<Props> = ({ category, limit, spent, privacy, onEdit, onDelete }) => {
  const percentage = Math.min((spent / limit) * 100, 100);
  
  // Color Logic
  let color = 'bg-emerald-500';
  if (percentage > 75) color = 'bg-yellow-500';
  if (percentage >= 100) color = 'bg-danger';

  return (
    <div className="bg-surface p-4 rounded-xl border border-zinc-800 relative group">
       <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-white">{category}</h4>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={onEdit} className="text-xs text-zinc-400 hover:text-white">Editar</button>
             <button onClick={onDelete} className="text-xs text-danger hover:text-red-400">Excluir</button>
          </div>
       </div>
       
       <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span className={percentage >= 100 ? 'text-danger font-bold' : ''}>{formatCurrency(spent, privacy)}</span>
          <span>Meta: {formatCurrency(limit, privacy)}</span>
       </div>
       
       <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${color}`} 
            style={{ width: `${percentage}%` }}
          ></div>
       </div>
    </div>
  );
};