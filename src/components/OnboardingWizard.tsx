import React, { useState } from 'react';
import { ArrowRight, Check, CreditCard, AlertCircle, Sparkles, Lock, DollarSign, Minus, Plus, Calendar, ChevronLeft, Target, Shield, Wallet } from 'lucide-react';
import { BillingCycleSlider } from './BillingCycleSlider';
import { useAuth } from '../contexts/AuthContext';
import { ACCOUNTS, getEstimatedPaymentDate, getMonthName } from '../utils';
import { AccountSettings } from '../types';

interface Props {
    onComplete: (name: string, settings: AccountSettings[]) => void;
}

export const OnboardingWizard: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [name, setName] = useState('');
    const { logout } = useAuth();

    // Step 2 State
    const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
    const [cardConfigs, setCardConfigs] = useState<Record<string, { closing: number, due: number }>>({});

    const isStep2Valid = selectedAccounts.size > 0;

    const handleNext = () => {
        if (step === 1 && name.trim()) setStep(2);
        if (step === 2) {
            if (isStep2Valid) setStep(3);
        }
    };

    const handleBack = () => {
        if (step === 2) setStep(1);
        if (step === 3) setStep(2);
    };

    const toggleAccount = (acc: string) => {
        setSelectedAccounts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(acc)) {
                newSet.delete(acc);
            } else {
                newSet.add(acc);
                setCardConfigs(prevConf => ({
                    ...prevConf,
                    [acc]: { closing: 1, due: 10 }
                }));
            }
            return newSet;
        });
    };

    const updateConfig = (acc: string, field: 'closing' | 'due', delta: number) => {
        setCardConfigs(prev => {
            const current = prev[acc] || { closing: 1, due: 10 };
            let newClosing = current.closing;
            let newDue = current.due;

            if (field === 'closing') {
                const next = newClosing + delta;
                if (next >= 1 && next <= newDue) newClosing = next;
            } else {
                const next = newDue + delta;
                if (next >= newClosing && next <= 31) newDue = next;
            }

            return { ...prev, [acc]: { closing: newClosing, due: newDue } };
        });
    };

    const handleFinish = () => {
        const settings: AccountSettings[] = Array.from(selectedAccounts).map((acc: string) => ({
            accountId: acc,
            closingDay: cardConfigs[acc]?.closing || 1,
            dueDay: cardConfigs[acc]?.due || 10
        }));
        onComplete(name, settings);
    };

    // Helper to get step content for Left Panel
    const getSideContent = () => {
        switch (step) {
            case 1:
                return {
                    icon: <Shield className="w-12 h-12 text-emerald-400" />,
                    title: "Bem-vindo ao Clube",
                    text: "O primeiro passo para a liberdade financeira é saber exatamente onde você está."
                };
            case 2:
                return {
                    icon: <CreditCard className="w-12 h-12 text-indigo-400" />,
                    title: "Domine seus Cartões",
                    text: "Configure as datas de fechamento e vencimento. Mapeie o território do inimigo."
                };
            case 3:
                return {
                    icon: <Target className="w-12 h-12 text-pink-400" />,
                    title: "Tudo Pronto",
                    text: "Seu cockpit financeiro está preparado para decolar."
                };
            default: return {};
        }
    };

    const sideContent = getSideContent();

    return (
        <div className="fixed inset-0 z-[100] bg-background flex text-zinc-100 overflow-hidden">

            {/* LEFT SIDE: PROGRESS & CONTEXT (Desktop Only) */}
            <div className="hidden lg:flex w-1/2 bg-zinc-950 relative overflow-hidden flex-col justify-between p-12 border-r border-white/5">
                {/* Background FX */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
                </div>

                {/* Logo Area */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Zenith Finance</span>
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-lg">
                    <div className="mb-6 inline-flex p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-700">
                        {sideContent.icon}
                    </div>
                    <h2 className="text-4xl font-bold mb-4 leading-tight animate-in slide-in-from-bottom-5 duration-700 delay-100">{sideContent.title}</h2>
                    <p className="text-lg text-zinc-400 leading-relaxed animate-in slide-in-from-bottom-6 duration-700 delay-200">{sideContent.text}</p>
                </div>

                {/* Steps Indicator */}
                <div className="relative z-10 flex items-center gap-4">
                    <span className="text-zinc-500 font-mono text-sm">PASSO 0{step} / 03</span>
                    <div className="h-px bg-zinc-800 w-24">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: INTERACTIVE FORM (Mobile & Desktop) */}
            <div className="w-full lg:w-1/2 flex flex-col relative bg-background/50 backdrop-blur-3xl h-full">

                {/* Mobile Header (Progress) - Visible only on Mobile */}
                <div className="lg:hidden p-6 flex items-center justify-between border-b border-zinc-800 shrink-0">
                    <div className="flex gap-1">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${step >= s ? 'bg-primary' : 'bg-zinc-800'}`} />
                        ))}
                    </div>
                    {step > 1 && (
                        <button onClick={handleBack} className="p-2 text-zinc-400 hover:text-white">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    {/* Mobile Exit Button for Step 1 */}
                    {step === 1 && (
                        <button onClick={logout} className="p-2 text-zinc-400 hover:text-white">
                            <span className="text-xs font-semibold">SAIR</span>
                        </button>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
                    {/* We use specific layout for each step to handle scrolling correctly */}

                    {/* STEP 1: NAME */}
                    {step === 1 && (
                        <div className="animate-in slide-in-from-right-8 fade-in duration-500 flex flex-col h-full relative">

                            {/* Back to Login Button (Desktop) */}
                            <div className="hidden lg:block absolute top-0 left-0 p-6 z-10">
                                <button
                                    onClick={logout}
                                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium group"
                                >
                                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    Voltar para Login
                                </button>
                            </div>

                            <div className="flex flex-col items-center justify-center h-full p-6 lg:p-12">
                                <div className="w-full max-w-lg space-y-8">
                                    <div className="text-center lg:text-left">
                                        <div className="lg:hidden w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl mx-auto mb-6 shadow-xl shadow-primary/20 flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-white" />
                                        </div>
                                        <h1 className="text-3xl font-bold text-white mb-2">Com quem estou falando?</h1>
                                        <p className="text-zinc-400">Queremos personalizar sua experiência.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Seu Nome / Apelido</label>
                                        <input
                                            autoFocus
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Digite aqui..."
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-6 text-2xl text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder-zinc-700"
                                            onKeyDown={e => e.key === 'Enter' && name && handleNext()}
                                        />
                                    </div>

                                    <button
                                        onClick={handleNext}
                                        disabled={!name.trim()}
                                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 hover:shadow-primary/30 group"
                                    >
                                        Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CARDS (Fixed Layout) */}
                    {step === 2 && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-8 fade-in duration-500">

                            {/* 2.1 FIXED TOP HEADER */}
                            <div className="p-6 lg:p-12 pb-0 shrink-0">
                                <div className="max-w-lg mx-auto w-full">
                                    <h2 className="text-2xl font-bold text-white mb-2">Quais cartões você usa?</h2>
                                    <p className="text-zinc-400 text-sm">Selecione para configurar as datas.</p>
                                </div>
                            </div>

                            {/* 2.2 SCROLLABLE CONTENT */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 pt-6">
                                <div className="max-w-lg mx-auto w-full grid grid-cols-1 gap-4">
                                    {ACCOUNTS.filter(a => a !== 'Carteira' && a !== 'Outro').map(acc => {
                                        const isSelected = selectedAccounts.has(acc);
                                        const config = cardConfigs[acc] || { closing: 1, due: 10 };
                                        const closingDay = config.closing;
                                        const dueDay = config.due;

                                        // Simulator Data
                                        const today = new Date();
                                        const simulatedPaymentDate = getEstimatedPaymentDate(today.toISOString(), {
                                            accountId: acc, closingDay: config.closing, dueDay: config.due
                                        });

                                        return (
                                            <div key={acc} className={`group border rounded-3xl transition-all duration-300 overflow-hidden ${isSelected ? 'bg-zinc-900/90 border-primary/50 ring-1 ring-primary/20 shadow-xl' : 'bg-surface/30 border-zinc-800 hover:border-zinc-700'}`}>
                                                <div
                                                    onClick={() => toggleAccount(acc)}
                                                    className="flex items-center gap-4 p-5 cursor-pointer relative"
                                                >
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary text-white' : 'border-zinc-600 bg-zinc-900/50 group-hover:border-zinc-500'}`}>
                                                        {isSelected && <Check className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className={`font-bold text-lg block ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{acc}</span>
                                                    </div>
                                                    <CreditCard className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-zinc-700'}`} />
                                                </div>

                                                {/* Expanded Config Area */}
                                                {isSelected && (
                                                    <div className="px-5 pb-6 pt-2 border-t border-white/5 animate-in slide-in-from-top-2">

                                                        {/* MANUAL TOGGLES ROW (Restored) */}
                                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                                            {/* Closing */}
                                                            <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-2xl flex flex-col items-center relative">
                                                                <span className="text-[9px] uppercase tracking-wider text-zinc-500 mb-2 font-bold flex items-center gap-1">
                                                                    <Lock className="w-3 h-3 text-red-400" /> Fechamento
                                                                </span>
                                                                <div className="flex items-center gap-3">
                                                                    <button onClick={() => updateConfig(acc, 'closing', -1)} disabled={closingDay <= 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                                                                    <span className="text-xl font-bold text-white w-6 text-center">{closingDay}</span>
                                                                    <button onClick={() => updateConfig(acc, 'closing', 1)} disabled={closingDay >= dueDay} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                            {/* Due */}
                                                            <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-2xl flex flex-col items-center relative">
                                                                <span className="text-[9px] uppercase tracking-wider text-zinc-500 mb-2 font-bold flex items-center gap-1">
                                                                    <DollarSign className="w-3 h-3 text-emerald-400" /> Vencimento
                                                                </span>
                                                                <div className="flex items-center gap-3">
                                                                    <button onClick={() => updateConfig(acc, 'due', -1)} disabled={dueDay <= closingDay} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                                                                    <span className="text-xl font-bold text-white w-6 text-center">{dueDay}</span>
                                                                    <button onClick={() => updateConfig(acc, 'due', 1)} disabled={dueDay >= 31} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Interactive Slider */}
                                                        <div className="mb-6 px-1">
                                                            <BillingCycleSlider
                                                                closingDay={config.closing}
                                                                dueDay={config.due}
                                                                onUpdate={(field, val) => {
                                                                    setCardConfigs(prev => {
                                                                        const current = prev[acc] || { closing: 1, due: 10 };
                                                                        let newClosing = current.closing;
                                                                        let newDue = current.due;
                                                                        if (field === 'closing') {
                                                                            newClosing = val;
                                                                            if (newClosing > newDue) newClosing = newDue;
                                                                        } else {
                                                                            newDue = val;
                                                                            if (newDue < newClosing) newDue = newClosing;
                                                                        }
                                                                        return { ...prev, [acc]: { closing: newClosing, due: newDue } };
                                                                    });
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Mini Simulator Bubble */}
                                                        <div className="bg-primary/10 rounded-xl p-3 flex items-center gap-3 border border-primary/20">
                                                            <Calendar className="w-4 h-4 text-primary" />
                                                            <p className="text-xs text-primary/80">
                                                                Comprando <strong>hoje</strong>, você só paga em <strong className="uppercase">{getMonthName(simulatedPaymentDate.toISOString())}</strong>.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {/* Spacer for scroll */}
                                    <div className="h-4"></div>
                                </div>
                            </div>

                            {/* 2.3 FIXED BOTTOM FOOTER */}
                            <div className="p-6 lg:p-12 pt-4 border-t border-zinc-800/50 bg-background/80 backdrop-blur-xl shrink-0">
                                <div className="max-w-lg mx-auto w-full flex gap-3">

                                    {/* BACK BUTTON (Restored) */}
                                    <button
                                        onClick={handleBack}
                                        className="px-6 py-4 rounded-xl border border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 transition-colors"
                                    >
                                        Voltar
                                    </button>

                                    {/* NEXT BUTTON */}
                                    <button
                                        onClick={handleNext}
                                        disabled={!isStep2Valid}
                                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                                    >
                                        Próximo <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {!isStep2Valid && (
                                    <p className="text-xs text-center text-red-400 mt-2 flex items-center justify-center gap-1">
                                        Selecione p/ continuar
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {step === 3 && (
                        <div className="animate-in zoom-in-95 fade-in duration-500 flex flex-col items-center justify-center p-6 lg:p-12 h-full">
                            <div className="max-w-lg w-full text-center space-y-8">
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-full mx-auto flex items-center justify-center border border-emerald-500/20 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]">
                                    <Check className="w-12 h-12 text-emerald-500" />
                                </div>

                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-2">Tudo pronto, {name}!</h1>
                                    <p className="text-zinc-400 max-w-xs mx-auto">Sua conta foi criada com sucesso.</p>
                                </div>

                                <div className="bg-surface/50 border border-zinc-800 p-5 rounded-2xl max-w-sm mx-auto text-left flex gap-4 items-start">
                                    <div className="p-2 bg-zinc-900 rounded-lg shrink-0">
                                        <Wallet className="w-5 h-5 text-zinc-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Próximo Passo</h4>
                                        <p className="text-xs text-zinc-400 mt-1">Explore o painel e considere importar seus extratos.</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleFinish}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30"
                                >
                                    Acessar Painel
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
};