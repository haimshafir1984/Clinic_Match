# ShiftMatch ג€” Claude Code Implementation Prompt

## INSTRUCTIONS FOR CLAUDE CODE
- Edit only files listed under each task. Touch nothing else.
- After ALL tasks: `git add -A && git commit -m "feat: expand to ShiftMatch ג€” multi-industry platform" && git push`
- Final output: one line per file changed + commit hash. Nothing else.

---

## CONTEXT (read before starting)

**Project:** `clinic_match/` ג€” React+TS (Vite) frontend + Node/Express backend (single file: `backend/server.js`) + PostgreSQL.

**Goal:** Expand from medical-only to 5 industries. Rename app to **ShiftMatch**. Add `industry` column to DB for feed filtering.

**Industries to add (alongside existing medical domains):**
| industry key | label | icon |
|---|---|---|
| `medical` | ׳¨׳₪׳•׳׳” ׳•׳‘׳¨׳™׳׳•׳× | נ¥ |
| `tech` | ׳”׳™׳™׳˜׳§ ׳•׳˜׳›׳ ׳•׳׳•׳’׳™׳” | נ’» |
| `education` | ׳—׳™׳ ׳•׳ ׳•׳”׳•׳¨׳׳” | נ“ |
| `construction` | ׳‘׳ ׳™׳™׳” ׳•׳×׳—׳–׳•׳§׳” | נ”¨ |
| `daily` | ׳׳§׳¦׳•׳¢׳•׳× ׳™׳•׳׳™׳™׳ | נ÷ |

**`job_type` field** (already exists as `JobType = "daily"|"temporary"|"permanent"` in types) ג€” shown/edited in `/profile` only, NOT in registration flow.

---

## TASK 1 ג€” `frontend/src/constants/domains.ts` (FULL REPLACE)

Replace entire file with:

