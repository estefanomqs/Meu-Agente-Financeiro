import React from 'react';
import { LayoutDashboard, CreditCard, Calendar, Target, PieChart as PieIcon, LogOut, Plus as PlusIcon } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface NavProps {
  view: ViewState;
  setView: (v: ViewState) => void;
}

export const Sidebar: React.FC<NavProps> = ({ view, setView }) => {
  const { logout } = useAuth();

  const items: { id: ViewState, icon: any, label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Resumo' },
    { id: 'transactions', icon: CreditCard, label: 'Extrato' },
    { id: 'calendar', icon: Calendar, label: 'Agenda' },
    { id: 'goals', icon: Target, label: 'Cofres' },
    { id: 'budgets', icon: PieIcon, label: 'Orçamentos' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-surface border-r border-zinc-800 flex flex-col p-4 z-40 hidden md:flex">
      <div className="text-2xl font-bold text-white mb-10 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg"></div>
        <span className="hidden md:block">Zenith</span>
      </div>
      <div className="space-y-2 flex-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === item.id
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="hidden md:block">{item.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={logout}
        className="w-full flex items-center gap-3 p-3 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all mt-auto"
      >
        <LogOut className="w-5 h-5" />
        <span className="hidden md:block">Sair</span>
      </button>
    </nav>
  );
};

interface MobileNavProps extends NavProps {
  onOpenActionSheet: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ view, setView, onOpenActionSheet }) => {
  return (
    <>
      {/* Spacer to prevent content from being hidden behind dock */}
      <div className="h-24 md:hidden" />

      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl p-2 px-6 flex items-center justify-between z-50 ring-1 ring-white/10">
        <button
          onClick={() => setView('dashboard')}
          className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'text-primary bg-primary/10' : 'text-zinc-500 hover:text-white'}`}
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>

        <button
          onClick={() => setView('transactions')}
          className={`p-3 rounded-xl transition-all ${view === 'transactions' ? 'text-primary bg-primary/10' : 'text-zinc-500 hover:text-white'}`}
        >
          <CreditCard className="w-6 h-6" />
        </button>

        {/* Central Action Button */}
        <div className="-mt-8 relative group">
          <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full group-hover:bg-primary/60 transition-all"></div>
          <button
            onClick={onOpenActionSheet}
            className="relative w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
          >
            <PlusIcon className="w-7 h-7" />
          </button>
        </div>

        <button
          onClick={() => setView('budgets')}
          className={`p-3 rounded-xl transition-all ${view === 'budgets' ? 'text-primary bg-primary/10' : 'text-zinc-500 hover:text-white'}`}
        >
          <PieIcon className="w-6 h-6" />
        </button>

        <button
          onClick={() => setView('goals')}
          className={`p-3 rounded-xl transition-all ${view === 'goals' ? 'text-primary bg-primary/10' : 'text-zinc-500 hover:text-white'}`}
        >
          <Target className="w-6 h-6" />
        </button>
      </div>
    </>
  );
};