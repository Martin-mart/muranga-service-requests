import { useEffect, useId, useRef, type ReactNode } from 'react';
import '../../styles/components/modal.css';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Built on <dialog>: the browser provides focus trapping, Esc handling, an
 * inert background and focus restoration to the opener.
 */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal" aria-labelledby={titleId} onClose={onClose}>
      <div className="modal__header">
        <h2 className="modal__title" id={titleId}>
          {title}
        </h2>
        <Button variant="ghost" icon="bx-x" aria-label="Close dialog" onClick={onClose} />
      </div>
      <div className="modal__body">{children}</div>
      {footer && <div className="modal__footer">{footer}</div>}
    </dialog>
  );
}
