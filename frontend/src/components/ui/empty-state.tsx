import { motion } from "framer-motion";
import { LucideIcon, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateGenericProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyStateGeneric({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateGenericProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 min-h-[300px]",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          className="gap-2"
        >
          {action.label}
        </Button>
      )}

      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          {secondaryAction.label}
        </button>
      )}
    </motion.div>
  );
}

// Network error empty state
interface NetworkErrorProps {
  onRetry: () => void;
  message?: string;
}

export function NetworkError({ onRetry, message }: NetworkErrorProps) {
  return (
    <EmptyStateGeneric
      icon={AlertCircle}
      title="בעיית תקשורת"
      description={message || "לא הצלחנו להתחבר לשרת. בדוק את החיבור לאינטרנט ונסה שוב."}
      action={{
        label: "נסה שוב",
        onClick: onRetry,
        variant: "outline",
      }}
    />
  );
}
