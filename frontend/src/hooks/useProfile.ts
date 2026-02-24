import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getProfile, 
  updateProfileApi, 
  createProfile as createProfileApi,
  ProfileUpdateData,
  transformToProfile
} from "@/lib/api";

// Profile type inferred from the transform function
type Profile = ReturnType<typeof transformToProfile>;

// Extended type for ProfileForm data that matches what ProfileForm sends
export interface ProfileFormInput {
  name: string;
  role: "clinic" | "worker";
  position?: string | null;
  positions?: string[] | null; // Array of positions (new multi-select)
  workplace_types?: string[] | null; // Array of domains
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
  // Recruitment settings (clinic only)
  screening_questions?: string[] | null;
  is_auto_screener_active?: boolean | null;
  // Boost profile (clinic only)
  is_urgent?: boolean | null;
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
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: ProfileFormInput) => {
      // The backend identifies profile by email (upsert). Email may come from:
      // 1) current_user (logged in)
      // 2) pendingEmail (signup flow)
      let email: string | null = null;

      const currentUserRaw = localStorage.getItem("current_user");
      if (currentUserRaw) {
        try {
          const parsed = JSON.parse(currentUserRaw);
          email = typeof parsed?.email === "string" ? parsed.email : null;
        } catch {
          // ignore parse errors
        }
      }

      if (!email) {
        email = localStorage.getItem("pendingEmail");
      }

      if (!email) {
        throw new Error("Email is required");
      }

      // Map frontend role to backend role
      const role = profile.role === "clinic" ? "CLINIC" : "STAFF";
      
      const result = await createProfileApi({
        email,
        name: profile.name,
        role,
        position: profile.position || undefined,
        positions: profile.positions || undefined, // Array of positions
        workplace_types: profile.workplace_types || undefined, // Array of domains
        required_position: profile.required_position || undefined, // Required for clinics
        location: profile.city || profile.preferred_area || undefined,
        salary_info: profile.salary_min || profile.salary_max ? {
          min: profile.salary_min || undefined,
          max: profile.salary_max || undefined,
        } : undefined,
        availability: profile.availability_days || profile.availability_hours || profile.availability_date ? {
          days: profile.availability_days || undefined,
          hours: profile.availability_hours || undefined,
          start_date: profile.availability_date || undefined,
        } : undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      localStorage.removeItem("pendingEmail");
      localStorage.removeItem("pendingRole");
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
