import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

describe('client secret boundary', () => {
  it('contains no provider credentials or SDK imports', () => {
    expect(() => execFileSync(process.execPath, ['scripts/check-client-secrets.mjs'])).not.toThrow();
  });
});
