import React, { useState } from 'react';
import { Download, Upload, Eye, EyeOff, Settings, CreditCard as CardIcon, Check, Camera, FileText, X } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthScreens } from './components/AuthScreens';
import { useFinanceStore } from './hooks/useFinanceStore';
import { SmartBar } from './components/SmartBar';
import { TransactionModal } from './components/TransactionModal';
import { GoalModal } from './components/GoalModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { ImportWizard } from './components/ImportWizard';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ConfirmDeleteModal, GoalDepositModal } from './components/Modals';
import { Sidebar, MobileNav } from './components/Navigation';

// Importando as Views (Certifique-se que elas existem na pasta views)
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { CalendarView } from './views/CalendarView';
import { GoalsView } from './views/GoalsView';
import { BudgetsView } from './views/BudgetsView';

import { ViewState, Transaction } from './types';

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [showCardSettings, setShowCardSettings] = useState(false); // Renamed from isAccountModalOpen
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);

  // Notification State
  const [toast, setToast] = useState<string | null>(null);

  // Import State for file passed from header
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const {
    data, addTransaction, editTransaction: updateTransaction, deleteTransaction,
    addGoal, addFundsToGoal, updateAccountSettings, deleteAccountSettings, setBudget, deleteBudget,
    completeOnboarding, privacyMode, togglePrivacy, importData, exportData
  } = useFinanceStore();

  // 0. Auth Check
  const { currentUser, loading } = useAuth();

  // Guard: Ensure settings modal is closed on mount
  React.useEffect(() => {
    setShowCardSettings(false);
    console.log("App Mounted: forcing card settings closed.");
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-500">Carregando...</div>;
  }

  if (!currentUser) {
    return <AuthScreens />;
  }

  // 1. Verificação de Onboarding (Bloqueante)
  if (!data.userProfile.hasCompletedOnboarding) {
    return <OnboardingWizard onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-background text-zinc-100 font-sans selection:bg-primary/30 pb-20 md:pb-0">
      <Sidebar view={view} setView={setView} />
      <MobileNav view={view} setView={setView} onOpenActionSheet={() => setIsActionSheetOpen(true)} />

      {/* ACTION SHEET (Mobile Only - New Transaction) */}
      {isActionSheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsActionSheetOpen(false)}
          />

          {/* Sheet Content */}
          <div className="relative w-full bg-surface/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom-full duration-300 shadow-2xl ring-1 ring-white/5">

            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-zinc-700/50 rounded-full mx-auto mb-8"></div>

            {/* 1. AI SmartBar (Optimized for Sheet) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Novo Lançamento</span>
                <span className="text-[10px] text-zinc-500">IA Powered</span>
              </div>
              <SmartBar
                onAdd={(t) => { addTransaction(t); setIsActionSheetOpen(false); setToast('Lançamento via IA adicionado!'); setTimeout(() => setToast(null), 3000); }}
                onOpenManual={() => { setIsActionSheetOpen(false); setEditingTransaction(null); setIsModalOpen(true); }}
                history={data.transactions}
                autoFocus={false} // Don't focus immediately on mobile to keep sheet visible
              />
              <p className="text-xs text-zinc-500 text-center mt-2 px-4">
                💡 Dica: Tente <span className="text-zinc-400 font-mono">"Uber 20 Nubank"</span> ou <span className="text-zinc-400 font-mono">"Salário 3000"</span>
              </p>
            </div>

            {/* 2. Manual Shortcuts Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button disabled className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 cursor-not-allowed opacity-70">
                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium">Scan Nota</span>
              </button>

              <button
                onClick={() => { setIsActionSheetOpen(false); setEditingTransaction(null); setIsModalOpen(true); }}
                className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-zinc-800 border border-zinc-700 text-white active:scale-95 transition-all hover:bg-zinc-700"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium">Manual</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsActionSheetOpen(false)}
              className="w-full py-4 text-center text-zinc-500 hover:text-white transition-colors border-t border-white/5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-full">
              <Check className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Sucesso</h4>
              <p className="text-xs text-zinc-400">{toast}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals Globais */}
      <TransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onSave={(t) => { if (editingTransaction) updateTransaction(editingTransaction.id, t); else addTransaction(t); setIsModalOpen(false); }} initialData={editingTransaction} />
      <GoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} onSave={(g) => { addGoal(g); setIsGoalModalOpen(false); }} />
      <AccountSettingsModal
        isOpen={showCardSettings}
        onClose={() => setShowCardSettings(false)}
        currentSettings={data.accountSettings}
        onSave={(settingsList, deletedIds) => {
          // Batch update
          settingsList.forEach(s => updateAccountSettings(s));
          // Batch delete
          if (deletedIds && deletedIds.length > 0) {
            deletedIds.forEach(id => deleteAccountSettings(id));
          }

          setToast('Configurações salvas com sucesso!');
          setTimeout(() => setToast(null), 3000);
        }}
      />

      {/* Import Wizard - Renderização Condicional para garantir reset de estado ao fechar */}
      {isImportWizardOpen && (
        <ImportWizard
          isOpen={isImportWizardOpen}
          onClose={() => {
            setIsImportWizardOpen(false);
            setPendingImportFile(null);
          }}
          onFinishImport={(txs) => {
            txs.forEach(addTransaction);
            setToast(`${txs.length} transações importadas!`);
            setTimeout(() => setToast(null), 3000);
            setIsImportWizardOpen(false);
          }}
          pendingFile={pendingImportFile}
        />
      )}

      <ConfirmDeleteModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteTransaction(deleteId); setDeleteId(null); }} />
      <GoalDepositModal isOpen={!!depositGoalId} onClose={() => setDepositGoalId(null)} goalName={data.goals.find(g => g.id === depositGoalId)?.name || ''} onConfirm={(amount) => { if (depositGoalId) addFundsToGoal(depositGoalId, amount); setDepositGoalId(null); }} />

      <main className="md:ml-64 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Olá, {data.userProfile.name}</h1>
            <p className="text-zinc-500 text-sm">Visão financeira completa.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={togglePrivacy} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
              {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <div className="relative group">
              <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><Settings className="w-5 h-5" /></button>
              <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-[100]">
                <div className="bg-surface border border-zinc-800 rounded-xl shadow-xl p-2">
                  <label className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2 font-medium text-emerald-400 cursor-pointer">
                    <Upload className="w-4 h-4" /> Importar Extrato
                    <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.pdf" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setPendingImportFile(f);
                        setIsImportWizardOpen(true);
                      }
                      e.target.value = '';
                    }} />
                  </label>
                  <div className="h-px bg-zinc-800 my-1"></div>
                  <button onClick={() => setShowCardSettings(true)} className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2"><CardIcon className="w-4 h-4" /> Config. Cartões</button>
                  <button onClick={exportData} className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2"><Download className="w-4 h-4" /> Backup JSON</button>
                  <label className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2 cursor-pointer"><Upload className="w-4 h-4" /> Restaurar Backup <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (ev) => importData(ev.target?.result as string); r.readAsText(f); } }} accept=".json" /></label>
                </div>
              </div>
            </div>
          </div>
        </header>

        <SmartBar onAdd={addTransaction} onOpenManual={() => { setEditingTransaction(null); setIsModalOpen(true); }} history={data.transactions} />

        {/* Roteamento de Views */}
        <div className="mt-6">
          {view === 'dashboard' && <DashboardView data={data} privacyMode={privacyMode} onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }} onDeleteTransaction={setDeleteId} setView={setView} onOpenImport={() => setIsImportWizardOpen(true)} userName={data.userProfile.name} />}
          {view === 'transactions' && <TransactionsView data={data} privacyMode={privacyMode} onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }} onDeleteTransaction={setDeleteId} onExportCSV={() => { }} onWhatsApp={() => { }} onBulkDelete={() => { }} />}
          {view === 'calendar' && <CalendarView data={data} privacyMode={privacyMode} onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }} onDeleteTransaction={setDeleteId} />}
          {view === 'goals' && <GoalsView data={data} privacyMode={privacyMode} onAddGoal={() => setIsGoalModalOpen(true)} onDeposit={setDepositGoalId} />}
          {view === 'budgets' && <BudgetsView data={data} privacyMode={privacyMode} onSetBudget={setBudget} onDeleteBudget={deleteBudget} />}
        </div>
      </main>
    </div>
  );
}