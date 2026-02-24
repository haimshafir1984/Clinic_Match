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
  
  // Use controlled or uncontrolled mode
  const message = value !== undefined ? value : internalMessage;
  const setMessage = onChange || setInternalMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const content = message.trim();
    if (!content || sending) return;

    setSending(true);
    setMessage("");
    
    try {
      await onSend(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-card">
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="הקלד הודעה..."
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={!message.trim() || sending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
