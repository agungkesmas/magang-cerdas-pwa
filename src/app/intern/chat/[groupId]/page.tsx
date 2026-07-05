import ChatRoom from '@/components/chat/ChatRoom';

export default function InternChatRoomPage({ params }: { params: { groupId: string } }) {
  return <ChatRoom groupId={params.groupId} userRole="peserta" backHref="/intern/chat" />;
}
