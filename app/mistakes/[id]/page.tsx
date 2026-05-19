import { PageHeader } from "@/components/layout/page-header";
import { MistakeDetailView } from "@/components/mistakes/mistake-detail-view";

type Props = {
  params: { id: string };
};

export default function MistakeDetailPage({ params }: Props) {
  return (
    <>
      <PageHeader title="错题详情" description="查看并编辑这条记录" />
      <MistakeDetailView id={params.id} />
    </>
  );
}
