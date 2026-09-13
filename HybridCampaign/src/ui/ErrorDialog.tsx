import { useEffect, useRef } from 'react';

export function errorText(error: unknown) {
  return error instanceof Error && error.message.trim() ? error.message : 'The action could not be completed.';
}

export function ErrorDialog({ error, clear }: { error?: string; clear: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!error) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') clear(); };
    addEventListener('keydown', onKeyDown);
    return () => removeEventListener('keydown', onKeyDown);
  }, [clear, error]);
  if (!error) return null;
  return <div className="modal error-dialog" role="presentation" onMouseDown={clear}>
    <section role="alertdialog" aria-modal="true" aria-labelledby="app-error-title" onMouseDown={(event) => event.stopPropagation()}>
      <p className="eyebrow">Index notice</p>
      <h2 id="app-error-title">Action needs attention</h2>
      <p>{error}</p>
      <button ref={closeRef} onClick={clear}>Understood</button>
    </section>
  </div>;
}
