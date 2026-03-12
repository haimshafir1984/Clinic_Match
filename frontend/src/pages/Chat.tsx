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

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      toast.error("שליחת ההודעה נכשלה", {
        description: error instanceof Error ? error.message : "נסו שוב בעוד רגע.",
      });
      throw error;
    }
  };

  if (matchLoading || messagesLoading) {
    return (
      <AppLayout showNav={false}>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!match) {
    return (
      <AppLayout showNav={false}>
        <div className="flex h-screen flex-col items-center justify-center p-4">
          <p className="text-muted-foreground">ההתאמה לא נמצאה או שלא ניתן לפתוח את הצ'אט כרגע.</p>
          <Link to="/matches" className="mt-2 text-primary">
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
      <div className="flex h-dvh flex-col">
        <header className="flex items-center gap-3 border-b bg-card p-4">
          <Link to="/matches">
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>

          <Avatar className="h-10 w-10">
            <AvatarImage src={otherProfile.imageUrl || undefined} />
            <AvatarFallback>
              <RoleIcon className="h-5 w-5 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="font-semibold">{otherProfile.name}</h2>
            <p className="text-xs text-muted-foreground">{isClinic ? "בית עסק" : "עובד/ת"}</p>
          </div>

          {!match.isClosed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>סגירת התאמה</AlertDialogTitle>
                  <AlertDialogDescription>
                    {`האם בטוחים שרוצים לסגור את ההתאמה עם ${otherProfile.name}? פעולה זו אינה ניתנת לביטול.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCloseMatch}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    סגירת התאמה
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </header>

        <ChatMessages messages={messages} isClosed={match.isClosed} />

        {!match.isClosed && (
          <AIChatAssistant
            otherProfile={otherProfile}
            onSelectSuggestion={(suggestion) => setInputMessage(suggestion)}
            isFirstMessage={messages.length === 0}
          />
        )}

        {!match.isClosed && <ChatInput onSend={handleSendMessage} value={inputMessage} onChange={setInputMessage} />}

        {match.isClosed && (
          <div className="bg-muted p-4 text-center text-sm text-muted-foreground">ההתאמה הזו נסגרה</div>
        )}
      </div>
    </AppLayout>
  );
}
