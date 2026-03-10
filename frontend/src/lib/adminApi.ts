import {
  AdminStats,
  AdminUser,
  ToggleBlockRequest,
  ToggleBlockResponse,
} from "@/types/admin";

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? "http://localhost:10000/api" : "/api");

async function adminApiCall<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = 15_000): Promise<T> {
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
      throw new Error("����� ����� - ���� �� ����. ��� ���.");
    }
    throw error;
  }
}

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

function transformStats(stats: BackendAdminStats): AdminStats {
  return {
    totalUsers: stats.total_users ?? stats.totalUsers ?? 0,
    totalClinics: stats.total_clinics ?? stats.totalClinics ?? 0,
    totalWorkers: stats.total_workers ?? stats.totalWorkers ?? 0,
    activeMatches: stats.active_matches ?? stats.activeMatches ?? 0,
  };
}

function transformUser(user: BackendAdminUser): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role?.toLowerCase() === "clinic" ? "clinic" : "worker",
    position: user.position || null,
    isBlocked: user.is_blocked ?? user.isBlocked ?? false,
    createdAt: user.created_at ?? user.createdAt ?? new Date().toISOString(),
  };
}

export async function getAdminStats(adminId: string): Promise<AdminStats> {
  const response = await adminApiCall<BackendAdminStats | { stats: BackendAdminStats }>("/admin/stats", {
    method: "POST",
    body: JSON.stringify({ adminId }),
  });
  return transformStats("stats" in response ? response.stats : response);
}

export async function getAdminUsers(adminId: string): Promise<AdminUser[]> {
  const response = await adminApiCall<BackendAdminUser[] | { users: BackendAdminUser[] }>("/admin/users", {
    method: "POST",
    body: JSON.stringify({ adminId }),
  });
  const users = Array.isArray(response) ? response : response.users || [];
  return users.map(transformUser);
}

export async function toggleUserBlock(request: ToggleBlockRequest): Promise<ToggleBlockResponse> {
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
}
