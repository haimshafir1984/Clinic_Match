import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowRight, Building2, UserRound, Sparkles, Check } from "lucide-react";
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-lg"
        onClick={onClose}
        id="match-celebration-modal"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="w-full max-w-sm rounded-3xl p-6 sm:p-8 text-center shadow-2xl glass-panel-heavy border border-white/15 overflow-hidden text-white relative"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Top visual gradient accent */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-pink-500 to-emerald-400" />
          
          <div className="h-12 w-12 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Check className="h-6 w-6 stroke-[3px]" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">יש לנו התאמה! Match!</h2>
          <p className="text-xs text-white/70 mt-2 max-w-xs mx-auto leading-relaxed">
            שני הצדדים הביעו עניין הדדי. הגיע הזמן לפתוח את שיחת הגיוס החכמה!
          </p>

          {/* Side-by-side Avatar visual display */}
          <div className="flex justify-center items-center gap-4 my-7">
            <Avatar className="h-16 w-16 rounded-2xl object-cover ring-4 ring-cyan-500/20 border-0 flex-shrink-0">
              <AvatarImage src={currentUser?.imageUrl || undefined} />
              <AvatarFallback className="bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center h-full w-full">
                <CurrentIcon className="h-7 w-7 text-cyan-400" />
              </AvatarFallback>
            </Avatar>

            <div className="flex h-10 w-10 border border-white/15 text-cyan-300 bg-white/10 items-center justify-center font-bold rounded-full text-sm shadow-md animate-pulse">
              ⚡
            </div>

            <Avatar className="h-16 w-16 rounded-2xl object-cover ring-4 ring-rose-500/20 border-0 flex-shrink-0">
              <AvatarImage src={matchedProfile.imageUrl || undefined} />
              <AvatarFallback className="bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center h-full w-full">
                <MatchedIcon className="h-7 w-7 text-rose-400" />
              </AvatarFallback>
            </Avatar>
          </div>

          <p className="mb-6 text-sm text-cyan-300 font-bold">
            {matchedProfile.name} מחכה להתחיל בשיחה עמך.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              id="btn-match-chat-initiator"
              onClick={onChat}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
            >
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse animate-duration-1000" />
              <span>התחל סינון AI וצ׳אט</span>
            </button>
            <button
              id="btn-match-continue-swiping"
              onClick={onClose}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>המשך לגלות התאמות</span>
              <ArrowRight className="h-4 w-4 transform rotate-180" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
