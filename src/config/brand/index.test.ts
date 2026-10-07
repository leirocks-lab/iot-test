import { describe, expect, it } from 'vitest';

import { getAppIdentity } from './index';

describe('ROWAN application identity', () => {
  it('defaults to ROWAN development identity', () => {
    const identity = getAppIdentity();

    expect(identity.androidPackage).toBe('com.rowan.iot.dev');
    expect(identity.iosBundleIdentifier).toBe('com.rowan.iot.dev');
  });

  it('returns preview identity', () => {
    const identity = getAppIdentity('rowan', 'preview');

    expect(identity.androidPackage).toBe('com.rowan.iot.preview');
    expect(identity.iosBundleIdentifier).toBe('com.rowan.iot.preview');
  });

  it('returns production identity', () => {
    const identity = getAppIdentity('rowan', 'production');

    expect(identity.androidPackage).toBe('com.rowan.iot');
    expect(identity.iosBundleIdentifier).toBe('com.rowan.iot');
  });

  it('rejects an unknown brand', () => {
    expect(() => getAppIdentity('other')).toThrowError('Unknown APP_BRAND: other');
  });

  it('rejects an unknown environment', () => {
    expect(() => getAppIdentity('rowan', 'staging')).toThrowError(
      'Unknown APP_ENV: staging',
    );
  });

  it('keeps all environment identities unique', () => {
    const identifiers = ['development', 'preview', 'production'].map(
      (environment) => getAppIdentity('rowan', environment).androidPackage,
    );

    expect(new Set(identifiers).size).toBe(3);
  });
});
