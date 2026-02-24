// Admin API Layer for ClinicMatch
// Connects to the Render backend admin endpoints

import { 
  AdminStats, 
  AdminUser, 
  AdminStatsResponse, 
  AdminUsersResponse,
  ToggleBlockRequest,
  ToggleBlockResponse 
} from "@/types/admin";

const API_BASE_URL = "https://clinicmatch.onrender.com/api";

// Helper function for API calls
async function adminApiCall<T>(
  endpoint: string, 
  options: RequestInit = {},
  timeoutMs: number = 15000
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

// Backend response types (snake_case)
interface BackendAdminStats {
  total_users?: number;
  totalUsers?: number;
  total_clinics?: number;
  totalClinics?: number;
  total_workers?: number;
  totalWorkers?: number;
  active_matches?: number;
  activeMatches?: number;
}

interface BackendAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  position?: string | null;
  is_blocked?: boolean;
  isBlocked?: boolean;
  created_at?: string;
  createdAt?: string;
}

// Transform backend stats to frontend format
function transformStats(stats: BackendAdminStats): AdminStats {
  return {
    totalUsers: stats.total_users ?? stats.totalUsers ?? 0,
    totalClinics: stats.total_clinics ?? stats.totalClinics ?? 0,
    totalWorkers: stats.total_workers ?? stats.totalWorkers ?? 0,
    activeMatches: stats.active_matches ?? stats.activeMatches ?? 0,
  };
}

// Transform backend user to frontend format
function transformUser(user: BackendAdminUser): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role?.toLowerCase() as "clinic" | "worker") || "worker",
    position: user.position || null,
    isBlocked: user.is_blocked ?? user.isBlocked ?? false,
    createdAt: user.created_at ?? user.createdAt ?? new Date().toISOString(),
  };
}

// POST /api/admin/stats - Get admin statistics
export async function getAdminStats(adminId: string): Promise<AdminStats> {
  try {
    const response = await adminApiCall<BackendAdminStats | { stats: BackendAdminStats }>("/admin/stats", {
      method: "POST",
      body: JSON.stringify({ adminId }),
    });
    
    // Handle both direct stats object and nested { stats: ... } format
    const stats = "stats" in response ? response.stats : response;
    return transformStats(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    throw error;
  }
}

// POST /api/admin/users - Get all users for admin
export async function getAdminUsers(adminId: string): Promise<AdminUser[]> {
  try {
    const response = await adminApiCall<BackendAdminUser[] | { users: BackendAdminUser[] }>("/admin/users", {
      method: "POST",
      body: JSON.stringify({ adminId }),
    });
    
    // Handle both array and { users: [...] } format
    const users = Array.isArray(response) ? response : (response.users || []);
    return users.map(transformUser);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    throw error;
  }
}

// POST /api/admin/toggle-block - Block/Unblock a user
export async function toggleUserBlock(request: ToggleBlockRequest): Promise<ToggleBlockResponse> {
  try {
    const response = await adminApiCall<ToggleBlockResponse>("/admin/toggle-block", {
      method: "POST",
      body: JSON.stringify({
        adminId: request.adminId,
        userIdToBlock: request.userIdToBlock,
        blockStatus: request.blockStatus,
      }),
    });
    
    return {
      success: response.success ?? true,
      message: response.message,
    };
  } catch (error) {
    console.error("Error toggling user block:", error);
    throw error;
  }
}
