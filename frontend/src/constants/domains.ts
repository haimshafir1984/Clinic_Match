// ShiftMatch — Multi-Industry Domains Configuration

export type Industry = "medical" | "tech" | "education" | "construction" | "daily";

export type WorkplaceDomain =
  // medical
  | "dental" | "optics" | "aesthetics" | "physio"
  // tech
  | "software" | "design" | "devops" | "product"
  // education
  | "school" | "tutoring" | "kindergarten" | "higher_ed"
  // construction
  | "electrical" | "plumbing" | "carpentry" | "general_contractor"
  // daily
  | "restaurant" | "bar" | "events" | "cleaning";

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
  { id: "medical",      label: "רפואה ובריאות",       icon: "🏥", domains: ["dental","optics","aesthetics","physio"] },
  { id: "tech",         label: "הייטק וטכנולוגיה",    icon: "💻", domains: ["software","design","devops","product"] },
  { id: "education",    label: "חינוך והוראה",        icon: "📚", domains: ["school","tutoring","kindergarten","higher_ed"] },
  { id: "construction", label: "בנייה ותחזוקה",       icon: "🔨", domains: ["electrical","plumbing","carpentry","general_contractor"] },
  { id: "daily",        label: "מקצועות יומיים",      icon: "🍺", domains: ["restaurant","bar","events","cleaning"] },
];

export const DOMAINS: DomainConfig[] = [
  // ── MEDICAL ──────────────────────────────────────────
  { id: "dental",    label: "רפואת שיניים", icon: "🦷", industry: "medical",
    roles: ["רופא שיניים","סייע/ת שיניים","שיננית","מזכירה רפואית","מנהל/ת מרפאה"] },
  { id: "optics",    label: "אופטיקה",      icon: "👓", industry: "medical",
    roles: ["אופטומטריסט","אופטיקאי","יועץ/ת מכירות","מנהל/ת חנות"] },
  { id: "aesthetics",label: "אסתטיקה",     icon: "💉", industry: "medical",
    roles: ["רופא אסתטיקה","אחות","קוסמטיקאית","יועץ/ת יופי"] },
  { id: "physio",    label: "פיזיותרפיה",  icon: "🦴", industry: "medical",
    roles: ["פיזיותרפיסט","הידרותרפיסט","מעסה","מזכיר/ה"] },

  // ── TECH ─────────────────────────────────────────────
  { id: "software",  label: "פיתוח תוכנה",  icon: "👨‍💻", industry: "tech",
    roles: ["מפתח/ת Full Stack","מפתח/ת Backend","מפתח/ת Frontend","מפתח/ת Mobile","מפתח/ת ML/AI"] },
  { id: "design",    label: "עיצוב UX/UI",  icon: "🎨", industry: "tech",
    roles: ["מעצב/ת UI","מעצב/ת UX","מעצב/ת גרפי","Illustrator"] },
  { id: "devops",    label: "DevOps ותשתיות",icon: "⚙️", industry: "tech",
    roles: ["DevOps Engineer","Cloud Architect","SRE","Network Engineer"] },
  { id: "product",   label: "ניהול מוצר",   icon: "📋", industry: "tech",
    roles: ["מנהל/ת מוצר","Product Analyst","Scrum Master","QA Engineer"] },

  // ── EDUCATION ─────────────────────────────────────────
  { id: "school",       label: "בית ספר",       icon: "🏫", industry: "education",
    roles: ["מורה לאנגלית","מורה למתמטיקה","מורה למדעים","מחנך/ת","יועץ/ת חינוכי/ת"] },
  { id: "tutoring",     label: "שיעורים פרטיים",icon: "📖", industry: "education",
    roles: ["מורה פרטי/ת","מתרגל/ת","מדריך/ה אקדמי/ת"] },
  { id: "kindergarten", label: "גן ילדים",      icon: "🧒", industry: "education",
    roles: ["גננת","סייעת גן","מטפלת"] },
  { id: "higher_ed",    label: "השכלה גבוהה",   icon: "🎓", industry: "education",
    roles: ["מרצה","עוזר/ת הוראה","חוקר/ת","מנהל/ת מחלקה"] },

  // ── CONSTRUCTION ──────────────────────────────────────
  { id: "electrical",        label: "חשמל",         icon: "⚡", industry: "construction",
    roles: ["חשמלאי/ת","טכנאי/ת חשמל","מתקין/ת מערכות","מנהל/ת עבודה"] },
  { id: "plumbing",          label: "אינסטלציה",    icon: "🔧", industry: "construction",
    roles: ["אינסטלטור/ית","טכנאי/ת מים","מתקין/ת גז"] },
  { id: "carpentry",         label: "נגרות ורהיטים",icon: "🪵", industry: "construction",
    roles: ["נגר/ית","מעצב/ת פנים","מתקין/ת ריצוף","מתקין/ת מטבחים"] },
  { id: "general_contractor",label: "קבלנות כללית", icon: "🏗️", industry: "construction",
    roles: ["קבלן/ית","מנהל/ת פרויקט","פועל/ת בניין","טייח/ית"] },

  // ── DAILY ─────────────────────────────────────────────
  { id: "restaurant",label: "מסעדות",          icon: "🍽️", industry: "daily",
    roles: ["מלצר/ית","שף/שפית","עוזר/ת שף","קופאי/ת","מארח/ת"] },
  { id: "bar",       label: "בר ומועדון",      icon: "🍸", industry: "daily",
    roles: ["ברמן/ית","DJ","מאבטח/ת","מנהל/ת משמרת"] },
  { id: "events",    label: "אירועים",          icon: "🎉", industry: "daily",
    roles: ["מלצר/ית אירועים","מארח/ת אירועים","טבח/ית","מנהל/ת אירוע","צלם/ת"] },
  { id: "cleaning",  label: "ניקיון ותחזוקה",  icon: "🧹", industry: "daily",
    roles: ["עובד/ת ניקיון","מנהל/ת צוות","טכנאי/ת תחזוקה"] },
];

export function getRolesByDomain(domain: WorkplaceDomain): string[] {
  return DOMAINS.find((d) => d.id === domain)?.roles || [];
}

export function getDomainConfig(domain: WorkplaceDomain): DomainConfig | undefined {
  return DOMAINS.find((d) => d.id === domain);
}

export function getDomainsByIndustry(industry: Industry): DomainConfig[] {
  return DOMAINS.filter((d) => d.industry === industry);
}

export function getIndustryConfig(industry: Industry): IndustryConfig | undefined {
  return INDUSTRIES.find((i) => i.id === industry);
}

export function getAllRoles(): string[] {
  return Array.from(new Set(DOMAINS.flatMap((d) => d.roles)));
}
