/** Start-up: textures are built off the main thread, and the title waits for the drawn gate. */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { RECIPES, runRecipe } from '../src/scene/texgen';
import { markSceneReady } from '../src/scene/readiness';
import { Splash } from '../src/ui/Splash';
import { STRINGS } from '../src/domain/i18n';

afterEach(cleanup);
const t = STRINGS.zh;

describe('Background texture recipes', () => {
  it('build full-size colour, normal and roughness rasters without any canvas', () => {
    for (const [name, args, size] of [['stone', [7, '#7a7d74'], 512], ['floor', [], 512], ['wood', ['#7a2418', 41, 0.38], 256], ['gold', [], 256]] as const) {
      const set = runRecipe(name, [...args]);
      for (const r of [set.map, set.normalMap, set.roughnessMap]) {
        expect([r.w, r.h]).toEqual([size, size]);
        expect(r.data.length).toBe(size * size * 4);
      }
    }
    expect(Object.keys(RECIPES).sort()).toEqual(['carvedPanel', 'cloth', 'floor', 'gold', 'stone', 'wood']);
  });

  it('are deterministic, so the hall looks the same on every launch', () => {
    const a = runRecipe('gold', []);
    const b = runRecipe('gold', []);
    expect(a.map.data).toEqual(b.map.data);
    expect(a.normalMap.data).toEqual(b.normalMap.data);
  });
});

describe('Title over the live gate', () => {
  it('keeps 「轻触 · 入殿」 back until the gate is drawn, then offers it', () => {
    const { container } = render(<Splash t={t} progress={null} leaving={false} onEnter={() => {}} live />);
    expect(screen.getByRole('status').textContent).toBe(t.lightingHall);
    expect(container.querySelector('.splash')?.getAttribute('role')).toBeNull();
    expect(container.querySelector('.splash-enter-wrap')?.classList.contains('is-waiting')).toBe(true);
    act(() => markSceneReady());
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('.splash')?.classList.contains('scene-shown')).toBe(true);
    expect(screen.getByRole('button', { name: t.splashEnter })).toBeTruthy();
  });
});
