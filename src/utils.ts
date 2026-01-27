import { Transaction, AccountSettings } from './types';

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
  'sorvete': 'Alimentação', 'doce': 'Alimentação', 'bolo': 'Alimentação', 'chocolate': 'Alimentação',
  'esfiha': 'Alimentação', 'pastel': 'Alimentação', 'churrasco': 'Alimentação', 'bar': 'Alimentação',
  'boteco': 'Alimentação', 'cerveja': 'Alimentação', 'bebida': 'Alimentação', 'rest': 'Alimentação',

  // Mercado
  'mercado': 'Mercado', 'supermercado': 'Mercado', 'compra do mês': 'Mercado', 
  'carrefour': 'Mercado', 'extra': 'Mercado', 'savegnago': 'Mercado', 'atacado': 'Mercado',
  'assai': 'Mercado', 'tenda': 'Mercado', 'dia': 'Mercado', 'pão de açúcar': 'Mercado',
  'shibata': 'Mercado', 'nagumo': 'Mercado', 'atacadão': 'Mercado', 'varejão': 'Mercado',
  'hortifruti': 'Mercado', 'feira': 'Mercado', 'sacolão': 'Mercado',

  // Mercadinho (Específico)
  'mercadinho': 'Mercadinho', 'mercearia': 'Mercadinho', 'quitanda': 'Mercadinho', 'adega': 'Mercadinho',
  'conveniencia': 'Mercadinho', 'conveniência': 'Mercadinho',

  // Transporte
  'uber': 'Transporte', '99': 'Transporte', 'taxi': 'Transporte', 'ônibus': 'Transporte',
  'metro': 'Transporte', 'metrô': 'Transporte', 'combustível': 'Transporte', 'gasolina': 'Transporte',
  'etanol': 'Transporte', 'posto': 'Transporte', 'estacionamento': 'Transporte', 'ipva': 'Transporte',
  'pedagio': 'Transporte', 'pedágio': 'Transporte', 'oficina': 'Transporte', 'mecânico': 'Transporte',
  'pneu': 'Transporte', 'revisão': 'Transporte', 'alinhamento': 'Transporte', 'multa': 'Transporte',
  'sem parar': 'Transporte', 'veloe': 'Transporte', 'tag': 'Transporte', 'moto': 'Transporte',

  // Saúde
  'farmacia': 'Saúde', 'farmácia': 'Saúde', 'remedio': 'Saúde', 'remédio': 'Saúde',
  'médico': 'Saúde', 'medico': 'Saúde', 'dentista': 'Saúde', 'exame': 'Saúde', 
  'consulta': 'Saúde', 'plano': 'Saúde', 'hospital': 'Saúde', 'drogaria': 'Saúde',
  'psicologo': 'Saúde', 'terapia': 'Saúde', 'laboratório': 'Saúde', 'vacina': 'Saúde',
  'lente': 'Saúde', 'oculos': 'Saúde', 'estética': 'Saúde', 'cabelo': 'Saúde', 
  'barbeiro': 'Saúde', 'unha': 'Saúde', 'manicure': 'Saúde', 'gympass': 'Saúde',
  'academia': 'Saúde', 'crossfit': 'Saúde', 'suplemento': 'Saúde', 'creatina': 'Saúde',

  // Lazer
  'cinema': 'Lazer', 'filme': 'Lazer', 'jogo': 'Lazer', 'steam': 'Lazer', 
  'psn': 'Lazer', 'xbox': 'Lazer', 'role': 'Lazer', 'rolê': 'Lazer', 
  'ingresso': 'Lazer', 'show': 'Lazer', 'viagem': 'Lazer', 'hotel': 'Lazer',
  'airbnb': 'Lazer', 'passagem': 'Lazer', 'clube': 'Lazer', 'praia': 'Lazer',

  // Assinaturas (Movido de Lazer/Outros)
  'spotify': 'Assinaturas', 'netflix': 'Assinaturas', 'youtube': 'Assinaturas',
  'amazon prime': 'Assinaturas', 'disney': 'Assinaturas', 'hbo': 'Assinaturas',
  'globoplay': 'Assinaturas', 'star+': 'Assinaturas', 'paramount': 'Assinaturas',
  'apple': 'Assinaturas', 'icloud': 'Assinaturas', 'google storage': 'Assinaturas',
  'drive': 'Assinaturas', 'chatgpt': 'Assinaturas', 'midjourney': 'Assinaturas',
  'claude': 'Assinaturas', 'assinatura': 'Assinaturas', 'mensalidade': 'Assinaturas',

  // Compras
  'amazon': 'Compras', 'shopee': 'Compras', 'livre': 'Compras', 'shein': 'Compras',
  'roupa': 'Compras', 'tenis': 'Compras', 'eletronico': 'Compras', 'celular': 'Compras',
  'aliexpress': 'Compras', 'magalu': 'Compras', 'casas bahia': 'Compras', 'fast shop': 'Compras',
  'shopping': 'Compras', 'loja': 'Compras', 'presente': 'Compras', 'sapato': 'Compras',

  // Moradia
  'aluguel': 'Moradia', 'condominio': 'Moradia', 'luz': 'Moradia', 'agua': 'Moradia',
  'internet': 'Moradia', 'iptu': 'Moradia', 'gas': 'Moradia', 'gás': 'Moradia',
  'sabesp': 'Moradia', 'enel': 'Moradia', 'cpfl': 'Moradia', 'claro': 'Moradia',
  'vivo': 'Moradia', 'tim': 'Moradia', 'oi': 'Moradia', 'net': 'Moradia',
  'manutenção': 'Moradia', 'obra': 'Moradia', 'pedreiro': 'Moradia', 'faxina': 'Moradia',
  'diarista': 'Moradia', 'móvel': 'Moradia', 'eletrodoméstico': 'Moradia',

  // Educação
  'curso': 'Educação', 'faculdade': 'Educação', 'livro': 'Educação', 'escola': 'Educação',
  'udemy': 'Educação', 'alura': 'Educação', 'papelaria': 'Educação', 'material': 'Educação',
  'idioma': 'Educação', 'inglês': 'Educação',

  // Investimento
  'aporte': 'Investimento', 'investimento': 'Investimento', 'cdb': 'Investimento', 
  'fiis': 'Investimento', 'ações': 'Investimento', 'cripto': 'Investimento', 'bitcoin': 'Investimento',
  'tesouro': 'Investimento', 'selic': 'Investimento', 'corretora': 'Investimento', 'b3': 'Investimento',
  'poupanca': 'Investimento', 'poupança': 'Investimento'
};

