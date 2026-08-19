import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CurrentUser } from "@/types";
import {
  startLogin as apiStartLogin,
  loginWithPassword as apiLoginWithPassword,
  requestOtp as apiRequestOtp,
  verifyLoginOtp as apiVerifyLoginOtp,
  verifyRegisterOtp as apiVerifyRegisterOtp,
  createProfile as apiCreateProfile,
  getCurrentUser,
  logout as apiLogout,
  LoginStartMode,
  ProfileCreateData,
} from "@/lib/api";

interface AuthContextType {
  user: CurrentUser | null;
  currentUser: CurrentUser | null;
  loading: boolean;
  startLogin: (email: string) => Promise<{ mode: LoginStartMode | null; error: Error | null }>;
  loginWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  requestOtp: (email: string, purpose: "login" | "register") => Promise<{ error: Error | null }>;
  verifyLoginOtp: (email: string, code: string) => Promise<{ error: Error | null }>;
  verifyRegisterOtp: (email: string, code: string) => Promise<{ emailToken: string | null; error: Error | null }>;
  signUp: (data: ProfileCreateData, emailToken: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Error fetching current user:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Check if user is logged in on mount
    fetchCurrentUser().finally(() => setLoading(false));
  }, []);

  const signUp = async (data: ProfileCreateData, emailToken: string) => {
    const { user: newUser, error } = await apiCreateProfile(data, emailToken);

    if (error) {
      return { error: new Error(error) };
    }

    if (newUser) {
      setUser(newUser);
    }

    return { error: null };
  };

  const startLogin = async (email: string) => {
    const { mode, error } = await apiStartLogin(email);
    return { mode, error: error ? new Error(error) : null };
  };

  const loginWithPassword = async (email: string, password: string) => {
    const { user: loggedInUser, error } = await apiLoginWithPassword(email, password);
    if (error) {
      return { error: new Error(error) };
    }
    if (loggedInUser) {
      setUser(loggedInUser);
    }
    return { error: null };
  };

  const requestOtp = async (email: string, purpose: "login" | "register") => {
    const { error } = await apiRequestOtp(email, purpose);
    return { error: error ? new Error(error) : null };
  };

  const verifyLoginOtp = async (email: string, code: string) => {
    const { user: loggedInUser, error } = await apiVerifyLoginOtp(email, code);
    if (error) {
      return { error: new Error(error) };
    }
    if (loggedInUser) {
      setUser(loggedInUser);
    }
    return { error: null };
  };

  const verifyRegisterOtp = async (email: string, code: string) => {
    const { emailToken, error } = await apiVerifyRegisterOtp(email, code);
    return { emailToken, error: error ? new Error(error) : null };
  };

  const signOut = async () => {
    await apiLogout();
    setUser(null);
  };

  const refreshCurrentUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentUser: user,
      loading,
      startLogin,
      loginWithPassword,
      requestOtp,
      verifyLoginOtp,
      verifyRegisterOtp,
      signUp,
      signOut,
      refreshCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

