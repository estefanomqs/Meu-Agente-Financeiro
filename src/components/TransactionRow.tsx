import React from 'react';
import { Edit2, Trash2, TrendingUp, CreditCard, Wallet, Share2, FileText, Repeat, CheckSquare, Square } from 'lucide-react';
import { Transaction } from '../types';
import { getEffectiveAmount, getInstallmentValue, formatCurrency, getAccountColor, getCategoryColor } from '../utils';

interface TransactionRowProps {
  t: Transaction;
  privacy: boolean;
  onDeleteClick?: (id: string) => void;
  onEditClick?: (t: Transaction) => void;
  isGhost?: boolean;
  ghostIndex?: number;
  overrideAmount?: number;
  isBillView?: boolean;
  isSubscription?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ 
  t, privacy, onDeleteClick, onEditClick, isGhost, ghostIndex, overrideAmount, isBillView, isSubscription, isSelected, onSelect 
}) => {
  
  let displayAmount = getEffectiveAmount(t);
  
  if (overrideAmount !== undefined) {
    displayAmount = overrideAmount;
  } else if (isGhost && t.isInstallment && t.installmentsTotal) {
    displayAmount = getInstallmentValue(t);
  }

  if (isBillView && !isGhost && t.isInstallment) {
      displayAmount = getInstallmentValue(t);
  }

  const currentInstallmentIdx = isGhost ? ghostIndex : (isBillView ? 1 : null);

  let rowStyle = 'hover:bg-zinc-800/30 hover:border-zinc-800/50';
  if (isGhost) rowStyle = 'bg-zinc-900/50 border-dashed border-zinc-800 hover:border-zinc-700 opacity-80';
  if (isSubscription) rowStyle = 'bg-purple-500/5 border-dashed border-purple-500/20 hover:bg-purple-500/10';
  if (isSelected) rowStyle = 'bg-primary/5 border-primary/30';

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl transition-colors group border border-transparent ${rowStyle}`}>
      <div className="flex items-center gap-4">
        {onSelect && !isGhost && !isSubscription && (
          <button onClick={() => onSelect(t.id)} className="text-zinc-500 hover:text-white">
             {isSelected ? <CheckSquare className="w-5 h-5 text-primary"/> : <Square className="w-5 h-5"/>}
          </button>
        )}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${getAccountColor(t.account)}`}>
          {isSubscription ? (
            <Repeat className="w-5 h-5 text-purple-400" />
          ) : (
            t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />
          )}
        </div>
        <div>
          <p className="font-medium text-white line-clamp-1 flex items-center gap-2">
            {t.origin} 
            {isGhost && !isSubscription && <span className="text-[10px] uppercase tracking-wider text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">Provisionado</span>}
            {isSubscription && <span className="text-[10px] uppercase tracking-wider text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">Assinatura</span>}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500 mt-1">
            <span>{new Date(t.date).toLocaleDateString()}</span>
            
            <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 border ${getAccountColor(t.account)}`}>
               <Wallet className="w-3 h-3" /> {t.account} 
               {t.paymentMethod && t.paymentMethod !== 'N/A' && (
                 <span className="opacity-70 font-normal"> • {t.paymentMethod}</span>
               )}
            </span>

            <span className={`font-medium ${getCategoryColor(t.category)}`}>
              {t.category}
            </span>
            {t.isShared && <span className="flex items-center gap-1 text-blue-400 font-medium"><Share2 className="w-3 h-3"/> Split</span>}
            
            {(t.isInstallment) && t.installmentsTotal && (
              <span className="text-orange-400">
                {currentInstallmentIdx 
                  ? `Parcela ${currentInstallmentIdx}/${t.installmentsTotal}` 
                  : `Total Parcelado (${t.installmentsTotal}x)`}
              </span>
            )}
            
            {t.notes && <span className="flex items-center gap-1 text-zinc-400"><FileText className="w-3 h-3" /> Nota</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className={`block font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-secondary' : 'text-white'}`}>
            {t.type === 'expense' && '-'} {formatCurrency(displayAmount, privacy)}
          </span>
        </div>
        {!isGhost && !isSubscription && onDeleteClick && onEditClick && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onEditClick(t)} 
              className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
              title="Editar Transação"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onDeleteClick(t.id)} 
              className="p-2 text-zinc-600 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
              title="Excluir Transação"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};