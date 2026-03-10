import {
  CurrentUser,
  Match,
  MatchCardData,
  Message,
  SwipeRequest,
  SwipeResponse,
  UserRole,
} from "@/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:10000/api";
const API_TIMEOUT_MS = 15_000;

async function apiCall<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = API_TIMEOUT_MS): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Server error" }));
      throw new Error(error.error || error.message || `Request failed (${response.status})`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    window.clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("הבקשה נכשלה - השרת לא מגיב. נסה שוב.");
    }
    throw error;
  }
}

function normalizeUserRole(role: string | null | undefined): UserRole {
  const value = role?.toLowerCase();
  return value === "clinic" ? "clinic" : "worker";
}

interface BackendFeedProfile {
  id: string;
  name: string;
  position?: string | null;
  location?: string | null;
  salary_info?: { min?: number | null; max?: number | null } | number | null;
  availability?: { days?: string[] | null; hours?: string | null; start_date?: string | null } | null;
  image_url?: string | null;
  role?: string;
  industry?: string | null;
  created_at?: string | null;
  is_urgent?: boolean | null;
  experience_years?: number | null;
  description?: string | null;
  job_type?: string | null;
  radius_km?: number | null;
}

function normalizeSalaryRange(value: BackendFeedProfile["salary_info"]) {
  if (typeof value === "number") {
    return { min: value, max: value };
  }
  return {
    min: value?.min ?? null,
    max: value?.max ?? null,
  };
}

function transformToMatchCardData(profile: BackendFeedProfile): MatchCardData {
  const salaryRange = normalizeSalaryRange(profile.salary_info);

  return {
    id: profile.id,
    name: profile.name,
    position: profile.position || null,
    location: profile.location || null,
    availability: {
      days: profile.availability?.days || [],
      hours: profile.availability?.hours || null,
      startDate: profile.availability?.start_date || null,
    },
    salaryRange,
    imageUrl: profile.image_url || null,
    role: normalizeUserRole(profile.role),
    experienceYears: profile.experience_years ?? null,
    description: profile.description || null,
    jobType: (profile.job_type as MatchCardData["jobType"]) || null,
    radiusKm: profile.radius_km ?? null,
    createdAt: profile.created_at || null,
    isUrgent: profile.is_urgent ?? null,
    industry: (profile.industry as MatchCardData["industry"]) || null,
  };
}

export async function getFeed(currentUser: CurrentUser): Promise<MatchCardData[]> {
  if (!currentUser.profileId) return [];
  const response = await apiCall<BackendFeedProfile[] | { profiles: BackendFeedProfile[] }>(`/feed/${currentUser.profileId}`);
  const profiles = Array.isArray(response) ? response : response.profiles || [];
  return profiles.map(transformToMatchCardData);
}

interface BackendSwipeResponse {
  is_match?: boolean;
  isMatch?: boolean;
  match_id?: string;
  matchId?: string;
}

export async function postSwipe(request: SwipeRequest): Promise<SwipeResponse> {
  const response = await apiCall<BackendSwipeResponse>("/swipe", {
    method: "POST",
    body: JSON.stringify({
      swiper_id: request.swiperId,
      swiped_id: request.swipedId,
      type: request.type,
    }),
  });

  return {
    success: true,
    isMatch: response.isMatch ?? response.is_match ?? false,
    matchId: response.matchId ?? response.match_id,
  };
}

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

function isFlatMatch(match: BackendMatch): match is BackendMatchFlat {
  return "match_id" in match;
}

function transformToMatch(match: BackendMatch): Match {
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
        role: normalizeUserRole(match.role),
        description: null,
        jobType: null,
        radiusKm: null,
        createdAt: null,
      },
    };
  }

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
      role: normalizeUserRole(match.other_profile.role),
      description: null,
      jobType: null,
      radiusKm: null,
      createdAt: null,
    },
  };
}

export async function getMatches(currentUser: CurrentUser): Promise<Match[]> {
  if (!currentUser.profileId) return [];
  const response = await apiCall<BackendMatch[] | { matches: BackendMatch[] }>(`/matches/${currentUser.profileId}`);
  const matches = Array.isArray(response) ? response : response.matches || [];
  return matches.map(transformToMatch);
}

export async function getMatchDetails(userId: string, matchId: string): Promise<Match | null> {
  try {
    const response = await apiCall<BackendMatch>(`/matches/${userId}/${matchId}`);
    return transformToMatch(response);
  } catch {
    return null;
  }
}

