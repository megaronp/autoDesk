export type FuelType = 'Flex' | 'Gasolina' | 'Etanol' | 'Diesel' | 'GNV' | 'Híbrido' | 'Elétrico';

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  fuelType: FuelType;
  currentMileage: number;
  initialMileage: number;
  ownerId: string;
  ownerEmail: string;
  sharedWithEmails: string[];
  shareCode?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Refueling {
  id: string;
  vehicleId: string;
  date: string;
  mileage: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelType: string;
  isFullTank: boolean;
  calculatedKmL?: number;
  kmTraveled?: number;
  costPerKm?: number;
  gasStation?: string;
  notes?: string;
  createdByUid: string;
  createdByName?: string;
  createdAt: string;
}

export type MaintenanceDueType = 'km' | 'date' | 'both';
export type MaintenanceStatus = 'pending' | 'completed';

export interface Maintenance {
  id: string;
  vehicleId: string;
  title: string;
  category: string;
  dueType: MaintenanceDueType;
  dueMileage?: number;
  dueDate?: string; // YYYY-MM-DD
  status: MaintenanceStatus;
  completedAt?: string;
  completedMileage?: number;
  completedCost?: number;
  workDone?: string;
  workshop?: string;
  notes?: string;
  nextIntervalKm?: number;
  nextIntervalMonths?: number;
  lastDailyAlertDate?: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceAlert {
  maintenance: Maintenance;
  vehicle: Vehicle;
  urgency: 'info' | 'warning' | 'critical';
  reasonKm?: string;
  reasonDate?: string;
  remainingKm?: number;
  remainingDays?: number;
  message: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  notificationsEnabled?: boolean;
  lastActiveVehicleId?: string;
}
