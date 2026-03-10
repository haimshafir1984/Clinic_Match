import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { getDomainConfig, getRolesByDomain, WorkplaceDomain } from "@/constants/domains";
import { cn } from "@/lib/utils";

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
      onChange(selectedRoles.filter((item) => item !== role));
    } else {
      onChange([...selectedRoles, role]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-muted-foreground">מה התפקיד שלך?</p>
        <p className="mt-1 text-xs text-muted-foreground">אפשר לבחור יותר מתפקיד אחד</p>
      </div>

      {domainConfig && (
        <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{domainConfig.icon}</span>
          <span>{domainConfig.label}</span>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {roles.map((role) => {
          const isSelected = selectedRoles.includes(role);
          return (
            <motion.button
              key={role}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleRole(role)}
              className={cn(
                "flex items-center gap-2 rounded-full border-2 bg-background px-4 py-2 text-sm transition-all",
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
              )}
            >
              {isSelected ? <Check className="h-4 w-4" /> : null}
              <span>{role}</span>
            </motion.button>
          );
        })}
      </div>

      {selectedRoles.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm text-primary">
          נבחרו {selectedRoles.length} תפקידים
        </motion.div>
      )}
    </div>
  );
}
