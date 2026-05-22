import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Banknote, Briefcase, Building2, Calendar, CheckCircle2, Clock, Flame, MapPin, Sparkles, Star, UserRound } from "lucide-react";
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
    <motion.div 
      className="absolute inset-0 select-none" 
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
      {/* Swipe Feedback Badges */}
      <motion.div 
        className="absolute right-8 top-8 z-20 rounded-xl border-4 border-emerald-500 bg-emerald-500/20 px-6 py-2 text-2xl font-black text-emerald-400 rotate-12 backdrop-blur-md" 
        style={{ opacity: likeOpacity }}
      >
        מתאים 👍
      </motion.div>
      <motion.div 
        className="absolute left-8 top-8 z-20 -rotate-12 rounded-xl border-4 border-rose-500 bg-rose-500/20 px-6 py-2 text-2xl font-black text-rose-400 backdrop-blur-md" 
        style={{ opacity: passOpacity }}
      >
        דלג 👎
      </motion.div>

      {/* Main Glassmorphic Card Container */}
      <div 
        className={`flex h-full flex-col overflow-hidden rounded-3xl shadow-2xl glass-panel border border-white/10 transition-all ${
          isClinic && profile.isUrgent ? "ring-2 ring-red-500/30" : ""
        }`}
      >
        {/* Card Cover & Image Area */}
        <div className="relative w-full h-[45%] bg-slate-950/80 overflow-hidden flex-shrink-0">
          {profile.imageUrl ? (
            <img 
              src={profile.imageUrl} 
              alt={profile.name} 
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover pointer-events-none opacity-90 transition-transform duration-500 group-hover:scale-105" 
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40">
                <RoleIcon className="h-12 w-12 text-cyan-400" />
              </div>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-4 right-4 flex flex-wrap gap-1.5 z-10">
            {isClinic && profile.isUrgent && (
              <Badge className="gap-1 border-0 bg-red-600/90 text-white hover:bg-red-700 shadow-lg text-[10px] font-bold py-1 px-2.5 rounded-full backdrop-blur-sm animate-pulse">
                <Flame className="h-3 w-3" />
                <span>דחוף ביותר</span>
              </Badge>
            )}
            {isNew && (
              <Badge className="gap-1 border-0 bg-cyan-500/90 text-white hover:bg-cyan-600 shadow-lg text-[10px] font-bold py-1 px-2.5 rounded-full backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>חדש</span>
              </Badge>
            )}
            {hasSalaryMatch && (
              <Badge className="gap-1 border-0 bg-emerald-500/90 text-white hover:bg-emerald-600 shadow-lg text-[10px] font-bold py-1 px-2.5 rounded-full backdrop-blur-sm">
                <CheckCircle2 className="h-3 w-3" />
                <span>התאמת שכר</span>
              </Badge>
            )}
          </div>

          <Badge 
            className="absolute left-4 top-4 border-0 bg-white/10 text-white/90 font-bold backdrop-blur-md py-1 px-3 rounded-full text-[10px]" 
            variant="outline"
          >
            {isClinic ? "בית עסק" : "עובד/ת"}
          </Badge>

          {!isClinic && profile.experienceYears && (
            <Badge 
              variant="outline" 
              className="absolute left-4 bottom-4 bg-slate-900/80 backdrop-blur-md text-[10px] font-bold border-white/10 text-white/95"
            >
              <Star className="ml-1 h-3 w-3 text-amber-400 fill-amber-400" />
              <span>{profile.experienceYears} שנות ניסיון</span>
            </Badge>
          )}

          {/* Bottom Gradient overlay */}
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
        </div>

        {/* Detailed Info Area */}
        <div className="flex flex-1 flex-col p-5 overflow-y-auto text-white">
          <div className="text-right">
            <h2 className="text-xl font-extrabold text-white tracking-tight">{profile.name}</h2>
          </div>

          {/* Core metadata rows */}
          <div className="mt-4 space-y-2">
            {profile.position && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 font-medium">תפקיד מבוקש</p>
                  <p className="text-xs font-bold text-white mt-0.5">{profile.position}</p>
                </div>
              </div>
            )}

            {(profile.availability.days.length > 0 || profile.availability.startDate) && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 flex-shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-[10px] text-white/40 font-medium">זמינות וימי עבודה</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {profile.availability.startDate 
                      ? new Date(profile.availability.startDate).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" }) 
                      : profile.availability.days.map((day) => dayLabels[day] || day).join(" • ")
                    }
                  </p>
                  {profile.availability.hours && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-white/50 font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{profile.availability.hours}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {salary && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 font-medium">תנאי שכר</p>
                  <p className="text-xs font-bold text-emerald-300 mt-0.5">{salary}</p>
                  {profile.jobType && (
                    <p className="text-[10px] text-white/50 mt-0.5">{jobTypeLabels[profile.jobType] || profile.jobType}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location and BIO descriptions */}
          <div className="mt-5 space-y-2 text-right">
            {profile.location && (
              <div className="flex items-center gap-1.5 text-xs text-white/60 font-semibold justify-start">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span>{profile.location}</span>
                {profile.radiusKm ? (
                  <span className="text-[10px] text-white/40 font-mono">({profile.radiusKm} ק"מ רדיוס)</span>
                ) : null}
              </div>
            )}
            
            {profile.description && (
              <p className="text-xs text-white/70 leading-relaxed font-normal mt-2 line-clamp-3">
                {profile.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
