import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ProfileGuard } from "@/components/auth/ProfileGuard";

// Pages are code-split so a first visit doesn't download the whole app.
// Login/Register stay eager: they're the entry point for signed-out users,
// and lazy-loading them would only add a spinner before the first paint.
import Login from "./pages/Login";
import Register from "./pages/Register";

const Swipe = lazy(() => import("./pages/Swipe"));
const Matches = lazy(() => import("./pages/Matches"));
const ChatList = lazy(() => import("./pages/ChatList"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const Insights = lazy(() => import("./pages/Insights"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Profile Route - Auth required but profile completion NOT required */}
            <Route
              path="/profile"
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              }
            />

            {/* Protected Routes - Require both Auth AND complete profile */}
            <Route
              path="/swipe"
              element={
                <AuthGuard>
                  <ProfileGuard>
                    <Swipe />
                  </ProfileGuard>
                </AuthGuard>
              }
            />
            {/*
              Matches carries the external-jobs feed, which is real value a
              signed-in user can get before their profile is finished — so it
              only needs a profile to exist, not to be complete. Swipe/chat
              still require completeness since those put the user in front of
              another person.
            */}
            <Route
              path="/matches"
              element={
                <AuthGuard>
                  <ProfileGuard requireComplete={false}>
                    <Matches />
                  </ProfileGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/chat"
              element={
                <AuthGuard>
                  <ProfileGuard>
                    <ChatList />
                  </ProfileGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/chat/:matchId"
              element={
                <AuthGuard>
                  <ProfileGuard>
                    <Chat />
                  </ProfileGuard>
                </AuthGuard>
              }
            />

            {/* Insights Route */}
            <Route
              path="/insights"
              element={
                <AuthGuard>
                  <ProfileGuard>
                    <Insights />
                  </ProfileGuard>
                </AuthGuard>
              }
            />

            {/* Admin Route */}
            <Route
              path="/admin"
              element={
                <AuthGuard>
                  <Admin />
                </AuthGuard>
              }
            />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/swipe" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

