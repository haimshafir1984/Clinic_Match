export type UserRole = "clinic" | "worker";
export type JobType = "daily" | "temporary" | "permanent";
export type SwipeType = "LIKE" | "PASS";
export type Industry = "medical" | "tech" | "education" | "construction" | "daily" | "communication" | "insurance";

export interface Availability {
  days: string[];
  hours: string | null;
  startDate: string | null;
}

export interface SalaryRange {
  min: number | null;
  max: number | null;
}

export interface MatchCardData {
  id: string;
  name: string;
  position: string | null;
  location: string | null;
  availability: Availability;
  salaryRange: SalaryRange;
  experienceYears: number | null;
  imageUrl: string | null;
  role: UserRole;
  description: string | null;
  jobType: JobType | null;
  radiusKm: number | null;
  createdAt: string | null;
  isUrgent?: boolean | null;
  industry?: Industry | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  profileId: string | null;
  role: UserRole | null;
  name: string | null;
  imageUrl: string | null;
  position?: string | null;
  location?: string | null;
  industry?: Industry | null;
  isProfileComplete: boolean;
  isAdmin: boolean;
}

export interface SwipeRequest {
  swiperId: string;
  swipedId: string;
  type: SwipeType;
}

export interface SwipeResponse {
  success: boolean;
  isMatch: boolean;
  matchId?: string;
}

export interface Match {
  id: string;
  createdAt: string;
  isClosed: boolean;
  otherProfile: MatchCardData;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface FeedResponse {
  profiles: MatchCardData[];
  hasMore: boolean;
}

export interface MatchesResponse {
  matches: Match[];
}

export interface AuthResponse {
  user: CurrentUser | null;
  token: string | null;
}
