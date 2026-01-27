import React, { useState } from 'react';
import { ArrowRight, Check, CreditCard, AlertCircle, Sparkles } from 'lucide-react';
import { ACCOUNTS } from '../utils';
import { AccountSettings } from '../types';

interface Props {
  onComplete: (name: string, settings: AccountSettings[]) => void;
}

export const OnboardingWizard: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  
  // Step 2 State
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [cardConfigs, setCardConfigs] = useState<Record<string, { closing: number, due: number }>>({});

  const isStep2Valid = selectedAccounts.size > 0 && Array.from(selectedAccounts).every(acc => {
     const cfg = cardConfigs[acc];
     return cfg && cfg.closing >= 1 && cfg.closing <= 31 && cfg.due >= 1 && cfg.due <= 31;
  });

  const handleNext = () => {
    if (step === 1 && name.trim()) setStep(2);
    if (step === 2) {
        if (isStep2Valid) setStep(3);
    }
  };

  const toggleAccount = (acc: string) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(acc)) {
        newSet.delete(acc);
      } else {
        newSet.add(acc);
        // Set default configs if selecting
        setCardConfigs(prevConf => ({
            ...prevConf,
            [acc]: { closing: 1, due: 10 }
        }));
      }
      return newSet;
    });
  };

  const updateConfig = (acc: string, field: 'closing' | 'due', value: number) => {
     setCardConfigs(prev => ({
         ...prev,
         [acc]: { ...prev[acc], [field]: value }
     }));
  };

  const handleFinish = () => {
     const settings: AccountSettings[] = Array.from(selectedAccounts).map((acc: string) => ({
         accountId: acc,
         closingDay: cardConfigs[acc]?.closing || 1,
         dueDay: cardConfigs[acc]?.due || 10
     }));
     onComplete(name, settings);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-lg">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8 justify-center">
            <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-zinc-800'}`}></div>
            <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-zinc-800'}`}></div>
            <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-zinc-800'}`}></div>
        </div>

        {/* STEP 1: WELCOME & NAME */}
        {step === 1 && (
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl mx-auto mb-6 shadow-xl shadow-primary/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Bem-vindo ao Zenith</h1>
                <p className="text-zinc-400 mb-8">O controle financeiro minimalista e poderoso que você estava procurando.</p>
                
                <div className="bg-surface border border-zinc-800 p-6 rounded-2xl mb-8 text-left">
                    <label className="block text-sm text-zinc-500 mb-2">Como podemos te chamar?</label>
                    <input 
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-primary transition-colors"
                        onKeyDown={e => e.key === 'Enter' && name && handleNext()}
                    />
                </div>

                <button 
                    onClick={handleNext}
                    disabled={!name.trim()}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    Continuar <ArrowRight className="w-5 h-5"/>
                </button>
            </div>
        )}

        {/* STEP 2: CARD CONFIGURATION */}
        {step === 2 && (
            <div className="animate-in slide-in-from-right-8 fade-in duration-500 flex flex-col h-[80vh]">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Configuração de Contas</h2>
                    <p className="text-zinc-400 text-sm">Selecione e configure pelo menos uma conta/cartão.</p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-6 pr-2">
                    {ACCOUNTS.filter(a => a !== 'Carteira' && a !== 'Outro').map(acc => {
                        const isSelected = selectedAccounts.has(acc);
                        return (
                            <div key={acc} className={`border rounded-2xl transition-all duration-300 ${isSelected ? 'bg-surface border-primary/50 shadow-lg shadow-black/20' : 'bg-surface/50 border-zinc-800 opacity-70 hover:opacity-100'}`}>
                                <div 
                                    onClick={() => toggleAccount(acc)}
                                    className="flex items-center gap-3 p-4 cursor-pointer"
                                >
                                    <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-zinc-600 bg-zinc-900'}`}>
                                        {isSelected && <Check className="w-4 h-4" />}
                                    </div>
                                    <span className="font-medium text-white flex-1">{acc}</span>
                                    <CreditCard className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-zinc-600'}`} />
                                </div>

                                {isSelected && (
                                    <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2">
                                        <div className="h-px w-full bg-zinc-800 mb-4"></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Dia Fechamento</label>
                                                <input 
                                                    type="number" min="1" max="31"
                                                    value={cardConfigs[acc]?.closing || ''}
                                                    onChange={e => updateConfig(acc, 'closing', parseInt(e.target.value))}
                                                    placeholder="1"
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-center text-white text-sm font-bold focus:border-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Dia Vencimento</label>
                                                <input 
                                                    type="number" min="1" max="31"
                                                    value={cardConfigs[acc]?.due || ''}
                                                    onChange={e => updateConfig(acc, 'due', parseInt(e.target.value))}
                                                    placeholder="10"
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-center text-white text-sm font-bold focus:border-primary focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex gap-2 items-start bg-blue-500/10 p-2 rounded-lg">
                                            <AlertCircle className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-blue-300">
                                                Ex: Se fecha dia {cardConfigs[acc]?.closing || '?'}, compras após esta data caem no vencimento do próximo mês (dia {cardConfigs[acc]?.due || '?'}).
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-auto pt-4 border-t border-zinc-800 bg-background">
                     <button 
                        onClick={handleNext}
                        disabled={!isStep2Valid}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        Próximo <ArrowRight className="w-5 h-5"/>
                    </button>
                    {!isStep2Valid && (
                        <p className="text-xs text-center text-red-400 mt-2 flex items-center justify-center gap-1 animate-pulse">
                            <AlertCircle className="w-3 h-3"/> Configure pelo menos 1 cartão com datas válidas.
                        </p>
                    )}
                </div>
            </div>
        )}

        {/* STEP 3: FINISH */}
        {step === 3 && (
            <div className="animate-in zoom-in-95 fade-in duration-500 text-center">
                 <div className="w-20 h-20 bg-emerald-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Check className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Tudo pronto, {name}!</h1>
                <p className="text-zinc-400 mb-8">Seu ambiente foi configurado. Agora você pode importar seus extratos ou adicionar gastos manualmente.</p>
                
                <div className="bg-surface border border-zinc-800 p-4 rounded-xl mb-8">
                    <p className="text-sm text-zinc-300">
                        <strong className="text-white">Dica Pro:</strong> Use o botão de importar no topo da tela para trazer seus dados do banco em segundos.
                    </p>
                </div>

                <button 
                    onClick={handleFinish}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                >
                    Começar a usar
                </button>
            </div>
        )}

      </div>
    </div>
  );
};