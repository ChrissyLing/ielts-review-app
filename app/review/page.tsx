import { PageHeader } from "@/components/layout/page-header";
import { ReviewView } from "@/components/review/review-view";

export default function ReviewPage() {
  return (
    <>
      <PageHeader
        title="生词与知识点"
        description="聚合所有错题中的生词与知识点，点击可反向定位到来源题目"
      />
      <ReviewView />
    </>
  );
}
