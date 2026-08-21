// Profile completion logic

// Profile type - matches what API returns (not Supabase types)
interface Profile {
  id?: string;
  name?: string | null;
  role?: "clinic" | "worker" | null;
  position?: string | null;
  positions?: string[] | null;
  required_position?: string | null;
  description?: string | null;
  city?: string | null;
  preferred_area?: string | null;
  cities?: string[] | null;
  radius_km?: number | null;
  experience_years?: number | null;
  availability_date?: string | null;
  availability_days?: string[] | null;
  availability_hours?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  job_type?: "daily" | "temporary" | "permanent" | null;
}

// All fields that contribute to profile completeness
const ALL_PROFILE_FIELDS = [
  "name",
  "position",
  "required_position",
  "description",
  "city",
  "preferred_area",
  "availability_days",
  "availability_hours",
  "availability_date",
  "salary_min",
  "salary_max",
  "job_type",
  "experience_years",
] as const;

export interface ProfileCompletionResult {
  isComplete: boolean;
  percentage: number;
  missingRequiredFields: string[];
  filledFields: string[];
  totalFields: number;
}

const FIELD_LABELS: Record<string, string> = {
  name: "שם",
  position: "מקצוע",
  required_position: "תפקיד מבוקש",
  description: "תיאור",
  city: "עיר",
  preferred_area: "עיר מועדפת",
  availability_days: "ימי זמינות",
  availability_hours: "שעות זמינות",
  availability_date: "תאריך התחלה",
  salary_min: "שכר מינימום",
  salary_max: "שכר מקסימום",
  job_type: "סוג משרה",
  experience_years: "שנות ניסיון",
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return true;
  return Boolean(value);
}

export function calculateProfileCompletion(
  profile: Profile | null
): ProfileCompletionResult {
  if (!profile) {
    return {
      isComplete: false,
      percentage: 0,
      missingRequiredFields: ["name", "role"],
      filledFields: [],
      totalFields: ALL_PROFILE_FIELDS.length,
    };
  }

  const isClinic = profile.role === "clinic";
  const missingRequiredFields: string[] = [];

  // Required: name
  if (!isFieldFilled(profile.name)) {
    missingRequiredFields.push("name");
  }

  // Required: any of position / required_position / positions[].
  // Registration only fills the `positions` array (the role multi-select in
  // step 5), so omitting it here marked every freshly-registered worker as
  // incomplete and bounced them straight back out of the app.
  const hasPosition =
    isFieldFilled(profile.position) ||
    isFieldFilled(profile.required_position) ||
    isFieldFilled(profile.positions);
  if (!hasPosition) {
    missingRequiredFields.push(isClinic ? "required_position" : "position");
  }

  // Required: any of city / preferred_area / cities[] — mirrors the
  // position check above, for the same reason: `cities` is the multi-select
  // field the form actually writes to now, city/preferred_area are the
  // legacy single-value mirrors.
  const hasLocation =
    isFieldFilled(profile.city) ||
    isFieldFilled(profile.preferred_area) ||
    isFieldFilled(profile.cities);
  if (!hasLocation) {
    missingRequiredFields.push(isClinic ? "city" : "preferred_area");
  }

  // Calculate overall percentage
  // city/preferred_area are the same underlying concept for opposite roles
  // (mirrored from `cities`, see below) — excluding the role-inapplicable one
  // here mirrors the existing position/required_position exclusion, and
  // avoids counting one filled value as two separate completed fields.
  const relevantFields = isClinic
    ? ALL_PROFILE_FIELDS.filter((f) => f !== "position" && f !== "experience_years" && f !== "preferred_area")
    : ALL_PROFILE_FIELDS.filter((f) => f !== "required_position" && f !== "city");

  const filledFields: string[] = [];
  for (const field of relevantFields) {
    // The position slot is satisfied by any of the three shapes the app
    // stores it in, so the progress bar matches the required-field check.
    const value =
      field === "position" || field === "required_position"
        ? profile.position || profile.required_position || profile.positions
        : field === "city" || field === "preferred_area"
          ? profile.city || profile.preferred_area || profile.cities
          : profile[field as keyof Profile];
    if (isFieldFilled(value)) {
      filledFields.push(field);
    }
  }

  const percentage = Math.round((filledFields.length / relevantFields.length) * 100);
  const isComplete = missingRequiredFields.length === 0;

  return {
    isComplete,
    percentage,
    missingRequiredFields,
    filledFields,
    totalFields: relevantFields.length,
  };
}
