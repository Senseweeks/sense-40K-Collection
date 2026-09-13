import { createContext, useContext } from 'react';
import type { MarketState } from '../types';

const CommitContext = createContext<((state: MarketState) => Promise<void>) | undefined>(undefined);

export const MarketCommitProvider = CommitContext.Provider;

export function useMarketCommit() {
  const commit = useContext(CommitContext);
  if (!commit) throw new Error('The market relay is not available in this view.');
  return commit;
}
