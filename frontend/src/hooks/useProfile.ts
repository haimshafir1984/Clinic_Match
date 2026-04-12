import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  createProfile as createProfileApi,
  getProfile,
  ProfileUpdateData,
  transformToProfile,
  updateProfileApi,
} from "@/lib/api";

export type Profile = ReturnType<typeof transformToProfile>;

export interface ProfileFormInput {
  name: string;
  role: "clinic" | "worker";
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
  job_type?: "daily" | "temporary" | "permanent" | null;
  screening_questions?: string[] | null;
  is_auto_screener_active?: boolean | null;
  is_urgent?: boolean | null;
  avatar_url?: string | null;
  logo_url?: string | null;
}

export function useProfile() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ["profile", currentUser?.profileId],
    queryFn: async () => {
      if (!currentUser?.profileId) return null;
      return getProfile(currentUser.profileId);
    },
    enabled: !!currentUser?.profileId,
    retry: false,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: ProfileFormInput) => {
      let email: string | null = null;
      const currentUserRaw = localStorage.getItem("current_user");
      if (currentUserRaw) {
        const parsed = JSON.parse(currentUserRaw) as { email?: string };
        email = parsed.email || null;
      }

      if (!email) {
        throw new Error("Email is required");
      }

      const role = profile.role === "clinic" ? "CLINIC" : "STAFF";
      const result = await createProfileApi({
        email,
        name: profile.name,
        role,
        position: profile.position || undefined,
        positions: profile.positions || undefined,
        required_position: profile.required_position || undefined,
        workplace_types: profile.workplace_types || undefined,
        location: profile.city || profile.preferred_area || undefined,
        description: profile.description || undefined,
        radius_km: profile.radius_km ?? undefined,
        experience_years: profile.experience_years ?? undefined,
        salary_info: profile.salary_min || profile.salary_max ? {
          min: profile.salary_min || undefined,
          max: profile.salary_max || undefined,
        } : undefined,
        availability: profile.availability_days || profile.availability_hours || profile.availability_date ? {
          days: profile.availability_days || undefined,
          hours: profile.availability_hours || undefined,
          start_date: profile.availability_date || undefined,
        } : undefined,
        job_type: profile.job_type || undefined,
        screening_questions: profile.screening_questions || undefined,
        is_auto_screener_active: profile.is_auto_screener_active ?? undefined,
        is_urgent: profile.is_urgent ?? undefined,
        avatar_url: profile.avatar_url || undefined,
        logo_url: profile.logo_url || undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { currentUser, refreshCurrentUser } = useAuth();

  return useMutation({
    mutationFn: async (profile: Partial<ProfileFormInput>) => {
      if (!currentUser?.profileId) {
        throw new Error("User not authenticated");
      }

      const result = await updateProfileApi(currentUser.profileId, profile as ProfileUpdateData);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.profile;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      await refreshCurrentUser();
    },
  });
}

