import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, Layers, Users, FileText } from 'lucide-react';
import { Transaction } from '../types';
import { ACCOUNTS, CATEGORIES, formatCurrencyInput, parseCurrencyToNumber } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (t: Omit<Transaction, 'id'>) => void;
  initialData?: Transaction | null;
}

export const TransactionModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amountDisplay, setAmountDisplay] = useState(''); // Stores "R$ 0,00"
  const [origin, setOrigin] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Alimentação');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [account, setAccount] = useState('Inter');
  const [paymentMethod, setPaymentMethod] = useState('Crédito');
  const [notes, setNotes] = useState('');
  
  // Advanced Features
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsTotal, setInstallmentsTotal] = useState(2);
  
  const [isShared, setIsShared] = useState(false);
  const [myShareDisplay, setMyShareDisplay] = useState(''); // Stores "R$ 0,00"

  // Reset or Populate form when opened
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type);
        setAmountDisplay(initialData.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        setOrigin(initialData.origin);
        setDate(initialData.date.split('T')[0]);
        setAccount(initialData.account);
        setPaymentMethod(initialData.paymentMethod);
        setNotes(initialData.notes || '');
        
        if (CATEGORIES.includes(initialData.category)) {
          setCategory(initialData.category);
          setIsCustomCategory(false);
        } else {
          setCategory('custom');
          setCustomCategory(initialData.category);
          setIsCustomCategory(true);
        }

        setIsInstallment(initialData.isInstallment);
        setInstallmentsTotal(initialData.installmentsTotal || 2);
        setIsShared(initialData.isShared);
        setMyShareDisplay(initialData.myShareValue 
          ? initialData.myShareValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
          : ''
        );
      } else {
        // Reset
        setOrigin('');
        setAmountDisplay('');
        setMyShareDisplay('');
        setNotes('');
        setIsShared(false);
        setIsInstallment(false);
        setDate(new Date().toISOString().split('T')[0]);
        setType('expense');
      }
    }
  }, [isOpen, initialData]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountDisplay(formatCurrencyInput(e.target.value));
  };

  const handleShareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMyShareDisplay(formatCurrencyInput(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountDisplay || !origin) return;

    const numAmount = parseCurrencyToNumber(amountDisplay);
    if (numAmount === 0) return;

    const finalCategory = isCustomCategory ? customCategory : category;
    
    // Logic for shared expenses
    const shareVal = isShared && myShareDisplay 
      ? parseCurrencyToNumber(myShareDisplay) 
      : numAmount;
    
    const formattedOrigin = origin.charAt(0).toUpperCase() + origin.slice(1);

    const transaction: Omit<Transaction, 'id'> = {
      amount: numAmount,
      origin: formattedOrigin,
      date: new Date(date).toISOString(),
      category: finalCategory,
      account,
      paymentMethod: type === 'expense' ? paymentMethod : 'N/A', 
      type,
      tags: initialData?.tags || [], 
      notes,
      isInstallment: type === 'expense' ? isInstallment : false,
      installmentsTotal: (type === 'expense' && isInstallment) ? installmentsTotal : undefined,
      currentInstallment: (type === 'expense' && isInstallment) ? (initialData?.currentInstallment || 1) : undefined,
      isShared,
      myShareValue: shareVal,
    };

    onSave(transaction);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">
            {initialData ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Type Switcher */}
          <div className="flex bg-zinc-900 p-1 rounded-xl">
            <button 
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === 'expense' ? 'bg-zinc-800 text-danger shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Despesa
            </button>
            <button 
              type="button"
              onClick={() => {
                setType('income');
                if (!initialData) setCategory('Salário');
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === 'income' ? 'bg-zinc-800 text-secondary shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Receita
            </button>
          </div>

          {/* Main Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Título</label>
              <input 
                required
                autoFocus
                placeholder={type === 'income' ? "Ex: Salário, Venda, Freelance" : "Ex: Gasolina, Mercado"}
                className="w-full bg-surfaceHighlight border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Valor Total</label>
                <div className="relative">
                  <input 
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    className="w-full bg-surfaceHighlight border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
                    value={amountDisplay}
                    onChange={handleAmountChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Data</label>
                <input 
                  type="date"
                  required
                  className="w-full bg-surfaceHighlight border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs text-zinc-500 mb-1">Categoria</label>
               {!isCustomCategory ? (
                 <select 
                    className="w-full bg-surfaceHighlight border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary appearance-none"
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === 'custom') setIsCustomCategory(true);
                      else setCategory(e.target.value);
                    }}
                 >
                   {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   <option value="custom">+ Nova Categoria</option>
                 </select>
               ) : (
                 <div className="flex gap-2">
                   <input 
                     placeholder="Nome da categoria"
                     className="w-full bg-surfaceHighlight border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
                     value={customCategory}
                     onChange={e => setCustomCategory(e.target.value)}
                   />
                   <button type="button" onClick={() => setIsCustomCategory(false)} className="p-2 text-zinc-500 hover:text-white"><X/></button>
                 </div>
               )}
            </div>
            
            <div>
               <label className="block text-xs text-zinc-500 mb-1">
                 {type === 'income' ? 'Conta de Entrada' : 'Conta / Cartão'}
               </label>
               <select 
                  className="w-full bg-surfaceHighlight border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary appearance-none"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
               >
                 {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
               </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Observações (Opcional)
            </label>
            <textarea
              className="w-full bg-surfaceHighlight border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary resize-none text-sm"
              rows={2}
              placeholder="Detalhes adicionais sobre a compra..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Payment Method - Only show for expenses */}
          {type === 'expense' && (
            <div className="animate-in fade-in">
                <label className="block text-xs text-zinc-500 mb-1">Método de Pagamento</label>
                <div className="flex gap-2">
                  {['Crédito', 'Débito', 'Pix', 'Dinheiro'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs border ${paymentMethod === m ? 'bg-primary/20 border-primary text-primary' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
            </div>
          )}

          <hr className="border-zinc-800" />

          {/* Advanced Toggles */}
          <div className="space-y-4">
            
            {/* Installments (Only expenses) */}
            {type === 'expense' && (
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  <input 
                    type="checkbox" 
                    id="installments" 
                    className="accent-primary w-4 h-4"
                    checked={isInstallment}
                    onChange={e => setIsInstallment(e.target.checked)}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="installments" className="text-sm font-medium text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-400"/> Compra Parcelada
                  </label>
                  {isInstallment && (
                    <div className="mt-2 flex items-center gap-2 animate-in slide-in-from-top-2">
                      <span className="text-zinc-500 text-sm">Quantidade:</span>
                      <input 
                        type="number" 
                        min="2" 
                        max="48"
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg p-1 text-center text-white"
                        value={installmentsTotal}
                        onChange={e => setInstallmentsTotal(parseInt(e.target.value))}
                      />
                      <span className="text-zinc-500 text-sm">x</span>
                      {amountDisplay && installmentsTotal > 0 && (
                        <span className="text-xs text-zinc-400 ml-2">
                           (~{(parseCurrencyToNumber(amountDisplay) / installmentsTotal).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}/mês)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Split / Shared */}
            <div className="flex items-start gap-3">
              <div className="pt-1">
                <input 
                  type="checkbox" 
                  id="shared" 
                  className="accent-primary w-4 h-4"
                  checked={isShared}
                  onChange={e => {
                    setIsShared(e.target.checked);
                    if (e.target.checked && amountDisplay) {
                        const val = parseCurrencyToNumber(amountDisplay);
                        setMyShareDisplay((val/2).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}));
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="shared" className="text-sm font-medium text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400"/> Dividido / Compartilhado
                </label>
                <p className="text-xs text-zinc-500">
                  {type === 'expense' 
                    ? 'Marque se você pagou o total, mas dividirá o custo.' 
                    : 'Marque se você recebeu o total, mas repassará uma parte.'}
                </p>
                {isShared && (
                  <div className="mt-2 animate-in slide-in-from-top-2">
                    <label className="block text-xs text-zinc-400 mb-1">
                      {type === 'expense' ? 'Minha Parte (Custo Real)' : 'Minha Parte (Lucro Real)'}
                    </label>
                    <div className="relative w-32">
                      <input 
                        type="text"
                        inputMode="numeric"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 text-white text-sm"
                        value={myShareDisplay}
                        onChange={handleShareChange}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </form>

        <div className="p-4 border-t border-zinc-800 bg-surface">
          <button 
            onClick={handleSubmit}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
          >
            {initialData ? 'Salvar Alterações' : (type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa')}
          </button>
        </div>

      </div>
    </div>
  );
};