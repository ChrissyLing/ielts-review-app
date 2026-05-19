"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ScreenshotUploader,
  type VisionParseResult,
} from "@/components/mistakes/screenshot-uploader";
import { smartParse } from "@/lib/batch-parser";
import { classifyMistake } from "@/lib/error-classifier";
import {
  addMistake,
  createClientId,
} from "@/lib/mistake-storage";
import {
  IELTS_SECTION_LABELS,
  IELTS_SECTIONS,
  type IeltsSection,
  type MistakeRecord,
} from "@/types/mistake";

type DraftRow = {
  id: string;
  questionNumber: string;
  myAnswer: string;
  correctAnswer: string;
  errorReason: string;
  knowledgePoint: string;
};

type SharedFields = {
  section: IeltsSection;
  source: string;
};

type BatchImportFormProps = {
  /** 默认 section，由外层 tab 决定。仅允许有"错题"概念的 section。 */
  initialSection?: Extract<IeltsSection, "listening" | "reading">;
};

function buildDefaultShared(
  section: Extract<IeltsSection, "listening" | "reading">,
): SharedFields {
  return {
    section,
    source: "",
  };
}

function buildFallbackSource(section: IeltsSection): string {
  const date = new Date().toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
  return `未识别题源（${IELTS_SECTION_LABELS[section]} · ${date}）`;
}

const PLACEHOLDER_EXAMPLE = `37 | taste | new taste / fifth taste / 5th taste
38 | uncommon | common
40 | minerals | minerals

# 也可以直接粘贴爱听写完整页面（含 "解析/做笔记" 标记），自动识别错题`;

function createEmptyRow(): DraftRow {
  return {
    id: createClientId("row"),
    questionNumber: "",
    myAnswer: "",
    correctAnswer: "",
    errorReason: "",
    knowledgePoint: "",
  };
}

