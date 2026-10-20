import { zodResolver } from '@hookform/resolvers/zod';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import '../../styles/pages/auth.css';
import { CaptchaField } from '../../components/auth/CaptchaField';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { captchaEnabled } from '../../utils/captcha';
import { loginFormSchema, type LoginFormValues } from '../../schemas/auth.schema';
import { errorMessage } from '../../services/api-client';

/** Only same-app relative paths are honoured (prevents open redirects). */
function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const captchaRef = useRef<TurnstileInstance | undefined>(undefined);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (captchaEnabled() && !captchaToken) {
      setFormError('Please complete the CAPTCHA check.');
      return;
    }
    try {
      await signIn(values.email, values.password, captchaToken);
      // Without an explicit destination, GuestOnly sends the user to the
      // landing page for their role once the profile has loaded.
      const next = safeNext(params.get('next'));
      if (next) void navigate(next, { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
      // Turnstile tokens are single-use.
      captchaRef.current?.reset();
      setCaptchaToken(undefined);
    }
  });

  return (
    <div className="auth-page">
      <Card as="section" className="auth-card" aria-labelledby="login-title">
        <div className="auth-card__header">
          <span className="auth-card__icon">
            <Icon name="bx-log-in-circle" />
          </span>
          <h1 className="auth-card__title" id="login-title">
            Sign in
          </h1>
          <p className="auth-card__subtitle">Track your service requests and get updates.</p>
        </div>
        <form className="form" onSubmit={(event) => void onSubmit(event)} noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register('password')}
          />
          <CaptchaField ref={captchaRef} onToken={setCaptchaToken} />
          <Button type="submit" size="lg" block loading={isSubmitting}>
            Sign in
          </Button>
        </form>
        <p className="auth-card__footer">
          New here? <Link to="/register">Create an account</Link> or{' '}
          <Link to="/guest">report without an account</Link>
        </p>
      </Card>
    </div>
  );
}
