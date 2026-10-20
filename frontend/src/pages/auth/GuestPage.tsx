import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import '../../styles/pages/auth.css';
import { CaptchaField } from '../../components/auth/CaptchaField';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { errorMessage } from '../../services/api-client';
import { captchaEnabled } from '../../utils/captcha';

/** Report anonymously: starts a guest session, then opens the form. */
export default function GuestPage() {
  useDocumentTitle('Report anonymously');
  const { status, user, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const captchaRef = useRef<TurnstileInstance | undefined>(undefined);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Already signed in (as a guest or with an account): go straight to the form.
  if (status === 'authenticated' && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/requests/new'} replace />;
  }

  const start = async () => {
    setError(null);
    if (captchaEnabled() && !captchaToken) {
      setError('Please complete the CAPTCHA check.');
      return;
    }
    setStarting(true);
    try {
      await continueAsGuest(captchaToken);
      void navigate('/requests/new', { replace: true });
    } catch (startError) {
      setError(errorMessage(startError));
      // Turnstile tokens are single-use.
      captchaRef.current?.reset();
      setCaptchaToken(undefined);
      setStarting(false);
    }
  };

  return (
    <div className="auth-page">
      <Card as="section" className="auth-card" aria-labelledby="guest-title">
        <div className="auth-card__header">
          <span className="auth-card__icon">
            <Icon name="bx-lock-alt" />
          </span>
          <h1 className="auth-card__title" id="guest-title">
            Report anonymously
          </h1>
          <p className="auth-card__subtitle">
            No email or password needed. Your report is anonymous: county officers will not see who
            sent it.
          </p>
        </div>
        <div className="form">
          {error && <Alert tone="error">{error}</Alert>}
          <Alert tone="info">
            You can follow your reports on this device until you sign out. Note the reference number
            you get after submitting.
          </Alert>
          <CaptchaField ref={captchaRef} onToken={setCaptchaToken} />
          <Button
            size="lg"
            block
            icon="bx-right-arrow-alt"
            loading={starting}
            onClick={() => void start()}
          >
            Continue as guest
          </Button>
        </div>
        <p className="auth-card__footer">
          Want updates on any device? <Link to="/register">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
