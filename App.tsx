import React, { useState, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, CreditCard, Calendar, Target, Settings, 
  Eye, EyeOff, Download, Upload, Share2, Trash2, TrendingUp, Wallet, Filter, ChevronLeft, ChevronRight, Edit2, X, Plus, PiggyBank, FileText, Repeat, FileSpreadsheet, MessageCircle, PieChart as PieIcon, CreditCard as CardIcon, CheckSquare, Square
} from 'lucide-react';
import { useFinanceStore } from './hooks/useFinanceStore';
import { SmartBar } from './components/SmartBar';
import { TransactionModal } from './components/TransactionModal';
import { GoalModal } from './components/GoalModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { ImportWizard } from './components/ImportWizard';
import { ForecastChart } from './components/ForecastChart';
import { ExpenseChart } from './components/ExpenseChart';
import { BudgetCard } from './components/BudgetCard';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Transaction, ViewState } from './types';
import { 
  formatCurrency, 
  getEffectiveAmount, 
  getInstallmentValue,
  getActiveInstallmentIndex,
  getEstimatedPaymentDate,
  ACCOUNTS, 
  CATEGORIES, 
  getAccountColor, 
  getCategoryColor, 
  formatCurrencyInput, 
  parseCurrencyToNumber 
} from './utils';

// --- Sub-components ---

const Sidebar = ({ view, setView }: { view: ViewState, setView: (v: ViewState) => void }) => {
  const items: { id: ViewState, icon: any, label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'transactions', icon: CreditCard, label: 'Extrato' },
    { id: 'calendar', icon: Calendar, label: 'Agenda' },
    { id: 'goals', icon: Target, label: 'Cofres' },
    { id: 'budgets', icon: PieIcon, label: 'Orçamentos' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-surface border-r border-zinc-800 flex flex-col p-4 z-40 hidden md:flex">
      <div className="text-2xl font-bold text-white mb-10 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg"></div>
        <span className="hidden md:block">Zenith</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
              view === item.id 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="hidden md:block">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const MobileNav = ({ view, setView }: { view: ViewState, setView: (v: ViewState) => void }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-zinc-800 p-4 flex justify-around z-50">
       <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'text-primary' : 'text-zinc-500'}><LayoutDashboard /></button>
       <button onClick={() => setView('transactions')} className={view === 'transactions' ? 'text-primary' : 'text-zinc-500'}><CreditCard /></button>
       <button onClick={() => setView('budgets')} className={view === 'budgets' ? 'text-primary' : 'text-zinc-500'}><PieIcon /></button>
    </div>
  );
};

const StatCard = ({ title, value, trend, privacy }: { title: string, value: string, trend?: string, privacy: boolean }) => (
  <div className="bg-surface p-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors">
    <h3 className="text-zinc-400 text-sm font-medium mb-1">{title}</h3>
    <div className="text-2xl font-bold text-white mb-2 tracking-tight">
      {value}
    </div>
    {trend && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">{trend}</span>}
  </div>
);

// Expanded Transaction Row to handle "Ghost" props (virtual transactions) and Display Overrides
const TransactionRow: React.FC<{ 
  t: Transaction, 
  privacy: boolean, 
  onDeleteClick?: (id: string) => void, 
  onEditClick?: (t: Transaction) => void,
  isGhost?: boolean,
  ghostIndex?: number,
  overrideAmount?: number,
  isBillView?: boolean, // If true, we are showing the installment slice, not total
  isSubscription?: boolean,
  isSelected?: boolean,
  onSelect?: (id: string) => void
}> = ({ t, privacy, onDeleteClick, onEditClick, isGhost, ghostIndex, overrideAmount, isBillView, isSubscription, isSelected, onSelect }) => {
  
  // If override provided (from bill view calculation), use it.
  // Else if it's a ghost, calc installment.
  // Else use total.
  let displayAmount = getEffectiveAmount(t);
  
  if (overrideAmount !== undefined) {
    displayAmount = overrideAmount;
  } else if (isGhost && t.isInstallment && t.installmentsTotal) {
    displayAmount = getInstallmentValue(t);
  }

  // If it's the Main Row (not ghost) but we are in Bill View and it's an installment, show slice
  if (isBillView && !isGhost && t.isInstallment) {
      displayAmount = getInstallmentValue(t);
  }

  const currentInstallmentIdx = isGhost ? ghostIndex : (isBillView ? 1 : null);

  // Determine styles for Ghost/Subscription
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

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, description }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title?: string, description?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">{title || "Excluir Transação?"}</h3>
        <p className="text-zinc-400 text-sm mb-6">{description || "Essa ação não pode ser desfeita. Tem certeza?"}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white font-medium transition-colors">Excluir</button>
        </div>
      </div>
    </div>
  );
};

