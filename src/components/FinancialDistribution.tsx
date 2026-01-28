import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, AccountSettings } from '../types';
import { getEffectiveAmount, getInstallmentValue, formatCurrency, getInstallmentDates } from '../utils';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface Props {
    transactions: Transaction[];
    accountSettings: AccountSettings[];
    currentDate: Date;
    privacy: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    // Gastos
    'Alimentação': '#fb7185', // rose-400
    'Mercado': '#fb923c', // orange-400
    'Transporte': '#fbbf24', // amber-400
    'Moradia': '#60a5fa', // blue-400
    'Lazer': '#f472b6', // pink-400
    'Saúde': '#34d399', // emerald-400
    'Educação': '#818cf8', // indigo-400
    'Assinaturas': '#a78bfa', // purple-400
    'Compras': '#22d3ee', // cyan-400
    'Outros': '#a1a1aa', // zinc-400
    // Receitas
    'Salário': '#4ade80', // green-400
    'Freelance': '#a3e635', // lime-400
    'Investimentos': '#2dd4bf', // teal-400
    'Presente': '#fcd34d', // amber-300
};

const getColor = (cat: string) => CATEGORY_COLORS[cat] || '#71717a';

const DistributionPie: React.FC<{
    data: { name: string; value: number }[];
    privacy: boolean;
    total: number;
    colorFn: (name: string) => string;
}> = ({ data, privacy, total, colorFn }) => {

    if (data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800/50 rounded-2xl bg-zinc-900/20">
                <span className="text-sm">Sem dados.</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6 h-full p-2">
            {/* Chart */}
            <div className="w-full sm:w-1/2 h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colorFn(entry.name)} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', padding: '12px' }}
                            itemStyle={{ color: '#ffffff', fontSize: '12px', fontWeight: 500 }}
                            formatter={(value: number) => privacy ? '••••' : formatCurrency(value)}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">Total</span>
                        {/* <span className="text-sm font-bold text-white">{privacy ? '••••' : formatCurrency(total)}</span> */}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="w-full sm:w-1/2 flex flex-col gap-3 overflow-y-auto max-h-[220px] custom-scrollbar pr-2">
                {data.map((item) => {
                    const percent = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                        <div key={item.name} className="flex justify-between items-center group p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: colorFn(item.name) }}></span>
                                <span className="text-xs text-zinc-300 font-medium truncate group-hover:text-white transition-colors" title={item.name}>
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex flex-col items-end shrink-0 pl-2">
                                <span className="text-xs font-bold text-white">
                                    {formatCurrency(item.value, privacy)}
                                </span>
                                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400">
                                    {percent.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const FinancialDistribution: React.FC<Props> = ({ transactions, accountSettings, currentDate, privacy }) => {
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

    // Logic to process data
    const processData = (type: 'expense' | 'income') => {
        const dataMap: Record<string, number> = {};
        const targetMonth = currentDate.getMonth();
        const targetYear = currentDate.getFullYear();

        transactions.forEach(t => {
            if (t.type !== type) return;

            const isCredit = t.paymentMethod === 'Crédito';
            const foundSettings = accountSettings.find(s => s.accountId === t.account);
            const settings = foundSettings || (isCredit ? { accountId: t.account, closingDay: 1, dueDay: 10 } : undefined);

            const dates = getInstallmentDates(t, settings);
            const installmentVal = t.installmentsTotal ? getInstallmentValue(t) : getEffectiveAmount(t);

            dates.forEach(d => {
                if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
                    dataMap[t.category] = (dataMap[t.category] || 0) + installmentVal;
                }
            });
        });

        const data = Object.entries(dataMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const total = data.reduce((acc, curr) => acc + curr.value, 0);

        return { data, total };
    };

    const expenseData = processData('expense');
    const incomeData = processData('income');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* MOBILE VIEW: Tabs */}
            <div className="md:hidden col-span-1 bg-surface border border-zinc-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        {activeTab === 'expense' ? <ArrowDownCircle className="w-5 h-5 text-red-400" /> : <ArrowUpCircle className="w-5 h-5 text-emerald-400" />}
                        {activeTab === 'expense' ? 'Distribuição de Gastos' : 'Origem das Receitas'}
                    </h3>
                </div>

                {/* Charts */}
                <div className="min-h-[250px]">
                    {activeTab === 'expense' ? (
                        <DistributionPie data={expenseData.data} total={expenseData.total} privacy={privacy} colorFn={getColor} />
                    ) : (
                        <DistributionPie data={incomeData.data} total={incomeData.total} privacy={privacy} colorFn={getColor} />
                    )}
                </div>

                {/* Tab Toggle */}
                <div className="flex p-1 bg-zinc-900 rounded-xl mt-4 border border-zinc-800">
                    <button
                        onClick={() => setActiveTab('expense')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'expense' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Despesas
                    </button>
                    <button
                        onClick={() => setActiveTab('income')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'income' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Receitas
                    </button>
                </div>
            </div>

            {/* DESKTOP VIEW: Side by Side */}
            <div className="hidden md:block bg-surface border border-zinc-800 rounded-3xl p-6">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                    <ArrowDownCircle className="w-5 h-5 text-red-400" /> Distribuição de Despesas
                </h3>
                <div className="h-[250px]">
                    <DistributionPie data={expenseData.data} total={expenseData.total} privacy={privacy} colorFn={getColor} />
                </div>
            </div>
            <div className="hidden md:block bg-surface border border-zinc-800 rounded-3xl p-6">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-emerald-400" /> Origem das Receitas
                </h3>
                <div className="h-[250px]">
                    <DistributionPie data={incomeData.data} total={incomeData.total} privacy={privacy} colorFn={getColor} />
                </div>
            </div>

        </div>
    );
};
