import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestoreData } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Vehicle, Refueling, Maintenance, MaintenanceAlert, FuelType } from '../types/vehicle';
import { calculateRefuelingMetrics, evaluateMaintenanceAlerts, generateShareCode } from '../utils/calculations';
import { sendBrowserNotification, playAlertChime } from '../utils/notifications';

interface VehicleContextType {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  activeVehicleId: string | null;
  setActiveVehicleId: (id: string) => void;
  refuelings: Refueling[];
  maintenances: Maintenance[];
  alerts: MaintenanceAlert[];
  loading: boolean;
  addVehicle: (data: {
    name: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
    fuelType: FuelType;
    currentMileage: number;
    color?: string;
  }) => Promise<string>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  shareVehicleWithEmail: (vehicleId: string, email: string) => Promise<void>;
  removeShareEmail: (vehicleId: string, email: string) => Promise<void>;
  joinVehicleByShareCode: (code: string) => Promise<{ success: boolean; message: string }>;
  addRefueling: (data: {
    date: string;
    mileage: number;
    liters: number;
    pricePerLiter: number;
    totalCost: number;
    fuelType: string;
    isFullTank: boolean;
    gasStation?: string;
    notes?: string;
  }) => Promise<void>;
  deleteRefueling: (id: string) => Promise<void>;
  addMaintenance: (data: {
    title: string;
    category: string;
    dueType: 'km' | 'date' | 'both';
    dueMileage?: number;
    dueDate?: string;
    nextIntervalKm?: number;
    nextIntervalMonths?: number;
    notes?: string;
  }) => Promise<void>;
  completeMaintenance: (
    id: string,
    completionData: {
      completedMileage: number;
      completedCost: number;
      workDone: string;
      workshop?: string;
      notes?: string;
      scheduleNextKm?: number;
      scheduleNextMonths?: number;
    }
  ) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;
  dismissAlertForToday: (maintenanceId: string) => void;
  dismissedAlertIds: string[];
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

const LOCAL_STORAGE_ACTIVE_VEHICLE = 'autocheck_active_vehicle_id';
const LOCAL_STORAGE_DISMISSED_ALERTS = 'autocheck_dismissed_alerts_date';

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleIdState] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_ACTIVE_VEHICLE) || null;
  });
  const [rawRefuelings, setRawRefuelings] = useState<Refueling[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<{ [id: string]: string }>({});

  // Active vehicle reference
  const activeVehicle = useMemo(() => {
    if (!vehicles.length) return null;
    return vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];
  }, [vehicles, activeVehicleId]);

  const setActiveVehicleId = useCallback((id: string) => {
    setActiveVehicleIdState(id);
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_VEHICLE, id);
  }, []);

  // Compute calculated metrics on refuelings (sorted by mileage)
  const refuelings = useMemo(() => {
    return calculateRefuelingMetrics(rawRefuelings);
  }, [rawRefuelings]);

  // Compute active alerts for current vehicle
  const alerts = useMemo(() => {
    if (!activeVehicle) return [];
    return evaluateMaintenanceAlerts(activeVehicle, maintenances);
  }, [activeVehicle, maintenances]);

  // Check and dispatch notifications when alerts are detected
  useEffect(() => {
    if (!activeVehicle || alerts.length === 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const criticalOrWarning = alerts.filter(
      (a) => (a.urgency === 'critical' || a.urgency === 'warning') && dismissedAlerts[a.maintenance.id] !== todayStr
    );

    if (criticalOrWarning.length > 0) {
      const topAlert = criticalOrWarning[0];
      const notificationTitle = `AutoCheck: ${topAlert.urgency === 'critical' ? 'Revisão Urgente' : 'Lembrete de Manutenção'}`;
      const notificationBody = `${topAlert.maintenance.title} (${activeVehicle.name}): ${topAlert.reasonKm || topAlert.reasonDate || ''}`;

      sendBrowserNotification(notificationTitle, {
        body: notificationBody,
        tag: `autocheck-alert-${topAlert.maintenance.id}`,
      });

      if (topAlert.urgency === 'critical') {
        playAlertChime('critical');
      }
    }
  }, [alerts, activeVehicle, dismissedAlerts]);

  // Load dismissed alerts for today
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_DISMISSED_ALERTS);
      if (raw) {
        setDismissedAlerts(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const dismissAlertForToday = (maintenanceId: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const updated = { ...dismissedAlerts, [maintenanceId]: todayStr };
    setDismissedAlerts(updated);
    localStorage.setItem(LOCAL_STORAGE_DISMISSED_ALERTS, JSON.stringify(updated));
  };

  // Sync Real Vehicles from Firestore for current user
  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setRawRefuelings([]);
      setMaintenances([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const vehiclesColRef = collection(db, 'vehicles');
    const unsubscribe = onSnapshot(
      vehiclesColRef,
      (snapshot) => {
        const userEmail = user.email?.toLowerCase() || '';
        const fetchedVehicles: Vehicle[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Vehicle, 'id'>;
          const isOwner = data.ownerId === user.uid;
          const isShared =
            Array.isArray(data.sharedWithEmails) &&
            data.sharedWithEmails.some((email) => email.toLowerCase() === userEmail);

          if (isOwner || isShared) {
            fetchedVehicles.push({
              id: docSnap.id,
              ...data,
            });
          }
        });

        fetchedVehicles.sort((a, b) => {
          if (a.ownerId === user.uid && b.ownerId !== user.uid) return -1;
          if (a.ownerId !== user.uid && b.ownerId === user.uid) return 1;
          return a.name.localeCompare(b.name);
        });

        setVehicles(fetchedVehicles);

        if (fetchedVehicles.length > 0) {
          if (!activeVehicleId || !fetchedVehicles.some((v) => v.id === activeVehicleId)) {
            setActiveVehicleId(fetchedVehicles[0].id);
          }
        } else {
          setActiveVehicleIdState(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar veículos no Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeVehicleId, setActiveVehicleId]);

  // Sync refuelings and maintenances for active vehicle
  useEffect(() => {
    if (!activeVehicle || !user) {
      setRawRefuelings([]);
      setMaintenances([]);
      return;
    }

    const refuelingsRef = collection(db, 'vehicles', activeVehicle.id, 'refuelings');
    const unsubRefueling = onSnapshot(
      refuelingsRef,
      (snapshot) => {
        const list: Refueling[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Refueling, 'id'>) });
        });
        setRawRefuelings(list);
      },
      (err) => {
        console.error('Erro ao ler abastecimentos:', err);
      }
    );

    const maintenancesRef = collection(db, 'vehicles', activeVehicle.id, 'maintenances');
    const unsubMaint = onSnapshot(
      maintenancesRef,
      (snapshot) => {
        const list: Maintenance[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Maintenance, 'id'>) });
        });
        setMaintenances(list);
      },
      (err) => {
        console.error('Erro ao ler manutenções:', err);
      }
    );

    return () => {
      unsubRefueling();
      unsubMaint();
    };
  }, [activeVehicle, user]);

  // Add new Vehicle
  const addVehicle = async (data: {
    name: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
    fuelType: FuelType;
    currentMileage: number;
    color?: string;
  }): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    const newVehicleData = sanitizeFirestoreData({
      ...data,
      plate: data.plate.toUpperCase().trim(),
      initialMileage: data.currentMileage,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      sharedWithEmails: [],
      shareCode: generateShareCode(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      const docRef = await addDoc(collection(db, 'vehicles'), newVehicleData);
      setActiveVehicleId(docRef.id);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vehicles');
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      const sanitizedUpdates = sanitizeFirestoreData({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'vehicles', id), sanitizedUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `vehicles/${id}`);
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'vehicles', id));
      const remaining = vehicles.filter((v) => v.id !== id);
      if (remaining.length > 0) {
        setActiveVehicleId(remaining[0].id);
      } else {
        setActiveVehicleIdState(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `vehicles/${id}`);
    }
  };

  // Share with email (e.g. spouse)
  const shareVehicleWithEmail = async (vehicleId: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    if (vehicle.sharedWithEmails?.includes(cleanEmail)) {
      return;
    }

    const updatedShared = [...(vehicle.sharedWithEmails || []), cleanEmail];
    await updateVehicle(vehicleId, { sharedWithEmails: updatedShared });
  };

  const removeShareEmail = async (vehicleId: string, email: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const updatedShared = (vehicle.sharedWithEmails || []).filter((e) => e.toLowerCase() !== email.toLowerCase());
    await updateVehicle(vehicleId, { sharedWithEmails: updatedShared });
  };

  // Join car via 6-digit share code
  const joinVehicleByShareCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Você precisa estar conectado.' };
    const cleanCode = code.trim().toUpperCase();

    try {
      const q = query(collection(db, 'vehicles'), where('shareCode', '==', cleanCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, message: 'Código de compartilhamento não encontrado.' };
      }

      const carDoc = snap.docs[0];
      const carData = carDoc.data() as Vehicle;
      const userEmail = (user.email || '').toLowerCase();

      if (carData.ownerId === user.uid) {
        return { success: false, message: 'Você já é o proprietário deste veículo.' };
      }

      const existingShared = carData.sharedWithEmails || [];
      if (!existingShared.includes(userEmail) && userEmail) {
        existingShared.push(userEmail);
        await updateDoc(doc(db, 'vehicles', carDoc.id), {
          sharedWithEmails: existingShared,
          updatedAt: new Date().toISOString(),
        });
      }

      setActiveVehicleId(carDoc.id);
      return { success: true, message: `Conectado ao veículo ${carData.name} com sucesso!` };
    } catch (err) {
      console.error('Erro ao conectar via código:', err);
      return { success: false, message: 'Ocorreu um erro ao conectar. Tente novamente.' };
    }
  };

  // Add Refueling
  const addRefueling = async (data: {
    date: string;
    mileage: number;
    liters: number;
    pricePerLiter: number;
    totalCost: number;
    fuelType: string;
    isFullTank: boolean;
    gasStation?: string;
    notes?: string;
  }) => {
    if (!activeVehicle || !user) throw new Error('Nenhum veículo selecionado');

    const newRecord = sanitizeFirestoreData({
      ...data,
      vehicleId: activeVehicle.id,
      createdByUid: user.uid,
      createdByName: profile?.name || user.displayName || 'Motorista',
      createdAt: new Date().toISOString(),
    });

    try {
      await addDoc(collection(db, 'vehicles', activeVehicle.id, 'refuelings'), newRecord);

      if (data.mileage > activeVehicle.currentMileage) {
        await updateDoc(doc(db, 'vehicles', activeVehicle.id), {
          currentMileage: data.mileage,
          updatedAt: new Date().toISOString(),
        });
      }
      playAlertChime('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `vehicles/${activeVehicle.id}/refuelings`);
    }
  };

  const deleteRefueling = async (id: string) => {
    if (!activeVehicle) return;
    try {
      await deleteDoc(doc(db, 'vehicles', activeVehicle.id, 'refuelings', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `vehicles/${activeVehicle.id}/refuelings/${id}`);
    }
  };

  // Add scheduled maintenance
  const addMaintenance = async (data: {
    title: string;
    category: string;
    dueType: 'km' | 'date' | 'both';
    dueMileage?: number;
    dueDate?: string;
    nextIntervalKm?: number;
    nextIntervalMonths?: number;
    notes?: string;
  }) => {
    if (!activeVehicle || !user) throw new Error('Nenhum veículo selecionado');

    const rawPayload: Record<string, any> = {
      title: data.title,
      category: data.category,
      dueType: data.dueType,
      vehicleId: activeVehicle.id,
      status: 'pending',
      createdByUid: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (data.dueMileage !== undefined && data.dueMileage !== null && !isNaN(Number(data.dueMileage))) {
      rawPayload.dueMileage = Number(data.dueMileage);
    }
    if (data.dueDate && typeof data.dueDate === 'string' && data.dueDate.trim() !== '') {
      rawPayload.dueDate = data.dueDate.trim();
    }
    if (data.nextIntervalKm !== undefined && data.nextIntervalKm !== null && !isNaN(Number(data.nextIntervalKm))) {
      rawPayload.nextIntervalKm = Number(data.nextIntervalKm);
    }
    if (data.nextIntervalMonths !== undefined && data.nextIntervalMonths !== null && !isNaN(Number(data.nextIntervalMonths))) {
      rawPayload.nextIntervalMonths = Number(data.nextIntervalMonths);
    }
    if (data.notes && data.notes.trim()) {
      rawPayload.notes = data.notes.trim();
    }

    const newMaint = sanitizeFirestoreData(rawPayload);

    try {
      await addDoc(collection(db, 'vehicles', activeVehicle.id, 'maintenances'), newMaint);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `vehicles/${activeVehicle.id}/maintenances`);
    }
  };

  // Complete a maintenance
  const completeMaintenance = async (
    id: string,
    completionData: {
      completedMileage: number;
      completedCost: number;
      workDone: string;
      workshop?: string;
      notes?: string;
      scheduleNextKm?: number;
      scheduleNextMonths?: number;
    }
  ) => {
    if (!activeVehicle || !user) throw new Error('Nenhum veículo selecionado');
    const existing = maintenances.find((m) => m.id === id);
    if (!existing) return;

    const completedFields = sanitizeFirestoreData({
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedMileage: completionData.completedMileage,
      completedCost: completionData.completedCost || 0,
      workDone: completionData.workDone,
      workshop: completionData.workshop || '',
      notes: completionData.notes || existing.notes || '',
      updatedAt: new Date().toISOString(),
    });

    let nextMaintenanceItem: Record<string, any> | null = null;
    const intervalKm = completionData.scheduleNextKm ?? existing.nextIntervalKm;
    const intervalMonths = completionData.scheduleNextMonths ?? existing.nextIntervalMonths;

    if (intervalKm || intervalMonths) {
      let nextDueMileage: number | undefined = undefined;
      let nextDueDate: string | undefined = undefined;

      if (intervalKm) {
        nextDueMileage = completionData.completedMileage + intervalKm;
      }

      if (intervalMonths) {
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + intervalMonths);
        nextDueDate = nextDate.toISOString().slice(0, 10);
      }

      const nextRaw: Record<string, any> = {
        vehicleId: activeVehicle.id,
        title: existing.title,
        category: existing.category,
        dueType: nextDueMileage && nextDueDate ? 'both' : nextDueMileage ? 'km' : 'date',
        status: 'pending',
        notes: `Agendada após conclusão em ${new Date().toLocaleDateString('pt-BR')}`,
        createdByUid: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (nextDueMileage !== undefined) {
        nextRaw.dueMileage = nextDueMileage;
      }
      if (nextDueDate !== undefined) {
        nextRaw.dueDate = nextDueDate;
      }
      if (intervalKm !== undefined) {
        nextRaw.nextIntervalKm = intervalKm;
      }
      if (intervalMonths !== undefined) {
        nextRaw.nextIntervalMonths = intervalMonths;
      }

      nextMaintenanceItem = sanitizeFirestoreData(nextRaw);
    }

    try {
      await updateDoc(doc(db, 'vehicles', activeVehicle.id, 'maintenances', id), completedFields);

      if (nextMaintenanceItem) {
        await addDoc(collection(db, 'vehicles', activeVehicle.id, 'maintenances'), nextMaintenanceItem);
      }

      if (completionData.completedMileage > activeVehicle.currentMileage) {
        await updateDoc(doc(db, 'vehicles', activeVehicle.id), {
          currentMileage: completionData.completedMileage,
          updatedAt: new Date().toISOString(),
        });
      }
      playAlertChime('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `vehicles/${activeVehicle.id}/maintenances/${id}`);
    }
  };

  const deleteMaintenance = async (id: string) => {
    if (!activeVehicle) return;
    try {
      await deleteDoc(doc(db, 'vehicles', activeVehicle.id, 'maintenances', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `vehicles/${activeVehicle.id}/maintenances/${id}`);
    }
  };

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        activeVehicle,
        activeVehicleId,
        setActiveVehicleId,
        refuelings,
        maintenances,
        alerts,
        loading,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        shareVehicleWithEmail,
        removeShareEmail,
        joinVehicleByShareCode,
        addRefueling,
        deleteRefueling,
        addMaintenance,
        completeMaintenance,
        deleteMaintenance,
        dismissAlertForToday,
        dismissedAlertIds: Object.keys(dismissedAlerts),
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicles = () => {
  const ctx = useContext(VehicleContext);
  if (!ctx) {
    throw new Error('useVehicles must be used within a VehicleProvider');
  }
  return ctx;
};
