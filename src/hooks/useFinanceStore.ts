import { useState, useEffect, useCallback } from 'react';
import { AppData, Transaction, Subscription, Goal, AccountSettings, Budget } from '../types';
import { generateId, inferCategory } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  setDoc,
  getDoc
} from 'firebase/firestore';

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
  const { userProfile, currentUser } = useAuth();

  // --- REAL-TIME SYNC ---
  useEffect(() => {
    if (!currentUser || !userProfile?.familyId) return;

    const familyId = userProfile.familyId;
    const familyRef = doc(db, 'families', familyId);

    // 1. Listen to Family Settings (Account Configs)
    const unsubFamily = onSnapshot(familyRef, (docSnap) => {
      if (docSnap.exists()) {
        const familyData = docSnap.data();
        setData(prev => ({
          ...prev,
          accountSettings: familyData.accountSettings || [],
          // Update local profile name mostly for greeting
          userProfile: { ...prev.userProfile, name: userProfile.name, hasCompletedOnboarding: (familyData.accountSettings?.length > 0) }
        }));
      }
    });

    // 2. Listen to Transactions
    const txQuery = query(collection(db, 'families', familyId, 'transactions'), orderBy('date', 'desc'));
    const unsubTx = onSnapshot(txQuery, (snapshot) => {
      const transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      setData(prev => ({ ...prev, transactions }));
    });

    // 3. Listen to Goals
    const unsubGoals = onSnapshot(collection(db, 'families', familyId, 'goals'), (snapshot) => {
      const goals = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
      setData(prev => ({ ...prev, goals }));
    });

    // 4. Listen to Subscriptions
    const unsubSubs = onSnapshot(collection(db, 'families', familyId, 'subscriptions'), (snapshot) => {
      const subscriptions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Subscription));
      setData(prev => ({ ...prev, subscriptions }));
    });

    // 5. Listen to Budgets
    const unsubBudgets = onSnapshot(collection(db, 'families', familyId, 'budgets'), (snapshot) => {
      const budgets = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Budget));
      setData(prev => ({ ...prev, budgets }));
    });

    return () => {
      unsubFamily();
      unsubTx();
      unsubGoals();
      unsubSubs();
      unsubBudgets();
    };
  }, [currentUser, userProfile]);

  // --- ACTIONS (Firestore Writes) ---

  const completeOnboarding = useCallback(async (name: string, settings: AccountSettings[]) => {
    if (!userProfile?.familyId) return;
    // We update the User Profile Name AND the Family Account Settings
    const familyRef = doc(db, 'families', userProfile.familyId);
    
    // Parallel update
    await Promise.all([
      updateDoc(familyRef, { accountSettings: settings }),
      // Update local state logic handled by snapshot, but we can force name update on user profile if needed
    ]);
  }, [userProfile]);

  const addTransaction = useCallback(async (partialT: Omit<Transaction, 'id'>) => {
    if (!userProfile?.familyId) return;
    await addDoc(collection(db, 'families', userProfile.familyId, 'transactions'), partialT);
  }, [userProfile]);

  const editTransaction = useCallback(async (id: string, updatedT: Omit<Transaction, 'id'>) => {
    if (!userProfile?.familyId) return;
    const txRef = doc(db, 'families', userProfile.familyId, 'transactions', id);
    await updateDoc(txRef, updatedT);
  }, [userProfile]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!userProfile?.familyId) return;
    await deleteDoc(doc(db, 'families', userProfile.familyId, 'transactions', id));
  }, [userProfile]);

  const addSubscription = useCallback(async (sub: Omit<Subscription, 'id'>) => {
    if (!userProfile?.familyId) return;
    await addDoc(collection(db, 'families', userProfile.familyId, 'subscriptions'), sub);
  }, [userProfile]);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    if (!userProfile?.familyId) return;
    await addDoc(collection(db, 'families', userProfile.familyId, 'goals'), goal);
  }, [userProfile]);

  const updateGoal = useCallback(async (id: string, amount: number) => {
    if (!userProfile?.familyId) return;
    await updateDoc(doc(db, 'families', userProfile.familyId, 'goals', id), { currentValue: amount });
  }, [userProfile]);
  
  const addFundsToGoal = useCallback(async (id: string, amountToAdd: number) => {
    if (!userProfile?.familyId) return;
    const goalRef = doc(db, 'families', userProfile.familyId, 'goals', id);
    const goalSnap = await getDoc(goalRef);
    if(goalSnap.exists()) {
        const current = goalSnap.data().currentValue || 0;
        await updateDoc(goalRef, { currentValue: current + amountToAdd });
    }
  }, [userProfile]);

  const updateAccountSettings = useCallback(async (settings: AccountSettings) => {
    if (!userProfile?.familyId) return;
    const familyRef = doc(db, 'families', userProfile.familyId);
    
    // We need to read current settings to merge, but since we have 'data.accountSettings' from sync:
    const currentSettings = data.accountSettings || [];
    const existingIdx = currentSettings.findIndex(a => a.accountId === settings.accountId);
      
    let newSettings = [...currentSettings];
    if (existingIdx >= 0) {
      newSettings[existingIdx] = settings;
    } else {
      newSettings.push(settings);
    }

    await updateDoc(familyRef, { accountSettings: newSettings });
  }, [userProfile, data.accountSettings]);

  const setBudget = useCallback(async (budget: Omit<Budget, 'id'>) => {
    if (!userProfile?.familyId) return;
    
    // Budgets are a subcollection, so we query to find if exists, or add
    // Since we don't have the ID passed in 'budget' obj here (it's omit ID), 
    // we iterate existing local data to find ID.
    const existing = data.budgets.find(b => b.category === budget.category);
    
    if (existing) {
       await updateDoc(doc(db, 'families', userProfile.familyId, 'budgets', existing.id), { limit: budget.limit });
    } else {
       await addDoc(collection(db, 'families', userProfile.familyId, 'budgets'), budget);
    }
  }, [userProfile, data.budgets]);

  const deleteBudget = useCallback(async (id: string) => {
    if (!userProfile?.familyId) return;
    await deleteDoc(doc(db, 'families', userProfile.familyId, 'budgets', id));
  }, [userProfile]);

  // Import Logic - Batch write
  const importCSV = useCallback(async (csvContent: string, defaultAccount: string = 'Inter') => {
    if (!userProfile?.familyId) return;
    
    // ... Parsing logic same as before ...
    const lines = csvContent.split('\n');
    const newTransactions: Omit<Transaction, 'id'>[] = [];
      
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
      // Create batch or simple loop (Firestore batch limit 500)
      // For simplicity in this demo, promise.all
      const promises = newTransactions.map(t => addDoc(collection(db, 'families', userProfile.familyId, 'transactions'), t));
      await Promise.all(promises);
      alert(`${newTransactions.length} transações importadas!`);
    }
  }, [userProfile]);

  // Import JSON Data - Full Restore (Careful with ID conflicts, usually wipe and replace or merge)
  // For SaaS, "Restore Backup" is tricky. Let's make it add only for now.
  const importData = async (jsonStr: string) => {
     // Implementation simplified for SaaS context: We won't allow full JSON state replacement
     // because it would overwrite other family members' work or break IDs.
     // Feature disabled or restricted to specific logic in future.
     console.log("Full backup restore disabled in Family Mode to prevent data loss.");
     return false;
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