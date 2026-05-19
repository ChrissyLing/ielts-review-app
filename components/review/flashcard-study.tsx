"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  BrainIcon,
  CheckCircle2Icon,
  RotateCcwIcon,
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
import { Skeleton } from "@/components/ui/skeleton";
import { buildFlashcardsFromRecords } from "@/lib/flashcards";
import {
  formatNextReview,
  isDue,
  scheduleNext,
} from "@/lib/review-scheduler";
import {
  getReviewProgress,
  upsertReviewProgress,
} from "@/lib/review-progress-storage";
import { useMistakes } from "@/lib/use-mistakes";
import { useReviewProgress } from "@/lib/use-review-progress";
import { IELTS_SECTION_LABELS, type IeltsSection } from "@/types/mistake";
import type { Flashcard, ReviewRating } from "@/types/review";

type StudyMode = "due" | "all";

export function FlashcardStudy() {
  const { mistakes, hydrated: mistakesHydrated } = useMistakes();
  const { progressMap, hydrated: progressHydrated } = useReviewProgress();
  const [mode, setMode] = useState<StudyMode>("due");
  const [flipped, setFlipped] = useState(false);
  const [index, setIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);

  const allCards = useMemo(
    () => buildFlashcardsFromRecords(mistakes),
    [mistakes],
  );

  const queue = useMemo(() => {
    const list =
      mode === "due"
        ? allCards.filter((card) => {
            const progress = progressMap[card.id] ?? getReviewProgress(card.id);
            return isDue(progress);
          })
        : [...allCards];

    return list.sort((a, b) => {
      const pa = progressMap[a.id] ?? getReviewProgress(a.id);
      const pb = progressMap[b.id] ?? getReviewProgress(b.id);
      return (
        new Date(pa.nextReviewAt).getTime() - new Date(pb.nextReviewAt).getTime()
      );
    });
  }, [allCards, mode, progressMap]);

  const dueCount = useMemo(
    () =>
      allCards.filter((card) => {
        const progress = progressMap[card.id] ?? getReviewProgress(card.id);
        return isDue(progress);
      }).length,
    [allCards, progressMap],
  );

  const hydrated = mistakesHydrated && progressHydrated;
  const current = queue[index];

  function handleRating(rating: ReviewRating) {
    if (!current) return;
    const prev = progressMap[current.id] ?? getReviewProgress(current.id);
    const next = scheduleNext(prev, rating);
    upsertReviewProgress(next);
    setFlipped(false);
    setSessionDone((n) => n + 1);
    if (index < queue.length - 1) {
      setIndex((i) => i + 1);
    } else {
      toast.success("本轮复习完成", {
        description: `共复习 ${sessionDone + 1} 张卡片`,
      });
      setIndex(0);
    }
  }

  if (!hydrated) return <StudySkeleton />;

  if (allCards.length === 0) {
    return (
      <section className="px-6 py-8 md:px-10">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>还没有可复习的卡片</CardTitle>
            <CardDescription>
              先录入错题或生词，系统会自动生成闪卡。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/mistakes/new"
              className="text-sm text-brand hover:underline"
            >
              去录入
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/review" />}>
          <ArrowLeftIcon />
          返回汇总
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === "due" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("due");
              setIndex(0);
              setFlipped(false);
            }}
          >
            今日待复习 ({dueCount})
          </Button>
          <Button
            type="button"
            variant={mode === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("all");
              setIndex(0);
              setFlipped(false);
            }}
          >
            全部卡片 ({allCards.length})
          </Button>
        </div>
      </div>

      {queue.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle2Icon className="size-10 text-brand" />
            <p className="font-medium">今日复习已完成</p>
            <p className="text-sm text-muted-foreground">
              没有到期的卡片了。可以切换到「全部卡片」提前预习。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {index + 1} / {queue.length}
              {sessionDone > 0 ? ` · 本轮已复习 ${sessionDone}` : ""}
            </span>
            {current ? (
              <span>
                下次：
                {formatNextReview(
                  (progressMap[current.id] ?? getReviewProgress(current.id))
                    .nextReviewAt,
                )}
              </span>
            ) : null}
          </div>

          {current ? (
            <FlashcardPane
              card={current}
              flipped={flipped}
              onFlip={() => setFlipped((f) => !f)}
            />
          ) : null}

          {flipped ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <RatingButton
                label="忘了"
                hint="1 天后"
                variant="destructive"
                onClick={() => handleRating("again")}
              />
              <RatingButton
                label="模糊"
                hint="短间隔"
                variant="outline"
                onClick={() => handleRating("hard")}
              />
              <RatingButton
                label="记得"
                hint="正常间隔"
                onClick={() => handleRating("good")}
              />
              <RatingButton
                label="简单"
                hint="长间隔"
                variant="secondary"
                onClick={() => handleRating("easy")}
              />
            </div>
          ) : (
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={() => setFlipped(true)}
            >
              <BrainIcon />
              显示答案
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function FlashcardPane({
  card,
  flipped,
  onFlip,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
}) {
  const sectionLabel =
    IELTS_SECTION_LABELS[card.section as IeltsSection] ?? card.section;

  return (
    <button
      type="button"
      onClick={onFlip}
      className="w-full rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="min-h-[280px] transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {sectionLabel}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {card.type === "mistake" ? "错题" : "生词"}
            </Badge>
          </div>
          <CardTitle className="text-lg">
            {flipped ? card.backTitle : card.frontTitle}
          </CardTitle>
          {!flipped ? (
            <CardDescription>点击卡片或下方按钮查看答案</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {flipped ? card.backBody : card.frontBody}
          </p>
          {flipped && card.meta ? (
            <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
              {card.meta}
            </p>
          ) : null}
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <RotateCcwIcon className="size-3" />
            点击翻转
          </p>
        </CardContent>
      </Card>
    </button>
  );
}

function RatingButton({
  label,
  hint,
  variant = "default",
  onClick,
}: {
  label: string;
  hint: string;
  variant?: "default" | "outline" | "secondary" | "destructive";
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className="h-auto flex-col py-3"
      onClick={onClick}
    >
      <span className="font-semibold">{label}</span>
      <span className="text-[10px] font-normal opacity-80">{hint}</span>
    </Button>
  );
}

function StudySkeleton() {
  return (
    <div className="space-y-6 px-6 py-8 md:px-10">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}
