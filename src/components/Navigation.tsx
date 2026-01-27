import React from 'react';
import { LayoutDashboard, CreditCard, Calendar, Target, PieChart as PieIcon, LogOut } from 'lucide-react';
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
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
              view === item.id 
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

export const MobileNav: React.FC<NavProps> = ({ view, setView }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-zinc-800 p-4 flex justify-around z-50">
       <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'text-primary' : 'text-zinc-500'}><LayoutDashboard /></button>
       <button onClick={() => setView('transactions')} className={view === 'transactions' ? 'text-primary' : 'text-zinc-500'}><CreditCard /></button>
       <button onClick={() => setView('budgets')} className={view === 'budgets' ? 'text-primary' : 'text-zinc-500'}><PieIcon /></button>
    </div>
  );
};