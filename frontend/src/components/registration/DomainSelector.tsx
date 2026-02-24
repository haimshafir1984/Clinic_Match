import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DOMAINS, WorkplaceDomain } from "@/constants/domains";

interface DomainSelectorProps {
  value: WorkplaceDomain | null;
  onChange: (domain: WorkplaceDomain) => void;
}

export function DomainSelector({ value, onChange }: DomainSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="text-center text-muted-foreground">באיזה תחום את/ה עובד/ת?</p>
      <div className="grid grid-cols-2 gap-3">
        {DOMAINS.map((domain) => (
          <motion.button
            key={domain.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(domain.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              value === domain.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-3xl">{domain.icon}</span>
            <span className="font-medium text-sm">{domain.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
