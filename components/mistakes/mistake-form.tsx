"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  ImagePlusIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  SparklesIcon,
  TagsIcon,
  Trash2Icon,
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
import { classifyMistake } from "@/lib/error-classifier";
import { addMistake, createClientId } from "@/lib/mistake-storage";
import {
  IELTS_SECTION_LABELS,
  IELTS_SECTIONS,
  type IeltsSection,
  type MistakeRecord,
  type VocabularyEntry,
} from "@/types/mistake";

type VocabularyDraft = VocabularyEntry & {
  tagText: string;
};

type FormState = {
  section: IeltsSection;
  questionText: string;
  imagePlaceholder: string;
  myAnswer: string;
  correctAnswer: string;
  knowledgePoint: string;
  errorReason: string;
};

const defaultFormState: FormState = {
  section: "listening",
  questionText: "",
  imagePlaceholder: "",
  myAnswer: "",
  correctAnswer: "",
  knowledgePoint: "",
  errorReason: "",
};

function createVocabularyDraft(): VocabularyDraft {
  return {
    id: createClientId("vocab"),
    word: "",
    definition: "",
    tags: [],
    tagText: "",
  };
}

function splitTags(value: string) {
  return value
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function MistakeForm() {
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [vocabularies, setVocabularies] = useState<VocabularyDraft[]>([
    createVocabularyDraft(),
  ]);

  const completedVocabularyCount = useMemo(
    () => vocabularies.filter((item) => item.word.trim()).length,
    [vocabularies],
  );

  function updateForm<Field extends keyof FormState>(
    field: Field,
    value: FormState[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateVocabulary<Field extends keyof VocabularyDraft>(
    id: string,
    field: Field,
    value: VocabularyDraft[Field],
  ) {
    setVocabularies((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function addVocabularyRow() {
    setVocabularies((current) => [...current, createVocabularyDraft()]);
  }

  function removeVocabularyRow(id: string) {
    setVocabularies((current) =>
      current.length === 1
        ? [createVocabularyDraft()]
        : current.filter((item) => item.id !== id),
    );
  }

  function resetForm() {
    setForm(defaultFormState);
    setVocabularies([createVocabularyDraft()]);
  }

  function handleAutoClassify() {
    if (!form.myAnswer.trim() && !form.correctAnswer.trim()) {
      toast.error("请先填写「我的答案」或「正确答案」");
      return;
    }
    const suggestion = classifyMistake(form.myAnswer, form.correctAnswer);
    if (!suggestion.errorReason && !suggestion.knowledgePoint) {
      toast.info("两个答案完全一致，看起来没有错可分析");
      return;
    }
    setForm((current) => ({
      ...current,
      errorReason: suggestion.errorReason || current.errorReason,
      knowledgePoint: suggestion.knowledgePoint || current.knowledgePoint,
    }));
    toast.success("已根据答案差异填入错因 / 知识点", {
      description: "如果不准，直接覆写就行",
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const questionOrImage = form.questionText.trim() || form.imagePlaceholder.trim();
    if (!questionOrImage) {
      toast.error("请填写题目原文，或选择一张截图作为占位。");
      return;
    }

    if (!form.myAnswer.trim() || !form.correctAnswer.trim()) {
      toast.error("请同时填写「我的错误答案」和「正确答案」。");
      return;
    }

    if (!form.knowledgePoint.trim() || !form.errorReason.trim()) {
      toast.error("请补充核心知识点和错误原因，方便后续复盘。");
      return;
    }

    const cleanedVocabularies: VocabularyEntry[] = vocabularies
      .map((item) => ({
        id: item.id,
        word: item.word.trim(),
        definition: item.definition.trim(),
        tags: splitTags(item.tagText),
      }))
      .filter((item) => item.word || item.definition || item.tags.length > 0);

    const now = new Date().toISOString();
    const mistake: MistakeRecord = {
      id: createClientId("mistake"),
      kind: "mistake",
      section: form.section,
      questionText: form.questionText.trim(),
      imagePlaceholder: form.imagePlaceholder.trim() || undefined,
      myAnswer: form.myAnswer.trim(),
      correctAnswer: form.correctAnswer.trim(),
      vocabularies: cleanedVocabularies,
      knowledgePoint: form.knowledgePoint.trim(),
      errorReason: form.errorReason.trim(),
      createdAt: now,
      updatedAt: now,
    };

    addMistake(mistake);
    toast.success("错题已保存到本地错题本。", {
      description: `已记录 ${IELTS_SECTION_LABELS[mistake.section]}错题，包含 ${cleanedVocabularies.length} 个生词。`,
    });
    resetForm();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>题目信息</CardTitle>
            <CardDescription>
              先记录错题来源、题目原文和答案对比，后续仪表盘会基于这些字段统计。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="section">题目类型</Label>
              <Select
                value={form.section}
                onValueChange={(value) =>
                  updateForm("section", value as IeltsSection)
                }
              >
                <SelectTrigger id="section" className="w-full">
                  <SelectValue placeholder="选择科目" />
                </SelectTrigger>
                <SelectContent>
                  {IELTS_SECTIONS.map((section) => (
                    <SelectItem key={section} value={section}>
                      {IELTS_SECTION_LABELS[section]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="questionText">题目原文</Label>
              <Textarea
                id="questionText"
                value={form.questionText}
                onChange={(event) =>
                  updateForm("questionText", event.target.value)
                }
                className="min-h-36 resize-y"
                placeholder="粘贴题干、原文片段、听力定位句，或写下截图中的关键信息..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="myAnswer">我的错误答案</Label>
                <Textarea
                  id="myAnswer"
                  value={form.myAnswer}
                  onChange={(event) => updateForm("myAnswer", event.target.value)}
                  className="min-h-24"
                  placeholder="例如：environment"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="correctAnswer">正确答案</Label>
                <Textarea
                  id="correctAnswer"
                  value={form.correctAnswer}
                  onChange={(event) =>
                    updateForm("correctAnswer", event.target.value)
                  }
                  className="min-h-24"
                  placeholder="例如：environmental"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>错误原因与知识点</CardTitle>
                <CardDescription>
                  填好「我的答案 / 正确答案」后可一键识别，结果可自由覆写。
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoClassify}
              >
                <SparklesIcon />
                智能识别
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="knowledgePoint">核心知识点</Label>
              <Input
                id="knowledgePoint"
                value={form.knowledgePoint}
                onChange={(event) =>
                  updateForm("knowledgePoint", event.target.value)
                }
                placeholder="如：虚拟语气 / 同义替换 / 单复数拼写"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="errorReason">核心错误原因</Label>
              <Input
                id="errorReason"
                value={form.errorReason}
                onChange={(event) => updateForm("errorReason", event.target.value)}
                placeholder="如：没听出弱读 / 定位错误 / 审题漏条件"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>截图占位</CardTitle>
            <CardDescription>
              MVP 暂不上传图片文件，先记录文件名，后续接后端时再保存真实图片。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label
              htmlFor="questionImage"
              className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:bg-muted/60"
            >
              <ImagePlusIcon className="mb-3 size-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {form.imagePlaceholder || "选择截图作为占位"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                只保存文件名，不会上传图片
              </span>
              <input
                id="questionImage"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  updateForm(
                    "imagePlaceholder",
                    event.target.files?.[0]?.name ?? "",
                  )
                }
              />
            </Label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>生词记录</CardTitle>
                <CardDescription>
                  支持多个单词、释义和标签，第三步/第四步会自动汇总。
                </CardDescription>
              </div>
              <Badge variant="secondary">{completedVocabularyCount} 个</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {vocabularies.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-background/70 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TagsIcon className="size-4 text-brand" />
                    生词 {index + 1}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="删除生词"
                    onClick={() => removeVocabularyRow(item.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor={`${item.id}-word`}>单词 / 短语</Label>
                    <Input
                      id={`${item.id}-word`}
                      value={item.word}
                      onChange={(event) =>
                        updateVocabulary(item.id, "word", event.target.value)
                      }
                      placeholder="如：subsequent"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`${item.id}-definition`}>释义</Label>
                    <Input
                      id={`${item.id}-definition`}
                      value={item.definition}
                      onChange={(event) =>
                        updateVocabulary(
                          item.id,
                          "definition",
                          event.target.value,
                        )
                      }
                      placeholder="如：随后的，后来的"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`${item.id}-tags`}>Tag</Label>
                    <Input
                      id={`${item.id}-tags`}
                      value={item.tagText}
                      onChange={(event) =>
                        updateVocabulary(item.id, "tagText", event.target.value)
                      }
                      placeholder="逗号分隔，如：阅读, 高频词"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addVocabularyRow}
            >
              <PlusIcon />
              添加一个生词
            </Button>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-10 flex gap-2 rounded-xl border border-border bg-background/85 p-3 shadow-lg backdrop-blur">
          <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
            <RotateCcwIcon />
            重置
          </Button>
          <Button type="submit" className="flex-1">
            <SaveIcon />
            保存错题
          </Button>
        </div>
      </div>
    </form>
  );
}

