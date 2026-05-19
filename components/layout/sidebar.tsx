"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NAV_ITEMS } from "./nav-items";

type SidebarProps = {
  className?: string;
  /** Called after a nav item is selected (used by the mobile Sheet to auto-close). */
  onNavigate?: () => void;
};

function isItemActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
          <BookOpenCheckIcon className="size-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            IELTS 错题本
          </span>
          <span className="text-[11px] text-muted-foreground">
            Mistake & Vocab Manager
          </span>
        </div>
      </div>

      <Separator className="opacity-60" />

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
          <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            学习中心
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    active
                      ? "text-brand-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium leading-tight">
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 truncate text-[11px] leading-tight",
                      active
                        ? "text-brand-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-brand-soft p-3">
          <p className="text-xs font-medium text-foreground">小贴士</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            坚持每天复盘 3 道错题 + 10 个生词，
            <br />
            两周后你会感谢现在的自己。
          </p>
        </div>
      </div>
    </aside>
  );
}
