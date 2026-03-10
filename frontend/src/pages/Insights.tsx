import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, Heart, Lightbulb, Loader2, MessageSquare, Sparkles, TrendingUp, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/hooks/useMatches";
import { useProfile, Profile } from "@/hooks/useProfile";
import { calculateProfileCompletion } from "@/lib/profileCompletion";

type InsightTone = "success" | "warning" | "tip";

interface InsightItem {
  tone: InsightTone;
  icon: typeof CheckCircle2;
  text: string;
}

function generateInsights(profile: Profile | null, matchesCount: number, role: "clinic" | "worker"): InsightItem[] {
  const insights: InsightItem[] = [];
  const completion = calculateProfileCompletion(profile);

  if (completion.percentage === 100) {
    insights.push({ tone: "success", icon: CheckCircle2, text: "הפרופיל שלך מלא, וזה משפר משמעותית את סיכויי ההתאמה." });
  } else if (completion.percentage < 70) {
    insights.push({ tone: "warning", icon: AlertCircle, text: `השלמת הפרופיל (${completion.percentage}%) תגדיל את החשיפה שלך.` });
  }

  if (!profile?.description || profile.description.length < 50) {
    insights.push({ tone: "tip", icon: Lightbulb, text: "כדאי להוסיף תיאור מפורט יותר כדי להבליט את הפרופיל." });
  }

  if (matchesCount === 0) {
    insights.push({ tone: "tip", icon: Lightbulb, text: role === "clinic" ? "הרחבת תחום החיפוש יכולה להביא עוד מועמדים." : "עדכון זמינות ושכר יכול להביא יותר התאמות." });
  } else if (matchesCount >= 5) {
    insights.push({ tone: "success", icon: TrendingUp, text: `יש כבר ${matchesCount} התאמות פעילות. כדאי להמשיך את השיחות.` });
  }

  return insights;
}

function getSuggestions(profile: Profile | null, role: "clinic" | "worker"): string[] {
  const suggestions: string[] = [];
  const image = role === "clinic" ? profile?.logo_url || profile?.avatar_url : profile?.avatar_url || profile?.logo_url;

  if (!image) suggestions.push(role === "clinic" ? "הוסיפו לוגו לבית העסק." : "העלו תמונת פרופיל." );
  if (!profile?.description || profile.description.length < 100) suggestions.push("כדאי להרחיב את התיאור ל-100 תווים לפחות.");
  if (role === "worker" && !profile?.experience_years) suggestions.push("ציינו שנות ניסיון כדי לשפר התאמה.");
  if (role === "clinic" && !profile?.city) suggestions.push("השלימו עיר כדי למקד את ההתאמות.");

  return suggestions.slice(0, 3);
}

export default function Insights() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { matches, isLoading: matchesLoading } = useMatches();

  const role = currentUser?.role || "worker";
  const isLoading = profileLoading || matchesLoading;

  const completion = useMemo(() => calculateProfileCompletion(profile), [profile]);
  const stats = useMemo(() => ({ views: 0, likes: 0, matches: matches.length, responseRate: 0, profileScore: completion.percentage }), [completion.percentage, matches.length]);
  const insights = useMemo(() => generateInsights(profile, matches.length, role), [profile, matches.length, role]);
  const suggestions = useMemo(() => getSuggestions(profile, role), [profile, role]);

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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">תובנות</h1>
          <p className="text-sm text-muted-foreground">סיכום מהיר של הפרופיל וההתאמות שלך</p>
        </motion.div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">ציון פרופיל</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary"><Zap className="ml-1 h-3 w-3" />AI Score</Badge>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-primary">{stats.profileScore}</span>
              <span className="mb-1 text-lg text-muted-foreground">/100</span>
            </div>
            <Progress value={stats.profileScore} className="mt-3 h-2" />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-4 w-4" />צפיות</div><p className="text-2xl font-bold">{stats.views}</p></Card>
          <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Heart className="h-4 w-4" />לייקים</div><p className="text-2xl font-bold">{stats.likes}</p></Card>
          <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-4 w-4" />התאמות</div><p className="text-2xl font-bold">{stats.matches}</p></Card>
          <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><MessageSquare className="h-4 w-4" />תגובה</div><p className="text-2xl font-bold">{stats.responseRate}%</p></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>מה המערכת רואה</CardTitle>
            <CardDescription>מבוסס על הפרופיל שלך כרגע</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, index) => (
              <div key={`${insight.text}-${index}`} className={`flex items-start gap-3 rounded-lg border p-3 ${insight.tone === "success" ? "border-success/20 bg-success/10" : insight.tone === "warning" ? "border-warning/20 bg-warning/10" : "border-border bg-accent/30"}`}>
                <insight.icon className={`mt-0.5 h-5 w-5 ${insight.tone === "success" ? "text-success" : insight.tone === "warning" ? "text-warning" : "text-primary"}`} />
                <p className="text-sm">{insight.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>המלצות לשיפור</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={suggestion} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="font-bold text-primary">{index + 1}.</span>
                  <span>{suggestion}</span>
                </div>
              ))}
              <Button onClick={() => navigate("/profile")} className="mt-4 w-full gap-2">
                עדכון פרופיל
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
