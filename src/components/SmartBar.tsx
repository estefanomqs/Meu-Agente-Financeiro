import React, { useState, useRef, useMemo } from 'react';
import { ArrowRight, Tag, Sparkles, DollarSign, Plus, Users, TrendingUp, ChevronDown, Layers } from 'lucide-react';
import { Transaction } from '../types';
import { CATEGORIES, inferCategory } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { logSmartBarEvent } from '../services/firebase';

interface SmartBarProps {
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onOpenManual: () => void;
  history: Transaction[];
  autoFocus?: boolean;
}

// --- 1. BASE DE CONHECIMENTO HÍBRIDA (Knowledge Base) ---
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
  'hbo': 'Assinaturas', 'globo': 'Assinaturas', 'youtube': 'Assinaturas', 'prime': 'Assinaturas',
  'chatgpt': 'Assinaturas', 'claude': 'Assinaturas', 'internet': 'Contas Fixas', 'claro': 'Contas Fixas',
  'vivo': 'Contas Fixas', 'tim': 'Contas Fixas', 'oi': 'Contas Fixas', 'luz': 'Contas Fixas',
  'energia': 'Contas Fixas', 'água': 'Contas Fixas', 'aluguel': 'Contas Fixas', 'condomínio': 'Contas Fixas',

  // Saúde
  'droga raia': 'Saúde', 'drogasil': 'Saúde', 'farmácia': 'Saúde', 'pacheco': 'Saúde',
  'médico': 'Saúde', 'dentista': 'Saúde', 'exame': 'Saúde', 'consulta': 'Saúde', 'psicólogo': 'Saúde',
  'remédio': 'Saúde', 'academia': 'Saúde', 'gympass': 'Saúde', 'smartfit': 'Saúde',

  // Lazer
  'cinema': 'Lazer', 'ingresso': 'Lazer', 'show': 'Lazer', 'teatro': 'Lazer', 'jogo': 'Lazer',
  'steam': 'Lazer', 'playstation': 'Lazer', 'xbox': 'Lazer', 'bar': 'Lazer', 'cerveja': 'Lazer'
};

const STOPWORDS = new Set(['no', 'na', 'do', 'da', 'de', 'em', 'com', 'por', 'via', 'pra', 'para', 'o', 'a', 'os', 'as', 'um', 'uma']);

// --- 3. DICIONÁRIO DE SINÔNIMOS (Fuzzy Matcher) ---
const SYNONYMS_METHOD: Record<string, string> = {
  'pix': 'Pix', 'pics': 'Pix', 'piks': 'Pix', 'transferencia': 'Pix', 'trauss': 'Pix',
  'credito': 'Crédito', 'crédito': 'Crédito', 'cred': 'Crédito', 'cartao': 'Crédito', 'parc': 'Crédito', 'fatura': 'Crédito',
  'debito': 'Débito', 'débito': 'Débito', 'deb': 'Débito',
  'dinheiro': 'Dinheiro', 'vivo': 'Dinheiro', 'specie': 'Dinheiro', 'cash': 'Dinheiro', 'papel': 'Dinheiro'
};

const SYNONYMS_ACCOUNT: Record<string, string> = {
  'nubank': 'Nubank', 'nu': 'Nubank', 'roxinho': 'Nubank',
  'inter': 'Inter', 'banco inter': 'Inter', 'laranjinha': 'Inter',
  'caixa': 'Caixa', 'cef': 'Caixa',
  'itaú': 'Itaú', 'itau': 'Itaú',
  'bradesco': 'Bradesco', 'bra': 'Bradesco',
  'santander': 'Santander', 'santa': 'Santander',
  'mp': 'MercadoPago', 'mercadopago': 'MercadoPago', 'mercado pago': 'MercadoPago',
  'carteira': 'Carteira', 'bolso': 'Carteira', 'mãos': 'Carteira'
};

const INSTALLMENT_KEYWORDS = ['x', 'vezes', 'parcelas', 'parc'];

