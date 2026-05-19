import type { ReviewProgress, ReviewRating } from "@/types/review";

/** 连续「记得」后的复习间隔（天）。 */
const GOOD_INTERVALS = [1, 3, 7, 14, 30, 60];

export function createInitialProgress(cardId: string): ReviewProgress {
  return {
    cardId,
    repetitions: 0,
    intervalDays: 0,
    nextReviewAt: new Date(0).toISOString(),
  };
}

export function isDue(progress: ReviewProgress, now = Date.now()): boolean {
  return new Date(progress.nextReviewAt).getTime() <= now;
}

export function scheduleNext(
  progress: ReviewProgress,
  rating: ReviewRating,
  now = new Date(),
): ReviewProgress {
  let { repetitions, intervalDays } = progress;

  switch (rating) {
    case "again":
      repetitions = 0;
      intervalDays = 1;
      break;
    case "hard":
      intervalDays = Math.max(1, Math.ceil((intervalDays || 1) * 1.2));
      break;
    case "good":
      repetitions += 1;
      intervalDays =
        GOOD_INTERVALS[Math.min(repetitions - 1, GOOD_INTERVALS.length - 1)] ?? 1;
      break;
    case "easy":
      repetitions += 1;
      intervalDays =
        (GOOD_INTERVALS[Math.min(repetitions, GOOD_INTERVALS.length - 1)] ?? 7) * 2;
      break;
  }

  const next = new Date(now);
  next.setDate(next.getDate() + intervalDays);

  return {
    ...progress,
    repetitions,
    intervalDays,
    nextReviewAt: next.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

export function formatNextReview(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "今天";
  if (days === 1) return "明天";
  return `${days} 天后`;
}
