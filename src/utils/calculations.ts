import { Refueling, Maintenance, Vehicle, MaintenanceAlert } from '../types/vehicle';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return isoString;
  }
}

/**
 * Recalculates refuelings with consumption (Km/L) and cost per km.
 * Refuelings should be sorted ascending by mileage/date.
 */
export function calculateRefuelingMetrics(refuelings: Refueling[]): Refueling[] {
  const sorted = [...refuelings].sort((a, b) => {
    if (a.mileage !== b.mileage) return a.mileage - b.mileage;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  let previousFullRefueling: Refueling | null = null;
  let intermediateLiters = 0;

  return sorted.map((current) => {
    let calculatedKmL: number | undefined = undefined;
    let kmTraveled: number | undefined = undefined;
    let costPerKm: number | undefined = undefined;

    if (previousFullRefueling) {
      kmTraveled = current.mileage - previousFullRefueling.mileage;
      const totalLitersConsumed = intermediateLiters + current.liters;

      if (current.isFullTank && kmTraveled > 0 && totalLitersConsumed > 0) {
        calculatedKmL = Number((kmTraveled / totalLitersConsumed).toFixed(2));
        costPerKm = Number((current.totalCost / kmTraveled).toFixed(2));
      }
    }

    if (current.isFullTank) {
      previousFullRefueling = current;
      intermediateLiters = 0;
    } else {
      intermediateLiters += current.liters;
    }

    return {
      ...current,
      calculatedKmL: calculatedKmL ?? current.calculatedKmL,
      kmTraveled,
      costPerKm,
    };
  });
}

/**
 * Checks for maintenances nearing deadline or overdue
 * Thresholds:
 * - Within 500 km or overdue by KM
 * - Within 15 days or overdue by Date
 */
export function evaluateMaintenanceAlerts(vehicle: Vehicle, maintenances: Maintenance[]): MaintenanceAlert[] {
  const pending = maintenances.filter((m) => m.status === 'pending');
  const alerts: MaintenanceAlert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const m of pending) {
    let isAlert = false;
    let urgency: 'info' | 'warning' | 'critical' = 'info';
    let remainingKm: number | undefined;
    let remainingDays: number | undefined;
    let reasonKm: string | undefined;
    let reasonDate: string | undefined;

    // Check mileage condition
    if ((m.dueType === 'km' || m.dueType === 'both') && typeof m.dueMileage === 'number') {
      remainingKm = m.dueMileage - vehicle.currentMileage;
      if (remainingKm <= 0) {
        isAlert = true;
        urgency = 'critical';
        reasonKm = `Km ultrapassada em ${Math.abs(remainingKm)} km (Meta: ${m.dueMileage.toLocaleString('pt-BR')} km | Atual: ${vehicle.currentMileage.toLocaleString('pt-BR')} km)`;
      } else if (remainingKm <= 500) {
        isAlert = true;
        urgency = remainingKm <= 200 ? 'critical' : 'warning';
        reasonKm = `Faltam apenas ${remainingKm} km para a meta (${m.dueMileage.toLocaleString('pt-BR')} km)`;
      } else if (remainingKm <= 1000) {
        // notice
        remainingKm = remainingKm;
      }
    }

    // Check date condition
    if ((m.dueType === 'date' || m.dueType === 'both') && m.dueDate) {
      const dueParts = m.dueDate.split('-');
      if (dueParts.length === 3) {
        const dueDate = new Date(Number(dueParts[0]), Number(dueParts[1]) - 1, Number(dueParts[2]));
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (remainingDays < 0) {
          isAlert = true;
          urgency = 'critical';
          reasonDate = `Vencida há ${Math.abs(remainingDays)} dia(s) (Venceu em ${formatDate(m.dueDate)})`;
        } else if (remainingDays <= 15) {
          isAlert = true;
          if (remainingDays <= 5 && urgency !== 'critical') urgency = 'critical';
          else if (urgency !== 'critical') urgency = 'warning';
          reasonDate = remainingDays === 0 ? 'Vence hoje!' : `Vence em ${remainingDays} dia(s) (${formatDate(m.dueDate)})`;
        }
      }
    }

    if (isAlert) {
      let message = `${m.title} no veículo ${vehicle.name}: `;
      if (reasonKm && reasonDate) {
        message += `${reasonKm} e ${reasonDate}.`;
      } else {
        message += (reasonKm || reasonDate || '');
      }

      alerts.push({
        maintenance: m,
        vehicle,
        urgency,
        remainingKm,
        remainingDays,
        reasonKm,
        reasonDate,
        message,
      });
    }
  }

  // Sort critical first
  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.urgency] - order[b.urgency];
  });
}

/**
 * Generate a friendly 6-digit sharing code (e.g., AC-7F9K)
 */
export function generateShareCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'AC-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
