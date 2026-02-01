import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ForecastChart } from '../../../components/ForecastChart';
import { AppData } from '../../../types';

interface CashFlowSectionProps {
    data: AppData;
    balance: number;
}

export const CashFlowSection: React.FC<CashFlowSectionProps> = ({ data, balance }) => (
    <div className="bg-surface rounded-3xl border border-zinc-800 p-6 md:p-8 h-full">
        <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-white">Fluxo do Mês</h3>
        </div>
        <ForecastChart
            transactions={data.transactions}
            subscriptions={data.subscriptions}
            currentBalance={balance}
            accountSettings={data.accountSettings}
        />
    </div>
);
