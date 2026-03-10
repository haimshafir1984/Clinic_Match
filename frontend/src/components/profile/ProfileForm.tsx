import { useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Building2, Calendar, CheckCircle2, Loader2, MapPin, Sparkles, Upload, User, UserRound, X } from "lucide-react";
import { useCreateProfile, useUpdateProfile, ProfileFormInput } from "@/hooks/useProfile";
import { DomainSelector } from "@/components/registration/DomainSelector";
import { RoleMultiSelector } from "@/components/registration/RoleMultiSelector";
import { RecruitmentAutomationTab } from "@/components/profile/RecruitmentAutomationTab";
import { MagicWriteModal } from "@/components/profile/MagicWriteModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CityCombobox } from "@/components/ui/city-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { WorkplaceDomain, getDomainConfig } from "@/constants/domains";

type UserRole = "clinic" | "worker";
type JobType = "daily" | "temporary" | "permanent";

const days = [
  { value: "sunday", label: "ראשון" },
  { value: "monday", label: "שני" },
  { value: "tuesday", label: "שלישי" },
  { value: "wednesday", label: "רביעי" },
  { value: "thursday", label: "חמישי" },
  { value: "friday", label: "שישי" },
  { value: "saturday", label: "שבת" },
];

const profileSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים").max(50, "שם ארוך מדי"),
  role: z.enum(["clinic", "worker"]),
  description: z.string().max(500, "תיאור ארוך מדי").optional().or(z.literal("")),
  city: z.string().optional(),
  preferred_area: z.string().optional(),
  radius_km: z.number().min(1).max(100).nullable().optional(),
  experience_years: z.number().min(0).max(50).nullable().optional(),
  availability_date: z.string().optional(),
  availability_days: z.array(z.string()).optional(),
  availability_hours: z.string().optional(),
  salary_min: z.number().min(0).nullable().optional(),
  salary_max: z.number().min(0).nullable().optional(),
  job_type: z.enum(["daily", "temporary", "permanent"]).nullable().optional(),
}).refine((data) => {
  if (data.salary_min != null && data.salary_max != null) {
    return data.salary_min <= data.salary_max;
  }
  return true;
}, {
  message: "שכר מינימום חייב להיות קטן או שווה לשכר מקסימום",
  path: ["salary_min"],
});

type FormData = z.infer<typeof profileSchema>;

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: "clinic" | "worker";
  position?: string | null;
  positions?: string[] | null;
  workplace_types?: string[] | null;
  required_position?: string | null;
  description?: string | null;
  city?: string | null;
  preferred_area?: string | null;
  radius_km?: number | null;
  experience_years?: number | null;
  availability_date?: string | null;
  availability_days?: string[] | null;
  availability_hours?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  job_type?: JobType | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  screening_questions?: string[] | null;
  is_auto_screener_active?: boolean | null;
  is_urgent?: boolean | null;
}

interface ProfileFormProps {
  initialData?: Profile | null;
  onSuccess: () => void;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}

