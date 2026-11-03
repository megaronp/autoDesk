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

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalMonthString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Recalculates refuelings with consumption (Km/L) and cost per km.
 * Refuelings should be sorted ascending by mileage/date.
 * Accurately includes all intermediate partial refuelings in both liters and cost.
 */
export function calculateRefuelingMetrics(refuelings: Refueling[]): Refueling[] {
  const sorted = [...refuelings].sort((a, b) => {
    if (a.mileage !== b.mileage) return a.mileage - b.mileage;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  let previousFullRefueling: Refueling | null = null;
  let intermediateLiters = 0;
  let intermediateCost = 0;

  return sorted.map((current) => {
    let calculatedKmL: number | undefined = undefined;
    let kmTraveled: number | undefined = undefined;
    let costPerKm: number | undefined = undefined;

    if (previousFullRefueling) {
      kmTraveled = current.mileage - previousFullRefueling.mileage;
      const totalLitersConsumed = intermediateLiters + current.liters;
      const totalCostConsumed = intermediateCost + current.totalCost;

      if (current.isFullTank && kmTraveled > 0 && totalLitersConsumed > 0) {
        calculatedKmL = Number((kmTraveled / totalLitersConsumed).toFixed(2));
        costPerKm = Number((totalCostConsumed / kmTraveled).toFixed(2));
      }
    }

    if (current.isFullTank) {
      previousFullRefueling = current;
      intermediateLiters = 0;
      intermediateCost = 0;
    } else {
      intermediateLiters += current.liters;
      intermediateCost += current.totalCost;
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
 * Calculates weighted average consumption and cost per km across all valid full-to-full intervals.
 * Weighted Km/L = Total km in intervals / Total liters in intervals.
 */
export function calculateWeightedConsumption(refuelings: Refueling[]): {
  averageKmL: string;
  averageCostPerKm: string;
  validIntervalCount: number;
} {
  const metrics = calculateRefuelingMetrics(refuelings);
  let totalKm = 0;
  let totalLiters = 0;
  let totalCost = 0;
  let validIntervalCount = 0;

  metrics.forEach((r) => {
    if (r.calculatedKmL && r.kmTraveled && r.kmTraveled > 0 && r.costPerKm) {
      const liters = r.kmTraveled / r.calculatedKmL;
      const cost = r.costPerKm * r.kmTraveled;
      totalKm += r.kmTraveled;
      totalLiters += liters;
      totalCost += cost;
      validIntervalCount++;
    }
  });

  const averageKmL = totalKm > 0 && totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : '--';
  const averageCostPerKm = totalKm > 0 && totalCost > 0 ? formatCurrency(totalCost / totalKm) : '--';

  return { averageKmL, averageCostPerKm, validIntervalCount };
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
 * Generate an unambiguous 6-character sharing code (e.g., 8K4M9P)
 */
export function generateShareCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
