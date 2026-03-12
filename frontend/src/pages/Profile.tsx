import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useProfileHighlights } from "@/hooks/useProfileHighlights";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileView } from "@/components/profile/ProfileView";
import { ProfileProgress } from "@/components/profile/ProfileProgress";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogOut, Edit2, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Profile() {
  const { signOut, refreshCurrentUser } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: highlightsData } = useProfileHighlights(profile?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);

  const needsCompletion = location.state?.needsCompletion;
  const isNewUser = location.state?.isNew;

  const handleSignOut = async () => {
    await signOut();
    toast.success("להתראות!");
    navigate("/login");
  };

  const handleProfileSuccess = async () => {
    setIsEditing(false);
    await refreshCurrentUser();
    toast.success("הפרופיל נשמר. מעביר אותך להתאמות...");
    setTimeout(() => {
      navigate("/swipe", { replace: true });
    }, 500);
  };

  const handleSaveAndStartMatching = async () => {
    if (profile) {
      const { isComplete } = calculateProfileCompletion(profile);
      if (isComplete) {
        toast.success("יוצאים למצוא התאמות");
        navigate("/swipe");
      } else {
        toast.error("נא להשלים את שדות החובה לפני שממשיכים");
        setIsEditing(true);
      }
    }
  };

  const handleContinueToMatches = () => {
    if (profile) {
      const { isComplete } = calculateProfileCompletion(profile);
      if (isComplete) {
        navigate("/swipe");
      } else {
        toast.error("נא להשלים את שדות החובה לפני שממשיכים");
        setIsEditing(true);
      }
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const completion = calculateProfileCompletion(profile);

  if (!profile) {
    return (
      <AppLayout showNav={false}>
        <div className="mx-auto flex min-h-screen max-w-md flex-col p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="pb-4 pt-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">ברוכים הבאים ל-ShiftMatch</h1>
              <p className="text-muted-foreground">בואו ניצור את הפרופיל שלכם כדי להתחיל לקבל התאמות איכותיות.</p>
            </div>
            <ProfileForm onSuccess={handleProfileSuccess} />
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  if (isEditing) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md p-4 pb-24">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">עריכת פרופיל</h1>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>ביטול</Button>
          </div>

          <ProfileProgress completion={completion} className="mb-6" />
          <ProfileForm initialData={profile} onSuccess={handleProfileSuccess} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-md p-4 pb-24">
        {needsCompletion && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <AlertDescription className="text-amber-700">כדי להתחיל לקבל התאמות, חשוב להשלים את כל הפרטים החסרים בפרופיל.</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">הפרופיל שלי</h1>
            <p className="text-sm text-muted-foreground">
              {completion.isComplete ? "הפרופיל מוכן לקבלת התאמות" : "השלימו את הפרטים כדי להתחיל לקבל התאמות"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}><Edit2 className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={handleSignOut} className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-4">
            <ProfileProgress completion={completion} />
          </CardContent>
        </Card>

        <ProfileView profile={profile} highlights={highlightsData?.highlights || []} />

        <div className="fixed bottom-20 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent p-4">
          <div className="mx-auto max-w-md">
            {isNewUser || needsCompletion ? (
              <Button onClick={handleSaveAndStartMatching} className="w-full gap-2 shadow-lg" size="lg">
                <Sparkles className="h-5 w-5" />התחל לקבל התאמות<ArrowLeft className="h-4 w-4" />
              </Button>
            ) : completion.isComplete ? (
              <Button onClick={handleContinueToMatches} className="w-full gap-2" size="lg">
                <CheckCircle2 className="h-5 w-5" />צפייה בהתאמות<ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="w-full gap-2" size="lg" variant="outline">
                השלימו את הפרופיל כדי להתחיל לקבל התאמות
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
