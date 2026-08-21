const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const OpenAI = require("openai");
const {
  ensureMarketJobsSchema,
  importMarketJobs,
  searchMarketJobs,
  pruneStaleMarketJobs,
  sanitizeMarketJobWarningsForClient,
} = require("./services/marketJobsService");
const { startMarketJobsScheduler } = require("./services/marketJobsScheduler");
const { sendOtpEmail } = require("./services/mailerService");
require("dotenv").config();

if (!process.env.ALLOWED_ORIGIN) {
  console.warn("ALLOWED_ORIGIN not set — falling back to a placeholder origin, real frontend requests will be blocked by CORS.");
}

const app = express();
// Render (and most PaaS hosts) sit behind a reverse proxy that sets
// X-Forwarded-For — without this, express-rate-limit can't safely
// determine the real client IP and throws on every rate-limited request.
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "https://your-frontend.vercel.app" }));
app.use(express.json({ limit: "5mb" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET not set");
  process.exit(1);
}

// The only account that authenticates with a password instead of a one-time
// email code. Password is set/rotated server-side via ensureAdminBootstrap().
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "haim.shafir.1@gmail.com").toLowerCase().trim();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFICATION_TTL = "15m";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי ניסיונות, נסה שוב בעוד כמה דקות" },
});

const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${normalizeEmail(req.body?.email)}`,
  message: { error: "יותר מדי בקשות קוד, נסה שוב בעוד כמה דקות" },
});

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function issueOtp(email) {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    `
      INSERT INTO login_otps (email, code_hash, expires_at, attempts)
      VALUES ($1, $2, $3, 0)
      ON CONFLICT (email) DO UPDATE SET code_hash = $2, expires_at = $3, attempts = 0, created_at = NOW()
    `,
    [email, codeHash, expiresAt]
  );

  await sendOtpEmail(email, code);
}

async function verifyOtp(email, code) {
  const result = await pool.query("SELECT * FROM login_otps WHERE email = $1", [email]);
  const row = result.rows[0];

  if (!row) {
    return { ok: false, reason: "no_code" };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query("DELETE FROM login_otps WHERE email = $1", [email]);
    return { ok: false, reason: "expired" };
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await pool.query("DELETE FROM login_otps WHERE email = $1", [email]);
    return { ok: false, reason: "too_many_attempts" };
  }

  const matches = await bcrypt.compare(String(code || ""), row.code_hash);
  if (!matches) {
    await pool.query("UPDATE login_otps SET attempts = attempts + 1 WHERE email = $1", [email]);
    return { ok: false, reason: "invalid" };
  }

  await pool.query("DELETE FROM login_otps WHERE email = $1", [email]);
  return { ok: true };
}

async function ensureAdminBootstrap() {
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!bootstrapPassword) {
    console.log("ADMIN_BOOTSTRAP_PASSWORD not set — skipping admin account bootstrap.");
    return;
  }

  const passwordHash = await bcrypt.hash(bootstrapPassword, 10);

  await pool.query(
    `
      INSERT INTO profiles (email, role, name, password_hash, is_admin, is_blocked)
      VALUES ($1, 'STAFF', 'Admin', $2, TRUE, FALSE)
      ON CONFLICT (email) DO UPDATE SET password_hash = $2, is_admin = TRUE, is_blocked = FALSE
    `,
    [ADMIN_EMAIL, passwordHash]
  );

  console.log(`Admin bootstrap complete for ${ADMIN_EMAIL}`);
}

const PROFILE_SELECT = `
  id,
  email,
  role,
  name,
  position,
  required_position,
  positions,
  workplace_types,
  industry,
  location,
  locations,
  description,
  radius_km,
  experience_years,
  availability_date,
  availability_days,
  availability_hours,
  salary_min,
  salary_max,
  salary_info,
  availability,
  job_type,
  screening_questions,
  is_auto_screener_active,
  is_urgent,
  avatar_url,
  logo_url,
  is_blocked,
  is_admin,
  created_at,
  updated_at
