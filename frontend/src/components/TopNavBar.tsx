import React from 'react';
import { TabType } from '../types';

interface TopNavBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'analytics', label: 'Dashboard' },
    { id: 'diagnosis', label: 'Diagnosis' },
    { id: 'review_log', label: 'Review Log' },
  ];

  return (
    <nav className="bg-[#0f131d]/90 backdrop-blur-md flex justify-between items-center w-full px-6 h-14 fixed top-0 z-50 border-b border-[#3d494e]/25">
      <div className="flex items-center gap-10">
        <button
          onClick={() => onSelectTab('analytics')}
          className="flex items-center gap-2 focus:outline-none"
        >
          <span className="font-bold text-xl tracking-tight text-[#68d6ff] drop-shadow-[0_0_12px_rgba(104,214,255,0.3)]">
            NetSage AI
          </span>
        </button>

        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                  ? 'bg-[#68d6ff]/10 text-[#68d6ff] font-semibold'
                  : 'text-[#869399] hover:text-[#dfe2f1] hover:bg-white/5'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#869399]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
        <span>AI Engine Online</span>
      </div>
    </nav>
  );
};
