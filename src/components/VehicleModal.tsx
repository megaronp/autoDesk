import React, { useState, useEffect } from 'react';
import { X, Car, Gauge, Trash2, LogOut, ShieldAlert } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { useAuth } from '../context/AuthContext';
import { FuelType, Vehicle } from '../types/vehicle';
import { formatFriendlyError } from '../lib/firebase';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleToEdit?: Vehicle | null;
}

const COMMON_BRANDS = [
  'Chevrolet', 'Fiat', 'Volkswagen', 'Toyota', 'Honda',
  'Hyundai', 'Jeep', 'Ford', 'Renault', 'Nissan',
  'BYD', 'BMW', 'Peugeot', 'Citroën', 'Audi', 'Volvo', 'Outro'
];

const FUEL_OPTIONS: FuelType[] = [
  'Flex', 'Gasolina', 'Etanol', 'Diesel', 'GNV', 'Híbrido', 'Elétrico'
];

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  vehicleToEdit,
}) => {
  const { user } = useAuth();
  const { addVehicle, updateVehicle, deleteVehicle, leaveVehicle, vehicles } = useVehicles();

  const isOwner = !vehicleToEdit || vehicleToEdit.ownerId === user?.uid;

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Honda');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [plate, setPlate] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('Flex');
  const [currentMileage, setCurrentMileage] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleToEdit) {
      setName(vehicleToEdit.name);
      setBrand(vehicleToEdit.brand);
      setModel(vehicleToEdit.model);
      setYear(vehicleToEdit.year);
      setPlate(vehicleToEdit.plate);
      setFuelType(vehicleToEdit.fuelType);
      setCurrentMileage(vehicleToEdit.currentMileage);
    } else {
      setName('');
      setBrand('Honda');
      setModel('');
      setYear(new Date().getFullYear());
      setPlate('');
      setFuelType('Flex');
      setCurrentMileage(0);
    }
  }, [vehicleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setError(null);

    if (!name.trim()) {
      setError('Informe um nome ou apelido para o carro.');
      return;
    }

    if (!model.trim()) {
      setError('Informe o modelo do veículo.');
      return;
    }

    if (!plate.trim()) {
      setError('Informe a placa do veículo.');
      return;
    }

    try {
      setSubmitting(true);
      if (vehicleToEdit) {
        await updateVehicle(vehicleToEdit.id, {
          name: name.trim(),
          brand,
          model: model.trim(),
          year,
          plate: plate.toUpperCase().trim(),
          fuelType,
          currentMileage,
        });
      } else {
        await addVehicle({
          name: name.trim(),
          brand,
          model: model.trim(),
          year,
          plate: plate.toUpperCase().trim(),
          fuelType,
          currentMileage,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(formatFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicleToEdit || !isOwner) return;
    if (vehicles.length <= 1) {
      alert('Você precisa manter pelo menos 1 veículo cadastrado.');
      return;
    }

    const confirmed = window.confirm(`Deseja realmente remover o veículo ${vehicleToEdit.name}?`);
    if (confirmed) {
      await deleteVehicle(vehicleToEdit.id);
      onClose();
    }
  };

  const handleLeaveVehicle = async () => {
    if (!vehicleToEdit || isOwner) return;
    const confirmed = window.confirm(`Deseja sair do veículo ${vehicleToEdit.name}? Você deixará de receber atualizações deste carro.`);
    if (confirmed) {
      await leaveVehicle(vehicleToEdit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {!vehicleToEdit
                  ? 'Cadastrar Veículo'
                  : isOwner
                  ? 'Editar Veículo'
                  : 'Detalhes do Veículo'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isOwner
                  ? 'Dados do veículo para controle de manutenção'
                  : 'Veículo compartilhado pelo proprietário'}
              </p>
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
          {!isOwner && (
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>Você possui acesso compartilhado a este carro. Apenas o proprietário pode alterar os dados principais.</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Nickname / Display Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Nome ou Apelido do Veículo *
            </label>
            <input
              type="text"
              required
              disabled={!isOwner}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Civic Preto, Renegade, Carro da Família"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 bg-slate-50/50 disabled:opacity-75 disabled:bg-slate-100"
            />
          </div>

          {/* Brand & Model in 2 cols */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Marca *
              </label>
              <select
                value={brand}
                disabled={!isOwner}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 bg-slate-50/50 disabled:opacity-75 disabled:bg-slate-100"
              >
                {COMMON_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Modelo *
              </label>
              <input
                type="text"
                required
                disabled={!isOwner}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: Civic EXL, Onix"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 bg-slate-50/50 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Year & Plate */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ano de Fabricação *
              </label>
              <input
                type="number"
                required
                disabled={!isOwner}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={1970}
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 bg-slate-50/50 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Placa do Carro *
              </label>
              <input
                type="text"
                required
                disabled={!isOwner}
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="BRA2E19 ou ABC1234"
                maxLength={8}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold text-slate-900 uppercase focus:outline-none focus:border-orange-500 bg-slate-50/50 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Current Mileage */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Quilometragem Atual (km) *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                disabled={!isOwner}
                value={currentMileage || ''}
                onChange={(e) => setCurrentMileage(Number(e.target.value))}
                placeholder="Ex: 45000"
                min={0}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-orange-500 bg-slate-50/50 disabled:opacity-75 disabled:bg-slate-100"
              />
              <Gauge className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isOwner
                ? 'Esta quilometragem serve de base para as previsões de revisão.'
                : 'A quilometragem pode ser atualizada no painel inicial ao abastecer.'}
            </p>
          </div>

          {/* Fuel Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Tipo de Combustível Principal
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {FUEL_OPTIONS.slice(0, 4).map((ft) => (
                <button
                  type="button"
                  key={ft}
                  disabled={!isOwner}
                  onClick={() => setFuelType(ft)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border transition-colors ${
                    fuelType === ft
                      ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  } disabled:pointer-events-none disabled:opacity-80`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            {isOwner ? (
              <>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-60"
                >
                  {submitting ? 'Salvando...' : vehicleToEdit ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
                </button>

                {vehicleToEdit && vehicles.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full py-2 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Veículo
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleLeaveVehicle}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair deste Veículo Compartilhado
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
