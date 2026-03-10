import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Lightbulb, Loader2, MessageSquare, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchCardData } from "@/types";

interface AIChatAssistantProps {
  otherProfile: MatchCardData;
  onSelectSuggestion: (message: string) => void;
  isFirstMessage: boolean;
}

function generateIcebreakers(profile: MatchCardData, isFirstMessage: boolean): string[] {
  const name = profile.name || "שם";
  const position = profile.position || "התפקיד";
  const isBusiness = profile.role === "clinic";

  if (isFirstMessage) {
    if (isBusiness) {
      return [
        `שלום! ראיתי שאתם מחפשים ${position}. אשמח לשמוע עוד על התפקיד.`,
        `היי ${name}, מה הכי חשוב לכם בעובד/ת חדש/ה?`,
        `אשמח להבין קצת יותר על הצוות ועל סביבת העבודה אצלכם.`,
      ];
    }

    return [
      `שלום ${name}, ראיתי את הניסיון שלך ב-${position}. אשמח לשמוע עוד.`,
      `היי! מה חשוב לך במקום העבודה הבא שלך?`,
      `נעים מאוד, מתי תהיה/י זמין/ה להתחלה?`,
    ];
  }

  return [
    "מה דעתך לקבוע שיחת היכרות קצרה?",
    "יש לך עוד שאלות על התפקיד?",
    "אפשר לעבור לשיחת טלפון או זום אם נוח לך.",
  ];
}

function getConversationTips(isBusiness: boolean, isFirstMessage: boolean): string[] {
  if (isFirstMessage) {
    return isBusiness
      ? ["פתחו בשאלה על הניסיון של המועמד/ת.", "הציגו בקצרה את סביבת העבודה והיתרונות שלכם."]
      : ["שאלו על אופי העבודה והצוות.", "ציינו זמינות ושכר אם זה רלוונטי."];
  }

  return [
    "כדאי לסכם את עיקרי השיחה בצורה קצרה.",
    "אם יש עניין הדדי, זה זמן טוב להציע שיחת המשך.",
  ];
}

export function AIChatAssistant({ otherProfile, onSelectSuggestion, isFirstMessage }: AIChatAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const suggestions = generateIcebreakers(otherProfile, isFirstMessage);
  const tips = getConversationTips(otherProfile.role === "clinic", isFirstMessage);

  const handleSelectSuggestion = (suggestion: string) => {
    setIsGenerating(true);
    window.setTimeout(() => {
      onSelectSuggestion(suggestion);
      setIsGenerating(false);
    }, 250);
  };

  if (!isExpanded) {
    return (
      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsExpanded(true)} className="fixed bottom-24 left-4 z-10 rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90">
        <Sparkles className="h-5 w-5" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="mx-4 mb-2 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5"><Sparkles className="h-4 w-4 text-primary" /></div>
            <span className="text-sm font-medium">עוזר ניסוח</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTips((value) => !value)}>
              {showTips ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <Lightbulb className="h-4 w-4 text-warning" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showTips && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-3 overflow-hidden">
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-2">
                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-warning"><Lightbulb className="h-3 w-3" />טיפים לשיחה</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {tips.map((tip) => <li key={tip}>• {tip}</li>)}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" />{isFirstMessage ? "פתיחים מוצעים" : "הצעות להמשך"}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <motion.button key={suggestion} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={() => handleSelectSuggestion(suggestion)} disabled={isGenerating} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50">
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : suggestion.length > 42 ? `${suggestion.slice(0, 42)}...` : suggestion}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
