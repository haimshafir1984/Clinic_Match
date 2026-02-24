import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Lightbulb, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MatchCardData } from "@/types";

interface AIChatAssistantProps {
  otherProfile: MatchCardData;
  onSelectSuggestion: (message: string) => void;
  isFirstMessage: boolean;
}

// AI-generated icebreakers based on profile context
function generateIcebreakers(profile: MatchCardData, isFirstMessage: boolean): string[] {
  const name = profile.name || "שם";
  const position = profile.position || "";
  const isClinic = profile.role === "clinic";
  
  if (isFirstMessage) {
    if (isClinic) {
      return [
        `שלום! ראיתי שאתם מחפשים ${position || "עובד/ת"} - אשמח לשמוע עוד על המשרה 🙂`,
        `היי! המרפאה שלכם נראית מעניינת. מה הדבר הכי חשוב לכם בעובד חדש?`,
        `שלום ${name}! אשמח לדעת עוד על סביבת העבודה והצוות.`,
        `היי, התאמנו! 🎉 מה מייחד את המרפאה שלכם?`,
      ];
    } else {
      return [
        `שלום ${name}! ראיתי שיש לך ניסיון ב${position || "התחום"} - מעניין לשמוע עוד!`,
        `היי! מה הכי חשוב לך במקום עבודה חדש?`,
        `שלום! שמחתי להתאמה 🎉 ספר/י לי קצת על עצמך`,
        `היי ${name}, מתי תהיה/י זמין/ה להתחיל?`,
      ];
    }
  }
  
  // Follow-up suggestions
  return [
    "אשמח לקבוע שיחת היכרות קצרה - מתי נוח לך?",
    "האם יש לך שאלות נוספות על התפקיד?",
    "מה דעתך להמשיך בטלפון או בזום?",
    "תודה על השיחה! נשמח להתראות בקרוב",
  ];
}

// Conversation tips based on context
function getConversationTips(isClinic: boolean, messageCount: number): string[] {
  if (messageCount === 0) {
    return isClinic 
      ? ["התחילו בשאלה פתוחה על הניסיון שלהם", "הציגו את היתרונות הייחודיים של המרפאה"]
      : ["שאלו על תרבות העבודה", "ציינו את הזמינות שלכם"];
  }
  
  if (messageCount < 5) {
    return isClinic
      ? ["בררו על ציפיות שכר", "שאלו על זמינות להתחלה"]
      : ["התעניינו בסוג העבודה", "שאלו על אפשרויות קידום"];
  }
  
  return [
    "זה הזמן הנכון להציע שיחת טלפון",
    "סכמו את עיקרי השיחה",
  ];
}

export function AIChatAssistant({ 
  otherProfile, 
  onSelectSuggestion,
  isFirstMessage 
}: AIChatAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTips, setShowTips] = useState(false);
  
  const icebreakers = generateIcebreakers(otherProfile, isFirstMessage);
  const tips = getConversationTips(otherProfile.role === "clinic", isFirstMessage ? 0 : 5);
  
  const handleSelectSuggestion = (suggestion: string) => {
    setIsGenerating(true);
    // Small delay to show loading state
    setTimeout(() => {
      onSelectSuggestion(suggestion);
      setIsGenerating(false);
    }, 300);
  };
  
  if (!isExpanded) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-24 left-4 z-10 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Sparkles className="w-5 h-5" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-xl p-3 mx-4 mb-2"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">עוזר AI</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowTips(!showTips)}
            >
              <Lightbulb className={`w-4 h-4 ${showTips ? 'text-warning' : 'text-muted-foreground'}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(false)}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Tips Section */}
        <AnimatePresence>
          {showTips && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xs font-medium text-warning mb-1.5 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  טיפים לשיחה
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-warning mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {isFirstMessage ? "הצעות לפתיחת שיחה:" : "הצעות להמשך:"}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {icebreakers.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelectSuggestion(suggestion)}
                disabled={isGenerating}
                className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-foreground disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  suggestion.length > 40 ? suggestion.slice(0, 40) + "..." : suggestion
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
