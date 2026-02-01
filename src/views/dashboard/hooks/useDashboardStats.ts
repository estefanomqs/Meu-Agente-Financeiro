import { useMemo } from 'react';
import { AppData } from '../../../types';
import { getEffectiveAmount, getInstallmentValue, getInstallmentDates } from '../../../utils';

export const useDashboardStats = (data: AppData, dashboardDate: Date) => {

    // --- MAIN STATS (Income, Expense, Balance) ---
    const stats = useMemo(() => {
        const targetMonth = dashboardDate.getMonth();
        const targetYear = dashboardDate.getFullYear();
        const nextMonthDate = new Date(dashboardDate);
        nextMonthDate.setMonth(targetMonth + 1);
        const nextMonth = nextMonthDate.getMonth();
        const nextYear = nextMonthDate.getFullYear();

        let income = 0;
        let cashExpenses = 0;
        let commitments = 0;
        let nextCommitments = 0;

        data.transactions.forEach(t => {
            const amount = getEffectiveAmount(t);
            const isCredit = t.paymentMethod === 'Crédito';
            const foundSettings = data.accountSettings.find(s => s.accountId === t.account);
            const settings = foundSettings || (isCredit ? { accountId: t.account, closingDay: 1, dueDay: 10 } : undefined);
            const isMatch = (d: Date, m: number, y: number) => d.getMonth() === m && d.getFullYear() === y;

            if (t.type === 'income') {
                const dates = getInstallmentDates(t, settings);
                dates.forEach(d => {
                    if (isMatch(d, targetMonth, targetYear)) income += (t.installmentsTotal ? getInstallmentValue(t) : amount);
                });
            } else {
                const installmentValue = t.installmentsTotal ? getInstallmentValue(t) : amount;
                const dates = getInstallmentDates(t, settings);
                dates.forEach(d => {
                    if (isMatch(d, targetMonth, targetYear)) {
                        if (isCredit) commitments += installmentValue;
                        else cashExpenses += installmentValue;
                    }
                    if (isMatch(d, nextMonth, nextYear)) {
                        if (isCredit) nextCommitments += installmentValue;
                    }
                });
            }
        });

        const totalExpenses = cashExpenses + commitments;
        const balance = income - totalExpenses;
        const expenseRatio = income > 0 ? Math.min((totalExpenses / income) * 100, 100) : (totalExpenses > 0 ? 100 : 0);

        return { income, cashExpenses, commitments, nextCommitments, totalExpenses, balance, expenseRatio };
    }, [data.transactions, data.accountSettings, dashboardDate]);


    // --- CREDIT HORIZON LOGIC ---
    const creditStats = useMemo(() => {
        const today = new Date();
        const m0 = today.getMonth();
        const y0 = today.getFullYear();

        const m1Date = new Date(y0, m0 + 1, 1);
        const m2Date = new Date(y0, m0 + 2, 1);

        let bill0 = 0;
        let bill1 = 0;
        let bill2 = 0;

        data.transactions.forEach(t => {
            if (t.paymentMethod !== 'Crédito') return;

            const amount = getInstallmentValue(t);
            const foundSettings = data.accountSettings.find(s => s.accountId === t.account);
            const settings = foundSettings || { accountId: t.account, closingDay: 1, dueDay: 10 };
            const dates = getInstallmentDates(t, settings);

            dates.forEach(d => {
                if (d.getMonth() === m0 && d.getFullYear() === y0) bill0 += amount;
                if (d.getMonth() === m1Date.getMonth() && d.getFullYear() === m1Date.getFullYear()) bill1 += amount;
                if (d.getMonth() === m2Date.getMonth() && d.getFullYear() === m2Date.getFullYear()) bill2 += amount;
            });
        });

        // Danger Logic
        const currentDay = today.getDate();
        const isDanger = currentDay > 20 && bill1 > (bill0 * 0.7) && bill0 > 0;

        return { bill0, bill1, bill2, isDanger };
    }, [data.transactions, data.accountSettings]);

    return { stats, creditStats };
};
