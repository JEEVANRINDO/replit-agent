import { useState, useEffect, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useCrypto } from "@/contexts/crypto-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  encryptMessage,
  decryptMessage,
  hasSession,
  buildSession,
} from "@/lib/crypto/signal-protocol";
import type { Chat, DecryptedMessage, Message, PrekeyBundle } from "@shared/schema";

interface ChatWindowProps {
  chat: Chat;
}

export function ChatWindow({ chat }: ChatWindowProps) {
  const { currentUser } = useAuth();
  const { initialized: cryptoInitialized } = useCrypto();
  const { toast } = useToast();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chat.id || !currentUser) return;

    // Listen to encrypted messages in this chat
    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chat.id),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const encryptedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      
      // Decrypt messages
      const decryptedMessages: DecryptedMessage[] = [];
      for (const msg of encryptedMessages) {
        try {
          const plaintext = await decryptMessage(
            currentUser.uid,
            msg.senderId,
            msg.type,
            msg.body
          );
          
          decryptedMessages.push({
            id: msg.id,
            chatId: msg.chatId,
            senderId: msg.senderId,
            recipientId: msg.recipientId,
            text: plaintext,
            timestamp: msg.timestamp,
          });
        } catch (error) {
          console.error("Failed to decrypt message:", msg.id, error);
          // Skip messages that fail to decrypt
        }
      }
      
      setMessages(decryptedMessages);
      setLoading(false);

      // Scroll to bottom on new messages
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [chat.id, currentUser]);

  const handleSendMessage = async (text: string) => {
    if (!currentUser || !text.trim() || !cryptoInitialized) return;

    const recipientId = chat.participants.find(p => p !== currentUser.uid);
    if (!recipientId) return;

    setSending(true);

    try {
      // Check if session exists, if not, establish one
      const sessionExists = await hasSession(currentUser.uid, recipientId);
      if (!sessionExists) {
        // Get recipient's prekey bundle from Firestore
        const prekeyDoc = await getDoc(doc(db, "users", recipientId, "crypto", "prekeys"));
        if (!prekeyDoc.exists()) {
          toast({
            variant: "destructive",
            title: "Recipient not set up",
            description: "The recipient hasn't set up encryption yet",
          });
          setSending(false);
          return;
        }

        const recipientBundle = prekeyDoc.data() as PrekeyBundle;
        await buildSession(currentUser.uid, recipientBundle, recipientId);
      }

      // Encrypt the message
      const encrypted = await encryptMessage(currentUser.uid, recipientId, text.trim());

      // Store encrypted message in Firestore
      const newMessage: Omit<Message, "id"> = {
        chatId: chat.id,
        senderId: currentUser.uid,
        recipientId,
        type: encrypted.type,
        body: encrypted.body,
        timestamp: Date.now(),
      };

      await addDoc(collection(db, "messages"), newMessage);

      // Update chat's last message
      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: {
          text: text.trim().substring(0, 100), // Preview only
          timestamp: Date.now(),
          senderId: currentUser.uid,
        },
        updatedAt: Date.now(),
      });
    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message || "Could not encrypt and send message",
      });
    } finally {
      setSending(false);
    }
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

      <MessageInput onSend={handleSendMessage} disabled={sending || !cryptoInitialized} />
    </div>
  );
}
