import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Banknote, Building2, Calendar, CheckCircle2, Clock, Flame, MapPin, Sparkles, Star, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchCardData, SalaryRange } from "@/types";

interface SwipeCardProps {
  profile: MatchCardData;
  direction: "left" | "right" | null;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  currentUserSalary?: SalaryRange | null;
}

const NEW_PROFILE_DAYS = 3;

const jobTypeLabels: Record<string, string> = {
  daily: "יומי",
  temporary: "זמני",
  permanent: "קבוע",
};

const dayLabels: Record<string, string> = {
  sunday: "א׳",
  monday: "ב׳",
  tuesday: "ג׳",
  wednesday: "ד׳",
  thursday: "ה׳",
  friday: "ו׳",
  saturday: "ש׳",
};

function isNewProfile(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= NEW_PROFILE_DAYS;
}

function checkSalaryMatch(profileSalary: SalaryRange, currentUserSalary: SalaryRange | null | undefined, profileRole: string): boolean {
  if (!currentUserSalary) return false;
  const offerMin = profileRole === "clinic" ? profileSalary.min : currentUserSalary.min;
  const offerMax = profileRole === "clinic" ? profileSalary.max : currentUserSalary.max;
  const expectMin = profileRole === "clinic" ? currentUserSalary.min : profileSalary.min;
  const expectMax = profileRole === "clinic" ? currentUserSalary.max : profileSalary.max;

  if (offerMax && expectMin) return offerMax >= expectMin;
  if (offerMin && expectMax) return offerMin <= expectMax;
  return false;
}

export function SwipeCard({ profile, direction, onSwipeLeft, onSwipeRight, currentUserSalary }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const distanceThreshold = typeof window !== "undefined" ? window.innerWidth * 0.2 : 80;
    // A fast flick commits the swipe even over a short distance — dragging
    // slowly still needs to clear distanceThreshold, matching how swipe
    // gestures feel in other swipe-card apps.
    const velocityThreshold = 500;
    const passedRight = info.offset.x > distanceThreshold || (info.offset.x > 0 && info.velocity.x > velocityThreshold);
    const passedLeft = info.offset.x < -distanceThreshold || (info.offset.x < 0 && info.velocity.x < -velocityThreshold);
    if (passedRight) onSwipeRight();
    else if (passedLeft) onSwipeLeft();
  };

  const variants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: direction === "right" ? { x: 300, rotate: 20, opacity: 0 } : direction === "left" ? { x: -300, rotate: -20, opacity: 0 } : { opacity: 0 },
  };

  const isClinic = profile.role === "clinic";
  const RoleIcon = isClinic ? Building2 : UserRound;
  const isNew = isNewProfile(profile.createdAt);
  const hasSalaryMatch = checkSalaryMatch(profile.salaryRange, currentUserSalary, profile.role);
  const salary = profile.salaryRange.min && profile.salaryRange.max
    ? `₪${profile.salaryRange.min.toLocaleString()} - ₪${profile.salaryRange.max.toLocaleString()}`
    : profile.salaryRange.min
    ? `מ-₪${profile.salaryRange.min.toLocaleString()}`
    : profile.salaryRange.max
    ? `עד ₪${profile.salaryRange.max.toLocaleString()}`
    : null;

  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={{ x, rotate, touchAction: "pan-y" }}
      drag="x" 
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd} 
      variants={variants} 
      initial="initial" 
      animate="animate" 
      exit="exit" 
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Swipe Feedback Badges */}
      <motion.div
        className="absolute right-8 top-8 z-20 rounded-xl border-4 border-success bg-success/10 px-6 py-2 text-2xl font-black text-success rotate-12 backdrop-blur-md"
        style={{ opacity: likeOpacity }}
      >
        מתאים 👍
      </motion.div>
      <motion.div
        className="absolute left-8 top-8 z-20 -rotate-12 rounded-xl border-4 border-destructive bg-destructive/10 px-6 py-2 text-2xl font-black text-destructive backdrop-blur-md"
        style={{ opacity: passOpacity }}
      >
        דלג 👎
      </motion.div>

      {/* Main Card Container */}
      <div
        className={`flex h-full flex-col overflow-hidden rounded-3xl bg-card border border-border shadow-xl transition-all ${
          isClinic && profile.isUrgent ? "ring-2 ring-warning/40" : ""
        }`}
      >
        {/* Header: compact logo + name row, no empty hero banner */}
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-accent-foreground shadow-sm">
              {profile.imageUrl ? (
                <img src={profile.imageUrl} alt={profile.name} referrerPolicy="no-referrer" className="h-full w-full object-cover pointer-events-none" />
              ) : (
                <RoleIcon className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-bold text-foreground">{profile.name}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{isClinic ? "בית עסק" : "עובד/ת"}</p>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-col items-end gap-1">
            {isClinic && profile.isUrgent && (
              <Badge className="gap-1 border-0 bg-warning text-warning-foreground hover:bg-warning shadow-sm text-[10px] font-bold py-1 px-2.5 rounded-full">
                <Flame className="h-3 w-3" />
                <span>דחוף ביותר</span>
              </Badge>
            )}
            {isNew && (
              <Badge className="gap-1 border-0 bg-primary text-primary-foreground hover:bg-primary shadow-sm text-[10px] font-bold py-1 px-2.5 rounded-full">
                <Sparkles className="h-3 w-3" />
                <span>חדש</span>
              </Badge>
            )}
            {hasSalaryMatch && (
              <Badge className="gap-1 border-0 bg-success text-success-foreground hover:bg-success shadow-sm text-[10px] font-bold py-1 px-2.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                <span>התאמת שכר</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Title + quick-glance pills, in the spot a job title + level/location pills sit */}
        <div className="px-5 pt-3 text-right">
          {profile.position && <h2 className="text-xl font-extrabold text-foreground tracking-tight">{profile.position}</h2>}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            {profile.jobType && (
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
                {jobTypeLabels[profile.jobType] || profile.jobType}
              </span>
            )}
            {(profile.locations?.length || profile.location) && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
                <MapPin className="h-3 w-3 text-primary" />
                {profile.locations?.length ? profile.locations.join(" • ") : profile.location}
              </span>
            )}
            {!isClinic && profile.experienceYears && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
                <Star className="h-3 w-3 text-warning fill-warning" />
                {profile.experienceYears} שנות ניסיון
              </span>
            )}
          </div>
        </div>

        {/* Detailed Info Area */}
        <div className="flex flex-1 flex-col p-5 pt-4 overflow-y-auto">
          {/* Core metadata rows */}
          <div className="space-y-2">
            {(profile.availability.days.length > 0 || profile.availability.startDate) && (
              <div className="flex items-center gap-3 bg-muted/60 border border-border p-3 rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground flex-shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-[10px] text-muted-foreground font-medium">זמינות וימי עבודה</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {profile.availability.startDate
                      ? new Date(profile.availability.startDate).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })
                      : profile.availability.days.map((day) => dayLabels[day] || day).join(" • ")
                    }
                  </p>
                  {profile.availability.hours && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{profile.availability.hours}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {salary && (
              <div className="flex items-center gap-3 bg-success/5 border border-success/15 p-3 rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success flex-shrink-0">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-medium">תנאי שכר</p>
                  <p className="text-xs font-bold text-success mt-0.5">{salary}</p>
                  {profile.radiusKm ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">רדיוס {profile.radiusKm} ק"מ</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {profile.description && (
            <p className="mt-4 text-right text-xs text-muted-foreground leading-relaxed font-normal line-clamp-4">
              {profile.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
