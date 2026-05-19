export type ClassificationSuggestion = {
  errorReason: string;
  knowledgePoint: string;
};

const EMPTY: ClassificationSuggestion = { errorReason: "", knowledgePoint: "" };

// Common English suffixes that signal a part-of-speech / inflection change.
const POS_SUFFIXES = new Set([
  "s",
  "es",
  "ed",
  "ing",
  "ly",
  "er",
  "or",
  "est",
  "ment",
  "tion",
  "sion",
  "ness",
  "able",
  "ible",
  "ous",
  "ive",
  "ful",
  "less",
  "ize",
  "ise",
  "al",
  "ic",
  "ity",
  "ty",
  "ry",
]);

// English prefixes that flip the meaning of a base word.
const NEGATING_PREFIXES = new Set([
  "un",
  "in",
  "im",
  "il",
  "ir",
  "non",
  "dis",
  "mis",
  "anti",
]);

function isPureNumeric(s: string) {
  return /^[\d.,%~\-–]+$/.test(s);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const m = a.length;
  const n = b.length;
  let prev: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  let curr: number[] = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Heuristic classifier that suggests an error reason + knowledge point by comparing
 * `my` answer with `correct` answer. Returns `EMPTY` when the inputs are too sparse
 * to give a useful hint. Users are expected to refine the suggestion afterwards.
 */
export function classifyMistake(
  myAnswer: string,
  correctAnswer: string,
): ClassificationSuggestion {
  const my = myAnswer.trim().toLowerCase();
  const correct = correctAnswer.trim().toLowerCase();

  // (A) Multiple alternative answers — paraphrase question.
  if (correct.includes("/") || correct.includes("／")) {
    return {
      errorReason: "未识别同义替换 (paraphrasing)",
      knowledgePoint: "同义替换 / paraphrasing",
    };
  }

  // (B) Exact match → user actually got it right.
  if (my && correct && my === correct) return EMPTY;

  // (C) Missing my-answer → user didn't catch it.
  if (!my && correct) {
    return {
      errorReason: "没听清 / 未作答",
      knowledgePoint: "听力定位 · 听清原文",
    };
  }
  if (!correct) return EMPTY;

  // (D) Both numeric → number / unit mix-up.
  if (isPureNumeric(my) && isPureNumeric(correct)) {
    return {
      errorReason: "数字 / 单位记错",
      knowledgePoint: "听力数字与单位",
    };
  }

  // (E) Prefix relationship: one is the other plus a leading prefix.
  if (my.endsWith(correct) && my.length > correct.length) {
    const prefix = my.slice(0, my.length - correct.length);
    const negHint = NEGATING_PREFIXES.has(prefix)
      ? "（语义反义）"
      : "";
    return {
      errorReason: `多加了前缀「${prefix}」${negHint}`,
      knowledgePoint: "前缀辨析",
    };
  }
  if (correct.endsWith(my) && correct.length > my.length) {
    const prefix = correct.slice(0, correct.length - my.length);
    const negHint = NEGATING_PREFIXES.has(prefix)
      ? "（语义反义）"
      : "";
    return {
      errorReason: `漏听了前缀「${prefix}」${negHint}`,
      knowledgePoint: "前缀辨析",
    };
  }

  // (F) Suffix relationship: one is the other plus a trailing suffix.
  if (correct.startsWith(my) && correct.length > my.length) {
    const suffix = correct.slice(my.length);
    if (suffix === "s" || suffix === "es") {
      return {
        errorReason: "漏写了复数 -s / -es",
        knowledgePoint: "单复数",
      };
    }
    const isPos = POS_SUFFIXES.has(suffix);
    return {
      errorReason: `漏写后缀「${suffix}」${isPos ? "（词性变化）" : ""}`,
      knowledgePoint: isPos ? "词性变化 · 词形" : "词形变化",
    };
  }
  if (my.startsWith(correct) && my.length > correct.length) {
    const suffix = my.slice(correct.length);
    if (suffix === "s" || suffix === "es") {
      return {
        errorReason: "多写了复数 -s / -es",
        knowledgePoint: "单复数",
      };
    }
    return {
      errorReason: `多写后缀「${suffix}」`,
      knowledgePoint: "词形变化",
    };
  }

  // (G) Small edit distance → spelling typo.
  const dist = levenshtein(my, correct);
  const longer = Math.max(my.length, correct.length);
  if (longer >= 4 && dist <= 2) {
    return {
      errorReason: "拼写错误",
      knowledgePoint: "拼写",
    };
  }

  // (H) Fallback: different word entirely → vocabulary / synonym issue.
  return {
    errorReason: "词义辨析 / 近义混淆",
    knowledgePoint: "词汇辨析",
  };
}
