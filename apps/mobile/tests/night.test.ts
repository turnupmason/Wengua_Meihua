/** 夜间模式: 宣纸 by day unless night is chosen (or the phone is dark and 跟随系统 is chosen). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultSettings, isNight } from '../src/domain/settings';

describe('夜间模式', () => {
  it('starts on paper; 夜间 is night, 日间 is day', () => {
    expect(defaultSettings().theme).toBe('light');
    expect(isNight('dark')).toBe(true);
    expect(isNight('light')).toBe(false);
  });

  it('has a night sheet for the paper pages, and leaves the dark ones (opening screen, 首页, 立问, the 象 band) as they are', () => {
    const css = readFileSync(join(process.cwd(), 'src/paper-night.generated.css'), 'utf8');
    expect(css).toContain('body.paper.night .jian-page');
    expect(css).toContain('body.paper.night .jian-brief');
    // 首页, 立问 and the opening screen are dark already: left out.
    expect(css).not.toMatch(/\.splash|\.home-panel|\.flow-page|\.jian-xiang/);
  });
});
