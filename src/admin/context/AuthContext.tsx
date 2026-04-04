import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth session error:', error.message);
        }

        if (!mounted) return;

        setSession(data.session ?? null);
        setLoading(false);
      } catch (err) {
        console.error('Supabase initialization error:', err);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        if (!mounted) return;
        setSession(nextSession ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error('Sign out error:', error.message);
          throw error;
        }

        setSession(null);
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};