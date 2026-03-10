import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileView } from "@/components/profile/ProfileView";
import { ProfileProgress } from "@/components/profile/ProfileProgress";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogOut, Edit2, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Profile() {
  const { signOut, refreshCurrentUser } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);

  // Check if user was redirected here from a protected route
  const fromLocation = location.state?.from?.pathname;
  const needsCompletion = location.state?.needsCompletion;
  const isNewUser = location.state?.isNew;

  const handleSignOut = async () => {
    await signOut();
    toast.success("׳׳”׳×׳¨׳׳•׳×!");
    navigate("/login");
  };

  const handleProfileSuccess = async () => {
    setIsEditing(false);
    await refreshCurrentUser();
    
    // Always navigate to swipe after successful save - ProfileGuard will handle incomplete profiles
    toast.success("׳”׳₪׳¨׳•׳₪׳™׳ ׳ ׳©׳׳¨! ׳׳¢׳‘׳™׳¨ ׳׳•׳×׳ ׳׳”׳×׳׳׳•׳×...");
    setTimeout(() => {
      navigate("/swipe", { replace: true });
    }, 500);
  };

  // Handle "Save & Start Matching" button
  const handleSaveAndStartMatching = async () => {
    if (profile) {
      const { isComplete } = calculateProfileCompletion(profile);
      if (isComplete) {
        toast.success("׳™׳•׳¦׳׳™׳ ׳׳׳¦׳•׳ ׳”׳×׳׳׳•׳×! נ‰");
        navigate("/swipe");
      } else {
        toast.error("׳ ׳ ׳׳”׳©׳׳™׳ ׳׳× ׳©׳“׳•׳× ׳”׳—׳•׳‘׳” ׳׳₪׳ ׳™ ׳©׳׳׳©׳™׳›׳™׳");
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
        toast.error("׳ ׳ ׳׳”׳©׳׳™׳ ׳׳× ׳©׳“׳•׳× ׳”׳—׳•׳‘׳” ׳׳₪׳ ׳™ ׳©׳׳׳©׳™׳›׳™׳");
        setIsEditing(true);
      }
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const completion = calculateProfileCompletion(profile);

  // No profile yet - show creation form with welcome message
  if (!profile) {
    return (
      <AppLayout showNav={false}>
        <div className="min-h-screen flex flex-col p-4 max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Welcome Header */}
            <div className="text-center pt-8 pb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                ׳‘׳¨׳•׳›׳™׳ ׳”׳‘׳׳™׳ ׳-ShiftMatch! נ‘‹
              </h1>
              <p className="text-muted-foreground">
                ׳‘׳•׳׳• ׳ ׳™׳¦׳•׳¨ ׳׳× ׳”׳₪׳¨׳•׳₪׳™׳ ׳©׳׳›׳ ׳›׳“׳™ ׳׳”׳×׳—׳™׳ ׳׳§׳‘׳ ׳”׳×׳׳׳•׳× ׳׳•׳×׳׳׳•׳× ׳׳™׳©׳™׳×
              </p>
            </div>

            {/* Steps Indicator */}
            <div className="flex justify-center gap-2 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="text-sm font-medium">׳׳™׳׳•׳™ ׳₪׳¨׳•׳₪׳™׳</span>
              </div>
              <div className="w-8 border-t border-border mt-4" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">
                  2
                </div>
                <span className="text-sm text-muted-foreground">׳§׳‘׳׳× ׳”׳×׳׳׳•׳×</span>
              </div>
            </div>

            <ProfileForm onSuccess={handleProfileSuccess} />
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // Editing existing profile
  if (isEditing) {
    return (
      <AppLayout>
        <div className="p-4 max-w-md mx-auto pb-24">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">׳¢׳¨׳™׳›׳× ׳₪׳¨׳•׳₪׳™׳</h1>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              ׳‘׳™׳˜׳•׳
            </Button>
          </div>
          
          <ProfileProgress completion={completion} className="mb-6" />
          
          <ProfileForm 
            initialData={profile} 
            onSuccess={handleProfileSuccess} 
          />
        </div>
      </AppLayout>
    );
  }

  // View profile
  return (
    <AppLayout>
      <div className="p-4 max-w-md mx-auto pb-24">
        {/* Redirect Alert */}
        {needsCompletion && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              ׳›׳“׳™ ׳׳”׳×׳—׳™׳ ׳׳§׳‘׳ ׳”׳×׳׳׳•׳× ג€“ ׳”׳©׳׳™׳׳• ׳׳× ׳”׳₪׳¨׳˜׳™׳ ׳”׳—׳¡׳¨׳™׳ ׳‘׳₪׳¨׳•׳₪׳™׳
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">׳”׳₪׳¨׳•׳₪׳™׳ ׳©׳׳™</h1>
            <p className="text-sm text-muted-foreground">
              {completion.isComplete 
                ? "׳”׳₪׳¨׳•׳₪׳™׳ ׳׳•׳›׳ ׳׳§׳‘׳׳× ׳”׳×׳׳׳•׳×" 
                : "׳”׳©׳׳™׳׳• ׳׳× ׳”׳₪׳¨׳˜׳™׳ ׳׳”׳×׳—׳׳× ׳”׳×׳׳׳•׳×"
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleSignOut}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress Card */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <ProfileProgress completion={completion} />
          </CardContent>
        </Card>

        <ProfileView profile={profile} />

        {/* Sticky CTA */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-md mx-auto">
            {isNewUser || needsCompletion ? (
              // New user or redirected user
              <Button
                onClick={handleSaveAndStartMatching}
                className="w-full gap-2 shadow-lg"
                size="lg"
              >
                <Sparkles className="w-5 h-5" />
                ׳”׳×׳—׳ ׳׳§׳‘׳ ׳”׳×׳׳׳•׳×
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : completion.isComplete ? (
              <Button
                onClick={handleContinueToMatches}
                className="w-full gap-2"
                size="lg"
              >
                <CheckCircle2 className="w-5 h-5" />
                ׳¦׳₪׳™׳™׳” ׳‘׳”׳×׳׳׳•׳×
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full gap-2"
                size="lg"
                variant="outline"
              >
                ׳”׳©׳׳™׳׳• ׳׳× ׳”׳₪׳¨׳•׳₪׳™׳ ׳׳₪׳×׳™׳—׳× ׳”׳×׳׳׳•׳×
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

