import type { Role } from '../types/auth.types';

export const ROLE_HOME: Record<Role, string> = {
  VOTER: '/voter',
  CANDIDATE: '/candidate',
  ADMIN: '/admin',
  FIELD_OFFICER: '/field-officer',
};

export function canAccess(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}
