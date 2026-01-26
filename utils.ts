import { Transaction } from './types';

export const ACCOUNTS = ['Inter', 'Nubank', 'Caixa', 'MercadoPago', 'Bradesco', 'Itaú', 'Santander', 'Carteira', 'Outro'];

export const CATEGORIES = [
  'Alimentação', 'Mercado', 'Mercadinho', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 
  'Educação', 'Assinaturas', 'Compras', 'Bico', 'Salário', 'Investimento', 'Outros'
];

// Keywords mapping for smarter inference
export const CATEGORY_KEYWORDS: Record<string, string> = {
  // Alimentação
  'burger': 'Alimentação', 'burguer': 'Alimentação', 'pizza': 'Alimentação', 'lanche': 'Alimentação',
  'restaurante': 'Alimentação', 'ifood': 'Alimentação', 'sushi': 'Alimentação', 'açaí': 'Alimentação',
  'padaria': 'Alimentação', 'cafe': 'Alimentação', 'café': 'Alimentação', 'almoço': 'Alimentação',
  'jantar': 'Alimentação', 'fome': 'Alimentação', 'mcdonalds': 'Alimentação', 'bk': 'Alimentação',
  
  // Mercado
  'mercado': 'Mercado', 'supermercado': 'Mercado', 'compra do mês': 'Mercado', 
  'carrefour': 'Mercado', 'extra': 'Mercado', 'savegnago': 'Mercado', 'atacado': 'Mercado',
  'assai': 'Mercado', 'tenda': 'Mercado',
  
  // Mercadinho (Específico)
  'mercadinho': 'Mercadinho', 'mercearia': 'Mercadinho', 'quitanda': 'Mercadinho',

  // Transporte
  'uber': 'Transporte', '99': 'Transporte', 'taxi': 'Transporte', 'ônibus': 'Transporte',
  'metro': 'Transporte', 'metrô': 'Transporte', 'combustível': 'Transporte', 'gasolina': 'Transporte',
  'etanol': 'Transporte', 'posto': 'Transporte', 'estacionamento': 'Transporte', 'ipva': 'Transporte',
  'pedagio': 'Transporte', 'pedágio': 'Transporte',

  // Saúde
  'farmacia': 'Saúde', 'farmácia': 'Saúde', 'remedio': 'Saúde', 'remédio': 'Saúde',
  'médico': 'Saúde', 'medico': 'Saúde', 'dentista': 'Saúde', 'exame': 'Saúde', 
  'consulta': 'Saúde', 'plano': 'Saúde', 'hospital': 'Saúde',

  // Lazer
  'cinema': 'Lazer', 'filme': 'Lazer', 'jogo': 'Lazer', 'steam': 'Lazer', 
  'psn': 'Lazer', 'xbox': 'Lazer', 'bar': 'Lazer', 'cerveja': 'Lazer', 
  'role': 'Lazer', 'rolê': 'Lazer', 'ingresso': 'Lazer', 'show': 'Lazer',
  'spotify': 'Lazer', 'netflix': 'Lazer', 'aliexpress': 'Compras',

  // Compras
  'amazon': 'Compras', 'shopee': 'Compras', 'livre': 'Compras', 'shein': 'Compras',
  'roupa': 'Compras', 'tenis': 'Compras', 'eletronico': 'Compras', 'celular': 'Compras',

  // Moradia
  'aluguel': 'Moradia', 'condominio': 'Moradia', 'luz': 'Moradia', 'agua': 'Moradia',
  'internet': 'Moradia', 'iptu': 'Moradia', 'gas': 'Moradia', 'gás': 'Moradia',

  // Educação
  'curso': 'Educação', 'faculdade': 'Educação', 'livro': 'Educação', 'escola': 'Educação',
  'udemy': 'Educação', 'alura': 'Educação',

  // Investimento
  'aporte': 'Investimento', 'investimento': 'Investimento', 'cdb': 'Investimento', 
  'fiis': 'Investimento', 'ações': 'Investimento', 'cripto': 'Investimento', 'bitcoin': 'Investimento'
};

export const ACCOUNT_COLORS: Record<string, string> = {
  'Inter': 'text-orange-500 border-orange-500/20 bg-orange-500/10',
  'Nubank': 'text-purple-500 border-purple-500/20 bg-purple-500/10',
  'Caixa': 'text-blue-500 border-blue-500/20 bg-blue-500/10',
  'MercadoPago': 'text-blue-400 border-blue-400/20 bg-blue-400/10', 
  'Bradesco': 'text-red-500 border-red-500/20 bg-red-500/10',
  'Itaú': 'text-orange-600 border-orange-600/20 bg-orange-600/10',
  'Santander': 'text-red-600 border-red-600/20 bg-red-600/10',
  'Carteira': 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
  'Outro': 'text-zinc-400 border-zinc-500/20 bg-zinc-500/10'
};

export const getAccountColor = (account: string) => {
  return ACCOUNT_COLORS[account] || ACCOUNT_COLORS['Outro'];
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': 'text-rose-400',
  'Mercado': 'text-orange-400',
  'Mercadinho': 'text-orange-300',
  'Transporte': 'text-amber-400',
  'Moradia': 'text-blue-400',
  'Lazer': 'text-pink-400',
  'Saúde': 'text-emerald-400',
  'Educação': 'text-indigo-400',
  'Assinaturas': 'text-purple-400',
  'Compras': 'text-cyan-400',
  'Bico': 'text-lime-400',
  'Salário': 'text-green-400',
  'Investimento': 'text-yellow-400',
  'Outros': 'text-zinc-400'
};

export const getCategoryColor = (cat: string) => {
  return CATEGORY_COLORS[cat] || 'text-zinc-400';
};

export const formatCurrency = (value: number, privacyMode: boolean = false) => {
  if (privacyMode) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatCurrencyInput = (value: string) => {
  const onlyDigits = value.replace(/\D/g, "");
  const amount = Number(onlyDigits) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const parseCurrencyToNumber = (value: string) => {
   const onlyDigits = value.replace(/\D/g, "");
   return Number(onlyDigits) / 100;
}

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const getMonthName = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR', { month: 'long' });
};

export const getEffectiveAmount = (t: Transaction) => {
  if (t.isShared && t.myShareValue !== undefined) {
    return t.myShareValue;
  }
  return t.amount;
};

// Returns the installment value (e.g., 500 / 10 = 50)
export const getInstallmentValue = (t: Transaction) => {
  const total = getEffectiveAmount(t);
  if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal === 0) return total;
  return total / t.installmentsTotal;
};

// Check if a transaction has a payment/installment falling in the target month/year
// Returns the installment index (1-based) if active, or null if not.
export const getActiveInstallmentIndex = (t: Transaction, targetDate: Date): number | null => {
  const tDate = new Date(t.date);
  
  // Normalize to 1st of month to ignore time/day differences
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  
  const startYear = tDate.getFullYear();
  const startMonth = tDate.getMonth();

  const monthDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);

  // If not installment, it only exists in month 0
  if (!t.isInstallment) {
    return monthDiff === 0 ? 0 : null;
  }

  // For installments
  if (t.installmentsTotal && monthDiff >= 0 && monthDiff < t.installmentsTotal) {
    return monthDiff + 1; // 1-based index (Parcela 1, 2...)
  }

  return null;
};