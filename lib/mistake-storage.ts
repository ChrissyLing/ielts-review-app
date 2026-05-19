import { getMistakeKind, type MistakeRecord } from "@/types/mistake";
import {
  normalizeErrorReason,
  normalizeKnowledgePoint,
} from "@/lib/label-normalizer";
import { REVIEW_PROGRESS_UPDATED_EVENT } from "@/lib/review-progress-storage";

const STORAGE_KEY = "ielts-review-app:mistakes";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getMistakes(): MistakeRecord[] {
  if (!isBrowser()) return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MistakeRecord[]) : [];
  } catch {
    return [];
  }
}

export const MISTAKES_UPDATED_EVENT = "ielts-review-app:mistakes-updated";

export function saveMistakes(mistakes: MistakeRecord[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes));
  window.dispatchEvent(new CustomEvent(MISTAKES_UPDATED_EVENT));
}

function applyLabelNormalization(mistake: MistakeRecord): MistakeRecord {
  if (getMistakeKind(mistake) === "vocab") return mistake;
  return {
    ...mistake,
    errorReason: normalizeErrorReason(mistake.errorReason) || mistake.errorReason,
    knowledgePoint:
      normalizeKnowledgePoint(mistake.knowledgePoint) || mistake.knowledgePoint,
  };
}

export function addMistake(mistake: MistakeRecord) {
  const mistakes = getMistakes();
  saveMistakes([applyLabelNormalization(mistake), ...mistakes]);
}

export function getMistakeById(id: string): MistakeRecord | undefined {
  return getMistakes().find((m) => m.id === id);
}

export function updateMistake(updated: MistakeRecord) {
  const normalized = applyLabelNormalization({
    ...updated,
    updatedAt: new Date().toISOString(),
  });
  saveMistakes(
    getMistakes().map((m) => (m.id === normalized.id ? normalized : m)),
  );
}

export function deleteMistake(id: string) {
  saveMistakes(getMistakes().filter((m) => m.id !== id));
}

export type AppBackup = {
  version: 1;
  exportedAt: string;
  mistakes: MistakeRecord[];
  reviewProgress?: Record<string, import("@/types/review").ReviewProgress>;
};

export function exportBackup(): AppBackup {
  let reviewProgress: AppBackup["reviewProgress"];
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem("ielts-review-app:review-progress");
      reviewProgress = raw ? (JSON.parse(raw) as AppBackup["reviewProgress"]) : {};
    } catch {
      reviewProgress = {};
    }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    mistakes: getMistakes(),
    reviewProgress,
  };
}

export function importBackup(
  backup: AppBackup,
  options: { merge: boolean } = { merge: false },
): { mistakes: number; progress: number } {
  const incoming = Array.isArray(backup.mistakes) ? backup.mistakes : [];
  const normalizedIncoming = incoming.map((m) => applyLabelNormalization(m));

  if (options.merge) {
    const existing = getMistakes();
    const byId = new Map(existing.map((m) => [m.id, m]));
    for (const m of normalizedIncoming) byId.set(m.id, m);
    saveMistakes(Array.from(byId.values()));
  } else {
    saveMistakes(normalizedIncoming);
  }

  let progressCount = 0;
  if (isBrowser() && backup.reviewProgress) {
    if (options.merge) {
      const raw = window.localStorage.getItem("ielts-review-app:review-progress");
      const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const merged = { ...existing, ...backup.reviewProgress };
      window.localStorage.setItem(
        "ielts-review-app:review-progress",
        JSON.stringify(merged),
      );
      progressCount = Object.keys(backup.reviewProgress).length;
    } else {
      window.localStorage.setItem(
        "ielts-review-app:review-progress",
        JSON.stringify(backup.reviewProgress),
      );
      progressCount = Object.keys(backup.reviewProgress).length;
    }
    window.dispatchEvent(new CustomEvent(REVIEW_PROGRESS_UPDATED_EVENT));
  }

  return { mistakes: normalizedIncoming.length, progress: progressCount };
}

export function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

