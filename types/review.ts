import type { IeltsSection } from "@/types/mistake";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ReviewProgress = {
  cardId: string;
  repetitions: number;
  intervalDays: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
};

export type FlashcardType = "mistake" | "vocabulary";

export type Flashcard = {
  id: string;
  type: FlashcardType;
  /** 关联的 mistake 记录 id */
  sourceId: string;
  section: IeltsSection;
  frontTitle: string;
  frontBody: string;
  backTitle: string;
  backBody: string;
  meta?: string;
};
