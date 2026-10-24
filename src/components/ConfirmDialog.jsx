import { useCallback, useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

// A confirmation dialog in place of window.confirm, used the same way:
//   const [confirm, confirmDialog] = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel, danger }))) return;
//   …and render {confirmDialog} somewhere in the component.
// Resolves true on confirm, false on cancel, Escape or a backdrop click.
export const useConfirm = () => {
  const [request, setRequest] = useState(null); // { title, message, confirmLabel, danger, resolve }

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ confirmLabel: 'Confirm', danger: false, ...options, resolve })),
    []
  );

  const close = (answer) => {
    request?.resolve(answer);
    setRequest(null);
  };

  const dialog = request ? <ConfirmDialog {...request} onAnswer={close} /> : null;
  return [confirm, dialog];
};

const ConfirmDialog = ({ title, message, confirmLabel, danger, onAnswer }) => {
  const confirmRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onAnswer(false);
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll('button')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="oh-confirm-backdrop" onClick={() => onAnswer(false)}>
      <div
        ref={panelRef}
        className="oh-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="oh-confirm-title"
        aria-describedby="oh-confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`oh-confirm-icon ${danger ? 'danger' : ''}`} aria-hidden="true">
          <TriangleAlert size={20} strokeWidth={1.75} />
        </span>
        <h2 id="oh-confirm-title">{title}</h2>
        <p id="oh-confirm-message">{message}</p>
        <div className="oh-confirm-actions">
          <button type="button" className="oh-btn-cancel" onClick={() => onAnswer(false)}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? 'oh-btn-danger' : 'oh-btn-save'}
            onClick={() => onAnswer(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
