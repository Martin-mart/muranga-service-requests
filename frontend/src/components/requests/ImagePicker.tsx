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

  const handlePick = (picked: File) => {
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
  };

  // Two inputs so citizens choose the source explicitly: `capture` opens the
  // camera directly on phones; without it the OS shows the gallery/files.
  // Desktop browsers ignore `capture`, so both open the file dialog there.
  const sources = [
    {
      key: 'camera',
      capture: true,
      icon: 'bx-camera',
      label: file ? 'Retake photo' : 'Take photo',
    },
    {
      key: 'gallery',
      capture: false,
      icon: 'bx-image',
      label: file ? 'Choose another' : 'Choose from gallery',
    },
  ] as const;

  return (
    <div className="image-picker field">
      <span className="field__label" id={`${id}-label`}>
        Photo (optional)
      </span>
      <p className="field__hint" id={`${id}-hint`}>
        Take a photo or choose one from your gallery (up to 50 MB; large photos are resized
        automatically). A photo helps officers find and assess the problem.
      </p>
      {file && previewUrl && (
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
            disabled={disabled || preparing}
            onClick={() => {
              onChange(null);
            }}
          />
        </div>
      )}
      <div className="image-picker__sources" aria-busy={preparing}>
        {sources.map((source) => (
          <div key={source.key} className="image-picker__source">
            <input
              id={`${id}-${source.key}`}
              className="image-picker__input sr-only"
              type="file"
              accept="image/*"
              capture={source.capture ? 'environment' : undefined}
              disabled={disabled || preparing}
              aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                event.target.value = '';
                if (picked) handlePick(picked);
              }}
            />
            <label
              htmlFor={`${id}-${source.key}`}
              className={
                file ? 'image-picker__drop image-picker__drop--compact' : 'image-picker__drop'
              }
            >
              <Icon name={source.icon} className="image-picker__drop-icon" />
              <span>{preparing ? 'Preparing photo…' : source.label}</span>
            </label>
          </div>
        ))}
      </div>
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          <Icon name="bx-error-circle" />
          {error}
        </p>
      )}
    </div>
  );
}
