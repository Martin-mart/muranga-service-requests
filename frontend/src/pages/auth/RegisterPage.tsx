import { zodResolver } from '@hookform/resolvers/zod';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import '../../styles/pages/auth.css';
import { CaptchaField } from '../../components/auth/CaptchaField';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { captchaEnabled } from '../../utils/captcha';
import { registerFormSchema, type RegisterFormValues } from '../../schemas/auth.schema';
import { ApiError, errorMessage } from '../../services/api-client';
import { register as registerAccount } from '../../services/auth.service';

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const navigate = useNavigate();
  const captchaRef = useRef<TurnstileInstance | undefined>(undefined);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { phone: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (captchaEnabled() && !captchaToken) {
      setFormError('Please complete the CAPTCHA check.');
      return;
    }
    try {
      await registerAccount({ ...values, captchaToken });
      void navigate('/check-email', { state: { email: values.email } });
    } catch (error) {
      // Map server-side field errors back onto the form fields.
      if (error instanceof ApiError && error.details.length > 0) {
        for (const issue of error.details) {
          if (
            issue.path === 'fullName' ||
            issue.path === 'email' ||
            issue.path === 'phone' ||
            issue.path === 'password'
          ) {
            setError(issue.path, { message: issue.message });
          }
        }
      }
      setFormError(errorMessage(error));
      captchaRef.current?.reset();
      setCaptchaToken(undefined);
    }
  });

  return (
    <div className="auth-page">
      <Card as="section" className="auth-card" aria-labelledby="register-title">
        <div className="auth-card__header">
          <span className="auth-card__icon">
            <Icon name="bx-user-plus" />
          </span>
          <h1 className="auth-card__title" id="register-title">
            Create your account
          </h1>
          <p className="auth-card__subtitle">
            Report issues to Murang&rsquo;a County and follow their progress.
          </p>
        </div>
        <form className="form" onSubmit={(event) => void onSubmit(event)} noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}
          <Input
            label="Full name"
            autoComplete="name"
            required
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Mobile number (optional)"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            hint="Kenyan number, e.g. 0712 345 678"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            hint="At least 10 characters with upper and lower case letters and a number."
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <CaptchaField ref={captchaRef} onToken={setCaptchaToken} />
          <Button type="submit" size="lg" block loading={isSubmitting}>
            Create account
          </Button>
        </form>
        <p className="auth-card__footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
