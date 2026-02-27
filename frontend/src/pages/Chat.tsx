import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { AIChatAssistant } from "@/components/chat/AIChatAssistant";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useMatchDetails } from "@/hooks/useMatchDetails";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowRight, Building2, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const { match, isLoading: matchLoading, closeMatch } = useMatchDetails(matchId!);
  const { messages, isLoading: messagesLoading, sendMessage } = useChatMessages(matchId!);
  const [inputMessage, setInputMessage] = useState("");

  if (matchLoading || messagesLoading) {
    return (
      <AppLayout showNav={false}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!match) {
    return (
      <AppLayout showNav={false}>
        <div className="flex flex-col items-center justify-center h-screen p-4">
          <p className="text-muted-foreground">ההתאמה לא נמצאה</p>
          <Link to="/matches" className="text-primary mt-2">
            חזרה להתאמות
          </Link>
        </div>
      </AppLayout>
    );
  }

  const otherProfile = match.otherProfile;
  const isClinic = otherProfile.role === "clinic";
  const RoleIcon = isClinic ? Building2 : UserRound;

  const handleCloseMatch = async () => {
    try {
      await closeMatch();
      toast.success("ההתאמה נסגרה");
    } catch {
      toast.error("שגיאה בסגירת ההתאמה");
    }
  };

  return (
    <AppLayout showNav={false}>
      <div className="flex flex-col h-dvh">
        {/* Header */}
        <header className="flex items-center gap-3 p-4 border-b bg-card">
          <Link to="/matches">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          <Avatar className="w-10 h-10">
            <AvatarImage src={otherProfile.imageUrl || undefined} />
            <AvatarFallback>
              <RoleIcon className="w-5 h-5 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="font-semibold">{otherProfile.name}</h2>
            <p className="text-xs text-muted-foreground">
              {isClinic ? "מרפאה" : "עובד/ת"}
            </p>
          </div>

          {!match.isClosed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>סגירת ההתאמה</AlertDialogTitle>
                  <AlertDialogDescription>
                    האם אתה בטוח שברצונך לסגור את ההתאמה עם {otherProfile.name}?
                    פעולה זו אינה ניתנת לביטול.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCloseMatch}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    סגור התאמה
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </header>

        {/* Messages */}
        <ChatMessages messages={messages || []} isClosed={match.isClosed} />

        {/* AI Assistant */}
        {!match.isClosed && (
          <AIChatAssistant
            otherProfile={otherProfile}
            onSelectSuggestion={(suggestion) => setInputMessage(suggestion)}
            isFirstMessage={!messages || messages.length === 0}
          />
        )}

        {/* Input */}
        {!match.isClosed && (
          <ChatInput
            onSend={sendMessage}
            value={inputMessage}
            onChange={setInputMessage}
          />
        )}

        {match.isClosed && (
          <div className="p-4 bg-muted text-center text-sm text-muted-foreground">
            ההתאמה הזו נסגרה
          </div>
        )}
      </div>
    </AppLayout>
  );
}
