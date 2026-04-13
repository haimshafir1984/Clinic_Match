import {
  CurrentUser,
  Match,
  MatchCardData,
  MarketJob,
  Message,
  SwipeRequest,
  SwipeResponse,
  UserRole,
} from "@/types";

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? "http://localhost:10000/api" : "https://clinic-match.onrender.com/api");
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
      throw new Error("\u05d4\u05d1\u05e7\u05e9\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4 - \u05d4\u05e9\u05e8\u05ea \u05dc\u05d0 \u05de\u05d2\u05d9\u05d1. \u05e0\u05e1\u05d4 \u05d0\u05d5 \u05e0\u05e1\u05d9 \u05e9\u05d5\u05d1.");
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
        return { user: null, error: "\u05d4\u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05dc\u05d0 \u05e0\u05de\u05e6\u05d0, \u05d0\u05e4\u05e9\u05e8 \u05dc\u05d4\u05d9\u05e8\u05e9\u05dd", needsRegistration: true };
      }
      return { user: null, error: error.message };
    }
    return { user: null, error: "\u05d4\u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05e0\u05db\u05e9\u05dc\u05d4" };
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
    return { user: null, error: "\u05d9\u05e6\u05d9\u05e8\u05ea \u05d4\u05e4\u05e8\u05d5\u05e4\u05d9\u05dc \u05e0\u05db\u05e9\u05dc\u05d4" };
  }
}
export interface ProfileUpdateData {
  name?: string;
  role?: "CLINIC" | "STAFF" | "clinic" | "worker";
  industry?: string | null;
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
    industry: profile.industry || null,
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
      industry: data.industry ?? null,
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
        industry: profile.industry,
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
    return { profile: null, error: "\u05e2\u05d3\u05db\u05d5\u05df \u05d4\u05e4\u05e8\u05d5\u05e4\u05d9\u05dc \u05e0\u05db\u05e9\u05dc" };
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



interface BackendInterview {
  id: string;
  match_id: string;
  created_by: string;
  scheduled_for: string;
  status: InterviewSchedule["status"];
  interview_type: InterviewSchedule["interviewType"];
  location?: string | null;
  notes?: string | null;
}

interface BackendTalentPoolEntry {
  id: string;
  clinic_id: string;
  candidate_id: string;
  match_id?: string | null;
  tags?: string[];
  notes?: string | null;
  status: TalentPoolEntry["status"];
  created_at: string;
  updated_at: string;
  name: string;
  position?: string | null;
  location?: string | null;
  role?: string;
  image_url?: string | null;
}

function transformInterview(interview: BackendInterview): InterviewSchedule {
  return {
    id: interview.id,
    matchId: interview.match_id,
    createdBy: interview.created_by,
    scheduledFor: interview.scheduled_for,
    status: interview.status,
    interviewType: interview.interview_type,
    location: interview.location || null,
    notes: interview.notes || null,
  };
}

function transformTalentPoolEntry(entry: BackendTalentPoolEntry): TalentPoolEntry {
  const candidate = transformToMatchCardData({
    id: entry.candidate_id,
    name: entry.name,
    position: entry.position,
    location: entry.location,
    image_url: entry.image_url,
    role: entry.role,
  });

  return {
    id: entry.id,
    clinicId: entry.clinic_id,
    candidateId: entry.candidate_id,
    matchId: entry.match_id || null,
    tags: entry.tags || [],
    notes: entry.notes || null,
    status: entry.status,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    candidate,
  };
}

export async function getRecruitment(matchId: string): Promise<{ pipeline: RecruitmentPipeline | null; interviews: InterviewSchedule[]; canManage: boolean }> {
  const response = await apiCall<{ pipeline?: BackendPipeline | null; interviews?: BackendInterview[]; can_manage?: boolean }>(`/recruitment/${matchId}`);
  return {
    pipeline: transformPipeline(response.pipeline || null),
    interviews: (response.interviews || []).map(transformInterview),
    canManage: response.can_manage === true,
  };
}

export async function updateRecruitment(matchId: string, payload: Partial<Pick<RecruitmentPipeline, "stage" | "summary" | "nextStep" | "aiNotes" | "savedToTalent">>): Promise<RecruitmentPipeline | null> {
  const response = await apiCall<BackendPipeline>(`/recruitment/${matchId}`, {
    method: "PUT",
    body: JSON.stringify({
      stage: payload.stage,
      summary: payload.summary,
      next_step: payload.nextStep,
      ai_notes: payload.aiNotes,
      saved_to_talent: payload.savedToTalent,
    }),
  });
  return transformPipeline(response);
}

export async function getTalentPool(currentUser: CurrentUser): Promise<TalentPoolEntry[]> {
  if (!currentUser.profileId) return [];
  const response = await apiCall<BackendTalentPoolEntry[]>(`/talent-pool/${currentUser.profileId}`);
  return response.map(transformTalentPoolEntry);
}

export async function saveToTalentPool(candidateId: string, matchId: string, payload?: { tags?: string[]; notes?: string; status?: TalentPoolEntry["status"] }): Promise<void> {
  await apiCall("/talent-pool", {
    method: "POST",
    body: JSON.stringify({
      candidate_id: candidateId,
      match_id: matchId,
      tags: payload?.tags || [],
      notes: payload?.notes || null,
      status: payload?.status || "saved",
    }),
  });
}

export async function scheduleInterview(matchId: string, payload: { scheduledFor: string; interviewType: InterviewSchedule["interviewType"]; location?: string; notes?: string }): Promise<InterviewSchedule> {
  const response = await apiCall<BackendInterview>("/interviews", {
    method: "POST",
    body: JSON.stringify({
      match_id: matchId,
      scheduled_for: payload.scheduledFor,
      interview_type: payload.interviewType,
      location: payload.location || null,
      notes: payload.notes || null,
    }),
  });
  return transformInterview(response);
}

export async function updateInterview(interviewId: string, payload: { status: InterviewSchedule["status"]; notes?: string }): Promise<InterviewSchedule> {
  const response = await apiCall<BackendInterview>(`/interviews/${interviewId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: payload.status, notes: payload.notes || null }),
  });
  return transformInterview(response);
}

export async function getAnalytics(currentUser: CurrentUser): Promise<AnalyticsSummary> {
  if (!currentUser.profileId) {
    return {
      profileCompletion: 0,
      totalMatches: 0,
      activeMatches: 0,
      totalMessages: 0,
      savedCandidates: 0,
      scheduledInterviews: 0,
      pipelineBreakdown: [],
    };
  }

  const response = await apiCall<{
    profile_completion?: number;
    total_matches?: number;
    active_matches?: number;
    total_messages?: number;
    saved_candidates?: number;
    scheduled_interviews?: number;
    pipeline_breakdown?: Array<{ stage: RecruitmentPipeline["stage"]; count: number | string }>;
  }>(`/analytics/${currentUser.profileId}`);

  return {
    profileCompletion: response.profile_completion ?? 0,
    totalMatches: response.total_matches ?? 0,
    activeMatches: response.active_matches ?? 0,
    totalMessages: response.total_messages ?? 0,
    savedCandidates: response.saved_candidates ?? 0,
    scheduledInterviews: response.scheduled_interviews ?? 0,
    pipelineBreakdown: (response.pipeline_breakdown || []).map((item) => ({ stage: item.stage, count: Number(item.count) })),
  };
}

export async function parseSearchQuery(query: string): Promise<Record<string, unknown>> {
  return apiCall<Record<string, unknown>>("/ai/parse-search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export async function getProfileHighlights(profileId: string): Promise<{ highlights: string[]; suggestions: string[] }> {
  return apiCall<{ highlights: string[]; suggestions: string[] }>("/ai/profile-highlights", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId }),
  });
}

interface BackendMarketJob {
  id: string;
  source: string;
  external_id?: string | null;
  title: string;
  company?: string | null;
  location?: string | null;
  job_type?: string | null;
  industry?: string | null;
  employment_type?: string | null;
  description?: string | null;
  apply_url: string;
  source_url?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  posted_at?: string | null;
  fetched_at: string;
  match_score?: number | null;
  fit_reasons?: string[] | null;
  reason_codes?: string[] | null;
  work_arrangement?: "remote" | "hybrid" | "onsite" | null;
  freshness_label?: string | null;
  posted_ago_days?: number | null;
  source_rank?: number | null;
  publisher?: string | null;
}

function transformMarketJob(job: BackendMarketJob): MarketJob {
  return {
    id: job.id,
    source: job.source,
    externalId: job.external_id || null,
    title: job.title,
    company: job.company || null,
    location: job.location || null,
    jobType: job.job_type || null,
    industry: job.industry || null,
    employmentType: job.employment_type || null,
    description: job.description || null,
    applyUrl: job.apply_url,
    sourceUrl: job.source_url || null,
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
    postedAt: job.posted_at || null,
    fetchedAt: job.fetched_at,
    matchScore: job.match_score ?? null,
    fitReasons: job.fit_reasons || [],
    reasonCodes: job.reason_codes || [],
    workArrangement: job.work_arrangement ?? null,
    freshnessLabel: job.freshness_label ?? null,
    postedAgoDays: job.posted_ago_days ?? null,
    sourceRank: job.source_rank ?? null,
    publisher: job.publisher ?? null,
  };
}

export async function searchMarketJobs(params: {
  query?: string;
  location?: string;
  industry?: string;
  jobType?: string;
  limit?: number;
  refresh?: boolean;
}): Promise<MarketJob[]> {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set("query", params.query);
  if (params.location) searchParams.set("location", params.location);
  if (params.industry) searchParams.set("industry", params.industry);
  if (params.jobType) searchParams.set("jobType", params.jobType);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.refresh) searchParams.set("refresh", "true");

  const response = await apiCall<{ jobs: BackendMarketJob[] }>(`/market-jobs/search?${searchParams.toString()}`);
  return (response.jobs || []).map(transformMarketJob);
}

export interface ImportMarketJobsResult {
  jobs: MarketJob[];
  warnings: Array<{ source: string; message: string }>;
  sourceStats?: Array<{ source: string; fetched: number; imported: number; warning: string | null }>;
  publisherStats?: Array<{ publisher: string; count: number }>;
}

export async function importMarketJobs(params: {
  query?: string;
  location?: string;
  industry?: string;
  jobType?: string;
  limit?: number;
}): Promise<ImportMarketJobsResult> {
  const response = await apiCall<{
    jobs: BackendMarketJob[];
    warnings: Array<{ source: string; message: string }>;
    sourceStats?: Array<{ source: string; fetched: number; imported: number; warning: string | null }>;
    publisherStats?: Array<{ publisher: string; count: number }>;
  }>("/market-jobs/import", {
    method: "POST",
    body: JSON.stringify(params),
  }, 60000);

  return {
    jobs: (response.jobs || []).map(transformMarketJob),
    warnings: response.warnings || [],
    sourceStats: response.sourceStats || [],
    publisherStats: response.publisherStats || [],
  };
}
