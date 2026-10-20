import type { InputHTMLAttributes, Ref } from 'react';
import { cx } from '../../utils/cx';
import { Field } from './Field';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, required, className, ref, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required ?? false}>
      {(a11y) => <input ref={ref} className={cx('control', className)} {...a11y} {...rest} />}
    </Field>
  );
}
