import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Building2, UserRound, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { Match } from "@/types";

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const { otherProfile } = match;
  const isClinic = otherProfile.role === "clinic";
  const RoleIcon = isClinic ? Building2 : UserRound;

  return (
    <Link to={`/chat/${match.id}`}>
      <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={otherProfile.imageUrl || undefined} />
            <AvatarFallback className="bg-primary/10">
              <RoleIcon className="w-6 h-6 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {otherProfile.name}
              </h3>
              <Badge variant={isClinic ? "default" : "secondary"} className="text-xs">
                {isClinic ? "מרפאה" : "עובד/ת"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground truncate">
              {otherProfile.position}
              {otherProfile.location && ` • ${otherProfile.location}`}
            </p>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="w-3 h-3" />
              <span>
                התאמה {formatDistanceToNow(new Date(match.createdAt), { 
                  addSuffix: true, 
                  locale: he 
                })}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
