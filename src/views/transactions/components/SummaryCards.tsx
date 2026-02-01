import React from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '../../../utils';

interface SummaryCardsProps {
    summary: { income: number, expense: number, balance: number };
    isScrolled: boolean;
    privacyMode: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, isScrolled, privacyMode }) => {
    // Classe de texto otimizada para mobile: fonte menor e espaçamento apertado para caber valores grandes
    const valueTextClass = "text-[10px] sm:text-xs md:text-sm font-bold tracking-tighter md:tracking-normal truncate";

    return (
        <div className={`px-4 pb-2 transition-all duration-300 ${isScrolled ? 'pt-1' : 'pt-6'}`}>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
                {/* Entradas */}
                <div className={`bg-zinc-900/50 border border-zinc-800/50 rounded-2xl flex flex-col justify-between backdrop-blur-sm transition-all duration-300 overflow-hidden ${isScrolled ? 'p-1.5 h-16' : 'p-2 md:p-3 h-24'}`}>
                    <div className="flex items-start justify-between shrink-0">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 shrink-0">
                            <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className={`text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider transition-opacity duration-300 ${isScrolled ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>Entradas</p>
                        <p className={`${valueTextClass} text-emerald-400`}>
                            {formatCurrency(summary.income, privacyMode)}
                        </p>
                    </div>
                </div>

                {/* Saídas */}
                <div className={`bg-zinc-900/50 border border-zinc-800/50 rounded-2xl flex flex-col justify-between backdrop-blur-sm transition-all duration-300 overflow-hidden ${isScrolled ? 'p-1.5 h-16' : 'p-2 md:p-3 h-24'}`}>
                    <div className="flex items-start justify-between shrink-0">
                        <div className="p-1.5 bg-red-500/10 rounded-lg text-red-500 shrink-0">
                            <TrendingDown className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className={`text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider transition-opacity duration-300 ${isScrolled ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>Saídas</p>
                        <p className={`${valueTextClass} text-red-400`}>
                            {formatCurrency(Math.abs(summary.expense), privacyMode)}
                        </p>
                    </div>
                </div>

                {/* Saldo */}
                <div className={`
                rounded-2xl flex flex-col justify-between backdrop-blur-sm border transition-all duration-300 overflow-hidden
                ${isScrolled ? 'p-1.5 h-16' : 'p-2 md:p-3 h-24'}
                ${summary.balance >= 0
                        ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]'
                        : 'bg-red-500/5 border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.2)]'
                    }
            `}>
                    <div className="flex items-start justify-between shrink-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${summary.balance >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                            <Wallet className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-opacity duration-300 ${isScrolled ? 'opacity-0 h-0 hidden' : 'opacity-100'} ${summary.balance >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                            Saldo
                        </p>
                        <p className={`${valueTextClass} ${summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(summary.balance, privacyMode)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};