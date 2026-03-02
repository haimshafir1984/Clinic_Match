// API Layer for ClinicMatch
// Connects to the Render backend at https://clinic-match.onrender.com/api

import { 
  MatchCardData, 
  SwipeRequest, 
  SwipeResponse, 
  Match, 
  Message,
  CurrentUser,
  UserRole,
  AuthResponse
} from "@/types";

const API_BASE_URL = "https://clinic-match.onrender.com/api";
const API_TIMEOUT_MS = 15_000;

const CURRENT_PROFILE_STORAGE_KEY = "current_profile";

// Helper function for API calls with timeout and error handling
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUT_MS
): Promise<T> {
  const token = localStorage.getItem("auth_token");
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "שגיאת שרת" }));
      throw new Error(error.message || `שגיאה ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("הבקשה נכשלה - השרת לא מגיב. נסה שוב.");
      }
      throw error;
    }
    throw new Error("שגיאה בתקשורת עם השרת");
  }
}

function normalizeUserRole(role: string | null | undefined): UserRole {
  const r = role?.toLowerCase();
  if (r === "clinic") return "clinic";
  if (r === "worker" || r === "staff") return "worker";
  return "worker";
}

// Backend feed profile structure
interface BackendFeedProfile {
  id: string;
  name: string;
  position?: string | null;
  location?: string | null;
  salary_info?: { min?: number; max?: number } | null;
  availability?: { days?: string[]; hours?: string; start_date?: string } | null;
  image_url?: string | null;
  role?: string;
  industry?: string | null;
  created_at?: string | null;
}

// Transform backend feed profile to MatchCardData
function transformToMatchCardData(profile: BackendFeedProfile): MatchCardData {
  // salary_info is stored as a numeric average in the backend (e.g. 7500),
  // but may also arrive as { min, max } if the backend changes.
  const salaryRaw = profile.salary_info as unknown;
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  if (typeof salaryRaw === 'number') {
    salaryMin = salaryRaw; // use the stored average as the displayed value
  } else if (salaryRaw && typeof salaryRaw === 'object') {
    const s = salaryRaw as { min?: number; max?: number };
    salaryMin = s.min || null;
    salaryMax = s.max || null;
  }

  // position may not be in the feed response; fall back to first item of positions array
  const positionsArr = (profile as any).positions as string[] | undefined;
  const position = profile.position || (positionsArr && positionsArr.length > 0 ? positionsArr[0] : null) || null;

  return {
    id: profile.id,
    name: profile.name,
    position,
    location: profile.location || null,
    availability: {
      days: profile.availability?.days || [],
      hours: profile.availability?.hours || null,
      startDate: profile.availability?.start_date || null,
    },
    salaryRange: {
      min: salaryMin,
      max: salaryMax,
    },
    imageUrl: profile.image_url || null,
    role: normalizeUserRole(profile.role),
    // These fields may not come from backend, set defaults
    experienceYears: null,
    description: null,
    jobType: null,
    radiusKm: null,
    createdAt: profile.created_at || null,
    isUrgent: (profile as any).is_urgent || null,
    industry: profile.industry || null,
  };
}

// GET /api/feed/{userId} - Get profiles for discovery feed
export async function getFeed(currentUser: CurrentUser): Promise<MatchCardData[]> {
  if (!currentUser.profileId || !currentUser.role) {
    return [];
  }

  try {
    const response = await apiCall<{ profiles: BackendFeedProfile[] } | BackendFeedProfile[]>(
      `/feed/${currentUser.profileId}`
    );
    
    // Handle both array and object response formats
    const profiles = Array.isArray(response) ? response : (response.profiles || []);
    
    // Transform each profile to frontend format
    return profiles.map(transformToMatchCardData);
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
}

// Backend swipe response (may use snake_case)
interface BackendSwipeResponse {
  is_match?: boolean;
  isMatch?: boolean;
  match_id?: string;
  matchId?: string;
}

// POST /api/swipe - Record a swipe action
export async function postSwipe(request: SwipeRequest): Promise<SwipeResponse> {
  // Validate swiped_id before sending
  if (!request.swipedId) {
    console.error("[Swipe API] Invalid swiped_id:", request.swipedId);
    throw new Error("שגיאה: מזהה משתמש לא תקין");
  }

  console.log("[Swipe API] Sending swipe request:", {
    swiper_id: request.swiperId,
    swiped_id: request.swipedId,
    type: request.type,
  });

  try {
    const response = await apiCall<BackendSwipeResponse>("/swipe", {
      method: "POST",
      body: JSON.stringify({
        swiper_id: request.swiperId,
        swiped_id: request.swipedId,
        type: request.type,
      }),
    });

    // Log the raw response to debug matchId extraction
    console.log("[Swipe API] Raw response:", JSON.stringify(response));

    // Handle both snake_case and camelCase from backend
    const isMatch = response.isMatch ?? response.is_match ?? false;
    const matchId = response.matchId ?? response.match_id;

    console.log("[Swipe API] Extracted - isMatch:", isMatch, "matchId:", matchId);

    return {
      success: true,
      isMatch,
      matchId,
    };
  } catch (error) {
    // Enhanced error logging for debugging
    console.error("[Swipe API] Error details:", {
      swiperId: request.swiperId,
      swipedId: request.swipedId,
      type: request.type,
      error: error instanceof Error ? error.message : error,
    });
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`שגיאה ביצירת Match: ${error.message}`);
    }
    throw new Error("שגיאה ביצירת Match - נסה שוב");
  }
}

// Backend match response structure - handles both formats
interface BackendMatchFlat {
  match_id: string;
  profile_id: string;
  name: string;
  position?: string | null;
  location?: string | null;
  image_url?: string | null;
  role?: string;
  is_closed?: boolean;
  created_at?: string;
}

interface BackendMatchNested {
  id: string;
  created_at: string;
  is_closed: boolean;
  other_profile: {
    id: string;
    name: string;
    position?: string | null;
    image_url?: string | null;
    role?: string;
    location?: string | null;
  };
}

type BackendMatch = BackendMatchFlat | BackendMatchNested;

// Check if match is flat format (from /matches/{userId} endpoint)
function isFlatMatch(match: BackendMatch): match is BackendMatchFlat {
  return 'match_id' in match && 'profile_id' in match;
}

// Transform backend match to frontend Match
function transformToMatch(match: BackendMatch): Match {
  // Handle flat format: { match_id, profile_id, name, position, location }
  if (isFlatMatch(match)) {
    return {
      id: match.match_id,
      createdAt: match.created_at || new Date().toISOString(),
      isClosed: match.is_closed || false,
      otherProfile: {
        id: match.profile_id,
        name: match.name,
        position: match.position || null,
        location: match.location || null,
        availability: { days: [], hours: null, startDate: null },
        salaryRange: { min: null, max: null },
        experienceYears: null,
        imageUrl: match.image_url || null,
        role: (match.role?.toLowerCase() as "clinic" | "worker") || "worker",
        description: null,
        jobType: null,
        radiusKm: null,
        createdAt: null,
      },
    };
  }
  
  // Handle nested format: { id, other_profile: {...} }
  return {
    id: match.id,
    createdAt: match.created_at,
    isClosed: match.is_closed,
    otherProfile: {
      id: match.other_profile.id,
      name: match.other_profile.name,
      position: match.other_profile.position || null,
      location: match.other_profile.location || null,
      availability: { days: [], hours: null, startDate: null },
      salaryRange: { min: null, max: null },
      experienceYears: null,
      imageUrl: match.other_profile.image_url || null,
      role: (match.other_profile.role?.toLowerCase() as "clinic" | "worker") || "worker",
      description: null,
      jobType: null,
      radiusKm: null,
      createdAt: null,
    },
  };
}

// GET /api/matches/{userId} - Get all matches for current user
export async function getMatches(currentUser: CurrentUser): Promise<Match[]> {
  if (!currentUser.profileId) {
    return [];
  }

  try {
    console.log("[getMatches] Fetching for profileId:", currentUser.profileId);
    const response = await apiCall<{ matches: BackendMatch[] } | BackendMatch[]>(
      `/matches/${currentUser.profileId}`
    );
    
    console.log("[getMatches] Raw response:", JSON.stringify(response));
    const matches = Array.isArray(response) ? response : (response.matches || []);
    const transformed = matches.map(transformToMatch);
    console.log("[getMatches] Transformed matches:", transformed.length, "items");
    return transformed;
  } catch (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }
}

// GET /api/matches/{userId}/{matchId} - Get single match details
export async function getMatchDetails(userId: string, matchId: string): Promise<Match | null> {
  try {
    const response = await apiCall<BackendMatch>(`/matches/${userId}/${matchId}`);
    return transformToMatch(response);
  } catch (error) {
    console.error("Error fetching match details:", error);
    return null;
  }
}

// POST /api/matches/{matchId}/close - Close a match
export async function closeMatch(matchId: string, userId: string): Promise<void> {
  try {
    await apiCall(`/matches/${matchId}/close`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (error) {
    console.error("Error closing match:", error);
    throw error;
  }
}

// Backend profile response structure
interface BackendProfile {
  id: string;
  email: string;
  role: string;
  name: string;
  position?: string;
  required_position?: string; // For clinics
  location?: string;
  salary_info?: { min?: number; max?: number } | null;
  availability?: { days?: string[]; hours?: string; start_date?: string } | null;
  created_at?: string;
  is_admin?: boolean;
  isAdmin?: boolean;
}

// Transform backend profile to CurrentUser
function transformToCurrentUser(profile: BackendProfile): CurrentUser {
  const role = normalizeUserRole(profile.role);
  const position = profile.position ?? null;
  const requiredPosition = profile.required_position ?? null;
  const location = profile.location ?? null;
  
  // Profile is complete when:
  // - Has name
  // - Has position (worker) or required_position (clinic)
  // - Has location
  const hasPosition = role === "clinic" ? Boolean(requiredPosition) : Boolean(position);
  const hasLocation = Boolean(location);
  const isProfileComplete = Boolean(profile.name && hasPosition && hasLocation);

  return {
    id: profile.id,
    email: profile.email,
    profileId: profile.id,
    role,
    name: profile.name,
    imageUrl: null,
    position,
    location,
    isProfileComplete,
    isAdmin: profile.is_admin ?? profile.isAdmin ?? false,
  };
}

// Backend auth response with JWT token
interface BackendAuthResponse {
  success?: boolean;
  user: BackendProfile;
  token: string;
}

// POST /api/auth/login - Login with email only (no password for MVP)
export async function login(
  email: string
): Promise<{ user: CurrentUser | null; error: string | null; needsRegistration?: boolean }> {
  try {
    const response = await apiCall<BackendAuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    // Save JWT token
    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }

    // Transform user profile
    const user = transformToCurrentUser(response.user);
    localStorage.setItem("current_user", JSON.stringify(user));

    // Cache full profile locally (backend has no GET /profiles/:id)
    try {
      const profile = transformToProfile(response.user as unknown as FullBackendProfile);
      localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore cache errors
    }
    
    return { user, error: null };
  } catch (error) {
    if (error instanceof Error) {
      // Check if user not found - needs registration
      if (error.message.includes("404") || error.message.includes("not found") || error.message.includes("לא נמצא")) {
        return { user: null, error: "האימייל לא נמצא, אנא הירשם", needsRegistration: true };
      }
      return { user: null, error: error.message };
    }
    return { user: null, error: "התחברות נכשלה" };
  }
}

// Profile creation data
export interface ProfileCreateData {
  email: string;
  role: "CLINIC" | "STAFF";
  name: string;
  position?: string;
  positions?: string[]; // Array of positions (new multi-select)
  required_position?: string; // Required for clinics
  workplace_types?: string[]; // Array of domains (e.g., "dental", "optics")
  industry?: string | null;
  location?: string;
  salary_info?: {
    min?: number;
    max?: number;
  };
  availability?: {
    days?: string[];
    hours?: string;
    start_date?: string;
  };
}

// POST /api/profiles - Create a new profile (signup)
export async function createProfile(
  data: ProfileCreateData
): Promise<{ user: CurrentUser | null; error: string | null }> {
  try {
    // Build payload with positions array support
    const payload: Record<string, unknown> = {
      email: data.email,
      role: data.role,
      name: data.name,
      location: data.location,
    };

    // Handle positions - send as array if provided, or single position
    if (data.positions && data.positions.length > 0) {
      payload.positions = data.positions;
      // Also set single position for backward compatibility
      payload.position = data.positions[0];
    } else if (data.position) {
      payload.position = data.position;
    }

    // Handle workplace_types array
    if (data.workplace_types && data.workplace_types.length > 0) {
      payload.workplace_types = data.workplace_types;
    }

    // Pass industry
    payload.industry = data.industry || null;

    if (data.required_position) {
      payload.required_position = data.required_position;
    }

    if (data.salary_info) {
      payload.salary_info = data.salary_info;
    }

    if (data.availability) {
      payload.availability = data.availability;
    }

    const response = await apiCall<BackendAuthResponse>("/profiles", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Save JWT token from registration response
    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }

    const user = transformToCurrentUser(response.user);
    localStorage.setItem("current_user", JSON.stringify(user));

    // Cache full profile locally (backend has no GET /profiles/:id)
    try {
      const profile = transformToProfile(response.user as unknown as FullBackendProfile);
      localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore cache errors
    }
    
    return { user, error: null };
  } catch (error) {
    if (error instanceof Error) {
      // Handle duplicate email error
      if (error.message.includes("duplicate") || error.message.includes("unique constraint")) {
        return { user: null, error: "האימייל כבר רשום במערכת. נסה להתחבר במקום להירשם." };
      }
      return { user: null, error: error.message };
    }
    return { user: null, error: "יצירת הפרופיל נכשלה" };
  }
}

// Profile update data for PUT /api/profiles/:id
export interface ProfileUpdateData {
  name?: string;
  role?: "CLINIC" | "STAFF" | "clinic" | "worker";
  position?: string | null;
  positions?: string[] | null; // Array of positions (new multi-select)
  required_position?: string | null;
  workplace_types?: string[] | null; // Array of domains
  description?: string | null;
  city?: string | null;
  preferred_area?: string | null;
  radius_km?: number | null;
  experience_years?: number | null;
  availability_date?: string | null;
  availability_days?: string[] | null;
  availability_hours?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  job_type?: string | null;
  // Recruitment settings (clinic only)
  screening_questions?: string[] | null;
  is_auto_screener_active?: boolean | null;
  // Boost profile (clinic only)
  is_urgent?: boolean | null;
}

// Full profile response from backend
export interface FullBackendProfile {
  id: string;
  email: string;
  role: string;
  name: string;
  position?: string | null;
  positions?: string[] | null; // Array of positions (new multi-select)
  required_position?: string | null;
  workplace_types?: string[] | null; // Array of domains
  description?: string | null;
  city?: string | null;
  location?: string | null;
  preferred_area?: string | null;
  radius_km?: number | null;
  experience_years?: number | null;
  availability_date?: string | null;
  availability_days?: string[] | null;
  availability_hours?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_info?: { min?: number; max?: number } | null;
  job_type?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  is_admin?: boolean;
}

// Transform backend profile to frontend Profile type
export function transformToProfile(profile: FullBackendProfile) {
  const role = normalizeUserRole(profile.role);
  const location = profile.city || profile.location || null;

  return {
    id: profile.id,
    user_id: profile.id, // Backend uses id as user_id
    name: profile.name,
    role,
    position: profile.position || null,
    positions: profile.positions || null, // Array of positions
    required_position: profile.required_position || null,
    workplace_types: profile.workplace_types || null, // Array of domains
    description: profile.description || null,
    // Backend stores a single `location` string; in the UI:
    // - clinic uses `city`
    // - worker uses `preferred_area`
    city: role === "clinic" ? location : (profile.city || null),
    preferred_area: role === "worker" ? (profile.preferred_area || profile.location || null) : (profile.preferred_area || null),
    radius_km: profile.radius_km || null,
    experience_years: profile.experience_years || null,
    availability_date: profile.availability_date || null,
    availability_days: profile.availability_days || null,
    availability_hours: profile.availability_hours || null,
    salary_min: profile.salary_min ?? profile.salary_info?.min ?? null,
    salary_max: profile.salary_max ?? profile.salary_info?.max ?? null,
    job_type: profile.job_type as "daily" | "temporary" | "permanent" | null,
    avatar_url: profile.avatar_url || profile.image_url || null,
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: profile.updated_at || new Date().toISOString(),
  };
}

// GET /api/profiles/:id - Get profile by ID
export async function getProfile(profileId: string): Promise<ReturnType<typeof transformToProfile> | null> {
  // Backend does not support GET /api/profiles/:id (returns 404), so we rely on local cache.
  try {
    const cached = localStorage.getItem(CURRENT_PROFILE_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as ReturnType<typeof transformToProfile>;
      if (parsed?.id === profileId) return parsed;
    }

    // Fallback: derive minimal profile from current_user (if it has cached fields)
    const storedUser = localStorage.getItem("current_user");
    if (storedUser) {
      const u = JSON.parse(storedUser) as Partial<CurrentUser> & { location?: string | null; position?: string | null };
      if (u.profileId === profileId) {
        const derived: FullBackendProfile = {
          id: profileId,
          email: String(u.email || ""),
          role: String(u.role || "worker"),
          name: String(u.name || ""),
          position: u.position ?? null,
          location: u.location ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return transformToProfile(derived);
      }
    }

    return null;
  } catch (error) {
    console.error("Error reading cached profile:", error);
    return null;
  }
}

// POST /api/profiles - Update profile (backend uses POST as upsert)
export async function updateProfileApi(
  profileId: string,
  data: ProfileUpdateData
): Promise<{ profile: ReturnType<typeof transformToProfile> | null; error: string | null }> {
  try {
    // Get email from current user (required by backend for upsert identification)
    const currentUserData = localStorage.getItem("current_user");
    let email: string | undefined;
    if (currentUserData) {
      try {
        const parsedUser = JSON.parse(currentUserData);
        email = parsedUser.email;
      } catch {
        // Ignore parse errors
      }
    }
    
    if (!email) {
      return { profile: null, error: "Email is required - please login again" };
    }
    
    // Map frontend role format to backend format
    let backendRole: string | undefined;
    if (data.role) {
      backendRole = data.role === "clinic" || data.role === "CLINIC" ? "CLINIC" : "STAFF";
    }
    
    // Transform frontend fields to backend format - include email
    const backendData: Record<string, unknown> = { 
      email, // Always include email for backend identification (upsert key)
      name: data.name,
      role: backendRole,
      position: data.position,
      required_position: data.required_position, // Required for clinics
    };

    // Handle positions array - CRITICAL for matching logic
    if (data.positions && data.positions.length > 0) {
      backendData.positions = data.positions;
      // Also set single position for backward compatibility
      if (!data.position) {
        backendData.position = data.positions[0];
      }
    }

    // Handle workplace_types array - CRITICAL for matching logic
    if (data.workplace_types && data.workplace_types.length > 0) {
      backendData.workplace_types = data.workplace_types;
    }

    console.log("[updateProfileApi] Sending payload:", JSON.stringify(backendData, null, 2));
    
    // Convert salary fields to salary_info
    if (data.salary_min !== undefined || data.salary_max !== undefined) {
      backendData.salary_info = {
        min: data.salary_min,
        max: data.salary_max,
      };
    }
    
    // Convert availability fields
    if (data.availability_days || data.availability_hours || data.availability_date) {
      backendData.availability = {
        days: data.availability_days,
        hours: data.availability_hours,
        start_date: data.availability_date,
      };
    }
    
    // Map city/preferred_area to location
    if (data.city) {
      backendData.location = data.city;
    } else if (data.preferred_area) {
      backendData.location = data.preferred_area;
    }
    
    // Include recruitment settings (clinic only)
    if (data.screening_questions !== undefined) {
      backendData.screening_questions = data.screening_questions;
    }
    if (data.is_auto_screener_active !== undefined) {
      backendData.is_auto_screener_active = data.is_auto_screener_active;
    }
    
    // Include boost profile settings (clinic only)
    if (data.is_urgent !== undefined) {
      backendData.is_urgent = data.is_urgent;
    }
    
    // Use POST /api/profiles (upsert endpoint) instead of PUT
    const response = await apiCall<BackendAuthResponse>("/profiles", {
      method: "POST",
      body: JSON.stringify(backendData),
    });
    
    // Save updated token if returned
    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }
    
    const profile = transformToProfile(response.user as unknown as FullBackendProfile);

    // Cache latest profile locally for ProfileGuard/useProfile
    localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    
    // Update current_user in localStorage with new data
    const storedUser = localStorage.getItem("current_user");
    if (storedUser) {
      const currentUser = JSON.parse(storedUser);
      currentUser.name = profile.name;
      currentUser.role = profile.role;
      currentUser.position = profile.position;
      currentUser.location = profile.city || profile.preferred_area;
      const hasPosition = Boolean(profile.position || profile.required_position);
      const hasLocation = Boolean(profile.city || profile.preferred_area);
      currentUser.isProfileComplete = Boolean(profile.name && hasPosition && hasLocation);
      localStorage.setItem("current_user", JSON.stringify(currentUser));
    }
    
    return { profile, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { profile: null, error: error.message };
    }
    return { profile: null, error: "עדכון הפרופיל נכשל" };
  }
}

// Get current user from localStorage
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const stored = localStorage.getItem("current_user");
  if (!stored) return null;

  try {
    return JSON.parse(stored) as CurrentUser;
  } catch (error) {
    console.error("Error parsing current user:", error);
    localStorage.removeItem("current_user");
    return null;
  }
}

// Logout - clear all auth-related local storage
export async function logout(): Promise<void> {
  localStorage.removeItem("current_user");
  localStorage.removeItem("auth_token");
  localStorage.removeItem(CURRENT_PROFILE_STORAGE_KEY);
}

// Backend message structure
interface BackendMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// Transform to frontend Message
function transformToMessage(msg: BackendMessage): Message {
  return {
    id: msg.id,
    matchId: msg.match_id,
    senderId: msg.sender_id,
    content: msg.content,
    createdAt: msg.created_at,
  };
}

// GET /api/messages/{matchId} - Get messages for a match
export async function getMessages(matchId: string): Promise<Message[]> {
  try {
    const response = await apiCall<{ messages: BackendMessage[] } | BackendMessage[]>(
      `/messages/${matchId}`
    );
    
    const messages = Array.isArray(response) ? response : (response.messages || []);
    return messages.map(transformToMessage);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

// POST /api/messages - Send a message
export async function sendMessage(
  matchId: string, 
  senderId: string, 
  content: string
): Promise<Message> {
  try {
    const response = await apiCall<BackendMessage>("/messages", {
      method: "POST",
      body: JSON.stringify({ match_id: matchId, sender_id: senderId, content }),
    });
    return transformToMessage(response);
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

// POST /api/ai/generate-bio - Generate bio using AI
export async function generateBio(keywords: string, role: string): Promise<string> {
  try {
    const response = await apiCall<{ bio: string }>("/ai/generate-bio", {
      method: "POST",
      body: JSON.stringify({ keywords, role }),
    });
    return response.bio;
  } catch (error) {
    console.error("Error generating bio:", error);
    throw error;
  }
}

// POST /api/ai/generate-questions - Generate screening questions using AI
export async function generateScreeningQuestions(
  position?: string, 
  workplaceType?: string
): Promise<string[]> {
  try {
    const response = await apiCall<{ questions: string[] }>("/ai/generate-questions", {
      method: "POST",
      body: JSON.stringify({ position, workplace_type: workplaceType }),
    });
    return response.questions || [];
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
}
