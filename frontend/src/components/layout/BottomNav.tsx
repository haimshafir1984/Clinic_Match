import { NavLink, useLocation } from "react-router-dom";
import { Heart, MessageCircle, User, Sparkles, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMatches } from "@/hooks/useMatches";

const navItems = [
  { path: "/swipe", icon: Sparkles, label: "גלות" },
  { path: "/matches", icon: Heart, label: "התאמות" },
  { path: "/chat", icon: MessageCircle, label: "שיחות", showBadge: true },
  { path: "/insights", icon: BarChart3, label: "תובנות" },
  { path: "/profile", icon: User, label: "פרופיל" },
];

export function BottomNav() {
  const location = useLocation();
  const { matches } = useMatches();

  const activeMatchCount = matches.filter((m) => !m.isClosed).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/chat" && location.pathname.startsWith("/chat"));
          const Icon = item.icon;
          const showUnread = item.showBadge && activeMatchCount > 0 && !isActive;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-full h-full"
            >
              <motion.div
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  {showUnread && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {activeMatchCount > 9 ? "9+" : activeMatchCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

