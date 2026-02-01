import React, { useState } from 'react';
import { ViewState, Transaction } from './types';
import { useAuth } from './contexts/AuthContext';
import { AuthScreens } from './components/AuthScreens';
import { useFinanceStore } from './hooks/useFinanceStore';
import { OnboardingWizard } from './components/OnboardingWizard';
import { SmartBar } from './components/SmartBar';

// New Architecture
import { AppLayout } from './components/layout/AppLayout';
import { GlobalModals } from './components/managers/GlobalModals';

// Import Views
import { DashboardView } from './views/dashboard/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { CalendarView } from './views/CalendarView';
import { GoalsView } from './views/GoalsView';
import { BudgetsView } from './views/BudgetsView';

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');

  // Modals & UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [showCardSettings, setShowCardSettings] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Data State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const {
    data, addTransaction, editTransaction: updateTransaction, deleteTransaction, deleteTransactions,
    addGoal, addFundsToGoal, updateAccountSettings, deleteAccountSettings, setBudget, deleteBudget,
    completeOnboarding, privacyMode, togglePrivacy, importData, exportData
  } = useFinanceStore();

  const { currentUser, loading } = useAuth();

  React.useEffect(() => {
    setShowCardSettings(false);
  }, []);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-500">Carregando...</div>;
  if (!currentUser) return <AuthScreens />;
  if (!data.userProfile.hasCompletedOnboarding) return <OnboardingWizard onComplete={completeOnboarding} />;

  // Handlers Wrappers
  const handleSaveTransaction = (t: Omit<Transaction, 'id'>) => {
    if (editingTransaction) updateTransaction(editingTransaction.id, t);
    else addTransaction(t);
    setIsModalOpen(false);
  };

  const handleSaveSettings = (settingsList: any[], deletedIds: string[]) => {
    settingsList.forEach(s => updateAccountSettings(s));
    if (deletedIds && deletedIds.length > 0) deletedIds.forEach(id => deleteAccountSettings(id));
    setToast('Configurações salvas!');
    setTimeout(() => setToast(null), 3000);
  };

  const handleFinishImport = (txs: any[]) => {
    txs.forEach(addTransaction);
    setToast(`${txs.length} transações importadas!`);
    setTimeout(() => setToast(null), 3000);
    setIsImportWizardOpen(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <AppLayout
      view={view} setView={setView}
      data={data} privacyMode={privacyMode} togglePrivacy={togglePrivacy}
      onOpenSettings={() => setShowCardSettings(true)}
      onExport={exportData}
      onImportRequest={(f) => { setPendingImportFile(f); setIsImportWizardOpen(true); }}
      onRestoreRequest={(json) => importData(json)}

      isActionSheetOpen={isActionSheetOpen} setIsActionSheetOpen={setIsActionSheetOpen}
      onAddTransaction={(t) => { addTransaction(t); setIsActionSheetOpen(false); showToast('Lançamento adicionado!'); }}
      onOpenManualTransaction={() => { setIsActionSheetOpen(false); setEditingTransaction(null); setIsModalOpen(true); }}

      toast={toast}
    >
      {/* SmartBar Global */}
      <SmartBar
        onAdd={addTransaction}
        onOpenManual={() => { setEditingTransaction(null); setIsModalOpen(true); }}
        history={data.transactions}
      />

      {/* Views */}
      <div className="mt-6">
        {view === 'dashboard' && (
          <DashboardView
            data={data} privacyMode={privacyMode}
            onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
            onDeleteTransaction={setDeleteId}
            setView={setView}
            onOpenImport={() => setIsImportWizardOpen(true)}
            userName={data.userProfile.name}
          />
        )}
        {view === 'transactions' && (
          <TransactionsView
            data={data} privacyMode={privacyMode}
            onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
            onDeleteTransaction={setDeleteId}
            onExportCSV={() => { }}
            onWhatsApp={() => { }}
            onBulkDelete={(ids) => { deleteTransactions(Array.from(ids)); showToast(`${ids.size} itens excluídos`); }}
          />
        )}
        {view === 'calendar' && (
          <CalendarView
            data={data} privacyMode={privacyMode}
            onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
            onDeleteTransaction={setDeleteId}
          />
        )}
        {view === 'goals' && (
          <GoalsView
            data={data} privacyMode={privacyMode}
            onAddGoal={() => setIsGoalModalOpen(true)}
            onDeposit={setDepositGoalId}
          />
        )}
        {view === 'budgets' && (
          <BudgetsView
            data={data} privacyMode={privacyMode}
            onSetBudget={setBudget}
            onDeleteBudget={deleteBudget}
          />
        )}
      </div>

      {/* Global Modals Manager */}
      <GlobalModals
        data={data}
        isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}
        editingTransaction={editingTransaction} setEditingTransaction={setEditingTransaction}
        onSaveTransaction={handleSaveTransaction}

        isGoalModalOpen={isGoalModalOpen} setIsGoalModalOpen={setIsGoalModalOpen}
        onSaveGoal={(g) => { addGoal(g); setIsGoalModalOpen(false); }}

        showCardSettings={showCardSettings} setShowCardSettings={setShowCardSettings}
        onSaveSettings={handleSaveSettings}

        isImportWizardOpen={isImportWizardOpen} setIsImportWizardOpen={setIsImportWizardOpen}
        pendingImportFile={pendingImportFile} setPendingImportFile={setPendingImportFile}
        onFinishImport={handleFinishImport}

        deleteId={deleteId} setDeleteId={setDeleteId}
        onConfirmDelete={() => { if (deleteId) deleteTransaction(deleteId); setDeleteId(null); }}

        depositGoalId={depositGoalId} setDepositGoalId={setDepositGoalId}
        onAddFundsToGoal={addFundsToGoal}
      />
    </AppLayout>
  );
}