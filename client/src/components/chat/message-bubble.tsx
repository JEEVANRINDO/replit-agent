import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { DecryptedMessage } from "@shared/schema";

interface MessageBubbleProps {
  message: DecryptedMessage;
  isOwn: boolean;
  showAvatar: boolean;
  isGrouped: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar, isGrouped }: MessageBubbleProps) {
  const getInitials = (id: string) => {
    return id.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-1' : 'mt-4'}`}
      data-testid={`message-${message.id}`}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {showAvatar && !isOwn ? (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getInitials(message.senderId)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>

      {/* Message content */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-md`}>
        <div
          className={`
            px-4 py-2 rounded-2xl break-words
            ${isOwn 
              ? 'bg-primary text-primary-foreground rounded-tr-sm' 
              : 'bg-accent text-accent-foreground rounded-tl-sm'
            }
          `}
          data-testid="text-message-content"
        >
          <p className="text-base whitespace-pre-wrap">{message.text}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-1">
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
