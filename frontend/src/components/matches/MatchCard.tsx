import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { BookmarkPlus, Building2, Calendar, MessageCircle, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Match } from "@/types";

interface MatchCardProps {
  match: Match;
  canSave?: boolean;
  onSaveToTalentPool?: (match: Match) => void;
}

const stageLabels: Record<string, string> = {
  matched: "התאמה חדשה",
  screening: "בסינון",
  interview: "בראיון",
  offer: "בשלב הצעה",
  hired: "גויס/ה",
  archived: "בארכיון",
};

export function MatchCard({ match, canSave = false, onSaveToTalentPool }: MatchCardProps) {
  const { otherProfile } = match;
  const isBusiness = otherProfile.role === "clinic";
  const RoleIcon = isBusiness ? Building2 : UserRound;
  const secondaryLine = [otherProfile.position, otherProfile.location].filter(Boolean).join(" • ");

  return (
    <Card className="p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-start gap-4">
        <Link to={`/chat/${match.id}`} className="flex flex-1 items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={otherProfile.imageUrl || undefined} />
            <AvatarFallback className="bg-primary/10">
              <RoleIcon className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-foreground">{otherProfile.name}</h3>
              <Badge variant={isBusiness ? "default" : "secondary"} className="text-xs">
                {isBusiness ? "בית עסק" : "עובד/ת"}
              </Badge>
              {match.pipeline?.stage ? (
                <Badge variant="outline" className="text-xs text-primary">
                  {stageLabels[match.pipeline.stage] || match.pipeline.stage}
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">{secondaryLine || "פרופיל ללא פרטים נוספים"}</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{`נוצרה התאמה ${formatDistanceToNow(new Date(match.createdAt), { addSuffix: true, locale: he })}`}</span>
            </div>
            {otherProfile.strengths && otherProfile.strengths.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {otherProfile.strengths.slice(0, 2).map((strength) => (
                  <Badge key={strength} variant="secondary" className="max-w-full truncate text-xs">
                    {strength}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </Link>

        <div className="flex flex-col items-end gap-2">
          <Link to={`/chat/${match.id}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
          </Link>
          {canSave && onSaveToTalentPool ? (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => onSaveToTalentPool(match)}>
              <BookmarkPlus className="h-4 w-4" />
              שמירה
            </Button>
          ) : null}
        </div>
      </div>
      {match.pipeline?.nextStep ? (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">הצעד הבא:</span> {match.pipeline.nextStep}
        </div>
      ) : null}
    </Card>
  );
}
