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
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar do LocalStorage ao iniciar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const merged = { ...INITIAL_DATA, ...parsed };
        
        // Garantir integridade dos arrays
        if (!Array.isArray(merged.accountSettings)) merged.accountSettings = [];
        if (!Array.isArray(merged.budgets)) merged.budgets = [];
        if (!merged.userProfile) merged.userProfile = { name: '', hasCompletedOnboarding: false };

        setData(merged);
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Salvar no LocalStorage sempre que houver mudança
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoaded]);

  // Actions
  const completeOnboarding = (name: string, settings: AccountSettings[]) => {
    setData(prev => ({
      ...prev,
      userProfile: { name, hasCompletedOnboarding: true },
      accountSettings: settings
    }));
  };

  const addTransaction = useCallback((partialT: Omit<Transaction, 'id'>) => {
    const newT: Transaction = {
      ...partialT,
      id: generateId(),
      isInstallment: partialT.isInstallment || false,
      isShared: partialT.isShared || false,
      tags: partialT.tags || []
    };
    setData(prev => ({ ...prev, transactions: [newT, ...prev.transactions] }));
  }, []);

  const editTransaction = useCallback((id: string, updatedT: Omit<Transaction, 'id'>) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...updatedT, id } : t)
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  }, []);

  // Outras funções de store (simplificadas para o contexto local)
  const addGoal = (g: Omit<Goal, 'id'>) => setData(prev => ({ ...prev, goals: [...prev.goals, { ...g, id: generateId() }] }));
  const updateGoal = (id: string, g: Partial<Goal>) => setData(prev => ({ ...prev, goals: prev.goals.map(item => item.id === id ? { ...item, ...g } : item) }));
  const addFundsToGoal = (id: string, amount: number) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, currentValue: g.currentValue + amount } : g)
    }));
  };
  const setBudget = (b: Omit<Budget, 'id'>) => {
    setData(prev => {
      const exists = prev.budgets.find(item => item.category === b.category);
      if (exists) return { ...prev, budgets: prev.budgets.map(item => item.category === b.category ? { ...item, limit: b.limit } : item) };
      return { ...prev, budgets: [...prev.budgets, { ...b, id: generateId() }] };
    });
  };
  const deleteBudget = (id: string) => setData(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }));
  const updateAccountSettings = (s: AccountSettings) => {
    setData(prev => {
      const existing = prev.accountSettings.find(a => a.accountId === s.accountId);
      let newSettings;
      if (existing) {
        newSettings = prev.accountSettings.map(a => a.accountId === s.accountId ? s : a);
      } else {
        newSettings = [...prev.accountSettings, s];
      }
      return { ...prev, accountSettings: newSettings };
    });
  };

  const importData = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      setData(prev => ({ ...INITIAL_DATA, ...parsed }));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const exportData = () => {
    return JSON.stringify(data, null, 2);
  };

  const togglePrivacy = () => setPrivacyMode(prev => !prev);

  return {
    data,
    privacyMode,
    togglePrivacy,
    completeOnboarding,
    addTransaction,
    editTransaction,
    deleteTransaction,
    addGoal,
    updateGoal,
    addFundsToGoal,
    setBudget,
    deleteBudget,
    updateAccountSettings,
    importData,
    exportData
  };
};