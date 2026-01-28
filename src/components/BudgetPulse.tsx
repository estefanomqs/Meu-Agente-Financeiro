import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { CATEGORIES } from '../utils';

interface Props {
    transactions: Transaction[];
}

export const BudgetPulse: React.FC<Props> = ({ transactions }) => {
    const stats = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        let totalExp = 0;

        // Calculate totals
        transactions.forEach(t => {
            if (t.type === 'expense') {
                const amount = t.amount; // Simplified for demo
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
                totalExp += amount;
            }
        });

        // Sort by spending
        const sorted = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, val]) => ({
                cat,
                val,
                percentOfTotal: totalExp > 0 ? (val / totalExp) * 100 : 0
            }));

        return sorted.slice(0, 5); // Top 5
    }, [transactions]);

    if (stats.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
            <div className="flex gap-4">
                {stats.map(({ cat, val, percentOfTotal }) => (
                    <div key={cat} className="min-w-[140px] bg-surface border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                        {/* Background Bar */}
                        <div className="absolute bottom-0 left-0 h-1 bg-zinc-800 w-full">
                            <div
                                className={`h-full ${percentOfTotal > 30 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(percentOfTotal * 2, 100)}%` }} // Visual scaling
                            ></div>
                        </div>

                        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{cat}</span>
                        <span className="text-lg font-bold text-white">
                            {val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </span>
                        <div className="text-[10px] text-zinc-600">
                            {percentOfTotal.toFixed(0)}% dos gastos
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
