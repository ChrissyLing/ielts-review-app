import type { IeltsSection } from "@/types/mistake";

export type ParsedMistakeRow = {
  questionNumber: string;
  myAnswer: string;
  correctAnswer: string;
};

export type ParseResult = {
  rows: ParsedMistakeRow[];
  source: string;
  section: IeltsSection | null;
  format: "aitingxie" | "manual";
};

function extractLeadingNumber(token: string): { number: string; rest: string } {
  const trimmed = token.trim();
  const match = trimmed.match(/^(\d+(?:\s*[-–~]\s*\d+)?)\s*(.*)$/);
  if (!match) return { number: "", rest: trimmed };
  return { number: match[1].replace(/\s+/g, ""), rest: match[2] };
}

function buildRowFromParts(parts: string[]): ParsedMistakeRow {
  const trimmed = parts
    .map((part) => part.trim())
    .filter((part, index, arr) => {
      if (part) return true;
      return index !== 0 && index !== arr.length - 1;
    });

  const [first = "", second = "", third = "", ...rest] = trimmed;
  const { number, rest: firstRest } = extractLeadingNumber(first);

  if (trimmed.length >= 3) {
    return {
      questionNumber: number,
      myAnswer: (firstRest || second).trim(),
      correctAnswer: firstRest
        ? [second, third, ...rest].filter(Boolean).join(" ").trim()
        : [third, ...rest].filter(Boolean).join(" ").trim(),
    };
  }

  if (trimmed.length === 2) {
    return {
      questionNumber: number,
      myAnswer: (firstRest || second).trim(),
      correctAnswer: firstRest ? second : "",
    };
  }

  return {
    questionNumber: number,
    myAnswer: firstRest,
    correctAnswer: "",
  };
}

/**
 * Try to split a concatenated string like "uncommoncommon" into ["uncommon", "common"]
 * when one part is a suffix/prefix of the other (a strong signal of duplicated wrong+correct answers).
 */
function tryDetectDuplication(s: string): [string, string] | null {
  const clean = s.replace(/\s+/g, "");
  if (clean.length < 4) return null;

  if (clean.length % 2 === 0) {
    const half = clean.length / 2;
    const left = clean.slice(0, half);
    const right = clean.slice(half);
    if (left === right) return [left, right];
  }

  for (let aLen = 2; aLen <= clean.length - 2; aLen++) {
    const a = clean.slice(0, aLen);
    const b = clean.slice(aLen);
    if (a.length < 2 || b.length < 2 || a === b) continue;
    if (a.endsWith(b) || a.startsWith(b) || b.endsWith(a) || b.startsWith(a)) {
      return [a, b];
    }
  }
  return null;
}

function splitAitingxieAnswer(raw: string): {
  myAnswer: string;
  correctAnswer: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { myAnswer: "", correctAnswer: "" };

  if (trimmed.includes("/") || trimmed.includes("／")) {
    return { myAnswer: "", correctAnswer: trimmed };
  }

  if (/\s/.test(trimmed)) {
    const duplicate = tryDetectDuplication(trimmed);
    if (duplicate) return { myAnswer: duplicate[0], correctAnswer: duplicate[1] };
    return { myAnswer: trimmed, correctAnswer: trimmed };
  }

  const duplicate = tryDetectDuplication(trimmed);
  if (duplicate) return { myAnswer: duplicate[0], correctAnswer: duplicate[1] };

  return { myAnswer: trimmed, correctAnswer: trimmed };
}

function parseAitingxieText(text: string): ParseResult {
  const rows: ParsedMistakeRow[] = [];
  const seenNumbers = new Set<string>();

  // Answer markers look like: "<digits><answer>解析/做笔记".
  // - (?!\d) after \d+ prevents the engine from backtracking digit runs (e.g. avoids matching
  //   "1908 Kikunae ..." as q="190" + answer "8 Kikunae ...").
  // - [a-zA-Z] (not [a-zA-Z0-9]) rules out things like "31. The speaker..." (multi-choice question
  //   stems) and is consistent with how 爱听写 displays fill-in answers (always start with a letter).
  const pattern = /(\d+)(?!\d)([a-zA-Z][^解]*?)\s*解析\s*\/\s*做笔记/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const qNum = match[1];
    if (seenNumbers.has(qNum)) continue;

    const rawAnswer = match[2].replace(/\s+$/g, "").trim();
    if (!rawAnswer) continue;

    seenNumbers.add(qNum);

    const { myAnswer, correctAnswer } = splitAitingxieAnswer(rawAnswer);
    rows.push({ questionNumber: qNum, myAnswer, correctAnswer });
  }

  let source = "";
  const campMatch = text.match(/剑[雅桥](?:思)?\s*(\d+)/);
  const testMatch = text.match(/Test\s*(\d+)/i);
  const partMatch = text.match(/Part\s*(\d+)/i);
  if (campMatch) source = `剑桥雅思 ${campMatch[1]}`;
  if (testMatch) source = source ? `${source} Test ${testMatch[1]}` : `Test ${testMatch[1]}`;
  if (partMatch) source = source ? `${source} Part ${partMatch[1]}` : `Part ${partMatch[1]}`;

  return { rows, source, section: "listening", format: "aitingxie" };
}

function parseManualText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines
    .map<ParsedMistakeRow | null>((line) => {
      if (line.includes("|")) return buildRowFromParts(line.split("|"));
      if (line.includes("\t")) return buildRowFromParts(line.split("\t"));

      const { number, rest } = extractLeadingNumber(line);
      if (!number && !rest) return null;
      return {
        questionNumber: number,
        myAnswer: rest,
        correctAnswer: "",
      };
    })
    .filter((row): row is ParsedMistakeRow => row !== null);

  return { rows, source: "", section: null, format: "manual" };
}

function looksLikeAitingxie(text: string): boolean {
  return /解析\s*\/\s*做笔记/.test(text) || /爱听写/.test(text) || /剑[雅桥]/.test(text);
}

export function smartParse(text: string): ParseResult {
  if (looksLikeAitingxie(text)) {
    const result = parseAitingxieText(text);
    if (result.rows.length > 0) return result;
  }
  return parseManualText(text);
}

export function parseBatchText(text: string): ParsedMistakeRow[] {
  return smartParse(text).rows;
}
