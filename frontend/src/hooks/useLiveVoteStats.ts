import { useEffect, useState } from 'react';
import { connectElectionStats } from '../utils/wsClient';
import type { VoteStats } from '../types/vote.types';
import { electionApi } from '../api/electionApi';

export function useLiveVoteStats(electionId: number | null) {
  const [stats, setStats] = useState<VoteStats | null>(null);

  useEffect(() => {
    if (!electionId) return;

    electionApi.getLiveStats(electionId).then((res) => setStats(res.data.data));

    const handle = connectElectionStats(electionId, setStats);
    return () => handle.close();
  }, [electionId]);

  return stats;
}
