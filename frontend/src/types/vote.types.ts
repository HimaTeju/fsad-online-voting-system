export interface VoteStats {
  electionId: number;
  totalVotes: number;
  candidates: CandidateStat[];
}

export interface CandidateStat {
  candidateId: number;
  candidateName: string;
  partyName?: string;
  voteCount: number;
}

export interface ElectionResult {
  electionId: number;
  electionTitle: string;
  finalized: boolean;
  results: CandidateResult[];
}

export interface CandidateResult {
  candidateId: number;
  candidateName: string;
  partyName?: string;
  onlineVotes: number;
  manualBoothVotes: number;
  totalVotes: number;
  winner: boolean;
}
