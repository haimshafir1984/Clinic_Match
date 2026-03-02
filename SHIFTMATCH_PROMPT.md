# ShiftMatch — Claude Code Implementation Prompt

## INSTRUCTIONS FOR CLAUDE CODE
- Edit only files listed under each task. Touch nothing else.
- After ALL tasks: `git add -A && git commit -m "feat: expand to ShiftMatch — multi-industry platform" && git push`
- Final output: one line per file changed + commit hash. Nothing else.

---

## CONTEXT (read before starting)

**Project:** `clinic_match/` — React+TS (Vite) frontend + Node/Express backend (single file: `backend/server.js`) + PostgreSQL.

**Goal:** Expand from medical-only to 5 industries. Rename app to **ShiftMatch**. Add `industry` column to DB for feed filtering.

**Industries to add (alongside existing medical domains):**
| industry key | label | icon |
|---|---|---|
| `medical` | רפואה ובריאות | 🏥 |
| `tech` | הייטק וטכנולוגיה | 💻 |
| `education` | חינוך והוראה | 📚 |
| `construction` | בנייה ותחזוקה | 🔨 |
| `daily` | מקצועות יומיים | 🍺 |

**`job_type` field** (already exists as `JobType = "daily"|"temporary"|"permanent"` in types) — shown/edited in `/profile` only, NOT in registration flow.

---

## TASK 1 — `frontend/src/constants/domains.ts` (FULL REPLACE)

Replace entire file with:

```typescript
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
```

---

## TASK 2 — `frontend/src/types/index.ts`

Add `Industry` import and `industry` field to `CurrentUser`. Add after line `export type SwipeType = "LIKE" | "PASS";`:

```typescript
export type Industry = "medical" | "tech" | "education" | "construction" | "daily";
```

In `CurrentUser` interface, add after `location?: string | null;`:
```typescript
  industry?: Industry | null;
```

---

## TASK 3 — `frontend/src/components/registration/DomainSelector.tsx` (FULL REPLACE)

Replace entire file. The component now has **two levels**: first pick industry, then pick sub-domain within that industry.

```typescript
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
```

---

## TASK 4 — `frontend/src/pages/Register.tsx`

**4a.** Add `Industry` to the import from `@/constants/domains`:
```typescript
import { WorkplaceDomain, Industry } from "@/constants/domains";
```

**4b.** Add `industry` state after `workplaceDomain` state:
```typescript
const [industry, setIndustry] = useState<Industry | null>(null);
```

**4c.** Replace `handleDomainSelect`:
```typescript
const handleDomainSelect = (domain: WorkplaceDomain, selectedIndustry: Industry) => {
  setWorkplaceDomain(domain);
  setIndustry(selectedIndustry);
  setPositions([]);
  goToNextStep();
};
```

**4d.** Update `DomainSelector` usage in the `domain` case of `renderStep()` — change `onChange={handleDomainSelect}` (signature already matches after 4c).

**4e.** In `handleSubmit`, update `signUp` call — add `industry` to the payload:
```typescript
workplace_types: workplaceDomain ? [workplaceDomain] : [],
industry: industry || undefined,
```

**4f.** Replace all occurrences of `ClinicMatch` text in JSX with `ShiftMatch`. Replace the subtitle `הפלטפורמה להתאמות בתחום הרפואה` with `הפלטפורמה להתאמות בכל תחום`. Replace `Stethoscope` icon with `Briefcase` (add to lucide import, remove `Stethoscope`).

**4g.** Replace `"הצטרפו ל-ClinicMatch"` CardTitle with `"הצטרפו ל-ShiftMatch"`.

---

## TASK 5 — `frontend/src/lib/api.ts`

**5a.** In the `createProfile` / `signUp` function that calls `POST /api/profiles`, ensure `industry` is passed through from the payload parameter to the request body. Find where `workplace_types` is sent and add `industry: data.industry || null` alongside it.

**5b.** In the feed response transform function (where `workplace_types`, `positions` are mapped from snake_case), add:
```typescript
industry: profile.industry || null,
```

---

## TASK 6 — `backend/server.js`

**6a.** In `POST /api/profiles` — add `industry` to destructuring:
```javascript
const {
  email, role, name, position, location, salary_info, availability,
  workplace_types, positions, industry,
  screening_questions, is_auto_screener_active, is_urgent
} = req.body;
```

**6b.** In the INSERT query of `POST /api/profiles`, add `industry` column:
- Add `industry` to the column list (after `positions`)
- Add `$13` to VALUES
- Add `industry = EXCLUDED.industry` to ON CONFLICT DO UPDATE SET
- Add `industry || null` as the 13th value in the values array

**6c.** In `GET /api/feed/:userId`, update the user SELECT to also fetch `industry`:
```javascript
const userRes = await pool.query(
  'SELECT role, positions, workplace_types, location, industry FROM profiles WHERE id = $1',
  [userId]
);
```

**6d.** In `GET /api/feed/:userId`, update the feed query to filter by industry when present. Replace the WHERE clause:

Current:
```javascript
AND (workplace_types && $2 OR $2 = '{}')
AND (positions && $3 OR $3 = '{}')
AND ($4::text IS NULL OR location = $4::text)
AND id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = $5)
AND id != $5
```

New (add industry filter as $6):
```javascript
AND (workplace_types && $2 OR $2 = '{}')
AND (positions && $3 OR $3 = '{}')
AND ($4::text IS NULL OR location = $4::text)
AND ($6::text IS NULL OR industry = $6::text)
AND id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = $5)
AND id != $5
```

Update the query call to pass 6 params:
```javascript
const feed = await pool.query(query, [
  targetRole,
  user.workplace_types || [],
  user.positions || [],
  user.location,
  userId,
  user.industry || null
]);
```

---

## TASK 7 — `frontend/src/components/layout/TopHeader.tsx` and any file containing the string `"ClinicMatch"` as displayed app name

Search for JSX/string occurrences of `ClinicMatch` (the displayed name, not import paths or variable names) and replace with `ShiftMatch`.

Also search for `"הפלטפורמה להתאמות בתחום הרפואה"` and replace with `"התאמות עבודה בכל תחום"`.

---

## TASK 8 — COMMIT & PUSH

```bash
git add -A
git commit -m "feat: expand to ShiftMatch — 5 industries (medical/tech/education/construction/daily), industry-based feed filtering, 2-level domain selector"
git push
```

Print only: list of changed files + commit hash.

---

## WHAT NOT TO DO
- Do NOT change routing paths
- Do NOT touch `Profile.tsx` job_type field (already exists)
- Do NOT change auth logic, swipe logic, chat logic, or admin panel
- Do NOT add npm packages
- Do NOT change DB schema (SQL is handled separately below)
- Do NOT rewrite files not listed above
