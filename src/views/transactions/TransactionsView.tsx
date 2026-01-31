import React, { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { AppData, Transaction } from '../../types';
import { useFinanceStore } from '../../hooks/useFinanceStore';
import { AccountSettingsModal } from '../../components/AccountSettingsModal';

// Hooks
import { useTransactionsData } from '../../hooks/useTransactionsData';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useSmartScroll } from '../../hooks/useSmartScroll';

// Services
import { exportTransactionsToExcel } from '../../services/transactionExportService';

// Components
import { MonthSelector } from './components/MonthSelector';
import { DashboardChart } from './components/DashboardChart';
import { SummaryCards } from './components/SummaryCards';
import { FilterBar } from './components/FilterBar';
import { CreditCardCarousel } from './components/CreditCardCarousel';
import { TransactionList } from './components/TransactionList';

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
    const { updateAccountSettings } = useFinanceStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // State Principal
    const [currentDate, setCurrentDate] = useState(new Date());
    const [deferredDate, setDeferredDate] = useState(new Date());

    useEffect(() => {
        const handler = setTimeout(() => {
            setDeferredDate(currentDate);
        }, 500); // 500ms debounce for list rendering
        return () => clearTimeout(handler);
    }, [currentDate]);

    // Filters
    const [filterCategory, setFilterCategory] = useState('Todas');
    const [filterAccount, setFilterAccount] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // UI State
    const [showChart, setShowChart] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

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

    // --- CUSTOM HOOKS ---
    const {
        monthsList,
        uniqueTags,
        chartData,
        summary,
        groupedTransactions
    } = useTransactionsData({
        data,
        deferredDate,
        currentDate,
        filterCategory,
        filterAccount,
        searchTerm,
        selectedTag
    });

    const { isScrolled, listStartRef, monthsContainerRef, hasInitialScrolled } = useSmartScroll(currentDate);

    const handleMonthChange = (direction: 'next' | 'prev') => {
        if (direction === 'prev') {
            const prev = new Date(currentDate);
            prev.setMonth(prev.getMonth() - 1);
            setCurrentDate(prev);
            monthsContainerRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
        } else {
            const next = new Date(currentDate);
            next.setMonth(next.getMonth() + 1);
            setCurrentDate(next);
            monthsContainerRef.current?.scrollBy({ left: 100, behavior: 'smooth' });
        }
    };

    const { mainContentRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
        onSwipe: handleMonthChange
    });

    // Scroll to center month (Wait, useSmartScroll doesn't do this, the original component did)
    // I missed logic from lines 130-160 in original ("Auto-scroll e Centralização do Mês Selecionado").
    // I should add it here since it relies on DOM refs (monthsContainerRef) and state (currentDate).
    // Or I could have put it in useSmartScroll or a new useMonthNavigation hook.
    // I'll put it here to keep it simple as it's UI behavior.
    // Actually, `monthsList` is needed.

    React.useLayoutEffect(() => {
        const scrollToCenter = () => {
            const index = monthsList.findIndex(d =>
                d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
            );

            if (index !== -1) {
                const activeBtn = document.getElementById(`month-btn-${index}`);
                if (activeBtn && monthsContainerRef.current) {
                    const behavior = hasInitialScrolled.current ? 'smooth' : 'auto';
                    activeBtn.scrollIntoView({
                        behavior: behavior,
                        block: 'nearest',
                        inline: 'center'
                    });
                    hasInitialScrolled.current = true;
                }
            }
        };

        scrollToCenter();
        requestAnimationFrame(() => scrollToCenter());
    }, [currentDate, monthsList, hasInitialScrolled]); // hasInitialScrolled from useSmartScroll (shared ref)


    // Handlers
    const handleExport = (period: 'month' | 'year' | 'all') => {
        exportTransactionsToExcel(data, currentDate, period)
            .then(() => setShowExportMenu(false))
            .catch(err => alert("Erro ao exportar: " + err));
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
            return newSet;
        });
    };

    return (
        <div className="min-h-screen bg-background pb-24 relative">

            {/* 1. HEADER DE COMANDO (Premium Sticky) */}
            <div className={`sticky top-0 z-40 w-full backdrop-blur-xl border-b transition-all duration-300 ease-in-out shadow-black/20 overflow-hidden
            ${isScrolled
                    ? 'bg-zinc-950/95 border-zinc-700/50 shadow-xl'
                    : 'bg-background/80 border-white/5 shadow-2xl'}
         `}>
                {/* CONTEÚDO ANIMADO (SWIPE) */}
                <div
                    ref={mainContentRef}
                    className="will-change-transform touch-pan-y w-full"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <MonthSelector
                        monthsList={monthsList}
                        currentDate={currentDate}
                        setCurrentDate={setCurrentDate}
                        monthsContainerRef={monthsContainerRef}
                        showChart={showChart}
                        setShowChart={setShowChart}
                        showExportMenu={showExportMenu}
                        setShowExportMenu={setShowExportMenu}
                        handleExport={handleExport}
                        exportMenuRef={exportMenuRef}
                    />

                    <div className="w-full">
                        <DashboardChart
                            chartData={chartData}
                            showChart={showChart}
                            isScrolled={isScrolled}
                        />

                        <SummaryCards
                            summary={summary}
                            isScrolled={isScrolled}
                            privacyMode={privacyMode}
                        />
                    </div>
                </div>

                {/* Filtros e Busca (Dentro do Sticky) */}
                <FilterBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    uniqueTags={uniqueTags}
                    selectedTag={selectedTag}
                    setSelectedTag={setSelectedTag}
                />
            </div>

            {/* 2. MEUS CARTÕES (Carousel) */}
            <CreditCardCarousel
                accountSettings={data.accountSettings}
                onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* 3. LISTA DE TRANSAÇÕES */}
            <div className="relative min-h-[50vh]">
                <div className={`
               absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] flex items-start justify-center pt-20 transition-opacity duration-300
               ${currentDate !== deferredDate ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Atualizando...</span>
                    </div>
                </div>

                <TransactionList
                    groupedTransactions={groupedTransactions}
                    listStartRef={listStartRef}
                    privacyMode={privacyMode}
                    onDeleteTransaction={onDeleteTransaction}
                    onEditTransaction={onEditTransaction}
                    selectedIds={selectedIds}
                    onSelect={toggleSelection}
                    currentDate={currentDate}
                />
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
