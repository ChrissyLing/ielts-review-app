import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — fixed width */}
      <div className="sticky top-0 hidden h-screen w-60 shrink-0 md:block">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
