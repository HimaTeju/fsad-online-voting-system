import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tokenStorage } from '../utils/tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => tokenStorage.clear());
  afterEach(() => tokenStorage.clear());

  it('returns null when nothing is stored', () => {
    expect(tokenStorage.get()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    tokenStorage.set('abc123');
    expect(tokenStorage.get()).toBe('abc123');
  });

  it('overwrites a previously stored token', () => {
    tokenStorage.set('first');
    tokenStorage.set('second');
    expect(tokenStorage.get()).toBe('second');
  });

  it('returns null after clearing', () => {
    tokenStorage.set('abc123');
    tokenStorage.clear();
    expect(tokenStorage.get()).toBeNull();
  });
});
