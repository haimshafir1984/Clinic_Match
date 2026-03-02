import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INDUSTRIES, DOMAINS, Industry, WorkplaceDomain, getDomainsByIndustry } from "@/constants/domains";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-right"
            >
              <span className="text-3xl">{industry.icon}</span>
              <span className="font-medium">{industry.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const industryConfig = INDUSTRIES.find((i) => i.id === selectedIndustry)!;
  const subDomains = getDomainsByIndustry(selectedIndustry);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedIndustry(null)}>
          <ArrowRight className="w-4 h-4 ml-1" />
          חזרה
        </Button>
        <span className="text-sm text-muted-foreground">{industryConfig.icon} {industryConfig.label}</span>
      </div>
      <p className="text-center text-muted-foreground text-sm">בחרו תחום ספציפי</p>
      <div className="grid grid-cols-2 gap-3">
        {subDomains.map((domain) => (
          <motion.button
            key={domain.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(domain.id, selectedIndustry)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              value === domain.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-3xl">{domain.icon}</span>
            <span className="font-medium text-sm text-center">{domain.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
