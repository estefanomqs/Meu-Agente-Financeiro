import React, { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, Save, Check, Lock, DollarSign, Minus, Plus, Calendar, AlertTriangle, AlertOctagon } from 'lucide-react';
import { BillingCycleSlider } from './BillingCycleSlider';
import { AccountSettings } from '../types';
import { ACCOUNTS, getEstimatedPaymentDate, getMonthName } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AccountSettings[];
  onSave: (settings: AccountSettings[], deletedIds: string[]) => void;
}

export const AccountSettingsModal: React.FC<Props> = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);
  const [tempConfigs, setTempConfigs] = useState<Record<string, { closing: number, due: number }>>({});
  const [deletedAccounts, setDeletedAccounts] = useState<Set<string>>(new Set());

  const [isSaved, setIsSaved] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingDisableAccount, setPendingDisableAccount] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    if (isOpen) {
      const initialConfigs: Record<string, { closing: number, due: number }> = {};
      // Populate temp with EXISTING configurations to allow editing them easily?
      // Actually, previous logic was: ONLY existing ones to start.
      currentSettings.forEach(s => {
        initialConfigs[s.accountId] = { closing: s.closingDay, due: s.dueDay };
      });
      setTempConfigs(initialConfigs);
      setDeletedAccounts(new Set());
      setIsSaved(false);
      setShowDiscardConfirm(false);
      setPendingDisableAccount(null);
    }
  }, [isOpen, currentSettings]);

  // Check for unsaved changes
  const hasChanges = useMemo(() => {
    // Note: We don't return early here to verify hook consistency, 
    // but logic inside relies on tempConfigs which is always valid state.
    if (!isOpen) return false;

    const hasDeletions = deletedAccounts.size > 0;
    const hasEdits = Object.keys(tempConfigs).some(acc => {
      // If it's deleted, ignore temp config changes (it's pending deletion anyway)
      if (deletedAccounts.has(acc)) return false;

      const temp = tempConfigs[acc];
      const original = currentSettings.find(s => s.accountId === acc);

      if (!original) return true; // New config
      return temp.closing !== original.closingDay || temp.due !== original.dueDay; // Modified
    });

    return hasEdits || hasDeletions;
  }, [tempConfigs, currentSettings, deletedAccounts, isOpen]);

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    const settingsToSave: AccountSettings[] = Object.keys(tempConfigs)
      .filter(acc => !deletedAccounts.has(acc))
      .map(acc => ({
        accountId: acc,
        closingDay: tempConfigs[acc].closing,
        dueDay: tempConfigs[acc].due
      }));

    onSave(settingsToSave, Array.from(deletedAccounts));
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  const updateConfig = (field: 'closing' | 'due', delta: number) => {
    setTempConfigs(prev => {
      const current = prev[selectedAccount] || { closing: 1, due: 10 };
      let newClosing = current.closing;
      let newDue = current.due;

      if (field === 'closing') {
        const next = newClosing + delta;
        if (next >= 1 && next <= newDue) newClosing = next;
      } else {
        const next = newDue + delta;
        if (next >= newClosing && next <= 31) newDue = next;
      }

      return { ...prev, [selectedAccount]: { closing: newClosing, due: newDue } };
    });

    // If we edit a deleted account, should we undelete it?
    if (deletedAccounts.has(selectedAccount)) {
      setDeletedAccounts(prev => {
        const next = new Set(prev);
        next.delete(selectedAccount);
        return next;
      });
    }
    setIsSaved(false);
  };

  // Logic to determine if "Enabled"
  // It is enabled if (In Settings OR In Temp) AND (Not Deleted)
  const originallyConfigured = currentSettings.some(s => s.accountId === selectedAccount);
  const isStaged = tempConfigs[selectedAccount] !== undefined;

  // Note: If originally configured, we usually put it in tempConfigs at init.
  // So `isStaged` handles both usually.

  const isEnabled = (originallyConfigured || isStaged) && !deletedAccounts.has(selectedAccount);

  const toggleEnable = () => {
    if (isEnabled) {
      // Disable Request
      if (originallyConfigured) {
        // DANGER ZONE for existing cards
        setPendingDisableAccount(selectedAccount);
      } else {
        // Just a draft (Yellow), remove safely
        setTempConfigs(prev => {
          const next = { ...prev };
          delete next[selectedAccount];
          return next;
        });
      }
    } else {
      // Enable Request
      if (deletedAccounts.has(selectedAccount)) {
        // Undelete
        setDeletedAccounts(prev => {
          const next = new Set(prev);
          next.delete(selectedAccount);
          return next;
        });
      } else {
        // Fresh Enable
        setTempConfigs(prev => ({
          ...prev,
          [selectedAccount]: { closing: 1, due: 10 }
        }));
      }
    }
    setIsSaved(false);
  };

  const confirmDisable = () => {
    if (pendingDisableAccount) {
      setDeletedAccounts(prev => new Set(prev).add(pendingDisableAccount));
      setPendingDisableAccount(null);
    }
  };

  // Active Config for rendering
  // We need to handle two shapes: 
  // 1. TempConfig: { closing: number, due: number }
  // 2. AccountSettings: { closingDay: number, dueDay: number }

  const temp = tempConfigs[selectedAccount];
  const original = currentSettings.find(s => s.accountId === selectedAccount);

  let closingDay = 1;
  let dueDay = 10;

  if (temp) {
    closingDay = temp.closing;
    dueDay = temp.due;
  } else if (original) {
    closingDay = original.closingDay;
    dueDay = original.dueDay;
  }
  // Otherwise default 1/10

  // Visual Params
  const closingPos = (closingDay / 31) * 100;
  const duePos = (dueDay / 31) * 100;

  const today = new Date();
  const simulatedPaymentDate = getEstimatedPaymentDate(today.toISOString(), {
    accountId: selectedAccount, closingDay, dueDay
  });

  // !!! CRITICAL FIX: Only return null here, AFTER all hooks have checked !!!
  // Prevents "Rendered fewer hooks than expected" error.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-950/90 border border-white/5 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl relative">

        {/* DISABLE CONFIRMATION OVERLAY */}
        {pendingDisableAccount && (
          <div className="absolute inset-0 z-50 bg-zinc-950/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertOctagon className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Desativar {pendingDisableAccount}?</h3>
            <p className="text-zinc-400 text-sm mb-6">Isso removerá todas as configurações deste cartão. Você precisará configurá-lo novamente depois.</p>
            <div className="grid grid-cols-2 gap-3 w-full animate-in slide-in-from-bottom-4">
              <button
                onClick={() => setPendingDisableAccount(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDisable}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-900/20"
              >
                Desativar
              </button>
            </div>
          </div>
        )}

        {/* DISCARD CONFIRMATION OVERLAY (Unsaved Exit) */}
        {showDiscardConfirm && !pendingDisableAccount && (
          <div className="absolute inset-0 z-50 bg-zinc-950/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Descartar alterações?</h3>
            <p className="text-zinc-400 text-sm mb-8">Você tem alterações não salvas. Se sair agora, elas serão perdidas.</p>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={onClose}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 pb-2 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" /> Configuração do Cartão
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Defina o ciclo de cobrança para AI prevê-lo.</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Selector */}
        <div className="px-6 mb-6">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            {ACCOUNTS.filter(a => a !== 'Carteira' && a !== 'Outro').map(acc => {
              const isActive = selectedAccount === acc;

              // Status Logic
              const original = currentSettings.some(s => s.accountId === acc);
              const isDeleted = deletedAccounts.has(acc);
              const temp = tempConfigs[acc];

              const isEffectiveEnabled = (original || temp) && !isDeleted;

              // Is Modified? (Yellow)
              // Modified if: 
              // 1. It IS enabled AND (newly added OR values changed)
              // 2. OR it was enabled (original) and is now Deleted (pending deletion is a change!)

              const valuesChanged = temp && original && (
                temp.closing !== currentSettings.find(s => s.accountId === acc)?.closingDay ||
                temp.due !== currentSettings.find(s => s.accountId === acc)?.dueDay
              );
              const isNew = temp && !original;

              const isYellow = (isEffectiveEnabled && (isNew || valuesChanged)) || (original && isDeleted);
              const isGreen = isEffectiveEnabled && !isYellow; // Purely original

              return (
                <button
                  key={acc}
                  onClick={() => setSelectedAccount(acc)}
                  className={`
                           whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all relative
                           ${isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}
                        `}
                >
                  {acc}
                  {/* Dot Indicator */}
                  {isYellow && !isActive && <span className="text-amber-400 ml-1 animate-pulse">●</span>}
                  {isGreen && !isActive && <span className="text-emerald-500 ml-1">●</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-6 space-y-8">

          {/* ENABLE/DISABLE TOGGLE FOR ALL CARDS */}
          <div onClick={toggleEnable} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-dashed border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors -mb-4">
            <span className="text-sm text-zinc-400">Status do Cartão</span>
            <div className={`relative w-12 h-6 transition-colors rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-red-500/20 bg-zinc-700'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
          </div>

          {/* BIG TOGGLES ROW */}
          <div className={`grid grid-cols-2 gap-4 transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
            {/* Closing Day Toggle */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center relative group hover:border-zinc-700 transition-colors">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-red-400" /> Fechamento
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => updateConfig('closing', -1)}
                  disabled={closingDay <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-4xl font-bold text-white tracking-tighter w-16 text-center">
                  {closingDay}
                </span>
                <button
                  onClick={() => updateConfig('closing', 1)}
                  disabled={closingDay >= dueDay}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Due Day Toggle */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center relative group hover:border-zinc-700 transition-colors">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-400" /> Vencimento
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => updateConfig('due', -1)}
                  disabled={dueDay <= closingDay}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-4xl font-bold text-white tracking-tighter w-16 text-center">
                  {dueDay}
                </span>
                <button
                  onClick={() => updateConfig('due', 1)}
                  disabled={dueDay >= 31}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* TIMELINE VISUALIZATION (DRAGGABLE) */}
          <div className={`transition-opacity duration-300 px-2 ${isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <BillingCycleSlider
              closingDay={closingDay}
              dueDay={dueDay}
              onUpdate={(field, val) => {
                const delta = val - (field === 'closing' ? closingDay : dueDay);
                // We reuse updateConfig to keep the logic unified? 
                // Or call setTempConfigs directly?
                // updateConfig handles delta, but here we have absolute value.
                // Let's copy the logic from updateConfig or Adapt it.

                // Direct set is safer for absolute values
                setTempConfigs(prev => {
                  const current = prev[selectedAccount] || { closing: 1, due: 10 };
                  let newClosing = current.closing;
                  let newDue = current.due;

                  if (field === 'closing') {
                    newClosing = val;
                    if (newClosing > newDue) newClosing = newDue; // Clamp
                  } else {
                    newDue = val;
                    if (newDue < newClosing) newDue = newClosing; // Clamp
                  }
                  return { ...prev, [selectedAccount]: { closing: newClosing, due: newDue } };
                });

                // Handle Undelete
                if (deletedAccounts.has(selectedAccount)) {
                  setDeletedAccounts(prev => {
                    const next = new Set(prev);
                    next.delete(selectedAccount);
                    return next;
                  });
                }
                setIsSaved(false);
              }}
              disabled={!isEnabled}
            />
          </div>

          {/* SIMULATOR FOOTER */}
          <div className={`bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center gap-4 transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-40'}`}>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-400 mb-0.5">Simulação em Tempo Real</p>
              <p className="text-sm text-zinc-200">
                Compra <strong className="text-white">HOJE</strong> ({today.toLocaleDateString('pt-BR')}) cai em <strong className="text-blue-400">{getMonthName(simulatedPaymentDate.toISOString())}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-6 pt-4 border-t border-white/5 bg-black/20">
          <button
            onClick={handleSave}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-500 ${isSaved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]' : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
              }`}
          >
            {isSaved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {isSaved ? 'Configuração Salva!' : 'Salvar Alterações'}
          </button>
        </div>

      </div>
    </div>
  );
};