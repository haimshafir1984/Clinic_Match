import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Briefcase, Building2, Calendar, Clock, MapPin, UserRound } from "lucide-react";

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
  radius_km?: number | null;
  experience_years?: number | null;
  availability_date?: string | null;
  availability_days?: string[] | null;
  availability_hours?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  job_type?: "daily" | "temporary" | "permanent" | null;
  avatar_url?: string | null;
  logo_url?: string | null;
}

interface ProfileViewProps {
  profile: Profile;
}

const jobTypeLabels: Record<string, string> = {
  daily: "יומי",
  temporary: "זמני",
  permanent: "קבוע",
};

const dayLabels: Record<string, string> = {
  sunday: "ראשון",
  monday: "שני",
  tuesday: "שלישי",
  wednesday: "רביעי",
  thursday: "חמישי",
  friday: "שישי",
  saturday: "שבת",
};

export function ProfileView({ profile }: ProfileViewProps) {
  const isClinic = profile.role === "clinic";
  const RoleIcon = isClinic ? Building2 : UserRound;
  const imageUrl = isClinic ? profile.logo_url || profile.avatar_url : profile.avatar_url || profile.logo_url;
  const positions = profile.positions && profile.positions.length > 0
    ? profile.positions
    : [isClinic ? profile.required_position : profile.position].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border">
              <AvatarImage src={imageUrl || undefined} />
              <AvatarFallback className="bg-primary/10">
                <RoleIcon className="h-10 w-10 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <Badge variant={isClinic ? "default" : "secondary"}>{isClinic ? "בית עסק" : "עובד/ת"}</Badge>
              </div>
              {positions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {positions.map((position) => (
                    <Badge key={position} variant="outline" className="text-xs">
                      <Briefcase className="ml-1 h-3 w-3" />
                      {position}
                    </Badge>
                  ))}
                </div>
              )}
              {!isClinic && profile.experience_years ? <p className="text-sm text-muted-foreground">{profile.experience_years} שנות ניסיון</p> : null}
            </div>
          </div>
          {profile.description ? <p className="mt-4 text-sm text-muted-foreground">{profile.description}</p> : null}
        </CardContent>
      </Card>

      {(profile.city || profile.preferred_area) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" />מיקום</h3>
            <p>{profile.city || profile.preferred_area}</p>
            {profile.radius_km ? <p className="text-sm text-muted-foreground">רדיוס חיפוש: {profile.radius_km} ק"מ</p> : null}
          </CardContent>
        </Card>
      )}

      {(profile.availability_days?.length || profile.availability_hours || profile.availability_date) ? (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><Calendar className="h-4 w-4 text-primary" />זמינות</h3>
            {profile.availability_days?.length ? <p>{profile.availability_days.map((day) => dayLabels[day] || day).join(", ")}</p> : null}
            {profile.availability_hours ? <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3 w-3" />{profile.availability_hours}</p> : null}
            {profile.availability_date ? <p className="mt-2 text-sm text-muted-foreground">תאריך התחלה: {new Date(profile.availability_date).toLocaleDateString("he-IL")}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {(profile.salary_min || profile.salary_max || profile.job_type) ? (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><Banknote className="h-4 w-4 text-primary" />{isClinic ? "תנאי העסקה" : "ציפיות שכר"}</h3>
            {(profile.salary_min || profile.salary_max) ? (
              <p>
                {profile.salary_min && profile.salary_max
                  ? `₪${profile.salary_min.toLocaleString()} - ₪${profile.salary_max.toLocaleString()}`
                  : profile.salary_min
                  ? `מ-₪${profile.salary_min.toLocaleString()}`
                  : `עד ₪${profile.salary_max?.toLocaleString()}`}
              </p>
            ) : null}
            {profile.job_type ? <Badge variant="outline" className="mt-2">{jobTypeLabels[profile.job_type]}</Badge> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

