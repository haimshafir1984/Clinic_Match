import { Link, useNavigate } from "react-router-dom";
import { Heart, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BrandMark } from "@/components/branding/BrandMark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TopHeader() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("להתראות!");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link to="/swipe" className="flex items-center gap-2">
          <BrandMark size={30} className="h-8 w-8 rounded-md" />
          <span className="text-lg font-bold text-foreground">ShiftMatch</span>
        </Link>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/matches">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>התאמות</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/profile">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>פרופיל</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>התנתק</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}

