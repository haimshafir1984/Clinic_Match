import { motion } from "framer-motion";
import { RefreshCw, Sparkles, CheckCircle2, SearchX, FilterX, MapPin, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  onRefresh: () => void;
  /** Search filters are narrowing the deck right now. */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  /** How many profiles came back from the server, before any filtering. */
  totalAvailable?: number;
  /** Whether the user actually swiped through cards to get here. */
  hasSwipedAny?: boolean;
}

/**
 * Three genuinely different situations reach this screen, and telling a
 * brand-new user "well done, you've been through everything!" when they were
 * never shown a single card reads as broken. Pick the message — and the
 * useful action — from what actually happened.
 */
export function EmptyState({
  onRefresh,
  hasActiveFilters = false,
  onClearFilters,
  totalAvailable = 0,
  hasSwipedAny = false,
}: EmptyStateProps) {
  const mode = hasActiveFilters && totalAvailable > 0
    ? "filtered"
    : hasSwipedAny
      ? "exhausted"
      : "empty";

  const config = {
    filtered: {
      icon: <FilterX className="h-12 w-12 text-warning" />,
      ring: "from-warning/20 to-warning/5",
      title: "אין תוצאות לחיפוש הזה",
      body: `יש ${totalAvailable} פרופילים זמינים, אבל אף אחד מהם לא תואם לחיפוש הנוכחי. אפשר לנקות את החיפוש ולראות את כולם.`,
    },
    exhausted: {
      icon: <CheckCircle2 className="h-12 w-12 text-success" />,
      ring: "from-success/20 to-success/5",
      title: "עברת על כל ההתאמות",
      body: "אלה כל הפרופילים שמתאימים לך כרגע. פרופילים חדשים נוספים כל הזמן — שווה לחזור מאוחר יותר.",
    },
    empty: {
      icon: <SearchX className="h-12 w-12 text-primary" />,
      ring: "from-primary/20 to-primary/5",
      title: "עדיין אין התאמות עבורך",
      body: "לא מצאנו פרופילים שתואמים לתחום, לאזור ולזמינות שהגדרת. הרחבת רדיוס החיפוש או הוספת תפקידים לפרופיל בדרך כלל פותחת הרבה יותר אפשרויות.",
    },
  }[mode];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-full flex-col items-center justify-center p-8 text-center"
    >
      <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${config.ring}`}>
        {config.icon}
      </div>

      <h3 className="mb-2 text-xl font-semibold text-foreground">{config.title}</h3>
      <p className="mb-6 max-w-xs leading-relaxed text-muted-foreground">{config.body}</p>

      <div className="w-full max-w-xs space-y-3">
        {mode === "filtered" && onClearFilters ? (
          <Button onClick={onClearFilters} className="w-full gap-2">
            <FilterX className="h-4 w-4" />
            ניקוי החיפוש
          </Button>
        ) : (
          <Button onClick={onRefresh} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            בדיקה מחדש
          </Button>
        )}

        {mode === "empty" ? (
          <>
            <Link to="/profile" className="block">
              <Button variant="outline" className="w-full gap-2">
                <MapPin className="h-4 w-4" />
                הרחבת אזור החיפוש
              </Button>
            </Link>
            <Link to="/matches" className="block">
              <Button variant="ghost" className="w-full gap-2">
                <Compass className="h-4 w-4" />
                בינתיים — משרות מאתרים חיצוניים
              </Button>
            </Link>
          </>
        ) : (
          <Link to="/profile" className="block">
            <Button variant="outline" className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              שיפור הפרופיל
            </Button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
