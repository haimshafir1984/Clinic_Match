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
  onChat,
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-6 flex items-center justify-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-primary/20">
              <AvatarImage src={currentUser?.imageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-lg">
                <CurrentIcon className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>

            <Avatar className="h-20 w-20 border-4 border-primary/20">
              <AvatarImage src={matchedProfile.imageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-lg">
                <MatchedIcon className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-foreground">נמצאה התאמה!</h2>

          <p className="mb-2 text-muted-foreground">
            גם <span className="font-semibold text-foreground">{matchedProfile.name}</span> סימנו עניין.
          </p>
          <p className="mb-8 text-sm text-primary">אפשר לפתוח שיחה ולהמשיך משם.</p>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full gap-2" onClick={onChat}>
              <MessageCircle className="h-5 w-5" />
              פתיחת שיחה
            </Button>
            <Button variant="outline" size="lg" className="w-full gap-2" onClick={onClose}>
              המשך לגלות התאמות
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
