import React, { useState, useEffect } from 'react';
import { useStore } from './hooks/useStore';
import Dashboard from './pages/Dashboard';
import Recommend from './pages/Recommend';
import Matches from './pages/Matches';
import Heroes from './pages/Heroes';
import Players from './pages/Players';
import Settings from './pages/Settings';
import { LayoutDashboard, Sparkles, History, Sword, Users, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

export default function App() {
  const { loadAllData, isLoading, settings } = useStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'recommend' | 'matches' | 'heroes' | 'players' | 'settings'>('dashboard');

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Apply dark mode theme class to HTML/Body
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'recommend':
        return <Recommend />;
      case 'matches':
        return <Matches />;
      case 'heroes':
        return <Heroes />;
      case 'players':
        return <Players />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-violet-900/50" />
          <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
        </div>
        <h3 className="text-sm font-black tracking-wider text-violet-400 animate-pulse">
          INITIALIZING DICE THRONE COMPANION
        </h3>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner (Desktop / Large View) */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-900 sticky top-0 z-40 px-4 py-3 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-950/50 text-white font-black text-sm">
            DT
          </div>
          <div>
            <span className="font-black text-sm tracking-wide text-white">DICE THRONE</span>
            <span className="text-[10px] text-violet-400 font-bold block -mt-1 tracking-widest uppercase">Companion</span>
          </div>
        </div>

        {/* Desktop Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 border border-slate-850 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('recommend')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'recommend' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Recommend
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matches' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Matches
          </button>
          <button
            onClick={() => setActiveTab('heroes')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'heroes' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sword className="w-3.5 h-3.5" /> Heroes
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'players' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Players
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'settings' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Settings
          </button>
        </nav>

        {/* Offline Badge status */}
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/50 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3 h-3" /> Offline Enabled
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">
        {renderActivePage()}
      </main>

      {/* Bottom Navigation (Mobile View) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-900/60 grid grid-cols-6 py-2 px-1 z-40">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'dashboard' ? 'text-violet-500 scale-[1.05]' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('recommend')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'recommend' ? 'text-violet-500 scale-[1.05]' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Recommend</span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'matches' ? 'text-violet-500 scale-[1.05]' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Matches</span>
        </button>

        <button
          onClick={() => setActiveTab('heroes')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'heroes' ? 'text-violet-500 scale-[1.05]' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <Sword className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Heroes</span>
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'players' ? 'text-violet-500 scale-[1.05]' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Players</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center transition-all ${
            activeTab === 'settings' ? 'text-violet-500 scale-[1.05]' : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Settings</span>
        </button>
      </nav>
    </div>
  );
}
