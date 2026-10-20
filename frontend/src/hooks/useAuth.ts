import { useContext } from 'react';
import { AuthContext, type AuthApi } from '../components/auth/auth-context';

export function useAuth(): AuthApi {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
