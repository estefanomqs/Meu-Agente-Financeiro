import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Trophy, Coffee } from 'lucide-react';
import { Transaction, AppData } from '../types';

interface Props {
    data: AppData;
    userName: string;
}

export const InsightHero: React.FC<Props> = ({ data, userName }) => {
    const insight = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();

        const transactions = data.transactions;
        if (transactions.length === 0) {
            return {
                icon: <Sparkles className="w-6 h-6 text-yellow-400" />,
                title: `Olá, ${userName}!`,
                message: "Tudo pronto para começar. Adicione sua primeira transação ou use o botão de importar!",
                gradient: "from-zinc-800 to-zinc-900"
            };
        }

        // Filter current month expenses
        const thisMonthExpenses = transactions.filter(t =>
            t.type === 'expense' &&
            new Date(t.date).getMonth() === currentMonth
        );

        // Filter LAST month expenses
        const lastMonthExpenses = transactions.filter(t =>
            t.type === 'expense' &&
            new Date(t.date).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1)
        );

        const thisMonthTotal = thisMonthExpenses.reduce((acc, t) => acc + t.amount, 0);
        const lastMonthTotal = lastMonthExpenses.reduce((acc, t) => acc + t.amount, 0);

        // 1. GOOD: Spending less than last month
        if (lastMonthTotal > 0 && thisMonthTotal < lastMonthTotal * 0.9) {
            return {
                icon: <Trophy className="w-6 h-6 text-yellow-400" />,
                title: "Mandou bem!",
                message: `Você gastou ${(100 - (thisMonthTotal / lastMonthTotal) * 100).toFixed(0)}% a menos que no mês passado. Continue assim!`,
                gradient: "from-emerald-900/50 to-zinc-900 border-emerald-500/20"
            };
        }

        // 2. WARNING: Spending spike
        if (lastMonthTotal > 0 && thisMonthTotal > lastMonthTotal * 1.1) {
            return {
                icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
                title: "Sinal Amarelo",
                message: "Seus gastos estão 10% maiores que a média. Que tal revisar os 'Compromissos'?",
                gradient: "from-red-900/40 to-zinc-900 border-red-500/20"
            };
        }

        // 3. NEUTRAL/CASUAL: Weekend Mode?
        const isWeekend = today.getDay() === 0 || today.getDay() === 6;
        if (isWeekend) {
            return {
                icon: <Coffee className="w-6 h-6 text-orange-400" />,
                title: "Modo Fim de Semana",
                message: "Aproveite o descanso! Lembre-se: experiências valem mais que coisas.",
                gradient: "from-orange-900/30 to-zinc-900 border-orange-500/20"
            };
        }

        // Default
        return {
            icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
            title: "Foco no total",
            message: "Manter o controle diário é o segredo para a liberdade financeira.",
            gradient: "from-blue-900/30 to-zinc-900 border-blue-500/20"
        };

    }, [data.transactions, userName]);

    return (
        <div className="mb-6 flex justify-center">
            <div className={`
        animate-in slide-in-from-top-4 fade-in duration-700
        inline-flex items-center gap-4 px-5 py-3 rounded-full
        bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl
        hover:scale-[1.02] transition-transform cursor-default group max-w-2xl
    `}>
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0
                    bg-gradient-to-br ${insight.gradient}
                    shadow-lg group-hover:shadow-primary/20
             `}>
                    {React.cloneElement(insight.icon as React.ReactElement, { className: "w-4 h-4 text-white" })}
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                    <span className="text-sm font-bold text-white whitespace-nowrap">{insight.title}</span>
                    <span className="hidden md:block w-1 h-1 rounded-full bg-zinc-600"></span>
                    <span className="text-xs md:text-sm text-zinc-400 line-clamp-1">{insight.message}</span>
                </div>
            </div>
        </div>
    );
};
