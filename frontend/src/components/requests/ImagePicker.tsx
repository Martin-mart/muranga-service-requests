import { useEffect, useId, useState } from 'react';
import '../../styles/components/form.css';
import '../../styles/components/image-picker.css';
import { validateImage } from '../../schemas/request-form.schema';
import { shrinkImage } from '../../utils/shrink-image';
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
  const [preparing, setPreparing] = useState(false);
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
        Take a photo or choose one from your gallery (up to 50 MB; large photos are resized
        automatically). A photo helps officers find and assess the problem.
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
            // No `capture` attribute: it makes phones open the camera directly
            // and hides the gallery. image/* lets the OS offer both.
            accept="image/*"
            disabled={disabled || preparing}
            aria-labelledby={`${id}-label`}
            aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              event.target.value = '';
              if (!picked) return;
              const problem = validateImage(picked);
              setError(problem);
              if (problem) return;
              setPreparing(true);
              void shrinkImage(picked)
                .then((ready) => {
                  if (ready) onChange(ready);
                  else setError('This photo could not be read. Choose a JPEG, PNG or WebP image.');
                })
                .finally(() => {
                  setPreparing(false);
                });
            }}
          />
          <label htmlFor={id} className="image-picker__drop" aria-busy={preparing}>
            <Icon name="bx-camera" className="image-picker__drop-icon" />
            <span>{preparing ? 'Preparing photo…' : 'Take or choose a photo'}</span>
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
