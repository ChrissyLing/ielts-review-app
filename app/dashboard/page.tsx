import Link from "next/link";
import { PlusCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="仪表盘"
        description="一眼掌握你的错题分布与生词积累"
        actions={
          <Button render={<Link href="/mistakes/new" />}>
            <PlusCircleIcon />
            录入错题
          </Button>
        }
      />
      <DashboardView />
    </>
  );
}