export async function closeMatch(matchId: string, userId: string): Promise<void> {
  await apiCall(`/matches/${matchId}/close`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

interface BackendProfile {
  id: string;
  email: string;
  role: string;
  name: string;
  position?: string | null;
  required_position?: string | null;
  positions?: string[] | null;
  workplace_types?: string[] | null;
  industry?: string | null;
  location?: string | null;
  description?: string | null;
  radius_km?: number | null;
  experience_years?: number | null;
  availability_date?: string | null;
  availability_days?: string[] | null;
  availability_hours?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_info?: { min?: number | null; max?: number | null } | number | null;
  availability?: { days?: string[] | null; hours?: string | null; start_date?: string | null } | null;
  job_type?: string | null;
  screening_questions?: string[] | null;
  is_auto_screener_active?: boolean | null;
  is_urgent?: boolean | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  is_admin?: boolean;
  is_blocked?: boolean;
}

function transformToCurrentUser(profile: BackendProfile): CurrentUser {
  const role = normalizeUserRole(profile.role);
  const position = role === "clinic" ? profile.required_position ?? profile.position ?? null : profile.position ?? null;
  const location = profile.location ?? null;
  const isProfileComplete = Boolean(profile.name && position && location);
  const imageUrl = profile.image_url || (role === "clinic" ? profile.logo_url : profile.avatar_url) || null;

  return {
    id: profile.id,
    email: profile.email,
    profileId: profile.id,
    role,
    name: profile.name,
    imageUrl,
    position,
    location,
    industry: (profile.industry as CurrentUser["industry"]) || null,
    isProfileComplete,
    isAdmin: profile.is_admin ?? false,
  };
}

interface BackendAuthResponse {
  success?: boolean;
  user: BackendProfile;
  token?: string;
}

export interface ProfileCreateData {
  email: string;
  role: "CLINIC" | "STAFF";
  name: string;
  position?: string;
  positions?: string[];
  required_position?: string;
  workplace_types?: string[];
  industry?: string | null;
  location?: string;
  description?: string | null;
  radius_km?: number | null;
  experience_years?: number | null;
  salary_info?: { min?: number; max?: number } | null;
  availability?: {
    days?: string[];
    hours?: string;
    start_date?: string;
  };
  job_type?: string | null;
  screening_questions?: string[] | null;
  is_auto_screener_active?: boolean | null;
  is_urgent?: boolean | null;
  avatar_url?: string | null;
  logo_url?: string | null;
}

function buildCreatePayload(data: ProfileCreateData) {
  return {
    email: data.email,
    role: data.role,
    name: data.name,
    position: data.position,
    positions: data.positions,
    required_position: data.required_position,
    workplace_types: data.workplace_types,
    industry: data.industry || null,
    location: data.location,
    description: data.description || null,
    radius_km: data.radius_km ?? null,
    experience_years: data.experience_years ?? null,
    salary_min: data.salary_info?.min ?? null,
    salary_max: data.salary_info?.max ?? null,
    availability_days: data.availability?.days || null,
    availability_hours: data.availability?.hours || null,
    availability_date: data.availability?.start_date || null,
    job_type: data.job_type || null,
    screening_questions: data.screening_questions || null,
    is_auto_screener_active: data.is_auto_screener_active ?? null,
    is_urgent: data.is_urgent ?? null,
    avatar_url: data.avatar_url || null,
    logo_url: data.logo_url || null,
  };
}

export async function login(email: string): Promise<{ user: CurrentUser | null; error: string | null; needsRegistration?: boolean }> {
  try {
    const response = await apiCall<BackendAuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }

    const user = transformToCurrentUser(response.user);
    localStorage.setItem("current_user", JSON.stringify(user));
    return { user, error: null };
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("not found")) {
        return { user: null, error: "האימייל לא נמצא, אפשר להירשם", needsRegistration: true };
      }
      return { user: null, error: error.message };
    }
    return { user: null, error: "ההתחברות נכשלה" };
  }
}

export async function createProfile(data: ProfileCreateData): Promise<{ user: CurrentUser | null; error: string | null }> {
  try {
    const response = await apiCall<BackendAuthResponse>("/profiles", {
      method: "POST",
      body: JSON.stringify(buildCreatePayload(data)),
    });

    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }

    const user = transformToCurrentUser(response.user);
    localStorage.setItem("current_user", JSON.stringify(user));
    return { user, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { user: null, error: error.message };
    }
    return { user: null, error: "יצירת הפרופיל נכשלה" };
  }
}

export interface ProfileUpdateData {
  name?: string;
  role?: "CLINIC" | "STAFF" | "clinic" | "worker";
  position?: string | null;
  positions?: string[] | null;
  workplace_types?: string[] | null;
  required_position?: string | null;
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
  screening_questions?: string[] | null;
  is_auto_screener_active?: boolean | null;
  is_urgent?: boolean | null;
  avatar_url?: string | null;
  logo_url?: string | null;
}

export interface FullBackendProfile extends BackendProfile {}