export function BatchImportForm({
  initialSection = "listening",
}: BatchImportFormProps = {}) {
  const [shared, setShared] = useState<SharedFields>(() =>
    buildDefaultShared(initialSection),
  );
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([createEmptyRow()]);
  /** 题源是 AI 自动识别填入的（用户手改后会清除标记）。 */
  const [sourceAutoFilled, setSourceAutoFilled] = useState(false);

  const populatedRowCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.questionNumber.trim() ||
          row.myAnswer.trim() ||
          row.correctAnswer.trim(),
      ).length,
    [rows],
  );

  function updateShared<Field extends keyof SharedFields>(
    field: Field,
    value: SharedFields[Field],
  ) {
    setShared((current) => ({ ...current, [field]: value }));
    if (field === "source") setSourceAutoFilled(false);
  }

  function updateRow<Field extends keyof DraftRow>(
    id: string,
    field: Field,
    value: DraftRow[Field],
  ) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function addRow() {
    setRows((current) => [...current, createEmptyRow()]);
  }

  function removeRow(id: string) {
    setRows((current) =>
      current.length === 1 ? [createEmptyRow()] : current.filter((row) => row.id !== id),
    );
  }

  function handleVisionResult(result: VisionParseResult) {
    if (!result.rows || result.rows.length === 0) {
      return;
    }

    const mapped: DraftRow[] = result.rows.map((row) => ({
      id: createClientId("row"),
      questionNumber: row.questionNumber || "",
      myAnswer: row.myAnswer || "",
      correctAnswer: row.correctAnswer || "",
      errorReason: row.errorReason || "",
      knowledgePoint: row.knowledgePoint || "",
    }));

    setRows(mapped);

    let autoFilledSource = false;
    setShared((current) => {
      const next = { ...current };
      if (result.source && !current.source.trim()) {
        next.source = result.source;
        autoFilledSource = true;
      }
      const normalizedSection = result.section?.toLowerCase();
      if (
        normalizedSection &&
        IELTS_SECTIONS.includes(normalizedSection as IeltsSection)
      ) {
        next.section = normalizedSection as IeltsSection;
      }
      return next;
    });
    if (autoFilledSource) setSourceAutoFilled(true);
  }

  function handleParse() {
    if (!pasteText.trim()) {
      toast.error("请先粘贴需要解析的文本");
      return;
    }

    const result = smartParse(pasteText);
    if (result.rows.length === 0) {
      toast.error("没有识别到任何题目，请检查格式");
      return;
    }

    const isCorrectRow = (row: { myAnswer: string; correctAnswer: string }) =>
      Boolean(
        row.myAnswer.trim() &&
          row.correctAnswer.trim() &&
          row.myAnswer.trim().toLowerCase() ===
            row.correctAnswer.trim().toLowerCase(),
      );

    const wrongRows = result.rows.filter((row) => !isCorrectRow(row));
    const correctCount = result.rows.length - wrongRows.length;

    if (wrongRows.length === 0) {
      toast.info(`识别到 ${result.rows.length} 道题，全部做对了 🎉`, {
        description: "没有错题需要保存，可手动添加要回顾的题目。",
      });
      return;
    }

    const mapped: DraftRow[] = wrongRows.map((row) => {
      const suggestion = classifyMistake(row.myAnswer, row.correctAnswer);
      return {
        id: createClientId("row"),
        questionNumber: row.questionNumber,
        myAnswer: row.myAnswer,
        correctAnswer: row.correctAnswer,
        errorReason: suggestion.errorReason,
        knowledgePoint: suggestion.knowledgePoint,
      };
    });

    setRows(mapped);

    let autoFilledSource = false;
    setShared((current) => {
      const next = { ...current };
      if (result.source && !current.source.trim()) {
        next.source = result.source;
        autoFilledSource = true;
      }
      if (result.format === "aitingxie" && result.section) {
        next.section = result.section;
      }
      return next;
    });
    if (autoFilledSource) setSourceAutoFilled(true);

    const formatLabel =
      result.format === "aitingxie" ? "爱听写格式" : "通用格式";
    const description = [
      correctCount > 0 ? `已自动跳过 ${correctCount} 道做对的题` : null,
      result.source ? `题源：${result.source}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    toast.success(`${formatLabel} · 已挑出 ${wrongRows.length} 道错题`, {
      description: description || undefined,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validRows = rows.filter(
      (row) =>
        row.myAnswer.trim() &&
        row.correctAnswer.trim() &&
        row.questionNumber.trim(),
    );

    if (validRows.length === 0) {
      toast.error("至少需要一行同时填写：题号 / 我的答案 / 正确答案");
      return;
    }

    const effectiveSource =
      shared.source.trim() || buildFallbackSource(shared.section);
    const now = new Date().toISOString();

    validRows.forEach((row) => {
      const mistake: MistakeRecord = {
        id: createClientId("mistake"),
        kind: "mistake",
        section: shared.section,
        questionText: `${effectiveSource} · 第 ${row.questionNumber.trim()} 题`,
        myAnswer: row.myAnswer.trim(),
        correctAnswer: row.correctAnswer.trim(),
        vocabularies: [],
        knowledgePoint: row.knowledgePoint.trim() || "（待补充）",
        errorReason: row.errorReason.trim() || "（待补充）",
        createdAt: now,
        updatedAt: now,
      };

      addMistake(mistake);
    });

    toast.success(`已批量保存 ${validRows.length} 道错题`, {
      description: `来源：${effectiveSource}`,
    });
    setRows([createEmptyRow()]);
    setPasteText("");
    setSourceAutoFilled(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-brand/30 bg-brand-soft/40">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WandSparklesIcon className="size-4 text-brand" />
                上传截图，AI 全自动识别
              </CardTitle>
              <CardDescription>
                豆包视觉模型会跳过做对的题，识别 <strong>题源、题号、答案、错因、知识点</strong> —— 你只要核对后保存。
              </CardDescription>
            </div>
            <Badge variant="secondary">已解析 {populatedRowCount} 行</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScreenshotUploader onResult={handleVisionResult} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            识别结果摘要
            {sourceAutoFilled ? (
              <Badge className="gap-1 bg-brand/10 text-brand">
                <WandSparklesIcon className="size-3" />
                AI 识别
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            科目和题源会写入每条记录。AI 识别完成后会自动填好，需要时再手动覆盖即可。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-[8rem_minmax(0,1fr)]">
          <div className="grid gap-2">
            <Label htmlFor="batch-section">科目</Label>
            <Select
              value={shared.section}
              onValueChange={(value) => updateShared("section", value as IeltsSection)}
            >
              <SelectTrigger id="batch-section" className="w-full">
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listening">
                  {IELTS_SECTION_LABELS.listening}
                </SelectItem>
                <SelectItem value="reading">
                  {IELTS_SECTION_LABELS.reading}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="batch-source" className="flex items-center gap-2">
              题源
              <span className="text-xs font-normal text-muted-foreground">
                {sourceAutoFilled
                  ? "AI 已自动识别，可改写"
                  : "可留空，保存时使用「未识别题源 · 日期」"}
              </span>
            </Label>
            <Input
              id="batch-source"
              value={shared.source}
              onChange={(event) => updateShared("source", event.target.value)}
              placeholder="如：剑桥雅思 7 Test 4 Section 4"
              className={
                sourceAutoFilled
                  ? "border-brand/40 bg-brand-soft/50 focus:border-brand"
                  : undefined
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">没截图？也可以粘贴文本</CardTitle>
          <CardDescription>
            自动识别 <strong>爱听写</strong> 全文复制（含 &ldquo;解析/做笔记&rdquo; 标记），或自定义
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[11px]">题号 | 我的答案 | 正确答案</code>
            格式。错因 / 知识点会用启发式自动建议。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="batch-paste"
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            className="min-h-32 font-mono text-xs leading-relaxed"
            placeholder={PLACEHOLDER_EXAMPLE}
          />
          <Button type="button" variant="outline" onClick={handleParse}>
            <SparklesIcon />
            解析并填入下方表格
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>批量录入表</CardTitle>
              <CardDescription>
                解析结果可逐行核对、补充错因和知识点，再一次性保存。
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <PlusIcon />
              添加一行
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="w-8 pb-2" aria-label="状态" />
                  <th className="px-3 pb-2 font-medium">题号</th>
                  <th className="px-3 pb-2 font-medium">我的答案</th>
                  <th className="px-3 pb-2 font-medium">正确答案</th>
                  <th className="px-3 pb-2 font-medium">错因（可选）</th>
                  <th className="px-3 pb-2 font-medium">知识点（可选）</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const needsAttention =
                    !row.myAnswer.trim() ||
                    !row.correctAnswer.trim() ||
                    row.myAnswer.trim().toLowerCase() ===
                      row.correctAnswer.trim().toLowerCase();
                  return (
                  <tr key={row.id} className="rounded-lg bg-background/60">
                    <td className="px-1 py-1 align-top">
                      <span
                        aria-label={needsAttention ? "需要补充" : "已识别为错题"}
                        title={
                          needsAttention
                            ? "需要补充我的答案 / 正确答案"
                            : "已识别为错题"
                        }
                        className={`mt-2 inline-block size-2 rounded-full ${
                          needsAttention ? "bg-amber-500" : "bg-brand"
                        }`}
                      />
                    </td>
                    <td className="px-3 py-1 align-top">
                      <Input
                        aria-label={`第 ${index + 1} 行 题号`}
                        value={row.questionNumber}
                        onChange={(event) =>
                          updateRow(row.id, "questionNumber", event.target.value)
                        }
                        placeholder="37"
                        className="w-20"
                      />
                    </td>
                    <td className="px-3 py-1 align-top">
                      <Input
                        aria-label={`第 ${index + 1} 行 我的答案`}
                        value={row.myAnswer}
                        onChange={(event) =>
                          updateRow(row.id, "myAnswer", event.target.value)
                        }
                        placeholder="taste"
                      />
                    </td>
                    <td className="px-3 py-1 align-top">
                      <Input
                        aria-label={`第 ${index + 1} 行 正确答案`}
                        value={row.correctAnswer}
                        onChange={(event) =>
                          updateRow(row.id, "correctAnswer", event.target.value)
                        }
                        placeholder="new taste"
                      />
                    </td>
                    <td className="px-3 py-1 align-top">
                      <Input
                        aria-label={`第 ${index + 1} 行 错因`}
                        value={row.errorReason}
                        onChange={(event) =>
                          updateRow(row.id, "errorReason", event.target.value)
                        }
                        placeholder="自动识别（可编辑）"
                      />
                    </td>
                    <td className="px-3 py-1 align-top">
                      <Input
                        aria-label={`第 ${index + 1} 行 知识点`}
                        value={row.knowledgePoint}
                        onChange={(event) =>
                          updateRow(row.id, "knowledgePoint", event.target.value)
                        }
                        placeholder="自动识别（可编辑）"
                      />
                    </td>
                    <td className="px-1 py-1 align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除此行"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2Icon />
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/85 p-3 shadow-lg backdrop-blur">
            <p className="text-sm text-muted-foreground">
              共 {populatedRowCount} 行有内容；空行会自动忽略。
            </p>
            <Button type="submit">
              <SaveIcon />
              保存全部错题
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
