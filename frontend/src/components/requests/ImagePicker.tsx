import { useEffect, useId, useState } from 'react';
import '../../styles/components/form.css';
import '../../styles/components/image-picker.css';
import { ALLOWED_IMAGE_TYPES, validateImage } from '../../schemas/request-form.schema';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface ImagePickerProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function ImagePicker({ file, onChange, disabled = false }: ImagePickerProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URLs hold the file in memory until revoked.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="image-picker field">
      <span className="field__label" id={`${id}-label`}>
        Photo (optional)
      </span>
      <p className="field__hint" id={`${id}-hint`}>
        JPEG, PNG or WebP, up to 5 MB. A photo helps officers find and assess the problem.
      </p>
      {file && previewUrl ? (
        <div className="image-picker__preview">
          <img
            className="image-picker__thumb"
            src={previewUrl}
            alt="Preview of the selected file"
          />
          <span className="image-picker__name">{file.name}</span>
          <Button
            variant="ghost"
            icon="bx-trash"
            aria-label="Remove photo"
            disabled={disabled}
            onClick={() => {
              onChange(null);
            }}
          />
        </div>
      ) : (
        <>
          <input
            id={id}
            className="image-picker__input sr-only"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            capture="environment"
            disabled={disabled}
            aria-labelledby={`${id}-label`}
            aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              event.target.value = '';
              if (!picked) return;
              const problem = validateImage(picked);
              setError(problem);
              if (!problem) onChange(picked);
            }}
          />
          <label htmlFor={id} className="image-picker__drop">
            <Icon name="bx-camera" className="image-picker__drop-icon" />
            <span>Take or choose a photo</span>
          </label>
        </>
      )}
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          <Icon name="bx-error-circle" />
          {error}
        </p>
      )}
    </div>
  );
}
