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
import { Loader2, ArrowRight, Building2, UserRound, XCircle, CalendarDays, Briefcase, Sparkles } from "lucide-react";
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
      <div className="flex h-dvh flex-col text-foreground" style={{ direction: 'rtl' }}>
        {/* Frosted Glass Header */}
        <header className="flex items-center gap-3 border-b border-border glass-panel p-4 relative z-10">
          <Link to="/matches">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted cursor-pointer">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>

          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={otherProfile.imageUrl || undefined} />
            <AvatarFallback className="bg-accent text-primary font-black">
              <RoleIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-right">
            <h2 className="font-bold text-foreground text-sm">{otherProfile.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 justify-start">
              <span className="text-[10px] text-muted-foreground font-bold">{isClinic ? "בית עסק" : "עובד/ת"}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[9px] bg-success/15 text-success border border-success/25 font-black px-1.5 rounded-full">סינון AI פעיל</span>
            </div>
          </div>

          {!match.isClosed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer">
                  <XCircle className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border border-border text-foreground">
                <AlertDialogHeader className="text-right">
                  <AlertDialogTitle className="font-bold text-foreground">סגירת התאמה</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    {`האם בטוחים שרוצים לסגור את ההתאמה עם ${otherProfile.name}? פעולה זו אינה ניתנת לביטול.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex justify-end gap-2 mt-4">
                  <AlertDialogCancel className="bg-muted/60 border border-border hover:bg-muted text-foreground cursor-pointer">ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCloseMatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer">סגירת התאמה</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </header>

        {/* AI Screening Summary Strip */}
        {pipeline?.summary && (
          <div className="bg-warning/10 border-b border-border p-3 px-4 flex items-start gap-2.5 text-right relative overflow-hidden backdrop-blur-md z-10 animate-fade-in">
            <div className="absolute right-0 top-0 w-1.5 h-full bg-gradient-to-b from-warning to-warning/70 animate-pulse" />
            <Sparkles className="h-4 w-4 text-warning fill-current mt-0.5 flex-shrink-0 animate-bounce" />
            <div className="flex-1 min-w-0">
              <h4 className="text-[11px] font-black text-warning">סיכום הערכת מועמד AI - ShiftMatch</h4>
              <p className="text-[10px] text-foreground/80 leading-relaxed font-semibold mt-0.5">{pipeline.summary}</p>
            </div>
          </div>
        )}

        {/* Process Status & Interview Settings Area */}
        <div className="space-y-3 border-b border-border bg-muted/40 p-3 backdrop-blur-md overflow-y-auto max-h-[160px] no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Status Section */}
            <div className="bg-muted/60 border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-primary">
                <Briefcase className="h-3.5 w-3.5" />
                <span>סטטוס תהליך</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  {pipeline ? stageLabels[pipeline.stage] : "התאמה חדשה"}
                </span>
                {pipeline?.savedToTalent ? (
                  <span className="rounded-full bg-success/10 border border-success/20 px-2.5 py-0.5 text-[10px] font-bold text-success">
                    נשמר ב-Talent Pool
                  </span>
                ) : null}
              </div>
              {canManage && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Select value={nextStage} onValueChange={(value) => setNextStage(value as RecruitmentStage)}>
                    <SelectTrigger className="bg-background border-border h-7 text-[10px] rounded-lg text-foreground">
                      <SelectValue placeholder="בחרו סטטוס" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {Object.entries(stageLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs hover:bg-muted cursor-pointer">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateStage} className="h-7 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer">
                    עדכן
                  </Button>
                </div>
              )}
            </div>

            {/* Interviews Section */}
            <div className="bg-muted/60 border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-accent-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>תיאום ראיונות</span>
              </div>
              {canManage && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <Input
                    type="text"
                    placeholder="למשל: 25/08 בשעה 10:00"
                    value={interviewDate}
                    onChange={(event) => setInterviewDate(event.target.value)}
                    className="bg-background border-border h-7 text-[10px] text-right text-foreground"
                  />
                  <div className="flex items-center gap-1">
                    <Select value={interviewType} onValueChange={(value) => setInterviewType(value as "phone" | "video" | "onsite") }>
                      <SelectTrigger className="bg-background border-border h-7 text-[10px] rounded-lg text-foreground flex-1">
                        <SelectValue placeholder="סוג ראיון" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="phone" className="text-xs hover:bg-muted cursor-pointer">טלפון</SelectItem>
                        <SelectItem value="video" className="text-xs hover:bg-muted cursor-pointer">וידאו</SelectItem>
                        <SelectItem value="onsite" className="text-xs hover:bg-muted cursor-pointer">פרונטלי</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleScheduleInterview} className="h-7 bg-accent-foreground hover:bg-accent-foreground/90 text-accent text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer">
                      קבע
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-1 mt-1.5 max-h-[60px] overflow-y-auto no-scrollbar">
                {interviews.length === 0 ? (
                  <p className="text-[9px] text-muted-foreground/70">טרם נקבעו מועדים.</p>
                ) : (
                  interviews.map((interview) => (
                    <div key={interview.id} className="rounded-lg bg-muted/60 border border-border p-1.5 text-[9px] text-foreground flex justify-between items-center">
                      <span className="font-bold">{interview.scheduledFor}</span>
                      <span className="text-primary font-mono text-[8px] font-black">{interview.interviewType} • {interview.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messaging Board */}
        <div className="flex-1 overflow-y-auto bg-muted/20">
          <ChatMessages messages={messages} isClosed={match.isClosed} />
        </div>

        {/* Quick Replies Tags Strip */}
        {!match.isClosed && smartSuggestions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-4 bg-card/70 border-t border-border">
            <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse">
              מענה מהיר ⚡
            </span>
            {smartSuggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => handleSendMessage(suggestion)}
                className="text-[10px] text-foreground bg-muted/60 border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-foreground px-3 py-1 rounded-full cursor-pointer transition-all whitespace-nowrap font-bold"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* AI Helper Assistance Overlay */}
        {!match.isClosed && (
          <AIChatAssistant
            otherProfile={{ ...otherProfile, strengths: smartSuggestions }}
            onSelectSuggestion={(suggestion) => setInputMessage(suggestion)}
            isFirstMessage={messages.length === 0}
          />
        )}

        {/* Input Controls */}
        {!match.isClosed && (
          <div className="glass-panel p-2">
            <ChatInput onSend={handleSendMessage} value={inputMessage} onChange={setInputMessage} />
          </div>
        )}

        {match.isClosed && (
          <div className="bg-destructive/10 border-t border-destructive/20 p-4 text-center text-xs font-black text-destructive">
            ההתאמה הזו נסגרה לצמיתות
          </div>
        )}
      </div>
    </AppLayout>
  );
}
