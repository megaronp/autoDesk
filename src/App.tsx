import React, { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VehicleProvider, useVehicles } from './context/VehicleContext';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { MaintenanceAlertBanner } from './components/MaintenanceAlertBanner';
import { AutoCheckLogo } from './components/AutoCheckLogo';
import { Maintenance, Vehicle } from './types/vehicle';
import { Loader2 } from 'lucide-react';

// Code-split tabs and modals for lightning-fast initial load
const DashboardTab = lazy(() => import('./components/DashboardTab').then((m) => ({ default: m.DashboardTab })));
const FuelTab = lazy(() => import('./components/FuelTab').then((m) => ({ default: m.FuelTab })));
const MaintenanceTab = lazy(() => import('./components/MaintenanceTab').then((m) => ({ default: m.MaintenanceTab })));
const HistoryTab = lazy(() => import('./components/HistoryTab').then((m) => ({ default: m.HistoryTab })));
const FamilyTab = lazy(() => import('./components/FamilyTab').then((m) => ({ default: m.FamilyTab })));
const LoginModal = lazy(() => import('./components/LoginModal').then((m) => ({ default: m.LoginModal })));
const RefuelingModal = lazy(() => import('./components/RefuelingModal').then((m) => ({ default: m.RefuelingModal })));
const MaintenanceModal = lazy(() => import('./components/MaintenanceModal').then((m) => ({ default: m.MaintenanceModal })));
const CompleteMaintenanceModal = lazy(() =>
  import('./components/CompleteMaintenanceModal').then((m) => ({ default: m.CompleteMaintenanceModal }))
);
const ShareVehicleModal = lazy(() => import('./components/ShareVehicleModal').then((m) => ({ default: m.ShareVehicleModal })));
const VehicleModal = lazy(() => import('./components/VehicleModal').then((m) => ({ default: m.VehicleModal })));

const TabLoadingFallback: React.FC = () => (
  <div className="py-24 text-center space-y-3">
    <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto" />
    <p className="text-xs text-slate-500 font-medium">Carregando...</p>
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: vehicleLoading, activeVehicle } = useVehicles();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modals state
  const [isRefuelingOpen, setIsRefuelingOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [completingMaintenance, setCompletingMaintenance] = useState<Maintenance | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07080a] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden select-none">
        {/* Subtle orange ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-8 animate-in fade-in duration-300">
          <AutoCheckLogo variant="vertical" theme="dark" size="splash" showSubtitle={true} />

          <div className="pt-2 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Carregando AutoCheck...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<TabLoadingFallback />}>
        <LoginModal />
      </Suspense>
    );
  }

  const handleOpenNewVehicle = () => {
    setVehicleToEdit(null);
    setIsVehicleModalOpen(true);
  };

  const handleEditVehicle = () => {
    setVehicleToEdit(activeVehicle);
    setIsVehicleModalOpen(true);
  };

  const handleStartCompleteMaintenance = (m: Maintenance) => {
    setCompletingMaintenance(m);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenNewVehicle={handleOpenNewVehicle}
        onOpenShareModal={() => setIsShareOpen(true)}
        onOpenVehicleModal={handleEditVehicle}
      />

      {/* Persistent Daily Maintenance Alert Banner */}
      <MaintenanceAlertBanner onCompleteMaintenance={handleStartCompleteMaintenance} />

      {/* Main View Area */}
      <main className="flex-1 max-w-md sm:max-w-xl w-full mx-auto px-4 py-4">
        {vehicleLoading && !activeVehicle ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Sincronizando veículos no Firebase...</p>
          </div>
        ) : (
          <Suspense fallback={<TabLoadingFallback />}>
            {activeTab === 'dashboard' && (
              <DashboardTab
                onOpenRefueling={() => setIsRefuelingOpen(true)}
                onOpenMaintenance={() => setIsMaintenanceOpen(true)}
                onOpenShare={() => setActiveTab('share')}
                onCompleteMaintenance={handleStartCompleteMaintenance}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenNewVehicle={handleOpenNewVehicle}
              />
            )}

            {activeTab === 'fuel' && (
              <FuelTab onOpenNewRefueling={() => setIsRefuelingOpen(true)} />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceTab
                onOpenNewMaintenance={() => setIsMaintenanceOpen(true)}
                onCompleteMaintenance={handleStartCompleteMaintenance}
              />
            )}

            {activeTab === 'history' && <HistoryTab />}

            {activeTab === 'share' && <FamilyTab onOpenNewVehicle={handleOpenNewVehicle} />}
          </Suspense>
        )}
      </main>

      {/* Mobile-first bottom navigation bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Global Modals - Lazy Loaded */}
      <Suspense fallback={null}>
        {isRefuelingOpen && (
          <RefuelingModal
            isOpen={isRefuelingOpen}
            onClose={() => setIsRefuelingOpen(false)}
          />
        )}

        {isMaintenanceOpen && (
          <MaintenanceModal
            isOpen={isMaintenanceOpen}
            onClose={() => setIsMaintenanceOpen(false)}
          />
        )}

        {completingMaintenance && (
          <CompleteMaintenanceModal
            maintenance={completingMaintenance}
            isOpen={Boolean(completingMaintenance)}
            onClose={() => setCompletingMaintenance(null)}
          />
        )}

        {isShareOpen && (
          <ShareVehicleModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
          />
        )}

        {isVehicleModalOpen && (
          <VehicleModal
            isOpen={isVehicleModalOpen}
            onClose={() => setIsVehicleModalOpen(false)}
            vehicleToEdit={vehicleToEdit}
          />
        )}
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <VehicleProvider>
        <AppContent />
      </VehicleProvider>
    </AuthProvider>
  );
}
