import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, MessageCircle, CheckSquare, Square, Trash2 } from 'lucide-react';
import { Transaction, AppData } from '../types';
import { getEffectiveAmount, getInstallmentValue, ACCOUNTS, CATEGORIES } from '../utils';
import { TransactionRow } from '../components/TransactionRow';

interface TransactionsViewProps {
  data: AppData;
  privacyMode: boolean;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onExportCSV: (items: any[]) => void;
  onWhatsApp: (items: any[], start: string, end: string) => void;
  onBulkDelete: (ids: Set<string>) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  data, privacyMode, onEditTransaction, onDeleteTransaction, onExportCSV, onWhatsApp, onBulkDelete
}) => {
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterAccount, setFilterAccount] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'highest' | 'lowest'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const { displayItems, isBillViewMode } = useMemo(() => {
    const isFilteringDate = !!(filterStart || filterEnd);
    let rawList: { t: Transaction, isGhost: boolean, ghostIndex?: number, overrideAmount?: number, sortDate: number }[] = [];

    if (isFilteringDate) {
       const start = filterStart ? new Date(filterStart) : new Date('2000-01-01');
       const end = filterEnd ? new Date(filterEnd) : new Date('2100-01-01');

       data.transactions.forEach(t => {
          if (!t.isInstallment) {
             const tDate = new Date(t.date);
             if (tDate >= start && tDate <= end) {
                if (filterCategory !== 'Todas' && t.category !== filterCategory) return;
                if (filterAccount !== 'Todos' && t.account !== filterAccount) return;
                rawList.push({ t, isGhost: false, sortDate: tDate.getTime() });
             }
          } else {
             const total = t.installmentsTotal || 1;
             const tDate = new Date(t.date);
             for(let i=0; i<total; i++) {
                const instDate = new Date(tDate);
                instDate.setMonth(tDate.getMonth() + i);
                if (instDate >= start && instDate <= end) {
                   if (filterCategory !== 'Todas' && t.category !== filterCategory) continue;
                   if (filterAccount !== 'Todos' && t.account !== filterAccount) continue;
                   rawList.push({ t, isGhost: i > 0, ghostIndex: i + 1, overrideAmount: getInstallmentValue(t), sortDate: instDate.getTime() });
                }
             }
          }
       });
    } else {
       data.transactions.forEach(t => {
          if (filterCategory !== 'Todas' && t.category !== filterCategory) return;
          if (filterAccount !== 'Todos' && t.account !== filterAccount) return;
          rawList.push({ t, isGhost: false, sortDate: new Date(t.date).getTime() });
       });
    }

    rawList.sort((a, b) => {
      if (sortOrder === 'desc') return b.sortDate - a.sortDate;
      if (sortOrder === 'asc') return a.sortDate - b.sortDate;
      const valA = a.overrideAmount || getEffectiveAmount(a.t);
      const valB = b.overrideAmount || getEffectiveAmount(b.t);
      if (sortOrder === 'highest') return valB - valA;
      if (sortOrder === 'lowest') return valA - valB;
      return 0;
    });

    return { displayItems: rawList, isBillViewMode: isFilteringDate };
  }, [data.transactions, filterStart, filterEnd, filterCategory, filterAccount, sortOrder]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectAll = () => {
    const actualIds = displayItems.filter(item => !item.isGhost).map(item => item.t.id);
    if (selectedIds.size === actualIds.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(actualIds));
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">Histórico & Faturas {isBillViewMode && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Modo Fatura</span>}</h2>
        <div className="flex gap-2">
          <button onClick={() => onExportCSV(displayItems)} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Baixar CSV</button>
          <button onClick={() => onWhatsApp(displayItems, filterStart, filterEnd)} className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-500 border border-green-600/30 rounded-lg text-xs font-medium transition-colors"><MessageCircle className="w-4 h-4" /> Enviar Relatório</button>
        </div>
      </div>
      
      <div className="bg-surface p-4 rounded-2xl border border-zinc-800 grid grid-cols-2 md:grid-cols-5 gap-3">
         <div><label className="text-xs text-zinc-500 block mb-1">Início</label><input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white" /></div>
         <div><label className="text-xs text-zinc-500 block mb-1">Fim</label><input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white" /></div>
         <div><label className="text-xs text-zinc-500 block mb-1">Categoria</label><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"><option value="Todas">Todas</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
         <div><label className="text-xs text-zinc-500 block mb-1">Conta</label><select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"><option value="Todos">Todos</option>{ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
         <div><label className="text-xs text-zinc-500 block mb-1">Ordenar</label><select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"><option value="desc">Recentes</option><option value="asc">Antigos</option><option value="highest">Maior Valor</option><option value="lowest">Menor Valor</option></select></div>
      </div>
      
      <div className="flex justify-end">
         <button onClick={selectAll} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">{selectedIds.size > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} Selecionar Todos</button>
      </div>

      <div className="bg-surface rounded-2xl border border-zinc-800 divide-y divide-zinc-800/50">
        {displayItems.map((item, idx) => (
           <TransactionRow key={`${item.t.id}-${idx}`} t={item.t} privacy={privacyMode} onDeleteClick={onDeleteTransaction} onEditClick={onEditTransaction} isGhost={item.isGhost} ghostIndex={item.ghostIndex} overrideAmount={item.overrideAmount} isBillView={isBillViewMode} isSelected={selectedIds.has(item.t.id)} onSelect={toggleSelection} />
        ))}
        {displayItems.length === 0 && <div className="p-8 text-center text-zinc-500">Nada encontrado.</div>}
      </div>

      {selectedIds.size > 0 && (
         <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-surfaceHighlight border border-zinc-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in">
            <span className="text-sm font-medium text-white">{selectedIds.size} selecionados</span>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-400 hover:text-white">Cancelar</button>
            <button onClick={() => onBulkDelete(selectedIds)} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"><Trash2 className="w-3 h-3"/> Deletar</button>
         </div>
      )}
    </div>
  );
};