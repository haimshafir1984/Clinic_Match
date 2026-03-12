import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { AIChatAssistant } from "@/components/chat/AIChatAssistant";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useMatchDetails } from "@/hooks/useMatchDetails";
import { useRecruitment } from "@/hooks/useRecruitment";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, Building2, UserRound, XCircle, CalendarDays, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { RecruitmentStage } from "@/types";

const stageLabels: Record<RecruitmentStage, string> = {
  matched: "התאמה חדשה",
  screening: "סינון",
  interview: "ראיון",
  offer: "הצעה",
  hired: "גויס/ה",
  archived: "ארכיון",
};

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const { match, isLoading: matchLoading, closeMatch } = useMatchDetails(matchId!);
  const { messages, isLoading: messagesLoading, sendMessage } = useChatMessages(matchId!);
  const { pipeline, interviews, canManage, updatePipeline, scheduleInterview } = useRecruitment(matchId!);
  const [inputMessage, setInputMessage] = useState("");
  const [nextStage, setNextStage] = useState<RecruitmentStage>(pipeline?.stage || "matched");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState<"phone" | "video" | "onsite">("video");

  const smartSuggestions = useMemo(() => {
    if (!match) return [];
    const base = [
      `אשמח לשמוע עוד על ${match.otherProfile.position || "התפקיד"}.`,
      "אפשר לשתף מה הדבר הכי חשוב לכם בשלב הזה?",
      "אם תרצו, אפשר כבר לקבוע שיחת היכרות קצרה.",
    ];
    if (pipeline?.stage === "interview") {
      base.unshift("השלב הבא מבחינתי הוא תיאום ראיון. איזה יום מתאים לכם?");
    }
    return base.slice(0, 3);
  }, [match, pipeline?.stage]);

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

  const handleUpdateStage = async () => {
    try {
      await updatePipeline({ stage: nextStage, nextStep: `הסטטוס עודכן ל-${stageLabels[nextStage]}` });
      toast.success("סטטוס הגיוס עודכן");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון סטטוס נכשל");
    }
  };

  const handleScheduleInterview = async () => {
    if (!interviewDate) {
      toast.error("יש לבחור תאריך ושעה לראיון");
      return;
    }

    try {
      await scheduleInterview({
        scheduledFor: new Date(interviewDate).toISOString(),
        interviewType,
        notes: "ראיון שתואם מתוך הצ'אט",
      });
      setInterviewDate("");
      toast.success("הראיון נוסף בהצלחה");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "קביעת הראיון נכשלה");
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
          <Link to="/matches" className="mt-2 text-primary">חזרה להתאמות</Link>
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
            <Button variant="ghost" size="icon"><ArrowRight className="h-5 w-5" /></Button>
          </Link>

          <Avatar className="h-10 w-10">
            <AvatarImage src={otherProfile.imageUrl || undefined} />
            <AvatarFallback><RoleIcon className="h-5 w-5 text-primary" /></AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="font-semibold">{otherProfile.name}</h2>
            <p className="text-xs text-muted-foreground">{isClinic ? "בית עסק" : "עובד/ת"}</p>
          </div>

          {!match.isClosed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <XCircle className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>סגירת התאמה</AlertDialogTitle>
                  <AlertDialogDescription>{`האם בטוחים שרוצים לסגור את ההתאמה עם ${otherProfile.name}? פעולה זו אינה ניתנת לביטול.`}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCloseMatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">סגירת התאמה</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </header>

        <div className="space-y-3 border-b bg-background/80 p-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-4 w-4 text-primary" />סטטוס תהליך</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{pipeline ? stageLabels[pipeline.stage] : "התאמה חדשה"}</span>
                {pipeline?.savedToTalent ? <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">נשמר ב-Talent Pool</span> : null}
              </div>
              {canManage ? (
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Select value={nextStage} onValueChange={(value) => setNextStage(value as RecruitmentStage)}>
                    <SelectTrigger><SelectValue placeholder="בחרו סטטוס" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(stageLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateStage}>עדכון סטטוס</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" />תיאום ראיונות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canManage ? (
                <div className="grid gap-3">
                  <Label htmlFor="interviewDate">תאריך ושעה</Label>
                  <Input id="interviewDate" type="datetime-local" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} />
                  <Select value={interviewType} onValueChange={(value) => setInterviewType(value as "phone" | "video" | "onsite") }>
                    <SelectTrigger><SelectValue placeholder="סוג ראיון" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">טלפון</SelectItem>
                      <SelectItem value="video">וידאו</SelectItem>
                      <SelectItem value="onsite">פרונטלי</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleScheduleInterview}>קביעת ראיון</Button>
                </div>
              ) : null}
              <div className="space-y-2">
                {interviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">עדיין לא נקבעו ראיונות.</p>
                ) : (
                  interviews.map((interview) => (
                    <div key={interview.id} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">{new Date(interview.scheduledFor).toLocaleString("he-IL")}</div>
                      <div className="text-muted-foreground">{interview.interviewType} • {interview.status}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <ChatMessages messages={messages} isClosed={match.isClosed} />

        {!match.isClosed && (
          <AIChatAssistant
            otherProfile={{ ...otherProfile, strengths: smartSuggestions }}
            onSelectSuggestion={(suggestion) => setInputMessage(suggestion)}
            isFirstMessage={messages.length === 0}
          />
        )}

        {!match.isClosed && <ChatInput onSend={handleSendMessage} value={inputMessage} onChange={setInputMessage} />}

        {match.isClosed && <div className="bg-muted p-4 text-center text-sm text-muted-foreground">ההתאמה הזו נסגרה</div>}
      </div>
    </AppLayout>
  );
}
