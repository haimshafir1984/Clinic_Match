export type UserRole = "clinic" | "worker";
export type JobType = "daily" | "temporary" | "permanent";
export type SwipeType = "LIKE" | "PASS";
export type Industry = "medical" | "tech" | "education" | "construction" | "daily" | "communication" | "insurance";
export type RecruitmentStage = "matched" | "screening" | "interview" | "offer" | "hired" | "archived";
export type TalentPoolStatus = "saved" | "contacted" | "future_fit" | "archived";
export type InterviewStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type InterviewType = "phone" | "video" | "onsite";

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
  strengths?: string[];
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

export interface RecruitmentPipeline {
  matchId: string;
  clinicId: string;
  candidateId: string;
  stage: RecruitmentStage;
  summary: string | null;
  nextStep: string | null;
  aiNotes: string | null;
  savedToTalent: boolean;
  updatedAt: string;
}

export interface InterviewSchedule {
  id: string;
  matchId: string;
  createdBy: string;
  scheduledFor: string;
  status: InterviewStatus;
  interviewType: InterviewType;
  location: string | null;
  notes: string | null;
}

export interface TalentPoolEntry {
  id: string;
  clinicId: string;
  candidateId: string;
  matchId: string | null;
  tags: string[];
  notes: string | null;
  status: TalentPoolStatus;
  createdAt: string;
  updatedAt: string;
  candidate: MatchCardData;
}

export interface AnalyticsSummary {
  profileCompletion: number;
  totalMatches: number;
  activeMatches: number;
  totalMessages: number;
  savedCandidates: number;
  scheduledInterviews: number;
  pipelineBreakdown: Array<{ stage: RecruitmentStage; count: number }>;
}

export interface MarketJob {
  id: string;
  source: string;
  externalId: string | null;
  title: string;
  company: string | null;
  location: string | null;
  jobType: string | null;
  industry: string | null;
  employmentType: string | null;
  description: string | null;
  applyUrl: string;
  sourceUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  postedAt: string | null;
  fetchedAt: string;
}

export interface Match {
  id: string;
  createdAt: string;
  isClosed: boolean;
  otherProfile: MatchCardData;
  pipeline?: RecruitmentPipeline | null;
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
