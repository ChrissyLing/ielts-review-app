import Link from "next/link";
import { PlusCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MistakesListView } from "@/components/mistakes/mistakes-list-view";
import { PageHeader } from "@/components/layout/page-header";

export default function MistakesPage() {
  return (
    <>
      <PageHeader
        title="错题本"
        description="按科目、知识点、日期、关键词进行筛选和搜索"
        actions={
          <Button render={<Link href="/mistakes/new" />}>
            <PlusCircleIcon />
            录入错题
          </Button>
        }
      />
      <MistakesListView />
    </>
  );
}
