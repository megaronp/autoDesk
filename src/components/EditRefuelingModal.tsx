import React, { useState, useEffect } from 'react';
import { X, Fuel, Gauge, DollarSign, Calendar, MapPin, Sparkles, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { Refueling } from '../types/vehicle';
import { formatCurrency, formatKmL, formatKm } from '../utils/calculations';
import { formatFriendlyError } from '../lib/firebase';

interface EditRefuelingModalProps {
  refueling: Refueling | null;
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_STATIONS = ['Shell', 'Ipiranga', 'Petrobras (BR)', 'Ale'];

export const EditRefuelingModal: React.FC<EditRefuelingModalProps> = ({
  refueling,
  isOpen,
  onClose,
}) => {
  const { activeVehicle, updateRefueling } = useVehicles();

  const [date, setDate] = useState('');
  const [mileage, setMileage] = useState<string>('');
  const [previousMileage, setPreviousMileage] = useState<string>('');
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
    if (refueling && isOpen) {
      setDate(refueling.date || '');
      setMileage(String(refueling.mileage || ''));
      const prevKm =
        typeof refueling.previousMileage === 'number' && refueling.previousMileage > 0
          ? refueling.previousMileage
          : activeVehicle?.initialMileage && activeVehicle.initialMileage > 0
          ? activeVehicle.initialMileage
          : '';
      setPreviousMileage(String(prevKm || ''));
      setLiters(String(refueling.liters || ''));
      setPricePerLiter(refueling.pricePerLiter ? String(refueling.pricePerLiter) : '');
      setTotalCost(refueling.totalCost ? String(refueling.totalCost) : '');
      setFuelType(refueling.fuelType || 'Gasolina');
      setIsFullTank(refueling.isFullTank !== false);
      setGasStation(refueling.gasStation || '');
      setNotes(refueling.notes || '');
      setError(null);
    }
  }, [refueling, isOpen, activeVehicle?.initialMileage]);

  if (!isOpen || !refueling || !activeVehicle) return null;

  const parseNum = (v: string): number => {
    if (!v) return 0;
    return parseFloat(v.replace(',', '.'));
  };

  const parsedMileage = parseNum(mileage);
  const parsedPrevMileage = parseNum(previousMileage);
  const parsedLiters = parseNum(liters);
  const parsedPrice = parseNum(pricePerLiter);
  const parsedTotal = parseNum(totalCost);

  // Live calculation of difference and average
  const kmDifference =
    parsedMileage > 0 && parsedPrevMileage > 0 && parsedMileage > parsedPrevMileage
      ? Number((parsedMileage - parsedPrevMileage).toFixed(1))
      : null;

  const calculatedKmL =
    kmDifference && parsedLiters > 0
      ? Number((kmDifference / parsedLiters).toFixed(3))
      : null;

  const costPerKm =
    kmDifference && parsedTotal > 0
      ? Number((parsedTotal / kmDifference).toFixed(2))
      : null;

  const handleLitersChange = (val: string) => {
    setLiters(val);
    const numL = parseNum(val);
    const numP = parseNum(pricePerLiter);
    if (numL > 0 && numP > 0) {
      setTotalCost((numL * numP).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    const numL = parseNum(liters);
    const numP = parseNum(val);
    if (numL > 0 && numP > 0) {
      setTotalCost((numL * numP).toFixed(2));
    }
  };

  const handleTotalCostChange = (val: string) => {
    setTotalCost(val);
    const numT = parseNum(val);
    const numL = parseNum(liters);
    if (numT > 0 && numL > 0) {
      setPricePerLiter((numT / numL).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(parsedMileage) || parsedMileage <= 0) {
      setError('Por favor informe o odômetro atual.');
      return;
    }

    if (parsedPrevMileage > 0 && parsedMileage <= parsedPrevMileage) {
      setError('A quilometragem nova deve ser maior que a quilometragem antiga.');
      return;
    }

    if (isNaN(parsedLiters) || parsedLiters <= 0) {
      setError('Informe a quantidade de litros.');
      return;
    }

    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setError('Informe o valor total.');
      return;
    }

    try {
      setSubmitting(true);
      await updateRefueling(refueling.id, {
        date,
        mileage: parsedMileage,
        previousMileage: parsedPrevMileage > 0 ? parsedPrevMileage : undefined,
        liters: parsedLiters,
        pricePerLiter: isNaN(parsedPrice) || parsedPrice <= 0 ? Number((parsedTotal / parsedLiters).toFixed(2)) : parsedPrice,
        totalCost: parsedTotal,
        fuelType,
        isFullTank,
        gasStation: gasStation.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(formatFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
              <Fuel className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Editar Abastecimento</h3>
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Data do Abastecimento
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
            />
          </div>

          {/* Odometers: Antigo vs Novo */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-orange-600" />
              Conferência de Quilometragem
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Km Antiga / Anterior
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={previousMileage}
                  onChange={(e) => setPreviousMileage(e.target.value)}
                  placeholder="Ex: 22675.1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Odômetro no início do trecho
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Km Nova no Abastecimento *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="Ex: 23144"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Odômetro na bomba
                </span>
              </div>
            </div>

            {kmDifference !== null && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <span className="font-semibold flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  Distância Percorrida:
                </span>
                <span className="font-mono font-bold">+{formatKm(kmDifference)} km</span>
              </div>
            )}
          </div>

          {/* Liters & Price per liter */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-orange-600" />
                Litros Abastecidos *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={liters}
                onChange={(e) => handleLitersChange(e.target.value)}
                placeholder="Ex: 37.37"
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
              Valor Total Pago (R$) *
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
              <p className="text-xs font-bold text-slate-800">Tanque Cheio?</p>
              <p className="text-[11px] text-slate-500">
                Usado para o cálculo exato da média de consumo.
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

          {/* Live Preview Result Box */}
          {(kmDifference !== null || calculatedKmL !== null) && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200/90 space-y-2 text-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Resultado Atualizado
              </span>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60">
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium block">Distância</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-800">
                    {kmDifference ? `+${formatKm(kmDifference)} km` : '--'}
                  </span>
                </div>

                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium block">Média de Consumo</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-800 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    {calculatedKmL ? `${formatKmL(calculatedKmL)} km/L` : '--'}
                  </span>
                </div>

                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium block">Custo por Km</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-800">
                    {costPerKm ? `${formatCurrency(costPerKm)}/km` : '--'}
                  </span>
                </div>
              </div>
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

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
