import React, { useState } from 'react';
import { formatCurrencyInput, parseCurrencyToNumber } from '../utils';

export const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, description }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title?: string, description?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">{title || "Excluir Transação?"}</h3>
        <p className="text-zinc-400 text-sm mb-6">{description || "Essa ação não pode ser desfeita. Tem certeza?"}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white font-medium transition-colors">Excluir</button>
        </div>
      </div>
    </div>
  );
};

export const GoalDepositModal = ({ isOpen, onClose, goalName, onConfirm }: { isOpen: boolean, onClose: () => void, goalName: string, onConfirm: (val: number) => void }) => {
  const [val, setVal] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">Adicionar ao Cofre: {goalName}</h3>
        <input 
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white mb-4"
          placeholder="R$ 0,00"
          value={val}
          onChange={e => setVal(formatCurrencyInput(e.target.value))}
        />
        <div className="flex gap-3">
           <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-zinc-800 text-white">Cancelar</button>
           <button onClick={() => {
              const num = parseCurrencyToNumber(val);
              if(num > 0) onConfirm(num);
           }} className="flex-1 py-2 rounded-xl bg-primary text-white font-bold">Depositar</button>
        </div>
      </div>
    </div>
  );
}