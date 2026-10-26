import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  Calendar,
  Store,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { Maintenance } from '../types/vehicle';
import { formatCurrency, formatDate } from '../utils/calculations';

interface MaintenanceTabProps {
  onOpenNewMaintenance: () => void;
  onCompleteMaintenance: (m: Maintenance) => void;
}

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({
  onOpenNewMaintenance,
  onCompleteMaintenance,
}) => {
  const { activeVehicle, maintenances, deleteMaintenance, alerts } = useVehicles();
  const [subTab, setSubTab] = useState<'pending' | 'completed'>('pending');

  if (!activeVehicle) return null;

  const pendingList = maintenances
    .filter((m) => m.status === 'pending')
    .sort((a, b) => (a.dueMileage || 999999) - (b.dueMileage || 999999));

  const completedList = maintenances
    .filter((m) => m.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  const totalSpentOnMaintenance = completedList.reduce((sum, m) => sum + (m.completedCost || 0), 0);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja excluir esta manutenção?')) {
      await deleteMaintenance(id);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner & Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-orange-600">
              Controle Preventivo
            </span>
            <h2 className="text-lg font-bold text-slate-900">Revisões & Manutenção</h2>
          </div>
          <button
            onClick={onOpenNewMaintenance}
            className="py-2 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Revisão
          </button>
        </div>

        {/* 2 Stat Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">Pendentes / Alertas</span>
            <div className="flex items-baseline justify-center gap-1 mt-0.5">
              <span className={`text-xl font-bold font-mono ${alerts.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {pendingList.length}
              </span>
              <span className="text-[10px] text-slate-500">itens</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">Total em Serviços</span>
            <span className="text-sm font-bold font-mono text-slate-900 block mt-1 truncate">
              {formatCurrency(totalSpentOnMaintenance)}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab pills */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
        <button
          onClick={() => setSubTab('pending')}
          className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'pending'
              ? 'bg-white text-slate-900 font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pendentes ({pendingList.length})
        </button>

        <button
          onClick={() => setSubTab('completed')}
          className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'completed'
              ? 'bg-white text-slate-900 font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Concluídas ({completedList.length})
        </button>
      </div>

      {/* Main List */}
      {subTab === 'pending' ? (
        <div className="space-y-2.5">
          {pendingList.length === 0 ? (
            <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto opacity-80" />
              <h4 className="text-sm font-bold text-slate-800">Todas as manutenções em dia</h4>
              <p className="text-xs text-slate-500">
                Agende a próxima revisão preventiva ou troca de óleo para receber alertas diários.
              </p>
              <button
                onClick={onOpenNewMaintenance}
                className="mt-1 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Agendar Manutenção
              </button>
            </div>
          ) : (
            pendingList.map((m) => {
              const remainingKm = m.dueMileage ? m.dueMileage - activeVehicle.currentMileage : null;
              const isOverdueKm = remainingKm !== null && remainingKm <= 0;
              const isNearKm = remainingKm !== null && remainingKm <= 500 && remainingKm > 0;

              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    isOverdueKm
                      ? 'bg-rose-50/50 border-rose-200'
                      : isNearKm
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {m.category}
                        </span>
                        {isOverdueKm ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            VENCIDA
                          </span>
                        ) : isNearKm ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            PRÓXIMA
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-xs font-bold text-slate-900">{m.title}</h3>
                      {m.notes && (
                        <p className="text-xs text-slate-500 italic">"{m.notes}"</p>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleDelete(m.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-slate-100"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Conditions & Criteria */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    {m.dueMileage && (
                      <div>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-orange-600" />
                          Meta de Km
                        </span>
                        <span className="font-bold font-mono text-slate-900 text-xs">
                          {m.dueMileage.toLocaleString('pt-BR')} km
                        </span>
                        <span className={`block text-[10px] font-semibold ${
                          isOverdueKm ? 'text-rose-700' : isNearKm ? 'text-amber-700' : 'text-slate-500'
                        }`}>
                          {remainingKm !== null && remainingKm <= 0
                            ? `Passou ${Math.abs(remainingKm)} km`
                            : `Faltam ${remainingKm?.toLocaleString('pt-BR')} km`}
                        </span>
                      </div>
                    )}

                    {m.dueDate && (
                      <div>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-600" />
                          Data Limite
                        </span>
                        <span className="font-bold text-slate-900 text-xs block">
                          {formatDate(m.dueDate)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {m.nextIntervalMonths ? `Recorrência: ${m.nextIntervalMonths}m` : 'Data programada'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {remainingKm !== null && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverdueKm ? 'bg-rose-600' : isNearKm ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(5, (activeVehicle.currentMileage / (m.dueMileage || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Complete Button */}
                  <button
                    onClick={() => onCompleteMaintenance(m)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Concluir e Registrar Ajustes Realizados
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {completedList.length === 0 ? (
            <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-1.5">
              <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum serviço arquivado</h4>
              <p className="text-xs text-slate-500">
                Ao concluir manutenções na aba "Pendentes", o histórico e notas de oficina ficarão registrados aqui.
              </p>
            </div>
          ) : (
            completedList.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Concluído em {formatDate(m.completedAt || m.updatedAt)}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">{m.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.completedCost ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-xs">
                        {formatCurrency(m.completedCost)}
                      </span>
                    ) : null}

                    <button
                      onClick={(e) => handleDelete(m.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Gauge className="w-3.5 h-3.5 text-orange-600" />
                      Km Realizada:
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {m.completedMileage ? `${m.completedMileage.toLocaleString('pt-BR')} km` : 'Não informada'}
                    </span>
                  </div>

                  {m.workshop && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        Oficina:
                      </span>
                      <span className="font-medium text-slate-900">{m.workshop}</span>
                    </div>
                  )}

                  {m.workDone && (
                    <div className="pt-1 border-t border-slate-200/80 text-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5">
                        Ajustes & Peças:
                      </span>
                      <p className="text-xs text-slate-800">{m.workDone}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
