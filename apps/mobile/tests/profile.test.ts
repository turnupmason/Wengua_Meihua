import { describe, expect, it, beforeEach } from 'vitest';
import { clearProfile, loadProfile, localAuth } from '../src/domain/profile';

describe('local sign-in', () => {
  beforeEach(() => clearProfile());

  it('keeps a 道号 on the device and reads it back', async () => {
    const p = await localAuth.signIn('local', { name: '  清虚子  ' });
    expect(p.name).toBe('清虚子');
    expect(loadProfile()?.name).toBe('清虚子');
  });

  it('allows a guest, refuses an empty name and methods it cannot complete', async () => {
    expect((await localAuth.signIn('guest', {})).name).toBe('');
    await expect(localAuth.signIn('local', { name: ' ' })).rejects.toThrow();
    await expect(localAuth.signIn('wechat', {})).rejects.toThrow();
    expect(localAuth.methods).toEqual(['local', 'guest']);
  });

  it('forgets the profile when changing name', async () => {
    await localAuth.signIn('local', { name: '甲' });
    clearProfile();
    expect(loadProfile()).toBeNull();
  });
});
