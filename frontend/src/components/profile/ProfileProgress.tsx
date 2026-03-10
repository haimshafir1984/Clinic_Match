import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { ProfileCompletionResult, getFieldLabel } from "@/lib/profileCompletion";
import { cn } from "@/lib/utils";

interface ProfileProgressProps {
  completion: ProfileCompletionResult;
  className?: string;
  showDetails?: boolean;
}

export function ProfileProgress({ completion, className, showDetails = true }: ProfileProgressProps) {
  const { isComplete, percentage, missingRequiredFields } = completion;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Sparkles className="w-5 h-5 text-amber-500" />
          )}
          <span className="font-medium text-sm">
            {isComplete 
              ? "הפרופיל מוכן – מתחילים לקבל התאמות! 🎉" 
              : `השלמת ${percentage}% מהפרופיל`
            }
          </span>
        </div>
        <Badge 
          variant={isComplete ? "default" : "secondary"} 
          className={cn(
            "text-xs",
            isComplete && "bg-green-500 hover:bg-green-600"
          )}
        >
          {percentage}%
        </Badge>
      </div>

      {/* Progress Bar */}
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          isComplete && "[&>div]:bg-green-500"
        )}
      />

      {/* Guidance Text */}
      {!isComplete && showDetails && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">כדי להתחיל לקבל התאמות</span> – השלימו את השדות הבאים:
          </p>
          <div className="flex flex-wrap gap-2">
            {missingRequiredFields.map((field) => (
              <Badge key={field} variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
                {getFieldLabel(field)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {isComplete && showDetails && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
          ✨ כל הפרטים הנדרשים הושלמו – הפרופיל שלכם מוכן לפעולה!
        </p>
      )}
    </div>
  );
}
