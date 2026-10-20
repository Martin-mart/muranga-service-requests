import type { Session } from '@supabase/supabase-js';
import { createContext } from 'react';
import type { Me } from '../../types/api';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthApi {
  status: AuthStatus;
  session: Session | null;
  /** Profile from the backend (role is trusted server data, not JWT metadata). */
  user: Me | null;
  profileError: unknown;
  retryProfile: () => void;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>;
  continueAsGuest: (captchaToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthApi | null>(null);
