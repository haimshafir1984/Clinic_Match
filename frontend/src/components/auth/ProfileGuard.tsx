import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { Loader2 } from "lucide-react";

interface ProfileGuardProps {
  children: ReactNode;
  requireComplete?: boolean;
}

/**
 * ProfileGuard - protects routes that require a complete profile.
 *
 * Existing signed-in users can continue into the app based on the cached
 * current_user state while the full profile query catches up in the background.
 */
export function ProfileGuard({ children, requireComplete = true }: ProfileGuardProps) {
  const { currentUser } = useAuth();
  const { data: profile, isLoading, isError } = useProfile();
  const location = useLocation();
  const canTrustStoredProfileState = Boolean(currentUser?.profileId && currentUser?.isProfileComplete);

  if (isLoading && !canTrustStoredProfileState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">בודק פרופיל...</p>
        </div>
      </div>
    );
  }

  if ((isError || !profile) && canTrustStoredProfileState) {
    return <>{children}</>;
  }

  if (!profile) {
    return <Navigate to="/profile" state={{ from: location, isNew: true }} replace />;
  }

  if (requireComplete) {
    const { isComplete } = calculateProfileCompletion(profile);
    if (!isComplete) {
      return <Navigate to="/profile" state={{ from: location, needsCompletion: true }} replace />;
    }
  }

  return <>{children}</>;
}
