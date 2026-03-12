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
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <Skeleton className="h-12 w-12 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function ChatList() {
  const { matches, isLoading } = useMatches();

  const activeMatches = matches.filter((match) => !match.isClosed);

  return (
    <AppLayout>
      <div className="mx-auto max-w-md p-4">
        <h1 className="mb-6 text-2xl font-bold text-foreground">שיחות</h1>

        {isLoading ? (
          <ChatListSkeleton />
        ) : activeMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center"
          >
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">אין שיחות פעילות</h3>
            <p className="text-muted-foreground">כשתיווצר התאמה, אפשר יהיה להתחיל כאן שיחה.</p>
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
                    <Card className="cursor-pointer p-4 transition-colors hover:bg-accent/50">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherProfile.imageUrl || undefined} />
                          <AvatarFallback>
                            <RoleIcon className="h-6 w-6 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">{otherProfile.name}</h3>
                          <p className="truncate text-sm text-muted-foreground">
                            {otherProfile.position || "ללא תיאור תפקיד"}
                          </p>
                        </div>
                        <MessageCircle className="h-5 w-5 text-primary" />
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
