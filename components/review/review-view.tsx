"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BrainIcon,
  FilterXIcon,
  LayersIcon,
  LightbulbIcon,
  SearchIcon,
  TagsIcon,
} from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { buildFlashcardsFromRecords } from "@/lib/flashcards";
import { isDue } from "@/lib/review-scheduler";
import { getReviewProgress } from "@/lib/review-progress-storage";
import { useMistakes } from "@/lib/use-mistakes";
import { useReviewProgress } from "@/lib/use-review-progress";
import {
  IELTS_SECTION_LABELS,
  getMistakeKind,
  type MistakeKind,
  type MistakeRecord,
  type VocabularyEntry,
} from "@/types/mistake";

type SourceMistake = Pick<
  MistakeRecord,
  | "id"
  | "section"
  | "questionText"
  | "myAnswer"
  | "correctAnswer"
  | "errorReason"
  | "knowledgePoint"
  | "createdAt"
  | "topic"
> & { kind: MistakeKind };

type VocabularyReviewItem = {
  key: string;
  word: string;
  definitions: string[];
  tags: string[];
  sources: Array<{
    mistake: SourceMistake;
    vocabulary: VocabularyEntry;
  }>;
};

type LabelReviewItem = {
  key: string;
  label: string;
  sources: SourceMistake[];
};

