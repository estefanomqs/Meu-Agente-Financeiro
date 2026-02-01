import React from 'react';
import { Transaction, AppData, Goal } from '../../types';
import { TransactionModal } from '../TransactionModal';
import { GoalModal } from '../GoalModal';
import { AccountSettingsModal } from '../AccountSettingsModal';
import { ImportWizard } from '../ImportWizard';
import { ConfirmDeleteModal, GoalDepositModal } from '../Modals';

interface GlobalModalsProps {
    data: AppData;

    // Transaction Modal
    isModalOpen: boolean;
    setIsModalOpen: (v: boolean) => void;
    editingTransaction: Transaction | null;
    setEditingTransaction: (t: Transaction | null) => void;
    onSaveTransaction: (t: Omit<Transaction, 'id'>) => void;

    // Goal Modal
    isGoalModalOpen: boolean;
    setIsGoalModalOpen: (v: boolean) => void;
    onSaveGoal: (g: Omit<Goal, 'id'>) => void;

    // Settings Modal
    showCardSettings: boolean;
    setShowCardSettings: (v: boolean) => void;
    onSaveSettings: (settingsList: any[], deletedIds: string[]) => void;

    // Import Wizard
    isImportWizardOpen: boolean;
    setIsImportWizardOpen: (v: boolean) => void;
    pendingImportFile: File | null;
    setPendingImportFile: (f: File | null) => void;
    onFinishImport: (txs: any[]) => void;

    // Delete Confirmation (Single)
    deleteId: string | null;
    setDeleteId: (id: string | null) => void;
    onConfirmDelete: () => void;

    // Goal Deposit
    depositGoalId: string | null;
    setDepositGoalId: (id: string | null) => void;
    onAddFundsToGoal: (id: string, amount: number) => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
    data,
    isModalOpen, setIsModalOpen, editingTransaction, setEditingTransaction, onSaveTransaction,
    isGoalModalOpen, setIsGoalModalOpen, onSaveGoal,
    showCardSettings, setShowCardSettings, onSaveSettings,
    isImportWizardOpen, setIsImportWizardOpen, pendingImportFile, setPendingImportFile, onFinishImport,
    deleteId, setDeleteId, onConfirmDelete,
    depositGoalId, setDepositGoalId, onAddFundsToGoal
}) => {
    return (
        <>
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
                onSave={onSaveTransaction}
                initialData={editingTransaction}
            />

            <GoalModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                onSave={onSaveGoal}
            />

            <AccountSettingsModal
                isOpen={showCardSettings}
                onClose={() => setShowCardSettings(false)}
                currentSettings={data.accountSettings}
                onSave={onSaveSettings}
            />

            {isImportWizardOpen && (
                <ImportWizard
                    isOpen={isImportWizardOpen}
                    onClose={() => {
                        setIsImportWizardOpen(false);
                        setPendingImportFile(null);
                    }}
                    onFinishImport={onFinishImport}
                    pendingFile={pendingImportFile}
                />
            )}

            <ConfirmDeleteModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={onConfirmDelete}
            />

            <GoalDepositModal
                isOpen={!!depositGoalId}
                onClose={() => setDepositGoalId(null)}
                goalName={data.goals.find(g => g.id === depositGoalId)?.name || ''}
                onConfirm={(amount) => {
                    if (depositGoalId) onAddFundsToGoal(depositGoalId, amount);
                    setDepositGoalId(null);
                }}
            />
        </>
    );
};
