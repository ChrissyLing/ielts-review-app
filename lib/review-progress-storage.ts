import type { ReviewProgress } from "@/types/review";
import { createInitialProgress } from "@/lib/review-scheduler";

const STORAGE_KEY = "ielts-review-app:review-progress";

function isBrowser() {
  return typeof window !== "undefined";
}

export const REVIEW_PROGRESS_UPDATED_EVENT =
  "ielts-review-app:review-progress-updated";

export function getAllReviewProgress(): Record<string, ReviewProgress> {
  if (!isBrowser()) return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ReviewProgress>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAllReviewProgress(data: Record<string, ReviewProgress>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(REVIEW_PROGRESS_UPDATED_EVENT));
}

export function getReviewProgress(cardId: string): ReviewProgress {
  const all = getAllReviewProgress();
  return all[cardId] ?? createInitialProgress(cardId);
}

export function upsertReviewProgress(progress: ReviewProgress) {
  const all = getAllReviewProgress();
  all[progress.cardId] = progress;
  saveAllReviewProgress(all);
}

export function clearReviewProgress() {
  saveAllReviewProgress({});
}
