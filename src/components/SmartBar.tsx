import React, { useState, useRef } from 'react';
import { ArrowRight, Tag, Sparkles, DollarSign, Plus, Users, TrendingUp, ChevronDown, Layers } from 'lucide-react';
import { Transaction } from '../types';
import { CATEGORIES, inferCategory } from '../utils';

interface SmartBarProps {
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onOpenManual: () => void;
  history: Transaction[];
}

export const SmartBar: React.FC<SmartBarProps> = ({ onAdd, onOpenManual, history }) => {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<Partial<Transaction> | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper mappings
  const accountKeywords: Record<string, string> = {
    'inter': 'Inter', 'nubank': 'Nubank', 'nu': 'Nubank', 'roxinho': 'Nubank',
    'caixa': 'Caixa', 'cef': 'Caixa', 'itaú': 'Itaú', 'itau': 'Itaú',
    'bradesco': 'Bradesco', 'santander': 'Santander', 'mp': 'MercadoPago',
    'mercadopago': 'MercadoPago', 'carteira': 'Carteira'
  };

  const methodKeywords: Record<string, string> = {
    'credito': 'Crédito', 'crédito': 'Crédito', 
    'debito': 'Débito', 'débito': 'Débito',
    'pix': 'Pix', 'dinheiro': 'Dinheiro'
  };

  const splitKeywords = ['dividido', 'rachado', 'split', 'compartilhado', 'metade'];
  const incomeKeywords = ['recebi', 'entrou', 'ganhei', 'salário', 'salario', 'venda', 'depósito', 'deposito'];

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const parseInput = (text: string) => {
    
    if (!text.trim()) {
      setPreview(null);
      setShowCategorySelector(false);
      return;
    }

    let processText = text;
    let detectedType: 'income' | 'expense' = 'expense';
    let detectedDate = new Date().toISOString(); 

    // 1. DATE DETECTION
    const dateMatch = processText.match(/(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; 
      let year = new Date().getFullYear();
      if (dateMatch[3]) {
        year = parseInt(dateMatch[3]);
        if (year < 100) year += 2000; 
      }
      const newDate = new Date(year, month, day, 12, 0, 0);
      detectedDate = newDate.toISOString();
      processText = processText.replace(dateMatch[0], '');
    }

    // 2. INSTALLMENT DETECTION
    let isInstallment = false;
    let installmentsTotal = undefined;

    if (/recorrente/i.test(processText)) {
      isInstallment = true;
      installmentsTotal = 12; 
      processText = processText.replace(/recorrente/i, '');
    }

    const installmentMatch = processText.match(/(?:parcelado|em)?\s*(\d+)\s*(?:x|vezes|parcelas|meses)/i);
    if (installmentMatch) {
      isInstallment = true;
      installmentsTotal = parseInt(installmentMatch[1]);
      processText = processText.replace(installmentMatch[0], '');
    } else if (/parcelado/i.test(processText)) {
       isInstallment = true;
       installmentsTotal = installmentsTotal || 2; 
       processText = processText.replace(/parcelado/i, '');
    }

    // 3. TYPE DETECTION
    const lowerTextRaw = processText.toLowerCase();
    for (const kw of incomeKeywords) {
      if (lowerTextRaw.includes(kw)) {
        detectedType = 'income';
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        processText = processText.replace(regex, '');
        break; 
      }
    }
    if (lowerTextRaw.includes('pix recebido')) {
       detectedType = 'income';
       processText = processText.replace(/recebido/gi, ''); 
    }

    // 4. AMOUNT DETECTION
    const amountMatch = processText.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (!amountMatch) {
      setPreview(null);
      return;
    }

    const rawAmount = amountMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);

    processText = processText.replace(amountMatch[0], '')
                             .replace(/\breais\b/gi, '')
                             .replace(/\br\$\b/gi, '')
                             .trim();

    // 5. TAGS DETECTION
    const tags: string[] = [];
    const tagMatches = processText.match(/#\w+/g);
    if (tagMatches) {
      tagMatches.forEach(t => {
        tags.push(t.replace('#', ''));
        processText = processText.replace(t, '');
      });
    }

    // 6. ACCOUNT & METHOD DETECTION
    const normalizedText = processText.replace(/[.,;](?=\s|$)/g, ' '); 
    const tokens = normalizedText.split(/\s+/);

    let detectedAccount = 'Inter'; 
    let detectedMethod = ''; 
    let isShared = false;

    const titleTokens: string[] = [];
    tokens.forEach(token => {
      if (!token) return;
      const lower = token.toLowerCase();
      
      if (splitKeywords.includes(lower)) {
        isShared = true;
        return; 
      }
      
      if (accountKeywords[lower]) {
        detectedAccount = accountKeywords[lower];
        return; 
      }
      
      if (methodKeywords[lower]) {
        detectedMethod = methodKeywords[lower];
      }
      titleTokens.push(token);
    });

    if (!detectedMethod) {
       if (detectedAccount === 'Carteira') detectedMethod = 'Dinheiro';
       else if (detectedType === 'expense') detectedMethod = 'Crédito'; 
       else detectedMethod = 'Pix'; 
    }

    // 7. CLEAN UP ORIGIN
    let origin = titleTokens.join(' ').trim();
    origin = origin.replace(/^(de|da|do|para|em)\s+/i, '');
    if (!origin) origin = detectedType === 'income' ? 'Receita' : 'Nova Transação';
    origin = capitalizeFirstLetter(origin);

    // 8. CATEGORY INFERENCE (Using Shared Utility + History)
    let category = 'Outros';
    
    // Bidirectional Check: "Uber" matches "Uber Viagem" AND "Uber Viagem" matches "Uber"
    const lastSimilar = history.find(t => 
      t.origin.toLowerCase().includes(origin.toLowerCase()) || 
      origin.toLowerCase().includes(t.origin.toLowerCase())
    );
    
    if (lastSimilar) {
      category = lastSimilar.category;
    } else {
       if (detectedType === 'income') {
           category = origin.toLowerCase().includes('salário') ? 'Salário' : 'Outros';
       } else {
           category = inferCategory(origin);
       }
    }

    setPreview(prev => ({
      amount,
      origin,
      tags: tags.length > 0 ? tags : [],
      category: (prev && prev.category && prev.category !== 'Outros' && category === 'Outros') ? prev.category : category,
      type: detectedType,
      account: detectedAccount,
      paymentMethod: detectedMethod,
      date: detectedDate,
      isInstallment,
      installmentsTotal: isInstallment ? (installmentsTotal || 2) : undefined,
      currentInstallment: isInstallment ? 1 : undefined,
      isShared,
      myShareValue: isShared ? amount / 2 : undefined
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    parseInput(val);
    if (!val) setShowCategorySelector(false);
  };

  const handleManualCategorySelect = (cat: string) => {
    if (preview) {
      setPreview({ ...preview, category: cat });
      setShowCategorySelector(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preview && preview.amount && preview.origin) {
      const newTransaction = {
        ...preview,
        account: preview.account || 'Inter',
        paymentMethod: preview.paymentMethod || (preview.type === 'expense' ? 'Crédito' : 'N/A'),
      } as Omit<Transaction, 'id'>;

      onAdd(newTransaction);
      setInput('');
      setPreview(null);
      setShowCategorySelector(false);
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
            placeholder="Digite 'recebi 50 pix da maria dia 22/01'..."
            value={input}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
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
                        {preview.type === 'income' ? '+' : '-'}{preview.amount?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
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
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors font-medium ${
                    preview.category === 'Outros' 
                      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20' 
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {preview.category} <ChevronDown className="w-3 h-3"/>
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
                    <input 
                       type="number" min="2"
                       className="w-6 bg-transparent text-center focus:outline-none focus:text-white text-orange-400 font-bold p-0"
                       value={preview.installmentsTotal}
                       onChange={(e) => setPreview({...preview, installmentsTotal: parseInt(e.target.value)})}
                       onClick={(e) => e.stopPropagation()}
                    />
                    <span>x</span>
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
            <span>AI Detected</span>
            <span className="flex items-center gap-1">Enter to save <ArrowRight className="w-3 h-3"/></span>
          </div>
        </div>
      )}
    </div>
  );
};