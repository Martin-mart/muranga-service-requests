import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authService from '../../services/auth.service';
import { supabase } from '../../services/supabase';
import { queryKeys } from '../../utils/query-client';
import { AuthContext, type AuthApi, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitialised(true);
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') {
        // Never let one user's cached data render for the next user.
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;
  const profile = useQuery({
    queryKey: queryKeys.me(userId ?? 'anonymous'),
    queryFn: ({ signal }) => authService.fetchMe(signal),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
  });

  const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
    await authService.signIn(email, password, captchaToken);
  }, []);

  const continueAsGuest = useCallback(async (captchaToken?: string) => {
    await authService.continueAsGuest(captchaToken);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    queryClient.clear();
  }, [queryClient]);

  const { refetch } = profile;
  const retryProfile = useCallback(() => {
    void refetch();
  }, [refetch]);

  const status: AuthStatus = !initialised ? 'loading' : session ? 'authenticated' : 'anonymous';

  const value = useMemo<AuthApi>(
    () => ({
      status,
      session,
      user: profile.data ?? null,
      profileError: profile.error,
      retryProfile,
      signIn,
      continueAsGuest,
      signOut,
    }),
    [status, session, profile.data, profile.error, retryProfile, signIn, continueAsGuest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
