"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  PlusIcon,
  SaveIcon,
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
import {
  createClientId,
  deleteMistake,
  getMistakeById,
  updateMistake,
} from "@/lib/mistake-storage";
import {
  getMistakeKind,
  IELTS_SECTION_LABELS,
  IELTS_SECTIONS,
  type IeltsSection,
  type MistakeRecord,
  type VocabularyEntry,
} from "@/types/mistake";

type VocabularyDraft = VocabularyEntry & { tagText: string };

type Props = { id: string };

function splitTags(value: string) {
  return value
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function MistakeDetailView({ id }: Props) {
  const router = useRouter();
  const [record, setRecord] = useState<MistakeRecord | null>(null);
  const [vocabularies, setVocabularies] = useState<VocabularyDraft[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const found = getMistakeById(id);
    setRecord(found ?? null);
    if (found) {
      setVocabularies(
        found.vocabularies.map((v) => ({
          ...v,
          tagText: v.tags.join("，"),
        })),
      );
    }
    setHydrated(true);
  }, [id]);

  if (!hydrated) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">加载中...</p>;
  }

  if (!record) {
    return (
      <section className="px-6 py-8 md:px-10">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>记录不存在</CardTitle>
            <CardDescription>可能已被删除。</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mistakes" className="text-sm text-brand hover:underline">
              返回错题本
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  const isVocab = getMistakeKind(record) === "vocab";

  function updateField<Field extends keyof MistakeRecord>(
    field: Field,
    value: MistakeRecord[Field],
  ) {
    setRecord((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateVocabulary<Field extends keyof VocabularyDraft>(
    vid: string,
    field: Field,
    value: VocabularyDraft[Field],
  ) {
    setVocabularies((current) =>
      current.map((item) => (item.id === vid ? { ...item, [field]: value } : item)),
    );
  }

  function addVocabularyRow() {
    setVocabularies((current) => [
      ...current,
      {
        id: createClientId("vocab"),
        word: "",
        definition: "",
        tags: [],
        tagText: "",
      },
    ]);
  }

  function removeVocabularyRow(vid: string) {
    setVocabularies((current) => current.filter((item) => item.id !== vid));
  }

  function handleAutoClassify() {
    if (!record) return;
    const suggestion = classifyMistake(record.myAnswer, record.correctAnswer);
    if (!suggestion.errorReason && !suggestion.knowledgePoint) {
      toast.info("两个答案一致，无需分析");
      return;
    }
    setRecord({
      ...record,
      errorReason: suggestion.errorReason || record.errorReason,
      knowledgePoint: suggestion.knowledgePoint || record.knowledgePoint,
    });
    toast.success("已更新错因 / 知识点");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;

    const cleanedVocab: VocabularyEntry[] = vocabularies
      .map((item) => ({
        id: item.id,
        word: item.word.trim(),
        definition: item.definition.trim(),
        tags: splitTags(item.tagText),
      }))
      .filter((item) => item.word || item.definition || item.tags.length > 0);

    const updated: MistakeRecord = {
      ...record,
      vocabularies: cleanedVocab,
    };

    if (isVocab) {
      if (!updated.topic?.trim() && !updated.questionText.trim()) {
        toast.error("请填写话题");
        return;
      }
    } else {
      if (!updated.myAnswer.trim() || !updated.correctAnswer.trim()) {
        toast.error("请填写我的答案和正确答案");
        return;
      }
    }

    updateMistake(updated);
    toast.success("已保存修改");
    router.refresh();
  }

  function handleDelete() {
    if (!confirm("确定删除这条记录？此操作不可恢复。")) return;
    deleteMistake(id);
    toast.success("已删除");
    router.push("/mistakes");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 px-6 py-8 md:px-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/mistakes" />}>
          <ArrowLeftIcon />
          返回错题本
        </Button>
        <div className="flex gap-2">
          <Badge variant="secondary">
            {IELTS_SECTION_LABELS[record.section]}
          </Badge>
          <Badge variant="outline">{isVocab ? "生词笔记" : "错题"}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isVocab ? "话题与生词" : "题目与答案"}</CardTitle>
          <CardDescription>
            创建于 {new Date(record.createdAt).toLocaleString("zh-CN")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label>科目</Label>
            <Select
              value={record.section}
              onValueChange={(value) =>
                updateField("section", value as IeltsSection)
              }
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IELTS_SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {IELTS_SECTION_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isVocab ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="topic">话题</Label>
                <Input
                  id="topic"
                  value={record.topic ?? ""}
                  onChange={(e) => updateField("topic", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">备注</Label>
                <Textarea
                  id="note"
                  value={record.questionText}
                  onChange={(e) => updateField("questionText", e.target.value)}
                  className="min-h-24"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="questionText">题目 / 题源</Label>
                <Textarea
                  id="questionText"
                  value={record.questionText}
                  onChange={(e) => updateField("questionText", e.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="myAnswer">我的答案</Label>
                  <Textarea
                    id="myAnswer"
                    value={record.myAnswer}
                    onChange={(e) => updateField("myAnswer", e.target.value)}
                    className="min-h-20"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="correctAnswer">正确答案</Label>
                  <Textarea
                    id="correctAnswer"
                    value={record.correctAnswer}
                    onChange={(e) =>
                      updateField("correctAnswer", e.target.value)
                    }
                    className="min-h-20"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="errorReason">错因</Label>
                  <Input
                    id="errorReason"
                    value={record.errorReason}
                    onChange={(e) => updateField("errorReason", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="knowledgePoint">知识点</Label>
                  <Input
                    id="knowledgePoint"
                    value={record.knowledgePoint}
                    onChange={(e) =>
                      updateField("knowledgePoint", e.target.value)
                    }
                  />
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAutoClassify}>
                智能识别错因 / 知识点
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TagsIcon className="size-4 text-brand" />
            生词
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {vocabularies.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-border p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">生词 {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeVocabularyRow(item.id)}
                >
                  <Trash2Icon />
                </Button>
              </div>
              <Input
                placeholder="单词"
                value={item.word}
                onChange={(e) => updateVocabulary(item.id, "word", e.target.value)}
              />
              <Input
                placeholder="释义"
                value={item.definition}
                onChange={(e) =>
                  updateVocabulary(item.id, "definition", e.target.value)
                }
              />
              <Input
                placeholder="Tag（逗号分隔）"
                value={item.tagText}
                onChange={(e) =>
                  updateVocabulary(item.id, "tagText", e.target.value)
                }
              />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addVocabularyRow}>
            <PlusIcon />
            添加生词
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          <SaveIcon />
          保存修改
        </Button>
        <Button type="button" variant="destructive" onClick={handleDelete}>
          <Trash2Icon />
          删除
        </Button>
      </div>
    </form>
  );
}
