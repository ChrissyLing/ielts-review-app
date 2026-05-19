import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { MistakeForm } from "@/components/mistakes/mistake-form";

export default function ManualMistakePage() {
  return (
    <>
      <PageHeader
        title="手动录入单题"
        description="深度记录一道错题（含题目原文、生词、Tag）。如果只是想批量过截图，建议用智能录入。"
        actions={
          <Button variant="outline" render={<Link href="/mistakes/new" />}>
            <SparklesIcon />
            切回智能录入
          </Button>
        }
      />

      <section className="px-6 py-8 md:px-10">
        <MistakeForm />
      </section>
    </>
  );
}
