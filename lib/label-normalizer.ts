/**
 * 轻量同义归并：将模型 / 用户写的各种自由文本标签收敛到统一规范名。
 *
 * 策略：
 *   1. 规范化输入（去空白、去标点、转小写）
 *   2. 优先用 alias 精确匹配
 *   3. 退化到关键字子串匹配
 *   4. 都没命中就返回原文（不丢信息）
 */

type Rule = {
  canonical: string;
  aliases: string[];
  keywords?: string[];
};

const ERROR_REASON_RULES: Rule[] = [
  {
    canonical: "拼写错误",
    aliases: ["拼写", "拼错", "spelling", "spell"],
    keywords: ["拼写", "spell"],
  },
  {
    canonical: "单复数错误",
    aliases: ["复数", "单数", "复数错误", "单数错误", "单复数"],
    keywords: ["复数", "单数"],
  },
  {
    canonical: "词性 / 词形错误",
    aliases: ["词性变化", "词形变化", "词性", "词形"],
    keywords: ["词性", "词形"],
  },
  {
    canonical: "前缀错误",
    aliases: ["前缀辨析", "前缀"],
    keywords: ["前缀"],
  },
  {
    canonical: "后缀错误",
    aliases: ["后缀辨析", "后缀"],
    keywords: ["后缀"],
  },
  {
    canonical: "反义 / 否定错误",
    aliases: [
      "反义",
      "反义词",
      "反义错误",
      "反义词错误",
      "否定混淆",
      "肯定否定混淆",
      "否定词错误",
    ],
    keywords: ["反义", "否定"],
  },
  {
    canonical: "同义替换未识别",
    aliases: [
      "未识别同义替换",
      "同义替换",
      "同义没听出",
      "paraphrasing",
      "paraphrase",
    ],
    keywords: ["同义", "paraphras"],
  },
  {
    canonical: "数字 / 单位错误",
    aliases: [
      "数字",
      "数字错误",
      "数字记错",
      "单位错误",
      "数字单位",
      "数字 / 单位",
    ],
    keywords: ["数字", "单位"],
  },
  {
    canonical: "没听清 / 弱读",
    aliases: ["没听清", "没听出", "弱读", "听不清", "听漏", "未作答", "没听清 / 未作答"],
    keywords: ["没听", "弱读", "听不", "听漏"],
  },
  {
    canonical: "漏写修饰词",
    aliases: ["漏写修饰词", "漏听修饰", "修饰词遗漏", "修饰语丢失", "漏修饰"],
    keywords: ["修饰"],
  },
  {
    canonical: "定位错误",
    aliases: ["定位错", "定位失败", "听力定位错误", "定位偏移"],
    keywords: ["定位"],
  },
  {
    canonical: "词汇辨析 / 近义混淆",
    aliases: ["词义辨析", "近义混淆", "近义词错误", "词汇辨析", "词汇"],
    keywords: ["词义", "近义"],
  },
  {
    canonical: "审题不仔细",
    aliases: ["审题", "审题错误", "漏看条件", "题干理解错误"],
    keywords: ["审题"],
  },
];

const KNOWLEDGE_POINT_RULES: Rule[] = [
  {
    canonical: "同义替换",
    aliases: [
      "同义替换 / paraphrasing",
      "paraphrasing",
      "paraphrase",
      "同义",
      "近义替换",
    ],
    keywords: ["同义", "paraphras"],
  },
  {
    canonical: "拼写",
    aliases: ["拼写错误", "spelling"],
    keywords: ["拼写", "spell"],
  },
  {
    canonical: "单复数",
    aliases: ["复数", "单数"],
    keywords: ["复数", "单数"],
  },
  {
    canonical: "词性 / 词形变化",
    aliases: [
      "词性 · 词形",
      "词形变化",
      "词性变化 · 词形",
      "词性变化",
      "词性",
      "词形",
    ],
    keywords: ["词性", "词形"],
  },
  {
    canonical: "前缀辨析",
    aliases: ["前缀"],
    keywords: ["前缀"],
  },
  {
    canonical: "后缀辨析",
    aliases: ["后缀"],
    keywords: ["后缀"],
  },
  {
    canonical: "数字与单位",
    aliases: ["数字", "数字单位", "单位", "数字与单位"],
    keywords: ["数字", "单位"],
  },
  {
    canonical: "细节捕捉",
    aliases: ["细节", "修饰词", "修饰语", "细节信息"],
    keywords: ["细节", "修饰"],
  },
  {
    canonical: "听力定位",
    aliases: ["定位", "听清原文", "定位句", "听力定位 · 听清原文"],
    keywords: ["定位"],
  },
  {
    canonical: "否定辨析",
    aliases: ["否定词辨析", "反义", "否定", "反义词"],
    keywords: ["否定", "反义"],
  },
  {
    canonical: "词汇辨析",
    aliases: ["词义辨析", "近义混淆", "词汇"],
    keywords: ["词义", "近义"],
  },
];

function normalizeWhitespace(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s·•・,，。.!！?？:：;；"'"'`]/g, "")
    .trim();
}

function matchRule(input: string, rules: Rule[]): string | null {
  if (!input) return null;
  const normalized = normalizeWhitespace(input);
  if (!normalized) return null;

  for (const rule of rules) {
    for (const alias of rule.aliases) {
      if (normalizeWhitespace(alias) === normalized) return rule.canonical;
    }
  }

  for (const rule of rules) {
    if (!rule.keywords) continue;
    for (const keyword of rule.keywords) {
      if (normalized.includes(normalizeWhitespace(keyword))) return rule.canonical;
    }
  }

  return null;
}

export function normalizeErrorReason(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return matchRule(value, ERROR_REASON_RULES) ?? value;
}

export function normalizeKnowledgePoint(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return matchRule(value, KNOWLEDGE_POINT_RULES) ?? value;
}

/** 暴露给设置 / 调试页用的全部规范名。 */
export const KNOWN_ERROR_REASONS = ERROR_REASON_RULES.map((r) => r.canonical);
export const KNOWN_KNOWLEDGE_POINTS = KNOWLEDGE_POINT_RULES.map((r) => r.canonical);
