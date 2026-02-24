// Medical Domains and Roles Configuration

export type WorkplaceDomain = "dental" | "optics" | "aesthetics" | "physio";

export interface DomainConfig {
  id: WorkplaceDomain;
  label: string;
  icon: string;
  roles: string[];
}

export const DOMAINS: DomainConfig[] = [
  {
    id: "dental",
    label: "רפואת שיניים",
    icon: "🦷",
    roles: [
      "רופא שיניים",
      "סייע/ת שיניים",
      "שיננית",
      "מזכירה רפואית",
      "מנהל/ת מרפאה",
    ],
  },
  {
    id: "optics",
    label: "אופטיקה",
    icon: "👓",
    roles: [
      "אופטומטריסט",
      "אופטיקאי",
      "יועץ/ת מכירות",
      "מנהל/ת חנות",
    ],
  },
  {
    id: "aesthetics",
    label: "אסתטיקה",
    icon: "💉",
    roles: [
      "רופא אסתטיקה",
      "אחות",
      "קוסמטיקאית",
      "יועץ/ת יופי",
    ],
  },
  {
    id: "physio",
    label: "פיזיותרפיה",
    icon: "🦴",
    roles: [
      "פיזיותרפיסט",
      "הידרותרפיסט",
      "מעסה",
      "מזכיר/ה",
    ],
  },
];

// Helper function to get roles by domain
export function getRolesByDomain(domain: WorkplaceDomain): string[] {
  const config = DOMAINS.find((d) => d.id === domain);
  return config?.roles || [];
}

// Helper function to get domain config
export function getDomainConfig(domain: WorkplaceDomain): DomainConfig | undefined {
  return DOMAINS.find((d) => d.id === domain);
}

// Get all unique roles across all domains
export function getAllRoles(): string[] {
  const roles = new Set<string>();
  DOMAINS.forEach((d) => d.roles.forEach((r) => roles.add(r)));
  return Array.from(roles);
}
