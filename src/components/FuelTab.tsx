import React, { useState } from 'react';
import { Fuel, Plus, Trash2, Calendar, Gauge, DollarSign, Sparkles, ArrowUpRight, TrendingUp, Edit3 } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, calculateWeightedConsumption, formatKmL, formatKm } from '../utils/calculations';
import { EditRefuelingModal } from './EditRefuelingModal';
import { Refueling } from '../types/vehicle';

interface FuelTabProps {
  onOpenNewRefueling: () => void;
}

export const FuelTab: React.FC<FuelTabProps> = ({ onOpenNewRefueling }) => {
  const { user } = useAuth();
  const { activeVehicle, refuelings, deleteRefueling } = useVehicles();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [editingRefuel, setEditingRefuel] = useState<Refueling | null>(null);

  if (!activeVehicle) return null;

  const { averageKmL } = calculateWeightedConsumption(refuelings, activeVehicle.initialMileage);

  const validConsumptions = refuelings
    .map((r) => r.calculatedKmL)
    .filter((v): v is number => typeof v === 'number' && v > 0);

  const bestKmL = validConsumptions.length > 0
    ? formatKmL(Math.max(...validConsumptions))
    : '--';

  const totalSpent = refuelings.reduce((sum, r) => sum + r.totalCost, 0);

  const filteredList = refuelings
    .filter((r) => {
      if (selectedFilter === 'all') return true;
      return r.fuelType === selectedFilter;
    })
    .reverse();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja excluir este registro de abastecimento?')) {
      await deleteRefueling(id);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner & Stats */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-orange-600">
              Controle de Combustível
            </span>
            <h2 className="text-lg font-bold text-slate-900">Consumo & Abastecimentos</h2>
          </div>
          <button
            onClick={onOpenNewRefueling}
            className="py-2 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Abastecer
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">Média Geral</span>
            <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-slate-900">{averageKmL}</span>
              <span className="text-[10px] text-slate-500 font-semibold">km/L</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">Melhor Média</span>
            <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-emerald-700">{bestKmL}</span>
              <span className="text-[10px] text-slate-500 font-semibold">km/L</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">Total Gasto</span>
            <span className="text-sm font-bold font-mono text-slate-900 block mt-1 truncate">
              {formatCurrency(totalSpent)}
            </span>
          </div>
        </div>

        {/* Informative hint */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-orange-600" />
          <span>
            Ao abastecer com <strong>tanque cheio</strong>, a média de km/L é calculada automaticamente na recarga seguinte.
          </span>
        </div>
      </div>

      {/* Filter by Fuel Type */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['all', 'Gasolina', 'Etanol', 'Diesel', 'GNV'].map((ft) => (
          <button
            key={ft}
            onClick={() => setSelectedFilter(ft)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
              selectedFilter === ft
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {ft === 'all' ? 'Todos' : ft}
          </button>
        ))}
      </div>

      {/* Refueling List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
            <Fuel className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Nenhum abastecimento encontrado</h4>
            <p className="text-xs text-slate-500">
              Cadastre seu primeiro abastecimento para começar a calcular sua média de consumo.
            </p>
            <button
              onClick={onOpenNewRefueling}
              className="mt-1 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Abastecimento
            </button>
          </div>
        ) : (
          filteredList.map((refuel) => (
            <div
              key={refuel.id}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5"
            >
              {/* Header: Date, Mileage, Badges, Edit/Delete */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(refuel.date)}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-orange-600" />
                    {formatKm(refuel.mileage)} km
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Diferença de KM Badge */}
                  {(refuel.kmDifference || refuel.kmTraveled) && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-mono font-bold text-xs flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-sky-600" />
                      +{formatKm(refuel.kmDifference || refuel.kmTraveled)} km
                    </span>
                  )}

                  {/* Média de Consumo Badge */}
                  {refuel.calculatedKmL ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      {formatKmL(refuel.calculatedKmL)} km/L
                    </span>
                  ) : refuel.isFullTank ? (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                      Tanque Cheio
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                      Parcial
                    </span>
                  )}

                  {(activeVehicle.ownerId === user?.uid || (refuel.createdByUid && refuel.createdByUid === user?.uid)) && (
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRefuel(refuel);
                        }}
                        className="p-1 text-slate-400 hover:text-orange-600 transition-colors rounded-lg hover:bg-slate-100"
                        title="Editar abastecimento (ajustar km antiga, km nova ou litros)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(refuel.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-slate-100"
                        title="Excluir abastecimento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid: 4 metrics (Litros, Diferença KM, Média, Total) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Litros / Tipo</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {refuel.liters.toFixed(2)}L
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">{refuel.fuelType}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Diferença de KM</span>
                  <span className="font-bold text-sky-800 font-mono block">
                    {refuel.kmDifference
                      ? `+${formatKm(refuel.kmDifference)} km`
                      : refuel.kmTraveled
                      ? `+${formatKm(refuel.kmTraveled)} km`
                      : '--'}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {refuel.previousMileage
                      ? `de ${formatKm(refuel.previousMileage)} a ${formatKm(refuel.mileage)}`
                      : 'rodados'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Média de Consumo</span>
                  <span className="font-bold font-mono text-emerald-700 block">
                    {refuel.calculatedKmL ? `${formatKmL(refuel.calculatedKmL)} km/L` : '--'}
                  </span>
                  {refuel.costPerKm ? (
                    <span className="text-[10px] text-orange-700 font-mono block">
                      {formatCurrency(refuel.costPerKm)}/km
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block">
                      {formatCurrency(refuel.pricePerLiter)}/L
                    </span>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Pago</span>
                  <span className="font-bold text-slate-900 font-mono text-sm block">
                    {formatCurrency(refuel.totalCost)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {formatCurrency(refuel.pricePerLiter)}/L
                  </span>
                </div>
              </div>

              {/* Footer: Station & Notes & Logger */}
              {(refuel.gasStation || refuel.notes || refuel.createdByName) && (
                <div className="text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    {refuel.gasStation && (
                      <span className="text-slate-700 font-medium">{refuel.gasStation}</span>
                    )}
                    {refuel.notes && (
                      <span className="italic text-slate-400">"{refuel.notes}"</span>
                    )}
                  </div>
                  {refuel.createdByName && (
                    <span className="text-[10px] text-indigo-700 font-medium">
                      Por {refuel.createdByName}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de Edição de Abastecimento */}
      {editingRefuel && (
        <EditRefuelingModal
          refueling={editingRefuel}
          isOpen={Boolean(editingRefuel)}
          onClose={() => setEditingRefuel(null)}
        />
      )}
    </div>
  );
};
