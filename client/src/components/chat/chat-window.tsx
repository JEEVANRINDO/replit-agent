import { useState, useEffect, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Chat, DecryptedMessage } from "@shared/schema";

interface ChatWindowProps {
  chat: Chat;
}

export function ChatWindow({ chat }: ChatWindowProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chat.id) return;

    // Listen to messages in this chat
    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chat.id),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as DecryptedMessage[];
      
      setMessages(messageList);
      setLoading(false);

      // Scroll to bottom on new messages
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [chat.id]);

  const handleSendMessage = async (text: string) => {
    if (!currentUser || !text.trim()) return;

    const recipientId = chat.participants.find(p => p !== currentUser.uid);
    if (!recipientId) return;

    // For now, store unencrypted (will be encrypted in Task 2)
    const newMessage: Omit<DecryptedMessage, "id"> = {
      chatId: chat.id,
      senderId: currentUser.uid,
      recipientId,
      text: text.trim(),
      timestamp: Date.now(),
    };

    await addDoc(collection(db, "messages"), newMessage);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="space-y-2">
                  <Skeleton className="h-16 w-64 rounded-2xl" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="text-4xl opacity-20">🔒</div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Start the conversation. All messages are end-to-end encrypted.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;
              const isSameSender = prevMessage && prevMessage.senderId === message.senderId;
              
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === currentUser?.uid}
                  showAvatar={showAvatar}
                  isGrouped={isSameSender}
                />
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
