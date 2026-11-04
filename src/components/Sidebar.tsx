import React from 'react';
import {
  LayoutDashboard,
  Fuel,
  Wrench,
  History,
  Users,
  Plus,
  Car,
  ChevronDown,
  LogOut,
  Bell,
  BellRing,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { useAuth } from '../context/AuthContext';
import { AutoCheckLogo } from './AutoCheckLogo';
import { TabType } from './BottomNav';
import { requestNotificationPermission } from '../utils/notifications';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenNewVehicle: () => void;
  onOpenVehicleModal: () => void;
  onOpenRefueling: () => void;
  onOpenMaintenance: () => void;
  onOpenShareModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewVehicle,
  onOpenVehicleModal,
  onOpenRefueling,
  onOpenMaintenance,
  onOpenShareModal,
}) => {
  const { user, profile, signOut } = useAuth();
  const { vehicles, activeVehicle, setActiveVehicleId, alerts } = useVehicles();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [notifGranted, setNotifGranted] = React.useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const handleToggleNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifGranted(res === 'granted');
  };

  const alertCount = alerts.length;
  const hasUrgentAlert = alerts.some((a) => a.urgency === 'critical');

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'fuel' as TabType, label: 'Abastecimentos', icon: Fuel },
    { id: 'maintenance' as TabType, label: 'Manutenções & Revisões', icon: Wrench, badge: alertCount },
    { id: 'history' as TabType, label: 'Histórico Completo', icon: History },
    { id: 'share' as TabType, label: 'Família & Compartilhar', icon: Users },
  ];

  const isOwner = activeVehicle ? activeVehicle.ownerId === user?.uid : false;

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 fixed inset-y-0 left-0 bg-[#07080a] border-r border-slate-800/90 z-30 select-none">
      {/* 1. Brand Logo */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <AutoCheckLogo variant="horizontal" theme="dark" size="md" />
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
          PRO
        </span>
      </div>

      {/* 2. Active Vehicle Selector Card */}
      <div className="p-3.5 border-b border-slate-800/70">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 px-1 flex items-center justify-between">
          <span>Veículo Selecionado</span>
          {vehicles.length > 1 && (
            <span className="text-slate-400 font-mono text-[9px]">
              {vehicles.length} carros
            </span>
          )}
        </div>

        {activeVehicle ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: activeVehicle.color ? '#f97316' : '#38bdf8' }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                      {activeVehicle.name}
                    </p>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                      {activeVehicle.plate}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {activeVehicle.brand} {activeVehicle.model} • {activeVehicle.currentMileage.toLocaleString('pt-BR')} km
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ml-1.5 ${dropdownOpen ? 'rotate-180 text-orange-400' : ''}`} />
            </button>

            {/* Dropdown list */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0f1118] border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Meus Veículos</span>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenShareModal();
                      }}
                      className="text-orange-400 hover:text-orange-300 text-[10px] font-bold"
                    >
                      Família
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {vehicles.map((v) => {
                      const isSel = v.id === activeVehicle.id;
                      const isCarOwner = v.ownerId === user?.uid;
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setActiveVehicleId(v.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full p-2 rounded-lg text-left transition-colors flex items-center justify-between text-xs ${
                            isSel
                              ? 'bg-orange-600/20 text-orange-300 font-bold border border-orange-500/30'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{v.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {v.plate} {!isCarOwner && '• Compartilhado'}
                            </p>
                          </div>
                          {isSel && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 border-t border-slate-800 grid grid-cols-2 gap-1 text-[11px]">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenNewVehicle();
                      }}
                      className="py-1.5 px-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-1 text-[11px]"
                    >
                      <Plus className="w-3 h-3" />
                      Novo Carro
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenVehicleModal();
                      }}
                      className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center text-[11px]"
                    >
                      {isOwner ? 'Editar Atual' : 'Ver Detalhes'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenNewVehicle}
            className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Veículo
          </button>
        )}
      </div>

      {/* 3. Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navegação
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                isActive
                  ? 'bg-orange-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && item.badge > 0 ? (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-orange-600'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* Quick Actions Shortcuts in Navigation */}
        <div className="pt-5 px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Ações Rápidas
        </div>

        <button
          onClick={onOpenRefueling}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <div className="p-1 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Fuel className="w-3.5 h-3.5" />
          </div>
          <span>+ Registrar Abastecimento</span>
        </button>

        <button
          onClick={onOpenMaintenance}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <div className="p-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <span>+ Agendar Revisão</span>
        </button>

        <button
          onClick={onOpenNewVehicle}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <div className="p-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            <Car className="w-3.5 h-3.5" />
          </div>
          <span>+ Novo Carro</span>
        </button>
      </nav>

      {/* 4. Footer User Profile & System Status */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#07080a]/90 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 font-bold text-xs flex items-center justify-center border border-orange-500/30 flex-shrink-0">
              {profile?.name?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Usuário'}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleNotifications}
              title={notifGranted ? 'Notificações ativadas' : 'Ativar notificações push'}
              className={`p-1.5 rounded-lg border transition-colors ${
                hasUrgentAlert
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-400'
                  : notifGranted
                  ? 'bg-slate-900 border-slate-800 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {hasUrgentAlert ? <BellRing className="w-3.5 h-3.5 animate-pulse" /> : <Bell className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={signOut}
              title="Sair da conta"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
