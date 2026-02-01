import React, { useMemo } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { AccountSettings, Transaction } from '../../../types';
import { formatCurrency, getEffectiveAmount, getInstallmentValue, getInstallmentDates } from '../../../utils';

interface CreditCardCarouselProps {
    accountSettings: AccountSettings[];
    transactions?: Transaction[];
    currentDate?: Date;
    onOpenSettings: () => void;
}

export const CreditCardCarousel: React.FC<CreditCardCarouselProps> = ({
    accountSettings = [],
    transactions = [],
    currentDate = new Date(),
    onOpenSettings
}) => {

    const cardsData = useMemo(() => {
        if (!accountSettings || !accountSettings.length) return [];

        const targetMonth = currentDate.getMonth();
        const targetYear = currentDate.getFullYear();

        return accountSettings
            // CRITICAL FIX: Filter out undefined/invalid accounts to prevent "Ghost Cards"
            .filter(s => s && s.accountId && s.accountId !== 'undefined')
            .map(setting => {
                let spent = 0;

                transactions.forEach(t => {
                    if (t.account !== setting.accountId) return;
                    if (t.type !== 'expense') return;

                    const amount = t.installmentsTotal ? getInstallmentValue(t) : getEffectiveAmount(t);
                    const dates = getInstallmentDates(t, setting);

                    const match = dates.some(d => d.getMonth() === targetMonth && d.getFullYear() === targetYear);

                    if (match) {
                        spent += amount;
                    }
                });

                return {
                    ...setting,
                    currentBill: spent
                };
            });
    }, [accountSettings, transactions, currentDate]);

    return (
        <div className="w-full mb-6">
            <h3 className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Meus Cartões</h3>

            <div className="flex overflow-x-auto gap-3 px-4 pb-2 scrollbar-hide snap-x">
                {/* Render Cards */}
                {cardsData.map(card => (
                    <div
                        key={card.accountId}
                        // UPDATED DESIGN: Smaller size, standard dark bg, smaller padding
                        className="snap-center shrink-0 w-[200px] h-[130px] bg-surface border border-zinc-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition-all shadow-md"
                    >
                        {/* Simple Glow removed as requested to match standard design */}

                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                                    <CreditCard className="w-3 h-3 text-zinc-400" />
                                </div>
                                <span className="font-bold text-white tracking-wide text-xs truncate max-w-[120px]">{card.accountId}</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        </div>

                        <div className="relative z-10">
                            <span className="text-[10px] text-zinc-500 font-medium block">Fat. {currentDate.toLocaleString('default', { month: 'short' }).replace('.', '')}</span>
                            <span className="text-lg font-bold text-white tracking-tight">
                                {formatCurrency(card.currentBill, false)}
                            </span>
                        </div>

                        <div className="relative z-10 flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-zinc-500 uppercase">Fecha</span>
                                <span className="text-[10px] font-medium text-zinc-300">Dia {card.closingDay}</span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[9px] text-zinc-500 uppercase">Vence</span>
                                <span className="text-[10px] font-medium text-emerald-400">Dia {card.dueDay}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add Button - Scaled down to match new card height */}
                <button
                    onClick={onOpenSettings}
                    className="snap-center shrink-0 w-[60px] h-[130px] bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-zinc-800/50 hover:border-primary/30 transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                        <Plus className="w-4 h-4" />
                    </div>
                </button>
            </div>
        </div>
    );
};
