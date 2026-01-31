import { useMemo } from 'react';
import { Transaction, AppData } from '../types';
import { getEffectiveAmount, getInstallmentValue, getEstimatedPaymentDate } from '../utils';

interface UseTransactionsDataProps {
    data: AppData;
    deferredDate: Date; // Usado para lista (performance)
    currentDate: Date;  // Usado para gráfico e resumo (feedback instantâneo)
    filterCategory: string;
    filterAccount: string;
    searchTerm: string;
    selectedTag: string | null;
}

export const useTransactionsData = ({
    data,
    deferredDate,
    currentDate,
    filterCategory,
    filterAccount,
    searchTerm,
    selectedTag
}: UseTransactionsDataProps) => {

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

    // --- HELPERS DE DATA ---
    const getDisplayDate = (t: Transaction): Date => {
        if (t.paymentMethod !== 'Crédito') {
            const d = new Date(t.date);
            if (t.date.length === 10) d.setHours(12, 0, 0, 0);
            return d;
        }
        const settings = data.accountSettings.find(a => a.accountId === t.account);
        if (settings) {
            return getEstimatedPaymentDate(t.date, settings);
        }
        const d = new Date(t.date);
        if (t.date.length === 10) d.setHours(12, 0, 0, 0);
        return d;
    };

    const getOriginalDate = (t: Transaction): Date => {
        const d = new Date(t.date);
        if (t.date.length === 10) d.setHours(12, 0, 0, 0);
        return d;
    };

    const getBillingDate = (t: Transaction): Date => {
        if (t.paymentMethod === 'Crédito') {
            const settings = data.accountSettings.find(a => a.accountId === t.account);
            if (settings) return getEstimatedPaymentDate(t.date, settings);
        }
        return getOriginalDate(t);
    };

    // 3. Dados do Gráfico (Panorama de 6 meses)
    const chartData = useMemo(() => {
        const totals: Record<string, number> = {};

        data.transactions.forEach(t => {
            if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal <= 1) {
                const tDate = getDisplayDate(t);
                if (t.type === 'expense') {
                    const key = `${tDate.getFullYear()}-${tDate.getMonth()}`;
                    totals[key] = (totals[key] || 0) + getEffectiveAmount(t);
                }
            } else {
                const total = t.installmentsTotal || 1;
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

    // 4a. Resumo (Calculado com currentDate)
    const summary = useMemo(() => {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);

        let totalIncome = 0;
        let totalExpense = 0;

        data.transactions.forEach(t => {
            const baseBillingDate = getBillingDate(t);

            if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal <= 1) {
                if (baseBillingDate >= start && baseBillingDate <= end) {
                    const val = getEffectiveAmount(t);
                    if (t.type === 'income') totalIncome += val; else totalExpense += val;
                }
            } else {
                const val = getInstallmentValue(t);
                for (let i = 0; i < t.installmentsTotal; i++) {
                    const currentBillingDate = new Date(baseBillingDate);
                    currentBillingDate.setMonth(baseBillingDate.getMonth() + i);
                    if (currentBillingDate >= start && currentBillingDate <= end) {
                        if (t.type === 'income') totalIncome += val; else totalExpense += val;
                    }
                }
            }
        });

        return { income: totalIncome, expense: totalExpense, balance: totalIncome - Math.abs(totalExpense) };
    }, [data.transactions, currentDate]);

    // 4b. Lista de Transações (Calculada com deferredDate)
    const groupedTransactions = useMemo(() => {
        const start = new Date(deferredDate.getFullYear(), deferredDate.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(deferredDate.getFullYear(), deferredDate.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);

        let rawList: { t: Transaction, isGhost: boolean, ghostIndex?: number, overrideAmount?: number, sortDate: number, displayDate: number }[] = [];
        const searchLower = searchTerm.toLowerCase();

        data.transactions.forEach(t => {
            const matchesSearch = !searchTerm ||
                t.origin.toLowerCase().includes(searchLower) ||
                t.category.toLowerCase().includes(searchLower) ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchLower)));

            const matchesTag = !selectedTag || (t.tags && t.tags.includes(selectedTag));

            if (!matchesSearch || !matchesTag) return;
            if (filterCategory !== 'Todas' && t.category !== filterCategory) return;
            if (filterAccount !== 'Todos' && t.account !== filterAccount) return;

            const originalDate = getOriginalDate(t);
            const baseBillingDate = getBillingDate(t);

            if (!t.isInstallment || !t.installmentsTotal || t.installmentsTotal <= 1) {
                if (baseBillingDate >= start && baseBillingDate <= end) {
                    rawList.push({
                        t,
                        isGhost: false,
                        sortDate: originalDate.getTime(),
                        displayDate: originalDate.getTime()
                    });
                }
            } else {
                const val = getInstallmentValue(t);
                for (let i = 0; i < t.installmentsTotal; i++) {
                    const currentBillingDate = new Date(baseBillingDate);
                    currentBillingDate.setMonth(baseBillingDate.getMonth() + i);

                    if (currentBillingDate >= start && currentBillingDate <= end) {
                        rawList.push({
                            t,
                            isGhost: i > 0,
                            ghostIndex: i + 1,
                            overrideAmount: val,
                            sortDate: originalDate.getTime(),
                            displayDate: originalDate.getTime()
                        });
                    }
                }
            }
        });

        rawList.sort((a, b) => b.sortDate - a.sortDate);

        const groups: Record<string, typeof rawList> = {};
        rawList.forEach(item => {
            const dateObj = new Date(item.sortDate);
            const dateKey = dateObj.toLocaleDateString('pt-BR').split('/').reverse().join('-');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(item);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [data.transactions, deferredDate, filterCategory, filterAccount, searchTerm, selectedTag]);

    return {
        monthsList,
        uniqueTags,
        chartData,
        summary,
        groupedTransactions
    };
};
