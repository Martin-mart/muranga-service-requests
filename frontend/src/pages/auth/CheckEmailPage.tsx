import { useLocation } from 'react-router';
import '../../styles/pages/auth.css';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function CheckEmailPage() {
  useDocumentTitle('Confirm your email');
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  return (
    <div className="auth-page">
      <Card as="section" className="auth-card" aria-labelledby="check-email-title">
        <div className="auth-card__header">
          <span className="auth-card__icon">
            <Icon name="bx-envelope" />
          </span>
          <h1 className="auth-card__title" id="check-email-title">
            Check your email
          </h1>
          <p className="auth-card__subtitle">
            If {email ? <strong>{email}</strong> : 'your address'} can be registered, we have sent a
            confirmation link. Open it on this device to activate your account, then sign in.
          </p>
        </div>
        <ButtonLink to="/login" block variant="secondary">
          Go to sign in
        </ButtonLink>
      </Card>
    </div>
  );
}