const GoalDepositModal = ({ isOpen, onClose, goalName, onConfirm }: { isOpen: boolean, onClose: () => void, goalName: string, onConfirm: (val: number) => void }) => {
  const [val, setVal] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">Adicionar ao Cofre: {goalName}</h3>
        <input 
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white mb-4"
          placeholder="R$ 0,00"
          value={val}
          onChange={e => setVal(formatCurrencyInput(e.target.value))}
        />
        <div className="flex gap-3">
           <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-zinc-800 text-white">Cancelar</button>
           <button onClick={() => {
              const num = parseCurrencyToNumber(val);
              if(num > 0) onConfirm(num);
           }} className="flex-1 py-2 rounded-xl bg-primary text-white font-bold">Depositar</button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Import State
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const { 
     data, addTransaction, editTransaction: updateTransaction, deleteTransaction, 
     addGoal, addFundsToGoal, updateAccountSettings, setBudget, deleteBudget,
     privacyMode, togglePrivacy, importData, exportData, completeOnboarding
  } = useFinanceStore();

  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterAccount, setFilterAccount] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'highest' | 'lowest'>('desc');

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);

  // --- STATS CALCULATION (Real Cash Flow / Bill View) ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expense = 0;

    data.transactions.forEach(t => {
      // Logic: Does this transaction actually impact *this month's* finances?
      // For Debit/Pix: Transaction Date Month == Current Month
      // For Credit: Estimated Payment Date Month == Current Month

      const amount = getEffectiveAmount(t);
      
      // FALLBACK SETTINGS: If user hasn't configured, assume Closing Day 1 / Due Day 10.
      // This ensures previous month transactions (date > 1) are pushed to current month.
      const foundSettings = data.accountSettings.find(s => s.accountId === t.account);
      const settings = foundSettings || (t.paymentMethod === 'Crédito' ? { accountId: t.account, closingDay: 1, dueDay: 10 } : undefined);

      if (t.type === 'income') {
        // Income is usually immediate (Date-based)
        const tDate = new Date(t.date);
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
           income += amount;
        }
      } else {
        // Expense Logic
        if (t.isInstallment && t.installmentsTotal) {
           // Iterate all installments to see if ONE of them falls in this month
           const installmentValue = getInstallmentValue(t);
           const tDate = new Date(t.date);
           
           for (let i = 0; i < t.installmentsTotal; i++) {
              // Nominal date of installment
              const nominalDate = new Date(tDate);
              nominalDate.setMonth(tDate.getMonth() + i);
              
              // Effective Payment Date (taking Closing Day into account)
              const payDate = getEstimatedPaymentDate(nominalDate.toISOString(), t.paymentMethod === 'Crédito' ? settings : undefined);

              if (payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear) {
                 expense += installmentValue;
              }
           }
        } else {
           // Single Expense
           // If Debit/Pix -> Use transaction date
           // If Credit -> Use Payment Date (Billing Cycle)
           const isCredit = t.paymentMethod === 'Crédito' || (!t.paymentMethod && t.account !== 'Carteira'); // Default assumption
           const payDate = getEstimatedPaymentDate(t.date, isCredit ? settings : undefined);

           if (payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear) {
              expense += amount;
           }
        }
      }
    });

    return { income, expense, balance: income - expense };
  }, [data.transactions, data.accountSettings]);

  // --- FILTERED LIST CALCULATION (Smart Bill View) ---
  const { displayItems, isBillViewMode } = useMemo(() => {
    const isFilteringDate = !!(filterStart || filterEnd);
    
    let rawList: { 
      t: Transaction, 
      isGhost: boolean, 
      ghostIndex?: number, 
      overrideAmount?: number,
      sortDate: number 
    }[] = [];

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

                   const isOriginalDate = i === 0;
                   rawList.push({
                      t,
                      isGhost: !isOriginalDate,
                      ghostIndex: i + 1,
                      overrideAmount: getInstallmentValue(t),
                      sortDate: instDate.getTime()
                   });
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


  // --- EXPORT/IMPORT FUNCTIONS ---

  const handleExportCSV = () => {
    // ... existing export code ...
    const headers = ['Data', 'Descricao', 'Categoria', 'Conta', 'Tipo', 'Valor', 'Observacao'];
    const rows = displayItems.map(item => {
      const val = item.overrideAmount || getEffectiveAmount(item.t);
      const dateStr = new Date(item.sortDate).toLocaleDateString('pt-BR');
      const desc = item.t.origin + (item.isGhost ? ` (Parcela ${item.ghostIndex}/${item.t.installmentsTotal})` : '');
      const typeStr = item.t.type === 'income' ? 'Entrada' : 'Saida';
      const cleanDesc = desc.replace(/;/g, ' ').replace(/"/g, '""');
      const cleanNote = (item.t.notes || '').replace(/;/g, ' ').replace(/"/g, '""');
      return [dateStr, `"${cleanDesc}"`, item.t.category, item.t.account, typeStr, val.toFixed(2).replace('.', ','), `"${cleanNote}"`].join(';');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zenith_relatorio_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppReport = () => {
     // ... existing whatsapp code ...
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeList: string[] = [];
    const expenseList: string[] = [];
    const MAX_ITEMS = 60; 
    
    displayItems.slice(0, MAX_ITEMS).forEach(item => {
      const val = item.overrideAmount || getEffectiveAmount(item.t);
      const dateStr = new Date(item.sortDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
      const desc = item.t.origin.substring(0, 20) + (item.t.origin.length > 20 ? '...' : '');
      const parc = item.isGhost ? ` (${item.ghostIndex}/${item.t.installmentsTotal})` : '';
      const formattedLine = `${dateStr} | ${desc}${parc}: R$ ${val.toFixed(2)}`;
      if (item.t.type === 'income') { totalIncome += val; incomeList.push(formattedLine); } 
      else { totalExpense += val; expenseList.push(formattedLine); }
    });

    let summaryIncome = 0;
    let summaryExpense = 0;
    displayItems.forEach(item => {
       const val = item.overrideAmount || getEffectiveAmount(item.t);
       if (item.t.type === 'income') summaryIncome += val; else summaryExpense += val;
    });

    const balance = summaryIncome - summaryExpense;
    const period = filterStart && filterEnd ? `${new Date(filterStart).toLocaleDateString()} a ${new Date(filterEnd).toLocaleDateString()}` : 'Geral/Todo Período';

    const text = `*Relatório Financeiro - Zenith* 🚀\nPeríodo: ${period}\n\n*RESUMO:*\n✅ Total Entradas: R$ ${summaryIncome.toFixed(2)}\n🔻 A Pagar (Saídas): R$ ${summaryExpense.toFixed(2)}\n💰 *Saldo:* R$ ${balance.toFixed(2)}\n\n━━━━━━━━━━━━━━━━\n\n*🟢 ENTRADAS:*\n${incomeList.length > 0 ? incomeList.join('\n') : '(Nenhuma entrada)'}\n\n*🔴 SAÍDAS:*\n${expenseList.length > 0 ? expenseList.join('\n') : '(Nenhuma despesa)'}\n\n${displayItems.length > MAX_ITEMS ? `... e mais ${displayItems.length - MAX_ITEMS} itens.` : ''}`.trim();
    const url = `https://wa.me/5516997849212?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        importData(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };
  
  // New: Handle Import File Selection from Header
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImportFile(file);
      setIsImportWizardOpen(true);
    }
    // Reset input so the same file can be selected again if needed
    if (e.target) e.target.value = '';
  };

  const handleDownload = () => {
    const jsonString = exportData();
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zenith_backup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (t: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, t);
    } else {
      addTransaction(t);
    }
  };

  const handleFinishImport = (transactions: Omit<Transaction, 'id'>[]) => {
      transactions.forEach(t => addTransaction(t));
      alert(`${transactions.length} transações importadas com sucesso!`);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteTransaction(deleteId);
      setDeleteId(null);
    } else if (showBulkDeleteConfirm && selectedIds.size > 0) {
      selectedIds.forEach(id => deleteTransaction(id));
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    }
  };

  // Selection Logic
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectAll = () => {
    // Only select actual transactions, not ghosts
    const actualIds = displayItems
      .filter(item => !item.isGhost)
      .map(item => item.t.id);
      
    if (selectedIds.size === actualIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(actualIds));
    }
  };

  // --- CALENDAR HELPERS (Unchanged logic) ---
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startOffset = firstDay.getDay(); 
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calendarDate]);

  const getTransactionsForDate = (year: number, month: number, day: number) => {
    const targetDate = new Date(year, month, day);
    const realTransactions: Transaction[] = [];
    const ghostTransactions: {t: Transaction, index: number}[] = [];
    const subscriptionTransactions: Transaction[] = [];

    data.transactions.forEach(t => {
      const tDate = new Date(t.date);
      const isCreationDay = tDate.getDate() === day && tDate.getMonth() === month && tDate.getFullYear() === year;

      if (isCreationDay) {
        realTransactions.push(t);
      } else {
        if (t.isInstallment && tDate.getDate() === day) {
           const idx = getActiveInstallmentIndex(t, targetDate);
           if (idx !== null && idx > 1) { 
              ghostTransactions.push({ t, index: idx });
           }
        }
      }
    });

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    data.subscriptions.forEach(sub => {
       const effectiveDueDay = Math.min(sub.dueDay, daysInCurrentMonth);
       if (effectiveDueDay === day) {
          subscriptionTransactions.push({
            id: `sub-${sub.id}-${year}-${month}`,
            amount: sub.value,
            origin: sub.name,
            category: 'Assinaturas',
            account: 'Recorrente',
            paymentMethod: 'Automático',
            date: new Date(year, month, day).toISOString(),
            type: 'expense',
            tags: ['Assinatura'],
            isInstallment: false,
            isShared: false
          });
       }
    });
    return { real: realTransactions, ghost: ghostTransactions, subs: subscriptionTransactions };
  };

  // --- RENDER ---
  // If onboarding is not complete, show only the wizard
  if (!data.userProfile?.hasCompletedOnboarding) {
      return <OnboardingWizard onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-background text-zinc-100 font-sans selection:bg-primary/30">
      <Sidebar view={view} setView={setView} />
      <MobileNav view={view} setView={setView} />
      
      {/* Transaction Modal (Add/Edit) */}
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }} 
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
      />

      {/* Goal Modal */}
      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={addGoal}
      />
      
      {/* Account Settings Modal */}
      <AccountSettingsModal 
         isOpen={isAccountModalOpen}
         onClose={() => setIsAccountModalOpen(false)}
         currentSettings={data.accountSettings}
         onSave={updateAccountSettings}
      />

      {/* Import Wizard */}
      <ImportWizard 
         isOpen={isImportWizardOpen}
         onClose={() => {
           setIsImportWizardOpen(false);
           setPendingImportFile(null); // Clear file on close
         }}
         onFinishImport={handleFinishImport}
         pendingFile={pendingImportFile}
      />
      
      {/* Hidden File Input for Header Button */}
      <input 
        type="file" 
        ref={importFileInputRef}
        className="hidden" 
        accept=".csv,.xlsx,.xls,.pdf"
        onChange={handleImportFileSelect}
      />

      {/* Goal Deposit Modal */}
      <GoalDepositModal 
        isOpen={!!depositGoalId}
        onClose={() => setDepositGoalId(null)}
        goalName={data.goals.find(g => g.id === depositGoalId)?.name || ''}
        onConfirm={(val) => {
          if (depositGoalId) {
            addFundsToGoal(depositGoalId, val);
            setDepositGoalId(null);
          }
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteModal 
        isOpen={!!deleteId || showBulkDeleteConfirm} 
        onClose={() => { setDeleteId(null); setShowBulkDeleteConfirm(false); }} 
        onConfirm={confirmDelete}
        title={showBulkDeleteConfirm ? `Excluir ${selectedIds.size} Itens?` : "Excluir Transação?"}
        description={showBulkDeleteConfirm ? "Você tem certeza que deseja deletar permanentemente os itens selecionados?" : "Essa ação não pode ser desfeita. Tem certeza?"}
      />

      <main className="md:ml-64 p-4 md:p-8 pb-24 max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Bom dia, {data.userProfile.name}</h1>
            <p className="text-zinc-500 text-sm">Controle financeiro total.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* New Import Button - High Visibility */}
            <button 
              onClick={() => importFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-surfaceHighlight hover:bg-zinc-700 border border-zinc-700/50 rounded-full text-zinc-200 transition-all hover:scale-105 active:scale-95 group"
            >
              <Upload className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
              <span className="text-sm font-medium hidden sm:block">Importar Extrato</span>
            </button>
            
            <div className="w-px h-8 bg-zinc-800 mx-2 hidden sm:block"></div>

            <button onClick={togglePrivacy} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
              {privacyMode ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
            </button>
            <div className="relative group">
              <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Dropdown with bridge to fix hover issue */}
              <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50">
                  <div className="bg-surface border border-zinc-800 rounded-xl shadow-xl p-2">
                     <button onClick={() => setIsAccountModalOpen(true)} className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2"><CardIcon className="w-4 h-4"/> Config. Cartões</button>
                     <div className="h-px bg-zinc-800 my-1"></div>
                     <button onClick={handleDownload} className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2"><Download className="w-4 h-4"/> Backup JSON</button>
                     <label className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2 cursor-pointer">
                        <Upload className="w-4 h-4"/> Restaurar Backup
                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".json" />
                     </label>
                  </div>
              </div>

            </div>
          </div>
        </header>

        {/* Smart Command Bar */}
        <SmartBar 
          onAdd={addTransaction} 
          onOpenManual={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
          history={data.transactions} 
        />

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Saldo Previsto (Mês)" value={formatCurrency(stats.balance, privacyMode)} privacy={privacyMode} />
              <StatCard title="Receitas (Mês)" value={formatCurrency(stats.income, privacyMode)} trend="" privacy={privacyMode} />
              <StatCard title="Fatura / Gastos (Mês)" value={formatCurrency(stats.expense, privacyMode)} trend="" privacy={privacyMode} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-6">
                  <div className="bg-surface rounded-2xl border border-zinc-800 overflow-hidden">
                     <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                       <h3 className="font-semibold">Últimas Movimentações (Criação)</h3>
                       <button onClick={() => setView('transactions')} className="text-xs text-primary hover:underline">Ver tudo</button>
                     </div>
                     <div>
                       {data.transactions.slice(0, 5).map(t => (
                         <TransactionRow key={t.id} t={t} privacy={privacyMode} onDeleteClick={setDeleteId} onEditClick={openEditModal} />
                       ))}
                       {data.transactions.length === 0 && (
                         <div className="p-8 text-center text-zinc-500">Nenhuma transação ainda.</div>
                       )}
                     </div>
                  </div>
                  
                  <div className="bg-surface p-6 rounded-2xl border border-zinc-800">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" /> Forecast (Fluxo de Caixa)
                    </h2>
                    <ForecastChart 
                      transactions={data.transactions} 
                      subscriptions={data.subscriptions} 
                      currentBalance={stats.balance} 
                      accountSettings={data.accountSettings}
                    />
                  </div>
               </div>

               <div className="lg:col-span-1 space-y-6">
                  {/* Expense Distribution */}
                  <ExpenseChart transactions={data.transactions} privacy={privacyMode} />
                  
                  {/* Mini Budget Overview */}
                  <div className="bg-surface p-4 rounded-2xl border border-zinc-800">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Orçamentos</h3>
                        <button onClick={() => setView('budgets')} className="text-xs text-primary">Ver todos</button>
                     </div>
                     {data.budgets.slice(0, 3).map(b => {
                        // Calculate spent for this budget this month
                        const spent = data.transactions.reduce((acc, t) => {
                           if(t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() === new Date().getMonth()) {
                              return acc + getEffectiveAmount(t);
                           }
                           return acc;
                        }, 0);
                        return <div key={b.id} className="mb-3"><BudgetCard category={b.category} limit={b.limit} spent={spent} privacy={privacyMode} onEdit={() => setView('budgets')} onDelete={() => {}} /></div>
                     })}
                     {data.budgets.length === 0 && <p className="text-zinc-500 text-sm text-center">Nenhum orçamento definido.</p>}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS (EXTRATO) */}
        {view === 'transactions' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 relative">
            {/* Same as before... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Histórico & Faturas
                {isBillViewMode && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Modo Fatura (Parcelas)</span>}
              </h2>
              <div className="flex gap-2">
                <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Baixar CSV
                </button>
                <button onClick={handleWhatsAppReport} className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-500 border border-green-600/30 rounded-lg text-xs font-medium transition-colors">
                  <MessageCircle className="w-4 h-4" /> Enviar Relatório
                </button>
              </div>
            </div>
            
            <div className="bg-surface p-4 rounded-2xl border border-zinc-800 grid grid-cols-2 md:grid-cols-5 gap-3">
               <div>
                  <label className="text-xs text-zinc-500 block mb-1">Início</label>
                  <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white" />
               </div>
               <div>
                  <label className="text-xs text-zinc-500 block mb-1">Fim</label>
                  <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white" />
               </div>
               <div>
                  <label className="text-xs text-zinc-500 block mb-1">Categoria</label>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white">
                    <option value="Todas">Todas</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs text-zinc-500 block mb-1">Conta</label>
                  <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white">
                    <option value="Todos">Todos</option>
                    {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs text-zinc-500 block mb-1">Ordenar</label>
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white">
                    <option value="desc">Mais recente</option>
                    <option value="asc">Mais antigo</option>
                    <option value="highest">Maior valor</option>
                    <option value="lowest">Menor valor</option>
                  </select>
               </div>
            </div>
            
            <div className="flex justify-end">
               <button onClick={selectAll} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                 {selectedIds.size > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                 Selecionar Todos Visíveis
               </button>
            </div>

            <div className="bg-surface rounded-2xl border border-zinc-800 divide-y divide-zinc-800/50">
              {displayItems.map((item, idx) => (
                 <TransactionRow 
                    key={`${item.t.id}-${idx}`} 
                    t={item.t} 
                    privacy={privacyMode} 
                    onDeleteClick={setDeleteId} 
                    onEditClick={openEditModal} 
                    isGhost={item.isGhost}
                    ghostIndex={item.ghostIndex}
                    overrideAmount={item.overrideAmount}
                    isBillView={isBillViewMode}
                    isSelected={selectedIds.has(item.t.id)}
                    onSelect={toggleSelection}
                 />
              ))}
              {displayItems.length === 0 && <div className="p-8 text-center text-zinc-500">Nada encontrado com esses filtros.</div>}
            </div>

            {/* Bulk Actions Floating Bar */}
            {selectedIds.size > 0 && (
               <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-surfaceHighlight border border-zinc-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in">
                  <span className="text-sm font-medium text-white">{selectedIds.size} selecionados</span>
                  <div className="h-4 w-px bg-zinc-600"></div>
                  <button 
                     onClick={() => setSelectedIds(new Set())}
                     className="text-xs text-zinc-400 hover:text-white font-medium"
                  >
                     Cancelar
                  </button>
                  <button 
                     onClick={() => setShowBulkDeleteConfirm(true)}
                     className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                  >
                     <Trash2 className="w-3 h-3"/> Deletar
                  </button>
               </div>
            )}
          </div>
        )}

        {/* CALENDAR */}
        {view === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
             {/* Same as before... */}
             <div className="lg:col-span-1 bg-surface rounded-2xl border border-zinc-800 p-4 h-fit sticky top-4">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-lg font-bold capitalize">
                     {calendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                   </h2>
                   <div className="flex gap-2">
                     <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} className="p-2 hover:bg-zinc-800 rounded-lg"><ChevronLeft className="w-5 h-5"/></button>
                     <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="p-2 hover:bg-zinc-800 rounded-lg"><ChevronRight className="w-5 h-5"/></button>
                   </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                  {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-zinc-500 text-xs font-bold">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={idx} className="aspect-square"></div>;
                    const { real, ghost, subs } = getTransactionsForDate(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                    const hasExpense = real.some(t => t.type === 'expense') || ghost.length > 0;
                    const hasIncome = real.some(t => t.type === 'income');
                    const hasSub = subs.length > 0;
                    const isSelected = selectedDay === day;

                    return (
                      <button 
                        key={idx} 
                        onClick={() => setSelectedDay(day)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border ${isSelected ? 'bg-primary/20 border-primary text-white' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'}`}
                      >
                        <span className="text-sm font-medium">{day}</span>
                        <div className="flex gap-1 mt-1 h-2">
                          {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>}
                          {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>}
                          {hasSub && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                        </div>
                      </button>
                    )
                  })}
                </div>
             </div>

             <div className="lg:col-span-2">
               {selectedDay ? (
                 <div className="bg-surface rounded-2xl border border-zinc-800 overflow-hidden animate-in fade-in">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                      <h3 className="font-semibold">Dia {selectedDay} de {calendarDate.toLocaleString('pt-BR', { month: 'long' })}</h3>
                      <button onClick={() => setSelectedDay(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                       {(() => {
                          const { real, ghost, subs } = getTransactionsForDate(calendarDate.getFullYear(), calendarDate.getMonth(), selectedDay);
                          if (real.length === 0 && ghost.length === 0 && subs.length === 0) return <div className="p-8 text-center text-zinc-500">Nada registrado.</div>;
                          return (
                            <>
                              {real.map(t => <TransactionRow key={t.id} t={t} privacy={privacyMode} onDeleteClick={setDeleteId} onEditClick={openEditModal} isBillView={true} />)}
                              {subs.map(t => <TransactionRow key={t.id} t={t} privacy={privacyMode} isSubscription={true} />)}
                              {ghost.map(({t, index}) => <TransactionRow key={`${t.id}-ghost-${index}`} t={t} privacy={privacyMode} isGhost={true} ghostIndex={index} />)}
                            </>
                          );
                       })()}
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex items-center justify-center text-zinc-600 border border-zinc-800/50 rounded-2xl border-dashed min-h-[300px]">
                    <div className="text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                      <p>Selecione um dia para ver detalhes</p>
                    </div>
                 </div>
               )}
             </div>
          </div>
        )}

        {/* GOALS */}
        {view === 'goals' && (
          <div className="animate-in slide-in-from-bottom-4">
             {/* Same as before... */}
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold">Cofres & Objetivos</h2>
               <button onClick={() => setIsGoalModalOpen(true)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90">+ Novo Cofre</button>
             </div>
             {data.goals.length === 0 ? (
               <div className="bg-surface p-8 rounded-2xl border border-zinc-800 text-center">
                  <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhum objetivo criado ainda.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {data.goals.map(goal => {
                   const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                   return (
                     <div key={goal.id} className="bg-surface p-6 rounded-2xl border border-zinc-800 relative group">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-white">{goal.name}</h3>
                          <div className="flex gap-2">
                             <button onClick={() => setDepositGoalId(goal.id)} className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
                             <Target className="w-5 h-5 text-zinc-500" />
                          </div>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                           <span className="text-zinc-400">Atual: {formatCurrency(goal.currentValue, privacyMode)}</span>
                           <span className="text-zinc-400">Meta: {formatCurrency(goal.targetValue, privacyMode)}</span>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                           <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="mt-2 text-right text-xs text-primary font-medium">{progress.toFixed(1)}%</div>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        )}

        {/* BUDGETS (New View) */}
        {view === 'budgets' && (
          <div className="animate-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold">Orçamentos Mensais</h2>
               <div className="flex gap-2">
                 <button onClick={() => {
                   // Simple prompt for now, could be a Modal later
                   const cat = prompt("Categoria (Ex: Alimentação):");
                   if(cat) {
                     const limit = prompt("Limite Mensal (R$):");
                     if(limit) setBudget({ category: cat, limit: parseFloat(limit) });
                   }
                 }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90">
                   + Novo Orçamento
                 </button>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.budgets.map(b => {
                   // Calculate spent
                   const spent = data.transactions.reduce((acc, t) => {
                      // Filter by Category, Expense, and Current Month
                      const tDate = new Date(t.date);
                      const now = new Date();
                      if(t.type === 'expense' && t.category === b.category && tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) {
                         return acc + getEffectiveAmount(t);
                      }
                      return acc;
                   }, 0);

                   return <BudgetCard 
                      key={b.id} 
                      category={b.category} 
                      limit={b.limit} 
                      spent={spent} 
                      privacy={privacyMode} 
                      onEdit={() => {
                         const newLimit = prompt(`Novo limite para ${b.category}:`, b.limit.toString());
                         if(newLimit) setBudget({ category: b.category, limit: parseFloat(newLimit) });
                      }}
                      onDelete={() => {
                        if(confirm("Excluir orçamento?")) deleteBudget(b.id);
                      }}
                   />
                })}
             </div>
             {data.budgets.length === 0 && (
                <div className="p-8 text-center text-zinc-500 border border-zinc-800 rounded-2xl border-dashed">
                   Defina tetos de gastos para suas categorias para acompanhar o progresso aqui.
                </div>
             )}
          </div>
        )}

      </main>
    </div>
  );
}