```typescript
// ShiftMatch ג€” Multi-Industry Domains Configuration

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
  { id: "medical",      label: "׳¨׳₪׳•׳׳” ׳•׳‘׳¨׳™׳׳•׳×",       icon: "נ¥", domains: ["dental","optics","aesthetics","physio"] },
  { id: "tech",         label: "׳”׳™׳™׳˜׳§ ׳•׳˜׳›׳ ׳•׳׳•׳’׳™׳”",    icon: "נ’»", domains: ["software","design","devops","product"] },
  { id: "education",    label: "׳—׳™׳ ׳•׳ ׳•׳”׳•׳¨׳׳”",        icon: "נ“", domains: ["school","tutoring","kindergarten","higher_ed"] },
  { id: "construction", label: "׳‘׳ ׳™׳™׳” ׳•׳×׳—׳–׳•׳§׳”",       icon: "נ”¨", domains: ["electrical","plumbing","carpentry","general_contractor"] },
  { id: "daily",        label: "׳׳§׳¦׳•׳¢׳•׳× ׳™׳•׳׳™׳™׳",      icon: "נ÷", domains: ["restaurant","bar","events","cleaning"] },
];

export const DOMAINS: DomainConfig[] = [
  // ג”€ג”€ MEDICAL ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  { id: "dental",    label: "׳¨׳₪׳•׳׳× ׳©׳™׳ ׳™׳™׳", icon: "נ¦·", industry: "medical",
    roles: ["׳¨׳•׳₪׳ ׳©׳™׳ ׳™׳™׳","׳¡׳™׳™׳¢/׳× ׳©׳™׳ ׳™׳™׳","׳©׳™׳ ׳ ׳™׳×","׳׳–׳›׳™׳¨׳” ׳¨׳₪׳•׳׳™׳×","׳׳ ׳”׳/׳× ׳׳¨׳₪׳׳”"] },
  { id: "optics",    label: "׳׳•׳₪׳˜׳™׳§׳”",      icon: "נ‘“", industry: "medical",
    roles: ["׳׳•׳₪׳˜׳•׳׳˜׳¨׳™׳¡׳˜","׳׳•׳₪׳˜׳™׳§׳׳™","׳™׳•׳¢׳¥/׳× ׳׳›׳™׳¨׳•׳×","׳׳ ׳”׳/׳× ׳—׳ ׳•׳×"] },
  { id: "aesthetics",label: "׳׳¡׳×׳˜׳™׳§׳”",     icon: "נ’‰", industry: "medical",
    roles: ["׳¨׳•׳₪׳ ׳׳¡׳×׳˜׳™׳§׳”","׳׳—׳•׳×","׳§׳•׳¡׳׳˜׳™׳§׳׳™׳×","׳™׳•׳¢׳¥/׳× ׳™׳•׳₪׳™"] },
  { id: "physio",    label: "׳₪׳™׳–׳™׳•׳×׳¨׳₪׳™׳”",  icon: "נ¦´", industry: "medical",
    roles: ["׳₪׳™׳–׳™׳•׳×׳¨׳₪׳™׳¡׳˜","׳”׳™׳“׳¨׳•׳×׳¨׳₪׳™׳¡׳˜","׳׳¢׳¡׳”","׳׳–׳›׳™׳¨/׳”"] },

  // ג”€ג”€ TECH ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  { id: "software",  label: "׳₪׳™׳×׳•׳— ׳×׳•׳›׳ ׳”",  icon: "נ‘¨ג€נ’»", industry: "tech",
    roles: ["׳׳₪׳×׳—/׳× Full Stack","׳׳₪׳×׳—/׳× Backend","׳׳₪׳×׳—/׳× Frontend","׳׳₪׳×׳—/׳× Mobile","׳׳₪׳×׳—/׳× ML/AI"] },
  { id: "design",    label: "׳¢׳™׳¦׳•׳‘ UX/UI",  icon: "נ¨", industry: "tech",
    roles: ["׳׳¢׳¦׳‘/׳× UI","׳׳¢׳¦׳‘/׳× UX","׳׳¢׳¦׳‘/׳× ׳’׳¨׳₪׳™","Illustrator"] },
  { id: "devops",    label: "DevOps ׳•׳×׳©׳×׳™׳•׳×",icon: "ג™ן¸", industry: "tech",
    roles: ["DevOps Engineer","Cloud Architect","SRE","Network Engineer"] },
  { id: "product",   label: "׳ ׳™׳”׳•׳ ׳׳•׳¦׳¨",   icon: "נ“‹", industry: "tech",
    roles: ["׳׳ ׳”׳/׳× ׳׳•׳¦׳¨","Product Analyst","Scrum Master","QA Engineer"] },

  // ג”€ג”€ EDUCATION ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  { id: "school",       label: "׳‘׳™׳× ׳¡׳₪׳¨",       icon: "נ«", industry: "education",
    roles: ["׳׳•׳¨׳” ׳׳׳ ׳’׳׳™׳×","׳׳•׳¨׳” ׳׳׳×׳׳˜׳™׳§׳”","׳׳•׳¨׳” ׳׳׳“׳¢׳™׳","׳׳—׳ ׳/׳×","׳™׳•׳¢׳¥/׳× ׳—׳™׳ ׳•׳›׳™/׳×"] },
  { id: "tutoring",     label: "׳©׳™׳¢׳•׳¨׳™׳ ׳₪׳¨׳˜׳™׳™׳",icon: "נ“–", industry: "education",
    roles: ["׳׳•׳¨׳” ׳₪׳¨׳˜׳™/׳×","׳׳×׳¨׳’׳/׳×","׳׳“׳¨׳™׳/׳” ׳׳§׳“׳׳™/׳×"] },
  { id: "kindergarten", label: "׳’׳ ׳™׳׳“׳™׳",      icon: "נ§’", industry: "education",
    roles: ["׳’׳ ׳ ׳×","׳¡׳™׳™׳¢׳× ׳’׳","׳׳˜׳₪׳׳×"] },
  { id: "higher_ed",    label: "׳”׳©׳›׳׳” ׳’׳‘׳•׳”׳”",   icon: "נ“", industry: "education",
    roles: ["׳׳¨׳¦׳”","׳¢׳•׳–׳¨/׳× ׳”׳•׳¨׳׳”","׳—׳•׳§׳¨/׳×","׳׳ ׳”׳/׳× ׳׳—׳׳§׳”"] },

  // ג”€ג”€ CONSTRUCTION ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  { id: "electrical",        label: "׳—׳©׳׳",         icon: "ג¡", industry: "construction",
    roles: ["׳—׳©׳׳׳׳™/׳×","׳˜׳›׳ ׳׳™/׳× ׳—׳©׳׳","׳׳×׳§׳™׳/׳× ׳׳¢׳¨׳›׳•׳×","׳׳ ׳”׳/׳× ׳¢׳‘׳•׳“׳”"] },
  { id: "plumbing",          label: "׳׳™׳ ׳¡׳˜׳׳¦׳™׳”",    icon: "נ”§", industry: "construction",
    roles: ["׳׳™׳ ׳¡׳˜׳׳˜׳•׳¨/׳™׳×","׳˜׳›׳ ׳׳™/׳× ׳׳™׳","׳׳×׳§׳™׳/׳× ׳’׳–"] },
  { id: "carpentry",         label: "׳ ׳’׳¨׳•׳× ׳•׳¨׳”׳™׳˜׳™׳",icon: "נ×µ", industry: "construction",
    roles: ["׳ ׳’׳¨/׳™׳×","׳׳¢׳¦׳‘/׳× ׳₪׳ ׳™׳","׳׳×׳§׳™׳/׳× ׳¨׳™׳¦׳•׳£","׳׳×׳§׳™׳/׳× ׳׳˜׳‘׳—׳™׳"] },
  { id: "general_contractor",label: "׳§׳‘׳׳ ׳•׳× ׳›׳׳׳™׳×", icon: "נ—ן¸", industry: "construction",
    roles: ["׳§׳‘׳׳/׳™׳×","׳׳ ׳”׳/׳× ׳₪׳¨׳•׳™׳§׳˜","׳₪׳•׳¢׳/׳× ׳‘׳ ׳™׳™׳","׳˜׳™׳™׳—/׳™׳×"] },

  // ג”€ג”€ DAILY ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
  { id: "restaurant",label: "׳׳¡׳¢׳“׳•׳×",          icon: "נ½ן¸", industry: "daily",
    roles: ["׳׳׳¦׳¨/׳™׳×","׳©׳£/׳©׳₪׳™׳×","׳¢׳•׳–׳¨/׳× ׳©׳£","׳§׳•׳₪׳׳™/׳×","׳׳׳¨׳—/׳×"] },
  { id: "bar",       label: "׳‘׳¨ ׳•׳׳•׳¢׳“׳•׳",      icon: "נ¸", industry: "daily",
    roles: ["׳‘׳¨׳׳/׳™׳×","DJ","׳׳׳‘׳˜׳—/׳×","׳׳ ׳”׳/׳× ׳׳©׳׳¨׳×"] },
  { id: "events",    label: "׳׳™׳¨׳•׳¢׳™׳",          icon: "נ‰", industry: "daily",
    roles: ["׳׳׳¦׳¨/׳™׳× ׳׳™׳¨׳•׳¢׳™׳","׳׳׳¨׳—/׳× ׳׳™׳¨׳•׳¢׳™׳","׳˜׳‘׳—/׳™׳×","׳׳ ׳”׳/׳× ׳׳™׳¨׳•׳¢","׳¦׳׳/׳×"] },
  { id: "cleaning",  label: "׳ ׳™׳§׳™׳•׳ ׳•׳×׳—׳–׳•׳§׳”",  icon: "נ§¹", industry: "daily",
    roles: ["׳¢׳•׳‘׳“/׳× ׳ ׳™׳§׳™׳•׳","׳׳ ׳”׳/׳× ׳¦׳•׳•׳×","׳˜׳›׳ ׳׳™/׳× ׳×׳—׳–׳•׳§׳”"] },
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

## TASK 2 ג€” `frontend/src/types/index.ts`

Add `Industry` import and `industry` field to `CurrentUser`. Add after line `export type SwipeType = "LIKE" | "PASS";`:

```typescript
export type Industry = "medical" | "tech" | "education" | "construction" | "daily";
```

In `CurrentUser` interface, add after `location?: string | null;`:
```typescript
  industry?: Industry | null;
