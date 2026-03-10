import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Banknote, Briefcase, Building2, Calendar, CheckCircle2, Clock, Flame, MapPin, Sparkles, Star, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
    const threshold = typeof window !== "undefined" ? window.innerWidth * 0.28 : 100;
    if (info.offset.x > threshold) onSwipeRight();
    if (info.offset.x < -threshold) onSwipeLeft();
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
    <motion.div className="absolute inset-0" style={{ x, rotate }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.7} onDragEnd={handleDragEnd} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <motion.div className="absolute right-8 top-8 z-10 rounded-lg border-4 border-success bg-success px-6 py-2 text-xl font-bold text-success-foreground rotate-12" style={{ opacity: likeOpacity }}>לייק</motion.div>
      <motion.div className="absolute left-8 top-8 z-10 -rotate-12 rounded-lg border-4 border-destructive bg-destructive px-6 py-2 text-xl font-bold text-destructive-foreground" style={{ opacity: passOpacity }}>דלג</motion.div>

      <Card className={`flex h-full flex-col overflow-hidden rounded-xl shadow-2xl ${isClinic && profile.isUrgent ? "border-2 border-orange-500" : "border-0"}`}>
        <div className="relative" style={{ height: "45%" }}>
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent to-primary/10">
            {profile.imageUrl ? <img src={profile.imageUrl} alt={profile.name} className="h-full w-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20"><RoleIcon className="h-10 w-10 text-primary" /></div>}
            <div className="absolute left-3 top-3 flex flex-col gap-2">
              {isClinic && profile.isUrgent ? <Badge className="gap-1 border-0 bg-orange-500 text-white hover:bg-orange-600"><Flame className="h-3 w-3" />גיוס דחוף</Badge> : null}
              {isNew ? <Badge className="gap-1 border-0 bg-cyan-500 text-white hover:bg-cyan-600"><Sparkles className="h-3 w-3" />חדש</Badge> : null}
              {hasSalaryMatch ? <Badge className="gap-1 border-0 bg-emerald-500 text-white hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" />התאמת שכר</Badge> : null}
            </div>
            <Badge className="absolute right-3 top-3" variant={isClinic ? "default" : "secondary"}>{isClinic ? "בית עסק" : "עובד/ת"}</Badge>
            {!isClinic && profile.experienceYears ? <Badge variant="outline" className="absolute right-3 top-12 bg-background/80 backdrop-blur-sm"><Star className="ml-1 h-3 w-3" />{profile.experienceYears} שנים</Badge> : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h2 className="mb-3 text-xl font-bold">{profile.name}</h2>

          <div className="mb-4 space-y-2">
            {profile.position ? <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20"><Briefcase className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">תפקיד</p><p className="font-bold">{profile.position}</p></div></div> : null}
            {(profile.availability.days.length > 0 || profile.availability.startDate) ? <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20"><Calendar className="h-5 w-5 text-primary" /></div><div className="flex-1"><p className="text-xs text-muted-foreground">זמינות</p><p className="font-bold">{profile.availability.startDate ? new Date(profile.availability.startDate).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : profile.availability.days.map((day) => dayLabels[day] || day).join(" ")}</p>{profile.availability.hours ? <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{profile.availability.hours}</p> : null}</div></div> : null}
            {salary ? <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20"><Banknote className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">שכר</p><p className="font-bold">{salary}</p>{profile.jobType ? <p className="text-xs text-muted-foreground">{jobTypeLabels[profile.jobType]}</p> : null}</div></div> : null}
          </div>

          <div className="mt-auto space-y-2">
            {profile.location ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /><span>{profile.location}</span>{profile.radiusKm ? <span className="text-xs">({profile.radiusKm} ק"מ)</span> : null}</div> : null}
            {profile.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{profile.description}</p> : null}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
