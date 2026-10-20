import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { errorMessage } from '../../services/api-client';
import type { Role } from '../../types/api';
import { EmptyState, ErrorState } from '../ui/EmptyState';
import { ButtonLink } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

interface RequireAuthProps {
  requiredRole?: Role;
  children: ReactNode;
}

/**
 * UX-only route guard: it decides what to RENDER. Real authorisation happens
 * on the server (JWT verification + role from profiles + Postgres RLS); a user
 * who bypasses this component still gets 401/403 from the API.
 */
export function RequireAuth({ requiredRole, children }: RequireAuthProps) {
  const { status, user, profileError, retryProfile } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <Spinner label="Checking your session" />;
  }
  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!user) {
    return profileError ? (
      <ErrorState message={errorMessage(profileError)} onRetry={retryProfile} />
    ) : (
      <Spinner label="Loading your profile" />
    );
  }
  if (requiredRole && user.role !== requiredRole) {
    return (
      <EmptyState
        icon="bx-lock-alt"
        title="You do not have access to this page"
        text="This area is for county officers. If you think this is a mistake, contact your administrator."
        action={<ButtonLink to="/">Go to home</ButtonLink>}
      />
    );
  }
  return children;
}

/**
 * Signed-in users skip the login/register pages. Guests (anonymous sessions)
 * may still use them to sign in or create a real account.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'loading') {
    return <Spinner label="Checking your session" />;
  }
  if (status === 'authenticated') {
    // Wait for the trusted profile so admins are not sent to citizen pages.
    if (!user) {
      return <Spinner label="Loading your profile" />;
    }
    if (user.isGuest) return children;
    return <Navigate to={user.role === 'admin' ? '/admin' : '/requests'} replace />;
  }
  return children;
}