```

---

## TASK 3 ג€” `frontend/src/components/registration/DomainSelector.tsx` (FULL REPLACE)

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
        <p className="text-center text-muted-foreground">׳‘׳׳™׳–׳” ׳×׳—׳•׳ ׳׳×/׳” ׳¢׳•׳‘׳“/׳×?</p>
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
          ׳—׳–׳¨׳”
        </Button>
        <span className="text-sm text-muted-foreground">{industryConfig.icon} {industryConfig.label}</span>
      </div>
      <p className="text-center text-muted-foreground text-sm">׳‘׳—׳¨׳• ׳×׳—׳•׳ ׳¡׳₪׳¦׳™׳₪׳™</p>
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

## TASK 4 ג€” `frontend/src/pages/Register.tsx`

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

**4d.** Update `DomainSelector` usage in the `domain` case of `renderStep()` ג€” change `onChange={handleDomainSelect}` (signature already matches after 4c).

**4e.** In `handleSubmit`, update `signUp` call ג€” add `industry` to the payload:
```typescript
workplace_types: workplaceDomain ? [workplaceDomain] : [],
industry: industry || undefined,
```

**4f.** Replace all occurrences of `ClinicMatch` text in JSX with `ShiftMatch`. Replace the subtitle `׳”׳₪׳׳˜׳₪׳•׳¨׳׳” ׳׳”׳×׳׳׳•׳× ׳‘׳×׳—׳•׳ ׳”׳¨׳₪׳•׳׳”` with `׳”׳₪׳׳˜׳₪׳•׳¨׳׳” ׳׳”׳×׳׳׳•׳× ׳‘׳›׳ ׳×׳—׳•׳`. Replace `Stethoscope` icon with `Briefcase` (add to lucide import, remove `Stethoscope`).

**4g.** Replace `"׳”׳¦׳˜׳¨׳₪׳• ׳-ClinicMatch"` CardTitle with `"׳”׳¦׳˜׳¨׳₪׳• ׳-ShiftMatch"`.

---

## TASK 5 ג€” `frontend/src/lib/api.ts`

**5a.** In the `createProfile` / `signUp` function that calls `POST /api/profiles`, ensure `industry` is passed through from the payload parameter to the request body. Find where `workplace_types` is sent and add `industry: data.industry || null` alongside it.

**5b.** In the feed response transform function (where `workplace_types`, `positions` are mapped from snake_case), add:
```typescript
industry: profile.industry || null,
```

---

## TASK 6 ג€” `backend/server.js`

**6a.** In `POST /api/profiles` ג€” add `industry` to destructuring:
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

## TASK 7 ג€” `frontend/src/components/layout/TopHeader.tsx` and any file containing the string `"ClinicMatch"` as displayed app name

Search for JSX/string occurrences of `ClinicMatch` (the displayed name, not import paths or variable names) and replace with `ShiftMatch`.

Also search for `"׳”׳₪׳׳˜׳₪׳•׳¨׳׳” ׳׳”׳×׳׳׳•׳× ׳‘׳×׳—׳•׳ ׳”׳¨׳₪׳•׳׳”"` and replace with `"׳”׳×׳׳׳•׳× ׳¢׳‘׳•׳“׳” ׳‘׳›׳ ׳×׳—׳•׳"`.

---

## TASK 8 ג€” COMMIT & PUSH

```bash
git add -A
git commit -m "feat: expand to ShiftMatch ג€” 5 industries (medical/tech/education/construction/daily), industry-based feed filtering, 2-level domain selector"
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

