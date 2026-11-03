import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VehicleProvider, useVehicles } from './context/VehicleContext';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { MaintenanceAlertBanner } from './components/MaintenanceAlertBanner';
import { DashboardTab } from './components/DashboardTab';
import { FuelTab } from './components/FuelTab';
import { MaintenanceTab } from './components/MaintenanceTab';
import { HistoryTab } from './components/HistoryTab';
import { FamilyTab } from './components/FamilyTab';
import { AutoCheckLogo } from './components/AutoCheckLogo';
import { RefuelingModal } from './components/RefuelingModal';
import { MaintenanceModal } from './components/MaintenanceModal';
import { CompleteMaintenanceModal } from './components/CompleteMaintenanceModal';
import { ShareVehicleModal } from './components/ShareVehicleModal';
import { VehicleModal } from './components/VehicleModal';
import { LoginModal } from './components/LoginModal';
import { Maintenance, Vehicle } from './types/vehicle';
import { Loader2 } from 'lucide-react';

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
    return <LoginModal />;
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
          <>
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
          </>
        )}
      </main>

      {/* Mobile-first bottom navigation bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Global Modals */}
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
