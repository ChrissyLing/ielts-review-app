import { PageHeader } from "@/components/layout/page-header";
import { DataBackupPanel } from "@/components/settings/data-backup-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="数据管理"
        description="导出 / 导入 JSON 备份，防止浏览器清缓存后数据丢失"
      />
      <DataBackupPanel />
    </>
  );
}
