import React from 'react';
import { CreditCard, TrendingUp, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../../utils';

interface HorizonCardProps {
    creditStats: {
        bill0: number;
        bill1: number;
        bill2: number;
        isDanger: boolean;
    };
    privacyMode: boolean;
}

export const HorizonCard: React.FC<HorizonCardProps> = ({ creditStats, privacyMode }) => {
    const { bill0, bill1, bill2, isDanger } = creditStats;

    return (
        <div className={`
             relative rounded-3xl p-0 overflow-hidden h-full border transition-all duration-500 group
             bg-gradient-to-br from-surface to-surfaceHighlight
             ${isDanger ? 'border-orange-500/30 shadow-[0_0_40px_-10px_rgba(249,115,22,0.15)]' : 'border-zinc-800 hover:border-zinc-700'}
          `}>
            {/* Background Glow */}
            {isDanger && <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none"></div>}

            {/* MOBILE LAYOUT (< md) - Split View */}
            <div className="md:hidden flex h-full relative z-10">
                {/* Left: Current Bill */}
                <div className="flex-1 p-5 flex flex-col justify-center border-r border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Atual</span>
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">
                        {formatCurrency(bill0, privacyMode)}
                    </span>
                    <div className="mt-2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-full rounded-full opacity-80"></div>
                    </div>
                </div>

                {/* Right: Next Bill */}
                <div className="flex-1 p-5 flex flex-col justify-center bg-black/20">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Próxima</span>
                        {isDanger && <TrendingUp className="w-3 h-3 text-orange-500 animate-pulse" />}
                    </div>
                    <span className={`text-xl font-bold tracking-tight ${isDanger ? 'text-orange-400' : 'text-zinc-300'}`}>
                        {formatCurrency(bill1, privacyMode)}
                    </span>
                    <div className="mt-2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isDanger ? 'bg-orange-500' : 'bg-zinc-500'}`}
                            style={{ width: bill0 > 0 ? `${Math.min((bill1 / bill0) * 100, 100)}%` : '0%' }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* DESKTOP LAYOUT (>= md) - Timeline View */}
            <div className="hidden md:flex flex-col justify-between h-full p-6 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isDanger ? 'bg-orange-500/10 border-orange-500/20' : 'bg-primary/10 border-primary/20'}`}>
                        <CreditCard className={`w-5 h-5 ${isDanger ? 'text-orange-500' : 'text-primary'}`} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white leading-tight">Horizonte de Faturas</h3>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Previsão 90 Dias</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-8 items-center">
                    {/* Month 0 */}
                    <div className="relative">
                        <span className="text-xs text-zinc-500 mb-1 block">Mês Atual</span>
                        <span className="text-xl font-bold text-white block mb-2">{formatCurrency(bill0, privacyMode)}</span>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-400 w-full" />
                        </div>
                        {/* Connector */}
                        <div className="absolute top-1/2 -right-6 text-zinc-700">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Month 1 */}
                    <div className="relative">
                        <span className="text-xs text-zinc-500 mb-1 block">Próximo</span>
                        <span className={`text-xl font-bold block mb-2 ${isDanger ? 'text-orange-400' : 'text-zinc-300'}`}>
                            {formatCurrency(bill1, privacyMode)}
                        </span>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${isDanger ? 'bg-orange-500' : 'bg-zinc-500'}`}
                                style={{ width: bill0 > 0 ? `${Math.min((bill1 / bill0) * 100, 100)}%` : '0%' }}
                            />
                        </div>
                        {/* Connector */}
                        <div className="absolute top-1/2 -right-6 text-zinc-700">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Month 2 */}
                    <div>
                        <span className="text-xs text-zinc-500 mb-1 block">Futuro</span>
                        <span className="text-xl font-bold text-zinc-400 block mb-2">{formatCurrency(bill2, privacyMode)}</span>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-600" style={{ width: bill0 > 0 ? `${Math.min((bill2 / bill0) * 100, 100)}%` : '0%' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
