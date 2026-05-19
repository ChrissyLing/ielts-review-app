export const IELTS_SECTIONS = ["listening", "reading", "writing", "speaking"] as const;

export type IeltsSection = (typeof IELTS_SECTIONS)[number];

/**
 * 听力 / 阅读这两个 section 才会产生「错题」（题号 + 我的答案 + 正确答案）。
 * 写作 / 口语 没有"对错答案"的概念，只记录素材生词。
 */
export const MISTAKE_SECTIONS = ["listening", "reading"] as const;
export const VOCAB_SECTIONS = ["writing", "speaking"] as const;

export type MistakeKind = "mistake" | "vocab";

export type VocabularyEntry = {
  id: string;
  word: string;
  definition: string;
  tags: string[];
};

export type MistakeRecord = {
  id: string;
  /** 默认 "mistake"。"vocab" 表示纯生词笔记，没有题号/答案。 */
  kind?: MistakeKind;
  section: IeltsSection;
  questionText: string;
  /** vocab 笔记的话题（例如 "Speaking Part 2 - Hometown"），错题模式忽略。 */
  topic?: string;
  imagePlaceholder?: string;
  myAnswer: string;
  correctAnswer: string;
  vocabularies: VocabularyEntry[];
  knowledgePoint: string;
  errorReason: string;
  createdAt: string;
  updatedAt: string;
};

export function getMistakeKind(record: Pick<MistakeRecord, "kind">): MistakeKind {
  return record.kind ?? "mistake";
}

export const IELTS_SECTION_LABELS: Record<IeltsSection, string> = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

