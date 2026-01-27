import React, { useState, useEffect } from 'react';
import { X, CreditCard, Save, Check, AlertCircle } from 'lucide-react';
import { AccountSettings } from '../types';
import { ACCOUNTS } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AccountSettings[];
  onSave: (s: AccountSettings) => void;
}

export const AccountSettingsModal: React.FC<Props> = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);
  const [closingDay, setClosingDay] = useState(1);
  const [dueDay, setDueDay] = useState(10);
  const [isSaved, setIsSaved] = useState(false);

  // Load settings whenever selected account changes or modal opens
  useEffect(() => {
    if (isOpen) {
        const existing = currentSettings.find(s => s.accountId === selectedAccount);
        if (existing) {
          setClosingDay(existing.closingDay);
          setDueDay(existing.dueDay);
        } else {
          // Defaults
          setClosingDay(1);
          setDueDay(10);
        }
        setIsSaved(false);
    }
  }, [selectedAccount, isOpen, currentSettings]); // Added currentSettings dependency to reflect immediate saves

  const handleSave = () => {
     onSave({ accountId: selectedAccount, closingDay, dueDay });
     setIsSaved(true);
     
     // Feedback loop
     setTimeout(() => {
        setIsSaved(false);
     }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary"/> Configurar Cartão
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X className="w-5 h-5"/></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Conta / Banco</label>
            <div className="relative">
              <select 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary appearance-none"
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
              >
                {ACCOUNTS.map(a => {
                   const isConfigured = currentSettings.some(s => s.accountId === a);
                   return <option key={a} value={a}>{a} {isConfigured ? '✓' : ''}</option>
                })}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-zinc-500">▼</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs text-zinc-500 mb-1">Dia Fechamento</label>
                <input 
                  type="number" min="1" max="31"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white text-center font-bold"
                  value={closingDay}
                  onChange={e => { setClosingDay(parseInt(e.target.value)); setIsSaved(false); }}
                />
             </div>
             <div>
                <label className="block text-xs text-zinc-500 mb-1">Dia Vencimento</label>
                <input 
                  type="number" min="1" max="31"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white text-center font-bold"
                  value={dueDay}
                  onChange={e => { setDueDay(parseInt(e.target.value)); setIsSaved(false); }}
                />
             </div>
          </div>

          <div className="text-xs text-zinc-500 bg-zinc-900 p-3 rounded-lg flex gap-2">
             <AlertCircle className="w-4 h-4 shrink-0 text-zinc-400" />
             <p>Compras feitas após o dia {closingDay} só entrarão na fatura que vence no dia {dueDay} do mês seguinte.</p>
          </div>

          <button 
            onClick={handleSave}
            className={`w-full font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
                isSaved 
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                : 'bg-primary hover:bg-primary/90 text-white'
            }`}
          >
            {isSaved ? (
                <>
                    <Check className="w-4 h-4" /> Configuração Salva!
                </>
            ) : (
                <>
                    <Save className="w-4 h-4" /> Salvar Configuração
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};