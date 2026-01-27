import React, { useState } from 'react';
import { Download, Upload, Eye, EyeOff, Settings, CreditCard as CardIcon } from 'lucide-react';
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
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);

  // Import State for file passed from header
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const { 
     data, addTransaction, editTransaction: updateTransaction, deleteTransaction, 
     addGoal, addFundsToGoal, updateAccountSettings, setBudget, deleteBudget,
     completeOnboarding, privacyMode, togglePrivacy, importData, exportData
  } = useFinanceStore();

  // 1. Verificação de Onboarding (Bloqueante)
  if (!data.userProfile.hasCompletedOnboarding) {
    return <OnboardingWizard onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-background text-zinc-100 font-sans selection:bg-primary/30 pb-20 md:pb-0">
      <Sidebar view={view} setView={setView} />
      <MobileNav view={view} setView={setView} />
      
      {/* Modals Globais */}
      <TransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onSave={(t) => { if(editingTransaction) updateTransaction(editingTransaction.id, t); else addTransaction(t); setIsModalOpen(false); }} initialData={editingTransaction} />
      <GoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} onSave={(g) => { addGoal(g); setIsGoalModalOpen(false); }} />
      <AccountSettingsModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} currentSettings={data.accountSettings} onSave={updateAccountSettings} />
      
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
            alert('Importado!'); 
            setIsImportWizardOpen(false); 
          }}
          pendingFile={pendingImportFile}
        />
      )}
      
      <ConfirmDeleteModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if(deleteId) deleteTransaction(deleteId); setDeleteId(null); }} />
      <GoalDepositModal isOpen={!!depositGoalId} onClose={() => setDepositGoalId(null)} goalName={data.goals.find(g => g.id === depositGoalId)?.name || ''} onConfirm={(amount) => { if(depositGoalId) addFundsToGoal(depositGoalId, amount); setDepositGoalId(null); }} />

      <main className="md:ml-64 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Olá, {data.userProfile.name}</h1>
            <p className="text-zinc-500 text-sm">Visão financeira completa.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={togglePrivacy} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
              {privacyMode ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
            </button>
            <div className="relative group">
              <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><Settings className="w-5 h-5" /></button>
              <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50">
                  <div className="bg-surface border border-zinc-800 rounded-xl shadow-xl p-2">
                     <label className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2 font-medium text-emerald-400 cursor-pointer">
                        <Upload className="w-4 h-4"/> Importar Extrato
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
                     <button onClick={() => setIsAccountModalOpen(true)} className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2"><CardIcon className="w-4 h-4"/> Config. Cartões</button>
                     <button onClick={exportData} className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2"><Download className="w-4 h-4"/> Backup JSON</button>
                     <label className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm flex gap-2 cursor-pointer"><Upload className="w-4 h-4"/> Restaurar Backup <input type="file" className="hidden" onChange={(e) => {const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => importData(ev.target?.result as string); r.readAsText(f); }}} accept=".json" /></label>
                  </div>
              </div>
            </div>
          </div>
        </header>

        <SmartBar onAdd={addTransaction} onOpenManual={() => { setEditingTransaction(null); setIsModalOpen(true); }} history={data.transactions} />

        {/* Roteamento de Views */}
        <div className="mt-6">
            {view === 'dashboard' && <DashboardView data={data} privacyMode={privacyMode} onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }} onDeleteTransaction={setDeleteId} setView={setView} />}
            {view === 'transactions' && <TransactionsView data={data} privacyMode={privacyMode} onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }} onDeleteTransaction={setDeleteId} onExportCSV={() => {}} onWhatsApp={() => {}} onBulkDelete={() => {}} />}
            {view === 'calendar' && <CalendarView data={data} privacyMode={privacyMode} onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }} onDeleteTransaction={setDeleteId} />}
            {view === 'goals' && <GoalsView data={data} privacyMode={privacyMode} onAddGoal={() => setIsGoalModalOpen(true)} onDeposit={setDepositGoalId} />}
            {view === 'budgets' && <BudgetsView data={data} privacyMode={privacyMode} onSetBudget={setBudget} onDeleteBudget={deleteBudget} />}
        </div>
      </main>
    </div>
  );
}