// Scoped to a pilot launch (2026-08). The full domain/industry model used to
// cover tech, construction and insurance too — trimmed to the verticals
// where "hire someone for a day or a week to cover a gap" is actually a
// normal thing businesses do: daily-shift work by definition, medical
// clinics covering absent staff, service/call-center coverage, and — within
// education — specifically substitute teaching and kindergarten aides, not
// the whole industry (tutoring and higher ed hiring is project-based, not
// day-fill). Tech/construction/insurance hiring skews toward permanent or
// project-based roles, which don't fit the swipe-for-a-shift model.
//
// Re-adding a dropped vertical: restore its entry in INDUSTRIES and its
// domains in DOMAINS below — nothing else references these by name, every
// consumer (DomainSelector, RoleMultiSelector, registration, market-jobs
// industry filter) is driven off these two arrays.

export type Industry = "medical" | "daily" | "communication" | "education";

export type WorkplaceDomain =
  | "dental" | "optics" | "aesthetics" | "physio"
  | "restaurant" | "bar" | "events" | "cleaning"
  | "call_center"
  | "school" | "kindergarten";

export interface DomainConfig {
  id: WorkplaceDomain;
  label: string;
  icon: string;
  industry: Industry;
  roles: string[];
}

export interface IndustryConfig {
  id: Industry;
  label: string;
  icon: string;
  domains: WorkplaceDomain[];
}

export const INDUSTRIES: IndustryConfig[] = [
  { id: "medical", label: "רפואה ובריאות", icon: "MED", domains: ["dental", "optics", "aesthetics", "physio"] },
  { id: "daily", label: "מקצועות יומיים", icon: "DAY", domains: ["restaurant", "bar", "events", "cleaning"] },
  { id: "communication", label: "תקשורת ושירות", icon: "COM", domains: ["call_center"] },
  { id: "education", label: "חינוך והוראה", icon: "EDU", domains: ["school", "kindergarten"] },
];

export const DOMAINS: DomainConfig[] = [
  { id: "dental", label: "רפואת שיניים", icon: "DEN", industry: "medical", roles: ["רופא שיניים", "סייע/ת שיניים", "שיננית", "מזכירה רפואית", "מנהל/ת מרפאה"] },
  { id: "optics", label: "אופטיקה", icon: "OPT", industry: "medical", roles: ["אופטומטריסט/ית", "אופטיקאי/ת", "יועץ/ת מכירות", "מנהל/ת חנות"] },
  { id: "aesthetics", label: "אסתטיקה", icon: "AES", industry: "medical", roles: ["מטפל/ת אסתטיקה", "אחות", "קוסמטיקאי/ת", "יועץ/ת יופי"] },
  { id: "physio", label: "פיזיותרפיה", icon: "PHY", industry: "medical", roles: ["פיזיותרפיסט/ית", "הידרותרפיסט/ית", "מטפל/ת", "מזכיר/ה"] },

  { id: "restaurant", label: "מסעדות", icon: "RST", industry: "daily", roles: ["מלצר/ית", "שף/שפית", "עוזר/ת שף", "קופאי/ת", "מארח/ת"] },
  { id: "bar", label: "בר ומועדון", icon: "BAR", industry: "daily", roles: ["ברמן/ית", "DJ", "מאבטח/ת", "מנהל/ת משמרת"] },
  { id: "events", label: "אירועים", icon: "EVT", industry: "daily", roles: ["מלצר/ית אירועים", "מארח/ת אירועים", "טבח/ית", "מנהל/ת אירוע", "צלם/ת"] },
  { id: "cleaning", label: "ניקיון ותחזוקה", icon: "CLN", industry: "daily", roles: ["עובד/ת ניקיון", "מנהל/ת צוות", "טכנאי/ת תחזוקה"] },

  { id: "call_center", label: "מוקד ושירות לקוחות", icon: "CC", industry: "communication", roles: ["נציג/ת שירות", "נציג/ת מכירות", "ראש צוות מוקד", "נציג/ת תמיכה"] },

  // Roles limited to subject-substitute teaching, which is what a school
  // actually reaches for on a day's notice — not homeroom/counseling
  // positions, which are hired as ongoing roles.
  { id: "school", label: "הוראה חליפית", icon: "SCH", industry: "education", roles: ["מורה מחליף/ה לאנגלית", "מורה מחליף/ה למתמטיקה", "מורה מחליף/ה למדעים"] },
  { id: "kindergarten", label: "גן ילדים", icon: "KDG", industry: "education", roles: ["גננת", "סייעת גן", "מטפלת"] },
];

export function getRolesByDomain(domain: WorkplaceDomain): string[] {
  return DOMAINS.find((item) => item.id === domain)?.roles || [];
}

export function getDomainConfig(domain: WorkplaceDomain): DomainConfig | undefined {
  return DOMAINS.find((item) => item.id === domain);
}

export function getDomainsByIndustry(industry: Industry): DomainConfig[] {
  return DOMAINS.filter((item) => item.industry === industry);
}

export function getIndustryConfig(industry: Industry): IndustryConfig | undefined {
  return INDUSTRIES.find((item) => item.id === industry);
}

export function getAllRoles(): string[] {
  return Array.from(new Set(DOMAINS.flatMap((item) => item.roles)));
}
