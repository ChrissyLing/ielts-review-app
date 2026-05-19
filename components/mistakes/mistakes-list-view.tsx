"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRightIcon,
  FilterXIcon,
  SearchIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteMistake } from "@/lib/mistake-storage";
import { useMistakes } from "@/lib/use-mistakes";
import {
  IELTS_SECTION_LABELS,
  getMistakeKind,
  type IeltsSection,
  type MistakeRecord,
} from "@/types/mistake";

type SectionFilter = "all" | IeltsSection;
type DateFilter = "all" | "7d" | "30d";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function matchesDate(m: MistakeRecord, filter: DateFilter) {
  if (filter === "all") return true;
  const created = new Date(m.createdAt).getTime();
  const now = Date.now();
  const days = filter === "7d" ? 7 : 30;
  return now - created <= days * 24 * 60 * 60 * 1000;
}

export function MistakesListView() {
  const { mistakes: allRecords, hydrated } = useMistakes();
  const mistakes = useMemo(
    () => allRecords.filter((m) => getMistakeKind(m) === "mistake"),
    [allRecords],
  );
  const [keyword, setKeyword] = useState("");
  const [section, setSection] = useState<SectionFilter>("all");
  const [knowledge, setKnowledge] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateFilter>("all");

  const knowledgeTags = useMemo(() => {
    const counter = new Map<string, number>();
    for (const m of mistakes) {
      if (!m.knowledgePoint) continue;
      counter.set(m.knowledgePoint, (counter.get(m.knowledgePoint) ?? 0) + 1);
    }
    return Array.from(counter.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }));
  }, [mistakes]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return mistakes.filter((m) => {
      if (section !== "all" && m.section !== section) return false;
      if (knowledge && m.knowledgePoint !== knowledge) return false;
      if (!matchesDate(m, dateRange)) return false;
      if (!kw) return true;
      const haystack = [
        m.questionText,
        m.myAnswer,
        m.correctAnswer,
        m.errorReason,
        m.knowledgePoint,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(kw);
    });
  }, [mistakes, keyword, section, knowledge, dateRange]);

  const hasActiveFilter =
    keyword.trim() !== "" ||
    section !== "all" ||
    knowledge !== null ||
    dateRange !== "all";

  function resetFilters() {
    setKeyword("");
    setSection("all");
    setKnowledge(null);
    setDateRange("all");
  }

  function handleDelete(id: string, label: string) {
    deleteMistake(id);
    toast.success("已删除", { description: label });
  }

  if (!hydrated) return <ListSkeleton />;

  if (mistakes.length === 0) {
    return (
      <section className="px-6 py-8 md:px-10">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>错题本还是空的</CardTitle>
            <CardDescription>
              录入第一道题后，这里会展示卡片列表，并支持筛选与搜索。
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

  return (
    <div className="space-y-5 px-6 py-8 md:px-10">
      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索题目、答案、错因、知识点..."
                className="pl-9"
              />
            </div>
            <Select
              value={section}
              onValueChange={(value) => setSection(value as SectionFilter)}
            >
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="全部科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部科目</SelectItem>
                <SelectItem value="listening">
                  {IELTS_SECTION_LABELS.listening}
                </SelectItem>
                <SelectItem value="reading">
                  {IELTS_SECTION_LABELS.reading}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={dateRange}
              onValueChange={(value) => setDateRange(value as DateFilter)}
            >
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="全部时间" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="7d">最近 7 天</SelectItem>
                <SelectItem value="30d">最近 30 天</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilter ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                <FilterXIcon />
                清除筛选
              </Button>
            ) : null}
          </div>

          {knowledgeTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">知识点：</span>
              {knowledgeTags.map(({ label, count }) => {
                const active = knowledge === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setKnowledge(active ? null : label)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {label}
                    <span className="ml-1 tabular-nums opacity-70">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          共 <span className="font-semibold text-foreground">{filtered.length}</span> 条
          {hasActiveFilter ? ` / 总计 ${mistakes.length}` : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            没有命中筛选条件的错题，试试调整关键词或重置筛选。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((m) => (
            <MistakeCard key={m.id} mistake={m} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function MistakeCard({
  mistake,
  onDelete,
}: {
  mistake: MistakeRecord;
  onDelete: (id: string, label: string) => void;
}) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {IELTS_SECTION_LABELS[mistake.section]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(mistake.createdAt)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="删除错题"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onDelete(mistake.id, mistake.questionText || "错题")}
          >
            <Trash2Icon />
          </Button>
        </div>

        <Link
          href={`/mistakes/${mistake.id}`}
          className="block space-y-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
        <div className="line-clamp-2 text-sm font-medium leading-snug">
          {mistake.questionText || "（未填题目原文）"}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-rose-50 px-2 py-0.5 font-mono text-xs text-rose-700">
            {mistake.myAnswer}
          </span>
          <ArrowRightIcon className="size-3 text-muted-foreground" />
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs text-emerald-700">
            {mistake.correctAnswer}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {mistake.errorReason ? (
            <Badge variant="outline" className="font-normal">
              错因 · {mistake.errorReason}
            </Badge>
          ) : null}
          {mistake.knowledgePoint ? (
            <Badge variant="outline" className="font-normal">
              知识点 · {mistake.knowledgePoint}
            </Badge>
          ) : null}
          {mistake.vocabularies.length > 0 ? (
            <Badge variant="outline" className="font-normal">
              生词 · {mistake.vocabularies.length}
            </Badge>
          ) : null}
        </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-5 px-6 py-8 md:px-10">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
