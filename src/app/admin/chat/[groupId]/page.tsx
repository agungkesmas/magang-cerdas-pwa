import ChatRoom from '@/components/chat/ChatRoom';

export default function AdminChatRoomPage({ params }: { params: { groupId: string } }) {
  return <ChatRoom groupId={params.groupId} userRole="admin" backHref="/admin/chat" />;
}
