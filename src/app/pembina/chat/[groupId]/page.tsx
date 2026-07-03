import ChatRoom from '@/components/chat/ChatRoom';

export default function PembinaChatRoomPage({ params }: { params: { groupId: string } }) {
  return <ChatRoom groupId={params.groupId} userRole="pembina" backHref="/pembina/chat" />;
}
