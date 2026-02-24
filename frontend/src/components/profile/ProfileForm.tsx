import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProfile, useUpdateProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CityCombobox } from "@/components/ui/city-combobox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DomainSelector } from "@/components/registration/DomainSelector";
import { RoleMultiSelector } from "@/components/registration/RoleMultiSelector";
import { MagicWriteModal } from "@/components/profile/MagicWriteModal";
import { RecruitmentAutomationTab } from "@/components/profile/RecruitmentAutomationTab";
import { toast } from "sonner";
import { Loader2, Building2, UserRound, User, MapPin, Calendar, Banknote, CheckCircle2, ArrowLeft, Briefcase, X, Sparkles, BotMessageSquare } from "lucide-react";
import { ProfileFormInput } from "@/hooks/useProfile";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DOMAINS, WorkplaceDomain, getDomainConfig } from "@/constants/domains";

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
  position: z.string().optional(),
  positions: z.array(z.string()).optional(),
  workplace_types: z.array(z.string()).optional(),
  required_position: z.string().optional(),
  description: z.string().max(500, "תיאור ארוך מדי (מקסימום 500 תווים)").optional(),
  city: z.string().optional(),
  preferred_area: z.string().optional(),
  radius_km: z.number().min(1).max(100).optional(),
  experience_years: z.number().min(0).max(50).optional(),
  availability_date: z.string().optional(),
  availability_days: z.array(z.string()).optional(),
  availability_hours: z.string().optional(),
  salary_min: z.number().min(0).optional(),
  salary_max: z.number().min(0).optional(),
  job_type: z.enum(["daily", "temporary", "permanent"]).optional(),
}).refine((data) => {
  // Validate salary range
  if (data.salary_min && data.salary_max && data.salary_min > data.salary_max) {
    return false;
  }
  return true;
}, {
  message: "שכר מינימום חייב להיות קטן משכר מקסימום",
  path: ["salary_min"],
});

type FormData = z.infer<typeof profileSchema>;

// Profile type for initial data (matches what API returns)
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
  job_type?: "daily" | "temporary" | "permanent" | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  // Recruitment settings (clinic only)
  screening_questions?: string[] | null;
  is_auto_screener_active?: boolean | null;
  // Boost profile (clinic only)
  is_urgent?: boolean | null;
}

interface ProfileFormProps {
  initialData?: Profile | null;
  onSuccess: () => void;
}

