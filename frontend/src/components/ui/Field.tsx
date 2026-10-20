import { useId, type ReactNode } from 'react';
import '../../styles/components/form.css';
import { Icon } from './Icon';

export interface FieldA11yProps {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
  'aria-required': boolean | undefined;
}

interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean;
  counter?: string | undefined;
  children: (a11y: FieldA11yProps) => ReactNode;
}

/**
 * Wires label, hint and error to the control with ids/aria attributes so
 * screen readers announce the error together with the field.
 */
export function Field({ label, hint, error, required, counter, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })}
      {counter && (
        <span className="field__counter" aria-live="polite">
          {counter}
        </span>
      )}
      {error && (
        <p className="field__error" id={errorId}>
          <Icon name="bx-error-circle" />
          {error}
        </p>
      )}
    </div>
  );
}
