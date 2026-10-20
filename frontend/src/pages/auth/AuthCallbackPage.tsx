import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

/**
 * Landing page for the email confirmation link. supabase-js exchanges the
 * PKCE code in the URL for a session automatically (detectSessionInUrl).
 */
export default function AuthCallbackPage() {
  useDocumentTitle('Confirming your email');
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const failed = new URLSearchParams(window.location.search).has('error');

  useEffect(() => {
    if (status === 'authenticated' && user) {
      void navigate(user.role === 'admin' ? '/admin' : '/requests', { replace: true });
    }
  }, [status, user, navigate]);

  if (failed || status === 'anonymous') {
    return (
      <EmptyState
        icon="bx-link-alt"
        title="This link is invalid or has expired"
        text="Confirmation links can only be used once. Try signing in, or register again to get a new link."
        action={<ButtonLink to="/login">Go to sign in</ButtonLink>}
      />
    );
  }
  return <Spinner label="Confirming your email" />;
}
