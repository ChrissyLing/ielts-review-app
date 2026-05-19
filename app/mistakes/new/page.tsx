import Link from "next/link";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EntryRouter } from "@/components/mistakes/entry-router";

export default function NewMistakePage() {
  return (
    <>
      <PageHeader
        title="录入"
        description="听力 / 阅读上传截图自动识别错题；写作 / 口语只记素材生词。"
        actions={
          <Button variant="outline" render={<Link href="/mistakes/new/manual" />}>
            <PencilIcon />
            手动录入单题
          </Button>
        }
      />

      <section className="px-6 py-8 md:px-10">
        <EntryRouter />
      </section>
    </>
  );
}
