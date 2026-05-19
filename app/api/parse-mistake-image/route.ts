import { NextResponse } from "next/server";

import { getArkConfig } from "@/lib/ark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROMPT = `你是一个雅思错题截图解析专家。截图可能来自雅思 **听力** 或 **阅读** 的答案对照页（如爱听写、剑桥真题答案、错题本截图等）。
请识别用户做错的题（即「用户答案 ≠ 正确答案」），跳过做对的题。

对每道错题提取：
- questionNumber：题号（字符串，例如 "37"）
- myAnswer：用户填写或选择的（错）答案
- correctAnswer：正确答案。如果接受多个同义答案，用 " / " 分隔，例如 "new taste / fifth taste / 5th taste"
- errorReason：用 15 字以内中文总结这题为什么错（如「多加了前缀 un」「漏写复数 s」「未识别 paraphrasing」「定位错误」「细节匹配错误」）
- knowledgePoint：用 12 字以内中文总结涉及的雅思考点（如「同义替换」「前缀辨析」「单复数」「拼写」「数字与单位」「细节定位」「主旨题」）

并识别整张图的：
- source：题源信息，例如 "剑桥雅思 7 Test 4 Part 4" 或 "剑桥雅思 16 Test 2 Reading Passage 1"
- section：科目，根据截图内容判定：音频转写 / 听力填空 / 听力选择 → listening；阅读文章段落 / 标题匹配 / True False Not Given / 阅读填空 → reading。**只能填 listening 或 reading**（截图不会是 writing / speaking）。

严格按以下 JSON 返回（不要任何额外文字、解释、Markdown 代码块包裹）：

{
  "source": "剑桥雅思 7 Test 4 Part 4",
  "section": "listening",
  "rows": [
    {
      "questionNumber": "37",
      "myAnswer": "taste",
      "correctAnswer": "new taste / fifth taste / 5th taste",
      "errorReason": "未识别同义替换",
      "knowledgePoint": "同义替换 / paraphrasing"
    }
  ]
}

如果截图中没有错题，rows 返回空数组。如果某字段无法识别，留空字符串而不是省略。`;

type VisionParsedRow = {
  questionNumber: string;
  myAnswer: string;
  correctAnswer: string;
  errorReason: string;
  knowledgePoint: string;
};

type VisionParseResult = {
  source: string;
  section: string;
  rows: VisionParsedRow[];
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const { apiKey, model, baseUrl } = getArkConfig();
  if (!apiKey) {
    return jsonError(
      "ARK_API_KEY 未配置。请把火山方舟的 Key 写入 .env.local 后重启开发服务器。",
      500,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("请求体不是有效的 multipart/form-data。");
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return jsonError("缺少 image 字段，或上传的内容不是文件。");
  }
  if (!file.type.startsWith("image/")) {
    return jsonError(`不支持的文件类型：${file.type || "unknown"}`);
  }
  if (file.size > 8 * 1024 * 1024) {
    return jsonError("图片过大（>8MB），请压缩后再试。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const body = {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" as const },
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: PROMPT },
          { type: "image_url" as const, image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  let arkResp: Response;
  try {
    arkResp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return jsonError(
      `调用方舟失败：${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  }

  if (!arkResp.ok) {
    const text = await arkResp.text();
    return jsonError(
      `方舟返回 ${arkResp.status}：${text.slice(0, 500)}`,
      arkResp.status === 401 || arkResp.status === 403 ? arkResp.status : 502,
    );
  }

  let payload: unknown;
  try {
    payload = await arkResp.json();
  } catch {
    return jsonError("方舟返回内容不是 JSON。", 502);
  }

  const content = extractMessageContent(payload);
  if (!content) {
    return jsonError("方舟响应缺少 message.content 字段。", 502);
  }

  const parsed = parseModelJson(content);
  if (!parsed) {
    return jsonError(
      `模型未返回有效 JSON：${content.slice(0, 300)}`,
      502,
    );
  }

  return NextResponse.json(normalize(parsed));
}

function extractMessageContent(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const choices = Array.isArray(obj.choices) ? obj.choices : null;
  const first = choices?.[0];
  if (!first || typeof first !== "object") return null;
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === "string" ? content : null;
}

function parseModelJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Some models wrap JSON in ```json ... ``` despite the prompt — strip it.
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalize(raw: Record<string, unknown>): VisionParseResult {
  const rowsArray = Array.isArray(raw.rows) ? raw.rows : [];
  const rows: VisionParsedRow[] = rowsArray.map((r): VisionParsedRow => {
    const row = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    return {
      questionNumber: stringify(row.questionNumber),
      myAnswer: stringify(row.myAnswer),
      correctAnswer: stringify(row.correctAnswer),
      errorReason: stringify(row.errorReason),
      knowledgePoint: stringify(row.knowledgePoint),
    };
  });

  return {
    source: stringify(raw.source),
    section: stringify(raw.section),
    rows,
  };
}

function stringify(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
