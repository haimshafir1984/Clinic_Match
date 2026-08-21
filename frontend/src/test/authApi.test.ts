import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  startLogin,
  loginWithPassword,
  requestOtp,
  verifyLoginOtp,
  verifyRegisterOtp,
  loginWithGoogle,
  createProfile,
  getCurrentUser,
  logout,
} from "@/lib/api";

// The auth layer broke twice in production this week (passwordless login,
// then the positions[] completeness bug). These lock down the contract:
// what gets sent, what gets persisted, and what happens on failure.

const PROFILE = {
  id: "42",
  email: "dana@example.com",
  role: "STAFF",
  name: "דנה כהן",
  position: null,
  positions: ["סייעת שיניים"],
  required_position: null,
  location: "תל אביב",
  industry: "medical",
  is_admin: false,
};

let fetchMock: ReturnType<typeof vi.fn>;

function mockJson(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: String(url), init: init as RequestInit };
};

describe("login routing", () => {
  it("reports which mode the server chose", async () => {
    fetchMock.mockResolvedValue(mockJson({ mode: "password" }));
    await expect(startLogin("haim.shafir.1@gmail.com")).resolves.toEqual({ mode: "password", error: null });

    fetchMock.mockResolvedValue(mockJson({ mode: "otp" }));
    expect((await startLogin("dana@example.com")).mode).toBe("otp");

    fetchMock.mockResolvedValue(mockJson({ mode: "register" }));
    expect((await startLogin("new@example.com")).mode).toBe("register");
  });

  it("surfaces the server's message instead of throwing", async () => {
    fetchMock.mockResolvedValue(mockJson({ error: "החשבון מושהה" }, false, 403));
    const result = await startLogin("blocked@example.com");
    expect(result.mode).toBeNull();
    expect(result.error).toBe("החשבון מושהה");
  });
});

describe("session persistence", () => {
  it("stores token and user after a password login", async () => {
    fetchMock.mockResolvedValue(mockJson({ success: true, user: PROFILE, token: "jwt-abc" }));
    const { user, error } = await loginWithPassword("haim.shafir.1@gmail.com", "pw");

    expect(error).toBeNull();
    expect(localStorage.getItem("auth_token")).toBe("jwt-abc");
    expect(user?.email).toBe("dana@example.com");
    expect(await getCurrentUser()).toMatchObject({ id: "42" });
  });

  it("treats a worker with only positions[] as profile-complete", async () => {
    // Regression: registration fills positions[], never the scalar position.
    fetchMock.mockResolvedValue(mockJson({ success: true, user: PROFILE, token: "t" }));
    const { user } = await verifyLoginOtp("dana@example.com", "123456");
    expect(user?.isProfileComplete).toBe(true);
  });

  it("does not persist anything when login fails", async () => {
    fetchMock.mockResolvedValue(mockJson({ error: "פרטי התחברות שגויים" }, false, 401));
    const { user, error } = await loginWithPassword("dana@example.com", "wrong");

    expect(user).toBeNull();
    expect(error).toBe("פרטי התחברות שגויים");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("clears both keys on logout", async () => {
    localStorage.setItem("auth_token", "t");
    localStorage.setItem("current_user", "{}");
    await logout();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("current_user")).toBeNull();
  });
});

describe("OTP requests", () => {
  it("passes the purpose through so the server can branch", async () => {
    fetchMock.mockResolvedValue(mockJson({ sent: true }));
    await requestOtp("dana@example.com", "register");
    const { url, init } = lastCall();
    expect(url).toContain("/auth/otp/request");
    expect(JSON.parse(String(init.body))).toEqual({ email: "dana@example.com", purpose: "register" });
  });

  it("returns the short-lived email token for the register purpose", async () => {
    fetchMock.mockResolvedValue(mockJson({ verified: true, emailToken: "email-jwt" }));
    const result = await verifyRegisterOtp("dana@example.com", "123456");
    expect(result.emailToken).toBe("email-jwt");
    expect(JSON.parse(String(lastCall().init.body)).purpose).toBe("register");
  });
});

describe("Google sign-in", () => {
  it("logs an existing profile straight in", async () => {
    fetchMock.mockResolvedValue(mockJson({ mode: "login", success: true, user: PROFILE, token: "jwt-google" }));
    const result = await loginWithGoogle("id-token-abc");

    expect(result.status).toBe("logged_in");
    expect(result.user?.email).toBe("dana@example.com");
    expect(localStorage.getItem("auth_token")).toBe("jwt-google");
  });

  it("hands back the emailToken for an address with no profile yet", async () => {
    fetchMock.mockResolvedValue(mockJson({ mode: "register", emailToken: "email-jwt", email: "new@example.com", name: "נועה" }));
    const result = await loginWithGoogle("id-token-xyz");

    expect(result.status).toBe("needs_registration");
    expect(result.user).toBeNull();
    expect(result.emailToken).toBe("email-jwt");
    expect(result.name).toBe("נועה");
    // Nothing should be persisted — there's no session yet, just a
    // short-lived token to hand to the registration wizard.
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("surfaces a server error instead of throwing", async () => {
    fetchMock.mockResolvedValue(mockJson({ error: "אימות מול Google נכשל, נסה שוב" }, false, 401));
    const result = await loginWithGoogle("bad-token");

    expect(result.status).toBeNull();
    expect(result.error).toBe("אימות מול Google נכשל, נסה שוב");
  });
});

describe("registration gate", () => {
  it("sends the verified-email token as a header", async () => {
    // Without this header the backend rejects the registration — this is the
    // hole that let anyone register with someone else's address.
    fetchMock.mockResolvedValue(mockJson({ user: PROFILE, token: "jwt" }));
    await createProfile(
      { email: "dana@example.com", role: "STAFF", name: "דנה", positions: ["סייעת שיניים"], location: "תל אביב" },
      "email-jwt"
    );

    const { url, init } = lastCall();
    expect(url).toContain("/profiles");
    expect((init.headers as Record<string, string>)["X-Email-Verification"]).toBe("email-jwt");
  });

  it("omits the header when no token is supplied", async () => {
    fetchMock.mockResolvedValue(mockJson({ user: PROFILE, token: "jwt" }));
    await createProfile({ email: "d@e.com", role: "STAFF", name: "ד", location: "ת״א" });
    expect((lastCall().init.headers as Record<string, string>)["X-Email-Verification"]).toBeUndefined();
  });
});
