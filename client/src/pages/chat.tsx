import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { ChatHeader } from "@/components/chat/chat-header";
import type { Chat } from "@shared/schema";

export default function ChatPage() {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to user's chats
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Chat[];
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const selectedChat = chats.find(chat => chat.id === selectedChatId);

  return (
    <div className="flex h-screen w-full bg-background">
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        loading={loading}
      />
      
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <ChatHeader chat={selectedChat} />
            <ChatWindow chat={selectedChat} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-6xl opacity-20">💬</div>
              <h3 className="text-xl font-semibold text-foreground">
                Select a conversation
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a chat from the sidebar to start messaging securely
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
