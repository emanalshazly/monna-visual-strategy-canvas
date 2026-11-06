import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getABTestingService, resetABTestingService } from '@/services/abTestingService';

beforeEach(() => {
  resetABTestingService();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetABTestingService();
  localStorage.clear();
  sessionStorage.clear();
});

describe('optional A/B identifier persistence', () => {
  it('persists newly created identifiers when storage is available', () => {
    const service = getABTestingService();
    expect(localStorage.getItem('abtest_user_id')).toBe(service.getCurrentUserId());
    expect(sessionStorage.getItem('abtest_session')).toBe(service.getCurrentSessionId());
  });

  it('retains existing identifiers without rewriting them', () => {
    localStorage.setItem('abtest_user_id', 'fictional-existing-user');
    sessionStorage.setItem('abtest_session', 'fictional-existing-session');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const service = getABTestingService();
    expect(service.getCurrentUserId()).toBe('fictional-existing-user');
    expect(service.getCurrentSessionId()).toBe('fictional-existing-session');
    expect(write).not.toHaveBeenCalled();
  });

  it.each(['localStorage', 'sessionStorage'] as const)('keeps one in-memory identity when %s is full', (area) => {
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (this === window[area]) throw new DOMException('Fictional full storage', 'QuotaExceededError');
      return write.call(this, key, value);
    });
    const service = getABTestingService();
    expect(service.getCurrentUserId()).toBeTruthy();
    expect(service.getCurrentSessionId()).toBeTruthy();
    expect(getABTestingService()).toBe(service);
    expect(getABTestingService().getCurrentUserId()).toBe(service.getCurrentUserId());
    expect(getABTestingService().getCurrentSessionId()).toBe(service.getCurrentSessionId());
  });
});
