import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'client' | 'doer' | 'admin' | null;

interface User {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  language: 'en' | 'te' | 'hi';
  photo_url?: string;
  created_at: string;
  onboarding_completed?: boolean;
}

interface UserContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  role: UserRole;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile data with role from user_roles table
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .single();
            
            if (profile) {
              // Use active_role from the profile (already fetched from users table)
              // active_role represents the currently selected role
              profile.role = profile.active_role;
            }
            
            setUser(profile);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single()
          .then(async ({ data: profile }) => {
            if (profile) {
              // Use active_role from the profile
              profile.role = profile.active_role;
            }
            setUser(profile);
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAuthenticated = !!session?.user && !!user;
  const role = user?.role || null;

  return (
    <UserContext.Provider value={{ 
      user, 
      session, 
      isAuthenticated, 
      role, 
      isLoading, 
      signOut 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};