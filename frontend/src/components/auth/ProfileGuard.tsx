import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { Loader2 } from "lucide-react";

interface ProfileGuardProps {
  children: ReactNode;
  requireComplete?: boolean;
}

/**
 * ProfileGuard - protects routes that require a complete profile
 * 
 * Usage:
 * - Wrap routes that need profile completion (like /swipe, /matches)
 * - Users without complete profiles are redirected to /profile
 */
export function ProfileGuard({ children, requireComplete = true }: ProfileGuardProps) {
  const { data: profile, isLoading } = useProfile();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">בודק פרופיל...</p>
        </div>
      </div>
    );
  }

  // If no profile exists, redirect to profile page to create one
  if (!profile) {
    return <Navigate to="/profile" state={{ from: location, isNew: true }} replace />;
  }

  // If profile exists but not complete, redirect to profile
  if (requireComplete) {
    const { isComplete } = calculateProfileCompletion(profile);
    if (!isComplete) {
      return <Navigate to="/profile" state={{ from: location, needsCompletion: true }} replace />;
    }
  }

  return <>{children}</>;
}
