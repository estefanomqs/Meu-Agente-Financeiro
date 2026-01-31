import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Tag, Sparkles, DollarSign, Plus, Users, TrendingUp, ChevronDown, Layers, CreditCard, Wallet, Calendar } from 'lucide-react';
import { Transaction } from '../types';
import { CATEGORIES, inferCategory } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { logSmartBarEvent } from '../services/firebase';
import { useFinanceStore } from '../hooks/useFinanceStore';

interface SmartBarProps {
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onOpenManual: () => void;
  history: Transaction[];
  autoFocus?: boolean;
}

// --- CONFIGURAÇÃO ---
const COMMON_TERMS: Record<string, string> = {
  // Transporte
  'uber': 'Transporte', '99': 'Transporte', 'indrive': 'Transporte', 'táxi': 'Transporte',
  'ônibus': 'Transporte', 'busão': 'Transporte', 'metro': 'Transporte', 'gasolina': 'Transporte',
  'posto': 'Transporte', 'estacionamento': 'Transporte', 'sem parar': 'Transporte', 'veloe': 'Transporte',
  // Alimentação
  'ifood': 'Alimentação', 'rappi': 'Alimentação', 'ze delivery': 'Alimentação', 'churrasco': 'Alimentação',
  'restaurante': 'Alimentação', 'padaria': 'Alimentação', 'café': 'Alimentação', 'lanche': 'Alimentação',
  'burguer': 'Alimentação', 'pizza': 'Alimentação', 'feijoada': 'Alimentação', 'almoço': 'Alimentação',
  'jantar': 'Alimentação', 'mercado': 'Mercado', 'assai': 'Mercado', 'carrefour': 'Mercado',
  'pão de açúcar': 'Mercado', 'atacdao': 'Mercado', 'feira': 'Mercado', 'sacolão': 'Mercado',
  // Assinaturas / Serviços
  'netflix': 'Assinaturas', 'spotify': 'Assinaturas', 'amazon': 'Assinaturas', 'disney': 'Assinaturas',
  'hbo': 'Assinaturas', 'internet': 'Contas Fixas', 'claro': 'Contas Fixas', 'vivo': 'Contas Fixas',
  'luz': 'Contas Fixas', 'energia': 'Contas Fixas', 'água': 'Contas Fixas', 'aluguel': 'Contas Fixas',
  // Saúde
  'farmácia': 'Saúde', 'médico': 'Saúde', 'dentista': 'Saúde', 'exame': 'Saúde', 'remédio': 'Saúde', 'academia': 'Saúde',
  // Lazer
  'cinema': 'Lazer', 'ingresso': 'Lazer', 'show': 'Lazer', 'jogo': 'Lazer', 'steam': 'Lazer', 'bar': 'Lazer', 'cerveja': 'Lazer'
};

const STOPWORDS = new Set(['no', 'na', 'do', 'da', 'de', 'em', 'com', 'por', 'via', 'pra', 'para', 'o', 'a', 'os', 'as', 'um', 'uma']);

const DEFAULT_ACCOUNTS = ['Inter', 'Nubank', 'Caixa', 'Itaú', 'Bradesco', 'Santander', 'Carteira'];

