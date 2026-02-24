import { motion } from "framer-motion";
import { RefreshCw, Sparkles, Coffee, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  onRefresh: () => void;
}

export function EmptyState({ onRefresh }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full flex flex-col items-center justify-center text-center p-8"
    >
      {/* Animated Icon */}
      <motion.div 
        className="relative mb-6"
        initial={{ y: 0 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <motion.div 
          className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Sparkles className="w-4 h-4 text-primary" />
        </motion.div>
      </motion.div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        עברתם על כל ההתאמות! 🎉
      </h3>
      <p className="text-muted-foreground mb-6 max-w-xs leading-relaxed">
        כל הכבוד! סיימתם לעבור על כל הפרופילים הזמינים כרגע. 
        חזרו מאוחר יותר לגלות פרופילים חדשים.
      </p>
      
      <div className="space-y-3">
        <Button onClick={onRefresh} className="gap-2 w-full">
          <RefreshCw className="w-4 h-4" />
          בדקו שוב
        </Button>
        
        <Link to="/profile" className="block">
          <Button variant="outline" className="gap-2 w-full">
            <Sparkles className="w-4 h-4" />
            שפרו את הפרופיל
          </Button>
        </Link>
        
        <p className="text-xs text-muted-foreground">
          💡 טיפ: עדכון הפרופיל יכול לשפר את איכות ההתאמות
        </p>
      </div>
    </motion.div>
  );
}
