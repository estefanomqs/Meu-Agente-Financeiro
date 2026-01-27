import React, { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, FileText, Check, AlertCircle, Trash2, Edit2, ArrowRight, Loader2, Save, Users, RotateCcw, CheckSquare, Square, CreditCard, CalendarClock } from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { Transaction, TransactionType } from '../types';
import { generateId, inferCategory, CATEGORIES, ACCOUNTS, formatCurrencyInput, parseCurrencyToNumber, getEstimatedPaymentDate, getAccountColor } from '../utils';
import { useFinanceStore } from '../hooks/useFinanceStore';

// Fix for PDF.js import: handle potential default export wrapping
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Configure PDF Worker
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFinishImport: (transactions: Omit<Transaction, 'id'>[]) => void;
  pendingFile?: File | null;
}

type ImportStatus = 'pending' | 'approved' | 'rejected';

interface DraftTransaction extends Omit<Transaction, 'id'> {
  tempId: string;
  status: ImportStatus;
  rawLine?: string;
}

export const ImportWizard: React.FC<Props> = ({ isOpen, onClose, onFinishImport, pendingFile }) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [drafts, setDrafts] = useState<DraftTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New: Account Selection State
  const [targetAccount, setTargetAccount] = useState('Inter');

  // Get Settings from Store
  const { data: { accountSettings } } = useFinanceStore();
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject' | 'reset', isOpen: boolean } | null>(null);

  // Edit Modal State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DraftTransaction>>({});
  const [editAmountDisplay, setEditAmountDisplay] = useState('');

  // Handle immediate processing if pendingFile exists
  // Note: We use the default targetAccount ('Inter') if triggered via header button immediately,
  // or user can close and change.
  useEffect(() => {
    if (isOpen && pendingFile) {
        processFile(pendingFile);
    }
  }, [isOpen, pendingFile]);

  // --- PARSING LOGIC ---

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        await parseSpreadsheet(file);
      } else if (file.name.endsWith('.pdf')) {
        await parsePDF(file);
      } else {
        setError('Formato não suportado. Use .CSV, .XLSX ou .PDF');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao ler arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodForAccount = (type: TransactionType) => {
    // Check if the selected account has credit card settings
    const hasSettings = accountSettings.some(s => s.accountId === targetAccount);
    
    if (hasSettings && type === 'expense') {
      return 'Crédito';
    }
    // Fallback logic
    if (type === 'income') return 'Pix';
    return 'Débito';
  };

  const parseSpreadsheet = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          let workbook;
          try {
             workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true, codepage: 1252 });
          } catch(err) {
             workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
          }

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });

          if (rows.length < 2) throw new Error("Arquivo vazio ou sem dados");

          let headerRowIdx = -1;
          const headers: Record<string, number> = {};
          
          for(let i=0; i < Math.min(rows.length, 10); i++) {
             const row = rows[i].map(c => String(c).toLowerCase());
             if (row.some(c => c.includes('data') || c.includes('date') || c.includes('dt'))) {
                headerRowIdx = i;
                row.forEach((cell, idx) => {
                   if(cell.includes('data') || cell.includes('date')) headers['date'] = idx;
                   if(cell.includes('desc') || cell.includes('hist') || cell.includes('memorando')) headers['desc'] = idx;
                   if(cell.includes('valor') || cell.includes('amount')) headers['amount'] = idx;
                });
                break;
             }
          }

          if (headerRowIdx === -1) {
             headers['date'] = 0;
             headers['desc'] = 1;
             headers['amount'] = rows[0].length - 1;
          }

          const parsedDrafts: DraftTransaction[] = [];

          for (let i = headerRowIdx + 1; i < rows.length; i++) {
             const row = rows[i];
             if (!row || row.length === 0) continue;

             const rawDate = row[headers['date']];
             const rawDesc = row[headers['desc']];
             const rawAmount = row[headers['amount']];

             if (!rawDate && !rawAmount) continue;

             let dateStr = new Date().toISOString();
             const dMatch = String(rawDate).match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
             if (dMatch) {
                const year = parseInt(dMatch[3]) < 100 ? 2000 + parseInt(dMatch[3]) : parseInt(dMatch[3]);
                dateStr = new Date(year, parseInt(dMatch[2])-1, parseInt(dMatch[1])).toISOString();
             } else if (rawDate instanceof Date) {
                dateStr = rawDate.toISOString();
             }

             let cleanAmount = String(rawAmount).replace(/[^\d.,-]/g, '');
             if (cleanAmount.includes(',') && cleanAmount.includes('.')) {
                cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
             } else if (cleanAmount.includes(',')) {
                cleanAmount = cleanAmount.replace(',', '.');
             }
             
             let amountVal = parseFloat(cleanAmount);
             if (isNaN(amountVal)) continue;

             let type: TransactionType = 'expense';
             const origin = String(rawDesc || 'Transação Importada').trim();
             
             if (amountVal < 0) {
                type = 'expense';
                amountVal = Math.abs(amountVal);
             } else {
                const lowerDesc = origin.toLowerCase();
                const incomeKeywords = ['recebido', 'depósito', 'deposito', 'salário', 'salario', 'crédito', 'credito', 'estorno', 'devolução', 'rendimento', 'pix recebido'];
                if (incomeKeywords.some(k => lowerDesc.includes(k))) {
                   type = 'income';
                } else {
                   type = 'expense'; 
                }
             }

             const category = inferCategory(origin);

             parsedDrafts.push({
                tempId: generateId(),
                status: 'pending',
                date: dateStr,
                origin: origin.charAt(0).toUpperCase() + origin.slice(1),
                amount: amountVal,
                type,
                category,
                account: targetAccount, // Use selected account
                paymentMethod: getPaymentMethodForAccount(type),
                tags: ['Importado'],
                isInstallment: false,
                isShared: false
             });
          }

          setDrafts(parsedDrafts);
          setStep('review');
          resolve();

        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const parsePDF = async (file: File) => {
     try {
       const arrayBuffer = await file.arrayBuffer();
       const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
       const pdf = await loadingTask.promise;
       
       let fullText = '';
       
       for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
       }

       const monthMap: Record<string, number> = {
          'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
          'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
       };

       const parsedDrafts: DraftTransaction[] = [];
       // Regex adjusted for Inter (common format)
       const regexInter = /(\d{1,2})\s+de\s+([a-zç]{3,})\.?\s+(\d{4})\s+(.*?)\s+-\s+(?:R\$\s*)?(-?[\d\.,]+)/gi;
       
       let match;
       while ((match = regexInter.exec(fullText)) !== null) {
          const day = parseInt(match[1]);
          const monthStr = match[2].toLowerCase().substring(0, 3);
          const year = parseInt(match[3]);
          const rawDesc = match[4].trim();
          const rawAmount = match[5];

          const month = monthMap[monthStr] !== undefined ? monthMap[monthStr] : 0;
          const amountValStr = rawAmount.replace(/\./g, '').replace(',', '.');
          let amount = parseFloat(amountValStr);
          
          let type: TransactionType = 'expense';
          
          if (amount < 0) {
             type = 'income';
             amount = Math.abs(amount);
          } else {
             type = 'expense';
          }
          
          if (rawDesc.toLowerCase().includes('estorno') || rawDesc.toLowerCase().includes('reembolso')) {
             type = 'income';
          }

          if (rawDesc.includes('Total da sua fatura') || rawDesc.includes('Pagamento mínimo')) continue;

          let isInstallment = false;
          let installmentsTotal = undefined;
          let currentInstallment = undefined;
          
          const instMatch = rawDesc.match(/\(Parcela (\d+) de (\d+)\)/i);
          if (instMatch) {
             isInstallment = true;
             currentInstallment = parseInt(instMatch[1]);
             installmentsTotal = parseInt(instMatch[2]);
          }

          const cleanDesc = rawDesc.replace(/\(Parcela \d+ de \d+\)/i, '').trim();
          const category = inferCategory(cleanDesc);

          parsedDrafts.push({
             tempId: generateId(),
             status: 'pending',
             date: new Date(year, month, day).toISOString(),
             origin: cleanDesc,
             amount: Math.abs(amount),
             type,
             category,
             account: targetAccount, // Use selected account
             paymentMethod: getPaymentMethodForAccount(type),
             tags: ['Fatura PDF'],
             isInstallment,
             installmentsTotal,
             currentInstallment,
             isShared: false,
             rawLine: match[0]
          });
       }

       if (parsedDrafts.length === 0) throw new Error("Não identificamos transações no padrão Inter. Tente CSV.");
       setDrafts(parsedDrafts);
       setStep('review');

     } catch (e: any) {
        if (e.message && (e.message.includes("Worker") || e.message.includes("pdf.worker"))) {
           throw new Error("Erro no carregamento do PDF Worker. Tente recarregar a página.");
        }
        throw new Error("Erro ao ler PDF: " + (e.message || "Formato desconhecido"));
     }
  };

  // --- ACTIONS ---

  const executeApproveAll = () => {
    setDrafts(prev => prev.map(d => ({ ...d, status: 'approved' })));
    setConfirmAction(null);
  };
  
  const executeRejectAll = () => {
    setDrafts(prev => prev.map(d => ({ ...d, status: 'rejected' })));
    setConfirmAction(null);
  };

  const executeResetAll = () => {
    setDrafts(prev => prev.map(d => ({ ...d, status: 'pending' })));
    setConfirmAction(null);
  };

  const requestApproveAll = () => {
     if (drafts.some(d => d.status === 'rejected')) {
        setConfirmAction({ type: 'approve', isOpen: true });
     } else {
        executeApproveAll();
     }
  };

  const requestRejectAll = () => {
     if (drafts.some(d => d.status === 'approved')) {
        setConfirmAction({ type: 'reject', isOpen: true });
     } else {
        executeRejectAll();
     }
  };

  const requestResetAll = () => {
     if (drafts.some(d => d.status !== 'pending')) {
        setConfirmAction({ type: 'reset', isOpen: true });
     } else {
        executeResetAll();
     }
  };

  const toggleStatus = (id: string, newStatus: ImportStatus) => {
    setDrafts(prev => prev.map(d => d.tempId === id ? { ...d, status: newStatus } : d));
  };
  
  const toggleShared = (id: string) => {
    setDrafts(prev => prev.map(d => {
       if(d.tempId !== id) return d;
       const newShared = !d.isShared;
       return {
          ...d,
          isShared: newShared,
          myShareValue: newShared ? d.amount / 2 : undefined
       };
    }));
  };

  // --- SELECTION LOGIC ---
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === drafts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(drafts.map(d => d.tempId)));
  };

  const handleDeleteSelected = () => {
     if (selectedIds.size === 0) return;
     // Rejects selected items
     setDrafts(prev => prev.map(d => selectedIds.has(d.tempId) ? { ...d, status: 'rejected' } : d));
     setSelectedIds(new Set());
  };

  const handleCancelImport = () => {
     setDrafts([]);
     setStep('upload');
     setSelectedIds(new Set());
  };

  const startEditing = (d: DraftTransaction) => {
     setEditingId(d.tempId);
     setEditForm({ ...d });
     setEditAmountDisplay(d.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  const saveEdit = () => {
     setDrafts(prev => prev.map(d => d.tempId === editingId ? { ...d, ...editForm, status: 'approved' } : d));
     setEditingId(null);
  };

  const handleProcess = () => {
     const approved = drafts.filter(d => d.status === 'approved').map(({ tempId, status, rawLine, ...rest }) => rest);
     if (approved.length === 0) {
        alert("Nenhuma transação aprovada para importar.");
        return;
     }
     onFinishImport(approved);
     setDrafts([]);
     setStep('upload');
     setSelectedIds(new Set());
     onClose();
  };

  // --- UI RENDER ---

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-background flex flex-col animate-in fade-in slide-in-from-bottom-10">
      
      {/* Header */}
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-surface">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-primary/20 rounded-lg text-primary"><Upload className="w-5 h-5"/></div>
           <div>
              <h2 className="text-lg font-bold text-white">Importação Avançada</h2>
              <p className="text-xs text-zinc-500">Staging Area</p>
           </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X className="w-6 h-6"/></button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
         
         {/* Show processing/loading if pending file and loading state active OR just pending file exists and step is upload (catching up) */}
         {(loading || (pendingFile && step === 'upload')) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">Processando Arquivo...</h3>
                <p className="text-zinc-500">
                  Aplicando regras para: <span className="text-primary font-semibold">{targetAccount}</span>
                </p>
            </div>
         ) : step === 'upload' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
               
               {/* Account Selector - Top of Upload Screen */}
               <div className="mb-8 w-full max-w-md animate-in slide-in-from-top-4">
                  <label className="block text-sm text-zinc-400 mb-2 text-center">Selecione a Conta de Destino</label>
                  <div className="relative">
                    <select
                      value={targetAccount}
                      onChange={(e) => setTargetAccount(e.target.value)}
                      className="w-full bg-surface border border-zinc-700 rounded-xl p-4 text-white appearance-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center font-semibold text-lg"
                    >
                      {ACCOUNTS.map(acc => (
                        <option key={acc} value={acc}>{acc}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 text-center mt-2">
                     Isso garante que datas de fechamento/vencimento sejam aplicadas corretamente.
                  </p>
               </div>

               <div 
                  className={`
                     w-full max-w-2xl border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer
                     border-zinc-700 hover:border-primary hover:bg-zinc-900
                  `}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                     e.preventDefault();
                     const file = e.dataTransfer.files[0];
                     if (file) processFile(file);
                  }}
               >
                 <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-2">
                       <FileSpreadsheet className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Arraste seu extrato aqui</h3>
                    <p className="text-zinc-500">Suporta .CSV, .XLSX (Excel) e .PDF (Banco Inter)</p>
                    <div className="mt-4">
                       <label className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium cursor-pointer transition-colors">
                          Selecionar Arquivo
                          <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.pdf" onChange={e => {
                             if (e.target.files?.[0]) processFile(e.target.files[0]);
                          }}/>
                       </label>
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/> {error}</div>}
                 </div>
               </div>
            </div>
         ) : (
            /* Review Step */
            <div className="flex-1 flex flex-col h-full">
               {/* Review Toolbar */}
               <div className="p-4 border-b border-zinc-800 bg-surfaceHighlight/30 flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                     <button onClick={selectAll} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400">
                        {selectedIds.size > 0 && selectedIds.size === drafts.length ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                     </button>
                     <span className="text-sm text-zinc-400 mr-2">Encontradas: <strong className="text-white">{drafts.length}</strong></span>
                     
                     {selectedIds.size > 0 ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                           <span className="text-xs text-white bg-primary/20 px-2 py-1 rounded">{selectedIds.size} selecionados</span>
                           <button onClick={handleDeleteSelected} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-colors flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> Rejeitar Seleção
                           </button>
                        </div>
                     ) : (
                        <div className="flex gap-2 items-center">
                           <div className="h-4 w-px bg-zinc-700 mr-2"></div>
                           <button onClick={requestApproveAll} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors">Aprovar Tudo</button>
                           <button onClick={requestRejectAll} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-colors">Rejeitar Tudo</button>
                           <button onClick={requestResetAll} className="px-3 py-1.5 rounded-lg bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 text-xs font-bold transition-colors flex items-center gap-1">
                              <RotateCcw className="w-3 h-3"/> Limpar
                           </button>
                        </div>
                     )}
                  </div>
                  <div className="flex gap-2 text-xs">
                     <span className="flex items-center gap-1 text-zinc-500"><div className="w-2 h-2 rounded-full bg-zinc-600"></div> Pendente</span>
                     <span className="flex items-center gap-1 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Aprovado</span>
                     <span className="flex items-center gap-1 text-zinc-500 line-through decoration-danger">Rejeitado</span>
                  </div>
               </div>

               {/* Transactions List */}
               <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {drafts.map((d, idx) => {
                     // Calculate Estimated Payment Date for Visual Feedback
                     const settings = accountSettings.find(s => s.accountId === d.account);
                     const paymentDate = getEstimatedPaymentDate(d.date, d.paymentMethod === 'Crédito' ? settings : undefined);
                     const isDelayed = d.paymentMethod === 'Crédito' && paymentDate.getTime() > new Date(d.date).getTime();

                     return (
                        <div 
                           key={d.tempId}
                           className={`
                              flex items-center gap-4 p-3 rounded-xl border transition-all
                              ${d.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/30' : ''}
                              ${d.status === 'rejected' ? 'bg-zinc-900/50 border-zinc-800 opacity-60' : ''}
                              ${d.status === 'pending' ? 'bg-surface border-zinc-800' : ''}
                              ${selectedIds.has(d.tempId) ? 'ring-1 ring-primary bg-primary/5' : ''}
                           `}
                        >
                           <div className="shrink-0 flex items-center">
                              <button onClick={() => toggleSelection(d.tempId)} className="text-zinc-500 hover:text-white">
                                 {selectedIds.has(d.tempId) ? <CheckSquare className="w-5 h-5 text-primary"/> : <Square className="w-5 h-5"/>}
                              </button>
                           </div>

                           {/* Status Icon */}
                           <div className="shrink-0">
                              {d.status === 'approved' && <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Check className="w-5 h-5"/></div>}
                              {d.status === 'rejected' && <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500"><X className="w-5 h-5"/></div>}
                              {d.status === 'pending' && <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-bold">{idx+1}</div>}
                           </div>

                           {/* Content */}
                           <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <div className="flex flex-col">
                                 <span className="text-xs text-zinc-300 font-medium">{new Date(d.date).toLocaleDateString()}</span>
                                 {/* Visual Feedback for Billing Cycle */}
                                 {isDelayed && (
                                    <span className="flex items-center gap-1 text-[10px] text-orange-400 font-medium">
                                       <CalendarClock className="w-3 h-3" /> Vence: {paymentDate.toLocaleDateString(undefined, {day: '2-digit', month: '2-digit'})}
                                    </span>
                                 )}
                                 <span className={`font-medium truncate ${d.status === 'rejected' ? 'line-through decoration-zinc-500' : 'text-white'}`}>{d.origin}</span>
                              </div>
                              <div className="hidden md:block">
                                 <span className="px-2 py-1 rounded-full text-xs border border-zinc-700 text-zinc-400 bg-zinc-800/50">
                                    {d.category}
                                 </span>
                              </div>
                              <div className="flex flex-col items-end md:items-start">
                                 <div className={`font-bold ${d.type === 'income' ? 'text-secondary' : 'text-white'}`}>
                                    {d.type === 'expense' && '-'} {(d.myShareValue || d.amount).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                                 </div>
                                 <div className="flex gap-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getAccountColor(d.account)}`}>
                                       {d.account}
                                    </span>
                                    {d.isShared && <span className="text-[10px] text-blue-400 flex items-center gap-1"><Users className="w-3 h-3"/> Split</span>}
                                 </div>
                              </div>
                           </div>

                           {/* Actions */}
                           <div className="flex items-center gap-3">
                              {/* Split Button (New UI) */}
                              <button 
                              onClick={() => toggleShared(d.tempId)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${d.isShared ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'}`}
                              >
                                 {d.isShared ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                                 Dividir Valor
                              </button>

                              <div className="w-px h-6 bg-zinc-700"></div>

                              <div className="flex items-center gap-1">
                                 <button onClick={() => toggleStatus(d.tempId, 'approved')} className={`p-2 rounded-lg transition-colors ${d.status === 'approved' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10'}`} title="Aprovar">
                                    <Check className="w-4 h-4"/>
                                 </button>
                                 <button onClick={() => toggleStatus(d.tempId, 'rejected')} className={`p-2 rounded-lg transition-colors ${d.status === 'rejected' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-zinc-500 hover:text-red-500 hover:bg-red-500/10'}`} title="Rejeitar">
                                    <Trash2 className="w-4 h-4"/>
                                 </button>
                                 <button onClick={() => startEditing(d)} className="p-2 hover:bg-primary/20 text-zinc-500 hover:text-primary rounded-lg transition-colors" title="Editar">
                                    <Edit2 className="w-4 h-4"/>
                                 </button>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>

               {/* Footer Actions */}
               <div className="p-4 border-t border-zinc-800 bg-surface flex justify-between items-center">
                  <button onClick={() => {setDrafts([]); setStep('upload');}} className="text-sm text-zinc-500 hover:text-white">Fechar</button>
                  <div className="flex items-center gap-3">
                     <span className="text-sm text-zinc-400 mr-2">
                        <strong className="text-emerald-400">{drafts.filter(d => d.status === 'approved').length}</strong> para importar
                     </span>
                     
                     <button 
                        onClick={handleCancelImport}
                        className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl font-medium transition-colors border border-zinc-700"
                     >
                        Cancelar Importação
                     </button>

                     <button 
                        onClick={handleProcess}
                        disabled={drafts.filter(d => d.status === 'approved').length === 0}
                        className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
                     >
                        Processar Importação <ArrowRight className="w-5 h-5"/>
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
               <h3 className="text-lg font-bold text-white mb-2">Confirmar Ação em Massa?</h3>
               <p className="text-zinc-400 text-sm mb-6">
                  {confirmAction.type === 'approve' && "Existem itens rejeitados. Deseja realmente APROVAR todos eles?"}
                  {confirmAction.type === 'reject' && "Existem itens aprovados. Deseja realmente REJEITAR todos eles?"}
                  {confirmAction.type === 'reset' && "Existem itens já classificados. Deseja realmente RESETAR a seleção?"}
               </p>
               <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">Cancelar</button>
                  <button 
                     onClick={() => {
                        if(confirmAction.type === 'approve') executeApproveAll();
                        if(confirmAction.type === 'reject') executeRejectAll();
                        if(confirmAction.type === 'reset') executeResetAll();
                     }} 
                     className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-colors"
                  >
                     Confirmar
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Quick Edit Modal */}
      {editingId && (
         <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
               <h3 className="text-lg font-bold text-white mb-4">Editar Transação</h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs text-zinc-500">Descrição</label>
                     <input 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white"
                        value={editForm.origin || ''}
                        onChange={e => setEditForm({...editForm, origin: e.target.value})}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs text-zinc-500">Valor</label>
                        <input 
                           className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white"
                           type="text"
                           inputMode="numeric"
                           value={editAmountDisplay}
                           onChange={e => {
                               const formatted = formatCurrencyInput(e.target.value);
                               setEditAmountDisplay(formatted);
                               setEditForm({...editForm, amount: parseCurrencyToNumber(formatted)});
                           }}
                        />
                     </div>
                     <div>
                        <label className="text-xs text-zinc-500">Data</label>
                        <input 
                           type="date"
                           className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white"
                           value={editForm.date?.split('T')[0]}
                           onChange={e => setEditForm({...editForm, date: new Date(e.target.value).toISOString()})}
                        />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs text-zinc-500">Categoria</label>
                     <select 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white"
                        value={editForm.category}
                        onChange={e => setEditForm({...editForm, category: e.target.value})}
                     >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                  </div>
                  <div className="flex gap-2 mt-2">
                     <button onClick={() => setEditingId(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300">Cancelar</button>
                     <button onClick={saveEdit} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold flex justify-center items-center gap-2">
                        <Save className="w-4 h-4"/> Salvar
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};