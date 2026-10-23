/**
 * Tracking stages run on a timer counted from placed_at (a database timestamp), so every phone
 * shows the same stage. The seconds below are prototype timings for the demo, not delivery promises.
 */
export const TRACKING_STAGES = ['Order accepted', 'Preparing', 'Picked up', 'On the way', 'Delivered'] as const;
export type TrackingStage = (typeof TRACKING_STAGES)[number];

/** Seconds after placed_at at which each stage begins. */
export const STAGE_START_SECONDS = [0, 30, 90, 120, 180] as const;

export function stageIndex(placedAt: string | Date, now: number | Date = Date.now()): number {
  const t0 = new Date(placedAt).getTime();
  const elapsed = (now instanceof Date ? now.getTime() : now) - t0;
  let idx = 0;
  STAGE_START_SECONDS.forEach((s, i) => { if (elapsed >= s * 1000) idx = i; });
  return idx;
}

export const isDeliveredStage = (idx: number) => idx >= TRACKING_STAGES.length - 1;

export function secondsToNextStage(placedAt: string | Date, now: number | Date = Date.now()): number | null {
  const idx = stageIndex(placedAt, now);
  if (isDeliveredStage(idx)) return null;
  const t0 = new Date(placedAt).getTime();
  const at = t0 + STAGE_START_SECONDS[idx + 1] * 1000;
  return Math.max(0, Math.ceil((at - (now instanceof Date ? now.getTime() : now)) / 1000));
}
