import type { LucideIcon } from "lucide-react";
import {
  BrainIcon,
  LayoutDashboardIcon,
  NotebookPenIcon,
  PlusCircleIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  /** Exact match (default false → matches by prefix, ignoring trailing slash). */
  exact?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "仪表盘",
    href: "/dashboard",
    description: "总错题数 · 各科占比 · 生词量",
    icon: LayoutDashboardIcon,
  },
  {
    title: "录入",
    href: "/mistakes/new",
    description: "听力/阅读截图 · 写作/口语生词",
    icon: PlusCircleIcon,
  },
  {
    title: "闪卡复习",
    href: "/review/study",
    description: "今日待复习 · 间隔重复",
    icon: BrainIcon,
  },
  {
    title: "错题本",
    href: "/mistakes",
    description: "按科目 · 标签 · 日期筛选",
    icon: NotebookPenIcon,
    exact: true,
  },
  {
    title: "生词与知识点",
    href: "/review",
    description: "聚合所有词与知识点，反向定位题目",
    icon: SparklesIcon,
    exact: true,
  },
  {
    title: "数据管理",
    href: "/settings",
    description: "JSON 备份与恢复",
    icon: SettingsIcon,
    exact: true,
  },
];
