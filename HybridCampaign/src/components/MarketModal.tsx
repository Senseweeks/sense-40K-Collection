import { useEffect, useRef } from 'react';

export function Modal({ title, close, children, eyebrow = "Miren's settlement ledger" }: { title: string; close: () => void; children: React.ReactNode; eyebrow?: string }) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; const focusable = () => [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href]') ?? [])]; const first = focusable()[0]; first?.focus(); const keys = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); if (event.key === 'Tab') { const nodes = focusable(); if (!nodes.length) return; const edge = event.shiftKey ? nodes[0] : nodes.at(-1); if (document.activeElement === edge) { event.preventDefault(); (event.shiftKey ? nodes.at(-1) : nodes[0])?.focus(); } } }; addEventListener('keydown', keys); return () => { removeEventListener('keydown', keys); previous?.focus(); }; }, [close]);
  return <div className="modal" role="presentation" onMouseDown={close}><section ref={dialog} role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><button className="modal-close" onClick={close} aria-label="Close">×</button><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children}</section></div>;
}

export function Buyer({ buyer, setBuyer, roster }: { buyer: string; setBuyer: (value: string) => void; roster: string[] }) {
  return <label>Buyer<input list="buyers" value={buyer} onChange={event => setBuyer(event.target.value)}/><datalist id="buyers">{roster.map(entry => <option key={entry} value={entry}/>)}</datalist></label>;
}

export function Months({ value, setValue }: { value: 28 | 84; setValue: (value: 28 | 84) => void }) {
  return <label>Adaptation<select value={value} onChange={event => setValue(Number(event.target.value) as 28 | 84)}><option value={28}>1 month</option><option value={84}>3 months</option></select></label>;
}
