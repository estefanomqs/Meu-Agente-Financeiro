import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, MessageCircle, CheckSquare, Square, Trash2, Search, Filter, Tag } from 'lucide-react';
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
   const [searchTerm, setSearchTerm] = useState(''); // Busca universal
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

   // 1. Processamento e Filtragem
   const { groupedTransactions, summary } = useMemo(() => {
      let rawList: { t: Transaction, isGhost: boolean, ghostIndex?: number, overrideAmount?: number, sortDate: number }[] = [];

      // Definição do Range de Data (Padrão: Todo o período se vazio)
      const start = filterStart ? new Date(filterStart) : new Date('2000-01-01');
      const end = filterEnd ? new Date(filterEnd) : new Date('2100-01-01');
      // Ajuste do fim do dia para incluir transações do último dia selecionado
      end.setHours(23, 59, 59, 999);

      // Lógica de Expansão de Parcelas e Filtragem
      data.transactions.forEach(t => {
         const matchesSearch = searchTerm === '' ||
            t.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

         if (!matchesSearch) return;
         if (filterCategory !== 'Todas' && t.category !== filterCategory) return;
         if (filterAccount !== 'Todos' && t.account !== filterAccount) return;

         if (!t.isInstallment) {
            const tDate = new Date(t.date);
            if (tDate >= start && tDate <= end) {
               rawList.push({ t, isGhost: false, sortDate: tDate.getTime() });
            }
         } else {
            const total = t.installmentsTotal || 1;
            const tDate = new Date(t.date);
            for (let i = 0; i < total; i++) {
               const instDate = new Date(tDate);
               instDate.setMonth(tDate.getMonth() + i);
               if (instDate >= start && instDate <= end) {
                  rawList.push({
                     t,
                     isGhost: i > 0,
                     ghostIndex: i + 1,
                     overrideAmount: getInstallmentValue(t),
                     sortDate: instDate.getTime()
                  });
               }
            }
         }
      });

      // Ordenação: Mais recente primeiro
      rawList.sort((a, b) => b.sortDate - a.sortDate);

      // Agrupamento por Data (O Segredo da Timeline)
      const groups: Record<string, typeof rawList> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      rawList.forEach(item => {
         // Formata a chave como YYYY-MM-DD para agrupar corretamente
         const dateKey = new Date(item.sortDate).toISOString().split('T')[0];
         if (!groups[dateKey]) groups[dateKey] = [];
         groups[dateKey].push(item);

         // Somar totais
         const val = item.overrideAmount || getEffectiveAmount(item.t);
         if (item.t.type === 'income') totalIncome += val;
         else totalExpense += val; // Val já vem negativo do utils normalmente, mas verifique sua logica
      });

      // Converter objeto em array ordenado
      const sortedGroups = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));

      return {
         groupedTransactions: sortedGroups,
         summary: { income: totalIncome, expense: totalExpense, balance: totalIncome - Math.abs(totalExpense) }
      };
   }, [data.transactions, filterStart, filterEnd, filterCategory, filterAccount, searchTerm]);

   // Formatador de Data Seguro (Resolve o Bug Setembro/Dezembro)
   const formatDateHeader = (dateString: string) => {
      const date = new Date(dateString + 'T12:00:00'); // Força meio-dia para evitar timezone shift
      return new Intl.DateTimeFormat('pt-BR', {
         weekday: 'long',
         day: 'numeric',
         month: 'short' // "set.", "dez."
      }).format(date).toUpperCase();
   };

   const toggleSelection = (id: string) => {
      setSelectedIds(prev => {
         const newSet = new Set(prev);
         if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
         return newSet;
      });
   };

   const selectAll = () => {
      // Lógica simplificada para selecionar visíveis
      const allIds = new Set<string>();
      groupedTransactions.forEach(([_, items]) => items.forEach(i => !i.isGhost && allIds.add(i.t.id)));
      setSelectedIds(prev => prev.size === allIds.size ? new Set() : allIds);
   };

   return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 relative pb-20">

         {/* 1. Header & Resumo Flutuante */}
         <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">Extrato</h2>
                  <p className="text-xs text-zinc-500">Gerencie todas as suas movimentações</p>
               </div>

               {/* Barra de Resumo (Glassmorphism Refinado) */}
               <div className="flex items-center gap-4 bg-surface/50 backdrop-blur-md border border-zinc-800 rounded-xl p-2 px-4 shadow-sm">
                  <div className="text-xs">
                     <span className="text-zinc-500 block">Entradas</span>
                     <span className="text-emerald-400 font-semibold">{privacyMode ? '••••' : `R$ ${summary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
                  </div>
                  <div className="h-6 w-px bg-zinc-800"></div>
                  <div className="text-xs">
                     <span className="text-zinc-500 block">Saídas</span>
                     <span className="text-red-400 font-semibold">{privacyMode ? '••••' : `R$ ${Math.abs(summary.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
                  </div>
                  <div className="h-6 w-px bg-zinc-800"></div>
                  <div className={`text-xs px-2 py-1 rounded-lg border ${summary.balance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                     <span className="font-bold">{privacyMode ? '••••' : `R$ ${summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
                  </div>
               </div>
            </div>

            {/* 2. Barra de Busca e Filtros */}
            <div className="space-y-3">
               <div className="flex gap-2">
                  <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                     <input
                        type="text"
                        placeholder="Buscar por nome, categoria ou valor..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 focus:border-primary rounded-xl py-3 pl-10 pr-4 text-sm text-white transition-all outline-none"
                     />
                  </div>
                  <button onClick={() => {/* Toggle Filters Panel (Futuro) */ }} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-colors">
                     <Filter className="w-5 h-5" />
                  </button>
                  <button onClick={() => onExportCSV([])} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-colors">
                     <FileSpreadsheet className="w-5 h-5" />
                  </button>
               </div>

               {/* Quick Tags (Filtro Rápido - Sugestão Visual) */}
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['Alimentação', 'Uber', 'Mercado', 'Assinaturas'].map(tag => (
                     <button
                        key={tag}
                        onClick={() => setSearchTerm(tag === searchTerm ? '' : tag)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap flex items-center gap-1.5
                            ${searchTerm === tag
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                     >
                        <Tag className="w-3 h-3" /> {tag}
                     </button>
                  ))}
               </div>

               {/* Filtros Avançados (Colapsáveis ou Grid) */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-400" />
                  <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-400" />
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-400"><option value="Todas">Todas Categorias</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-400"><option value="Todos">Todas Contas</option>{ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}</select>
               </div>
            </div>
         </div>

         <div className="flex justify-end pt-2">
            <button onClick={selectAll} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
               {selectedIds.size > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />} Selecionar Visíveis
            </button>
         </div>

         {/* 3. A Timeline (Lista Agrupada) */}
         <div className="space-y-8">
            {groupedTransactions.length === 0 ? (
               <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Search className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-500">Nenhuma transação encontrada.</p>
               </div>
            ) : (
               groupedTransactions.map(([dateKey, items]) => {
                  // Cálculo do Saldo do Dia
                  const dayBalance = items.reduce((acc, curr) => {
                     const val = curr.overrideAmount || getEffectiveAmount(curr.t);
                     return curr.t.type === 'income' ? acc + val : acc - Math.abs(val);
                  }, 0);

                  return (
                     <div key={dateKey} className="relative">
                        {/* Sticky Date Header */}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-3 border-b border-zinc-800/50 flex justify-between items-end mb-2">
                           <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                              {formatDateHeader(dateKey)}
                           </h3>
                           <span className={`text-xs font-mono font-medium ${dayBalance >= 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                              {privacyMode ? '••••' : (dayBalance > 0 ? '+' : '') + dayBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </span>
                        </div>

                        {/* Lista de Itens do Dia */}
                        <div className="bg-surface rounded-2xl border border-zinc-800 divide-y divide-zinc-800/50 overflow-hidden shadow-sm">
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
                                 onSelect={toggleSelection}
                                 displayDate={item.sortDate}
                              />
                           ))}
                        </div>
                     </div>
                  );
               })
            )}
         </div>

         {/* Floating Bulk Action Bar */}
         {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-surfaceHighlight border border-zinc-700 shadow-2xl shadow-black/50 rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in">
               <span className="text-sm font-medium text-white">{selectedIds.size} selecionados</span>
               <div className="h-4 w-px bg-zinc-700"></div>
               <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-400 hover:text-white transition-colors">Cancelar</button>
               <button onClick={() => onBulkDelete(selectedIds)} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95">
                  <Trash2 className="w-3 h-3" /> Deletar
               </button>
            </div>
         )}
      </div>
   );
};