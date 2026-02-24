import { motion } from "framer-motion";
import { X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwipeActionsProps {
  onPass: () => void;
  onLike: () => void;
  disabled?: boolean;
}

export function SwipeActions({ onPass, onLike, disabled }: SwipeActionsProps) {
  return (
    // RTL layout: Heart on the right (swipe right = like), X on the left (swipe left = pass)
    // Using dir="ltr" to force consistent physical order regardless of page direction
    <div className="flex items-center justify-center gap-6 py-4" dir="ltr">
      {/* Pass — left side = swipe left */}
      <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
        <Button
          size="lg"
          variant="outline"
          className="w-16 h-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={onPass}
          disabled={disabled}
          aria-label="דלג"
        >
          <X className="w-8 h-8" />
        </Button>
      </motion.div>

      {/* Like — right side = swipe right */}
      <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
        <Button
          size="lg"
          className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90"
          onClick={onLike}
          disabled={disabled}
          aria-label="אהבתי"
        >
          <Heart className="w-10 h-10 fill-current" />
        </Button>
      </motion.div>
    </div>
  );
}