export const inferCategory = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  
  // 1. Direct Keyword Match
  for (const [key, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    // Check if the title contains the keyword as a whole word or significant part
    if (lowerTitle.includes(key)) {
      return cat;
    }
  }
  
  // 2. Fallback: Check if title contains category name directly
  const foundCat = CATEGORIES.find(c => lowerTitle.includes(c.toLowerCase()));
  if (foundCat) return foundCat;
  
  return 'Outros';
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

// Credit Card Logic: Calculates the actual cash flow date based on Closing/Due Day
export const getEstimatedPaymentDate = (transactionDate: string, settings?: AccountSettings): Date => {
  const tDate = new Date(transactionDate);
  
  if (!settings) return tDate; // No settings = debit logic (immediate)

  const closingDate = new Date(tDate.getFullYear(), tDate.getMonth(), settings.closingDay);
  
  // If transaction is AFTER closing day, it goes to next month's bill
  if (tDate.getDate() > settings.closingDay) {
    // Due date is in the NEXT month
    // Note: This is simplified. Real logic handles year rollover.
    const dueDate = new Date(tDate.getFullYear(), tDate.getMonth() + 1, settings.dueDay);
    return dueDate;
  } else {
    // Due date is THIS month (or next, depending on if Due Day < Closing Day which is rare but possible)
    // Standard logic: bought before closing -> pay on this month's due date
    let dueDate = new Date(tDate.getFullYear(), tDate.getMonth(), settings.dueDay);
    
    // Safety: If Due Day is smaller than Closing day (e.g. Closing 5, Due 1), it usually means Due is next month actually
    // But usually Closing ~25th, Due ~5th (next month).
    // Let's assume standard: Closing Day X, Due Day Y (Y usually > X or Y is early next month)
    
    // Better Logic:
    // If we are BEFORE closing, we pay on the UPCOMING due day.
    // If today is 15th, closing is 20th, due is 27th -> pay 27th.
    // If today is 15th, closing is 20th, due is 5th (next month) -> pay 5th next month.
    
    if (settings.dueDay < settings.closingDay) {
       dueDate = new Date(tDate.getFullYear(), tDate.getMonth() + 1, settings.dueDay);
    }
    
    return dueDate;
  }
};