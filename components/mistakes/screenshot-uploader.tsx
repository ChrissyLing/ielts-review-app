"use client";

import { useRef, useState } from "react";
import {
  ImagePlusIcon,
  Loader2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VisionParsedRow = {
  questionNumber: string;
  myAnswer: string;
  correctAnswer: string;
  errorReason: string;
  knowledgePoint: string;
};

export type VisionParseResult = {
  source: string;
  section: string;
  rows: VisionParsedRow[];
};

type Props = {
  onResult: (result: VisionParseResult) => void;
};

export function ScreenshotUploader({ onResult }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastFileName, setLastFileName] = useState<string>("");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件（PNG / JPG / WebP）");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("图片过大（>8MB），请压缩后再试");
      return;
    }

    setBusy(true);
    setLastFileName(file.name);
    const fd = new FormData();
    fd.append("image", file);

    try {
      const resp = await fetch("/api/parse-mistake-image", {
        method: "POST",
        body: fd,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `HTTP ${resp.status}`,
        );
      }

      const result = data as VisionParseResult;
      const wrongCount = result.rows?.length ?? 0;

      if (wrongCount === 0) {
        toast.info("没识别到错题（也可能是模型判断全做对了）", {
          description: result.source ? `题源：${result.source}` : undefined,
        });
      } else {
        toast.success(`已从截图识别出 ${wrongCount} 道错题`, {
          description: result.source ? `题源：${result.source}` : undefined,
        });
      }
      onResult(result);
    } catch (err) {
      toast.error("识别失败", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-background/60 px-6 py-10 text-center transition-colors",
        dragOver ? "border-brand bg-brand-soft" : "border-border",
        busy && "opacity-90",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (busy) return;
        const file = event.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
    >
      {busy ? (
        <Loader2Icon className="mb-3 size-10 animate-spin text-brand" />
      ) : (
        <UploadCloudIcon className="mb-3 size-10 text-brand" />
      )}

      <p className="text-base font-semibold">
        {busy ? "豆包视觉识别中（约 20 秒）..." : "把错题截图拖到这里"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        或点击下方按钮选择文件 · 支持 PNG / JPG / WebP · 最大 8MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          if (event.target) event.target.value = "";
        }}
      />

      <Button
        type="button"
        className="mt-4"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <ImagePlusIcon />
        选择截图
      </Button>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <Badge variant="outline" className="font-normal">题号</Badge>
        <Badge variant="outline" className="font-normal">我的答案</Badge>
        <Badge variant="outline" className="font-normal">正确答案</Badge>
        <Badge variant="outline" className="font-normal">错因</Badge>
        <Badge variant="outline" className="font-normal">知识点</Badge>
        <span className="text-muted-foreground">全部自动识别</span>
      </div>

      {lastFileName ? (
        <p
          className="mt-3 max-w-full truncate text-[11px] text-muted-foreground"
          title={lastFileName}
        >
          上次：{lastFileName}
        </p>
      ) : null}
    </div>
  );
}
