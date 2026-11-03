import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  writeBatch,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  where,
  arrayUnion,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestoreData } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Vehicle, Refueling, Maintenance, MaintenanceAlert, FuelType } from '../types/vehicle';
import {
  calculateRefuelingMetrics,
  evaluateMaintenanceAlerts,
  generateShareCode,
  getLocalDateString,
} from '../utils/calculations';
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
  leaveVehicle: (vehicleId: string) => Promise<void>;
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

const LOCAL_STORAGE_ACTIVE_KEY = 'autocheck_active_vehicle_id';
const LOCAL_STORAGE_DISMISSED_ALERTS = 'autocheck_dismissed_alerts_daily';

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleIdState] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY) || null;
  });
  const [rawRefuelings, setRawRefuelings] = useState<Refueling[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);

  // Store active vehicle ID in ref to prevent tearing down listeners upon vehicle change
  const activeVehicleIdRef = useRef<string | null>(activeVehicleId);
  useEffect(() => {
    activeVehicleIdRef.current = activeVehicleId;
  }, [activeVehicleId]);

  // Persist dismissed alerts per day: { [maintenanceId]: 'YYYY-MM-DD' }
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_DISMISSED_ALERTS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const setActiveVehicleId = (id: string) => {
    setActiveVehicleIdState(id);
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, id);
  };

  const activeVehicle = useMemo(() => {
    if (!activeVehicleId) return vehicles[0] || null;
    return vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || null;
  }, [vehicles, activeVehicleId]);

  // Recalculate refueling metrics
  const refuelings = useMemo(() => {
    return calculateRefuelingMetrics(rawRefuelings);
  }, [rawRefuelings]);

  // Evaluate maintenance alerts
  const alerts = useMemo(() => {
    if (!activeVehicle) return [];
    return evaluateMaintenanceAlerts(activeVehicle, maintenances);
  }, [activeVehicle, maintenances]);

  // Send browser notifications
  useEffect(() => {
    if (!activeVehicle || alerts.length === 0) return;

    const todayStr = getLocalDateString();
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

  const dismissAlertForToday = (maintenanceId: string) => {
    const todayStr = getLocalDateString();
    const updated = { ...dismissedAlerts, [maintenanceId]: todayStr };
    setDismissedAlerts(updated);
    localStorage.setItem(LOCAL_STORAGE_DISMISSED_ALERTS, JSON.stringify(updated));
  };

  // Sync Real Vehicles from Firestore securely (strictly scoped to owner or shared email)
  // Decoupled from activeVehicleId so switching cars NEVER re-queries Firestore!
  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setRawRefuelings([]);
      setMaintenances([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userEmail = user.email ? user.email.trim() : '';
    const ownedMap = new Map<string, Vehicle>();
    const sharedMap = new Map<string, Vehicle>();

    const updateCombined = () => {
      const combined = new Map<string, Vehicle>();
      ownedMap.forEach((v, k) => combined.set(k, v));
      sharedMap.forEach((v, k) => combined.set(k, v));
      const fetchedVehicles = Array.from(combined.values());

      fetchedVehicles.sort((a, b) => {
        if (a.ownerId === user.uid && b.ownerId !== user.uid) return -1;
        if (a.ownerId !== user.uid && b.ownerId === user.uid) return 1;
        return a.name.localeCompare(b.name);
      });

      setVehicles(fetchedVehicles);

      if (fetchedVehicles.length > 0) {
        const currentActive = activeVehicleIdRef.current;
        if (!currentActive || !fetchedVehicles.some((v) => v.id === currentActive)) {
          const firstId = fetchedVehicles[0].id;
          setActiveVehicleIdState(firstId);
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, firstId);
        }
      } else {
        setActiveVehicleIdState(null);
      }
      setLoading(false);
    };

    // 1. Query vehicles owned by this user
    const ownedQuery = query(collection(db, 'vehicles'), where('ownerId', '==', user.uid));
    const unsubOwned = onSnapshot(
      ownedQuery,
      (snapshot) => {
        ownedMap.clear();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          ownedMap.set(docSnap.id, { id: docSnap.id, ...(data as Omit<Vehicle, 'id'>) });

          // Self-heal legacy vehicles that might lack a shareCodes/{code} document
          if (data.ownerId === user.uid) {
            if (data.shareCode) {
              getDoc(doc(db, 'shareCodes', data.shareCode)).then((codeSnap) => {
                if (!codeSnap.exists()) {
                  setDoc(doc(db, 'shareCodes', data.shareCode), {
                    code: data.shareCode,
                    vehicleId: docSnap.id,
                    vehicleName: data.name || 'Veículo',
                    ownerId: user.uid,
                    createdAt: new Date().toISOString(),
                  }).catch(() => {});
                }
              }).catch(() => {});
            } else {
              const newCode = generateShareCode();
              const b = writeBatch(db);
              b.update(docSnap.ref, { shareCode: newCode, updatedAt: new Date().toISOString() });
              b.set(doc(db, 'shareCodes', newCode), {
                code: newCode,
                vehicleId: docSnap.id,
                vehicleName: data.name || 'Veículo',
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
              });
              b.commit().catch(() => {});
            }
          }
        });
        updateCombined();
      },
      (error) => {
        console.error('Erro ao buscar veículos próprios:', error);
        setLoading(false);
      }
    );

    // 2. Query vehicles shared with this user's email
    let unsubShared: (() => void) | null = null;
    if (userEmail) {
      const sharedQuery = query(collection(db, 'vehicles'), where('sharedWithEmails', 'array-contains', userEmail));
      unsubShared = onSnapshot(
        sharedQuery,
        (snapshot) => {
          sharedMap.clear();
          snapshot.forEach((docSnap) => {
            sharedMap.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<Vehicle, 'id'>) });
          });
          updateCombined();
        },
        (error) => {
          console.error('Erro ao buscar veículos compartilhados:', error);
          setLoading(false);
        }
      );
    }

    return () => {
      unsubOwned();
      if (unsubShared) unsubShared();
    };
  }, [user?.uid, user?.email]);

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
  }, [activeVehicle?.id, user?.uid]);

  // Add new Vehicle with atomic ShareCode indexing
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

    const shareCode = generateShareCode();
    const vehicleDocRef = doc(collection(db, 'vehicles'));
    const shareCodeDocRef = doc(db, 'shareCodes', shareCode);

    const newVehicleData = sanitizeFirestoreData({
      ...data,
      plate: data.plate.toUpperCase().trim(),
      initialMileage: data.currentMileage,
      ownerId: user.uid,
      ownerEmail: (user.email || '').toLowerCase(),
      sharedWithEmails: [],
      shareCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const shareCodeData = sanitizeFirestoreData({
      code: shareCode,
      vehicleId: vehicleDocRef.id,
      vehicleName: data.name.trim(),
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
    });

    try {
      const batch = writeBatch(db);
      batch.set(vehicleDocRef, newVehicleData);
      batch.set(shareCodeDocRef, shareCodeData);
      await batch.commit();

      setActiveVehicleId(vehicleDocRef.id);
      return vehicleDocRef.id;
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

  // Cascading deletion with safe batch slicing (under 500 limit)
  const deleteVehicle = async (id: string) => {
    const targetVehicle = vehicles.find((v) => v.id === id);
    if (!targetVehicle) return;

    try {
      // 1. Fetch all refuelings, maintenances, and joins in parallel
      const [refuelsSnap, maintsSnap, joinsSnap] = await Promise.all([
        getDocs(collection(db, 'vehicles', id, 'refuelings')),
        getDocs(collection(db, 'vehicles', id, 'maintenances')),
        getDocs(collection(db, 'vehicles', id, 'joins')),
      ]);

      const allRefsToDelete = [
        ...refuelsSnap.docs.map((d) => d.ref),
        ...maintsSnap.docs.map((d) => d.ref),
        ...joinsSnap.docs.map((d) => d.ref),
      ];

      // Delete subcollection documents in chunks of 400 operations
      const CHUNK_SIZE = 400;
      for (let i = 0; i < allRefsToDelete.length; i += CHUNK_SIZE) {
        const chunk = allRefsToDelete.slice(i, i + CHUNK_SIZE);
        const chunkBatch = writeBatch(db);
        chunk.forEach((ref) => chunkBatch.delete(ref));
        await chunkBatch.commit();
      }

      // Final batch: shareCode document + vehicle document
      const finalBatch = writeBatch(db);
      if (targetVehicle.shareCode) {
        finalBatch.delete(doc(db, 'shareCodes', targetVehicle.shareCode));
      }
      finalBatch.delete(doc(db, 'vehicles', id));
      await finalBatch.commit();

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

  // Voluntary leaving a shared vehicle (removing only own email)
  const leaveVehicle = async (vehicleId: string) => {
    if (!user || !user.email) return;
    const userEmail = user.email.trim();
    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) return;

    try {
      const updatedShared = (target.sharedWithEmails || []).filter(
        (e) => e.toLowerCase() !== userEmail.toLowerCase()
      );

      await updateDoc(doc(db, 'vehicles', vehicleId), {
        sharedWithEmails: updatedShared,
        updatedAt: new Date().toISOString(),
      });

      const remaining = vehicles.filter((v) => v.id !== vehicleId);
      if (remaining.length > 0) {
        setActiveVehicleId(remaining[0].id);
      } else {
        setActiveVehicleIdState(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `vehicles/${vehicleId}`);
    }
  };

  // Share with email (owner only)
  const shareVehicleWithEmail = async (vehicleId: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error('Veículo não encontrado');

    if (vehicle.sharedWithEmails?.map((e) => e.toLowerCase()).includes(cleanEmail)) {
      return;
    }

    const updatedShared = [...(vehicle.sharedWithEmails || []), cleanEmail];
    await updateVehicle(vehicleId, { sharedWithEmails: updatedShared });
  };

  const removeShareEmail = async (vehicleId: string, email: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const cleanEmail = email.trim().toLowerCase();
    const updatedShared = (vehicle.sharedWithEmails || []).filter((e) => e.toLowerCase() !== cleanEmail);
    await updateVehicle(vehicleId, { sharedWithEmails: updatedShared });
  };

  // Join car via 6-digit share code using cryptographic proof-of-code pattern
  const joinVehicleByShareCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Você precisa estar conectado.' };
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode || cleanCode.length < 4) {
      return { success: false, message: 'Código de compartilhamento inválido.' };
    }

    try {
      // 1. Direct get lookup on shareCodes/{code}
      const shareDocSnap = await getDoc(doc(db, 'shareCodes', cleanCode));

      if (!shareDocSnap.exists()) {
        return { success: false, message: 'Código de compartilhamento não encontrado.' };
      }

      const shareData = shareDocSnap.data();
      const targetVehicleId = shareData.vehicleId;
      const userEmail = (user.email || '').trim();

      if (!userEmail) {
        return { success: false, message: 'Seu usuário precisa de um e-mail válido para conectar ao veículo.' };
      }

      if (shareData.ownerId === user.uid) {
        return { success: false, message: 'Você já é o proprietário deste veículo.' };
      }

      if (vehicles.some((v) => v.id === targetVehicleId)) {
        setActiveVehicleId(targetVehicleId);
        return { success: true, message: 'Você já possui acesso a este veículo.' };
      }

      // 2. Write join proof doc in subcollection vehicles/{vehicleId}/joins/{user.uid}
      // Proves to Firestore security rules that the user possesses a valid share code
      await setDoc(doc(db, 'vehicles', targetVehicleId, 'joins', user.uid), {
        code: cleanCode,
        joinedAt: new Date().toISOString(),
        userEmail: userEmail,
        userId: user.uid,
      });

      // 3. Atomically join by appending email using arrayUnion (allowed by Case 3 rule)
      await updateDoc(doc(db, 'vehicles', targetVehicleId), {
        sharedWithEmails: arrayUnion(userEmail),
        updatedAt: new Date().toISOString(),
      });

      setActiveVehicleId(targetVehicleId);
      const carName = shareData.vehicleName ? `ao veículo ${shareData.vehicleName}` : 'ao veículo';
      return { success: true, message: `Conectado ${carName} com sucesso!` };
    } catch (err) {
      console.error('Erro ao conectar via código:', err);
      return { success: false, message: 'Falha de permissão ou rede ao conectar ao veículo. Verifique o código e tente novamente.' };
    }
  };

  // Add Refueling with atomic writeBatch and author recording
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
      const batch = writeBatch(db);
      const newRefuelDoc = doc(collection(db, 'vehicles', activeVehicle.id, 'refuelings'));
      batch.set(newRefuelDoc, newRecord);

      if (data.mileage > activeVehicle.currentMileage) {
        batch.update(doc(db, 'vehicles', activeVehicle.id), {
          currentMileage: data.mileage,
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
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

  // Add scheduled maintenance with author recording
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

  // Complete a maintenance with atomic writeBatch
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
        nextDueDate = getLocalDateString(nextDate);
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
      const batch = writeBatch(db);
      batch.update(doc(db, 'vehicles', activeVehicle.id, 'maintenances', id), completedFields);

      if (nextMaintenanceItem) {
        const nextDocRef = doc(collection(db, 'vehicles', activeVehicle.id, 'maintenances'));
        batch.set(nextDocRef, nextMaintenanceItem);
      }

      if (completionData.completedMileage > activeVehicle.currentMileage) {
        batch.update(doc(db, 'vehicles', activeVehicle.id), {
          currentMileage: completionData.completedMileage,
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
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

  // Compute list of dismissed alert IDs specifically for TODAY in local time
  const todayStr = getLocalDateString();
  const todayDismissedAlertIds = useMemo(() => {
    return Object.entries(dismissedAlerts)
      .filter(([_, d]) => d === todayStr)
      .map(([id]) => id);
  }, [dismissedAlerts, todayStr]);

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
        leaveVehicle,
        shareVehicleWithEmail,
        removeShareEmail,
        joinVehicleByShareCode,
        addRefueling,
        deleteRefueling,
        addMaintenance,
        completeMaintenance,
        deleteMaintenance,
        dismissAlertForToday,
        dismissedAlertIds: todayDismissedAlertIds,
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
