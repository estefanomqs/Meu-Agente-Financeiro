import React, { useState, useMemo, useLayoutEffect, useRef, useEffect } from 'react';
import { FileSpreadsheet, MessageCircle, CheckSquare, Square, Trash2, Search, Filter, Tag, ChevronLeft, ChevronRight, Calendar, BarChart as BarChartIcon, Download, FileText, Layers, TrendingUp, TrendingDown, Wallet, CreditCard, Sparkles } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Buffer } from 'buffer';

// Polyfill for ExcelJS in browser
if (typeof window !== 'undefined') {
   window.Buffer = window.Buffer || Buffer;
}
import { Transaction, AppData } from '../types';
import { getEffectiveAmount, getInstallmentValue, getEstimatedPaymentDate, formatCurrency, getAccountColor, getCategoryColor } from '../utils';
import { TransactionRow } from '../components/TransactionRow';
import { useFinanceStore } from '../hooks/useFinanceStore';
import { AccountSettingsModal } from '../components/AccountSettingsModal';

interface TransactionsViewProps {
   data: AppData;
   privacyMode: boolean;
   onEditTransaction: (t: Transaction) => void;
   onDeleteTransaction: (id: string) => void;
   onExportCSV: (items: any[]) => void;
   onWhatsApp: (items: any[], start: string, end: string) => void;
   onBulkDelete: (ids: Set<string>) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
   data, privacyMode, onEditTransaction, onDeleteTransaction, onExportCSV, onWhatsApp, onBulkDelete
}) => {
   const { updateAccountSettings, deleteAccountSettings } = useFinanceStore();
   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
   // State Principal: Data Selecionada (Mês/Ano)
   const [currentDate, setCurrentDate] = useState(new Date());

   // Filters
   const [filterCategory, setFilterCategory] = useState('Todas');
   const [filterAccount, setFilterAccount] = useState('Todos');
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedTag, setSelectedTag] = useState<string | null>(null); // Smart Tag Selection
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [showChart, setShowChart] = useState(true);

   // Export Menu State
   const [showExportMenu, setShowExportMenu] = useState(false);
   const exportMenuRef = useRef<HTMLDivElement>(null);

   // Refs for Scrolling
   const monthsContainerRef = useRef<HTMLDivElement>(null);
   const hasInitialScrolled = useRef(false);

   // Close Export Menu on Click Outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
            setShowExportMenu(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);


   // --- DATA PROCESSING ---

   // 1. Gera a lista de meses para navegação (Range: +/- 12 meses)
   const monthsList = useMemo(() => {
      const list = [];
      const today = new Date();
      for (let i = -12; i <= 12; i++) {
         const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
         list.push(d);
      }
      return list;
   }, []);

   // 2. Extrai Tags Únicas (Smart Tags)
   const uniqueTags = useMemo(() => {
      const tags = new Set<string>();
      data.transactions.forEach(t => {
         t.tags?.forEach(tag => tags.add(tag));
      });
      return Array.from(tags).sort();
   }, [data.transactions]);

   // Auto-scroll e Centralização do Mês Selecionado (Native API + RAF)
   useLayoutEffect(() => {
      const scrollToCenter = () => {
         // Encontra o index
         const index = monthsList.findIndex(d =>
            d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
         );

         if (index !== -1) {
            const activeBtn = document.getElementById(`month-btn-${index}`);
            if (activeBtn && monthsContainerRef.current) {
               const behavior = hasInitialScrolled.current ? 'smooth' : 'auto';

               // API Nativa do Browser - Mais confiável em diferentes resoluções
               activeBtn.scrollIntoView({
                  behavior: behavior,
                  block: 'nearest',
                  inline: 'center'
               });

               hasInitialScrolled.current = true;
            }
         }
      };

      // Tenta imediatamente (Layout Effect)
      scrollToCenter();

      // Garante uma segunda tentativa no próximo frame (para Desktop/Layout Shifts)
      requestAnimationFrame(() => scrollToCenter());

   }, [currentDate, monthsList]);

   // --- HELPER DE DATA REAL (CORRIGIDO) ---
   // Determina onde a transação deve aparecer no extrato (DATA CONTÁBIL / FATURA)
   const getDisplayDate = (t: Transaction): Date => {
      // 1. Débito, Pix, Dinheiro -> Data Original
      if (t.paymentMethod !== 'Crédito') {
         const d = new Date(t.date);
         if (t.date.length === 10) d.setHours(12, 0, 0, 0); // Ajuste de fuso
         return d;
      }

      // 2. Crédito -> Data da Fatura (Vencimento Real ou Estimado)
      const settings = data.accountSettings.find(a => a.accountId === t.account);
      if (settings) {
         return getEstimatedPaymentDate(t.date, settings);
      }

      // Fallback
      const d = new Date(t.date);
      if (t.date.length === 10) d.setHours(12, 0, 0, 0);
      return d;
   };

   // 3. Dados do Gráfico (Panorama de 6 meses)
   const chartData = useMemo(() => {
      // Mapa: "YYYY-MM" -> Total
      const totals: Record<string, number> = {};

      // Inicializa 6 meses em volta da data atual
      const rangeStart = new Date(currentDate);
      rangeStart.setMonth(rangeStart.getMonth() - 3);
      const rangeEnd = new Date(currentDate);
      rangeEnd.setMonth(rangeEnd.getMonth() + 3);

      data.transactions.forEach(t => {
         // Logica de projeção para o gráfico
         if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal <= 1) {
            const tDate = getDisplayDate(t);
            if (t.type === 'expense') {
               const key = `${tDate.getFullYear()}-${tDate.getMonth()}`;
               totals[key] = (totals[key] || 0) + getEffectiveAmount(t);
            }
         } else {
            const total = t.installmentsTotal || 1;
            // Para parcelas, a primeira data segue a regra do cartão
            const firstDate = getDisplayDate(t);
            const val = getInstallmentValue(t);

            for (let i = 0; i < total; i++) {
               const instDate = new Date(firstDate);
               instDate.setMonth(firstDate.getMonth() + i);

               if (t.type === 'expense') {
                  const key = `${instDate.getFullYear()}-${instDate.getMonth()}`;
                  totals[key] = (totals[key] || 0) + val;
               }
            }
         }
      });

      // Formata para Recharts
      const dataPoints = [];
      for (let i = -3; i <= 3; i++) {
         const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
         const key = `${d.getFullYear()}-${d.getMonth()}`;
         const isCurrent = i === 0;
         dataPoints.push({
            name: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
            fullDate: d,
            value: totals[key] || 0,
            isCurrent
         });
      }
      return dataPoints;
   }, [data.transactions, currentDate]);

   // 4. Transações do Mês Selecionado (Listing)
   const { groupedTransactions, summary } = useMemo(() => {
      // Intervalo do Mês Selecionado (Baseado na Competência/Fatura)
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);

      let rawList: { t: Transaction, isGhost: boolean, ghostIndex?: number, overrideAmount?: number, sortDate: number, displayDate: number }[] = [];
      const searchLower = searchTerm.toLowerCase();

      // Helper: Data Original da Compra (Fixa visualmente)
      // Ajustamos para meio-dia para evitar shifts de UTC na exibição
      const getOriginalDate = (t: Transaction): Date => {
         const d = new Date(t.date);
         if (t.date.length === 10) d.setHours(12, 0, 0, 0);
         return d;
      };

      // Helper: Data de Cobrança (Filtro)
      // Se for Crédito -> Fatura. Se for Débito -> Compra.
      const getBillingDate = (t: Transaction): Date => {
         if (t.paymentMethod === 'Crédito') {
            const settings = data.accountSettings.find(a => a.accountId === t.account);
            if (settings) {
               return getEstimatedPaymentDate(t.date, settings);
            }
         }
         return getOriginalDate(t);
      };

      data.transactions.forEach(t => {
         // --- Filters Clean ---
         const matchesSearch = !searchTerm ||
            t.origin.toLowerCase().includes(searchLower) ||
            t.category.toLowerCase().includes(searchLower) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchLower)));

         const matchesTag = !selectedTag || (t.tags && t.tags.includes(selectedTag));

         if (!matchesSearch || !matchesTag) return;
         if (filterCategory !== 'Todas' && t.category !== filterCategory) return;
         if (filterAccount !== 'Todos' && t.account !== filterAccount) return;

         // --- DATA PROCESSING ---
         const originalDate = getOriginalDate(t);    // Data Visual (Sempre a da compra)
         const baseBillingDate = getBillingDate(t);  // Data Contábil Base

         if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal <= 1) {
            // Pagamento Único
            // Filtra pela Data de Cobrança (Fatura)
            if (baseBillingDate >= start && baseBillingDate <= end) {
               rawList.push({
                  t,
                  isGhost: false,
                  sortDate: originalDate.getTime(), // Agrupa pela data da compra
                  displayDate: originalDate.getTime()
               });
            }
         } else {
            // Parcelado
            const val = getInstallmentValue(t);

            for (let i = 0; i < t.installmentsTotal; i++) {
               // Projeta a COBRANÇA para o mês 'i'
               const currentBillingDate = new Date(baseBillingDate);
               currentBillingDate.setMonth(baseBillingDate.getMonth() + i);

               // Filtra: Essa parcela cai na fatura deste mês selecionado?
               if (currentBillingDate >= start && currentBillingDate <= end) {
                  // Se sim, mostramos!
                  // Nota: A data visual (sortDate) continua sendo a ORIGINAL da compra.
                  // Isso imita um extrato de cartão: "Compra em 30/Jan - Parcela 2/10"
                  rawList.push({
                     t,
                     isGhost: i > 0,
                     ghostIndex: i + 1,
                     overrideAmount: val,
                     sortDate: originalDate.getTime(), // <--- Mágica: Agrupa no dia da compra
                     displayDate: originalDate.getTime()
                  });
               }
            }
         }
      });

      // Ordenar: Mais recentes primeiro (baseado na data de compra)
      rawList.sort((a, b) => b.sortDate - a.sortDate);

      // Agrupar
      const groups: Record<string, typeof rawList> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      rawList.forEach(item => {
         // Correção de Timezone no Agrupamento
         // Usa a data local 'pt-BR' para gerar a chave 'YYYY-MM-DD'
         const dateObj = new Date(item.sortDate);
         const dateKey = dateObj.toLocaleDateString('pt-BR').split('/').reverse().join('-');

         if (!groups[dateKey]) groups[dateKey] = [];
         groups[dateKey].push(item);

         const val = item.overrideAmount || getEffectiveAmount(item.t);
         if (item.t.type === 'income') totalIncome += val;
         else totalExpense += val;
      });

      const sortedGroups = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));

      return {
         groupedTransactions: sortedGroups,
         summary: { income: totalIncome, expense: totalExpense, balance: totalIncome - Math.abs(totalExpense) }
      };
   }, [data.transactions, currentDate, filterCategory, filterAccount, searchTerm, selectedTag]);


   // --- GESTURES (Swipe Navigation) ---
   const [touchStart, setTouchStart] = useState<number | null>(null);
   const [touchEnd, setTouchEnd] = useState<number | null>(null);
   const minSwipeDistance = 50;

   const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
      setTouchEnd(null);
      if ('touches' in e) {
         setTouchStart(e.targetTouches[0].clientX);
      } else {
         setTouchStart((e as React.MouseEvent).clientX);
      }
   };

   const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
      if ('touches' in e) {
         setTouchEnd(e.targetTouches[0].clientX);
      } else {
         if (touchStart !== null) { // Only track mouse move if dragging
            setTouchEnd((e as React.MouseEvent).clientX);
         }
      }
   };

   const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;

      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
         // Next Month (Swipe Left)
         const next = new Date(currentDate);
         next.setMonth(next.getMonth() + 1);
         setCurrentDate(next);
         monthsContainerRef.current?.scrollBy({ left: 100, behavior: 'smooth' });
      }
      if (isRightSwipe) {
         // Prev Month (Swipe Right)
         const prev = new Date(currentDate);
         prev.setMonth(prev.getMonth() - 1);
         setCurrentDate(prev);
         monthsContainerRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
      }

      setTouchStart(null);
      setTouchEnd(null);
   };

   // --- HANDLERS ---
   const toggleSelection = (id: string) => {
      setSelectedIds(prev => {
         const newSet = new Set(prev);
         if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
         return newSet;
      });
   };

   const selectAll = () => {
      const allIds = new Set<string>();
      groupedTransactions.forEach(([_, items]) => items.forEach(i => !i.isGhost && allIds.add(i.t.id)));
      setSelectedIds(prev => prev.size === allIds.size ? new Set() : allIds);
   };

   const formatDateHeader = (dateString: string) => {
      const date = new Date(dateString + 'T12:00:00');
      return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(date).toUpperCase();
   };

   // --- RICH EXCEL EXPORT (MULTI-SHEET) ---
   const handleExport = async (period: 'month' | 'year' | 'all') => {
      try {
         const workbook = new ExcelJS.Workbook();

         // --- 1. DEFINE RANGE ---
         let start: Date, end: Date;
         if (period === 'month') {
            start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
         } else if (period === 'year') {
            start = new Date(currentDate.getFullYear(), 0, 1);
            end = new Date(currentDate.getFullYear(), 11, 31);
         } else {
            start = new Date(2000, 0, 1);
            end = new Date(2100, 11, 31);
         }
         start.setHours(0, 0, 0, 0);
         end.setHours(23, 59, 59, 999);

         // --- 2. DATA PROCESSING (EXPLODE & GROUP) ---
         const itemsByMonth: Record<string, any[]> = {};
         const summaryByMonth: Record<string, { income: number, expense: number, balance: number }> = {};
         const allMonthsSet = new Set<string>();

         // Helpers
         const getBillingDate = (t: Transaction) => {
            if (t.paymentMethod === 'Crédito') {
               const settings = data.accountSettings.find(a => a.accountId === t.account);
               if (settings) return getEstimatedPaymentDate(t.date, settings);
            }
            const d = new Date(t.date);
            if (t.date.length === 10) d.setHours(12, 0, 0, 0);
            return d;
         };

         const processItem = (t: Transaction, billingDate: Date, descriptionOverride?: string, amountOverride?: number) => {
            if (billingDate < start || billingDate > end) return;

            const monthKey = billingDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }); // "jan 2026"
            const sortKey = `${billingDate.getFullYear()}-${String(billingDate.getMonth() + 1).padStart(2, '0')}`; // "2026-01"

            // Composite key for sorting but display is monthKey
            const groupKey = sortKey + "|" + monthKey;

            if (!itemsByMonth[groupKey]) itemsByMonth[groupKey] = [];
            allMonthsSet.add(groupKey);

            const amt = amountOverride || getEffectiveAmount(t);

            itemsByMonth[groupKey].push({
               date: new Date(t.date).toLocaleDateString('pt-BR'), // Compra original
               billingDateStr: billingDate.toLocaleDateString('pt-BR'), // Cobrança
               category: t.category,
               description: descriptionOverride || t.origin,
               account: t.account,
               amount: amt,
               type: t.type === 'income' ? 'Entrada' : 'Saída',
               billingEpoch: billingDate.getTime()
            });
         };

         data.transactions.forEach(t => {
            const baseBillingDate = getBillingDate(t);

            if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal <= 1) {
               processItem(t, baseBillingDate);
            } else {
               const val = getInstallmentValue(t);
               for (let i = 0; i < t.installmentsTotal; i++) {
                  const iterDate = new Date(baseBillingDate);
                  iterDate.setMonth(baseBillingDate.getMonth() + i);
                  processItem(t, iterDate, `${t.origin} (${i + 1}/${t.installmentsTotal})`, val);
               }
            }
         });

         // --- 3. EXCEL CONSTRUCTION ---
         const sortedKeys = Array.from(allMonthsSet).sort();

         // Helper to Create Styles
         const applyHeaderStyle = (row: ExcelJS.Row) => {
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27272A' } }; // Zinc-800
            row.alignment = { vertical: 'middle', horizontal: 'center' };
         };

         const applyCurrency = (cell: ExcelJS.Cell, isIncome: boolean) => {
            cell.numFmt = '"R$"#,##0.00;[Red]-"R$"#,##0.00';
            cell.font = { color: { argb: isIncome ? 'FF10B981' : 'FFEF4444' }, bold: true };
         };

         // A. SUMMARY SHEET (If Multi-Month)
         if (period !== 'month' && sortedKeys.length > 0) {
            const summarySheet = workbook.addWorksheet('RESUMO GERAL', { pageSetup: { paperSize: 9 } });

            summarySheet.mergeCells('A1:D1');
            const title = summarySheet.getCell('A1');
            title.value = `Resumo Financeiro - ${period === 'year' ? currentDate.getFullYear() : 'Geral'}`;
            title.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF09090B' } };
            title.alignment = { horizontal: 'center', vertical: 'middle' };
            summarySheet.getRow(1).height = 35;

            summarySheet.getRow(2).values = ['Mês / Ano', 'Total Entradas', 'Total Saídas', 'Saldo Líquido'];
            applyHeaderStyle(summarySheet.getRow(2));
            summarySheet.columns = [{ width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];

            let grandTotalIncome = 0;
            let grandTotalExpense = 0;

            sortedKeys.forEach(key => {
               const [_, label] = key.split('|');
               const items = itemsByMonth[key];
               const income = items.filter(i => i.type === 'Entrada').reduce((a, b) => a + b.amount, 0);
               const expense = items.filter(i => i.type === 'Saída').reduce((a, b) => a + b.amount, 0); // expense is usually negative in storage but positive in 'amount' logic here? 
               // Wait, getEffectiveAmount returns negative for expenses? 
               // My processItem logic used getEffectiveAmount. Let's check `getEffectiveAmount`... 
               // Usually it returns signed. But in the visualization I used Math.abs. 
               // Let's assume getEffectiveAmount returns signed.

               // Correction:
               // In `processItem`: `const amt = amountOverride || getEffectiveAmount(t);`
               // `getInstallmentValue` returns positive usually?
               // `getEffectiveAmount` returns signed (- for expense).

               // Let's normalize for the report:
               // In the loop below, I'll use Math.abs because I split columns by type.

               const rowIncome = items.reduce((acc, curr) => curr.type === 'Entrada' ? acc + Math.abs(curr.amount) : acc, 0);
               const rowExpense = items.reduce((acc, curr) => curr.type === 'Saída' ? acc + Math.abs(curr.amount) : acc, 0);
               const balance = rowIncome - rowExpense;

               grandTotalIncome += rowIncome;
               grandTotalExpense += rowExpense;

               const r = summarySheet.addRow([label.toUpperCase(), rowIncome, rowExpense, balance]);
               applyCurrency(r.getCell(2), true);
               applyCurrency(r.getCell(3), false);
               applyCurrency(r.getCell(4), balance >= 0);
            });

            // Grand Total Row
            const totalRow = summarySheet.addRow(['TOTAL GERAL', grandTotalIncome, grandTotalExpense, grandTotalIncome - grandTotalExpense]);
            totalRow.font = { bold: true };
            totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
            applyCurrency(totalRow.getCell(2), true);
            applyCurrency(totalRow.getCell(3), false);
            applyCurrency(totalRow.getCell(4), (grandTotalIncome - grandTotalExpense) >= 0);
         }

         // B. MONTHLY SHEETS
         sortedKeys.forEach(key => {
            const [_, label] = key.split('|');
            // Clean specific chars invalid for sheet names (though month names are usually safe)
            const sheetName = label.toUpperCase().replace(/[\\\/?*\[\]]/g, '');

            const sheet = workbook.addWorksheet(sheetName);
            const items = itemsByMonth[key].sort((a, b) => a.billingEpoch - b.billingEpoch);

            // Title
            sheet.mergeCells('A1:F1');
            const titleRow = sheet.getRow(1);
            titleRow.getCell(1).value = `Extrato - ${label.toUpperCase()}`;
            titleRow.font = { size: 14, bold: true };
            titleRow.height = 30;
            titleRow.alignment = { vertical: 'middle' };

            // Headers
            sheet.getRow(2).values = ['Data Compra', 'Data Cobrança', 'Categoria', 'Descrição', 'Conta', 'Valor'];
            applyHeaderStyle(sheet.getRow(2));
            sheet.columns = [
               { key: 'date', width: 12 },
               { key: 'billing', width: 12 },
               { key: 'cat', width: 15 },
               { key: 'desc', width: 35 },
               { key: 'acc', width: 15 },
               { key: 'val', width: 15 },
            ];

            // Rows
            let mIncome = 0;
            let mExpense = 0;

            items.forEach((item, idx) => {
               const val = item.amount; // Signed
               if (item.type === 'Entrada') mIncome += val; else mExpense += val;

               const r = sheet.addRow([
                  item.date,
                  item.billingDateStr,
                  item.category,
                  item.description,
                  item.account,
                  Math.abs(val) // Display absolute
               ]);

               // Stripe
               if (idx % 2 !== 0) r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F5' } };

               // Color
               const cVal = r.getCell(6);
               cVal.numFmt = '"R$"#,##0.00';
               cVal.font = { color: { argb: item.type === 'Entrada' ? 'FF10B981' : 'FFEF4444' }, bold: true };

               // Center text
               r.getCell(1).alignment = { horizontal: 'center' };
               r.getCell(2).alignment = { horizontal: 'center' };
               r.getCell(5).alignment = { horizontal: 'center' };
            });

            // Total
            const tRow = sheet.addRow(['', '', '', 'TOTAL', '', mIncome + mExpense]); // mExpense is negative
            tRow.font = { bold: true };
            tRow.getCell(4).alignment = { horizontal: 'right' };
            applyCurrency(tRow.getCell(6), (mIncome + mExpense) >= 0);
         });

         // --- 4. DOWNLOAD ---
         const buf = await workbook.xlsx.writeBuffer();
         const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
         saveAs(blob, `Relatorio_Financeiro_${period === 'month' ? currentDate.toLocaleDateString('pt-BR', { month: 'short' }) : period}.xlsx`);
         setShowExportMenu(false);

      } catch (error) {
         console.error("Export failed:", error);
         alert("Erro ao exportar: " + error);
      }
   };

   return (
      <div className="min-h-screen bg-background pb-24 relative">

         {/* 1. HEADER DE COMANDO (Premium Sticky) */}
         <div className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-white/5 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between pl-2 pr-4 py-2">

               {/* Month Selector Wrapper */}
               <div
                  className="flex-1 overflow-hidden"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
               >
                  <div
                     ref={monthsContainerRef}
                     className="flex overflow-x-auto gap-3 px-2 scrollbar-hide snap-x snap-mandatory mask-gradient-right items-center"
                  >
                     {monthsList.map((month, idx) => {
                        const isSelected = month.getMonth() === currentDate.getMonth() && month.getFullYear() === currentDate.getFullYear();
                        return (
                           <button
                              key={idx}
                              id={`month-btn-${idx}`}
                              onClick={() => setCurrentDate(month)}
                              className={`
                                 snap-center shrink-0 flex flex-col items-center justify-center min-w-[70px] py-1.5 rounded-xl transition-all duration-300
                                 ${isSelected ? 'bg-zinc-800/50 scale-100' : 'opacity-40 scale-90 hover:opacity-70'}
                              `}
                           >
                              <span className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? 'text-primary' : 'text-zinc-500'}`}>
                                 {month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                              </span>
                              <span className={`text-[13px] font-medium leading-none mt-0.5 ${isSelected ? 'text-white' : 'text-zinc-600'}`}>
                                 {month.getFullYear()}
                              </span>
                           </button>
                        );
                     })}
                  </div>
               </div>

               {/* Chart Toggle */}
               <button
                  onClick={() => setShowChart(!showChart)}
                  className={`shrink-0 ml-2 w-9 h-9 flex items-center justify-center rounded-xl transition-all ${showChart ? 'bg-primary/10 text-primary' : 'bg-transparent text-zinc-500 hover:bg-zinc-800'}`}
               >
                  <BarChartIcon className="w-4 h-4" />
               </button>

               {/* Export Button (Right Aligned) */}
               <div className="relative shrink-0 ml-2" ref={exportMenuRef}>
                  <button
                     onClick={() => setShowExportMenu(!showExportMenu)}
                     className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all active:scale-95"
                  >
                     <FileSpreadsheet className="w-4 h-4" />
                     <span className="text-xs font-bold hidden md:inline">Exportar</span>
                  </button>

                  {/* Export Menu */}
                  {showExportMenu && (
                     <div className="absolute top-full right-0 mt-3 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                        <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Opções de Relatório</span>
                        </div>
                        <button onClick={() => handleExport('month')} className="w-full text-left px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl flex items-center gap-3 transition-colors">
                           <Calendar className="w-4 h-4 text-zinc-500" />
                           <div>
                              <p className="font-medium">Mês Atual</p>
                              <p className="text-[10px] text-zinc-500">Apenas visualização atual</p>
                           </div>
                        </button>
                        <button onClick={() => handleExport('year')} className="w-full text-left px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl flex items-center gap-3 transition-colors">
                           <Layers className="w-4 h-4 text-zinc-500" />
                           <div>
                              <p className="font-medium">Ano Atual</p>
                              <p className="text-[10px] text-zinc-500">Mês a mês (Abas separadas)</p>
                           </div>
                        </button>
                        <button onClick={() => handleExport('all')} className="w-full text-left px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl flex items-center gap-3 transition-colors">
                           <FileText className="w-4 h-4 text-zinc-500" />
                           <div>
                              <p className="font-medium">Tudo</p>
                              <p className="text-[10px] text-zinc-500">Backup completo</p>
                           </div>
                        </button>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* 2. GRÁFICO (Collapsible) */}
         <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showChart ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="h-48 w-full mt-4 px-2">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                     <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        dy={10}
                     />
                     <Tooltip
                        cursor={{ fill: '#27272a', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => formatCurrency(value, privacyMode)}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '0.25rem' }}
                     />
                     <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                           <Cell
                              key={`cell-${index}`}
                              fill={entry.isCurrent ? '#10b981' : '#3f3f46'} // Emerald for current, Zinc for others
                              fillOpacity={entry.isCurrent ? 1 : 0.3}
                           />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 3. PULSO FINANCEIRO (3 Cards) */}
         <div className="pt-6 px-4 pb-2">
            <div className="grid grid-cols-3 gap-3">
               {/* Entradas */}
               <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-3 flex flex-col justify-between h-24 backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                     <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <TrendingUp className="w-4 h-4" />
                     </div>
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entradas</p>
                     <p className="text-sm font-bold text-emerald-400 truncate">
                        {formatCurrency(summary.income, privacyMode)}
                     </p>
                  </div>
               </div>

               {/* Saídas */}
               <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-3 flex flex-col justify-between h-24 backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                     <div className="p-1.5 bg-red-500/10 rounded-lg text-red-500">
                        <TrendingDown className="w-4 h-4" />
                     </div>
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Saídas</p>
                     <p className="text-sm font-bold text-red-400 truncate">
                        {formatCurrency(Math.abs(summary.expense), privacyMode)}
                     </p>
                  </div>
               </div>

               {/* Saldo */}
               <div className={`
                   rounded-2xl p-3 flex flex-col justify-between h-24 backdrop-blur-sm border
                   ${summary.balance >= 0
                     ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]'
                     : 'bg-red-500/5 border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.2)]'
                  }
                `}>
                  <div className="flex items-start justify-between">
                     <div className={`p-1.5 rounded-lg ${summary.balance >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        <Wallet className="w-4 h-4" />
                     </div>
                  </div>
                  <div>
                     <p className={`text-[10px] font-bold uppercase tracking-wider ${summary.balance >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                        Saldo Líquido
                     </p>
                     <p className={`text-sm font-black truncate ${summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(summary.balance, privacyMode)}
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* 3. MEUS CARTÕES (Carousel) */}
         {data.accountSettings.length > 0 && (
            <div className="pl-4 py-2 flex overflow-x-auto gap-3 scrollbar-hide mask-gradient-right pr-4 mb-2">
               {data.accountSettings.map(acc => {
                  const today = new Date();
                  const closing = new Date(today.getFullYear(), today.getMonth(), acc.closingDay);
                  const due = new Date(today.getFullYear(), today.getMonth(), acc.dueDay);

                  return (
                     <div key={acc.accountId} className="shrink-0 w-36 bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col gap-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        </div>
                        <div className="flex items-center gap-2">
                           <CreditCard className="w-4 h-4 text-zinc-500" />
                           <span className="text-xs font-bold text-zinc-300 truncate">{acc.accountId}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] text-zinc-500 font-medium">Fecha dia {acc.closingDay}</span>
                           <span className="text-[10px] text-zinc-600">Vence dia {acc.dueDay}</span>
                        </div>
                     </div>
                  );
               })}
               {/* Add Card Shortcut */}
 {/* Add Card Shortcut */}
               <button
                  onClick={() => {
                     console.log('Abrindo configurações...');
                     setIsSettingsOpen(true);
                  }}
                  className="shrink-0 w-10 flex items-center justify-center bg-zinc-900/50 border border-zinc-800/50 border-dashed rounded-xl hover:bg-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer"
               >
                  <span className="text-xl text-zinc-500 hover:text-white transition-colors">+</span>
               </button>
            </div>
         )}

         {/* 4. FILTROS E BUSCA (Relocated) */}
         <div className="sticky top-[60px] z-30 px-4 py-2 bg-background/95 backdrop-blur-xl border-b border-zinc-800/50 mb-4 transition-all">
            <div className="flex gap-2">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     placeholder="Buscar..."
                     className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
               </div>

               {uniqueTags.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto max-w-[40%] scrollbar-hide mask-gradient-left-right">
                     {uniqueTags.map(tag => (
                        <button
                           key={tag}
                           onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                           className={`
                               px-2.5 py-1.5 rounded-lg text-[10px] font-medium border whitespace-nowrap transition-all
                               ${selectedTag === tag
                                 ? 'bg-primary text-white border-primary'
                                 : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}
                            `}
                        >
                           #{tag}
                        </button>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* 2. Timeline List */}
         <div className="space-y-6">
            {groupedTransactions.length === 0 ? (
               <div className="py-20 text-center flex flex-col items-center">
                  <Calendar className="w-12 h-12 text-zinc-800 mb-4" />
                  <p className="text-zinc-500">Nenhuma movimentação em {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}.</p>
               </div>
            ) : (
               groupedTransactions.map(([dateKey, items]) => {
                  const dayBalance = items.reduce((acc, curr) => {
                     const val = curr.overrideAmount || getEffectiveAmount(curr.t);
                     return curr.t.type === 'income' ? acc + val : acc - Math.abs(val);
                  }, 0);

                  return (
                     <div key={dateKey} className="relative">
                        <div className="sticky top-[180px] z-20 bg-background/80 backdrop-blur-sm py-2 px-2 border-b border-zinc-800/50 flex justify-between items-center -mx-2">
                           <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                              {formatDateHeader(dateKey)}
                           </h3>
                           <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 ${dayBalance >= 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                              {dayBalance > 0 ? '+' : ''}{dayBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </span>
                        </div>

                        <div className="bg-surface rounded-2xl border border-zinc-800 divide-y divide-zinc-800/50 overflow-hidden shadow-sm mt-2">
                           {items.map((item, idx) => (
                              <TransactionRow
                                 key={`${item.t.id}-${idx}`}
                                 t={item.t}
                                 privacy={privacyMode}
                                 onDeleteClick={onDeleteTransaction}
                                 onEditClick={onEditTransaction}
                                 isGhost={item.isGhost}
                                 ghostIndex={item.ghostIndex}
                                 overrideAmount={item.overrideAmount}
                                 isSelected={selectedIds.has(item.t.id)}
                                 onSelect={toggleSelection}
                                 displayDate={item.sortDate}
                              />
                           ))}
                        </div>
                     </div>
                  );
               })
            )}
         </div>

         {/* Bulk Actions */}
         {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-surfaceHighlight border border-zinc-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in">
               <span className="text-sm font-medium text-white">{selectedIds.size} selecionados</span>
               <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-400 hover:text-white">Cancelar</button>
               <button onClick={() => onBulkDelete(selectedIds)} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-red-600 transition-colors">
                  <Trash2 className="w-3 h-3" /> Excluir
               </button>
            </div>
         )}
         {isSettingsOpen && AccountSettingsModal && (
            <AccountSettingsModal
               isOpen={isSettingsOpen}
               onClose={() => setIsSettingsOpen(false)}
               currentSettings={data.accountSettings || []}
               onSave={updateAccountSettings || (() => console.warn('updateAccountSettings not available'))}
            />
         )}
      </div>
   );
};