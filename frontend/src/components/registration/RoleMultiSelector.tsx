import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { getRolesByDomain, getDomainConfig, WorkplaceDomain } from "@/constants/domains";

interface RoleMultiSelectorProps {
  domain: WorkplaceDomain;
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
}

export function RoleMultiSelector({ domain, selectedRoles, onChange }: RoleMultiSelectorProps) {
  const roles = getRolesByDomain(domain);
  const domainConfig = getDomainConfig(domain);

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      onChange(selectedRoles.filter((r) => r !== role));
    } else {
      onChange([...selectedRoles, role]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-muted-foreground">מה התפקיד שלך?</p>
        <p className="text-xs text-muted-foreground mt-1">
          ניתן לבחור יותר מתפקיד אחד
        </p>
      </div>
      
      {domainConfig && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
          <span>{domainConfig.icon}</span>
          <span>{domainConfig.label}</span>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 justify-center">
        {roles.map((role) => {
          const isSelected = selectedRoles.includes(role);
          return (
            <motion.button
              key={role}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleRole(role)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all text-sm",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50 bg-background"
              )}
            >
              {isSelected && <Check className="w-4 h-4" />}
              <span>{role}</span>
            </motion.button>
          );
        })}
      </div>

      {selectedRoles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-primary"
        >
          נבחרו {selectedRoles.length} תפקידים
        </motion.div>
      )}
    </div>
  );
}
