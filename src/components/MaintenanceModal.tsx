import React, { useState, useEffect } from 'react';
import { X, Wrench, Calendar, Gauge, Sparkles } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { MaintenanceDueType } from '../types/vehicle';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresetOption {
  title: string;
  category: string;
  kmAdd: number;
  monthsAdd: number;
}

const PRESETS: PresetOption[] = [
  { title: 'Troca de Óleo e Filtro', category: 'Óleo e Lubrificantes', kmAdd: 10000, monthsAdd: 6 },
  { title: 'Pastilhas de Freio', category: 'Freios', kmAdd: 20000, monthsAdd: 12 },
  { title: 'Filtro de Ar e Cabine', category: 'Filtros', kmAdd: 10000, monthsAdd: 12 },
  { title: 'Alinhamento e Balanceamento', category: 'Pneus e Rodas', kmAdd: 10000, monthsAdd: 6 },
  { title: 'Correia Dentada', category: 'Motor e Correias', kmAdd: 50000, monthsAdd: 48 },
  { title: 'Fluido de Freio', category: 'Freios', kmAdd: 30000, monthsAdd: 24 },
];

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose }) => {
  const { activeVehicle, addMaintenance } = useVehicles();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Óleo e Lubrificantes');
  const [dueType, setDueType] = useState<MaintenanceDueType>('both');
  const [dueMileage, setDueMileage] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [nextIntervalKm, setNextIntervalKm] = useState<number>(10000);
  const [nextIntervalMonths, setNextIntervalMonths] = useState<number>(6);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = React.useCallback((preset: PresetOption) => {
    if (!activeVehicle) return;
    setTitle(preset.title);
    setCategory(preset.category);
    setNextIntervalKm(preset.kmAdd);
    setNextIntervalMonths(preset.monthsAdd);

    setDueMileage(activeVehicle.currentMileage + preset.kmAdd);

    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + preset.monthsAdd);
    setDueDate(targetDate.toISOString().slice(0, 10));
  }, [activeVehicle]);

  useEffect(() => {
    if (isOpen && activeVehicle) {
      applyPreset(PRESETS[0]);
    }
  }, [activeVehicle, isOpen, applyPreset]);

  if (!isOpen || !activeVehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Informe o título do serviço.');
      return;
    }

    if ((dueType === 'km' || dueType === 'both') && (!dueMileage || dueMileage <= 0)) {
      setError('Informe a quilometragem limite para a manutenção.');
      return;
    }

    if ((dueType === 'date' || dueType === 'both') && !dueDate) {
      setError('Informe a data limite para a manutenção.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: {
        title: string;
        category: string;
        dueType: 'km' | 'date' | 'both';
        dueMileage?: number;
        dueDate?: string;
        nextIntervalKm?: number;
        nextIntervalMonths?: number;
        notes?: string;
      } = {
        title: title.trim(),
        category,
        dueType,
      };

      if (dueType === 'km' || dueType === 'both') {
        payload.dueMileage = dueMileage;
      }
      if ((dueType === 'date' || dueType === 'both') && dueDate) {
        payload.dueDate = dueDate;
      }
      if (nextIntervalKm) {
        payload.nextIntervalKm = nextIntervalKm;
      }
      if (nextIntervalMonths) {
        payload.nextIntervalMonths = nextIntervalMonths;
      }
      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      await addMaintenance(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao agendar manutenção.');
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
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Agendar Revisão</h3>
              <p className="text-[11px] text-slate-500">{activeVehicle.name} • {activeVehicle.currentMileage.toLocaleString('pt-BR')} km</p>
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

          {/* Presets */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              Sugestões Rápidas:
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PRESETS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => applyPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                    title === p.title
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Título da Manutenção *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Troca de Óleo e Filtro"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
            />
          </div>

          {/* Due Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Critério do Alerta
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'both' as MaintenanceDueType, label: 'Km e Data' },
                { id: 'km' as MaintenanceDueType, label: 'Apenas Km' },
                { id: 'date' as MaintenanceDueType, label: 'Apenas Data' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setDueType(opt.id)}
                  className={`py-1.5 px-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                    dueType === opt.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div className="grid grid-cols-2 gap-2.5">
            {(dueType === 'km' || dueType === 'both') && (
              <div className={dueType === 'km' ? 'col-span-2' : ''}>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-orange-600" />
                  Meta em Km
                </label>
                <input
                  type="number"
                  required
                  value={dueMileage || ''}
                  onChange={(e) => setDueMileage(Number(e.target.value))}
                  placeholder="Ex: 55000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {dueMileage > activeVehicle.currentMileage
                    ? `Faltam ${(dueMileage - activeVehicle.currentMileage).toLocaleString('pt-BR')} km`
                    : 'Atingirá a meta imediatamente'}
                </span>
              </div>
            )}

            {(dueType === 'date' || dueType === 'both') && (
              <div className={dueType === 'date' ? 'col-span-2' : ''}>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Data Limite
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Óleo Sintético 0W-20"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
            />
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Salvar Revisão Agendada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
