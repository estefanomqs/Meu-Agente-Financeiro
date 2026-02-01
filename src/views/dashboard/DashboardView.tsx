import React, { useState } from 'react';
import {
    ChevronLeft, ChevronRight, ArrowRight,
    Upload, Sparkles
} from 'lucide-react';
import { Transaction, AppData, ViewState } from '../../types';
import { TransactionRow } from '../../components/TransactionRow';
import { InsightHero } from '../../components/InsightHero';
import { FinancialDistribution } from '../../components/FinancialDistribution';

// New Modular Components
import { useDashboardStats } from './hooks/useDashboardStats';
import { HorizonCard } from './components/HorizonCard';
import { IncomeCard, BalanceCard, MobileCombinedCard } from './components/StatCards';
import { CashFlowSection } from './components/CashFlowSection';

interface DashboardViewProps {
    data: AppData;
    privacyMode: boolean;
    onEditTransaction: (t: Transaction) => void;
    onDeleteTransaction: (id: string) => void;
    setView: (v: ViewState) => void;
    onOpenImport: () => void;
    userName: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    data, privacyMode, onEditTransaction, onDeleteTransaction, setView, onOpenImport, userName
}) => {
    const [dashboardDate, setDashboardDate] = useState(new Date());
    const { stats, creditStats } = useDashboardStats(data, dashboardDate);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 pb-10 max-w-6xl mx-auto">
            {/* 0. HERO & NAVIGATION */}
            <div className="space-y-4">
                <InsightHero data={data} userName={userName} />

                {/* HEADER: Date Navigation */}
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => setDashboardDate(new Date(dashboardDate.setMonth(dashboardDate.getMonth() - 1)))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold text-white capitalize">
                        {dashboardDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => setDashboardDate(new Date(dashboardDate.setMonth(dashboardDate.getMonth() + 1)))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 1. MOBILE LAYOUT (CAROUSEL) - Visible ONLY on Mobile */}
            <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory px-4 -mx-4 pb-6 gap-4 no-scrollbar">
                {/* Card 1: Horizon (Bills) - PRIMARY FOCUS */}
                <div className="min-w-[85vw] snap-center">
                    <HorizonCard creditStats={creditStats} privacyMode={privacyMode} />
                </div>
                {/* Card 2: Balance */}
                <div className="min-w-[85vw] snap-center">
                    <BalanceCard stats={stats} privacyMode={privacyMode} />
                </div>
                {/* Card 3: Combined (Original) - Kept as Summary */}
                <div className="min-w-[85vw] snap-center">
                    <MobileCombinedCard stats={stats} privacyMode={privacyMode} />
                </div>
                {/* Card 4: Forecast */}
                <div className="min-w-[85vw] snap-center">
                    <CashFlowSection data={data} balance={stats.balance} />
                </div>
            </div>

            {/* 1. DESKTOP LAYOUT (GRID) - 4 COLS Logic for Horizon Span */}
            <div className="hidden md:grid grid-cols-4 gap-6">
                <div className="col-span-1">
                    <IncomeCard stats={stats} privacyMode={privacyMode} />
                </div>
                <div className="col-span-1">
                    <BalanceCard stats={stats} privacyMode={privacyMode} />
                </div>
                {/* Horizon spans 2 columns */}
                <div className="col-span-2">
                    <HorizonCard creditStats={creditStats} privacyMode={privacyMode} />
                </div>
                {/* Full Width Forecast */}
                <div className="col-span-4">
                    <CashFlowSection data={data} balance={stats.balance} />
                </div>
            </div>

            {/* 2. PIE CHARTS */}
            <FinancialDistribution
                transactions={data.transactions}
                accountSettings={data.accountSettings}
                currentDate={dashboardDate}
                privacy={privacyMode}
            />

            {/* 3. RECENT TRANSACTIONS */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xl font-bold text-white">Últimas Movimentações</h3>
                    <button onClick={() => setView('transactions')} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                        Ver Extrato Completo <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800/50 shadow-xl">
                    {data.transactions
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 5)
                        .map(t => (
                            <TransactionRow
                                key={t.id}
                                t={t}
                                privacy={privacyMode}
                                onDeleteClick={onDeleteTransaction}
                                onEditClick={onEditTransaction}
                            />
                        ))}
                    {data.transactions.length === 0 && (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                                <Sparkles className="w-6 h-6 text-zinc-600" />
                            </div>
                            <h3 className="text-zinc-300 font-medium mb-1">Tudo limpo por aqui</h3>
                            <p className="text-zinc-500 text-sm">Nenhuma transação registrada neste período.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. QUICK ACTIONS STRIP */}
            <div className="grid grid-cols-2 gap-4">
                <button onClick={onOpenImport} className="bg-surface hover:bg-zinc-800 border border-zinc-800 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] group">
                    <Upload className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-zinc-300">Importar Extrato</span>
                </button>
                <button onClick={() => setView('goals')} className="bg-surface hover:bg-zinc-800 border border-zinc-800 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] group">
                    <Sparkles className="w-5 h-5 text-zinc-400 group-hover:text-pink-400 transition-colors" />
                    <span className="text-sm font-medium text-zinc-300">Metas & Sonhos</span>
                </button>
            </div>
        </div>
    );
};
