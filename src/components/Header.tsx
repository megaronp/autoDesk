import React, { useState } from 'react';
import {
  Car,
  ChevronDown,
  Plus,
  Bell,
  BellRing,
  LogOut,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVehicles } from '../context/VehicleContext';
import { requestNotificationPermission } from '../utils/notifications';

interface HeaderProps {
  onOpenNewVehicle: () => void;
  onOpenShareModal: () => void;
  onOpenVehicleModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewVehicle,
  onOpenShareModal,
  onOpenVehicleModal,
}) => {
  const { user, profile, signOut } = useAuth();
  const { vehicles, activeVehicle, setActiveVehicleId, alerts } = useVehicles();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const handleToggleNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifGranted(res === 'granted');
  };

  const hasUrgentAlert = alerts.some((a) => a.urgency === 'critical');

  return (
    <header className="sticky top-0 z-40 bg-[#07080a] border-b border-slate-800/80 px-3 sm:px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Logo with matching dark background and increased height */}
        <div className="flex items-center flex-shrink-0">
          <img
            src="/assets/aistudio/file_000000007a38820eb3e55d584a0cb79f_f363a66d.png"
            alt="AutoCheck"
            className="h-9 sm:h-11 w-auto object-contain block"
          />
        </div>

        {/* Center: Vehicle Switcher (Compact: Name & Plate only) */}
        {activeVehicle ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-left transition-colors active:scale-98"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: activeVehicle.color ? '#f97316' : '#38bdf8' }}
              />
              <div className="flex items-center gap-1.5 min-w-0 max-w-[115px] sm:max-w-[160px]">
                <span className="text-xs font-bold text-white truncate">
                  {activeVehicle.name}
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-semibold px-1 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 uppercase flex-shrink-0">
                  {activeVehicle.plate}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 flex-shrink-0" />
            </button>

            {/* Dropdown Menu - Viewport clamped so it NEVER goes off screen on mobile */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-2xs sm:bg-transparent sm:backdrop-blur-none"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="fixed left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-full mt-1.5 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[82vh] flex flex-col">
                  <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                    <span>Meus Veículos ({vehicles.length})</span>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenShareModal();
                      }}
                      className="text-orange-600 hover:text-orange-700 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Família
                    </button>
                  </div>

                  <div className="overflow-y-auto space-y-1 py-1 max-h-60">
                    {vehicles.map((v) => {
                      const isSelected = v.id === activeVehicle.id;
                      const isOwner = v.ownerId === user?.uid;
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setActiveVehicleId(v.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                            isSelected
                              ? 'bg-orange-50/90 border border-orange-200 text-slate-900 font-medium'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
                              <Car className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 truncate">{v.name}</p>
                                <span className="text-[10px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {v.plate}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                {v.brand} {v.model} • {v.currentMileage.toLocaleString('pt-BR')} km
                              </p>
                              {!isOwner && (
                                <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                  Compartilhado
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-1 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenNewVehicle();
                      }}
                      className="w-full py-2 px-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Novo Carro
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenVehicleModal();
                      }}
                      className="w-full py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      Editar Atual
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenNewVehicle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Veículo</span>
          </button>
        )}

        {/* Right Actions: Notifications & User Profile (Removed Share button as requested) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleToggleNotifications}
            title={notifGranted ? 'Notificações ativadas' : 'Ativar notificações push'}
            className={`p-2 rounded-xl border transition-all relative ${
              hasUrgentAlert
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-400'
                : notifGranted
                ? 'bg-slate-900 border-slate-800 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {hasUrgentAlert ? <BellRing className="w-4 h-4 text-rose-400 animate-pulse" /> : <Bell className="w-4 h-4" />}
            {hasUrgentAlert && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
            )}
          </button>

          {/* User profile / Log out */}
          <div className="flex items-center gap-1 pl-0.5">
            <div
              className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 font-bold text-xs flex items-center justify-center border border-orange-500/30"
              title={profile?.email || user?.email || ''}
            >
              {profile?.name?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button
              onClick={signOut}
              title="Sair da conta"
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
