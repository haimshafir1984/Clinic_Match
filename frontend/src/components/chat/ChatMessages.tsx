import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Message } from "@/types";

// Time gap in ms between messages before showing timestamp (5 minutes)
const TIMESTAMP_GAP_MS = 5 * 60 * 1000;

interface ChatMessagesProps {
  messages: Message[];
  isClosed: boolean;
}

export function ChatMessages({ messages, isClosed }: ChatMessagesProps) {
  const { currentUser } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-muted-foreground mb-2">אין הודעות עדיין</p>
          <p className="text-sm text-muted-foreground">
            {isClosed ? "ההתאמה נסגרה" : "שלח הודעה ראשונה!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message, index) => {
        const isMe = message.senderId === currentUser?.profileId;
        const showTime =
          index === 0 ||
          new Date(message.createdAt).getTime() -
            new Date(messages[index - 1].createdAt).getTime() >
            TIMESTAMP_GAP_MS;

        return (
          <div key={message.id}>
            {showTime && (
              <p className="text-center text-xs text-muted-foreground my-2">
                {format(new Date(message.createdAt), "EEEE, HH:mm", { locale: he })}
              </p>
            )}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                // RTL: isMe = right side (justify-end), other = left side (justify-start)
                isMe ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2 rounded-2xl",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-bl-sm"
                    : "bg-secondary text-secondary-foreground rounded-br-sm"
                )}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </motion.div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

