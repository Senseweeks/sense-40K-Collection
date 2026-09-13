import type { ReactNode } from 'react';

/** Shared shell for the private GM route; player routes deliberately do not use it. */
export function AtTableShell({ children }: { children: ReactNode }) {
  return <div className="at-table-shell">
    <nav className="at-table-nav" aria-label="GM workflow panels">
      <a href="#holdings">Holdings</a><a href="#auction">Auction</a><a href="#objectives">Objectives</a><a href="#ledgers">Ledgers</a><a href="#history">History</a>
    </nav>
    {children}
  </div>;
}

export const atTableCss = `
.at-table-shell{max-width:1440px;margin:0 auto;padding:0 18px 42px}.at-table-nav{position:sticky;top:0;z-index:20;display:flex;gap:8px;overflow:auto;padding:10px 0;background:#0c1513eF;border-bottom:1px solid #40554d}.at-table-nav a{white-space:nowrap;padding:8px 12px;border:1px solid #51665d;color:#d6e3d8;text-decoration:none}.at-table-nav a:hover{border-color:#b38a4d;color:#f1d7a0}.control-actions{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.control-actions button,.control-actions .display-link{min-height:48px;display:grid;place-items:center;text-align:center}.gm-lots,.auction-desk,.objectives,.market-ledgers,.history{scroll-margin-top:70px}.gm-lots{container-type:inline-size}.gm-lot{padding:16px!important;background:#13201d}.auction-desk,.objectives,.history{border-radius:4px}.market-ledgers{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))!important}@media(max-width:640px){.at-table-shell{padding:0 10px 28px}.at-table-nav{position:static;margin:0 -10px;padding-left:10px}.control-actions{grid-template-columns:1fr 1fr}.control-actions .display-link{font-size:.82rem}}`;