function MediaPicker({
  label,
  value,
  fallbackIcon,
  onChange,
}: {
  label: string;
  value: string | null;
  fallbackIcon: React.ReactNode;
  onChange: (value: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("אפשר להעלות רק קובץ תמונה");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("גודל התמונה המקסימלי הוא 2MB");
      return;
    }

    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העלאת התמונה נכשלה");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border">
          <AvatarImage src={value || undefined} />
          <AvatarFallback>{fallbackIcon}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <Label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              העלאת קובץ
            </span>
          </Label>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="justify-start px-0 text-destructive">
              <X className="mr-1 h-4 w-4" />
              הסר תמונה
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfileForm({ initialData, onSuccess }: ProfileFormProps) {
  const [role, setRole] = useState<UserRole | null>(initialData?.role || null);
  const [selectedDomain, setSelectedDomain] = useState<WorkplaceDomain | null>((initialData?.workplace_types?.[0] as WorkplaceDomain) || null);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(initialData?.positions || (initialData?.position ? [initialData.position] : []));
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>(initialData?.screening_questions || []);
  const [isAutoScreenerActive, setIsAutoScreenerActive] = useState(initialData?.is_auto_screener_active || false);
  const [isUrgent, setIsUrgent] = useState(initialData?.is_urgent || false);
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || null);
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url || null);
  const [showMagicWrite, setShowMagicWrite] = useState(false);

  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialData?.name || "",
      role: initialData?.role || undefined,
      description: initialData?.description || "",
      city: initialData?.city || "",
      preferred_area: initialData?.preferred_area || "",
      radius_km: initialData?.radius_km ?? 10,
      experience_years: initialData?.experience_years ?? 0,
      availability_date: initialData?.availability_date || "",
      availability_days: initialData?.availability_days || [],
      availability_hours: initialData?.availability_hours || "",
      salary_min: initialData?.salary_min ?? null,
      salary_max: initialData?.salary_max ?? null,
      job_type: initialData?.job_type || null,
    },
  });

  const currentRole = watch("role") || role;
  const isClinic = currentRole === "clinic";
  const isLoading = createProfile.isPending || updateProfile.isPending || isSubmitting;
  const selectedDays = watch("availability_days") || [];

  const previewName = watch("name") || "";
  const primaryImage = isClinic ? logoUrl : avatarUrl;
  const primaryLabel = isClinic ? "לוגו בית העסק" : "תמונת העובד/ת";
  const previewIcon = isClinic ? <Building2 className="h-8 w-8 text-primary" /> : <UserRound className="h-8 w-8 text-primary" />;

  const domainLabel = useMemo(() => (selectedDomain ? getDomainConfig(selectedDomain)?.label : null), [selectedDomain]);

  const submit = async (data: FormData) => {
    if (!currentRole) {
      toast.error("בחר סוג משתמש");
      return;
    }
    if (!selectedDomain) {
      toast.error("בחר תחום");
      return;
    }
    if (selectedPositions.length === 0) {
      toast.error("בחר לפחות תפקיד אחד");
      return;
    }

    const payload: ProfileFormInput = {
      name: data.name,
      role: currentRole,
      position: selectedPositions[0] || null,
      positions: selectedPositions,
      required_position: currentRole === "clinic" ? selectedPositions[0] || null : null,
      workplace_types: [selectedDomain],
      description: data.description || null,
      city: isClinic ? watch("city") || null : null,
      preferred_area: !isClinic ? watch("preferred_area") || null : null,
      radius_km: isClinic ? data.radius_km ?? null : null,
      experience_years: !isClinic ? data.experience_years ?? null : null,
      availability_date: data.availability_date || null,
      availability_days: data.availability_days || [],
      availability_hours: data.availability_hours || null,
      salary_min: data.salary_min ?? null,
      salary_max: data.salary_max ?? null,
      job_type: data.job_type || null,
      screening_questions: screeningQuestions.filter(Boolean),
      is_auto_screener_active: isAutoScreenerActive,
      is_urgent: isUrgent,
      avatar_url: avatarUrl,
      logo_url: logoUrl,
    };

    try {
      if (isEditing) {
        await updateProfile.mutateAsync(payload);
      } else {
        await createProfile.mutateAsync(payload);
      }
      onSuccess();
    } catch (error) {
      toast.error("שגיאה בשמירה", { description: error instanceof Error ? error.message : "לא ניתן לשמור כרגע" });
    }
  };

  if (!role && !initialData) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <p className="text-center text-muted-foreground">איך נרצה לעבוד עם ShiftMatch?</p>
        <div className="grid grid-cols-2 gap-4">
          <Button type="button" variant="outline" className="h-auto flex-col gap-3 py-6" onClick={() => { setRole("clinic"); setValue("role", "clinic"); }}>
            <Building2 className="h-8 w-8 text-primary" />
            <span>בית עסק</span>
          </Button>
          <Button type="button" variant="outline" className="h-auto flex-col gap-3 py-6" onClick={() => { setRole("worker"); setValue("role", "worker"); }}>
            <UserRound className="h-8 w-8 text-primary" />
            <span>עובד/ת</span>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 pb-8">
      <input type="hidden" {...register("role")} value={currentRole || ""} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            פרופיל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MediaPicker
            label={primaryLabel}
            value={primaryImage}
            fallbackIcon={previewIcon}
            onChange={(value) => {
              if (isClinic) {
                setLogoUrl(value);
              } else {
                setAvatarUrl(value);
              }
            }}
          />

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={primaryImage || undefined} />
                <AvatarFallback>{previewIcon}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{previewName || (isClinic ? "בית העסק שלך" : "הפרופיל שלך")}</div>
                <div className="text-sm text-muted-foreground">{domainLabel || "בחר תחום ותפקידים"}</div>
                {selectedPositions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedPositions.map((position) => (
                      <Badge key={position} variant="secondary">{position}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{isClinic ? "שם בית העסק" : "שם מלא"}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>תחום</Label>
            <DomainSelector
              value={selectedDomain}
              onChange={(domain, _industry) => {
                setSelectedDomain(domain);
                setSelectedPositions([]);
              }}
            />
          </div>

          {selectedDomain && (
            <div className="space-y-2">
              <Label>תפקידים</Label>
              <RoleMultiSelector domain={selectedDomain} selectedRoles={selectedPositions} onChange={setSelectedPositions} />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">תיאור</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowMagicWrite(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                כתיבה חכמה
              </Button>
            </div>
            <Textarea id="description" rows={4} {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            מיקום והעדפות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{isClinic ? "עיר" : "אזור מועדף"}</Label>
            <CityCombobox
              value={(isClinic ? watch("city") : watch("preferred_area")) || ""}
              onChange={(value) => setValue(isClinic ? "city" : "preferred_area", value, { shouldValidate: true })}
              placeholder={isClinic ? "בחר עיר" : "בחר אזור"}
            />
          </div>

          {isClinic ? (
            <div className="space-y-2">
              <Label htmlFor="radius_km">רדיוס חיפוש</Label>
              <Input id="radius_km" type="number" min={1} max={100} {...register("radius_km", { valueAsNumber: true })} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="experience_years">שנות ניסיון</Label>
              <Input id="experience_years" type="number" min={0} max={50} {...register("experience_years", { valueAsNumber: true })} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            זמינות ותנאים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ימי זמינות</Label>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => {
                const checked = selectedDays.includes(day.value);
                return (
                  <label key={day.value} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(nextChecked) => {
                        setValue(
                          "availability_days",
                          nextChecked ? [...selectedDays, day.value] : selectedDays.filter((value) => value !== day.value),
                          { shouldValidate: true }
                        );
                      }}
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="availability_hours">שעות</Label>
              <Input id="availability_hours" {...register("availability_hours")} placeholder="08:00 - 16:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability_date">תאריך התחלה</Label>
              <Input id="availability_date" type="date" {...register("availability_date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_min">שכר מינימום</Label>
              <Input id="salary_min" type="number" min={0} {...register("salary_min", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_max">שכר מקסימום</Label>
              <Input id="salary_max" type="number" min={0} {...register("salary_max", { valueAsNumber: true })} />
            </div>
          </div>
          {errors.salary_min && <p className="text-sm text-destructive">{errors.salary_min.message}</p>}

          <div className="space-y-2">
            <Label>סוג משרה</Label>
            <Select value={watch("job_type") || undefined} onValueChange={(value) => setValue("job_type", value as JobType)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג משרה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">יומי</SelectItem>
                <SelectItem value="temporary">זמני</SelectItem>
                <SelectItem value="permanent">קבוע</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isClinic && (
        <RecruitmentAutomationTab
          screeningQuestions={screeningQuestions}
          isAutoScreenerActive={isAutoScreenerActive}
          isUrgent={isUrgent}
          position={selectedPositions[0] || null}
          workplaceType={selectedDomain}
          onQuestionsChange={setScreeningQuestions}
          onAutoScreenerChange={setIsAutoScreenerActive}
          onUrgentChange={setIsUrgent}
        />
      )}

      <Button type="submit" className="w-full gap-2" size="lg" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {isEditing ? "עדכון פרופיל" : "שמירה והתחלה"}
      </Button>

      <MagicWriteModal open={showMagicWrite} onOpenChange={setShowMagicWrite} role={currentRole as UserRole} onGenerated={(bio) => setValue("description", bio)} />
    </form>
  );
}


