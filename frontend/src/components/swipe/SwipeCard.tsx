import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MatchCardData, SalaryRange } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, Banknote, MapPin, Clock, Building2, UserRound, Star, CheckCircle2, Sparkles, Flame } from "lucide-react";

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

// Check if profile was created within last 3 days
function isNewProfile(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= NEW_PROFILE_DAYS;
}

// Check if salary ranges match (worker's expected vs clinic's offer)
function checkSalaryMatch(
  profileSalary: SalaryRange,
  currentUserSalary: SalaryRange | null | undefined,
  profileRole: string
): boolean {
  if (!currentUserSalary) return false;
  
  // If profile is clinic (offering job), compare with worker's expectation
  // If profile is worker (seeking job), compare with clinic's offer
  const offerMin = profileRole === "clinic" ? profileSalary.min : currentUserSalary.min;
  const offerMax = profileRole === "clinic" ? profileSalary.max : currentUserSalary.max;
  const expectMin = profileRole === "clinic" ? currentUserSalary.min : profileSalary.min;
  const expectMax = profileRole === "clinic" ? currentUserSalary.max : profileSalary.max;
  
  // Match if offer meets or exceeds expectation
  if (offerMax && expectMin) {
    return offerMax >= expectMin;
  }
  if (offerMin && expectMax) {
    return offerMin <= expectMax;
  }
  return false;
}

export function SwipeCard({ 
  profile, 
  direction, 
  onSwipeLeft, 
  onSwipeRight,
  currentUserSalary 
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

  const variants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: direction === "right" 
      ? { x: 300, rotate: 20, opacity: 0 }
      : direction === "left"
      ? { x: -300, rotate: -20, opacity: 0 }
      : { opacity: 0 },
  };

  const isClinic = profile.role === "clinic";
  const RoleIcon = isClinic ? Building2 : UserRound;
  
  // Smart badges
  const isNew = isNewProfile(profile.createdAt);
  const hasSalaryMatch = checkSalaryMatch(profile.salaryRange, currentUserSalary, profile.role);
  const isUrgent = isClinic && profile.isUrgent;

  // Format availability - handle null/undefined
  const availabilityDays = profile.availability?.days
    ?.map((day) => dayLabels[day] || day)
    .join(" ") || "";

  // Format salary - handle null/undefined
  const formatSalary = () => {
    const min = profile.salaryRange?.min;
    const max = profile.salaryRange?.max;
    if (min && max) {
      return `₪${min.toLocaleString()} - ₪${max.toLocaleString()}`;
    }
    if (min) return `מ-₪${min.toLocaleString()}`;
    if (max) return `עד ₪${max.toLocaleString()}`;
    return null;
  };

  const salary = formatSalary();

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Like/Pass Overlays */}
      <motion.div
        className="absolute top-8 right-8 z-10 bg-success text-success-foreground px-6 py-2 rounded-lg rotate-12 border-4 border-success font-bold text-xl"
        style={{ opacity: likeOpacity }}
      >
        לייק! ❤️
      </motion.div>
      <motion.div
        className="absolute top-8 left-8 z-10 bg-destructive text-destructive-foreground px-6 py-2 rounded-lg -rotate-12 border-4 border-destructive font-bold text-xl"
        style={{ opacity: passOpacity }}
      >
        דלג ✕
      </motion.div>

      <Card className={`h-full overflow-hidden shadow-2xl rounded-xl flex flex-col ${isUrgent ? 'border-2 border-orange-500' : 'border-0'}`}>
        {/* Avatar / Image */}
        <div className="relative" style={{ height: "45%" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent to-primary/10 flex items-center justify-center">
          {profile.imageUrl ? (
            <img
              src={profile.imageUrl}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <RoleIcon className="w-10 h-10 text-primary" />
            </div>
          )}
          
          {/* Smart Badges - Top Left Corner */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {/* Urgent Hiring Badge */}
            {isUrgent && (
              <Badge 
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 gap-1 animate-pulse"
              >
                <Flame className="w-3 h-3" />
                🔥 גיוס דחוף
              </Badge>
            )}
            
            {/* New Badge */}
            {isNew && (
              <Badge 
                className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 gap-1"
              >
                <Sparkles className="w-3 h-3" />
                חדש
              </Badge>
            )}
            
            {/* Salary Match Badge */}
            {hasSalaryMatch && (
              <Badge 
                className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                התאמת שכר
              </Badge>
            )}
          </div>
          
          {/* Role Badge - Top Right */}
          <Badge 
            className="absolute top-3 right-3"
            variant={isClinic ? "default" : "secondary"}
          >
            {isClinic ? "מרפאה" : "עובד/ת"}
          </Badge>

          {/* Experience Badge - for workers (below role) */}
          {!isClinic && profile.experienceYears && profile.experienceYears > 0 && (
            <Badge
              variant="outline"
              className="absolute top-12 right-3 bg-background/80 backdrop-blur-sm"
            >
              <Star className="w-3 h-3 ml-1" />
              {profile.experienceYears} שנים
            </Badge>
          )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Name */}
          <h2 className="text-xl font-bold text-foreground mb-3">{profile.name}</h2>

          {/* === KEY HIGHLIGHTS - Position, Availability, Salary === */}
          <div className="space-y-2 mb-4">
            {/* 1. Position - Bold & Prominent */}
            {profile.position && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">תפקיד</p>
                  <p className="font-bold text-foreground">{profile.position}</p>
                </div>
              </div>
            )}

            {/* 2. Availability - Bold & Prominent */}
            {((profile.availability?.days && profile.availability.days.length > 0) || profile.availability?.startDate) && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">זמינות</p>
                  <p className="font-bold text-foreground">
                    {profile.availability?.startDate 
                      ? new Date(profile.availability.startDate).toLocaleDateString("he-IL", {
                          day: "numeric",
                          month: "short",
                        })
                      : availabilityDays}
                  </p>
                  {profile.availability?.hours && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {profile.availability.hours}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 3. Salary - Bold & Prominent */}
            {salary && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">שכר</p>
                  <p className="font-bold text-foreground">{salary}</p>
                  {profile.jobType && (
                    <p className="text-xs text-muted-foreground">
                      {jobTypeLabels[profile.jobType]}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Secondary info */}
          <div className="mt-auto space-y-2">
            {/* Location */}
            {profile.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
                {profile.radiusKm && (
                  <span className="text-xs">({profile.radiusKm} ק"מ)</span>
                )}
              </div>
            )}

            {/* Description */}
            {profile.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {profile.description}
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
