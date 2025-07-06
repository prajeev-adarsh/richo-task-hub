import React from 'react';
import { LanguageProvider } from '@/components/LanguageContext';
import { UserProvider, useUser } from '@/components/UserContext';
import Navigation from '@/components/Navigation';
import RoleSelector from '@/components/RoleSelector';
import ClientDashboard from './ClientDashboard';
import DoerDashboard from './DoerDashboard';
import AdminDashboard from './AdminDashboard';

const AppContent = () => {
  const { isAuthenticated, role } = useUser();

  if (!isAuthenticated) {
    return <RoleSelector />;
  }

  const renderDashboard = () => {
    switch (role) {
      case 'client':
        return <ClientDashboard />;
      case 'doer':
        return <DoerDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <RoleSelector />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {renderDashboard()}
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <UserProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </UserProvider>
  );
};

export default Index;
