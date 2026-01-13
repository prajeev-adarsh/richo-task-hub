/**
 * ProtectedRoute - Client-side navigation guard component
 * 
 * SECURITY NOTICE:
 * ================
 * This component provides UI-ONLY access control for user experience purposes.
 * These client-side checks are NOT a security boundary and should NEVER be relied 
 * upon for actual authorization.
 * 
 * All actual security enforcement happens server-side through:
 * 1. Row Level Security (RLS) policies in Supabase
 * 2. Server-side role validation in RPC functions (has_role(), soft_delete_user, etc.)
 * 3. Database policies that independently verify user roles
 * 
 * The client-side checks here only serve to:
 * - Prevent UI confusion by redirecting users to appropriate dashboards
 * - Improve UX by not showing inaccessible routes
 * - Reduce unnecessary API calls to resources users can't access anyway
 * 
 * Never trust client-side role claims for data access - all data access is 
 * protected by server-side RLS policies.
 */
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/components/UserContext';
import { UserRole } from '@/components/UserContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    // UI-ONLY authentication check - server-side RLS enforces actual auth
    if (requireAuth && !isAuthenticated) {
      navigate('/auth');
      return;
    }

    // UI-ONLY role check - server-side RLS policies enforce actual authorization
    // This redirect is purely for UX to guide users to their appropriate dashboard
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on user role
      switch (user.role) {
        case 'client':
          navigate('/client-dashboard');
          break;
        case 'doer':
          navigate('/doer-dashboard');
          break;
        case 'admin':
          navigate('/admin-dashboard');
          break;
        default:
          navigate('/');
      }
    }
  }, [isAuthenticated, user, isLoading, requireAuth, allowedRoles, navigate]);

  // Show loading state
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

  // Show nothing if redirecting (actual data access is protected by server-side RLS)
  if (requireAuth && !isAuthenticated) return null;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
};
