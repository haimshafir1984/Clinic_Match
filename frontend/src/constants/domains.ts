export type Industry = "medical" | "tech" | "education" | "construction" | "daily" | "communication" | "insurance";

export type WorkplaceDomain =
  | "dental" | "optics" | "aesthetics" | "physio"
  | "software" | "design" | "devops" | "product"
  | "school" | "tutoring" | "kindergarten" | "higher_ed"
  | "electrical" | "plumbing" | "carpentry" | "general_contractor"
  | "restaurant" | "bar" | "events" | "cleaning"
  | "call_center" | "digital_media" | "telecom" | "public_relations"
  | "health_insurance" | "claims" | "underwriting" | "pension";

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
  { id: "tech", label: "הייטק וטכנולוגיה", icon: "TECH", domains: ["software", "design", "devops", "product"] },
  { id: "education", label: "חינוך והוראה", icon: "EDU", domains: ["school", "tutoring", "kindergarten", "higher_ed"] },
  { id: "construction", label: "בנייה ותחזוקה", icon: "BUILD", domains: ["electrical", "plumbing", "carpentry", "general_contractor"] },
  { id: "daily", label: "מקצועות יומיים", icon: "DAY", domains: ["restaurant", "bar", "events", "cleaning"] },
  { id: "communication", label: "תקשורת ושירות", icon: "COM", domains: ["call_center", "digital_media", "telecom", "public_relations"] },
  { id: "insurance", label: "ביטוח ופיננסים", icon: "INS", domains: ["health_insurance", "claims", "underwriting", "pension"] },
];

