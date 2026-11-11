/**
 * 问卦三戒, one line at a time, softly, while the visitor walks up the hall to the stone table.
 *   初筮告，再三渎，渎则不告。（《周易·蒙卦》）
 *   有疑方卜，无事不占。
 *   不诚不卜，不义不卜，不疑不卜。
 */
import { useEffect, useState, type MutableRefObject } from 'react';
import type { Strings } from '../domain/i18n';
import type { RitualClock } from './useRitualClock';
import { phaseDuration } from '../domain/ritual';

export function PreceptSubtitle({ t, clock, reduced }: { t: Strings; clock: MutableRefObject<RitualClock>; reduced: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const f = clock.current.t / phaseDuration('entering', reduced);
      setIndex(f < 0.33 ? 0 : f < 0.66 ? 1 : 2);
    }, 200);
    return () => window.clearInterval(id);
  }, [clock, reduced]);
  return (
    <p className="precept-subtitle" key={index} aria-live="polite">
      {t.precepts[index]}
    </p>
  );
}
