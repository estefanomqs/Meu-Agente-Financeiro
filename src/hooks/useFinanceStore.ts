import { useState, useEffect, useCallback } from 'react';
import { AppData, Transaction, Subscription, Goal, AccountSettings, Budget } from '../types';
import { generateId, inferCategory } from '../utils';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'zenith_finance_data_local_v2';

const INITIAL_DATA: AppData = {
  userProfile: { name: '', hasCompletedOnboarding: false },
  transactions: [],
  subscriptions: [],
  goals: [],
  accountSettings: [],
  budgets: []
};

export const useFinanceStore = () => {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { userProfile } = useAuth();

  // Load from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const merged = { ...INITIAL_DATA, ...parsed };
        setData(merged);
      } catch (e) {
        console.error("Data Load Error", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoaded]);

  // Sync basic profile data from Auth to Store if needed
  useEffect(() => {
    if (userProfile && isLoaded) {
      setData(prev => {
        if (prev.userProfile.name !== userProfile.name) {
          return { ...prev, userProfile: { ...prev.userProfile, name: userProfile.name } };
        }
        return prev;
      });
    }
  }, [userProfile, isLoaded]);

  // --- ACTIONS ---

  const completeOnboarding = useCallback(async (name: string, settings: AccountSettings[]) => {
    setData(prev => ({
      ...prev,
      userProfile: { name, hasCompletedOnboarding: true },
      accountSettings: settings
    }));
  }, []);

  const addTransaction = useCallback(async (partialT: Omit<Transaction, 'id'>) => {
    const newT: Transaction = {
      id: generateId(),
      ...partialT as any // cast generic
    };
    setData(prev => ({ ...prev, transactions: [newT, ...prev.transactions] }));
  }, []);

  const editTransaction = useCallback(async (id: string, updatedT: Omit<Transaction, 'id'>) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...updatedT, id } : t)
    }));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  }, []);

  const deleteTransactions = useCallback(async (ids: string[]) => {
    const idsSet = new Set(ids);
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => !idsSet.has(t.id))
    }));
  }, []);

  const addSubscription = useCallback(async (sub: Omit<Subscription, 'id'>) => {
    const newSub: Subscription = { id: generateId(), ...sub };
    setData(prev => ({ ...prev, subscriptions: [...prev.subscriptions, newSub] }));
  }, []);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    const newG: Goal = { id: generateId(), currentValue: 0, ...goal };
    setData(prev => ({ ...prev, goals: [...prev.goals, newG] }));
  }, []);

  const updateGoal = useCallback(async (id: string, amount: number) => { // Amount here is mostly 'currentValue' setter in firebase context
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, currentValue: amount } : g)
    }));
  }, []);

  const addFundsToGoal = useCallback(async (id: string, amountToAdd: number) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, currentValue: (g.currentValue || 0) + amountToAdd } : g)
    }));
  }, []);

  const updateAccountSettings = useCallback(async (settings: AccountSettings) => {
    setData(prev => {
      const existing = prev.accountSettings.findIndex(a => a.accountId === settings.accountId);
      const newSettings = [...prev.accountSettings];
      if (existing >= 0) newSettings[existing] = settings;
      else newSettings.push(settings);
      return { ...prev, accountSettings: newSettings };
    });
  }, []);

  const setBudget = useCallback(async (budget: Omit<Budget, 'id'>) => {
    setData(prev => {
      const idx = prev.budgets.findIndex(b => b.category === budget.category);
      const newBudgets = [...prev.budgets];
      if (idx >= 0) {
        newBudgets[idx] = { ...newBudgets[idx], limit: budget.limit };
      } else {
        newBudgets.push({ id: generateId(), ...budget });
      }
      return { ...prev, budgets: newBudgets };
    });
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    setData(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }));
  }, []);

  const deleteAccountSettings = useCallback(async (accountId: string) => {
    setData(prev => ({
      ...prev,
      accountSettings: prev.accountSettings.filter(a => a.accountId !== accountId)
    }));
  }, []);

  // Import Logic (Restored from Firebase version but local)
  const importCSV = useCallback(async (csvContent: string, defaultAccount: string = 'Inter') => {
    const lines = csvContent.split('\n');
    const newTransactions: Transaction[] = [];

    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(/[;,]/);
      if (parts.length < 3) return;

      let dateStr = parts[0].trim();
      let desc = parts[1].trim();
      let valueStr = parts[parts.length - 1].trim();

      const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (!dateMatch) return;

      const [_, d, m, y] = dateMatch;
      const isoDate = new Date(`${y}-${m}-${d}`).toISOString();

      valueStr = valueStr.replace(/[R$\s]/g, '').replace(',', '.');
      let amount = parseFloat(valueStr);
      if (isNaN(amount)) return;

      const type = amount < 0 ? 'expense' : 'income';
      amount = Math.abs(amount);
      const category = inferCategory(desc);

      newTransactions.push({
        id: generateId(),
        date: isoDate,
        origin: desc,
        amount,
        type,
        category,
        account: defaultAccount,
        paymentMethod: type === 'expense' ? 'Débito' : 'N/A',
        tags: ['Importado'],
        isInstallment: false,
        isShared: false
      });
    });

    if (newTransactions.length > 0) {
      setData(prev => ({ ...prev, transactions: [...prev.transactions, ...newTransactions] }));
      alert(`${newTransactions.length} transações importadas!`);
    }
  }, []);

  const importData = async (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      // Basic validation
      if (!parsed.transactions) throw new Error("Invalid format");
      setData(prev => ({ ...INITIAL_DATA, ...parsed }));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const exportData = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    // Format: zenith-backup-YYYY-MM-DD-HHmm.json
    const fileName = `zenith-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const togglePrivacy = () => setPrivacyMode(prev => !prev);

  return {
    data,
    completeOnboarding,
    addTransaction,
    editTransaction,
    deleteTransaction,
    deleteTransactions,
    addSubscription,
    addGoal,
    updateGoal,
    addFundsToGoal,
    updateAccountSettings,
    deleteAccountSettings,
    setBudget,
    deleteBudget,
    importCSV,
    importData,
    exportData,
    privacyMode,
    togglePrivacy
  };
};