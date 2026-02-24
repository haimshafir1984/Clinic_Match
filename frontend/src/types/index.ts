// ClinicMatch Type Definitions

export type UserRole = "clinic" | "worker";
export type JobType = "daily" | "temporary" | "permanent";
export type SwipeType = "LIKE" | "PASS";

// Availability JSON structure
export interface Availability {
  days: string[];
  hours: string | null;
  startDate: string | null;
}

// Salary range structure
export interface SalaryRange {
  min: number | null;
  max: number | null;
}

// Match Card Data - the profile data shown on swipe cards
export interface MatchCardData {
  id: string;
  name: string;
  position: string | null; // For workers: their position, for clinics: required_position
  location: string | null; // city or preferred_area
  availability: Availability;
  salaryRange: SalaryRange;
  experienceYears: number | null;
  imageUrl: string | null;
  role: UserRole;
  description: string | null;
  jobType: JobType | null;
  radiusKm: number | null;
  createdAt: string | null; // For "New" badge
  isUrgent?: boolean | null; // For "Urgent Hiring" badge (clinics only)
}

// Current User object
export interface CurrentUser {
  id: string;
  email: string;
  profileId: string | null;
  role: UserRole | null;
  name: string | null;
  imageUrl: string | null;
  /** Cached fields from backend profile (used when backend has no GET /profiles/:id). */
  position?: string | null;
  location?: string | null;
  isProfileComplete: boolean;
  isAdmin?: boolean;
}

// Swipe request payload
export interface SwipeRequest {
  swiperId: string;
  swipedId: string;
  type: SwipeType;
}

// Swipe response
export interface SwipeResponse {
  success: boolean;
  isMatch: boolean;
  matchId?: string;
}

// Match object
export interface Match {
  id: string;
  createdAt: string;
  isClosed: boolean;
  otherProfile: MatchCardData;
}

// Message object
export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

// API Response types
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
