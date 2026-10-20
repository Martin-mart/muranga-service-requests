import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import '../../styles/pages/dashboard.css';
import { useChangeStatus } from '../../hooks/useAdmin';
import { useToast } from '../../hooks/useToast';
import { statusUpdateFormSchema, type StatusUpdateFormValues } from '../../schemas/admin.schema';
import { errorMessage } from '../../services/api-client';
import type { RequestView } from '../../types/api';
import { STATUS_META, nextStatus } from '../../utils/status';
import { Alert } from '../ui/Alert';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';

/**
 * Only the single legal next step is offered (pending -> in progress ->
 * resolved). The database enforces the same rule, so this is UX, not security.
 */
export function StatusChangePanel({ request }: { request: RequestView }) {
  const target = nextStatus(request.status);
  const [open, setOpen] = useState(false);
  const change = useChangeStatus(request.id);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<StatusUpdateFormValues>({
    resolver: zodResolver(statusUpdateFormSchema),
    values: { status: target ?? 'resolved', note: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await change.mutateAsync(values);
      toast.show({
        tone: 'success',
        title: `Marked as ${STATUS_META[values.status].label.toLowerCase()}`,
        message: 'The citizen has been notified.',
      });
      setOpen(false);
      reset();
    } catch (error) {
      toast.show({ tone: 'error', title: 'Status not changed', message: errorMessage(error) });
    }
  });

  const note = watch('note');

  return (
    <div className="status-panel">
      <p className="status-panel__current">
        Current status: <StatusBadge status={request.status} />
      </p>
      {target ? (
        <Button
          icon={STATUS_META[target].icon}
          onClick={() => {
            setOpen(true);
          }}
        >
          Mark as {STATUS_META[target].label.toLowerCase()}
        </Button>
      ) : (
        <Alert tone="success">
          This request is resolved. No further status changes are possible.
        </Alert>
      )}
      {target && (
        <Modal
          open={open}
          title={`Mark as ${STATUS_META[target].label.toLowerCase()}`}
          onClose={() => {
            setOpen(false);
          }}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" form="status-form" loading={change.isPending}>
                Confirm
              </Button>
            </>
          }
        >
          <form
            id="status-form"
            className="form"
            onSubmit={(event) => void onSubmit(event)}
            noValidate
          >
            <input type="hidden" {...register('status')} />
            <Textarea
              label="Note to the citizen (optional)"
              hint="Shown on the citizen's timeline and in their notification."
              rows={4}
              counter={`${note.length} / 1000`}
              error={errors.note?.message}
              {...register('note')}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
