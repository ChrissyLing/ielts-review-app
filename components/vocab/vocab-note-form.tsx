"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  PlusIcon,
  RotateCcwIcon,
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
import { Textarea } from "@/components/ui/textarea";
import { addMistake, createClientId } from "@/lib/mistake-storage";
import {
  IELTS_SECTION_LABELS,
  type IeltsSection,
  type MistakeRecord,
  type VocabularyEntry,
} from "@/types/mistake";

type VocabularyDraft = VocabularyEntry & { tagText: string };

type Props = {
  section: Extract<IeltsSection, "writing" | "speaking">;
};

const TOPIC_PLACEHOLDER: Record<Props["section"], string> = {
  writing: "如：Task 2 - Environment / 雅思大作文 高频论点词",
  speaking: "如：Part 2 - Hometown / Part 3 - Technology",
};

const TAG_HINT: Record<Props["section"], string> = {
  writing: "逗号分隔，如：Task 2, 高分论据, 环保话题",
  speaking: "逗号分隔，如：Part 2, 形容词, 描述地点",
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

export function VocabNoteForm({ section }: Props) {
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [vocabularies, setVocabularies] = useState<VocabularyDraft[]>([
    createVocabularyDraft(),
  ]);

  const completedCount = useMemo(
    () => vocabularies.filter((item) => item.word.trim()).length,
    [vocabularies],
  );

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
    setTopic("");
    setNote("");
    setVocabularies([createVocabularyDraft()]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic.trim()) {
      toast.error("请填写话题 / 主题，方便后续按场景检索");
      return;
    }

    const cleaned: VocabularyEntry[] = vocabularies
      .map((item) => ({
        id: item.id,
        word: item.word.trim(),
        definition: item.definition.trim(),
        tags: splitTags(item.tagText),
      }))
      .filter(
        (item) => item.word || item.definition || item.tags.length > 0,
      );

    if (cleaned.length === 0) {
      toast.error("至少需要记录一个生词或表达");
      return;
    }

    const now = new Date().toISOString();
    const record: MistakeRecord = {
      id: createClientId("vocab-note"),
      kind: "vocab",
      section,
      topic: topic.trim(),
      questionText: note.trim() || topic.trim(),
      myAnswer: "",
      correctAnswer: "",
      vocabularies: cleaned,
      knowledgePoint: "",
      errorReason: "",
      createdAt: now,
      updatedAt: now,
    };

    addMistake(record);
    toast.success(`已保存 ${cleaned.length} 个生词`, {
      description: `${IELTS_SECTION_LABELS[section]} · ${topic.trim()}`,
    });
    resetForm();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {IELTS_SECTION_LABELS[section]}生词笔记
            </CardTitle>
            <CardDescription>
              不需要题号 / 答案，只记录这一话题下值得复习的单词与表达。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="vocab-topic">话题 / 主题</Label>
              <Input
                id="vocab-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder={TOPIC_PLACEHOLDER[section]}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vocab-note">备注（可选）</Label>
              <Textarea
                id="vocab-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-28"
                placeholder="可写一句话总结这组词的使用场景、范文出处等。"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>生词 / 表达</CardTitle>
                <CardDescription>
                  支持多个条目，回顾页会自动按话题聚合。
                </CardDescription>
              </div>
              <Badge variant="secondary">{completedCount} 个</Badge>
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
                    第 {index + 1} 条
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="删除条目"
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
                      placeholder="如：alleviate / a double-edged sword"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${item.id}-definition`}>释义 / 用法</Label>
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
                      placeholder="如：缓解 / 双刃剑（常用于讨论科技、社交媒体）"
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
                      placeholder={TAG_HINT[section]}
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
              再加一个
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
            保存笔记
          </Button>
        </div>
      </div>
    </form>
  );
}