interface FormSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function FormSection({ title, icon, children }: FormSectionProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function FormField({ label, required, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive mr-1">*</span>}
      </Label>
      {children}
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-destructive flex items-center gap-1"
        >
          {error}
        </motion.p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function ProfileForm({ initialData, onSuccess }: ProfileFormProps) {
  const [role, setRole] = useState<UserRole | null>(
    initialData?.role || (localStorage.getItem("pendingRole") as UserRole | null)
  );
  
  // Domain and positions state for editing
  const [selectedDomain, setSelectedDomain] = useState<WorkplaceDomain | null>(
    (initialData?.workplace_types?.[0] as WorkplaceDomain) || null
  );
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    initialData?.positions || (initialData?.position ? [initialData.position] : [])
  );
  const [showDomainSelector, setShowDomainSelector] = useState(false);
  
  // Magic Write modal state
  const [showMagicWrite, setShowMagicWrite] = useState(false);
  
  // Recruitment settings state (clinic only)
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>(
    initialData?.screening_questions || []
  );
  const [isAutoScreenerActive, setIsAutoScreenerActive] = useState(
    initialData?.is_auto_screener_active || false
  );
  const [isUrgent, setIsUrgent] = useState(
    initialData?.is_urgent || false
  );
  
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const isEditing = !!initialData;

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialData?.name || "",
      role: initialData?.role || role || undefined,
      position: initialData?.position || "",
      positions: initialData?.positions || [],
      workplace_types: initialData?.workplace_types || [],
      required_position: initialData?.required_position || "",
      description: initialData?.description || "",
      city: initialData?.city || "",
      preferred_area: initialData?.preferred_area || "",
      radius_km: initialData?.radius_km || 10,
      experience_years: initialData?.experience_years || 0,
      availability_date: initialData?.availability_date || "",
      availability_days: initialData?.availability_days || [],
      availability_hours: initialData?.availability_hours || "",
      salary_min: initialData?.salary_min || undefined,
      salary_max: initialData?.salary_max || undefined,
      job_type: initialData?.job_type || undefined,
    },
  });

  const selectedDays = watch("availability_days") || [];
  const currentRole = watch("role") || role;

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateProfile.mutateAsync({
          ...data,
          positions: selectedPositions.length > 0 ? selectedPositions : null,
          workplace_types: selectedDomain ? [selectedDomain] : null,
          // Include recruitment settings for clinics
          screening_questions: screeningQuestions.filter(q => q.trim()).length > 0 
            ? screeningQuestions.filter(q => q.trim()) 
            : null,
          is_auto_screener_active: isAutoScreenerActive,
          is_urgent: isUrgent,
        });
      } else {
        if (!data.name || !data.role) {
          toast.error("נא למלא את כל השדות הנדרשים");
          return;
        }
        await createProfile.mutateAsync({
          name: data.name,
          role: data.role,
          position: selectedPositions[0] || data.position || null,
          positions: selectedPositions.length > 0 ? selectedPositions : null,
          workplace_types: selectedDomain ? [selectedDomain] : null,
          required_position: data.required_position || null,
          description: data.description || null,
          city: data.city || null,
          preferred_area: data.preferred_area || null,
          radius_km: data.radius_km || null,
          experience_years: data.experience_years || null,
          availability_date: data.availability_date || null,
          availability_days: data.availability_days || null,
          availability_hours: data.availability_hours || null,
          salary_min: data.salary_min || null,
          salary_max: data.salary_max || null,
          job_type: data.job_type || null,
        });
        localStorage.removeItem("pendingRole");
      }
      onSuccess();
    } catch (error: any) {
      toast.error("שגיאה בשמירה", { description: error.message });
    }
  };

  const isLoading = createProfile.isPending || updateProfile.isPending || isSubmitting;
  const isClinic = currentRole === "clinic";

  const handleRemovePosition = (posToRemove: string) => {
    setSelectedPositions(selectedPositions.filter(p => p !== posToRemove));
  };

  // Role selection for new profiles
  if (!role && !initialData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <p className="text-muted-foreground text-center">בחר את סוג המשתמש שלך:</p>
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setRole("clinic");
              setValue("role", "clinic");
            }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <span className="font-semibold text-lg">מרפאה</span>
            <span className="text-xs text-muted-foreground text-center">מחפשים עובדים</span>
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setRole("worker");
              setValue("role", "worker");
            }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserRound className="w-8 h-8 text-primary" />
            </div>
            <span className="font-semibold text-lg">עובד/ת</span>
            <span className="text-xs text-muted-foreground text-center">מחפש/ת עבודה</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // For clinics in edit mode, use tabs layout
  const renderClinicTabs = isClinic && isEditing;

  // Form sections JSX (reusable for both regular form and tabs)
  const formSections = (
    <>
      {/* Basic Info */}
      <FormSection title="פרטים בסיסיים" icon={<User className="w-4 h-4 text-primary" />}>
        <FormField 
          label={isClinic ? "שם המרפאה" : "שם מלא"} 
          required 
          error={errors.name?.message}
        >
          <Input
            {...register("name")}
            placeholder={isClinic ? "מרפאת שיניים..." : "ישראל ישראלי"}
            className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
          />
        </FormField>

        {/* Positions Section */}
        <FormField 
          label={isClinic ? "תפקידים מבוקשים" : "התפקידים שלך"}
          required
          hint="ניתן לבחור מספר תפקידים"
        >
          {/* Selected Positions Display */}
          {selectedPositions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedPositions.map((pos) => (
                <Badge 
                  key={pos} 
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1"
                >
                  {pos}
                  <button
                    type="button"
                    onClick={() => handleRemovePosition(pos)}
                    className="mr-1 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          {/* Domain Selector Toggle */}
          {!showDomainSelector ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDomainSelector(true)}
              className="w-full"
            >
              <Briefcase className="w-4 h-4 ml-2" />
              {selectedPositions.length > 0 ? "הוסף תפקידים נוספים" : "בחר תחום ותפקידים"}
            </Button>
          ) : (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              {!selectedDomain ? (
                <DomainSelector
                  value={selectedDomain}
                  onChange={(domain) => setSelectedDomain(domain)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{getDomainConfig(selectedDomain)?.icon}</span>
                      <span className="font-medium">{getDomainConfig(selectedDomain)?.label}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDomain(null)}
                    >
                      שנה תחום
                    </Button>
                  </div>
                  <RoleMultiSelector
                    domain={selectedDomain}
                    selectedRoles={selectedPositions}
                    onChange={setSelectedPositions}
                  />
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDomainSelector(false)}
                className="w-full"
              >
                סגור
              </Button>
            </div>
          )}
        </FormField>

        {!isClinic && (
          <FormField 
            label="שנות ניסיון"
            hint="כמה שנות ניסיון יש לך בתחום?"
          >
            <Input
              type="number"
              min={0}
              max={50}
              {...register("experience_years", { valueAsNumber: true })}
              placeholder="3"
              className="w-32"
            />
          </FormField>
        )}

        <FormField 
          label="תיאור" 
          error={errors.description?.message}
          hint={`${watch("description")?.length || 0}/500 תווים`}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Textarea
                {...register("description")}
                placeholder={isClinic 
                  ? "ספר על המרפאה, האווירה, והציפיות..." 
                  : "ספר על עצמך, הניסיון והיכולות שלך..."}
                rows={3}
                className={cn("flex-1", errors.description && "border-destructive")}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMagicWrite(true)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              כתיבה קסומה ✨
            </Button>
          </div>
        </FormField>
      </FormSection>

      {/* Magic Write Modal */}
      <MagicWriteModal
        open={showMagicWrite}
        onOpenChange={setShowMagicWrite}
        role={currentRole as "clinic" | "worker"}
        onGenerated={(bio) => setValue("description", bio)}
      />

      {/* Location */}
      <FormSection title="מיקום" icon={<MapPin className="w-4 h-4 text-primary" />}>
        <FormField 
          label={isClinic ? "עיר" : "עיר מועדפת"}
          required
          hint="חשוב לבחור את שם העיר המדויק להתאמה טובה יותר"
        >
          <CityCombobox
            value={watch(isClinic ? "city" : "preferred_area") || ""}
            onChange={(value) => setValue(isClinic ? "city" : "preferred_area", value)}
            placeholder={isClinic ? "בחר עיר" : "בחר עיר מועדפת"}
          />
        </FormField>

        {isClinic && (
          <FormField 
            label="רדיוס חיפוש"
            hint="כמה רחוק אתם מוכנים שהעובד יגיע?"
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                {...register("radius_km", { valueAsNumber: true })}
                placeholder="10"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">ק"מ</span>
            </div>
          </FormField>
        )}
      </FormSection>

      {/* Availability */}
      <FormSection title="זמינות" icon={<Calendar className="w-4 h-4 text-primary" />}>
        <FormField label="ימים זמינים">
          <div className="flex flex-wrap gap-2">
            {days.map((day) => (
              <label
                key={day.value}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm",
                  selectedDays.includes(day.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50"
                )}
              >
                <Checkbox
                  checked={selectedDays.includes(day.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue("availability_days", [...selectedDays, day.value]);
                    } else {
                      setValue("availability_days", selectedDays.filter((d) => d !== day.value));
                    }
                  }}
                  className="sr-only"
                />
                <span>{day.label}</span>
              </label>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="שעות">
            <Input
              {...register("availability_hours")}
              placeholder="08:00 - 16:00"
            />
          </FormField>

          <FormField label="תאריך התחלה">
            <Input
              type="date"
              {...register("availability_date")}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Salary & Job Type */}
      <FormSection 
        title={isClinic ? "תנאי העסקה" : "ציפיות שכר"} 
        icon={<Banknote className="w-4 h-4 text-primary" />}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField 
            label={isClinic ? "שכר מינימום" : "שכר מינימלי"}
            error={errors.salary_min?.message}
          >
            <div className="relative">
              <Input
                type="number"
                min={0}
                {...register("salary_min", { valueAsNumber: true })}
                placeholder="5000"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₪</span>
            </div>
          </FormField>
          
          <FormField 
            label={isClinic ? "שכר מקסימום" : "שכר מקסימלי"}
          >
            <div className="relative">
              <Input
                type="number"
                min={0}
                {...register("salary_max", { valueAsNumber: true })}
                placeholder="15000"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₪</span>
            </div>
          </FormField>
        </div>

        <FormField label="סוג משרה">
          <Select
            value={watch("job_type") || ""}
            onValueChange={(value) => setValue("job_type", value as JobType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג משרה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">יומי</SelectItem>
              <SelectItem value="temporary">זמני</SelectItem>
              <SelectItem value="permanent">קבוע</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>
    </>
  );

  // Submit button JSX
  const submitButton = (
    <div className="pt-4 pb-8">
      <Button 
        type="submit" 
        className="w-full gap-2" 
        size="lg" 
        disabled={isLoading}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              שומר...
            </motion.span>
          ) : isEditing ? (
            <motion.span
              key="update"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              עדכן פרופיל
            </motion.span>
          ) : (
            <motion.span
              key="create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              המשך להתאמות
              <ArrowLeft className="w-4 h-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </div>
  );

  // Render with tabs for clinic edit mode
  if (renderClinicTabs) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("role")} value={currentRole || ""} />
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              פרופיל
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="gap-2">
              <BotMessageSquare className="w-4 h-4" />
              אוטומציית גיוס
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-4 space-y-4">
            {formSections}
          </TabsContent>
          
          <TabsContent value="recruitment" className="mt-4">
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
          </TabsContent>
        </Tabs>

        {submitButton}
      </form>
    );
  }

  // Regular form for workers or new profiles
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("role")} value={currentRole || ""} />
      {formSections}
      {submitButton}
    </form>
  );
}
