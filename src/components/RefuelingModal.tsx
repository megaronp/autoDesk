import React, { useState, useEffect, useRef } from 'react';
import { X, Fuel, Gauge, DollarSign, Calendar, MapPin, Sparkles, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { getLocalDateString, formatKm, formatKmL } from '../utils/calculations';
import { formatFriendlyError } from '../lib/firebase';

interface RefuelingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_STATIONS = ['Shell', 'Ipiranga', 'Petrobras (BR)', 'Ale'];

export const RefuelingModal: React.FC<RefuelingModalProps> = ({ isOpen, onClose }) => {
  const { activeVehicle, addRefueling, refuelings } = useVehicles();

  const [date, setDate] = useState(() => getLocalDateString());
  const [mileage, setMileage] = useState<string>('');
  const [previousMileage, setPreviousMileage] = useState<string>('');
  const [showCustomPrev, setShowCustomPrev] = useState(false);
  const [liters, setLiters] = useState<string>('');
  const [pricePerLiter, setPricePerLiter] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [fuelType, setFuelType] = useState<string>('Gasolina');
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [gasStation, setGasStation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevOpenRef = useRef(false);

  // Initialize/reset form ONLY when modal opens, not on every background vehicle update
  useEffect(() => {
    if (isOpen && !prevOpenRef.current && activeVehicle) {
      setDate(getLocalDateString());
      setMileage(activeVehicle.currentMileage ? String(activeVehicle.currentMileage) : '');
      const sortedPrev = [...refuelings].sort((a, b) => (Number(a.mileage) || 0) - (Number(b.mileage) || 0));
      const lastR = sortedPrev.length > 0 ? sortedPrev[sortedPrev.length - 1] : null;
      const defaultPrev = lastR ? lastR.mileage : (activeVehicle.initialMileage && activeVehicle.initialMileage > 0 ? activeVehicle.initialMileage : '');
      setPreviousMileage(defaultPrev ? String(defaultPrev) : '');
      setShowCustomPrev(false);
      setLiters('');
      setPricePerLiter('');
      setTotalCost('');
      setFuelType(activeVehicle.fuelType === 'Flex' ? 'Gasolina' : activeVehicle.fuelType);
      setIsFullTank(true);
      setGasStation('');
      setNotes('');
      setError(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, activeVehicle, refuelings]);

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

  // Accurately compute km difference and preview km/L including any intermediate partial refuelings
  const sortedPrevious = [...refuelings].sort((a, b) => a.mileage - b.mileage);
  const lastRefueling = sortedPrevious.length > 0 ? sortedPrevious[sortedPrevious.length - 1] : null;
  const lastFullRefueling = [...sortedPrevious].reverse().find((r) => r.isFullTank);
  const numLiters = parseFloat(liters.replace(',', '.'));
  const numTotal = parseFloat(totalCost.replace(',', '.'));
  const parsedMileage = parseFloat(mileage.replace(',', '.'));
  const parsedPrev = parseFloat(previousMileage.replace(',', '.'));

  // Effective previous km base
  const defaultPrevBase = lastRefueling?.mileage ?? (activeVehicle.initialMileage && activeVehicle.initialMileage > 0 ? activeVehicle.initialMileage : 0);
  const effectivePrev = !isNaN(parsedPrev) && parsedPrev > 0 ? parsedPrev : defaultPrevBase;
  const previewKmDiff = !isNaN(parsedMileage) && effectivePrev > 0 && parsedMileage > effectivePrev
    ? Number((parsedMileage - effectivePrev).toFixed(1))
    : null;

  let previewKmL: number | null = null;
  let previewCycleKm: number | null = null;
  let isCycleAccurate = false;

  if (lastFullRefueling && isFullTank && !isNaN(numLiters) && numLiters > 0 && !isNaN(parsedMileage) && parsedMileage > lastFullRefueling.mileage && !showCustomPrev) {
    const intermediateLiters = refuelings
      .filter((r) => !r.isFullTank && r.mileage > lastFullRefueling.mileage && r.mileage < parsedMileage)
      .reduce((sum, r) => sum + r.liters, 0);
    const totalLiters = intermediateLiters + numLiters;
    previewCycleKm = Number((parsedMileage - lastFullRefueling.mileage).toFixed(1));
    previewKmL = Number((previewCycleKm / totalLiters).toFixed(3));
    isCycleAccurate = true;
  } else if (previewKmDiff && !isNaN(numLiters) && numLiters > 0) {
    previewKmL = Number((previewKmDiff / numLiters).toFixed(3));
    isCycleAccurate = false;
  }

  const effectiveKm = isCycleAccurate && previewCycleKm ? previewCycleKm : previewKmDiff;
  const previewCostPerKm = effectiveKm && effectiveKm > 0 && !isNaN(numTotal) && numTotal > 0
    ? Number((numTotal / effectiveKm).toFixed(2))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedL = parseFloat(liters.replace(',', '.'));
    const parsedPrice = parseFloat(pricePerLiter.replace(',', '.'));
    const parsedT = parseFloat(totalCost.replace(',', '.'));
    const parsedM = parseFloat(mileage.replace(',', '.'));
    const parsedP = parseFloat(previousMileage.replace(',', '.'));

    if (isNaN(parsedM) || parsedM <= 0) {
      setError('Por favor informe a quilometragem atual do veículo.');
      return;
    }

    if (!isNaN(parsedP) && parsedP > 0 && parsedM <= parsedP) {
      setError(`A quilometragem atual (${formatKm(parsedM)}) deve ser maior que a quilometragem anterior (${formatKm(parsedP)}).`);
      return;
    }

    // Mileage validation: cannot be less than previous records unless custom previous is provided
    const previousMileages = refuelings.map((r) => r.mileage);
    if (previousMileages.length > 0 && (isNaN(parsedP) || parsedP <= 0)) {
      const highestPrevious = Math.max(...previousMileages);
      if (parsedM < highestPrevious) {
        setError(`A quilometragem informada (${formatKm(parsedM)}) não pode ser menor que o último registro (${formatKm(highestPrevious)}).`);
        return;
      }
    } else if (activeVehicle.initialMileage && parsedM < activeVehicle.initialMileage && (isNaN(parsedP) || parsedP <= 0)) {
      setError(`A quilometragem informada (${formatKm(parsedM)}) não pode ser menor que a inicial do veículo (${formatKm(activeVehicle.initialMileage)}).`);
      return;
    }

    if (isNaN(parsedL) || parsedL <= 0) {
      setError('Informe a quantidade de litros abastecidos.');
      return;
    }

    if (isNaN(parsedT) || parsedT <= 0) {
      setError('Informe o valor total do abastecimento.');
      return;
    }

    try {
      setSubmitting(true);
      await addRefueling({
        date,
        mileage: parsedM,
        previousMileage: !isNaN(parsedP) && parsedP > 0 ? parsedP : undefined,
        liters: parsedL,
        pricePerLiter: isNaN(parsedPrice) ? Number((parsedT / parsedL).toFixed(2)) : parsedPrice,
        totalCost: parsedT,
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
                type="text"
                inputMode="decimal"
                required
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="Ex: 23144"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
              />
              <div className="flex items-center justify-between text-[10px] mt-1">
                <span className="text-slate-500 truncate">
                  Ant.: {effectivePrev > 0 ? formatKm(effectivePrev) : '0 km'}
                </span>
                {previewKmDiff !== null && previewKmDiff > 0 && (
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5 shrink-0">
                    <ArrowUpRight className="w-3 h-3" />
                    +{formatKm(previewKmDiff)}
                  </span>
                )}
              </div>
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

          {/* Custom Previous Mileage Option */}
          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">Km anterior / de referência:</span>
              <button
                type="button"
                onClick={() => setShowCustomPrev(!showCustomPrev)}
                className="text-[10px] font-semibold text-orange-600 hover:text-orange-700 hover:underline"
              >
                {showCustomPrev ? 'Ocultar ajuste' : 'Ajustar Km antiga'}
              </button>
            </div>
            {showCustomPrev ? (
              <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={previousMileage}
                  onChange={(e) => setPreviousMileage(e.target.value)}
                  placeholder={`Ex: ${defaultPrevBase > 0 ? String(defaultPrevBase) : '22675.1'}`}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500 bg-white"
                />
                <p className="text-[10px] text-slate-500">
                  Defina a quilometragem antiga exata para calcular os km percorridos (+{previewKmDiff !== null ? formatKm(previewKmDiff) : '--'}) e a média de consumo.
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 mt-0.5">
                Calculando a partir de: <strong className="font-mono text-slate-700">{effectivePrev > 0 ? formatKm(effectivePrev) : 'nenhuma anterior (0 km)'}</strong>
              </p>
            )}
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

          {/* Preview Metrics: Diferença de Km e Média de Consumo */}
          {(previewKmDiff !== null || previewKmL !== null) && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200/90 space-y-2 text-slate-800 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Cálculo em Tempo Real
                </span>
                {isFullTank ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Tanque Cheio
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Abastecimento Parcial
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60">
                {/* Diferença de Km */}
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium block">Diferença de KM</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-800 flex items-center gap-0.5">
                    {previewKmDiff !== null ? `+${formatKm(previewKmDiff)}` : '--'}
                  </span>
                </div>

                {/* Média de Consumo */}
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium block">Média de Consumo</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-800">
                    {previewKmL !== null ? formatKmL(previewKmL) : '--'}
                  </span>
                </div>

                {/* Custo por Km */}
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 font-medium block">Custo por Km</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-800">
                    {previewCostPerKm ? `R$ ${previewCostPerKm.toFixed(2)}/km` : '--'}
                  </span>
                </div>
              </div>

              {isCycleAccurate && previewCycleKm && previewCycleKm !== previewKmDiff && (
                <p className="text-[10px] text-emerald-700/90 pt-0.5">
                  Ciclo completo tanque a tanque: <strong>+{formatKm(previewCycleKm)}</strong> (inclui parciais intermediários).
                </p>
              )}
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
