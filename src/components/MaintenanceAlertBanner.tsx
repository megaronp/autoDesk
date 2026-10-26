import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { Maintenance } from '../types/vehicle';

interface MaintenanceAlertBannerProps {
  onCompleteMaintenance: (m: Maintenance) => void;
}

export const MaintenanceAlertBanner: React.FC<MaintenanceAlertBannerProps> = ({
  onCompleteMaintenance,
}) => {
  const { activeVehicle, alerts, dismissAlertForToday, dismissedAlertIds } = useVehicles();

  if (!activeVehicle || alerts.length === 0) return null;

  const activeAlerts = alerts.filter(
    (a) => !dismissedAlertIds.includes(a.maintenance.id)
  );

  if (activeAlerts.length === 0) return null;

  const topAlert = activeAlerts[0];
  const isCritical = topAlert.urgency === 'critical';

  return (
    <div
      className={`border-b transition-all ${
        isCritical
          ? 'bg-rose-50 border-rose-200 text-rose-950'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0 ${
              isCritical
                ? 'bg-rose-100 text-rose-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isCritical ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isCritical
                    ? 'bg-rose-200/70 text-rose-800'
                    : 'bg-amber-200/70 text-amber-800'
                }`}
              >
                {isCritical ? 'Revisão Urgente' : 'Lembrete de Revisão'}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {activeVehicle.name} ({activeVehicle.plate})
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {topAlert.maintenance.title}
            </h4>

            <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
              <span className="font-medium">{topAlert.reasonKm || topAlert.reasonDate}</span>
              <span className="opacity-40">•</span>
              <span className="text-[11px] text-slate-500">
                Aviso diário até conclusão
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
          <button
            onClick={() => dismissAlertForToday(topAlert.maintenance.id)}
            className="px-2.5 py-1.5 rounded-lg bg-white/80 hover:bg-white text-xs font-semibold text-slate-600 border border-slate-200 transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Adiar hoje
          </button>

          <button
            onClick={() => onCompleteMaintenance(topAlert.maintenance)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
              isCritical
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
