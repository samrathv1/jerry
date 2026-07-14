import { ChatShell } from "@/components/chat/chat-shell";

export const metadata = {
  title: "Jerry | Chat",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ChatShell conversationId={conversationId} />;
}
