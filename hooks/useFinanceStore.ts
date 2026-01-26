import { useState, useEffect, useCallback } from 'react';
import { AppData, Transaction, Subscription, Goal } from '../types';
import { generateId } from '../utils';

const STORAGE_KEY = 'zenith_finance_data_v1';

const INITIAL_DATA: AppData = {
  transactions: [],
  subscriptions: [],
  goals: [],
};

export const useFinanceStore = () => {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse local data", e);
      }
    }
  }, []);

  // Save to local storage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

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

  const importData = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);

      // Validação de Segurança (Schema Check)
      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Formato inválido");
      }

      const hasTransactions = Array.isArray(parsed.transactions);
      const hasGoals = Array.isArray(parsed.goals);
      const hasSubscriptions = Array.isArray(parsed.subscriptions);

      if (!hasTransactions || !hasGoals || !hasSubscriptions) {
        throw new Error("Estrutura de dados incompatível");
      }

      // Se passou na validação, atualiza o estado
      setData(parsed);
      return true;
    } catch (e) {
      console.error("Erro ao importar:", e);
      alert("Arquivo de backup inválido ou corrompido. A importação foi cancelada para proteger seus dados.");
      return false;
    }
  };

  const exportData = () => JSON.stringify(data, null, 2);

  const togglePrivacy = () => setPrivacyMode(prev => !prev);

  return {
    data,
    addTransaction,
    editTransaction,
    deleteTransaction,
    addSubscription,
    addGoal,
    updateGoal,
    addFundsToGoal,
    importData,
    exportData,
    privacyMode,
    togglePrivacy
  };
};