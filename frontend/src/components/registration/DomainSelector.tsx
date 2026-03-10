import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INDUSTRIES, Industry, WorkplaceDomain, getDomainsByIndustry } from "@/constants/domains";
import { cn } from "@/lib/utils";

interface DomainSelectorProps {
  value: WorkplaceDomain | null;
  onChange: (domain: WorkplaceDomain, industry: Industry) => void;
}

export function DomainSelector({ value, onChange }: DomainSelectorProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);

  if (!selectedIndustry) {
    return (
      <div className="space-y-4">
        <p className="text-center text-muted-foreground">באיזה תחום את/ה עובד/ת?</p>
        <div className="grid grid-cols-1 gap-3">
          {INDUSTRIES.map((industry) => (
            <motion.button
              key={industry.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedIndustry(industry.id)}
              className="flex items-center gap-4 rounded-xl border-2 border-border p-4 text-right transition-all hover:border-primary/50"
            >
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{industry.icon}</span>
              <span className="font-medium">{industry.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const industryConfig = INDUSTRIES.find((item) => item.id === selectedIndustry)!;
  const subDomains = getDomainsByIndustry(selectedIndustry);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedIndustry(null)}>
          <ArrowRight className="ml-1 h-4 w-4" />
          חזרה
        </Button>
        <span className="text-sm text-muted-foreground">{industryConfig.label}</span>
      </div>
      <p className="text-center text-sm text-muted-foreground">בחר/י תחום ספציפי</p>
      <div className="grid grid-cols-2 gap-3">
        {subDomains.map((domain) => (
          <motion.button
            key={domain.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(domain.id, selectedIndustry)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
              value === domain.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
            )}
          >
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{domain.icon}</span>
            <span className="text-center text-sm font-medium">{domain.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

