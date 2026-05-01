import { LiveStream } from "@/components/live-stream";

export const dynamic = "force-dynamic";

export default async function LivePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <LiveStream projectId={projectId} />;
}
