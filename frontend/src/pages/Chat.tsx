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
      <div className="flex h-dvh flex-col text-white" style={{ direction: 'rtl' }}>
        {/* Frosted Glass Header */}
        <header className="flex items-center gap-3 border-b border-white/10 glass-panel p-4 relative z-10">
          <Link to="/matches">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 cursor-pointer">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>

          <Avatar className="h-10 w-10 border border-white/10">
            <AvatarImage src={otherProfile.imageUrl || undefined} />
            <AvatarFallback className="bg-white/10 text-cyan-400 font-black">
              <RoleIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-right">
            <h2 className="font-bold text-white text-sm">{otherProfile.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 justify-start">
              <span className="text-[10px] text-white/50 font-bold">{isClinic ? "בית עסק" : "עובד/ת"}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 font-black px-1.5 rounded-full">סינון AI פעיל</span>
            </div>
          </div>

          {!match.isClosed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer">
                  <XCircle className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-950 border border-white/15 text-white">
                <AlertDialogHeader className="text-right">
                  <AlertDialogTitle className="font-bold text-white">סגירת התאמה</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/60">
                    {`האם בטוחים שרוצים לסגור את ההתאמה עם ${otherProfile.name}? פעולה זו אינה ניתנת לביטול.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex justify-end gap-2 mt-4">
                  <AlertDialogCancel className="bg-white/5 border border-white/10 hover:bg-white/10 text-white cursor-pointer">ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCloseMatch} className="bg-rose-600 text-white hover:bg-rose-500 cursor-pointer">סגירת התאמה</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </header>

        {/* AI Screening Summary Strip */}
        {pipeline?.summary && (
          <div className="bg-orange-500/10 border-b border-white/10 p-3 px-4 flex items-start gap-2.5 text-right relative overflow-hidden backdrop-blur-md z-10 animate-fade-in">
            <div className="absolute right-0 top-0 w-1.5 h-full bg-gradient-to-b from-orange-400 to-amber-500 animate-pulse" />
            <Sparkles className="h-4 w-4 text-orange-400 fill-current mt-0.5 flex-shrink-0 animate-bounce" />
            <div className="flex-1 min-w-0">
              <h4 className="text-[11px] font-black text-orange-300">סיכום הערכת מועמד AI - ShiftMatch</h4>
              <p className="text-[10px] text-white/80 leading-relaxed font-semibold mt-0.5">{pipeline.summary}</p>
            </div>
          </div>
        )}

        {/* Process Status & Interview Settings Area */}
        <div className="space-y-3 border-b border-white/10 bg-white/5 p-3 backdrop-blur-md overflow-y-auto max-h-[160px] no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Status Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-cyan-400">
                <Briefcase className="h-3.5 w-3.5" />
                <span>סטטוס תהליך</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                  {pipeline ? stageLabels[pipeline.stage] : "התאמה חדשה"}
                </span>
                {pipeline?.savedToTalent ? (
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    נשמר ב-Talent Pool
                  </span>
                ) : null}
              </div>
              {canManage && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Select value={nextStage} onValueChange={(value) => setNextStage(value as RecruitmentStage)}>
                    <SelectTrigger className="bg-slate-900 border-white/10 h-7 text-[10px] rounded-lg text-white">
                      <SelectValue placeholder="בחרו סטטוס" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/15 text-white">
                      {Object.entries(stageLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs hover:bg-white/10 cursor-pointer">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateStage} className="h-7 bg-cyan-600 hover:bg-cyan-500 text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer">
                    עדכן
                  </Button>
                </div>
              )}
            </div>

            {/* Interviews Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-fuchsia-400">
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
                    className="bg-slate-900 border-white/10 h-7 text-[10px] text-right text-white"
                  />
                  <div className="flex items-center gap-1">
                    <Select value={interviewType} onValueChange={(value) => setInterviewType(value as "phone" | "video" | "onsite") }>
                      <SelectTrigger className="bg-slate-900 border-white/10 h-7 text-[10px] rounded-lg text-white flex-1">
                        <SelectValue placeholder="סוג ראיון" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-white/15 text-white">
                        <SelectItem value="phone" className="text-xs hover:bg-white/10 cursor-pointer">טלפון</SelectItem>
                        <SelectItem value="video" className="text-xs hover:bg-white/10 cursor-pointer">וידאו</SelectItem>
                        <SelectItem value="onsite" className="text-xs hover:bg-white/10 cursor-pointer">פרונטלי</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleScheduleInterview} className="h-7 bg-fuchsia-600 hover:bg-fuchsia-500 text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer">
                      קבע
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-1 mt-1.5 max-h-[60px] overflow-y-auto no-scrollbar">
                {interviews.length === 0 ? (
                  <p className="text-[9px] text-white/40">טרם נקבעו מועדים.</p>
                ) : (
                  interviews.map((interview) => (
                    <div key={interview.id} className="rounded-lg bg-white/5 border border-white/10 p-1.5 text-[9px] text-white flex justify-between items-center">
                      <span className="font-bold">{interview.scheduledFor}</span>
                      <span className="text-cyan-300 font-mono text-[8px] font-black">{interview.interviewType} • {interview.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messaging Board */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <ChatMessages messages={messages} isClosed={match.isClosed} />
        </div>

        {/* Quick Replies Tags Strip */}
        {!match.isClosed && smartSuggestions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-4 bg-slate-950/70 border-t border-white/10">
            <span className="text-[9px] font-black text-cyan-400 bg-cyan-400/15 border border-cyan-400/25 px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse">
              מענה מהיר ⚡
            </span>
            {smartSuggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => handleSendMessage(suggestion)}
                className="text-[10px] text-white/90 bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 hover:text-white px-3 py-1 rounded-full cursor-pointer transition-all whitespace-nowrap font-bold"
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
          <div className="bg-rose-500/10 border-t border-rose-500/20 p-4 text-center text-xs font-black text-rose-300">
            ההתאמה הזו נסגרה לצמיתות
          </div>
        )}
      </div>
    </AppLayout>
  );
}
