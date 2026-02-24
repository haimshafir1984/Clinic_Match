import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { TopHeader } from "./TopHeader";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}

export function AppLayout({ children, showNav = true, showHeader = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <TopHeader />}
      <main className={showNav ? "pb-20" : ""}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
