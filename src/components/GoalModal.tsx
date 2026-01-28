import React, { useState } from 'react';
import { X, Target } from 'lucide-react';
import { Goal } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (g: Omit<Goal, 'id'>) => void;
}

export const GoalModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !target) return;

    onSave({
      name,
      targetValue: parseFloat(target.replace(',', '.')),
      currentValue: parseFloat(current.replace(',', '.')),
      color: 'bg-primary' 
    });
    setName('');
    setTarget('');
    setCurrent('0');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-primary"/> Novo Cofre
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X className="w-5 h-5"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Nome do Objetivo</label>
            <input 
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Viagem Japão"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Meta (R$)</label>
            <input 
              required
              type="number"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="10000.00"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Já tenho guardado (R$)</label>
            <input 
              type="number"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
              value={current}
              onChange={e => setCurrent(e.target.value)}
            />
          </div>
          
          <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl mt-4">
            Criar Cofre
          </button>
        </form>
      </div>
    </div>
  );
};