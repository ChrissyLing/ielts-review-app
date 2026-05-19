"use client";

import { useState } from "react";
import {
  BookOpenCheckIcon,
  HeadphonesIcon,
  MessageCircleIcon,
  PenLineIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { BatchImportForm } from "@/components/mistakes/batch-import-form";
import { VocabNoteForm } from "@/components/vocab/vocab-note-form";
import {
  IELTS_SECTION_LABELS,
  type IeltsSection,
} from "@/types/mistake";

type SectionTab = {
  value: IeltsSection;
  icon: LucideIcon;
  hint: string;
};

const TABS: SectionTab[] = [
  { value: "listening", icon: HeadphonesIcon, hint: "截图识别错题" },
  { value: "reading", icon: BookOpenCheckIcon, hint: "截图识别错题" },
  { value: "writing", icon: PenLineIcon, hint: "只记素材生词" },
  { value: "speaking", icon: MessageCircleIcon, hint: "只记话题生词" },
];

function isMistakeSection(
  section: IeltsSection,
): section is Extract<IeltsSection, "listening" | "reading"> {
  return section === "listening" || section === "reading";
}

export function EntryRouter() {
  const [section, setSection] = useState<IeltsSection>("listening");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.value === section;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSection(tab.value)}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all",
                active
                  ? "border-brand bg-brand-soft shadow-sm"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  active
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">
                  {IELTS_SECTION_LABELS[tab.value]}
                </span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">
                  {tab.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {isMistakeSection(section) ? (
        <BatchImportForm key={section} initialSection={section} />
      ) : (
        <VocabNoteForm key={section} section={section} />
      )}
    </div>
  );
}
