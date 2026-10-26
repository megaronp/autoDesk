import React, { useState, useEffect } from 'react';
import { X, Fuel, Gauge, DollarSign, Calendar, MapPin, Sparkles } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';

interface RefuelingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_STATIONS = ['Shell', 'Ipiranga', 'Petrobras (BR)', 'Ale'];

export const RefuelingModal: React.FC<RefuelingModalProps> = ({ isOpen, onClose }) => {
  const { activeVehicle, addRefueling, refuelings } = useVehicles();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState<number>(0);
  const [liters, setLiters] = useState<string>('');
  const [pricePerLiter, setPricePerLiter] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [fuelType, setFuelType] = useState<string>('Gasolina');
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [gasStation, setGasStation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeVehicle) {
      setMileage(activeVehicle.currentMileage);
      setFuelType(activeVehicle.fuelType === 'Flex' ? 'Gasolina' : activeVehicle.fuelType);
    }
  }, [activeVehicle, isOpen]);

  if (!isOpen || !activeVehicle) return null;

  const handleLitersChange = (val: string) => {
    setLiters(val);
    const numLiters = parseFloat(val.replace(',', '.'));
    const numPrice = parseFloat(pricePerLiter.replace(',', '.'));
    if (!isNaN(numLiters) && !isNaN(numPrice) && numLiters > 0 && numPrice > 0) {
      setTotalCost((numLiters * numPrice).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    const numLiters = parseFloat(liters.replace(',', '.'));
    const numPrice = parseFloat(val.replace(',', '.'));
    if (!isNaN(numLiters) && !isNaN(numPrice) && numLiters > 0 && numPrice > 0) {
      setTotalCost((numLiters * numPrice).toFixed(2));
    }
  };

  const handleTotalCostChange = (val: string) => {
    setTotalCost(val);
    const numTotal = parseFloat(val.replace(',', '.'));
    const numLiters = parseFloat(liters.replace(',', '.'));
    if (!isNaN(numTotal) && !isNaN(numLiters) && numLiters > 0) {
      setPricePerLiter((numTotal / numLiters).toFixed(2));
    }
  };

  const lastFullRefueling = [...refuelings].reverse().find((r) => r.isFullTank);
  const numLiters = parseFloat(liters.replace(',', '.'));
  let previewKmL: number | null = null;
  if (lastFullRefueling && isFullTank && !isNaN(numLiters) && numLiters > 0 && mileage > lastFullRefueling.mileage) {
    previewKmL = Number(((mileage - lastFullRefueling.mileage) / numLiters).toFixed(2));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedLiters = parseFloat(liters.replace(',', '.'));
    const parsedPrice = parseFloat(pricePerLiter.replace(',', '.'));
    const parsedTotal = parseFloat(totalCost.replace(',', '.'));

    if (isNaN(mileage) || mileage <= 0) {
      setError('Por favor informe a quilometragem atual do veículo.');
      return;
    }

    if (isNaN(parsedLiters) || parsedLiters <= 0) {
      setError('Informe a quantidade de litros abastecidos.');
      return;
    }

    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setError('Informe o valor total do abastecimento.');
      return;
    }

    try {
      setSubmitting(true);
      await addRefueling({
        date,
        mileage,
        liters: parsedLiters,
        pricePerLiter: isNaN(parsedPrice) ? Number((parsedTotal / parsedLiters).toFixed(2)) : parsedPrice,
        totalCost: parsedTotal,
        fuelType,
        isFullTank,
        gasStation: gasStation.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar abastecimento.');
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
              <Fuel className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Novo Abastecimento</h3>
              <p className="text-[11px] text-slate-500">{activeVehicle.name} • {activeVehicle.plate}</p>
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

          {/* Odometer & Date */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-orange-600" />
                Odômetro Atual (KM)
              </label>
              <input
                type="number"
                required
                value={mileage || ''}
                onChange={(e) => setMileage(Number(e.target.value))}
                placeholder="Ex: 48950"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Atual: {activeVehicle.currentMileage.toLocaleString('pt-BR')} km
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Data
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Liters & Price per liter */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-orange-600" />
                Litros Abastecidos
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={liters}
                onChange={(e) => handleLitersChange(e.target.value)}
                placeholder="Ex: 45.50"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Preço por Litro (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={pricePerLiter}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="Ex: 5.89"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Total Cost */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Valor Total Pago (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">R$</span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={totalCost}
                onChange={(e) => handleTotalCostChange(e.target.value)}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Fuel Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Combustível
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {['Gasolina', 'Etanol', 'Diesel', 'GNV'].map((ft) => (
                <button
                  type="button"
                  key={ft}
                  onClick={() => setFuelType(ft)}
                  className={`py-1.5 px-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                    fuelType === ft
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Full Tank switch */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800">
                Tanque Cheio?
              </p>
              <p className="text-[11px] text-slate-500">
                Necessário para calcular a média de consumo (Km/L).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFullTank(!isFullTank)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
                isFullTank ? 'bg-orange-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Preview KmL if available */}
          {previewKmL && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold">Estimativa:</span>
              </div>
              <span className="text-xs font-bold font-mono">{previewKmL} km/L</span>
            </div>
          )}

          {/* Gas Station */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Posto de Combustível (Opcional)
            </label>
            <input
              type="text"
              value={gasStation}
              onChange={(e) => setGasStation(e.target.value)}
              placeholder="Ex: Shell ou Ipiranga"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50 mb-1"
            />
            <div className="flex items-center gap-1 flex-wrap">
              {COMMON_STATIONS.map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setGasStation(st)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 transition-colors"
                >
                  {st}
                </button>
              ))}
            </div>
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
              placeholder="Ex: Gasolina aditivada"
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
              {submitting ? 'Salvando...' : 'Salvar Abastecimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
