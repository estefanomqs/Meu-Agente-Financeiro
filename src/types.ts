export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  origin: string; // Description/Payee
  category: string;
  account: string; // e.g., 'Inter', 'Nubank'
  paymentMethod: string; // e.g., 'Credit', 'Debit', 'Pix'
  date: string; // ISO Date
  type: TransactionType;
  tags: string[];
  notes?: string; // New field for comments
  
  // Installments
  isInstallment: boolean;
  installmentsTotal?: number;
  currentInstallment?: number;

  // Splits
  isShared: boolean;
  myShareValue?: number; // If shared, this is the amount that counts for me

  // Income specifics
  isFixedIncome?: boolean; // For separating Salary vs Side gigs
}

export interface Subscription {
  id: string;
  name: string;
  value: number;
  dueDay: number; // 1-31
}

export interface Goal {
  id: string;
  name: string;
  targetValue: number;
  currentValue: number;
  color?: string;
}

export interface AccountSettings {
  accountId: string; // Matches the account name (e.g., 'Nubank')
  closingDay: number;
  dueDay: number;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface UserProfile {
  name: string;
  hasCompletedOnboarding: boolean;
}

export interface AppData {
  userProfile: UserProfile;
  transactions: Transaction[];
  subscriptions: Subscription[];
  goals: Goal[];
  accountSettings: AccountSettings[];
  budgets: Budget[];
}

export type ViewState = 'dashboard' | 'transactions' | 'calendar' | 'goals' | 'settings' | 'budgets';