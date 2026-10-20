import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import '../../styles/pages/request-form.css';
import { ImagePicker } from '../../components/requests/ImagePicker';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SkeletonList } from '../../components/ui/Skeleton';
import { Textarea } from '../../components/ui/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useCategories, useSubCounties } from '../../hooks/useReferenceData';
import { useSubmitRequest } from '../../hooks/useRequests';
import { useToast } from '../../hooks/useToast';
import { newRequestFormSchema, type NewRequestFormValues } from '../../schemas/request-form.schema';
import { ApiError, errorMessage } from '../../services/api-client';
import { osmLink } from '../../utils/format';

function LocationCapture({ geo }: { geo: ReturnType<typeof useGeolocation> }) {
  const { state, locate, clear } = geo;
  return (
    <div className="location-capture">
      <span className="field__label">GPS location (optional)</span>
      <p className="field__hint">
        Helps officers find the exact spot. Your location is only read when you press the button.
      </p>
      <div className="location-capture__row">
        {state.status === 'success' ? (
          <>
            <a
              className="location-capture__coords"
              href={osmLink(state.coords.latitude, state.coords.longitude)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="bx-current-location" />
              {state.coords.latitude}, {state.coords.longitude}
              <span className="sr-only">(opens map in a new tab)</span>
            </a>
            <span className="field__hint">Accuracy about {state.coords.accuracy} m</span>
            <Button variant="ghost" size="sm" icon="bx-x" onClick={clear}>
              Remove
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            icon="bx-current-location"
            loading={state.status === 'locating'}
            onClick={locate}
          >
            Use my current location
          </Button>
        )}
      </div>
      {state.status === 'error' && (
        <p className="field__error" role="alert">
          <Icon name="bx-error-circle" />
          {state.message}
        </p>
      )}
    </div>
  );
}

export default function NewRequestPage() {
  useDocumentTitle('Report an issue');
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const categories = useCategories();
  const subCounties = useSubCounties();
  const geo = useGeolocation();
  const submit = useSubmitRequest();
  const [image, setImage] = useState<File | null>(null);
  // One key per form instance: double-clicks and retries cannot duplicate.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<NewRequestFormValues>({
    resolver: zodResolver(newRequestFormSchema),
    defaultValues: {
      categoryId: '',
      subCountyId: '',
      locationText: '',
      description: '',
      isAnonymous: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;
    setFormError(null);
    const coords = geo.state.status === 'success' ? geo.state.coords : null;
    try {
      const outcome = await submit.mutateAsync({
        userId: user.id,
        idempotencyKey,
        image,
        payload: {
          ...values,
          // Guests are always anonymous (the database enforces this too).
          isAnonymous: user.isGuest || values.isAnonymous,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        },
      });
      if (outcome.kind === 'queued') {
        toast.show({
          tone: 'info',
          title: 'Saved offline',
          message: 'It will be sent automatically when you are back online.',
        });
        void navigate('/requests');
        return;
      }
      toast.show({
        tone: outcome.imageFailed ? 'error' : 'success',
        title: `Request ${outcome.request.referenceNumber} submitted`,
        ...(outcome.imageFailed
          ? { message: 'The photo could not be uploaded. You can add it from the request page.' }
          : {}),
      });
      void navigate(`/requests/${outcome.request.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const issue of error.details) {
          if (
            issue.path === 'categoryId' ||
            issue.path === 'subCountyId' ||
            issue.path === 'locationText' ||
            issue.path === 'description'
          ) {
            setError(issue.path, { message: issue.message });
          }
        }
      }
      setFormError(errorMessage(error));
    }
  });

  const description = watch('description');

  if (categories.isPending || subCounties.isPending) {
    return <SkeletonList count={2} label="Loading form" />;
  }
  if (categories.isError || subCounties.isError) {
    return (
      <ErrorState
        message={errorMessage(categories.error ?? subCounties.error)}
        onRetry={() => {
          void categories.refetch();
          void subCounties.refetch();
        }}
      />
    );
  }

  return (
    <div className="stack stack--lg request-form">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Report an issue</h1>
          <p className="page-header__subtitle">Fields marked * are required.</p>
        </div>
      </div>
      <Card padded>
        <form className="form" onSubmit={(event) => void onSubmit(event)} noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}
          <div className="form__row form__row--two">
            <Select
              label="Category"
              required
              placeholder="Choose a category"
              options={categories.data.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.categoryId?.message}
              {...register('categoryId')}
            />
            <Select
              label="Sub-county"
              required
              placeholder="Choose your sub-county"
              options={subCounties.data.map((s) => ({ value: s.id, label: s.name }))}
              error={errors.subCountyId?.message}
              {...register('subCountyId')}
            />
          </div>
          <Input
            label="Location"
            required
            hint="A landmark, road or village, e.g. 'Opposite Kenol stage, next to the clinic'"
            autoComplete="off"
            error={errors.locationText?.message}
            {...register('locationText')}
          />
          <LocationCapture geo={geo} />
          <Textarea
            label="Description"
            required
            rows={6}
            hint="What is the problem and since when?"
            counter={`${description.length} / 2000`}
            error={errors.description?.message}
            {...register('description')}
          />
          <ImagePicker file={image} onChange={setImage} disabled={submit.isPending} />
          {user?.isGuest ? (
            <p className="field__hint request-form__anonymous-note">
              <Icon name="bx-lock-alt" /> You are reporting as a guest, so this report is anonymous.
            </p>
          ) : (
            <div className="field">
              <label className="checkbox">
                <input type="checkbox" className="checkbox__input" {...register('isAnonymous')} />
                Submit anonymously
              </label>
              <p className="field__hint">
                County officers will not see your name or phone number. You still get updates on
                this request.
              </p>
            </div>
          )}
          <div className="form__actions">
            <ButtonLink to="/requests" variant="secondary">
              Cancel
            </ButtonLink>
            <Button type="submit" icon="bx-send" loading={submit.isPending}>
              Submit request
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
