import type { Ref, SelectHTMLAttributes } from 'react';
import { Field } from './Field';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string | undefined;
  error?: string | undefined;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  required,
  ref,
  ...rest
}: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required ?? false}>
      {(a11y) => (
        <select ref={ref} className="control control--select" {...a11y} {...rest}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
