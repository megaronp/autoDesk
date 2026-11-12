import React, { useState, useMemo } from 'react';
import {
  History as HistoryIcon,
  Fuel,
  Wrench,
  Search,
  Printer,
  Calendar,
  Gauge,
  Store,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { formatCurrency, formatDate, formatKm, formatKmL } from '../utils/calculations';
import { Refueling, Maintenance, MileageAdjustment } from '../types/vehicle';

type UnifiedHistoryItem =
  | { type: 'refueling'; data: Refueling; timestamp: number; date: string }
  | { type: 'maintenance'; data: Maintenance; timestamp: number; date: string }
  | { type: 'odometer'; data: MileageAdjustment; timestamp: number; date: string };

export const HistoryTab: React.FC = () => {
  const { activeVehicle, refuelings, maintenances, mileageAdjustments } = useVehicles();
  const [filterType, setFilterType] = useState<'all' | 'fuel' | 'maintenance' | 'odometer'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeVehicle) return null;

  const unifiedHistory = useMemo(() => {
    const list: UnifiedHistoryItem[] = [];

    refuelings.forEach((r) => {
      list.push({
        type: 'refueling',
        data: r,
        timestamp: new Date(r.date).getTime(),
        date: r.date,
      });
    });

    maintenances
      .filter((m) => m.status === 'completed')
      .forEach((m) => {
        const d = m.completedAt?.slice(0, 10) || m.updatedAt?.slice(0, 10) || m.createdAt.slice(0, 10);
        list.push({
          type: 'maintenance',
          data: m,
          timestamp: new Date(d).getTime(),
          date: d,
        });
      });

    (mileageAdjustments || []).forEach((adj) => {
      const d = adj.date || adj.createdAt.slice(0, 10);
      list.push({
        type: 'odometer',
        data: adj,
        timestamp: new Date(d).getTime(),
        date: d,
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [refuelings, maintenances, mileageAdjustments]);

  const totalFuelCost = refuelings.reduce((sum, r) => sum + r.totalCost, 0);
  const totalMaintCost = maintenances
    .filter((m) => m.status === 'completed')
    .reduce((sum, m) => sum + (m.completedCost || 0), 0);
  const grandTotal = totalFuelCost + totalMaintCost;

  const filteredItems = useMemo(() => {
    return unifiedHistory.filter((item) => {
      if (filterType === 'fuel' && item.type !== 'refueling') return false;
      if (filterType === 'maintenance' && item.type !== 'maintenance') return false;
      if (filterType === 'odometer' && item.type !== 'odometer') return false;

      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      if (item.type === 'refueling') {
        return (
          item.data.fuelType.toLowerCase().includes(term) ||
          (item.data.gasStation || '').toLowerCase().includes(term) ||
          (item.data.notes || '').toLowerCase().includes(term)
        );
      } else if (item.type === 'maintenance') {
        return (
          item.data.title.toLowerCase().includes(term) ||
          (item.data.workDone || '').toLowerCase().includes(term) ||
          (item.data.workshop || '').toLowerCase().includes(term) ||
          item.data.category.toLowerCase().includes(term)
        );
      } else {
        return (
          (item.data.reason || '').toLowerCase().includes(term) ||
          item.data.type.toLowerCase().includes(term) ||
          String(item.data.newMileage).includes(term)
        );
      }
    });
  }, [unifiedHistory, filterType, searchTerm]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner & Summary */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-orange-600">
              Histórico Consolidado
            </span>
            <h2 className="text-lg font-bold text-slate-900">Linha do Tempo do Veículo</h2>
          </div>
          <button
            onClick={handlePrint}
            className="py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200 flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
            title="Exportar ou Imprimir"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir Relatório</span>
          </button>
        </div>

        {/* 3 Financial Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">Gasto Total</span>
            <span className="text-sm font-bold font-mono text-slate-900 block mt-1 truncate">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">Combustível</span>
            <span className="text-sm font-bold font-mono text-slate-700 block mt-1 truncate">
              {formatCurrency(totalFuelCost)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">Serviços</span>
            <span className="text-sm font-bold font-mono text-emerald-700 block mt-1 truncate">
              {formatCurrency(totalMaintCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por peça, óleo, posto, oficina..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 focus:border-orange-500 text-slate-800 text-xs focus:outline-none placeholder:text-slate-400 shadow-2xs"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 text-xs font-semibold sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`py-1.5 px-3 text-center rounded-lg transition-all ${
              filterType === 'all'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({unifiedHistory.length})
          </button>
          <button
            onClick={() => setFilterType('fuel')}
            className={`py-1.5 px-3 text-center rounded-lg transition-all ${
              filterType === 'fuel'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Combustível ({refuelings.length})
          </button>
          <button
            onClick={() => setFilterType('maintenance')}
            className={`py-1.5 px-3 text-center rounded-lg transition-all ${
              filterType === 'maintenance'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Serviços ({maintenances.filter((m) => m.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilterType('odometer')}
            className={`py-1.5 px-3 text-center rounded-lg transition-all ${
              filterType === 'odometer'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Odômetro ({(mileageAdjustments || []).length})
          </button>
        </div>
      </div>

      {/* Timeline items */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-1.5">
            <HistoryIcon className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Nenhum evento registrado</h4>
            <p className="text-xs text-slate-500">
              Todos os abastecimentos, serviços e ajustes de odômetro aparecem organizados aqui.
            </p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            if (item.type === 'refueling') {
              const r = item.data;
              return (
                <div
                  key={`refuel_${r.id}_${idx}`}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                        <Fuel className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">Abastecimento</span>
                          {(r.kmDifference || r.kmTraveled) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200">
                              +{formatKm(r.kmDifference || r.kmTraveled)} km
                            </span>
                          )}
                          {r.calculatedKmL && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {formatKmL(r.calculatedKmL)} km/L
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {formatDate(r.date)} • {formatKm(r.mileage)} km
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(r.totalCost)}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {r.liters.toFixed(1)}L ({r.fuelType})
                      </span>
                    </div>
                  </div>

                  {(r.gasStation || r.notes || r.createdByName) && (
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-1">
                      <span>{r.gasStation ? `Posto: ${r.gasStation}` : ''} {r.notes ? `• ${r.notes}` : ''}</span>
                      {r.createdByName && (
                        <span className="text-[10px] text-indigo-700 font-medium">Por {r.createdByName}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            } else if (item.type === 'maintenance') {
              const m = item.data;
              return (
                <div
                  key={`maint_${m.id}_${idx}`}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                        <Wrench className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{m.title}</span>
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {m.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {formatDate(m.completedAt || m.updatedAt)} •{' '}
                          {m.completedMileage ? `${m.completedMileage.toLocaleString('pt-BR')} km` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {m.completedCost ? formatCurrency(m.completedCost) : 'R$ 0,00'}
                      </span>
                      <span className="block text-[10px] text-slate-400">Manutenção</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                    {m.workDone && (
                      <p className="text-slate-800">
                        <strong className="text-slate-500 text-[10px] uppercase block">Ajustes & Peças:</strong>
                        {m.workDone}
                      </p>
                    )}
                    {m.workshop && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                        <Store className="w-3 h-3 text-slate-400" />
                        Oficina: <span className="text-slate-700 font-medium">{m.workshop}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            } else {
              const a = item.data;
              const isReg = a.type === 'registration';
              return (
                <div
                  key={`adj_${a.id}_${idx}`}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <Gauge className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {isReg ? 'Cadastro do Veículo' : 'Ajuste de Odômetro'}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              isReg
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {isReg ? 'Km Inicial' : 'Odômetro Atual'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {formatDate(a.date)} • Odômetro: <strong className="font-mono text-slate-700">{formatKm(a.newMileage)} km</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {typeof a.difference === 'number' && a.difference !== 0 ? (
                        <span
                          className={`text-xs font-bold font-mono block ${
                            a.difference > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {a.difference > 0 ? `+${formatKm(a.difference)} km` : `${formatKm(a.difference)} km`}
                        </span>
                      ) : (
                        <span className="text-xs font-bold font-mono text-slate-700 block">
                          {formatKm(a.newMileage)} km
                        </span>
                      )}
                      <span className="block text-[10px] text-slate-400">
                        {isReg ? 'Registro Base' : 'Ajuste Real'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between flex-wrap gap-1">
                    <span className="text-slate-700 text-[11px]">
                      {typeof a.previousMileage === 'number' && a.previousMileage > 0 && (
                        <span className="font-mono text-slate-500">
                          de {formatKm(a.previousMileage)} km para {formatKm(a.newMileage)} km •{' '}
                        </span>
                      )}
                      <strong>{a.reason || 'Atualização de odômetro'}</strong>
                    </span>
                    {a.createdByName && (
                      <span className="text-[10px] text-indigo-700 font-medium">Por {a.createdByName}</span>
                    )}
                  </div>
                </div>
              );
            }
          })
        )}
      </div>
    </div>
  );
};
