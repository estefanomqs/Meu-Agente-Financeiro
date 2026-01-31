import React from 'react';
import { CreditCard } from 'lucide-react';
import { AccountSettings } from '../../../types'; // Adjust path as needed

interface CreditCardCarouselProps {
    accountSettings: AccountSettings[];
    onOpenSettings: () => void;
}

export const CreditCardCarousel: React.FC<CreditCardCarouselProps> = ({ accountSettings, onOpenSettings }) => {
    if (!accountSettings || accountSettings.length === 0) return null;

    return (
        <div className="pl-4 py-2 flex overflow-x-auto gap-3 scrollbar-hide mask-gradient-right pr-4 mb-2">
            {accountSettings.map(acc => {
                // Logic for closing/due dates if needed for display, currently just showing static/prop data
                return (
                    <div key={acc.accountId} className="shrink-0 w-36 bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col gap-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-zinc-500" />
                            <span className="text-xs font-bold text-zinc-300 truncate">{acc.accountId}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-medium">Fecha dia {acc.closingDay}</span>
                            <span className="text-[10px] text-zinc-600">Vence dia {acc.dueDay}</span>
                        </div>
                    </div>
                );
            })}
            {/* Add Card Shortcut */}
            <button
                onClick={onOpenSettings}
                className="shrink-0 w-10 flex items-center justify-center bg-zinc-900/50 border border-zinc-800/50 border-dashed rounded-xl hover:bg-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer"
            >
                <span className="text-xl text-zinc-500 hover:text-white transition-colors">+</span>
            </button>
        </div>
    );
};
