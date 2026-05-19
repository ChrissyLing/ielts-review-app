"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  LightbulbIcon,
  TargetIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMistakes } from "@/lib/use-mistakes";
import {
  IELTS_SECTIONS,
  IELTS_SECTION_LABELS,
  getMistakeKind,
  type IeltsSection,
} from "@/types/mistake";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return date.toLocaleDateString("zh-CN");
}

type Counter = Record<string, number>;

function topEntries(counter: Counter, n: number) {
  return Object.entries(counter)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n);
}

export function DashboardView() {
  const { mistakes: allRecords, hydrated } = useMistakes();
  const mistakes = useMemo(
    () => allRecords.filter((m) => getMistakeKind(m) === "mistake"),
    [allRecords],
  );

  const stats = useMemo(() => {
    const total = mistakes.length;
    const vocabCount = allRecords.reduce(
      (sum, m) => sum + m.vocabularies.length,
      0,
    );

    const sectionCounter: Record<IeltsSection, number> = {
      listening: 0,
      reading: 0,
      writing: 0,
      speaking: 0,
    };
    const reasonCounter: Counter = {};
    const knowledgeCounter: Counter = {};

    const weekStart = startOfWeek(new Date()).getTime();
    let thisWeek = 0;

    for (const m of mistakes) {
      sectionCounter[m.section] += 1;
      if (m.errorReason) reasonCounter[m.errorReason] = (reasonCounter[m.errorReason] ?? 0) + 1;
      if (m.knowledgePoint)
        knowledgeCounter[m.knowledgePoint] = (knowledgeCounter[m.knowledgePoint] ?? 0) + 1;
      if (new Date(m.createdAt).getTime() >= weekStart) thisWeek += 1;
    }

    return {
      total,
      vocabCount,
      sectionCounter,
      reasonCounter,
      knowledgeCounter,
      thisWeek,
      knowledgeTypes: Object.keys(knowledgeCounter).length,
    };
  }, [mistakes, allRecords]);

  if (!hydrated) return <DashboardSkeleton />;

  if (stats.total === 0 && stats.vocabCount === 0) return <EmptyState />;

  const sectionTotal = stats.total || 1;
  const topReasons = topEntries(stats.reasonCounter, 5);
  const topKnowledge = topEntries(stats.knowledgeCounter, 5);
  const recent = mistakes.slice(0, 5);

  return (
    <div className="space-y-6 px-6 py-8 md:px-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="总错题数"
          value={stats.total}
          icon={<TargetIcon className="size-4" />}
        />
        <StatCard
          label="本周新增"
          value={stats.thisWeek}
          icon={<CalendarDaysIcon className="size-4" />}
          hint={stats.thisWeek > 0 ? "保持节奏" : "本周还没记录"}
        />
        <StatCard
          label="生词总数"
          value={stats.vocabCount}
          icon={<BookOpenIcon className="size-4" />}
        />
        <StatCard
          label="知识点种类"
          value={stats.knowledgeTypes}
          icon={<LightbulbIcon className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>科目分布</CardTitle>
            <CardDescription>
              各科目错题占比，识别你的薄弱环节。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {IELTS_SECTIONS.filter(
              (section) => section === "listening" || section === "reading",
            ).map((section) => {
              const count = stats.sectionCounter[section];
              const pct = sectionTotal ? Math.round((count / sectionTotal) * 100) : 0;
              return (
                <div key={section}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {IELTS_SECTION_LABELS[section]}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {count} 道 · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近错题</CardTitle>
            <CardDescription>
              <Link
                href="/mistakes"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                查看全部 <ArrowRightIcon className="size-3.5" />
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-border bg-background/60 p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <Badge variant="secondary" className="font-normal">
                    {IELTS_SECTION_LABELS[m.section]}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatRelative(m.createdAt)}
                  </span>
                </div>
                <div className="line-clamp-1 text-sm font-medium">
                  {m.questionText || "（未填题目原文）"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-mono text-rose-600">{m.myAnswer}</span>
                  <ArrowRightIcon className="size-3" />
                  <span className="font-mono text-emerald-600">
                    {m.correctAnswer}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankCard
          title="高频错因 Top 5"
          description="收敛后的同义标签合并统计"
          entries={topReasons}
          total={stats.total}
          emptyText="暂无错因数据"
        />
        <RankCard
          title="高频知识点 Top 5"
          description="收敛后的同义标签合并统计"
          entries={topKnowledge}
          total={stats.total}
          emptyText="暂无知识点数据"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  hint?: string;
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
        {hint ? (
          <div className="text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RankCard({
  title,
  description,
  entries,
  total,
  emptyText,
}: {
  title: string;
  description: string;
  entries: Array<[string, number]>;
  total: number;
  emptyText: string;
}) {
  const max = entries[0]?.[1] ?? 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          entries.map(([label, count]) => {
            const pct = total ? Math.round((count / total) * 100) : 0;
            const barPct = Math.round((count / max) * 100);
            return (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{label}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand/80 transition-all"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <section className="px-6 py-8 md:px-10">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>还没有错题</CardTitle>
          <CardDescription>
            录入第一道题后，这里会自动生成统计图表与高频标签。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/mistakes/new"
            className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            去录入错题 <ArrowRightIcon className="size-3.5" />
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 px-6 py-8 md:px-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
