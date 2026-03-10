import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useMatches } from "@/hooks/useMatches";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Building2, UserRound } from "lucide-react";
import { motion } from "framer-motion";

function ChatListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="w-5 h-5 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function ChatList() {
  const { matches, isLoading } = useMatches();

  const activeMatches = matches.filter((m) => !m.isClosed);

  return (
    <AppLayout>
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">שיחות</h1>

        {isLoading ? (
          <ChatListSkeleton />
        ) : activeMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">אין שיחות פעילות</h3>
            <p className="text-muted-foreground">
              כשתהיה התאמה, תוכל להתחיל לדבר איתה כאן
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {activeMatches.map((match, index) => {
              const { otherProfile } = match;
              const isClinic = otherProfile.role === "clinic";
              const RoleIcon = isClinic ? Building2 : UserRound;

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/chat/${match.id}`}>
                    <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={otherProfile.imageUrl || undefined} />
                          <AvatarFallback>
                            <RoleIcon className="w-6 h-6 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{otherProfile.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {otherProfile.position}
                          </p>
                        </div>
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