function normalizeKey(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sourceFromMistake(mistake: MistakeRecord): SourceMistake {
  return {
    id: mistake.id,
    section: mistake.section,
    questionText: mistake.questionText,
    myAnswer: mistake.myAnswer,
    correctAnswer: mistake.correctAnswer,
    errorReason: mistake.errorReason,
    knowledgePoint: mistake.knowledgePoint,
    createdAt: mistake.createdAt,
    topic: mistake.topic,
    kind: getMistakeKind(mistake),
  };
}

function buildVocabularyItems(mistakes: MistakeRecord[]): VocabularyReviewItem[] {
  const map = new Map<string, VocabularyReviewItem>();

  for (const mistake of mistakes) {
    for (const vocabulary of mistake.vocabularies) {
      const word = vocabulary.word.trim();
      const definition = vocabulary.definition.trim();
      const tags = vocabulary.tags.map((tag) => tag.trim()).filter(Boolean);
      if (!word && !definition && tags.length === 0) continue;

      const key = normalizeKey(word || definition || tags.join(","));
      const existing =
        map.get(key) ??
        ({
          key,
          word: word || "（未命名单词）",
          definitions: [],
          tags: [],
          sources: [],
        } satisfies VocabularyReviewItem);

      if (definition) existing.definitions = unique([...existing.definitions, definition]);
      existing.tags = unique([...existing.tags, ...tags]);
      existing.sources.push({ mistake: sourceFromMistake(mistake), vocabulary });
      map.set(key, existing);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.sources.length - a.sources.length || a.word.localeCompare(b.word),
  );
}

function buildLabelItems(
  mistakes: MistakeRecord[],
  field: "knowledgePoint" | "errorReason",
): LabelReviewItem[] {
  const map = new Map<string, LabelReviewItem>();

  for (const mistake of mistakes) {
    const label = mistake[field].trim();
    if (!label || label === "（待补充）") continue;
    const key = normalizeKey(label);
    const existing =
      map.get(key) ??
      ({
        key,
        label,
        sources: [],
      } satisfies LabelReviewItem);
    existing.sources.push(sourceFromMistake(mistake));
    map.set(key, existing);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.sources.length - a.sources.length || a.label.localeCompare(b.label),
  );
}

function matchesQuery(item: VocabularyReviewItem | LabelReviewItem, query: string) {
  const q = normalizeKey(query);
  if (!q) return true;

  if ("word" in item) {
    const haystack = [
      item.word,
      ...item.definitions,
      ...item.tags,
      ...item.sources.flatMap(({ mistake }) => [
        mistake.questionText,
        mistake.myAnswer,
        mistake.correctAnswer,
        mistake.errorReason,
        mistake.knowledgePoint,
      ]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  }

  const haystack = [
    item.label,
    ...item.sources.flatMap((mistake) => [
      mistake.questionText,
      mistake.myAnswer,
      mistake.correctAnswer,
      mistake.errorReason,
      mistake.knowledgePoint,
    ]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function ReviewView() {
  const { mistakes, hydrated } = useMistakes();
  const { progressMap, hydrated: progressHydrated } = useReviewProgress();
  const [query, setQuery] = useState("");

  const dueCardCount = useMemo(() => {
    const cards = buildFlashcardsFromRecords(mistakes);
    return cards.filter((card) => {
      const progress = progressMap[card.id] ?? getReviewProgress(card.id);
      return isDue(progress);
    }).length;
  }, [mistakes, progressMap]);

  const reviewData = useMemo(() => {
    const vocabularyItems = buildVocabularyItems(mistakes);
    const knowledgeItems = buildLabelItems(mistakes, "knowledgePoint");
    const reasonItems = buildLabelItems(mistakes, "errorReason");

    return {
      vocabularyItems,
      knowledgeItems,
      reasonItems,
      vocabularyCount: vocabularyItems.length,
      knowledgeCount: knowledgeItems.length,
      reasonCount: reasonItems.length,
      sourceCount: mistakes.length,
    };
  }, [mistakes]);

  const filteredVocabulary = reviewData.vocabularyItems.filter((item) =>
    matchesQuery(item, query),
  );
  const filteredKnowledge = reviewData.knowledgeItems.filter((item) =>
    matchesQuery(item, query),
  );
  const filteredReasons = reviewData.reasonItems.filter((item) =>
    matchesQuery(item, query),
  );

  if (!hydrated || !progressHydrated) return <ReviewSkeleton />;

  if (mistakes.length === 0) {
    return (
      <section className="px-6 py-8 md:px-10">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>还没有可复习内容</CardTitle>
            <CardDescription>
              先上传截图或录入错题，这里会自动汇总生词、知识点和错因。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/mistakes/new"
              className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
            >
              去智能录入 <ArrowRightIcon className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8 md:px-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpenIcon className="size-4" />}
          label="生词 / 短语"
          value={reviewData.vocabularyCount}
        />
        <StatCard
          icon={<LightbulbIcon className="size-4" />}
          label="知识点"
          value={reviewData.knowledgeCount}
        />
        <StatCard
          icon={<TagsIcon className="size-4" />}
          label="错因标签"
          value={reviewData.reasonCount}
        />
        <StatCard
          icon={<LayersIcon className="size-4" />}
          label="来源错题"
          value={reviewData.sourceCount}
        />
      </div>

      <Card className="border-brand/30 bg-brand-soft/40">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <BrainIcon className="size-4 text-brand" />
              闪卡复习
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              今日待复习 <strong className="text-foreground">{dueCardCount}</strong> 张
              · 间隔重复（1 → 3 → 7 → 14 → 30 天）
            </p>
          </div>
          <Button render={<Link href="/review/study" />}>
            开始复习
            <ArrowRightIcon />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索单词、释义、标签、知识点、答案或来源题目..."
              className="pl-9"
            />
          </div>
          {query.trim() ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setQuery("")}>
              <FilterXIcon />
              清除搜索
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="vocabulary">
        <TabsList>
          <TabsTrigger value="vocabulary">
            生词 <Badge variant="secondary">{filteredVocabulary.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            知识点 <Badge variant="secondary">{filteredKnowledge.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reasons">
            错因 <Badge variant="secondary">{filteredReasons.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vocabulary" className="mt-4">
          <VocabularyList items={filteredVocabulary} query={query} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-4">
          <LabelList
            items={filteredKnowledge}
            query={query}
            emptyText="暂无命中的知识点"
            badgePrefix="知识点"
          />
        </TabsContent>
        <TabsContent value="reasons" className="mt-4">
          <LabelList
            items={filteredReasons}
            query={query}
            emptyText="暂无命中的错因"
            badgePrefix="错因"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="grid size-7 place-items-center rounded-md bg-muted text-foreground">
            {icon}
          </span>
        </div>
        <div className="font-heading text-3xl font-semibold tabular-nums">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function VocabularyList({
  items,
  query,
}: {
  items: VocabularyReviewItem[];
  query: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyList
        text={query.trim() ? "暂无命中的生词" : "还没有记录生词"}
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <Card key={item.key}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">{item.word}</h3>
                {item.definitions.length > 0 ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {item.definitions.join(" / ")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">暂无释义</p>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0">
                {item.sources.length} 题
              </Badge>
            </div>

            {item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            <SourceDetails
              summary={`查看 ${item.sources.length} 个来源题目`}
              sources={item.sources.map(({ mistake }) => mistake)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LabelList({
  items,
  query,
  emptyText,
  badgePrefix,
}: {
  items: LabelReviewItem[];
  query: string;
  emptyText: string;
  badgePrefix: string;
}) {
  if (items.length === 0) {
    return <EmptyList text={query.trim() ? emptyText : "暂无数据"} />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <Card key={item.key}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge variant="outline" className="mb-2 font-normal">
                  {badgePrefix}
                </Badge>
                <h3 className="truncate text-base font-semibold">{item.label}</h3>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {item.sources.length} 题
              </Badge>
            </div>
            <SourceDetails
              summary={`查看 ${item.sources.length} 个来源题目`}
              sources={item.sources}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SourceDetails({
  summary,
  sources,
}: {
  summary: string;
  sources: SourceMistake[];
}) {
  return (
    <details className="group rounded-lg border border-border bg-muted/20">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-brand marker:text-muted-foreground">
        {summary}
      </summary>
      <div className="space-y-2 border-t border-border p-3">
        {sources.map((source) => {
          const isVocab = source.kind === "vocab";
          return (
            <div key={source.id} className="rounded-lg bg-background/80 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="font-normal">
                  {IELTS_SECTION_LABELS[source.section]}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {isVocab ? "生词笔记" : "错题"}
                </Badge>
                <span>{formatDate(source.createdAt)}</span>
                {!isVocab && source.errorReason ? (
                  <span>错因：{source.errorReason}</span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-sm font-medium">
                {isVocab
                  ? source.topic || source.questionText || "（未填话题）"
                  : source.questionText || "（未填题目原文）"}
              </p>
              {!isVocab ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-rose-50 px-2 py-0.5 font-mono text-rose-700">
                    {source.myAnswer}
                  </span>
                  <ArrowRightIcon className="size-3 text-muted-foreground" />
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-emerald-700">
                    {source.correctAnswer}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </details>
  );
}

function EmptyList({ text }: { text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}

function ReviewSkeleton() {
  return (
    <div className="space-y-6 px-6 py-8 md:px-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
