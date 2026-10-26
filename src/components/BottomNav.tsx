import React from 'react';
import { LayoutDashboard, Fuel, Wrench, History, Users } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';

export type TabType = 'dashboard' | 'fuel' | 'maintenance' | 'history' | 'share';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { alerts, activeVehicle } = useVehicles();
  const alertCount = alerts.length;

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Painel', icon: LayoutDashboard },
    { id: 'fuel' as TabType, label: 'Abastecer', icon: Fuel },
    { id: 'maintenance' as TabType, label: 'Manutenção', icon: Wrench, badge: alertCount },
    { id: 'history' as TabType, label: 'Histórico', icon: History },
    { id: 'share' as TabType, label: 'Família', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 pb-safe shadow-xs">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors relative ${
                isActive
                  ? 'text-orange-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105 text-orange-600' : ''}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 min-w-[16px] text-[10px] font-bold rounded-full bg-rose-600 text-white flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate ${isActive ? 'font-bold text-orange-600' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
