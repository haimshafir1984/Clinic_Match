import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { Building2, Calendar, MessageCircle, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Match } from "@/types";

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const { otherProfile } = match;
  const isBusiness = otherProfile.role === "clinic";
  const RoleIcon = isBusiness ? Building2 : UserRound;
  const secondaryLine = [otherProfile.position, otherProfile.location].filter(Boolean).join(" • ");

  return (
    <Link to={`/chat/${match.id}`}>
      <Card className="cursor-pointer p-4 transition-colors hover:bg-accent/50">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={otherProfile.imageUrl || undefined} />
            <AvatarFallback className="bg-primary/10">
              <RoleIcon className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate font-semibold text-foreground">{otherProfile.name}</h3>
              <Badge variant={isBusiness ? "default" : "secondary"} className="text-xs">
                {isBusiness ? "בית עסק" : "עובד/ת"}
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">{secondaryLine || "פרופיל ללא פרטים נוספים"}</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{`נוצרה התאמה ${formatDistanceToNow(new Date(match.createdAt), { addSuffix: true, locale: he })}`}</span>
            </div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
