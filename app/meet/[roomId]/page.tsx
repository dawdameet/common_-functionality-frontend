import { MeetingRoom } from "@/components/meet/MeetingRoom";

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = await params;
  return <MeetingRoom roomId={resolvedParams.roomId} />;
}
