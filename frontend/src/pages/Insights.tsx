import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useMatches } from "@/hooks/useMatches";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageSquare, 
  Lightbulb,
  Target,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { calculateProfileCompletion } from "@/lib/profileCompletion";

// AI-generated insights based on profile data
function generateInsights(profile: any, matchesCount: number, role: string) {
  const insights: { type: 'success' | 'warning' | 'tip'; icon: typeof CheckCircle2; text: string }[] = [];
  
  // Profile completeness
  const completion = calculateProfileCompletion(profile);
  if (completion.percentage === 100) {
    insights.push({
      type: 'success',
      icon: CheckCircle2,
      text: 'הפרופיל שלך מושלם! זה מגדיל את הסיכוי להתאמות ב-40%'
    });
  } else if (completion.percentage < 70) {
    insights.push({
      type: 'warning',
      icon: AlertCircle,
      text: `השלמת הפרופיל (${completion.percentage}%) תגדיל משמעותית את החשיפה שלך`
    });
  }
  
  // Description insight
  if (!profile?.description || profile.description.length < 50) {
    insights.push({
      type: 'tip',
      icon: Lightbulb,
      text: 'הוספת תיאור מפורט יותר מושכת יותר תשומת לב'
    });
  }
  
  // Match insights
  if (matchesCount === 0) {
    insights.push({
      type: 'tip',
      icon: Lightbulb,
      text: role === 'clinic' 
        ? 'נסו להרחיב את טווח החיפוש או הוסיפו תחומי עיסוק נוספים'
        : 'עדכנו את הזמינות שלכם כדי להגדיל סיכויי התאמה'
    });
  } else if (matchesCount >= 5) {
    insights.push({
      type: 'success',
      icon: TrendingUp,
      text: `יש לך ${matchesCount} התאמות! שמור על קשר פעיל איתם`
    });
  }
  
  // Role-specific tips
  if (role === 'clinic') {
    if (!profile?.required_position) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        text: 'הגדרת תפקיד מבוקש תשפר את איכות ההתאמות'
      });
    }
  } else {
    if (!profile?.availability_days || profile.availability_days.length === 0) {
      insights.push({
        type: 'tip',
        icon: Lightbulb,
        text: 'עדכון ימי זמינות יעזור למצוא התאמות מדויקות יותר'
      });
    }
  }
  
  return insights;
}

// Calculate simulated stats
function calculateStats(profile: any, matchesCount: number) {
  const completion = calculateProfileCompletion(profile);
  
  // Simulated stats based on profile data
  const baseViews = Math.floor(Math.random() * 50) + 20;
  const viewMultiplier = completion.percentage / 100;
  
  return {
    views: Math.floor(baseViews * viewMultiplier),
    likes: Math.floor((baseViews * viewMultiplier) * 0.3),
    matches: matchesCount,
    responseRate: matchesCount > 0 ? Math.floor(Math.random() * 30) + 70 : 0,
    profileScore: completion.percentage,
  };
}

// Optimization suggestions
function getOptimizationSuggestions(profile: any, role: string): string[] {
  const suggestions: string[] = [];
  
  if (!profile?.avatar_url) {
    suggestions.push("הוסיפו תמונת פרופיל - פרופילים עם תמונה מקבלים פי 3 יותר צפיות");
  }
  
  if (!profile?.description || profile.description.length < 100) {
    suggestions.push("כתבו תיאור מפורט יותר (לפחות 100 תווים)");
  }
  
  if (role === 'worker') {
    if (!profile?.experience_years) {
      suggestions.push("ציינו את שנות הניסיון שלכם");
    }
    if (!profile?.salary_min || !profile?.salary_max) {
      suggestions.push("הגדירו טווח שכר מצופה");
    }
  }
  
  if (role === 'clinic') {
    if (!profile?.city) {
      suggestions.push("הוסיפו את מיקום המרפאה");
    }
  }
  
  return suggestions.slice(0, 3); // Max 3 suggestions
}

export default function Insights() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { matches, isLoading: matchesLoading } = useMatches();
  
  const isLoading = profileLoading || matchesLoading;
  const role = currentUser?.role || 'worker';
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  const stats = calculateStats(profile, matches.length);
  const insights = generateInsights(profile, matches.length, role);
  const suggestions = getOptimizationSuggestions(profile, role);
  
  return (
    <AppLayout>
      <div className="p-4 max-w-md mx-auto pb-24 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">תובנות AI</h1>
          <p className="text-sm text-muted-foreground">
            ניתוח חכם של הפרופיל וההתאמות שלך
          </p>
        </motion.div>

        {/* Profile Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">ציון הפרופיל</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Zap className="w-3 h-3 ml-1" />
                  AI Score
                </Badge>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-primary">{stats.profileScore}</span>
                <span className="text-lg text-muted-foreground mb-1">/100</span>
              </div>
              <Progress value={stats.profileScore} className="h-2 mt-3" />
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">צפיות</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.views}</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">לייקים</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.likes}</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">התאמות</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.matches}</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">אחוז תגובה</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.responseRate}%</p>
          </Card>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                תובנות AI
              </CardTitle>
              <CardDescription>ניתוח אוטומטי של הפרופיל שלך</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    insight.type === 'success' 
                      ? 'bg-success/10 border border-success/20' 
                      : insight.type === 'warning'
                      ? 'bg-warning/10 border border-warning/20'
                      : 'bg-accent/50 border border-border'
                  }`}
                >
                  <insight.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    insight.type === 'success' ? 'text-success' 
                    : insight.type === 'warning' ? 'text-warning'
                    : 'text-primary'
                  }`} />
                  <p className="text-sm text-foreground">{insight.text}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Optimization Suggestions */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  המלצות לשיפור
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-primary font-bold">{index + 1}.</span>
                    <span>{suggestion}</span>
                  </div>
                ))}
                
                <Button 
                  onClick={() => navigate('/profile')}
                  className="w-full mt-4 gap-2"
                >
                  עדכן פרופיל
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
