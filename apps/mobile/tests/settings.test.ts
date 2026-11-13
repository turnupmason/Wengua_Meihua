/** The app is for Chinese readers: Chinese unless English was picked by hand in 设置. */
import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettings, loadSettings, saveSettings } from '../src/domain/settings';

const KEY = 'wengua.settings.v1';
afterEach(() => localStorage.clear());

describe('language', () => {
  it('starts in Chinese whatever the device language', () => {
    expect(defaultSettings()).toMatchObject({ lang: 'zh', langChosen: false });
    expect(loadSettings().lang).toBe('zh');
  });

  it('ignores English saved only because the device was English', () => {
    localStorage.setItem(KEY, JSON.stringify({ lang: 'en', sound: false }));
    expect(loadSettings()).toMatchObject({ lang: 'zh', langChosen: false, sound: false });
  });

  it('keeps English once it was picked', () => {
    saveSettings({ ...defaultSettings(), lang: 'en', langChosen: true });
    expect(loadSettings()).toMatchObject({ lang: 'en', langChosen: true });
  });
});
