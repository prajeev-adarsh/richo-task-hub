import React from 'react';
import { useUser } from '@/components/UserContext';
import Navigation from '@/components/Navigation';
import RoleSelector from '@/components/RoleSelector';
import ClientDashboard from './ClientDashboard';
import DoerDashboard from './DoerDashboard';
import AdminDashboard from './AdminDashboard';
import ClientOnboarding from '@/components/onboarding/ClientOnboarding';
import DoerOnboarding from '@/components/onboarding/DoerOnboarding';

const AppContent = () => {
  const { isAuthenticated, role, isLoading, user } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <RoleSelector />;
  }

  // Show onboarding for new users
  if (user && !user.onboarding_completed) {
    if (role === 'client') {
      return <ClientOnboarding />;
    } else if (role === 'doer') {
      return <DoerOnboarding />;
    }
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
  return <AppContent />;
};

export default Index;