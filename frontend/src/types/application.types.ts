export type ApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface VoterIdApplication {
  id: number;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  constituencyName?: string;
  photoUrl?: string;
  nationalId?: string;
  status: ApplicationStatus;
  remarks?: string;
  isPhysicalVerified?: boolean;
  submittedAt?: string;
  reviewedAt?: string;
}