export const SmartBar: React.FC<SmartBarProps> = ({ onAdd, onOpenManual, history, autoFocus = false }) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<Partial<Transaction> | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- 4. MOTOR NLP (The Core) ---
  const parseInput = (text: string) => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }

    // A. Pre-processamento e Identificação Inicial
    let cleanText = text;
    let detectedType: 'income' | 'expense' = 'expense';
    let amount: number | undefined = undefined;
    let date = new Date();
    let isInstallment = false;
    let installmentsTotal = 2; // Default fallback

    // Detectar Tipo (Simples keywords high-priority)
    if (/\b(recebi|ganhei|entrada|salário|pago por|pix recebido)\b/i.test(cleanText)) {
      detectedType = 'income';
      cleanText = cleanText.replace(/\b(recebi|ganhei|entrada|salário|pago por|pix recebido)\b/gi, '');
    }

    // Detectar Valor (Regex robusto de dinheiro)
    const amountMatch = cleanText.match(/(?:R\$)?\s*(\d+[.,]?\d*)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
      cleanText = cleanText.replace(amountMatch[0], ''); // Remove valor do texto para não confundir tokens
    }

    // Detectar Data (Hoje, Ontem, Dia X)
    const today = new Date();
    if (/\bontem\b/i.test(cleanText)) {
      date.setDate(today.getDate() - 1);
      cleanText = cleanText.replace(/\bontem\b/gi, '');
    } else {
      const dateMatch = cleanText.match(/\b(\d{1,2})[-/](\d{1,2})\b/); // DD/MM
      if (dateMatch) {
        date = new Date(today.getFullYear(), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]), 12, 0, 0);
        cleanText = cleanText.replace(dateMatch[0], '');

        // Ano Lógico (Futuro proibido -> Ano passado)
        const buffer = new Date();
        buffer.setDate(today.getDate() + 1);
        if (date > buffer) date.setFullYear(today.getFullYear() - 1);

      } else {
        const dayMatch = cleanText.match(/\bdia\s+(\d{1,2})\b/i);
        if (dayMatch) {
          const d = parseInt(dayMatch[1]);
          // Tenta manter mês atual, se passou dia, talvez mês anterior? Não, default mês atual.
          date = new Date(today.getFullYear(), today.getMonth(), d, 12, 0, 0);
          cleanText = cleanText.replace(dayMatch[0], '');

          // Ano Lógico
          const buffer = new Date();
          buffer.setDate(today.getDate() + 1);
          if (date > buffer) date.setMonth(date.getMonth() - 1); // Volta 1 mês se dia for futuro
        }
      }
    }

    // Detectar Parcelamento (Ex: 10x, 12 vezes)
    const instMatch = cleanText.match(/(\d+)\s*(x|vezes|parc)/i);
    if (instMatch) {
      isInstallment = true;
      installmentsTotal = parseInt(instMatch[1]);
      cleanText = cleanText.replace(instMatch[0], '');
    }

    // B. Tokenização e Limpeza
    const tokens = cleanText
      .toLowerCase()
      .replace(/[!?,;]/g, '') // Pontuações
      .split(/\s+/)
      .filter(t => t && !STOPWORDS.has(t)); // Remove vazios e stopwords

    // C. Algoritmo de Disputa de Slots
    const slots = {
      method: null as string | null,
      account: null as string | null,
      descriptionTokens: [] as string[]
    };

    tokens.forEach(token => {
      // 1. Tenta identificar Método
      if (SYNONYMS_METHOD[token]) {
        // Ambiguidade: "Pics" (Método) vs Descrição?
        // Se já temos método, ou se token tem histórico forte como descrição...
        // Por simplificação: Método ganha prioridade a menos que já tenha um.
        if (!slots.method) {
          slots.method = SYNONYMS_METHOD[token];
          return; // Consumido
        }
      }

      // 2. Tenta identificar Conta
      if (SYNONYMS_ACCOUNT[token]) {
        if (!slots.account) {
          slots.account = SYNONYMS_ACCOUNT[token];
          return; // Consumido
        }
      }

      // Fallback: Descrição
      slots.descriptionTokens.push(token);
    });

    // Defaults Inteligentes
    if (!slots.method) {
      if (slots.account === 'Carteira') slots.method = 'Dinheiro';
      else if (detectedType === 'expense') slots.method = 'Crédito'; // Default expense
      else slots.method = 'Pix'; // Default income
    }

    // Default Conta
    if (!slots.account) slots.account = 'Inter';


    // D. Reconstrução da Descrição e Inferência de Categoria
    let description = slots.descriptionTokens
      .map(t => t.charAt(0).toUpperCase() + t.slice(1))
      .join(' ');

    if (!description) description = detectedType === 'income' ? 'Receita' : 'Nova Despesa';

    // Inferência Híbrida de Categoria
    let category = 'Outros';
    const lowerDesc = description.toLowerCase();

    // 1. Histórico (Peso Máximo)
    const historyMatch = history.find(t => t.origin.toLowerCase() === lowerDesc);
    if (historyMatch) {
      category = historyMatch.category;
    } else {
      // 2. Base de Conhecimento (Peso Médio)
      // Check exact match or includes
      const commonKey = Object.keys(COMMON_TERMS).find(k => lowerDesc.includes(k));
      if (commonKey) {
        category = COMMON_TERMS[commonKey];
      } else {
        // 3. Fallback Genérico
        category = inferCategory(description);
      }
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
      account: slots.account!,
      paymentMethod: slots.method!,
      date: date.toISOString(),
      isInstallment,
      installmentsTotal: isInstallment ? installmentsTotal : undefined,
      currentInstallment: isInstallment ? 1 : undefined,
      isShared: false // Simplificado
    };

    setPreview(transactionPreview);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    parseInput(val);
    if (!val) setShowCategorySelector(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preview && preview.amount && preview.origin) {

      // 1. Cria o objeto final da transação
      const newTransaction = {
        ...preview,
        // Garante valores padrão caso falte algo
        account: preview.account || 'Inter',
        paymentMethod: preview.paymentMethod || 'Crédito',
        category: preview.category || 'Outros',
        tags: preview.tags || [] // Usa as tags detectadas ou array vazio
      } as Omit<Transaction, 'id'>;

      // 2. Salva no App (Para o usuário ver)
      onAdd(newTransaction);

      // 3. Salva no Log de Aprendizado (Para você melhorar a IA depois)
      if (user) {
        console.log("🕵️ [SMARTBAR] Tentando enviar log para o Firebase..."); // <--- DEBUG 1

        logSmartBarEvent(user.uid, input, preview, newTransaction)
          .then((sucesso) => {
            if (sucesso) console.log("✅ [SMARTBAR] SUCESSO! Log gravado."); // <--- DEBUG 2
            else console.error("❌ [SMARTBAR] FALHA silenciosa no log.");
          })
          .catch(err => console.error("❌ [SMARTBAR] ERRO CRÍTICO:", err));
      } else {
        console.warn("⚠️ [SMARTBAR] Sem usuário. Log ignorado.");
      }

      // 4. Limpa o campo
      setInput('');
      setPreview(null);
      setShowCategorySelector(false);
    }
  };

  const handleManualCategorySelect = (cat: string) => {
    if (preview) {
      setPreview({ ...preview, category: cat });
      setShowCategorySelector(false);
      inputRef.current?.focus();
    }
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
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none text-white text-base md:text-lg placeholder-zinc-600 focus:ring-0 py-4 pl-3 pr-4 outline-none"
            placeholder="Digite '100 pics churrasco'..."
            value={input}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            autoFocus={autoFocus}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowCategorySelector(false);
                inputRef.current?.blur();
              }
            }}
          />
        </form>
        <div className="flex items-center pr-2 gap-1">
          <div className={`transition-all duration-300 overflow-hidden ${preview ? 'w-10 opacity-100 scale-100' : 'w-0 opacity-0 scale-90'}`}>
            <button
              onClick={handleSubmit}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              title="Confirmar (Enter)"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="w-px h-6 bg-zinc-800 mx-2"></div>
          <button
            onClick={onOpenManual}
            className="group flex items-center justify-center w-10 h-10 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
            title="Adicionar Manualmente"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {preview && (
        <div className="absolute top-full left-4 right-4 mt-2 bg-surfaceHighlight border border-zinc-700 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 z-40 backdrop-blur-xl bg-opacity-95">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                  {new Date(preview.date!).toLocaleDateString('pt-BR')}
                </span>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className={`font-bold text-xl tracking-tight ${preview.type === 'income' ? 'text-secondary' : 'text-danger'}`}>
                    {preview.type === 'income' ? '+' : '-'}{preview.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="font-medium text-white text-lg">{preview.origin}</span>
                </div>
              </div>
              {preview.isShared && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full border border-blue-500/20">
                  <Users className="w-3 h-3" /> Split
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategorySelector(!showCategorySelector)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors font-medium ${preview.category === 'Outros'
                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white hover:border-zinc-600'
                    }`}
                >
                  {preview.category} <ChevronDown className="w-3 h-3" />
                </button>
                {showCategorySelector && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-zinc-700 rounded-xl shadow-xl p-2 grid grid-cols-1 gap-1 max-h-48 overflow-y-auto z-[60]">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleManualCategorySelect(cat)}
                        className={`text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm ${preview.category === cat ? 'bg-primary/20 text-primary' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="px-3 py-1.5 bg-zinc-800 rounded-full text-zinc-300 border border-zinc-700 font-medium">
                {preview.account} {preview.paymentMethod && ` • ${preview.paymentMethod}`}
              </span>
              {preview.isInstallment && (
                <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1.5 text-orange-400 font-medium">
                  <Layers className="w-3 h-3" />
                  <span className="font-bold">{preview.installmentsTotal}x</span>
                </div>
              )}
              {preview.tags && preview.tags.length > 0 && (
                <span className="flex items-center gap-1 text-primary px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full font-medium">
                  <Tag className="w-3 h-3" /> {preview.tags[0]}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
            <span>NLP Engine v2.0 Active</span>
            <span className="flex items-center gap-1">Enter to save <ArrowRight className="w-3 h-3" /></span>
          </div>
        </div>
      )}
    </div>
  );
};