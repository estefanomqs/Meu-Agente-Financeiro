import React from 'react';
import { Calendar } from 'lucide-react';
import { Transaction } from '../../../types';
import { TransactionRow } from '../../../components/TransactionRow';
import { getEffectiveAmount } from '../../../utils';

interface GroupedTransactionItem {
    t: Transaction;
    isGhost: boolean;
    ghostIndex?: number;
    overrideAmount?: number;
    sortDate: number;
    displayDate: number;
}

interface TransactionListProps {
    groupedTransactions: [string, GroupedTransactionItem[]][];
    listStartRef: React.RefObject<HTMLDivElement>;
    privacyMode: boolean;
    onDeleteTransaction: (id: string) => void;
    onEditTransaction: (t: Transaction) => void;
    selectedIds: Set<string>;
    onSelect: (id: string) => void;
    currentDate: Date; // For empty state message
}

export const TransactionList: React.FC<TransactionListProps> = ({
    groupedTransactions,
    listStartRef,
    privacyMode,
    onDeleteTransaction,
    onEditTransaction,
    selectedIds,
    onSelect,
    currentDate
}) => {

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString + 'T12:00:00');
        return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(date).toUpperCase();
    };

    return (
        <div className="relative min-h-[50vh]">
            {/* NOVA ÂNCORA AQUI */}
            <div ref={listStartRef} />

            {/* 2. Timeline List */}
            <div className="space-y-6">
                {groupedTransactions.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center">
                        <Calendar className="w-12 h-12 text-zinc-800 mb-4" />
                        <p className="text-zinc-500">Nenhuma movimentação em {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}.</p>
                    </div>
                ) : (
                    groupedTransactions.map(([dateKey, items]) => {
                        const dayBalance = items.reduce((acc, curr) => {
                            const val = curr.overrideAmount || getEffectiveAmount(curr.t);
                            return curr.t.type === 'income' ? acc + val : acc - Math.abs(val);
                        }, 0);

                        return (
                            <div key={dateKey} className="relative">
                                <div className="sticky top-[180px] z-20 bg-background/80 backdrop-blur-sm py-2 px-2 border-b border-zinc-800/50 flex justify-between items-center -mx-2">
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        {formatDateHeader(dateKey)}
                                    </h3>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 ${dayBalance >= 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                        {dayBalance > 0 ? '+' : ''}{dayBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>

                                <div className="bg-surface rounded-2xl border border-zinc-800 divide-y divide-zinc-800/50 overflow-hidden shadow-sm mt-2">
                                    {items.map((item, idx) => (
                                        <TransactionRow
                                            key={`${item.t.id}-${idx}`}
                                            t={item.t}
                                            privacy={privacyMode}
                                            onDeleteClick={onDeleteTransaction}
                                            onEditClick={onEditTransaction}
                                            isGhost={item.isGhost}
                                            ghostIndex={item.ghostIndex}
                                            overrideAmount={item.overrideAmount}
                                            isSelected={selectedIds.has(item.t.id)}
                                            onSelect={onSelect}
                                            displayDate={item.sortDate}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
