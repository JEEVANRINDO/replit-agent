import { useState } from "react";
import { Shield, Key, Lock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCrypto } from "@/contexts/crypto-context";

interface CryptoInitDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function CryptoInitDialog({ open, onComplete }: CryptoInitDialogProps) {
  const { initializeCrypto } = useCrypto();
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setInitializing(true);
    setError(null);

    try {
      await initializeCrypto();
      onComplete();
    } catch (err: any) {
      setError(err.message || "Failed to initialize encryption");
    } finally {
      setInitializing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Set up encryption keys</DialogTitle>
          <DialogDescription className="text-center">
            SecureChat uses end-to-end encryption to protect your messages. We need to generate your encryption keys.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                <Key className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Your keys, your control</p>
                <p className="text-xs text-muted-foreground">
                  Encryption keys are generated on your device and never leave it
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Signal protocol</p>
                <p className="text-xs text-muted-foreground">
                  Using the same encryption as Signal and WhatsApp
                </p>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleInitialize}
            disabled={initializing}
            className="w-full"
            data-testid="button-initialize-crypto"
          >
            {initializing ? "Generating keys..." : "Generate encryption keys"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
