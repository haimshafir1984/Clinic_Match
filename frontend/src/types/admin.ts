// Admin Panel Types

export interface AdminStats {
  totalUsers: number;
  totalClinics: number;
  totalWorkers: number;
  activeMatches: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "clinic" | "worker";
  position: string | null;
  isBlocked: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface AdminStatsResponse {
  stats: AdminStats;
}

export interface ToggleBlockRequest {
  adminId: string;
  userIdToBlock: string;
  blockStatus: boolean;
}

export interface ToggleBlockResponse {
  success: boolean;
  message?: string;
}
