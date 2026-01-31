import React from 'react';
import { BarChart as BarChartIcon, FileSpreadsheet, Calendar, Layers, FileText } from 'lucide-react';

interface MonthSelectorProps {
    monthsList: Date[];
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    monthsContainerRef: React.RefObject<HTMLDivElement>;
    showChart: boolean;
    setShowChart: (show: boolean) => void;
    showExportMenu: boolean;
    setShowExportMenu: (show: boolean) => void;
    handleExport: (period: 'month' | 'year' | 'all') => void;
    exportMenuRef: React.RefObject<HTMLDivElement>;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
    monthsList,
    currentDate,
    setCurrentDate,
    monthsContainerRef,
    showChart,
    setShowChart,
    showExportMenu,
    setShowExportMenu,
    handleExport,
    exportMenuRef
}) => {
    return (
        <div className="flex items-center justify-between pl-2 pr-4 py-2">
            {/* Month Selector Wrapper */}
            <div className="flex-1 overflow-hidden md:overflow-x-auto">
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
    );
};
