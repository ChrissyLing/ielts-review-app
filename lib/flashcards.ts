import type { Flashcard } from "@/types/review";
import {
  getMistakeKind,
  IELTS_SECTION_LABELS,
  type MistakeRecord,
} from "@/types/mistake";

export function mistakeCardId(mistakeId: string) {
  return `mistake:${mistakeId}`;
}

export function vocabularyCardId(vocabId: string) {
  return `vocab:${vocabId}`;
}

export function buildFlashcardsFromRecords(records: MistakeRecord[]): Flashcard[] {
  const cards: Flashcard[] = [];

  for (const record of records) {
    const kind = getMistakeKind(record);
    const sectionLabel = IELTS_SECTION_LABELS[record.section];

    if (kind === "mistake") {
      if (!record.myAnswer.trim() && !record.correctAnswer.trim()) continue;
      cards.push({
        id: mistakeCardId(record.id),
        type: "mistake",
        sourceId: record.id,
        section: record.section,
        frontTitle: sectionLabel,
        frontBody: record.questionText || "（未填题目原文）",
        backTitle: "正确答案",
        backBody: record.correctAnswer,
        meta: [
          record.myAnswer ? `我的答案：${record.myAnswer}` : null,
          record.errorReason ? `错因：${record.errorReason}` : null,
          record.knowledgePoint ? `知识点：${record.knowledgePoint}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    for (const vocab of record.vocabularies) {
      const word = vocab.word.trim();
      const definition = vocab.definition.trim();
      if (!word && !definition) continue;

      const topic =
        kind === "vocab"
          ? record.topic || record.questionText
          : record.questionText;

      cards.push({
        id: vocabularyCardId(vocab.id),
        type: "vocabulary",
        sourceId: record.id,
        section: record.section,
        frontTitle: `${sectionLabel} · 生词`,
        frontBody: word || "（未命名单词）",
        backTitle: "释义 / 用法",
        backBody: definition || "（暂无释义）",
        meta: [
          topic ? `来源：${topic}` : null,
          vocab.tags.length > 0 ? `Tag：${vocab.tags.join("、")}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }
  }

  return cards;
}
