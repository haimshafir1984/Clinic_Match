import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ProfileGuard } from "@/components/auth/ProfileGuard";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Swipe from "./pages/Swipe";
import Matches from "./pages/Matches";
import ChatList from "./pages/ChatList";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Insights from "./pages/Insights";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

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
            <Route
              path="/matches"
              element={
                <AuthGuard>
                  <ProfileGuard>
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
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
