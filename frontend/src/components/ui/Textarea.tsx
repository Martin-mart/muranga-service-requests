import type { Ref, TextareaHTMLAttributes } from 'react';
import { Field } from './Field';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  counter?: string | undefined;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ label, hint, error, counter, required, ref, ...rest }: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} counter={counter} required={required ?? false}>
      {(a11y) => <textarea ref={ref} className="control control--textarea" {...a11y} {...rest} />}
    </Field>
  );
}
