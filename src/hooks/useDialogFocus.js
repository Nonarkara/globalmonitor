import { useEffect, useRef } from 'react';

export const useDialogFocus = (open) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const dialog = ref.current;
    const targets = () => [...(dialog?.querySelectorAll('button:not([disabled]),a[href],select,input,[tabindex="0"]') || [])];
    targets()[0]?.focus();
    const trap = event => {
      if (event.key !== 'Tab') return;
      const items = targets(), first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    dialog?.addEventListener('keydown', trap);
    return () => {
      dialog?.removeEventListener('keydown', trap);
      const target = previous?.isConnected && previous !== document.body ? previous : document.querySelector('[aria-label="Tools and advanced options"]');
      target?.focus?.();
    };
  }, [open]);
  return ref;
};
