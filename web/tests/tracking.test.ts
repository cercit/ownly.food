import { describe, expect, it } from 'vitest';
import { STAGE_START_SECONDS, TRACKING_STAGES, isDeliveredStage, secondsToNextStage, stageIndex } from '../src/lib/tracking.ts';

const placed = '2026-10-24T10:00:00.000Z';
const at = (s: number) => new Date(new Date(placed).getTime() + s * 1000);

describe('tracking clock', () => {
  it('has the five stages in order', () => {
    expect(TRACKING_STAGES).toEqual(['Order accepted', 'Preparing', 'Picked up', 'On the way', 'Delivered']);
  });
  it('starts at Order accepted', () => expect(stageIndex(placed, at(0))).toBe(0));
  it('steps forward on each boundary', () => {
    STAGE_START_SECONDS.forEach((s, i) => {
      expect(stageIndex(placed, at(s))).toBe(i);
      if (s > 0) expect(stageIndex(placed, at(s - 1))).toBe(i - 1);
    });
  });
  it('gives the same answer for two different clocks reading the same moment', () => {
    const phoneA = new Date('2026-10-24T10:01:40.000Z').getTime();
    const phoneB = new Date('2026-10-24T10:01:40.000Z');
    expect(stageIndex(placed, phoneA)).toBe(stageIndex(placed, phoneB));
  });
  it('never goes back before placed_at', () => expect(stageIndex(placed, at(-50))).toBe(0));
  it('counts down to the next stage and stops at Delivered', () => {
    expect(secondsToNextStage(placed, at(10))).toBe(STAGE_START_SECONDS[1] - 10);
    expect(secondsToNextStage(placed, at(500))).toBeNull();
    expect(isDeliveredStage(stageIndex(placed, at(500)))).toBe(true);
  });
});

import { onceReporter } from '../src/lib/tracking.ts';

describe('markDelivered is reported once', () => {
  it('calls once even when asked many times, including at the same moment', async () => {
    let calls = 0;
    const report = onceReporter(async () => { calls++; });
    await Promise.all([report(), report(), report()]);
    await report();
    expect(calls).toBe(1);
  });
  it('tries again only after a failure', async () => {
    let calls = 0;
    const report = onceReporter(async () => { calls++; if (calls === 1) throw new Error('offline'); });
    expect(await report()).toBe(false);
    expect(await report()).toBe(true);
    expect(await report()).toBe(false);
    expect(calls).toBe(2);
  });
});
