import React, { useState, useEffect, useRef } from 'react';
import { X, Wrench, CheckCircle2, DollarSign, Gauge, Store, Repeat } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { Maintenance } from '../types/vehicle';
import { formatFriendlyError } from '../lib/firebase';

interface CompleteMaintenanceModalProps {
  maintenance: Maintenance | null;
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_ADJUSTMENTS = [
  'Óleo sintético e filtro de óleo substituídos',
  'Pastilhas de freio trocadas e discos inspecionados',
  'Filtro de ar do motor e cabine substituídos',
  'Pneus alinhados e balanceados',
];

export const CompleteMaintenanceModal: React.FC<CompleteMaintenanceModalProps> = ({
  maintenance,
  isOpen,
  onClose,
}) => {
  const { activeVehicle, completeMaintenance } = useVehicles();

  const [completedMileage, setCompletedMileage] = useState<number>(0);
  const [completedCost, setCompletedCost] = useState<string>('');
  const [workDone, setWorkDone] = useState<string>('');
  const [workshop, setWorkshop] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [autoReschedule, setAutoReschedule] = useState<boolean>(true);
  const [scheduleNextKm, setScheduleNextKm] = useState<number>(10000);
  const [scheduleNextMonths, setScheduleNextMonths] = useState<number>(6);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current && activeVehicle && maintenance) {
      setCompletedMileage(activeVehicle.currentMileage);
      setWorkDone('');
      setCompletedCost('');
      setWorkshop('');
      setNotes('');
      setScheduleNextKm(maintenance.nextIntervalKm || 10000);
      setScheduleNextMonths(maintenance.nextIntervalMonths || 6);
      setError(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, activeVehicle, maintenance]);

  if (!isOpen || !maintenance || !activeVehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(completedMileage) || completedMileage <= 0) {
      setError('Por favor informe a quilometragem em que o serviço foi realizado.');
      return;
    }

    if (!workDone.trim()) {
      setError('Descreva resumidamente o que foi ajustado ou trocado.');
      return;
    }

    const parsedCost = completedCost ? parseFloat(completedCost.replace(',', '.')) : 0;

    try {
      setSubmitting(true);
      await completeMaintenance(maintenance.id, {
        completedMileage,
        completedCost: isNaN(parsedCost) ? 0 : parsedCost,
        workDone: workDone.trim(),
        workshop: workshop.trim(),
        notes: notes.trim(),
        scheduleNextKm: autoReschedule ? scheduleNextKm : undefined,
        scheduleNextMonths: autoReschedule ? scheduleNextMonths : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(formatFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Concluir Manutenção</h3>
              <p className="text-[11px] text-slate-500 font-medium">{maintenance.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Mileage & Cost */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-orange-600" />
                Km Realizada
              </label>
              <input
                type="number"
                required
                value={completedMileage || ''}
                onChange={(e) => setCompletedMileage(Number(e.target.value))}
                placeholder="Ex: 48920"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Odômetro atual: {activeVehicle.currentMileage.toLocaleString('pt-BR')} km
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Valor Pago (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={completedCost}
                onChange={(e) => setCompletedCost(e.target.value)}
                placeholder="Ex: 350,00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* What was done */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-orange-600" />
              O que foi ajustado ou trocado? *
            </label>
            <textarea
              required
              rows={2}
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Ex: Trocado óleo 0W-20 sintético, filtro de óleo e anel de vedação."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
            />
            <div className="flex items-center gap-1 flex-wrap mt-1">
              {COMMON_ADJUSTMENTS.slice(0, 3).map((adj, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setWorkDone(adj)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 transition-colors truncate max-w-[200px]"
                >
                  {adj}
                </button>
              ))}
            </div>
          </div>

          {/* Workshop / Shop */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              Oficina / Mecânico (Opcional)
            </label>
            <input
              type="text"
              value={workshop}
              onChange={(e) => setWorkshop(e.target.value)}
              placeholder="Ex: Concessionária ou Oficina Mecânica"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
            />
          </div>

          {/* Auto Re-schedule */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Reagendar Próximo Ciclo</p>
                  <p className="text-[10px] text-slate-500">Programa o próximo lembrete preventivo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoReschedule(!autoReschedule)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  autoReschedule ? 'bg-orange-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {autoReschedule && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block mb-0.5">
                    A cada (Km):
                  </span>
                  <input
                    type="number"
                    value={scheduleNextKm}
                    onChange={(e) => setScheduleNextKm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    Meta: {(completedMileage + scheduleNextKm).toLocaleString('pt-BR')} km
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium block mb-0.5">
                    A cada (Meses):
                  </span>
                  <input
                    type="number"
                    value={scheduleNextMonths}
                    onChange={(e) => setScheduleNextMonths(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    Prazo: {scheduleNextMonths} meses
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Finalizar e Salvar no Histórico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
