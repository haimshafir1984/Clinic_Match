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
  const name = profile.name || "הצד השני";
  const position = profile.position || "התפקיד";
  const isBusiness = profile.role === "clinic";

  if (isFirstMessage) {
    return isBusiness
      ? [
          `שלום ${name}, אשמח לשמוע קצת יותר על ${position} ומה חשוב לכם בגיוס הזה.`,
          `היי ${name}, מה היעד המרכזי של התפקיד הזה בחודשיים הקרובים?`,
          `אשמח להבין איך נראה יום עבודה טיפוסי אצלכם בתפקיד ${position}.`,
        ]
      : [
          `שלום ${name}, ראיתי את הניסיון שלך ב-${position} ואשמח לשמוע עוד.`,
          `היי ${name}, מה חשוב לך במיוחד במקום העבודה הבא שלך?`,
          `אפשר לשאול מה הזמינות שלך ואיך נראה התפקיד האידיאלי מבחינתך?`,
        ];
  }

  const followUps = [
    "נשמע טוב. אפשר לקבוע שיחת היכרות קצרה כבר השבוע?",
    "מה השלב הבא שנוח לכם לקדם מכאן?",
    "יש עוד מידע שחשוב לך לקבל לפני שמתקדמים?",
  ];

  return [...followUps, ...(profile.strengths || [])].slice(0, 3);
}

function getConversationTips(profile: MatchCardData, isFirstMessage: boolean): string[] {
  const baseTips = isFirstMessage
    ? [
        "כדאי לפתוח בשאלה ממוקדת אחת ולא בהודעה ארוכה מדי.",
        "אם יש פרט חזק בפרופיל, שווה להזכיר אותו כדי להראות עניין אמיתי.",
      ]
    : [
        "זה זמן טוב לסכם את הציפיות ולסגור פעולה הבאה.",
        "אם יש עניין הדדי, אפשר להציע ראיון או שיחת היכרות קצרה.",
      ];

  if (profile.strengths && profile.strengths.length > 0) {
    baseTips.unshift(`נקודת חוזק בולטת: ${profile.strengths[0]}`);
  }

  return baseTips.slice(0, 3);
}

export function AIChatAssistant({ otherProfile, onSelectSuggestion, isFirstMessage }: AIChatAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const suggestions = generateIcebreakers(otherProfile, isFirstMessage);
  const tips = getConversationTips(otherProfile, isFirstMessage);

  const handleSelectSuggestion = (suggestion: string) => {
    setIsGenerating(true);
    window.setTimeout(() => {
      onSelectSuggestion(suggestion);
      setIsGenerating(false);
    }, 250);
  };

  if (!isExpanded) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-24 left-4 z-10 rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
      >
        <Sparkles className="h-5 w-5" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="mx-4 mb-2 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 p-3"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5"><Sparkles className="h-4 w-4 text-primary" /></div>
            <span className="text-sm font-medium">עוזר גיוס אוטומטי</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTips((value) => !value)}>
              {showTips ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <Lightbulb className="h-4 w-4 text-yellow-500" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showTips && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-3 overflow-hidden">
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2">
                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-yellow-700"><Lightbulb className="h-3 w-3" />טיפים לשיחה</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {tips.map((tip) => <li key={tip}>• {tip}</li>)}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" />{isFirstMessage ? "פתיחות מוצעות" : "הצעדים הבאים בשיחה"}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <motion.button
                key={suggestion}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleSelectSuggestion(suggestion)}
                disabled={isGenerating}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : suggestion.length > 42 ? `${suggestion.slice(0, 42)}...` : suggestion}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
