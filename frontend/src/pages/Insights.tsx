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

  const smartSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    if ((analytics?.activeMatches || 0) === 0) {
      suggestions.push(isClinic ? "כדאי להרחיב את החיפוש או לעדכן דרישות משרה כדי לקבל יותר התאמות." : "כדאי לעדכן זמינות, שכר ותיאור אישי כדי להופיע ליותר עסקים.");
    }
    if ((analytics?.scheduledInterviews || 0) === 0 && (analytics?.activeMatches || 0) > 0) {
      suggestions.push("יש התאמות פעילות ועדיין אין ראיונות מתואמים. זה רגע טוב לקבוע שיחת היכרות.");
    }
    if (completion.percentage < 80) {
      suggestions.push("השלמת הפרופיל תגדיל את אמון הצד השני ותשפר את איכות הפניות.");
    }
    if (isClinic && talentPool.length === 0) {
      suggestions.push("שמרו מועמדים חזקים ל-Talent Pool כדי שלא תלכו לאיבוד בין תהליכים.");
    }
    return suggestions.slice(0, 3);
  }, [analytics?.activeMatches, analytics?.scheduledInterviews, completion.percentage, isClinic, talentPool.length]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-md space-y-4 p-4 pb-24">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">תובנות חכמות</h1>
          <p className="text-sm text-muted-foreground">מבט מהיר על הפעילות, הראיונות והאיכות של הפרופיל שלך.</p>
        </motion.div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">חוזק הפרופיל</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">AI Ready</Badge>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-primary">{analytics?.profileCompletion || completion.percentage}</span>
              <span className="mb-1 text-lg text-muted-foreground">/100</span>
            </div>
            <Progress value={analytics?.profileCompletion || completion.percentage} className="mt-3 h-2" />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Heart className="h-4 w-4" />התאמות</div><p className="text-2xl font-bold">{analytics?.totalMatches || matches.length}</p></Card>
          <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><MessageSquare className="h-4 w-4" />הודעות</div><p className="text-2xl font-bold">{analytics?.totalMessages || 0}</p></Card>
          <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />ראיונות</div><p className="text-2xl font-bold">{analytics?.scheduledInterviews || 0}</p></Card>
          <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" />Talent Pool</div><p className="text-2xl font-bold">{isClinic ? analytics?.savedCandidates || talentPool.length : talentPool.length}</p></Card>
        </div>

        {isClinic && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" />משפך גיוס</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(analytics?.pipelineBreakdown || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">עדיין אין תהליכי גיוס מתקדמים. ברגע שתעדכנו סטטוס התאמה, הם יופיעו כאן.</p>
              ) : (
                analytics?.pipelineBreakdown.map((item) => (
                  <div key={item.stage} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{stageLabels[item.stage] || item.stage}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />המלצות פעולה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {smartSuggestions.length === 0 ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <p>המערכת במצב טוב. מומלץ להמשיך לקדם את ההתאמות הפעילות ולתאם ראיונות.</p>
              </div>
            ) : (
              smartSuggestions.map((suggestion, index) => (
                <div key={suggestion} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <Badge variant="secondary" className="mt-0.5">{index + 1}</Badge>
                  <p>{suggestion}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />צעדים מהירים</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button onClick={() => navigate("/matches")} className="gap-2">
              מעבר להתאמות הפעילות
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/profile")}>
              עדכון פרופיל
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
