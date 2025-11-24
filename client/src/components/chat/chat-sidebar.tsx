import { useState } from "react";
import { Plus, Search, LogOut, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { NewChatDialog } from "./new-chat-dialog";
import { useAuth } from "@/contexts/auth-context";
import type { Chat } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  loading: boolean;
}

export function ChatSidebar({ chats, selectedChatId, onSelectChat, loading }: ChatSidebarProps) {
  const { currentUser, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    // Filter logic can be enhanced later
    return true;
  });

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants.find(p => p !== currentUser?.uid) || "Unknown";
  };

  return (
    <>
      <div className="w-80 border-r border-border bg-card flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-card-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10" data-testid="avatar-current-user">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {currentUser?.email ? getInitials(currentUser.email) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate" data-testid="text-current-user-email">
                  {currentUser?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                data-testid="button-logout"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-chats"
            />
          </div>

          {/* New Chat Button */}
          <Button
            className="w-full"
            onClick={() => setShowNewChat(true)}
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-3 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <div className="text-4xl mb-3 opacity-20">💬</div>
              <p className="text-sm font-medium text-card-foreground mb-1">No conversations yet</p>
              <p className="text-xs text-muted-foreground">
                Start a new chat to begin messaging
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredChats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                const otherParticipant = getOtherParticipant(chat);
                
                return (
                  <button
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`
                      w-full p-3 rounded-md flex items-center gap-3 text-left
                      hover-elevate active-elevate-2 transition-colors
                      ${isSelected ? 'bg-accent' : ''}
                    `}
                    data-testid={`chat-item-${chat.id}`}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(otherParticipant)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm text-card-foreground truncate">
                          {otherParticipant}
                        </p>
                        {chat.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(chat.lastMessage.timestamp, { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage.senderId === currentUser?.uid ? "You: " : ""}
                          {chat.lastMessage.text}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer - Encryption info */}
        <div className="p-3 border-t border-card-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Key className="h-3 w-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>

      <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />
    </>
  );
}
