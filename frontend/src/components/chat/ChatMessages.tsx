import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Message } from "@/types";

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
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <p className="mb-2 text-muted-foreground">אין הודעות עדיין</p>
          <p className="text-sm text-muted-foreground">
            {isClosed ? "ההתאמה נסגרה" : "שלחו את ההודעה הראשונה כדי להתחיל."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((message, index) => {
        const isMe = message.senderId === currentUser?.profileId;
        const showTime =
          index === 0 ||
          new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > TIMESTAMP_GAP_MS;

        return (
          <div key={message.id}>
            {showTime && (
              <p className="my-2 text-center text-xs text-muted-foreground">
                {format(new Date(message.createdAt), "EEEE, HH:mm", { locale: he })}
              </p>
            )}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", isMe ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2",
                  isMe
                    ? "rounded-bl-sm bg-primary text-primary-foreground"
                    : "rounded-br-sm bg-secondary text-secondary-foreground"
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
