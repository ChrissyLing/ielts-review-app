"use client";

import { useCallback, useEffect, useState } from "react";

import {
  REVIEW_PROGRESS_UPDATED_EVENT,
  getAllReviewProgress,
} from "@/lib/review-progress-storage";
import type { ReviewProgress } from "@/types/review";

export function useReviewProgress() {
  const [progressMap, setProgressMap] = useState<Record<string, ReviewProgress>>(
    {},
  );
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setProgressMap(getAllReviewProgress());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
    const onUpdate = () => refresh();
    window.addEventListener(REVIEW_PROGRESS_UPDATED_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(REVIEW_PROGRESS_UPDATED_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  return { progressMap, hydrated, refresh };
}
