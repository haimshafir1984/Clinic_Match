import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowRight, Building2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MatchCardData, CurrentUser } from "@/types";

interface MatchCelebrationProps {
  isOpen: boolean;
  matchedProfile: MatchCardData | null;
  currentUser: CurrentUser | null;
  onClose: () => void;
  onChat: () => void;
}

export function MatchCelebration({ 
  isOpen, 
  matchedProfile, 
  currentUser,
  onClose, 
  onChat 
}: MatchCelebrationProps) {
  if (!isOpen || !matchedProfile) return null;

  const isMatchedClinic = matchedProfile.role === "clinic";
  const MatchedIcon = isMatchedClinic ? Building2 : UserRound;
  const CurrentIcon = currentUser?.role === "clinic" ? Building2 : UserRound;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-lg border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Profile Pictures Side by Side */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Current User Avatar */}
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-primary/20">
                <AvatarImage src={currentUser?.imageUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-lg">
                  <CurrentIcon className="w-8 h-8 text-primary" />
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Connection Icon */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>

            {/* Matched Profile Avatar */}
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-primary/20">
                <AvatarImage src={matchedProfile.imageUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-lg">
                  <MatchedIcon className="w-8 h-8 text-primary" />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            🎉 נמצאה התאמה!
          </h2>
          
          {/* Description */}
          <p className="text-muted-foreground mb-2">
            גם{" "}
            <span className="font-semibold text-foreground">
              {matchedProfile.name}
            </span>
            {" "}סימנ/ה עניין בכם!
          </p>
          <p className="text-sm text-primary mb-8">
            עכשיו אפשר ליצור קשר ולהתקדם 🚀
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
              className="w-full gap-2"
              onClick={onChat}
            >
              <MessageCircle className="w-5 h-5" />
              שליחת הודעה
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full gap-2"
              onClick={onClose}
            >
              המשך לגלות התאמות
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}