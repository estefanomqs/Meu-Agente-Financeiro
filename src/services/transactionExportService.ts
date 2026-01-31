import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AppData, Transaction } from '../types';
import { getEffectiveAmount, getInstallmentValue, getEstimatedPaymentDate } from '../utils';

export const exportTransactionsToExcel = async (
    data: AppData,
    currentDate: Date,
    period: 'month' | 'year' | 'all'
) => {
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

    } catch (error) {
        console.error("Export failed:", error);
        throw error;
    }
};
