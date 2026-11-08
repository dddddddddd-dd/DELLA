import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { CabinetPage } from './pages/driver/CabinetPage';
import { HistoryPage } from './pages/driver/HistoryPage';
import { CargosPage } from './pages/dispatcher/CargosPage';
import { DriversPage } from './pages/dispatcher/DriversPage';
import { MatchingPage } from './pages/dispatcher/MatchingPage';
import { ComplaintsPage } from './pages/dispatcher/ComplaintsPage';
import { AuditPage } from './pages/dispatcher/AuditPage';
import { AutoCallsPage } from './pages/dispatcher/AutoCallsPage';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('default');
  const [matchingCargoId, setMatchingCargoId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F5F8] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#1D4ED8] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black tracking-wider text-[#0F172A]">DELLA</h2>
        <p className="text-xs text-[#475569] mt-1">Загрузка системы подбора грузов...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Роутинг для водителя
  if (user.role === 'DRIVER') {
    const activeTab = currentTab === 'default' || currentTab === 'cabinet' ? 'cabinet' : 'history';

    return (
      <div className="min-h-screen bg-[#F3F5F8] flex flex-col">
        <Header currentTab={activeTab} onSelectTab={(t) => setCurrentTab(t)} />
        <main className="flex-1">
          {activeTab === 'cabinet' && <CabinetPage />}
          {activeTab === 'history' && <HistoryPage />}
        </main>
      </div>
    );
  }

  // Роутинг для диспетчера
  const activeTab = currentTab === 'default' ? 'cargos' : currentTab;

  return (
    <div className="min-h-screen bg-[#F3F5F8] flex flex-col">
      <Header currentTab={activeTab} onSelectTab={(t) => setCurrentTab(t)} />
      <main className="flex-1">
        {activeTab === 'cargos' && (
          <CargosPage
            onOpenMatchingForCargo={(cargoId) => {
              setMatchingCargoId(cargoId);
              setCurrentTab('matching');
            }}
          />
        )}
        {activeTab === 'drivers' && <DriversPage />}
        {activeTab === 'matching' && <MatchingPage initialCargoId={matchingCargoId} />}
        {activeTab === 'calls' && <AutoCallsPage />}
        {activeTab === 'complaints' && <ComplaintsPage />}
        {activeTab === 'audit' && <AuditPage />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

