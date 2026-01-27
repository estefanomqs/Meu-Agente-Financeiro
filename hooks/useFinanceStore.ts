import { useState, useEffect, useCallback } from 'react';
import { AppData, Transaction, Subscription, Goal, AccountSettings, Budget } from '../types';
import { generateId, inferCategory, parseCurrencyToNumber } from '../utils';

const STORAGE_KEY = 'zenith_finance_data_v1';

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

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with initial data to ensure new fields exist if loading old data
        const merged = { ...INITIAL_DATA, ...parsed };
        
        // Ensure arrays exist
        if (!Array.isArray(merged.accountSettings)) merged.accountSettings = [];
        if (!Array.isArray(merged.budgets)) merged.budgets = [];
        
        // Ensure profile exists (Migration logic)
        if (!merged.userProfile) {
            merged.userProfile = { name: '', hasCompletedOnboarding: false };
        }

        setData(merged);
      } catch (e) {
        console.error("Failed to parse local data", e);
      }
    }
  }, []);

  // Save to local storage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // --- ACTIONS ---

  const completeOnboarding = useCallback((name: string, settings: AccountSettings[]) => {
    setData(prev => ({
      ...prev,
      userProfile: { name, hasCompletedOnboarding: true },
      accountSettings: settings
    }));
  }, []);

  const addTransaction = useCallback((partialT: Omit<Transaction, 'id'>) => {
    const newT: Transaction = { ...partialT, id: generateId() };
    setData(prev => ({ ...prev, transactions: [newT, ...prev.transactions] }));
  }, []);

  const editTransaction = useCallback((id: string, updatedT: Omit<Transaction, 'id'>) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...updatedT, id } : t)
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
  }, []);

  const addSubscription = useCallback((sub: Omit<Subscription, 'id'>) => {
    setData(prev => ({ ...prev, subscriptions: [...prev.subscriptions, { ...sub, id: generateId() }] }));
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    setData(prev => ({ ...prev, goals: [...prev.goals, { ...goal, id: generateId() }] }));
  }, []);

  const updateGoal = useCallback((id: string, amount: number) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, currentValue: amount } : g)
    }));
  }, []);
  
  const addFundsToGoal = useCallback((id: string, amountToAdd: number) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, currentValue: g.currentValue + amountToAdd } : g)
    }));
  }, []);

  const updateAccountSettings = useCallback((settings: AccountSettings) => {
    setData(prev => {
      // Defensive check
      const currentSettings = Array.isArray(prev.accountSettings) ? prev.accountSettings : [];
      const existingIdx = currentSettings.findIndex(a => a.accountId === settings.accountId);
      
      let newSettings = [...currentSettings];
      if (existingIdx >= 0) {
        newSettings[existingIdx] = settings;
      } else {
        newSettings.push(settings);
      }
      return { ...prev, accountSettings: newSettings };
    });
  }, []);

  const setBudget = useCallback((budget: Omit<Budget, 'id'>) => {
    setData(prev => {
      // Check if exists
      const currentBudgets = Array.isArray(prev.budgets) ? prev.budgets : [];
      const existing = currentBudgets.find(b => b.category === budget.category);
      let newBudgets = [...currentBudgets];
      if (existing) {
        newBudgets = newBudgets.map(b => b.category === budget.category ? { ...b, limit: budget.limit } : b);
      } else {
        newBudgets.push({ ...budget, id: generateId() });
      }
      return { ...prev, budgets: newBudgets };
    });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setData(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }));
  }, []);

  const importCSV = useCallback((csvContent: string, defaultAccount: string = 'Inter') => {
    try {
      const lines = csvContent.split('\n');
      const newTransactions: Transaction[] = [];
      
      lines.forEach(line => {
        if (!line.trim()) return;
        
        const parts = line.split(/[;,]/); // Split by comma or semicolon
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
        setData(prev => ({ ...prev, transactions: [...newTransactions, ...prev.transactions] }));
        alert(`${newTransactions.length} transações importadas com sucesso!`);
      } else {
        alert("Não foi possível ler as transações. Verifique o formato do CSV.");
      }

    } catch (e) {
      console.error(e);
      alert("Erro ao importar CSV.");
    }
  }, []);

  const importData = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') throw new Error("Formato inválido");
      setData(prev => ({...INITIAL_DATA, ...parsed})); 
      return true;
    } catch (e) {
      console.error("Erro ao importar:", e);
      return false;
    }
  };

  const exportData = () => JSON.stringify(data, null, 2);

  const togglePrivacy = () => setPrivacyMode(prev => !prev);

  return {
    data,
    completeOnboarding,
    addTransaction,
    editTransaction,
    deleteTransaction,
    addSubscription,
    addGoal,
    updateGoal,
    addFundsToGoal,
    updateAccountSettings,
    setBudget,
    deleteBudget,
    importCSV,
    importData,
    exportData,
    privacyMode,
    togglePrivacy
  };
};