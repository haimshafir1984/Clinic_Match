import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Heart,
  Lightbulb,
  Loader2,
  MessageSquare,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useMatches } from "@/hooks/useMatches";
import { useProfile } from "@/hooks/useProfile";
import { useTalentPool } from "@/hooks/useTalentPool";
import { calculateProfileCompletion } from "@/lib/profileCompletion";

const stageLabels = {
  matched: "התאמה חדשה",
  screening: "סינון",
  interview: "ראיונות",
  offer: "הצעות",
  hired: "גויסו",
  archived: "ארכיון",
};

export default function Insights() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { matches, isLoading: matchesLoading } = useMatches();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { talentPool } = useTalentPool();

  const isClinic = currentUser?.role === "clinic";
  const isLoading = profileLoading || matchesLoading || analyticsLoading;
  const completion = useMemo(() => calculateProfileCompletion(profile), [profile]);

  // Real-time custom funnel statistics computed directly from matches
  const stats = useMemo(() => {
    const active = matches.filter((m) => !m.isClosed);
    const total = matches.length;

    let screening = 0;
    let interview = 0;
    let offer = 0;
    let hired = 0;
    let matched = 0;

    matches.forEach((m) => {
      const stage = m.pipeline?.stage || "matched";
      if (stage === "matched") matched++;
      else if (stage === "screening") screening++;
      else if (stage === "interview") interview++;
      else if (stage === "offer") offer++;
      else if (stage === "hired") hired++;
    });

    // Funnel accumulation logic
    const hiredCount = hired;
    const offerCount = hiredCount + offer;
    const interviewCount = offerCount + interview;
    const screeningCount = interviewCount + screening;
    const matchedCount = total;

    const totalPossible = total || 1;
    const matchedPercent = 100;
    const screeningPercent = Math.round((screeningCount / totalPossible) * 100);
    const interviewPercent = Math.round((interviewCount / totalPossible) * 100);
    const hiredPercent = Math.round((hiredCount / totalPossible) * 100);

    const conversionRate = total > 0
      ? Math.round(((screeningCount + interviewCount + hiredCount) / (total * 3)) * 100)
      : 0;

    return {
      total,
      active: active.length,
      matchedCount,
      screeningCount,
      interviewCount,
      hiredCount,
      matchedPercent,
      screeningPercent,
      interviewPercent,
      hiredPercent,
      conversionRate,
    };
  }, [matches]);

  // Real-time top positions requested or matched
  const topRoles = useMemo(() => {
    const counts: Record<string, number> = {};
    matches.forEach((m) => {
      const pos = m.otherProfile.position;
      if (pos) {
        counts[pos] = (counts[pos] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [matches]);

  const smartSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    if (stats.total === 0) {
      suggestions.push(
        isClinic
          ? "כדאי להרחיב את טווחי החיפוש או לעדכן את דרישות המשרה כדי לקבל התאמות ראשוניות במערכת."
          : "מומלץ לעדכן את הזמינות, השכר ותיאור המשרה שלך כדי להגדיל את סיכויי ההתאמה מול קליניקות."
      );
    }
    if (stats.interviewCount === 0 && stats.total > 0) {
      suggestions.push(
        isClinic
          ? "יש לך מועמדים שסיימו את סינון ה-AI אך עדיין לא הוזמנו לראיון. זה זמן מצוין לקבוע להם מועד!"
          : "יש לך התאמות פעילות במערכת! שלח להם הודעה וקדם את התהליך לתיאום ראיון עבודה ראשוני."
      );
    }
    if (completion.percentage < 80) {
      suggestions.push("השלמת הפרופיל שלך ל-100% תגדיל את האמון מול הצד השני ותמשוך התאמות איכותיות בהרבה.");
    }
    if (isClinic && talentPool.length === 0) {
      suggestions.push("שמור מועמדים חזקים שאינם מתאימים כרגע ל-Talent Pool כדי לגייס אותם בקלות בעתיד.");
    }
    return suggestions.slice(0, 3);
  }, [stats.total, stats.interviewCount, completion.percentage, isClinic, talentPool.length]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">טוען תובנות ונתוני AI...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={`mx-auto p-4 pb-24 space-y-4 transition-all duration-300 ${isClinic ? "max-w-2xl w-full" : "max-w-md"}`}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-7 w-7 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-foreground">תובנות חכמות - ShiftMatch</h1>
          <p className="text-xs text-muted-foreground mt-1">מבט מהיר על פעילות הגיוס, יחסי ההמרה והמלצות AI מותאמות אישית.</p>
        </motion.div>

        {/* Profile Strength */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-accent/40 to-primary/5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">חוזק הפרופיל במערכת</span>
            <Badge className="bg-primary/10 text-primary border border-primary/20 font-mono text-[9px] px-2 py-0.5">
              AI READY
            </Badge>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-primary font-mono leading-none">
              {analytics?.profileCompletion || completion.percentage}
            </span>
            <span className="text-sm text-muted-foreground font-bold mb-1">/100</span>
          </div>
          <Progress value={analytics?.profileCompletion || completion.percentage} className="mt-4 h-2 bg-muted" />
        </div>

        {/* 2x2 Glassmorphic Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="glass-panel-interactive p-4 rounded-2xl flex flex-col justify-between h-28">
            <div className="flex items-center justify-between text-xs font-black text-destructive">
              <span>התאמות מוצלחות</span>
              <Heart className="h-4 w-4 text-destructive fill-current" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono mt-2">{stats.total}</p>
            <p className="text-[9px] text-muted-foreground font-bold">{stats.active} פעילות כרגע</p>
          </div>

          <div className="glass-panel-interactive p-4 rounded-2xl flex flex-col justify-between h-28">
            <div className="flex items-center justify-between text-xs font-black text-primary">
              <span>הודעות שנשלחו</span>
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono mt-2">{analytics?.totalMessages || 0}</p>
            <p className="text-[9px] text-muted-foreground font-bold">שיח סינון דיגיטלי פעיל</p>
          </div>

          <div className="glass-panel-interactive p-4 rounded-2xl flex flex-col justify-between h-28">
            <div className="flex items-center justify-between text-xs font-black text-accent-foreground">
              <span>ראיונות שנקבעו</span>
              <CalendarDays className="h-4 w-4 text-accent-foreground" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono mt-2">{analytics?.scheduledInterviews || stats.interviewCount}</p>
            <p className="text-[9px] text-muted-foreground font-bold">וידאו ופרונטליים</p>
          </div>

          <div className="glass-panel-interactive p-4 rounded-2xl flex flex-col justify-between h-28">
            <div className="flex items-center justify-between text-xs font-black text-success">
              <span>מאגר מועמדים</span>
              <Users className="h-4 w-4 text-success" />
            </div>
            <p className="text-3xl font-black text-foreground font-mono mt-2">{isClinic ? analytics?.savedCandidates || talentPool.length : talentPool.length}</p>
            <p className="text-[9px] text-muted-foreground font-bold">שמורים ב-Talent Pool</p>
          </div>
        </div>

        {/* Funnel Progress Visualizer for Clinics */}
        {isClinic && (
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span>משפך גיוס וסינון AI חכם</span>
              </h3>
              <Badge className="bg-warning/15 text-warning border border-warning/30 text-[9px] px-2 py-0.5">
                {stats.conversionRate}% המרה
              </Badge>
            </div>

            <div className="space-y-4 font-semibold text-foreground">
              {/* Stage 1: Matched */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-foreground">התאמות ראשוניות</span>
                  <span className="text-muted-foreground font-mono">{stats.matchedCount} מועמדים (100%)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-gradient-to-r from-warning to-primary rounded-full transition-all duration-500" style={{ width: `${stats.matchedPercent}%` }} />
                </div>
              </div>

              {/* Stage 2: Screening */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-warning flex items-center gap-1">
                    <Sparkles className="h-3 w-3 animate-pulse text-warning fill-current" />
                    הושלם סינון AI
                  </span>
                  <span className="text-muted-foreground font-mono">{stats.screeningCount} מועמדים ({stats.screeningPercent}%)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-gradient-to-r from-warning to-primary rounded-full transition-all duration-500" style={{ width: `${stats.screeningPercent}%` }} />
                </div>
              </div>

              {/* Stage 3: Interview */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-primary">הוזמנו לראיונות</span>
                  <span className="text-muted-foreground font-mono">{stats.interviewCount} מועמדים ({stats.interviewPercent}%)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-gradient-to-r from-primary to-accent-foreground rounded-full transition-all duration-500" style={{ width: `${stats.interviewPercent}%` }} />
                </div>
              </div>

              {/* Stage 4: Hired */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-success">גוייסו בהצלחה</span>
                  <span className="text-muted-foreground font-mono">{stats.hiredCount} מועמדים ({stats.hiredPercent}%)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-gradient-to-r from-success to-success/70 rounded-full transition-all duration-500" style={{ width: `${stats.hiredPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Demand roles list for Clinics */}
        {isClinic && topRoles.length > 0 && (
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>ביקוש והיענות משרות</span>
            </h3>
            <div className="space-y-2">
              {topRoles.map((role, idx) => (
                <div key={role.name} className="flex items-center justify-between bg-muted/60 border border-border p-2.5 rounded-xl text-xs font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-mono text-[10px]">{idx + 1}</span>
                    <span>{role.name}</span>
                  </div>
                  <span className="font-mono text-primary font-bold bg-muted border border-border px-2 py-0.5 rounded-full">{role.count} התאמות</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Lightbulb className="h-4 w-4 text-warning" />
            <span>המלצות AI לפעולה</span>
          </h3>
          <div className="space-y-3">
            {smartSuggestions.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-success/20 bg-success/10 p-3 text-xs font-semibold text-foreground">
                <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 text-success flex-shrink-0" />
                <p className="leading-relaxed">המערכת במצב מעולה! מומלץ להמשיך לתקשר מול ההתאמות הפעילות ולתאם ראיונות נוספים.</p>
              </div>
            ) : (
              smartSuggestions.map((suggestion, index) => (
                <div key={suggestion} className="flex items-start gap-3 bg-muted/60 border border-border p-3 rounded-xl text-xs font-semibold leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-muted border border-border text-foreground flex items-center justify-center font-mono text-[10px] flex-shrink-0 mt-0.5">{index + 1}</span>
                  <p className="text-foreground">{suggestion}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rapid Actions */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>צעדים מהירים</span>
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => navigate("/matches")} className="gap-2 bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold border-none py-4 rounded-xl cursor-pointer">
              מעבר להתאמות
              <ArrowLeft className="h-4 w-4 transform rotate-180" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/profile")} className="bg-muted/60 border-border hover:bg-muted hover:border-border text-foreground font-bold py-4 rounded-xl cursor-pointer">
              עדכון פרופיל
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
