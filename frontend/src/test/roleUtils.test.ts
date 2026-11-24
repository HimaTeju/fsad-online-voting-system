import { describe, it, expect } from 'vitest';
import { canAccess, ROLE_HOME } from '../utils/roleUtils';
import type { Role } from '../../types/auth.types';

describe('roleUtils', () => {
  describe('ROLE_HOME', () => {
    it('maps VOTER to /voter', () => expect(ROLE_HOME['VOTER']).toBe('/voter'));
    it('maps CANDIDATE to /candidate', () => expect(ROLE_HOME['CANDIDATE']).toBe('/candidate'));
    it('maps ADMIN to /admin', () => expect(ROLE_HOME['ADMIN']).toBe('/admin'));
    it('maps FIELD_OFFICER to /field-officer', () => expect(ROLE_HOME['FIELD_OFFICER']).toBe('/field-officer'));
  });

  describe('canAccess', () => {
    it('returns true when userRole is in allowedRoles', () => {
      expect(canAccess('ADMIN' as Role, ['ADMIN', 'VOTER'] as Role[])).toBe(true);
    });

    it('returns false when userRole is not in allowedRoles', () => {
      expect(canAccess('VOTER' as Role, ['ADMIN'] as Role[])).toBe(false);
    });

    it('returns false for an empty allowedRoles list', () => {
      expect(canAccess('VOTER' as Role, [])).toBe(false);
    });
  });
});
