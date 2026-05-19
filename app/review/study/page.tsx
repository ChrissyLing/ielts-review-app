import { PageHeader } from "@/components/layout/page-header";
import { FlashcardStudy } from "@/components/review/flashcard-study";

export default function FlashcardStudyPage() {
  return (
    <>
      <PageHeader
        title="闪卡复习"
        description="根据艾宾浩斯间隔重复，复习错题与生词"
      />
      <FlashcardStudy />
    </>
  );
}
