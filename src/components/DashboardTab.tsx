import React, { useState } from 'react';
import {
  Fuel,
  Wrench,
  Gauge,
  TrendingUp,
  AlertCircle,
  Share2,
  Calendar,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Edit2,
  Check,
  Plus,
  Car,
} from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { formatCurrency, formatDate } from '../utils/calculations';
import { Maintenance } from '../types/vehicle';

interface DashboardTabProps {
  onOpenRefueling: () => void;
  onOpenMaintenance: () => void;
  onOpenShare: () => void;
  onCompleteMaintenance: (m: Maintenance) => void;
  onNavigateToTab: (tab: 'fuel' | 'maintenance' | 'history') => void;
  onOpenNewVehicle: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  onOpenRefueling,
  onOpenMaintenance,
  onOpenShare,
  onCompleteMaintenance,
  onNavigateToTab,
  onOpenNewVehicle,
}) => {
  const { vehicles, activeVehicle, refuelings, maintenances, alerts, updateVehicle } = useVehicles();

  const [isEditingMileage, setIsEditingMileage] = useState(false);
  const [newMileage, setNewMileage] = useState<number>(0);

  // If no vehicles registered yet, show clean onboarding state
  if (!activeVehicle || vehicles.length === 0) {
    return (
      <div className="py-12 sm:py-16 text-center space-y-5 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-xs">
          <Car className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Nenhum veículo cadastrado
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cadastre seu veículo para começar a monitorar consumo de combustível, revisões e alertas diários em tempo real.
          </p>
        </div>

        <button
          onClick={onOpenNewVehicle}
          className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Meu Primeiro Carro</span>
        </button>
      </div>
    );
  }

  // Calculate stats
  const validConsumptions = refuelings
    .map((r) => r.calculatedKmL)
    .filter((v): v is number => typeof v === 'number' && v > 0);

  const averageKmL = validConsumptions.length > 0
    ? (validConsumptions.reduce((a, b) => a + b, 0) / validConsumptions.length).toFixed(2)
    : '--';

  const validCostsPerKm = refuelings
    .map((r) => r.costPerKm)
    .filter((v): v is number => typeof v === 'number' && v > 0);

  const averageCostPerKm = validCostsPerKm.length > 0
    ? formatCurrency(validCostsPerKm.reduce((a, b) => a + b, 0) / validCostsPerKm.length)
    : '--';

  // Monthly fuel + maintenance spend
  const currentMonth = new Date().toISOString().slice(0, 7);
  const fuelSpentThisMonth = refuelings
    .filter((r) => r.date.startsWith(currentMonth))
    .reduce((sum, r) => sum + r.totalCost, 0);

  const maintSpentThisMonth = maintenances
    .filter((m) => m.status === 'completed' && m.completedAt && m.completedAt.startsWith(currentMonth))
    .reduce((sum, m) => sum + (m.completedCost || 0), 0);

  const totalSpentThisMonth = fuelSpentThisMonth + maintSpentThisMonth;

  // Pending maintenances
  const pendingMaintenances = maintenances
    .filter((m) => m.status === 'pending')
    .sort((a, b) => (a.dueMileage || 999999) - (b.dueMileage || 999999));

  const handleSaveMileage = async () => {
    if (newMileage > 0) {
      await updateVehicle(activeVehicle.id, { currentMileage: newMileage });
    }
    setIsEditingMileage(false);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Active Vehicle Hero Card */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top row: tags */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-xs tracking-wide">
              {activeVehicle.plate}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
              {activeVehicle.fuelType}
            </span>
          </div>

          {activeVehicle.sharedWithEmails && activeVehicle.sharedWithEmails.length > 0 && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Compartilhado ({activeVehicle.sharedWithEmails.length})</span>
            </button>
          )}
        </div>

        {/* Vehicle Name and Model */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {activeVehicle.name}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {activeVehicle.brand} {activeVehicle.model} • {activeVehicle.year}
          </p>
        </div>

        {/* Odometer Bar */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
              <Gauge className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Odômetro Atual
              </p>
              {isEditingMileage ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="number"
                    autoFocus
                    value={newMileage || ''}
                    onChange={(e) => setNewMileage(Number(e.target.value))}
                    className="w-32 px-2 py-0.5 rounded bg-white border border-orange-500 text-slate-900 font-mono font-bold text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleSaveMileage}
                    className="p-1 rounded bg-orange-600 text-white font-bold"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-lg font-bold font-mono text-slate-900 tracking-tight">
                  {activeVehicle.currentMileage.toLocaleString('pt-BR')}{' '}
                  <span className="text-xs text-slate-500 font-sans font-semibold">KM</span>
                </p>
              )}
            </div>
          </div>

          {!isEditingMileage && (
            <button
              onClick={() => {
                setNewMileage(activeVehicle.currentMileage);
                setIsEditingMileage(true);
              }}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors"
              title="Ajustar Odômetro"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onOpenRefueling}
          className="p-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex flex-col items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <Fuel className="w-4 h-4" />
          <span className="text-xs leading-none">Abastecer</span>
        </button>

        <button
          onClick={onOpenMaintenance}
          className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <Wrench className="w-4 h-4 text-slate-600" />
          <span className="text-xs leading-none">Manutenção</span>
        </button>

        <button
          onClick={onOpenShare}
          className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <Share2 className="w-4 h-4 text-slate-600" />
          <span className="text-xs leading-none">Compartilhar</span>
        </button>
      </div>

      {/* KPI 4-Grid Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Consumo Médio */}
        <div
          onClick={() => onNavigateToTab('fuel')}
          className="cursor-pointer p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 transition-colors shadow-2xs space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Média de Consumo</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-slate-900">
                {averageKmL}
              </span>
              <span className="text-xs font-semibold text-slate-500">km/L</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {validConsumptions.length} abastecimentos
            </p>
          </div>
        </div>

        {/* Card 2: Custo por Km */}
        <div
          onClick={() => onNavigateToTab('fuel')}
          className="cursor-pointer p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 transition-colors shadow-2xs space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Custo por Km</span>
            <div className="p-1 rounded-md bg-orange-50 text-orange-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-slate-900">
                {averageCostPerKm}
              </span>
              <span className="text-xs font-semibold text-slate-500">/km</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Eficiência média</p>
          </div>
        </div>

        {/* Card 3: Gastos no Mês */}
        <div
          onClick={() => onNavigateToTab('history')}
          className="cursor-pointer p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 transition-colors shadow-2xs space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gasto no Mês</span>
            <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-lg font-bold font-mono text-slate-900 truncate block">
              {formatCurrency(totalSpentThisMonth)}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Combustível + Serviços</p>
          </div>
        </div>

        {/* Card 4: Alertas de Revisão */}
        <div
          onClick={() => onNavigateToTab('maintenance')}
          className="cursor-pointer p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 transition-colors shadow-2xs space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Próxima Revisão</span>
            <div className={`p-1 rounded-md ${alerts.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className={`text-base font-bold truncate block ${alerts.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {alerts.length > 0 ? `${alerts.length} Atenção` : 'Em dia'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {pendingMaintenances[0]?.title || 'Nenhuma agendada'}
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Maintenances with Progress */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-slate-100 text-slate-700">
              <Wrench className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Revisões Programadas</h3>
          </div>
          <button
            onClick={() => onNavigateToTab('maintenance')}
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-0.5"
          >
            Ver todas
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingMaintenances.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-80" />
            <p className="text-xs text-slate-600 font-medium">Nenhuma manutenção agendada</p>
            <button
              onClick={onOpenMaintenance}
              className="mt-1 text-xs text-orange-600 font-bold hover:underline"
            >
              + Agendar Troca de Óleo ou Revisão
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingMaintenances.slice(0, 3).map((m) => {
              const remainingKm = m.dueMileage ? m.dueMileage - activeVehicle.currentMileage : null;
              const isNear = remainingKm !== null && remainingKm <= 500;
              const isOverdue = remainingKm !== null && remainingKm <= 0;

              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isOverdue
                      ? 'bg-rose-50/60 border-rose-200'
                      : isNear
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{m.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {m.dueMileage && `Meta: ${m.dueMileage.toLocaleString('pt-BR')} km`}
                        {m.dueDate && ` • Até ${formatDate(m.dueDate)}`}
                      </p>
                    </div>

                    <button
                      onClick={() => onCompleteMaintenance(m)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 font-semibold text-xs flex items-center gap-1 transition-colors flex-shrink-0 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Concluir
                    </button>
                  </div>

                  {remainingKm !== null && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={isOverdue ? 'text-rose-700 font-bold' : isNear ? 'text-amber-700 font-bold' : 'text-slate-600'}>
                          {isOverdue
                            ? `Ultrapassou ${Math.abs(remainingKm)} km`
                            : isNear
                            ? `Faltam ${remainingKm} km`
                            : `Faltam ${remainingKm.toLocaleString('pt-BR')} km`}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {activeVehicle.currentMileage.toLocaleString('pt-BR')} / {m.dueMileage?.toLocaleString('pt-BR')} km
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverdue ? 'bg-rose-600' : isNear ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(5, (activeVehicle.currentMileage / (m.dueMileage || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Refueling Activity */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-slate-100 text-slate-700">
              <Fuel className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Últimos Abastecimentos</h3>
          </div>
          <button
            onClick={() => onNavigateToTab('fuel')}
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-0.5"
          >
            Ver todos
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {refuelings.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
            <Fuel className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs text-slate-600 font-medium">Nenhum abastecimento registrado</p>
            <button
              onClick={onOpenRefueling}
              className="mt-1 text-xs text-orange-600 font-bold hover:underline"
            >
              + Adicionar Primeiro Abastecimento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {refuelings.slice(-3).reverse().map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                    <Fuel className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {r.liters.toFixed(1)}L {r.fuelType}
                      </span>
                      {r.calculatedKmL && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {r.calculatedKmL} km/L
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {formatDate(r.date)} • {r.mileage.toLocaleString('pt-BR')} km
                      {r.gasStation && ` • ${r.gasStation}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {formatCurrency(r.totalCost)}
                  </span>
                  {r.kmTraveled && (
                    <span className="block text-[10px] text-slate-400">
                      +{r.kmTraveled} km
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