export const SmartBar: React.FC<SmartBarProps> = ({ onAdd, onOpenManual, history, autoFocus = false }) => {
  const { currentUser: user } = useAuth();
  const { data } = useFinanceStore();

  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<Partial<Transaction> | null>(null);

  const [step, setStep] = useState<'input' | 'method' | 'account'>('input');

  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!input.trim()) {
      setPreview(null);
      setStep('input');
    }
  }, [input]);

  // --- 1. MOTOR NLP (The Core) ---
  const parseInput = (text: string) => {
    if (!text.trim()) return;

    let cleanText = text;
    let detectedType: 'income' | 'expense' = 'expense';
    let amount: number | undefined = undefined;
    let date = new Date(); // Será sobrescrito se acharmos data
    let isInstallment = false;
    let installmentsTotal = 2;

    // A. Detectar Tipo (Entrada/Saída)
    if (/\b(recebi|ganhei|entrada|salário|pago por|pix recebido)\b/i.test(cleanText)) {
      detectedType = 'income';
      cleanText = cleanText.replace(/\b(recebi|ganhei|entrada|salário|pago por|pix recebido)\b/gi, '');
    }

    // --- DATE DETECTION ---
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Base para hoje meio-dia
    date = new Date(today); // Default: Hoje

    // Helper: De Volta para o Passado (Se futuro -> Ano anterior)
    const adjustDateIfFuture = (d: Date): Date => {
      const threshold = new Date(today);
      threshold.setDate(threshold.getDate() + 1); // Margem de segurança de 1 dia

      if (d > threshold) {
        d.setFullYear(d.getFullYear() - 1);
      }
      return d;
    };

    // 1. Ontem
    if (/\bontem\b/i.test(cleanText)) {
      date.setDate(date.getDate() - 1);
      cleanText = cleanText.replace(/\bontem\b/i, '');
    }
    else {
      let parsedDate: Date | null = null;

      // 2. Numérica (28/01, 28/01/2025)
      const numMatch = cleanText.match(/(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
      if (numMatch) {
        const d = parseInt(numMatch[1]);
        const m = parseInt(numMatch[2]) - 1;
        const y = numMatch[3] ? parseInt(numMatch[3]) : today.getFullYear();

        parsedDate = new Date(y, m, d, 12, 0, 0);

        if (!numMatch[3]) {
          parsedDate = adjustDateIfFuture(parsedDate);
        }
        cleanText = cleanText.replace(numMatch[0], '');
      }
      else {
        // 3. Extenso (28 de janeiro, 28 jan)
        const monthMap: Record<string, number> = {
          'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
          'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
        };
        const extMatch = cleanText.match(/(?:dia\s+)?(\d{1,2})\s+(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*/i);

        if (extMatch) {
          const d = parseInt(extMatch[1]);
          const mStr = extMatch[2].toLowerCase();
          const m = monthMap[mStr];

          parsedDate = new Date(today.getFullYear(), m, d, 12, 0, 0);
          parsedDate = adjustDateIfFuture(parsedDate);

          cleanText = cleanText.replace(extMatch[0], '');
        }
        else {
          // 4. Simples (Dia 15)
          const simpleMatch = cleanText.match(/\bdia\s+(\d{1,2})\b/i);
          if (simpleMatch) {
            const d = parseInt(simpleMatch[1]);
            parsedDate = new Date(today.getFullYear(), today.getMonth(), d, 12, 0, 0);
            parsedDate = adjustDateIfFuture(parsedDate);

            cleanText = cleanText.replace(simpleMatch[0], '');
          }
        }
      }

      if (parsedDate) date = parsedDate;
    }


    // B. NOVA REGRA: Detectar Multiplicação ("12x 500", "12 parcelas de 500")
    // Essa regra roda ANTES da detecção de valor simples para evitar que o "12" seja pego como valor.
    const multiplicationMatch = cleanText.match(/(\d+)\s*(?:x|vezes|parc[a-z]*)\s*(?:de)?\s*(?:R\$)?\s*(\d+[.,]?\d*)/i);

    if (multiplicationMatch) {
      // Ex: "12 parcelas de 500" -> match[1]="12", match[2]="500"
      const qtd = parseInt(multiplicationMatch[1]);
      const val = parseFloat(multiplicationMatch[2].replace(',', '.'));

      amount = qtd * val; // Total: 6000
      installmentsTotal = qtd;
      isInstallment = true;

      // Remove o trecho inteiro ("12 parcelas de 500") do texto para não confundir o resto
      cleanText = cleanText.replace(multiplicationMatch[0], '');
    }
    else {
      // C. Lógica Padrão (Se não for multiplicação explícita)

      // 1. Detectar Valor Único
      const amountMatch = cleanText.match(/(?:R\$)?\s*(\d+[.,]?\d*)/);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(',', '.'));
        cleanText = cleanText.replace(amountMatch[0], '');
      }

      // 2. Detectar Parcelamento Isolado (Ex: "Compra 1000 em 10x")
      const instMatch = cleanText.match(/(\d+)\s*(x|vezes|parc)/i);
      if (instMatch) {
        isInstallment = true;
        installmentsTotal = parseInt(instMatch[1]);
        cleanText = cleanText.replace(instMatch[0], '');
      }
    }

    // D. Limpeza e Tokenização
    const tokens = cleanText.toLowerCase().replace(/[!?,;]/g, '').split(/\s+/).filter(t => t && !STOPWORDS.has(t));

    // E. Reconstrói Descrição
    let description = tokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' ');
    if (!description) description = detectedType === 'income' ? 'Receita' : 'Nova Despesa';

    // F. Inferência de Categoria
    let category = 'Outros';
    const lowerDesc = description.toLowerCase();

    const historyMatch = history.find(t => t.origin.toLowerCase() === lowerDesc);
    if (historyMatch) category = historyMatch.category;
    else {
      const commonKey = Object.keys(COMMON_TERMS).find(k => lowerDesc.includes(k));
      if (commonKey) category = COMMON_TERMS[commonKey];
      else category = inferCategory(description);
    }

    if (amount === undefined) {
      setPreview(null);
      return;
    }

    const transactionPreview: Partial<Transaction> = {
      amount,
      origin: description,
      category,
      type: detectedType,
      date: date.toISOString(),
      isInstallment,
      installmentsTotal: isInstallment ? installmentsTotal : undefined,
      currentInstallment: isInstallment ? 1 : undefined,
      paymentMethod: isInstallment ? 'Crédito' : undefined,
      account: undefined
    };

    setPreview(transactionPreview);

    if (isInstallment) setStep('account');
    else setStep('method');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    parseInput(val);
  };

  const handleSelectMethod = (method: string) => {
    if (!preview) return;
    const newPreview = { ...preview, paymentMethod: method };
    setPreview(newPreview);
    setStep('account');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!preview) return;
    // Pega a data do input (YYYY-MM-DD) e ajusta para 12:00
    const [y, m, d] = e.target.value.split('-').map(Number);
    const newDate = new Date(y, m - 1, d, 12, 0, 0);

    setPreview({ ...preview, date: newDate.toISOString() });
  };

  const handleSelectAccount = (accountName: string) => {
    if (!preview || !preview.paymentMethod) return;

    // Se estivermos editando a data manualmente, respeitamos o preview.date
    // Caso contrário, usamos a lógica interna ou hoje
    const finalDateStr = preview.date || new Date().toISOString();

    const finalTransaction = {
      ...preview,
      account: accountName,
      date: finalDateStr
    };

    submitTransaction(finalTransaction);
  };

  const submitTransaction = (finalT: Partial<Transaction>) => {
    if (finalT.amount && finalT.origin && finalT.account && finalT.paymentMethod) {
      const newTransaction = {
        ...finalT,
        category: finalT.category || 'Outros',
        tags: finalT.tags || []
      } as Omit<Transaction, 'id'>;

      onAdd(newTransaction);

      if (user) {
        logSmartBarEvent(user.uid, input, preview, newTransaction).catch(console.error);
      }

      setInput('');
      setPreview(null);
      setStep('input');
      setShowCategorySelector(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'input' && preview) {
        setStep(preview.isInstallment ? 'account' : 'method');
      }
    }
  };

  const renderSelectionArea = () => {
    if (!preview) return null;

    if (step === 'method' && !preview.isInstallment) {
      return (
        <div className="mt-3 animate-in fade-in slide-in-from-top-2">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2 px-1">
            Como você pagou?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSelectMethod('Débito')}
              className="flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all active:scale-95"
            >
              <Wallet className="w-5 h-5" />
              <span className="font-bold">Débito / Pix</span>
            </button>
            <button
              onClick={() => handleSelectMethod('Crédito')}
              className="flex items-center justify-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-400 rounded-xl transition-all active:scale-95"
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-bold">Crédito</span>
            </button>
          </div>
        </div>
      );
    }

    if (step === 'account') {
      const isCredit = preview.paymentMethod === 'Crédito';
      let availableAccounts = DEFAULT_ACCOUNTS;

      if (isCredit) {
        const creditAccounts = data.accountSettings.map(s => s.accountId);
        if (creditAccounts.length > 0) {
          availableAccounts = creditAccounts;
        }
      }

      return (
        <div className="mt-3 animate-in fade-in slide-in-from-right-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
              {isCredit ? 'Qual Fatura?' : 'Qual Conta?'}
            </p>
            <button onClick={() => setStep('method')} className="text-[10px] text-zinc-400 hover:text-white underline">
              Voltar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto scrollbar-thin">
            {availableAccounts.map(acc => (
              <button
                key={acc}
                onClick={() => handleSelectAccount(acc)}
                className={`
                  p-2 rounded-lg text-sm font-medium border transition-all active:scale-95
                  ${isCredit
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-orange-500/50 hover:text-orange-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400'
                  }
                `}
              >
                {acc}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 relative z-50">
      <div
        className={`
          relative flex items-center w-full bg-surface border rounded-full shadow-2xl shadow-black/40 transition-all duration-300
          ${isFocused || input.length > 0 ? 'border-primary ring-4 ring-primary/10 scale-[1.01]' : 'border-zinc-800 hover:border-zinc-700'}
        `}
      >
        <div className={`pl-5 transition-colors duration-300 ${isFocused ? 'text-primary animate-pulse' : 'text-zinc-500'}`}>
          {preview ? (
            preview.type === 'income' ? <TrendingUp className="w-5 h-5 text-secondary" /> : <DollarSign className="w-5 h-5 text-danger" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent border-none text-white text-base md:text-lg placeholder-zinc-600 focus:ring-0 py-4 pl-3 pr-4 outline-none flex-1"
          placeholder="Digite '12 parcelas de 500 geladeira'..."
          value={input}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          autoFocus={autoFocus}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {preview && (
        <div className="absolute top-full left-4 right-4 mt-2 bg-surfaceHighlight border border-zinc-700 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 z-40 backdrop-blur-xl bg-opacity-95">
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                Lançamento detectado
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-xl tracking-tight ${preview.type === 'income' ? 'text-secondary' : 'text-danger'}`}>
                    {preview.type === 'income' ? '+' : '-'}{preview.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="font-medium text-white text-lg">{preview.origin}</span>
                </div>

                {/* DATE SELECTOR (NEW) */}
                <div className="relative flex items-center gap-2 group cursor-pointer w-fit">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500 group-hover:text-primary transition-colors" />
                  <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
                    {preview.date
                      ? new Date(preview.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                      : 'Hoje'
                    }
                  </span>
                  {/* Invisible Input Overlay */}
                  <input
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleDateChange}
                    // Value precisa estar em YYYY-MM-DD
                    value={preview.date ? new Date(preview.date).toISOString().split('T')[0] : ''}
                  />
                </div>
              </div>
            </div>

            <div className="relative self-start">
              <button
                onClick={() => setShowCategorySelector(!showCategorySelector)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
              >
                {preview.category} <ChevronDown className="w-3 h-3" />
              </button>
              {showCategorySelector && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-zinc-700 rounded-xl shadow-xl p-2 grid grid-cols-1 gap-1 max-h-48 overflow-y-auto z-[60]">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setPreview({ ...preview, category: cat });
                        setShowCategorySelector(false);
                      }}
                      className="text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {renderSelectionArea()}
        </div>
      )}
    </div>
  );
};