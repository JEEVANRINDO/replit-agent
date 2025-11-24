import { Lock, Info } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import type { Chat } from "@shared/schema";

interface ChatHeaderProps {
  chat: Chat;
}

export function ChatHeader({ chat }: ChatHeaderProps) {
  const { currentUser } = useAuth();

  const getInitials = (text: string) => {
    return text.substring(0, 2).toUpperCase();
  };

  const getOtherParticipant = () => {
    return chat.participants.find(p => p !== currentUser?.uid) || "Unknown";
  };

  const otherParticipant = getOtherParticipant();

  return (
    <div className="h-16 border-b border-border bg-card px-4 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(otherParticipant)}
          </AvatarFallback>
        </Avatar>
        
        <div className="min-w-0">
          <h2 className="font-semibold text-base text-card-foreground truncate" data-testid="text-chat-recipient">
            {otherParticipant}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-chat-info"
          aria-label="Chat info"
        >
          <Info className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