export function transformToProfile(profile: FullBackendProfile) {
  const role = normalizeUserRole(profile.role);
  const salaryRange = normalizeSalaryRange(profile.salary_info);
  const avatarUrl = profile.avatar_url || (role === "clinic" ? profile.logo_url : profile.image_url) || null;
  const logoUrl = profile.logo_url || (role === "clinic" ? profile.image_url : null) || null;

  return {
    id: profile.id,
    user_id: profile.id,
    name: profile.name,
    role,
    position: role === "clinic" ? profile.position || profile.required_position || null : profile.position || null,
    positions: profile.positions || (profile.position ? [profile.position] : []),
    required_position: profile.required_position || profile.position || null,
    workplace_types: profile.workplace_types || [],
    description: profile.description || null,
    city: role === "clinic" ? profile.location || null : null,
    preferred_area: role === "worker" ? profile.location || null : null,
    radius_km: profile.radius_km ?? null,
    experience_years: profile.experience_years ?? null,
    availability_date: profile.availability_date || profile.availability?.start_date || null,
    availability_days: profile.availability_days || profile.availability?.days || [],
    availability_hours: profile.availability_hours || profile.availability?.hours || null,
    salary_min: profile.salary_min ?? salaryRange.min,
    salary_max: profile.salary_max ?? salaryRange.max,
    job_type: (profile.job_type as "daily" | "temporary" | "permanent" | null) || null,
    avatar_url: avatarUrl,
    logo_url: logoUrl,
    screening_questions: profile.screening_questions || [],
    is_auto_screener_active: profile.is_auto_screener_active ?? false,
    is_urgent: profile.is_urgent ?? false,
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: profile.updated_at || new Date().toISOString(),
  };
}

export async function getProfile(profileId: string) {
  const response = await apiCall<FullBackendProfile>(`/profiles/${profileId}`);
  return transformToProfile(response);
}

export async function updateProfileApi(profileId: string, data: ProfileUpdateData): Promise<{ profile: ReturnType<typeof transformToProfile> | null; error: string | null }> {
  try {
    const backendRole = data.role ? (data.role === "clinic" || data.role === "CLINIC" ? "CLINIC" : "STAFF") : undefined;
    const payload = {
      role: backendRole,
      name: data.name,
      position: data.position,
      positions: data.positions,
      required_position: data.required_position,
      workplace_types: data.workplace_types,
      location: data.city || data.preferred_area || null,
      description: data.description || null,
      radius_km: data.radius_km ?? null,
      experience_years: data.experience_years ?? null,
      availability_date: data.availability_date || null,
      availability_days: data.availability_days || null,
      availability_hours: data.availability_hours || null,
      salary_min: data.salary_min ?? null,
      salary_max: data.salary_max ?? null,
      job_type: data.job_type || null,
      screening_questions: data.screening_questions ?? null,
      is_auto_screener_active: data.is_auto_screener_active ?? null,
      is_urgent: data.is_urgent ?? null,
      avatar_url: data.avatar_url ?? null,
      logo_url: data.logo_url ?? null,
    };

    const response = await apiCall<{ user: FullBackendProfile }>(`/profiles/${profileId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const profile = transformToProfile(response.user);
    const currentUserRaw = localStorage.getItem("current_user");
    if (currentUserRaw) {
      const currentUser = JSON.parse(currentUserRaw) as CurrentUser;
      const nextUser: CurrentUser = {
        ...currentUser,
        name: profile.name,
        role: profile.role,
        position: profile.role === "clinic" ? profile.required_position : profile.position,
        location: profile.city || profile.preferred_area,
        imageUrl: profile.role === "clinic" ? profile.logo_url || profile.avatar_url : profile.avatar_url || profile.logo_url,
        isProfileComplete: Boolean(profile.name && (profile.required_position || profile.position) && (profile.city || profile.preferred_area)),
      };
      localStorage.setItem("current_user", JSON.stringify(nextUser));
    }

    return { profile, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { profile: null, error: error.message };
    }
    return { profile: null, error: "עדכון הפרופיל נכשל" };
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const stored = localStorage.getItem("current_user");
  if (!stored) return null;

  try {
    return JSON.parse(stored) as CurrentUser;
  } catch {
    localStorage.removeItem("current_user");
    return null;
  }
}

export async function logout(): Promise<void> {
  localStorage.removeItem("current_user");
  localStorage.removeItem("auth_token");
}

interface BackendMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

function transformToMessage(message: BackendMessage): Message {
  return {
    id: message.id,
    matchId: message.match_id,
    senderId: message.sender_id,
    content: message.content,
    createdAt: message.created_at,
  };
}

export async function getMessages(matchId: string): Promise<Message[]> {
  const response = await apiCall<BackendMessage[] | { messages: BackendMessage[] }>(`/messages/${matchId}`);
  const messages = Array.isArray(response) ? response : response.messages || [];
  return messages.map(transformToMessage);
}

export async function sendMessage(matchId: string, senderId: string, content: string): Promise<Message> {
  const response = await apiCall<BackendMessage>("/messages", {
    method: "POST",
    body: JSON.stringify({ match_id: matchId, sender_id: senderId, content }),
  });
  return transformToMessage(response);
}

export async function generateBio(keywords: string, role: string): Promise<string> {
  const response = await apiCall<{ bio: string }>("/ai/generate-bio", {
    method: "POST",
    body: JSON.stringify({ keywords, role }),
  });
  return response.bio;
}

export async function generateScreeningQuestions(position?: string, workplaceType?: string): Promise<string[]> {
  const response = await apiCall<{ questions: string[] }>("/ai/generate-questions", {
    method: "POST",
    body: JSON.stringify({ position, workplace_type: workplaceType }),
  });
  return response.questions || [];
}