`;
const PIPELINE_STAGES = ["matched", "screening", "interview", "offer", "hired", "archived"];
const TALENT_POOL_STATUSES = ["saved", "contacted", "future_fit", "archived"];
const INTERVIEW_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const INTERVIEW_TYPES = ["phone", "video", "onsite"];
const SCHEMA_INIT_MAX_RETRIES = Number.parseInt(process.env.SCHEMA_INIT_MAX_RETRIES || "10", 10);
const SCHEMA_INIT_RETRY_DELAY_MS = Number.parseInt(process.env.SCHEMA_INIT_RETRY_DELAY_MS || "5000", 10);

async function ensureExtendedSchema() {
  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

    -- Multi-location support: profiles.location (singular) is kept as a
    -- backward-compat mirror of locations[0] — external job search and any
    -- older client still reading a single "location" string keep working.
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locations TEXT[] NOT NULL DEFAULT '{}';
    UPDATE profiles SET locations = ARRAY[location] WHERE location IS NOT NULL AND locations = '{}';

    CREATE TABLE IF NOT EXISTS login_otps (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS recruitment_pipeline (
      match_id BIGINT PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
      clinic_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      candidate_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      stage TEXT NOT NULL DEFAULT 'matched',
      summary TEXT,
      next_step TEXT,
      ai_notes TEXT,
      saved_to_talent BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT check_pipeline_stage CHECK (stage IN ('matched','screening','interview','offer','hired','archived'))
    );

    CREATE TABLE IF NOT EXISTS talent_pool (
      id BIGSERIAL PRIMARY KEY,
      clinic_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      candidate_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'saved',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_talent_pool_candidate UNIQUE (clinic_id, candidate_id),
      CONSTRAINT check_talent_pool_status CHECK (status IN ('saved','contacted','future_fit','archived'))
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      created_by BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      interview_type TEXT NOT NULL DEFAULT 'video',
      location TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT check_interview_status CHECK (status IN ('pending','confirmed','completed','cancelled')),
      CONSTRAINT check_interview_type CHECK (interview_type IN ('phone','video','onsite'))
    );

    CREATE INDEX IF NOT EXISTS idx_recruitment_pipeline_clinic ON recruitment_pipeline (clinic_id, stage);
    CREATE INDEX IF NOT EXISTS idx_talent_pool_clinic ON talent_pool (clinic_id, status);
    CREATE INDEX IF NOT EXISTS idx_interviews_match ON interviews (match_id, scheduled_for DESC);

    DROP TRIGGER IF EXISTS trg_recruitment_pipeline_updated_at ON recruitment_pipeline;
    CREATE TRIGGER trg_recruitment_pipeline_updated_at
      BEFORE UPDATE ON recruitment_pipeline
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    DROP TRIGGER IF EXISTS trg_talent_pool_updated_at ON talent_pool;
    CREATE TRIGGER trg_talent_pool_updated_at
      BEFORE UPDATE ON talent_pool
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    DROP TRIGGER IF EXISTS trg_interviews_updated_at ON interviews;
    CREATE TRIGGER trg_interviews_updated_at
      BEFORE UPDATE ON interviews
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);

  await ensureMarketJobsSchema(pool);
  await pruneStaleMarketJobs(pool).catch((err) => {
    console.error("MARKET JOBS PRUNE ERROR:", err);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initializeSchemaWithRetry() {
  let attempt = 0;

  while (attempt < SCHEMA_INIT_MAX_RETRIES) {
    attempt += 1;

    try {
      await ensureExtendedSchema();
      console.log(`Schema initialization completed on attempt ${attempt}`);
      await ensureAdminBootstrap().catch((bootstrapErr) => {
        console.error("ADMIN BOOTSTRAP ERROR:", bootstrapErr);
      });
      return true;
    } catch (err) {
      console.error(`SCHEMA INIT ERROR (attempt ${attempt}/${SCHEMA_INIT_MAX_RETRIES}):`, err);
      if (attempt >= SCHEMA_INIT_MAX_RETRIES) {
        console.error("Schema initialization failed after maximum retries. The server will stay up, but database-backed features may fail until the database is reachable.");
        return false;
      }

      await wait(SCHEMA_INIT_RETRY_DELAY_MS * attempt);
    }
  }

  return false;
}

function parseDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getMatchParticipants(matchRow) {
  if (!matchRow) return null;
  return {
    clinicId: matchRow.user_one_role === "CLINIC" ? matchRow.user_one_id : matchRow.user_two_id,
    candidateId: matchRow.user_one_role === "STAFF" ? matchRow.user_one_id : matchRow.user_two_id,
  };
}

async function getAuthorizedMatch(matchId, userId) {
  const result = await pool.query(
    `
      SELECT
        m.id,
        m.user_one_id,
        m.user_two_id,
        m.is_closed,
        one_profile.role AS user_one_role,
        two_profile.role AS user_two_role
      FROM matches m
      JOIN profiles one_profile ON one_profile.id = m.user_one_id
      JOIN profiles two_profile ON two_profile.id = m.user_two_id
      WHERE m.id = $1 AND (m.user_one_id = $2 OR m.user_two_id = $2)
      LIMIT 1
    `,
    [matchId, userId]
  );

  return result.rows[0] || null;
}

async function ensurePipelineForMatch(matchId, userId) {
  const matchRow = await getAuthorizedMatch(matchId, userId);
  if (!matchRow) {
    return null;
  }

  const participants = getMatchParticipants(matchRow);
  const existing = await pool.query(`SELECT * FROM recruitment_pipeline WHERE match_id = $1`, [matchId]);
  if (existing.rows.length > 0) {
    return { matchRow, pipeline: existing.rows[0] };
  }

  const inserted = await pool.query(
    `
      INSERT INTO recruitment_pipeline (match_id, clinic_id, candidate_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (match_id) DO NOTHING
      RETURNING *
    `,
    [matchId, participants.clinicId, participants.candidateId]
  );

  if (inserted.rows.length > 0) {
    return { matchRow, pipeline: inserted.rows[0] };
  }

  const fallback = await pool.query(`SELECT * FROM recruitment_pipeline WHERE match_id = $1`, [matchId]);
  return { matchRow, pipeline: fallback.rows[0] || null };
}

function buildStrengthHighlights(profile) {
  const highlights = [];
  if (profile.experience_years) {
    highlights.push(`${profile.experience_years} שנות ניסיון`);
  }
  if (Array.isArray(profile.positions) && profile.positions.length > 0) {
    highlights.push(`מתמחה ב-${profile.positions.slice(0, 2).join(", ")}`);
  } else if (profile.position) {
    highlights.push(`תפקיד: ${profile.position}`);
  }
  if (profile.location) {
    highlights.push(`פעיל/ת באזור ${profile.location}`);
  }
  if (profile.availability_hours) {
    highlights.push(`זמינות: ${profile.availability_hours}`);
  }
  if (profile.job_type) {
    highlights.push(`סוג משרה: ${profile.job_type}`);
  }
  if (profile.description) {
    const snippet = profile.description.trim().slice(0, 120);
    highlights.push(snippet);
  }
  return highlights.filter(Boolean).slice(0, 4);
}

function buildConversationSuggestions(profile, isBusiness, stage) {
  const name = profile.name || (isBusiness ? "המועמד/ת" : "המעסיק/ה");
  const base = isBusiness
    ? [
        `שלום! ראינו את הפרופיל של ${name} ונשמח לשמוע עוד על הניסיון שלך.`,
        `מתי נוח לך לשוחח טלפונית לגבי המשרה?`,
        `יש לנו משרה שמתאימה בדיוק לתחום שלך, רוצה לשמוע פרטים?`,
      ]
    : [
        `שלום! שמחתי להתאמה, אשמח לשמוע עוד פרטים על המשרה.`,
        `מתי אפשר להתחיל, ומה שעות העבודה בפועל?`,
        `אשמח לשלוח קורות חיים או לתאם שיחת טלפון בזמן שנוח לכם.`,
      ];

  if (stage === "interview") {
    base.push(`נשמח לתאם ראיון בימים הקרובים, אילו מועדים מתאימים לך?`);
  }
  if (stage === "offer") {
    base.push(`שלחנו הצעה - נשמח לשמוע אם יש שאלות לפני שמסכמים.`);
  }
  return base.slice(0, 3);
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.toLowerCase().trim() : "";
}

function normalizeRole(role) {
  return role === "CLINIC" ? "CLINIC" : "STAFF";
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function normalizeBoolean(value) {
  return value === true;
}

function coerceInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getProfileImage(row) {
  if (row.role === "CLINIC") {
    return row.logo_url || row.avatar_url || null;
  }
  return row.avatar_url || row.logo_url || null;
}

function toLegacySalaryInfo(min, max) {
  if (min == null && max == null) return null;
  if (min != null && max != null) return Math.round((min + max) / 2);
  return min ?? max;
}

function toLegacyAvailability(date, days, hours) {
  if (!date && (!Array.isArray(days) || days.length === 0) && !hours) {
    return null;
  }

  return {
    start_date: date,
    days: Array.isArray(days) ? days : [],
    hours: hours || null,
  };
}

function mapProfileRow(row) {
  return {
    ...row,
    image_url: getProfileImage(row),
  };
}

function mapFeedRow(row) {
  return {
    id: row.id,
    name: row.name,
    position: row.role === "CLINIC" ? row.required_position || row.position : row.position,
    positions: row.positions || [],
    workplace_types: row.workplace_types || [],
    location: row.location,
    locations: row.locations || [],
    salary_info: row.salary_min != null || row.salary_max != null
      ? { min: row.salary_min, max: row.salary_max }
      : row.salary_info,
    availability: {
      start_date: row.availability_date,
      days: row.availability_days || [],
      hours: row.availability_hours,
    },
    is_urgent: row.is_urgent,
    industry: row.industry,
    role: row.role,
    image_url: getProfileImage(row),
    created_at: row.created_at,
  };
}

function buildProfileValues(body, existingRole) {
  const role = normalizeRole(body.role || existingRole);
  const positions = normalizeArray(body.positions);
  const workplaceTypes = normalizeArray(body.workplace_types);
  const availabilityDays = normalizeArray(body.availability_days || body.availability?.days);
  const availabilityHours = normalizeText(body.availability_hours || body.availability?.hours);
  const availabilityDate = normalizeText(body.availability_date || body.availability?.start_date);
  const salaryMin = coerceInteger(body.salary_min ?? body.salary_info?.min);
  const salaryMax = coerceInteger(body.salary_max ?? body.salary_info?.max);
  const position = normalizeText(body.position) || positions[0] || null;
  const requiredPosition = normalizeText(body.required_position) || (role === "CLINIC" ? position : null);
  const avatarUrl = normalizeText(body.avatar_url);
  const logoUrl = normalizeText(body.logo_url);

  // locations[] is the source of truth; a client that only ever sends the
  // legacy single `location` field (or hasn't been rebuilt yet) still works,
  // and `location` itself is kept as locations[0] for any code path that
  // still reads a single string.
  const locations = normalizeArray(body.locations).length > 0
    ? normalizeArray(body.locations)
    : (normalizeText(body.location) ? [normalizeText(body.location)] : []);

  return {
    email: normalizeEmail(body.email),
    role,
    name: normalizeText(body.name) || "",
    position,
    required_position: requiredPosition,
    positions,
    workplace_types: workplaceTypes,
    industry: normalizeText(body.industry),
    location: locations[0] || null,
    locations,
    description: normalizeText(body.description),
    radius_km: coerceInteger(body.radius_km),
    experience_years: coerceInteger(body.experience_years),
    availability_date: availabilityDate,
    availability_days: availabilityDays,
    availability_hours: availabilityHours,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_info: toLegacySalaryInfo(salaryMin, salaryMax),
    availability: toLegacyAvailability(availabilityDate, availabilityDays, availabilityHours),
    job_type: normalizeText(body.job_type),
    screening_questions: normalizeArray(body.screening_questions),
    is_auto_screener_active: normalizeBoolean(body.is_auto_screener_active),
    is_urgent: normalizeBoolean(body.is_urgent),
    avatar_url: avatarUrl,
    logo_url: logoUrl,
  };
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

function ensureOwnProfileOrAdmin(req, res, next) {
  if (String(req.user.id) !== String(req.params.id) && !req.user.is_admin) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
}

app.post("/api/ai/generate-bio", authenticateToken, async (req, res) => {
  const { keywords, role } = req.body;
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI Key missing" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional recruiting copywriter. Write in Hebrew." },
        { role: "user", content: `Write a short, professional summary (2-3 sentences) for a ${role} based on: ${keywords}. First person.` },
      ],
      max_tokens: 200,
    });

    res.json({ bio: response.choices[0].message.content });
  } catch (err) {
    console.error("AI Bio Error:", err);
    res.status(500).json({ error: "Failed to generate bio" });
  }
});

app.post("/api/ai/generate-questions", authenticateToken, async (req, res) => {
  const { position, workplace_type } = req.body;
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI Key missing" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a recruiting expert. Generate 3 screening questions in Hebrew." },
        { role: "user", content: `Generate 3 yes/no screening questions for a ${position || "candidate"} at a ${workplace_type || "business"}. Return only the questions text, one per line.` },
      ],
    });

    const text = response.choices[0].message.content || "";
    const questions = text
      .split("\n")
      .map((line) => line.replace(/^\d+[.)-]?\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);

    res.json({ questions });
  } catch (err) {
    console.error("AI Questions Error:", err);
    res.status(500).json({ error: "Failed to generate screening questions" });
  }
});

// Step 1 of login: client submits only the email, server decides whether this
// account uses the password flow (admin exception) or the OTP flow, or
// redirects to registration if no profile exists yet.
app.post("/api/auth/login/start", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: "נא להזין אימייל" });
  }

  try {
    if (email === ADMIN_EMAIL) {
      return res.json({ mode: "password" });
    }

    const result = await pool.query("SELECT is_blocked FROM profiles WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.json({ mode: "register" });
    }
    if (result.rows[0].is_blocked) {
      return res.status(403).json({ error: "החשבון מושהה" });
    }

    await issueOtp(email);
    return res.json({ mode: "otp" });
  } catch (err) {
    console.error("LOGIN START ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

// Password login — reserved for the admin account bootstrapped via
// ensureAdminBootstrap(). No public route exists to set a password, so this
// cannot be used to take over any other account.
app.post("/api/auth/login/password", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "נא להזין אימייל וסיסמה" });
  }

  try {
    const result = await pool.query(`SELECT ${PROFILE_SELECT}, password_hash FROM profiles WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "פרטי התחברות שגויים" });
    }
    if (user.is_blocked) {
      return res.status(403).json({ error: "החשבון מושהה" });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: "פרטי התחברות שגויים" });
    }

    const token = jwt.sign({ id: user.id, role: user.role, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });
    delete user.password_hash;
    res.json({ success: true, user: mapProfileRow(user), token });
  } catch (err) {
    console.error("PASSWORD LOGIN ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

// Sends a one-time code for either logging in (existing account) or
// verifying an email before registration (new account). Also doubles as the
// "resend code" action for both flows.
app.post("/api/auth/otp/request", authLimiter, otpRequestLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const purpose = req.body.purpose === "register" ? "register" : "login";

  if (!email) {
    return res.status(400).json({ error: "נא להזין אימייל" });
  }
  if (email === ADMIN_EMAIL) {
    return res.status(400).json({ error: "לחשבון זה יש להתחבר עם סיסמה" });
  }

  try {
    const existing = await pool.query("SELECT is_blocked FROM profiles WHERE email = $1", [email]);

    if (purpose === "register") {
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "כבר קיים חשבון עם המייל הזה, נסה להתחבר" });
      }
    } else {
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "לא נמצא חשבון עם המייל הזה" });
      }
      if (existing.rows[0].is_blocked) {
        return res.status(403).json({ error: "החשבון מושהה" });
      }
    }

    await issueOtp(email);
    res.json({ sent: true });
  } catch (err) {
    console.error("OTP REQUEST ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/auth/otp/verify", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
  const purpose = req.body.purpose === "register" ? "register" : "login";

  if (!email || !code) {
    return res.status(400).json({ error: "נא להזין את הקוד שנשלח" });
  }

  try {
    const outcome = await verifyOtp(email, code);
    if (!outcome.ok) {
      const messages = {
        no_code: "לא נשלח קוד למייל הזה, בקש קוד חדש",
        expired: "הקוד פג תוקף, בקש קוד חדש",
        too_many_attempts: "יותר מדי ניסיונות, בקש קוד חדש",
        invalid: "קוד שגוי",
      };
      return res.status(400).json({ error: messages[outcome.reason] || "קוד שגוי" });
    }

    if (purpose === "register") {
      const emailToken = jwt.sign({ email, purpose: "register" }, JWT_SECRET, { expiresIn: EMAIL_VERIFICATION_TTL });
      return res.json({ verified: true, emailToken });
    }

    const result = await pool.query(`SELECT ${PROFILE_SELECT} FROM profiles WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "לא נמצא חשבון עם המייל הזה" });
    }
    if (user.is_blocked) {
      return res.status(403).json({ error: "החשבון מושהה" });
    }

    const token = jwt.sign({ id: user.id, role: user.role, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, user: mapProfileRow(user), token });
  } catch (err) {
    console.error("OTP VERIFY ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/profiles", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const emailToken = req.headers["x-email-verification"] || req.body.emailToken;
  if (!emailToken) {
    return res.status(401).json({ error: "יש לאמת את כתובת המייל לפני ההרשמה" });
  }

  try {
    const decoded = jwt.verify(emailToken, JWT_SECRET);
    if (decoded.purpose !== "register" || normalizeEmail(decoded.email) !== email) {
      return res.status(401).json({ error: "אימות המייל אינו תואם, נסה שוב" });
    }
  } catch {
    return res.status(401).json({ error: "אימות המייל פג תוקף, נסה שוב" });
  }

  try {
    const exists = await pool.query("SELECT id FROM profiles WHERE email = $1", [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "Profile already exists" });
    }

    const profile = buildProfileValues({ ...req.body, email });
    const result = await pool.query(
      `
        INSERT INTO profiles (
          email, role, name, position, required_position, positions, workplace_types, industry, location, locations,
          description, radius_km, experience_years, availability_date, availability_days, availability_hours,
          salary_min, salary_max, salary_info, availability, job_type,
          screening_questions, is_auto_screener_active, is_urgent,
          avatar_url, logo_url
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24,
          $25, $26
        )
        RETURNING ${PROFILE_SELECT}
      `,
      [
        profile.email,
        profile.role,
        profile.name,
        profile.position,
        profile.required_position,
        profile.positions,
        profile.workplace_types,
        profile.industry,
        profile.location,
        profile.locations,
        profile.description,
        profile.radius_km,
        profile.experience_years,
        profile.availability_date,
        profile.availability_days,
        profile.availability_hours,
        profile.salary_min,
        profile.salary_max,
        profile.salary_info,
        profile.availability,
        profile.job_type,
        profile.screening_questions,
        profile.is_auto_screener_active,
        profile.is_urgent,
        profile.avatar_url,
        profile.logo_url,
      ]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ user: mapProfileRow(user), token });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.get("/api/profiles/:id", authenticateToken, ensureOwnProfileOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${PROFILE_SELECT} FROM profiles WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(mapProfileRow(result.rows[0]));
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.put("/api/profiles/:id", authenticateToken, ensureOwnProfileOrAdmin, async (req, res) => {
  try {
    const existing = await pool.query(`SELECT ${PROFILE_SELECT} FROM profiles WHERE id = $1`, [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const current = existing.rows[0];
    const incoming = buildProfileValues({ ...current, ...req.body, email: current.email }, current.role);

    const result = await pool.query(
      `
        UPDATE profiles
        SET
          role = $2,
          name = $3,
          position = $4,
          required_position = $5,
          positions = $6,
          workplace_types = $7,
          industry = $8,
          location = $9,
          locations = $10,
          description = $11,
          radius_km = $12,
          experience_years = $13,
          availability_date = $14,
          availability_days = $15,
          availability_hours = $16,
          salary_min = $17,
          salary_max = $18,
          salary_info = $19,
          availability = $20,
          job_type = $21,
          screening_questions = $22,
          is_auto_screener_active = $23,
          is_urgent = $24,
          avatar_url = $25,
          logo_url = $26
        WHERE id = $1
        RETURNING ${PROFILE_SELECT}
      `,
      [
        req.params.id,
        incoming.role,
        incoming.name,
        incoming.position,
        incoming.required_position,
        incoming.positions,
        incoming.workplace_types,
        incoming.industry,
        incoming.location,
        incoming.locations,
        incoming.description,
        incoming.radius_km,
        incoming.experience_years,
        incoming.availability_date,
        incoming.availability_days,
        incoming.availability_hours,
        incoming.salary_min,
        incoming.salary_max,
        incoming.salary_info,
        incoming.availability,
        incoming.job_type,
        incoming.screening_questions,
        incoming.is_auto_screener_active,
        incoming.is_urgent,
        incoming.avatar_url,
        incoming.logo_url,
      ]
    );

    res.json({ user: mapProfileRow(result.rows[0]) });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.get("/api/feed/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(req.user.id) !== String(userId) && !req.user.is_admin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const userRes = await pool.query(
      `SELECT role, positions, workplace_types, location, locations, industry FROM profiles WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.json([]);
    }

    const user = userRes.rows[0];
    const targetRole = user.role === "STAFF" ? "CLINIC" : "STAFF";
    // locations[] is kept in sync with legacy `location` on every write (see
    // buildProfileValues / the boot-time backfill), so this is just a safety
    // net for a row that predates both.
    const userLocations = user.locations?.length ? user.locations : (user.location ? [user.location] : []);

    const query = `
      SELECT
        id,
        role,
        name,
        position,
        required_position,
        positions,
        workplace_types,
        industry,
        location,
        locations,
        salary_min,
        salary_max,
        salary_info,
        availability_date,
        availability_days,
        availability_hours,
        is_urgent,
        avatar_url,
        logo_url,
        created_at
      FROM profiles
      WHERE role = $1
        AND (cardinality($2::text[]) = 0 OR workplace_types && $2::text[])
        AND (cardinality($3::text[]) = 0 OR positions && $3::text[])
        AND (cardinality($4::text[]) = 0 OR locations && $4::text[])
        AND ($6::text IS NULL OR industry = $6::text)
        AND id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = $5)
        AND id != $5
      ORDER BY is_urgent DESC, created_at DESC
      LIMIT 20
    `;

    const feed = await pool.query(query, [
      targetRole,
      user.workplace_types || [],
      user.positions || [],
      userLocations,
      userId,
      user.industry || null,
    ]);

    res.json(feed.rows.map(mapFeedRow));
  } catch (err) {
    console.error("FEED ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/swipe", authenticateToken, async (req, res) => {
  const swiperId = coerceInteger(req.body.swiper_id);
  const swipedId = coerceInteger(req.body.swiped_id);
  const { type } = req.body;

  if (!swiperId || !swipedId) {
    return res.status(400).json({ error: "Invalid swipe identifiers" });
  }
  if (String(req.user.id) !== String(swiperId)) {
    return res.status(403).json({ error: "Identity mismatch" });
  }
  if (!["LIKE", "PASS"].includes(type)) {
    return res.status(400).json({ error: "Invalid swipe type" });
  }

  try {
    await pool.query(
      `
        INSERT INTO swipes (swiper_id, swiped_id, type)
        VALUES ($1::bigint, $2::bigint, $3)
        ON CONFLICT (swiper_id, swiped_id)
        DO UPDATE SET type = EXCLUDED.type
      `,
      [swiperId, swipedId, type]
    );

    if (type === "LIKE") {
      const matchCheck = await pool.query(
        `SELECT id FROM swipes WHERE swiper_id = $1::bigint AND swiped_id = $2::bigint AND type = 'LIKE'`,
        [swipedId, swiperId]
      );

      if (matchCheck.rows.length > 0) {
        const matchRes = await pool.query(
          `
            INSERT INTO matches (user_one_id, user_two_id)
            VALUES (LEAST($1::bigint, $2::bigint), GREATEST($1::bigint, $2::bigint))
            ON CONFLICT DO NOTHING
            RETURNING id
          `,
          [swiperId, swipedId]
        );

        let matchId = matchRes.rows[0]?.id;
        if (!matchId) {
          const existingMatch = await pool.query(
            `SELECT id FROM matches WHERE LEAST(user_one_id, user_two_id) = LEAST($1::bigint, $2::bigint) AND GREATEST(user_one_id, user_two_id) = GREATEST($1::bigint, $2::bigint)`,
            [swiperId, swipedId]
          );
          matchId = existingMatch.rows[0]?.id;
        }

        if (matchId) {
          const profiles = await pool.query(
            `SELECT id, role, is_auto_screener_active, screening_questions FROM profiles WHERE id IN ($1, $2)`,
            [swiperId, swipedId]
          );

          const clinic = profiles.rows.find((profile) => profile.role === "CLINIC" && profile.is_auto_screener_active === true);
          if (clinic && Array.isArray(clinic.screening_questions) && clinic.screening_questions.length > 0) {
            const questionsList = clinic.screening_questions.map((question) => `- ${question}`).join("\n");
            const botMessage = `\u05d4\u05d9\u05d9, \u05e9\u05de\u05d7\u05d9\u05dd \u05e2\u05dc \u05d4\u05d4\u05ea\u05d0\u05de\u05d4!\n\u05db\u05d3\u05d9 \u05dc\u05d4\u05ea\u05e7\u05d3\u05dd, \u05e0\u05e9\u05de\u05d7 \u05e9\u05ea\u05e2\u05e0\u05d4/\u05d9 \u05e2\u05dc \u05de\u05e1\u05e4\u05e8 \u05e9\u05d0\u05dc\u05d5\u05ea \u05e7\u05e6\u05e8\u05d5\u05ea:\n\n${questionsList}`;

            try {
              await pool.query(
                `
                  INSERT INTO messages (match_id, sender_id, content)
                  SELECT $1, $2, $3
                  WHERE NOT EXISTS (
                    SELECT 1 FROM messages WHERE match_id = $1 AND sender_id = $2 AND content = $3
                  )
                `,
                [matchId, clinic.id, botMessage]
              );
            } catch (messageError) {
              console.error("AUTO SCREENER MESSAGE ERROR:", messageError);
            }
          }
        }

        return res.json({ isMatch: true, matchId });
      }
    }

    res.json({ isMatch: false });
  } catch (err) {
    console.error("SWIPE ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.get("/api/matches/:userId", authenticateToken, async (req, res) => {
  const userId = coerceInteger(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  if (String(req.user.id) !== String(userId) && !req.user.is_admin) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const query = `
      SELECT
        m.id AS match_id,
        m.is_closed,
        m.created_at,
        p.id AS profile_id,
        p.name,
        p.position,
        p.required_position,
        p.positions,
        p.location,
        p.role,
        p.avatar_url,
        p.logo_url,
        rp.stage AS pipeline_stage,
        rp.summary AS pipeline_summary,
        rp.next_step AS pipeline_next_step,
        rp.ai_notes AS pipeline_ai_notes,
        rp.saved_to_talent AS pipeline_saved_to_talent,
        rp.updated_at AS pipeline_updated_at
      FROM matches m
      JOIN profiles p ON (p.id = m.user_one_id OR p.id = m.user_two_id)
      LEFT JOIN recruitment_pipeline rp ON rp.match_id = m.id
      WHERE (m.user_one_id = $1 OR m.user_two_id = $1)
        AND p.id != $1
      ORDER BY m.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    const mapped = result.rows.map((row) => ({
      ...row,
      position: row.role === "CLINIC" ? row.required_position || row.position : row.position,
      image_url: row.role === "CLINIC" ? row.logo_url || row.avatar_url : row.avatar_url || row.logo_url,
    }));
    res.json(mapped);
  } catch (err) {
    console.error("MATCHES ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.get("/api/matches/:userId/:matchId", authenticateToken, async (req, res) => {
  const userId = coerceInteger(req.params.userId);
  const matchId = coerceInteger(req.params.matchId);
  if (!userId || !matchId) {
    return res.status(400).json({ error: "Invalid identifiers" });
  }

  if (String(req.user.id) !== String(userId) && !req.user.is_admin) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          m.id,
          m.is_closed,
          m.created_at,
          p.id AS profile_id,
          p.name,
          p.position,
          p.required_position,
          p.location,
          p.role,
          p.avatar_url,
          p.logo_url
        FROM matches m
        JOIN profiles p ON (p.id = m.user_one_id OR p.id = m.user_two_id)
        WHERE m.id = $2
          AND (m.user_one_id = $1 OR m.user_two_id = $1)
          AND p.id != $1
        LIMIT 1
      `,
      [userId, matchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      created_at: row.created_at,
      is_closed: row.is_closed,
      other_profile: {
        id: row.profile_id,
        name: row.name,
        position: row.role === "CLINIC" ? row.required_position || row.position : row.position,
        location: row.location,
        role: row.role,
        image_url: row.role === "CLINIC" ? row.logo_url || row.avatar_url : row.avatar_url || row.logo_url,
      },
    });
  } catch (err) {
    console.error("MATCH DETAILS ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/matches/:matchId/close", authenticateToken, async (req, res) => {
  const matchId = coerceInteger(req.params.matchId);
  const currentUserId = coerceInteger(req.user.id);
  if (!matchId || !currentUserId) {
    return res.status(400).json({ error: "Invalid identifiers" });
  }

  try {
    const check = await pool.query(
      `SELECT id FROM matches WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)`,
      [matchId, currentUserId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query(`UPDATE matches SET is_closed = true WHERE id = $1`, [matchId]);
    res.json({ success: true });
  } catch (err) {
    console.error("CLOSE MATCH ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.get("/api/messages/:matchId", authenticateToken, async (req, res) => {
  const matchId = coerceInteger(req.params.matchId);
  const currentUserId = coerceInteger(req.user.id);
  if (!matchId || !currentUserId) {
    return res.status(400).json({ error: "Invalid identifiers" });
  }

  try {
    const membership = await pool.query(
      `SELECT id FROM matches WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)`,
      [matchId, currentUserId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "Not part of this match" });
    }

    const result = await pool.query(
      `SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC`,
      [matchId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/messages", authenticateToken, async (req, res) => {
  const matchId = coerceInteger(req.body.match_id);
  const senderId = coerceInteger(req.body.sender_id);
  if (!matchId || !senderId) {
    return res.status(400).json({ error: "Invalid message identifiers" });
  }

  if (String(req.user.id) !== String(senderId)) {
    return res.status(403).json({ error: "Identity mismatch" });
  }

  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (!content || content.length > 2000) {
    return res.status(400).json({ error: "Message must be between 1 and 2000 characters" });
  }

  try {
    const matchCheck = await pool.query(
      `SELECT id FROM matches WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)`,
      [matchId, senderId]
    );
    if (matchCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not part of this match" });
    }

    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, content) VALUES ($1::bigint, $2::bigint, $3) RETURNING *`,
      [matchId, senderId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});


app.get("/api/recruitment/:matchId", authenticateToken, async (req, res) => {
  const matchId = coerceInteger(req.params.matchId);
  const currentUserId = coerceInteger(req.user.id);
  if (!matchId || !currentUserId) {
    return res.status(400).json({ error: "Invalid identifiers" });
  }

  try {
    const context = await ensurePipelineForMatch(matchId, currentUserId);
    if (!context || !context.pipeline) {
      return res.status(404).json({ error: "Match not found" });
    }

    const interviews = await pool.query(
      `SELECT * FROM interviews WHERE match_id = $1 ORDER BY scheduled_for DESC`,
      [matchId]
    );

    res.json({
      pipeline: context.pipeline,
      interviews: interviews.rows,
      can_manage: context.pipeline.clinic_id === currentUserId,
    });
  } catch (err) {
    console.error("RECRUITMENT ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.put("/api/recruitment/:matchId", authenticateToken, async (req, res) => {
  const matchId = coerceInteger(req.params.matchId);
  const currentUserId = coerceInteger(req.user.id);
  if (!matchId || !currentUserId) {
    return res.status(400).json({ error: "Invalid identifiers" });
  }

  try {
    const context = await ensurePipelineForMatch(matchId, currentUserId);
    if (!context || !context.pipeline) {
      return res.status(404).json({ error: "Match not found" });
    }
    if (context.pipeline.clinic_id !== currentUserId) {
      return res.status(403).json({ error: "Only the business side can manage recruitment" });
    }

    const stage = normalizeText(req.body.stage) || context.pipeline.stage;
    if (!PIPELINE_STAGES.includes(stage)) {
      return res.status(400).json({ error: "Invalid recruitment stage" });
    }

    const updated = await pool.query(
      `
        UPDATE recruitment_pipeline
        SET stage = $2, summary = $3, next_step = $4, ai_notes = $5, saved_to_talent = $6
        WHERE match_id = $1
        RETURNING *
      `,
      [
        matchId,
        stage,
        normalizeText(req.body.summary),
        normalizeText(req.body.next_step),
        normalizeText(req.body.ai_notes),
        req.body.saved_to_talent === true,
      ]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("UPDATE RECRUITMENT ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.get("/api/talent-pool/:clinicId", authenticateToken, async (req, res) => {
  const clinicId = coerceInteger(req.params.clinicId);
  const currentUserId = coerceInteger(req.user.id);
  if (!clinicId || !currentUserId) {
    return res.status(400).json({ error: "Invalid identifiers" });
  }
  if (clinicId !== currentUserId && !req.user.is_admin) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          tp.*, p.name, p.position, p.required_position, p.location, p.role, p.avatar_url, p.logo_url
        FROM talent_pool tp
        JOIN profiles p ON p.id = tp.candidate_id
        WHERE tp.clinic_id = $1
        ORDER BY tp.updated_at DESC
      `,
      [clinicId]
    );

    res.json(result.rows.map((row) => ({
      ...row,
      image_url: getProfileImage(row),
      position: row.required_position || row.position,
    })));
  } catch (err) {
    console.error("TALENT POOL ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/talent-pool", authenticateToken, async (req, res) => {
  const clinicId = coerceInteger(req.user.id);
  const candidateId = coerceInteger(req.body.candidate_id);
  const matchId = coerceInteger(req.body.match_id);
  if (!clinicId || !candidateId) {
    return res.status(400).json({ error: "Invalid identifiers" });
  }

  try {
    const clinicProfile = await pool.query(`SELECT role FROM profiles WHERE id = $1`, [clinicId]);
    if (clinicProfile.rows[0]?.role !== "CLINIC") {
      return res.status(403).json({ error: "Only businesses can save to talent pool" });
    }

    const status = normalizeText(req.body.status) || "saved";
    if (!TALENT_POOL_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid talent pool status" });
    }

    const result = await pool.query(
      `
        INSERT INTO talent_pool (clinic_id, candidate_id, match_id, tags, notes, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (clinic_id, candidate_id)
        DO UPDATE SET tags = EXCLUDED.tags, notes = EXCLUDED.notes, status = EXCLUDED.status, match_id = COALESCE(EXCLUDED.match_id, talent_pool.match_id)
        RETURNING *
      `,
      [clinicId, candidateId, matchId, normalizeArray(req.body.tags), normalizeText(req.body.notes), status]
    );

    await pool.query(
      `UPDATE recruitment_pipeline SET saved_to_talent = true WHERE match_id = $1 AND clinic_id = $2`,
      [matchId, clinicId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("SAVE TALENT POOL ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/interviews", authenticateToken, async (req, res) => {
  const matchId = coerceInteger(req.body.match_id);
  const currentUserId = coerceInteger(req.user.id);
  const scheduledFor = parseDateTime(req.body.scheduled_for);
  const interviewType = normalizeText(req.body.interview_type) || "video";
  if (!matchId || !currentUserId || !scheduledFor) {
    return res.status(400).json({ error: "Invalid interview payload" });
  }
  if (!INTERVIEW_TYPES.includes(interviewType)) {
    return res.status(400).json({ error: "Invalid interview type" });
  }

  try {
    const context = await ensurePipelineForMatch(matchId, currentUserId);
    if (!context || !context.pipeline) {
      return res.status(404).json({ error: "Match not found" });
    }

    const inserted = await pool.query(
      `
        INSERT INTO interviews (match_id, created_by, scheduled_for, interview_type, location, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [matchId, currentUserId, scheduledFor, interviewType, normalizeText(req.body.location), normalizeText(req.body.notes)]
    );

    await pool.query(
      `UPDATE recruitment_pipeline SET stage = 'interview', next_step = $2 WHERE match_id = $1`,
      [matchId, normalizeText(req.body.notes) || "מעקב אחרי תיאום הראיון"],
    );

    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error("CREATE INTERVIEW ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.patch("/api/interviews/:id", authenticateToken, async (req, res) => {
  const interviewId = coerceInteger(req.params.id);
  const currentUserId = coerceInteger(req.user.id);
  if (!interviewId || !currentUserId) {
    return res.status(400).json({ error: "Invalid identifiers" });
  }

  try {
    const existing = await pool.query(
      `
        SELECT i.*, m.user_one_id, m.user_two_id
        FROM interviews i
        JOIN matches m ON m.id = i.match_id
        WHERE i.id = $1
        LIMIT 1
      `,
      [interviewId]
    );

    const interview = existing.rows[0];
    if (!interview || ![interview.user_one_id, interview.user_two_id].includes(currentUserId)) {
      return res.status(404).json({ error: "Interview not found" });
    }

    const status = normalizeText(req.body.status) || interview.status;
    if (!INTERVIEW_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid interview status" });
    }

    const updated = await pool.query(
      `UPDATE interviews SET status = $2, notes = $3 WHERE id = $1 RETURNING *`,
      [interviewId, status, normalizeText(req.body.notes) || interview.notes]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("UPDATE INTERVIEW ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.get("/api/analytics/:userId", authenticateToken, async (req, res) => {
  const userId = coerceInteger(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  if (String(req.user.id) !== String(userId) && !req.user.is_admin) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const profileRes = await pool.query(`SELECT ${PROFILE_SELECT} FROM profiles WHERE id = $1`, [userId]);
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = profileRes.rows[0];
    const matchStats = await pool.query(
      `
        SELECT
          COUNT(*) AS total_matches,
          COUNT(*) FILTER (WHERE is_closed = false) AS active_matches
        FROM matches
        WHERE user_one_id = $1 OR user_two_id = $1
      `,
      [userId]
    );

    const messageStats = await pool.query(
      `
        SELECT COUNT(*) AS total_messages
        FROM messages ms
        JOIN matches m ON m.id = ms.match_id
        WHERE m.user_one_id = $1 OR m.user_two_id = $1
      `,
      [userId]
    );

    const pipelineStats = await pool.query(
      `
        SELECT stage, COUNT(*)::int AS count
        FROM recruitment_pipeline
        WHERE clinic_id = $1
        GROUP BY stage
      `,
      [userId]
    );

    const talentStats = await pool.query(
      `SELECT COUNT(*)::int AS saved_candidates FROM talent_pool WHERE clinic_id = $1`,
      [userId]
    );

    const interviewStats = await pool.query(
      `
        SELECT COUNT(*)::int AS scheduled_interviews
        FROM interviews i
        JOIN matches m ON m.id = i.match_id
        WHERE m.user_one_id = $1 OR m.user_two_id = $1
      `,
      [userId]
    );

    res.json({
      profile_completion: Boolean(profile.name) ? 100 : 0,
      total_matches: Number(matchStats.rows[0]?.total_matches || 0),
      active_matches: Number(matchStats.rows[0]?.active_matches || 0),
      total_messages: Number(messageStats.rows[0]?.total_messages || 0),
      saved_candidates: Number(talentStats.rows[0]?.saved_candidates || 0),
      scheduled_interviews: Number(interviewStats.rows[0]?.scheduled_interviews || 0),
      pipeline_breakdown: pipelineStats.rows,
    });
  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/ai/parse-search", authenticateToken, async (req, res) => {
  const query = normalizeText(req.body.query);
  if (!query) {
    return res.status(400).json({ error: "Query required" });
  }

  try {
    if (process.env.OPENAI_API_KEY) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Extract recruiting search filters into JSON with keys position, location, days, salaryMin, jobType. Keep values concise. Return valid JSON only." },
          { role: "user", content: query },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      return res.json(parsed);
    }

    res.json({ query });
  } catch (err) {
    console.error("PARSE SEARCH ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/ai/profile-highlights", authenticateToken, async (req, res) => {
  const profileId = coerceInteger(req.body.profile_id || req.user.id);
  if (!profileId) {
    return res.status(400).json({ error: "Invalid profile id" });
  }

  try {
    const result = await pool.query(`SELECT ${PROFILE_SELECT} FROM profiles WHERE id = $1`, [profileId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = result.rows[0];
    let highlights = buildStrengthHighlights(profile);

    if (process.env.OPENAI_API_KEY && highlights.length < 3) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Create 3 short Hebrew professional strengths bullets for a hiring profile. Return valid JSON with key highlights." },
          { role: "user", content: JSON.stringify(profile) },
        ],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      if (Array.isArray(parsed.highlights) && parsed.highlights.length > 0) {
        highlights = parsed.highlights.slice(0, 4);
      }
    }

    const suggestions = buildConversationSuggestions(mapFeedRow(profile), profile.role === "CLINIC", "matched");
    res.json({ highlights, suggestions });
  } catch (err) {
    console.error("PROFILE HIGHLIGHTS ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.get("/api/market-jobs/search", authenticateToken, async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "").toLowerCase() === "true";
    if (refresh) {
      await importMarketJobs(pool, {
        query: req.query.query,
        location: req.query.location,
        industry: req.query.industry,
        jobType: req.query.jobType,
        limit: req.query.limit,
      });
    }

    const jobs = await searchMarketJobs(pool, {
      query: req.query.query,
      location: req.query.location,
      industry: req.query.industry,
      jobType: req.query.jobType,
      limit: req.query.limit,
    });

    res.json({ jobs, refreshed: refresh });
  } catch (err) {
    console.error("MARKET JOB SEARCH ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/market-jobs/import", authenticateToken, async (req, res) => {
  try {
    const result = await importMarketJobs(pool, {
      query: req.body.query,
      location: req.body.location,
      industry: req.body.industry,
      jobType: req.body.jobType,
      limit: req.body.limit,
    });

    res.json({ ...result, warnings: sanitizeMarketJobWarningsForClient(result.warnings) });
  } catch (err) {
    console.error("MARKET JOB IMPORT ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/market-jobs/debug", authenticateToken, async (req, res) => {
  try {
    const filters = {
      query: req.body.query,
      location: req.body.location,
      industry: req.body.industry,
      jobType: req.body.jobType,
      limit: req.body.limit,
    };

    const importResult = await importMarketJobs(pool, filters);
    const searchResult = await searchMarketJobs(pool, filters);

    res.json({
      filters: importResult.filters,
      importedCount: importResult.importedCount,
      importedJobs: importResult.jobs,
      warnings: importResult.warnings,
      sourceStats: importResult.sourceStats || [],
      publisherStats: importResult.publisherStats || [],
      searchCount: searchResult.length,
      searchedJobs: searchResult,
    });
  } catch (err) {
    console.error("MARKET JOB DEBUG ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

const verifyAdminRole = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

app.post("/api/admin/stats", authenticateToken, verifyAdminRole, async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM admin_stats");
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/admin/users", authenticateToken, verifyAdminRole, async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, email, role, COALESCE(required_position, position) AS position, is_blocked, created_at
        FROM profiles
        ORDER BY created_at DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ADMIN USERS ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

app.post("/api/admin/toggle-block", authenticateToken, verifyAdminRole, async (req, res) => {
  try {
    await pool.query("UPDATE profiles SET is_blocked = $1 WHERE id = $2", [req.body.blockStatus, req.body.userIdToBlock]);
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN TOGGLE BLOCK ERROR:", err);
    res.status(500).json({ error: "אירעה שגיאה, נסה שוב" });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`ShiftMatch Backend Running on port ${PORT}`);
  initializeSchemaWithRetry()
    .then((schemaReady) => {
      // Only start the background refresh once the schema is known-good —
      // initializeSchemaWithRetry resolves either way, so check the result
      // rather than assuming success.
      if (schemaReady) {
        startMarketJobsScheduler(pool);
      } else {
        console.warn("[market-jobs] background refresh not started — schema initialization failed");
      }
    })
    .catch((err) => {
      console.error("UNEXPECTED SCHEMA INIT FAILURE:", err);
    });
});

