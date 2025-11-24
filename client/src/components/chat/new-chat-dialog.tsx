import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateChat = async () => {
    if (!currentUser || !recipientEmail.trim()) return;

    setLoading(true);
    try {
      // Find recipient by email
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", recipientEmail.trim())
      );
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "User not found",
          description: "No user exists with that email address",
        });
        setLoading(false);
        return;
      }

      const recipientDoc = userSnapshot.docs[0];
      const recipientUid = recipientDoc.id;

      if (recipientUid === currentUser.uid) {
        toast({
          variant: "destructive",
          title: "Invalid recipient",
          description: "You cannot start a chat with yourself",
        });
        setLoading(false);
        return;
      }

      // Check if chat already exists
      const existingChatQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid)
      );
      const existingChats = await getDocs(existingChatQuery);
      const chatExists = existingChats.docs.some(doc => {
        const participants = doc.data().participants as string[];
        return participants.includes(recipientUid);
      });

      if (chatExists) {
        toast({
          title: "Chat already exists",
          description: "A conversation with this user already exists",
        });
        setLoading(false);
        onOpenChange(false);
        setRecipientEmail("");
        return;
      }

      // Create new chat
      await addDoc(collection(db, "chats"), {
        participants: [currentUser.uid, recipientUid],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      toast({
        title: "Chat created",
        description: "You can now start messaging securely",
      });

      onOpenChange(false);
      setRecipientEmail("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create chat",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-new-chat">
        <DialogHeader>
          <DialogTitle>Start a new conversation</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to chat with
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="friend@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              data-testid="input-recipient-email"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-new-chat"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={!recipientEmail.trim() || loading}
            data-testid="button-create-chat"
          >
            {loading ? "Creating..." : "Start Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
