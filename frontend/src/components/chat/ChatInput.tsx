import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => Promise<unknown>;
  value?: string;
  onChange?: (value: string) => void;
}

export function ChatInput({ onSend, value, onChange }: ChatInputProps) {
  const [internalMessage, setInternalMessage] = useState("");
  const [sending, setSending] = useState(false);

  const message = value !== undefined ? value : internalMessage;
  const setMessage = onChange || setInternalMessage;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const content = message.trim();
    if (!content || sending) return;

    setSending(true);
    setMessage("");

    try {
      await onSend(content);
    } catch (error) {
      setMessage(content);
      throw error;
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-card p-4">
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="כתבו הודעה..."
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={!message.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
