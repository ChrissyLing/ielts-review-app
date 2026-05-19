"use client";

import { useRef, useState } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clearReviewProgress } from "@/lib/review-progress-storage";
import {
  exportBackup,
  importBackup,
  type AppBackup,
} from "@/lib/mistake-storage";

export function DataBackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function handleExport() {
    const backup = exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ielts-review-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已导出备份文件");
  }

  async function handleImport(merge: boolean) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("请先选择 JSON 备份文件");
      return;
    }

    setBusy(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as AppBackup;
      if (!backup || backup.version !== 1 || !Array.isArray(backup.mistakes)) {
        throw new Error("备份格式不正确");
      }
      const result = importBackup(backup, { merge });
      toast.success(merge ? "已合并导入" : "已覆盖导入", {
        description: `${result.mistakes} 条记录 · ${result.progress} 条复习进度`,
      });
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error("导入失败", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  function handleClearProgress() {
    if (!confirm("确定清空所有闪卡复习进度？错题数据不会删除。")) return;
    clearReviewProgress();
    toast.success("复习进度已清空");
  }

  return (
    <div className="space-y-6 px-6 py-8 md:px-10">
      <Card>
        <CardHeader>
          <CardTitle>导出备份</CardTitle>
          <CardDescription>
            下载 JSON 文件，包含所有错题、生词笔记和闪卡复习进度。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={handleExport}>
            <DownloadIcon />
            下载 JSON 备份
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>导入备份</CardTitle>
          <CardDescription>
            从 JSON 文件恢复数据。合并模式会保留本地已有记录并覆盖同 ID 项。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void handleImport(true)}
            >
              <UploadIcon />
              合并导入
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (
                  !confirm(
                    "覆盖导入会替换当前所有错题数据，确定继续？",
                  )
                ) {
                  return;
                }
                void handleImport(false);
              }}
            >
              覆盖导入
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">高级</CardTitle>
          <CardDescription>仅清空闪卡复习进度，不影响错题记录。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={handleClearProgress}>
            清空复习进度
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
