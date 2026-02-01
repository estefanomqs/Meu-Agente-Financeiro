import React from 'react';
import { TrendingUp, CreditCard, Wallet } from 'lucide-react';
import { formatCurrency } from '../../../utils';

interface StatProps {
    stats: {
        income: number;
        cashExpenses: number;
        commitments: number;
        nextCommitments: number;
        totalExpenses: number;
        balance: number;
        expenseRatio: number;
    };
    privacyMode: boolean;
}

export const IncomeCard: React.FC<StatProps> = ({ stats, privacyMode }) => (
    <div className="bg-surface border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all h-full flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Receitas</span>
        </div>
        <div className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(stats.income, privacyMode)}
        </div>
    </div>
);

export const BalanceCard: React.FC<StatProps> = ({ stats, privacyMode }) => (
    <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all shadow-xl h-full flex flex-col justify-between">
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -mr-16 -mt-16 opacity-20 transition-all duration-1000 ${stats.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        <div className="relative z-10 sticky top-0">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 backdrop-blur-md">
                    <Wallet className="w-5 h-5 text-zinc-100" />
                </div>
                <span className="text-sm font-medium text-zinc-300">Fluxo Líquido</span>
            </div>
            <div className={`text-3xl font-bold tracking-tight ${stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(stats.balance, privacyMode)}
            </div>
            <div className="mt-4 w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${stats.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(stats.expenseRatio, 100)}%` }}
                ></div>
            </div>
        </div>
    </div>
);

export const MobileCombinedCard: React.FC<StatProps> = ({ stats, privacyMode }) => (
    <div className="bg-surface border border-zinc-800 rounded-3xl p-5 relative overflow-hidden h-full flex flex-col justify-center">
        {/* Income Section */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800/50">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-sm font-medium text-zinc-400">Entradas</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
                {formatCurrency(stats.income, privacyMode)}
            </span>
        </div>

        {/* Expense/Commitments Section */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-sm font-medium text-zinc-400">Saídas</span>
            </div>
            <div className="text-right">
                <span className="text-xl font-bold text-white tracking-tight block">
                    {formatCurrency(stats.commitments, privacyMode)}
                </span>
            </div>
        </div>

        {/* Peek at Next Month (Tiny Footer) */}
        <div className="mt-3 pt-3 border-t border-zinc-800/30 flex justify-between items-center px-1">
            <span className="text-[10px] text-zinc-500">Próximo Mês</span>
            <span className="text-[10px] font-bold text-zinc-400">{formatCurrency(stats.nextCommitments, privacyMode)}</span>
        </div>
    </div>
);
