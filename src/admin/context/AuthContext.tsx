import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { User } from '@supabase/supabase-js';
import { isMockMode } from '../../integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInMock: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER: User = {
  id: 'mock-admin-id',
  email: 'admin@larasilla.com',
  app_metadata: {},
  user_metadata: { full_name: 'Admin La Rasilla' },
  aud: 'authenticated',
  created_at: new Date().toISOString()
} as User;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
      const mockSession = localStorage.getItem('mock_session');
      if (mockSession) {
        setUser(MOCK_USER);
      }
      setLoading(false);
      return;
    }

    try {
      // Check active session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch(err => {
        console.error("Auth session error:", err);
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } catch (err) {
      console.error("Supabase initialization error:", err);
      setLoading(false);
    }
  }, []);

  const signOut = async () => {
    if (isMockMode) {
      localStorage.removeItem('mock_session');
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const signInMock = () => {
    localStorage.setItem('mock_session', 'true');
    setUser(MOCK_USER);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, signInMock }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