export const DOMAINS: DomainConfig[] = [
  { id: "dental", label: "רפואת שיניים", icon: "DEN", industry: "medical", roles: ["רופא שיניים", "סייע/ת שיניים", "שיננית", "מזכירה רפואית", "מנהל/ת מרפאה"] },
  { id: "optics", label: "אופטיקה", icon: "OPT", industry: "medical", roles: ["אופטומטריסט/ית", "אופטיקאי/ת", "יועץ/ת מכירות", "מנהל/ת חנות"] },
  { id: "aesthetics", label: "אסתטיקה", icon: "AES", industry: "medical", roles: ["מטפל/ת אסתטיקה", "אחות", "קוסמטיקאי/ת", "יועץ/ת יופי"] },
  { id: "physio", label: "פיזיותרפיה", icon: "PHY", industry: "medical", roles: ["פיזיותרפיסט/ית", "הידרותרפיסט/ית", "מטפל/ת", "מזכיר/ה"] },

  { id: "software", label: "פיתוח תוכנה", icon: "SW", industry: "tech", roles: ["מפתח/ת Full Stack", "מפתח/ת Backend", "מפתח/ת Frontend", "מפתח/ת Mobile", "מפתח/ת AI"] },
  { id: "design", label: "עיצוב UX/UI", icon: "UX", industry: "tech", roles: ["מעצב/ת UI", "מעצב/ת UX", "מעצב/ת גרפי", "Illustrator"] },
  { id: "devops", label: "DevOps ותשתיות", icon: "OPS", industry: "tech", roles: ["DevOps Engineer", "Cloud Architect", "SRE", "Network Engineer"] },
  { id: "product", label: "ניהול מוצר", icon: "PM", industry: "tech", roles: ["מנהל/ת מוצר", "Product Analyst", "Scrum Master", "QA Engineer"] },

  { id: "school", label: "בית ספר", icon: "SCH", industry: "education", roles: ["מורה לאנגלית", "מורה למתמטיקה", "מורה למדעים", "מחנך/ת", "יועץ/ת חינוכי/ת"] },
  { id: "tutoring", label: "שיעורים פרטיים", icon: "TUT", industry: "education", roles: ["מורה פרטי/ת", "מתרגל/ת", "מדריך/ה אקדמי/ת"] },
  { id: "kindergarten", label: "גן ילדים", icon: "KDG", industry: "education", roles: ["גננת", "סייעת גן", "מטפלת"] },
  { id: "higher_ed", label: "השכלה גבוהה", icon: "UNI", industry: "education", roles: ["מרצה", "עוזר/ת הוראה", "חוקר/ת", "מנהל/ת מחלקה"] },

  { id: "electrical", label: "חשמל", icon: "ELC", industry: "construction", roles: ["חשמלאי/ת", "טכנאי/ת חשמל", "מתקין/ת מערכות", "מנהל/ת עבודה"] },
  { id: "plumbing", label: "אינסטלציה", icon: "PLB", industry: "construction", roles: ["אינסטלטור/ית", "טכנאי/ת מים", "מתקין/ת גז"] },
  { id: "carpentry", label: "נגרות ורהיטים", icon: "CAR", industry: "construction", roles: ["נגר/ית", "מעצב/ת פנים", "מתקין/ת ריהוט", "מתקין/ת מטבחים"] },
  { id: "general_contractor", label: "קבלנות כללית", icon: "CTR", industry: "construction", roles: ["קבלן/ית", "מנהל/ת פרויקט", "פועל/ת בניין", "טייח/ית"] },

  { id: "restaurant", label: "מסעדות", icon: "RST", industry: "daily", roles: ["מלצר/ית", "שף/שפית", "עוזר/ת שף", "קופאי/ת", "מארח/ת"] },
  { id: "bar", label: "בר ומועדון", icon: "BAR", industry: "daily", roles: ["ברמן/ית", "DJ", "מאבטח/ת", "מנהל/ת משמרת"] },
  { id: "events", label: "אירועים", icon: "EVT", industry: "daily", roles: ["מלצר/ית אירועים", "מארח/ת אירועים", "טבח/ית", "מנהל/ת אירוע", "צלם/ת"] },
  { id: "cleaning", label: "ניקיון ותחזוקה", icon: "CLN", industry: "daily", roles: ["עובד/ת ניקיון", "מנהל/ת צוות", "טכנאי/ת תחזוקה"] },

  { id: "call_center", label: "מוקד ושירות לקוחות", icon: "CC", industry: "communication", roles: ["נציג/ת שירות", "נציג/ת מכירות", "ראש צוות מוקד", "נציג/ת תמיכה"] },
  { id: "digital_media", label: "מדיה ותוכן", icon: "DM", industry: "communication", roles: ["יוצר/ת תוכן", "מנהל/ת סושיאל", "קופירייטר/ית", "עורך/ת וידאו"] },
  { id: "telecom", label: "טלקום ותשתיות תקשורת", icon: "TEL", industry: "communication", roles: ["טכנאי/ת תקשורת", "מתקין/ת סיבים", "מהנדס/ת רשת", "נציג/ת תפעול"] },
  { id: "public_relations", label: "יחסי ציבור ודוברות", icon: "PR", industry: "communication", roles: ["איש/אשת יחסי ציבור", "דובר/ת", "מנהל/ת קמפיינים", "תקציבאי/ת"] },

  { id: "health_insurance", label: "ביטוח בריאות", icon: "HLT", industry: "insurance", roles: ["נציג/ת ביטוח בריאות", "חתם/ת רפואי", "מיישב/ת תביעות בריאות", "מנהל/ת תיקי לקוחות"] },
  { id: "claims", label: "תביעות ושירות", icon: "CLM", industry: "insurance", roles: ["מיישב/ת תביעות", "רכז/ת שירות", "בודק/ת מסמכים", "מנהל/ת לקוחות"] },
  { id: "underwriting", label: "חיתום וסיכונים", icon: "UWR", industry: "insurance", roles: ["חתם/ת", "אנליסט/ית סיכונים", "אקטואר/ית", "רכז/ת חיתום"] },
  { id: "pension", label: "פנסיה וחיסכון", icon: "PEN", industry: "insurance", roles: ["יועץ/ת פנסיוני/ת", "נציג/ת שימור", "מנהל/ת תיק לקוח", "רכז/ת תפעול"] },
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
