const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
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

  return {
    email: normalizeEmail(body.email),
    role,
    name: normalizeText(body.name) || "",
    position,
    required_position: requiredPosition,
    positions,
    workplace_types: workplaceTypes,
    industry: normalizeText(body.industry),
    location: normalizeText(body.location),
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

app.post("/api/auth/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: "Email missing" });
  }

  try {
    const result = await pool.query(`SELECT ${PROFILE_SELECT} FROM profiles WHERE email = $1`, [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = result.rows[0];
    if (user.is_blocked) {
      return res.status(403).json({ error: "Account is suspended" });
    }

    const token = jwt.sign({ id: user.id, role: user.role, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, user: mapProfileRow(user), token });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/profiles", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: "Email required" });
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
          email, role, name, position, required_position, positions, workplace_types, industry, location,
          description, radius_km, experience_years, availability_date, availability_days, availability_hours,
          salary_min, salary_max, salary_info, availability, job_type,
          screening_questions, is_auto_screener_active, is_urgent,
          avatar_url, logo_url
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, $23,
          $24, $25
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
          description = $10,
          radius_km = $11,
          experience_years = $12,
          availability_date = $13,
          availability_days = $14,
          availability_hours = $15,
          salary_min = $16,
          salary_max = $17,
          salary_info = $18,
          availability = $19,
          job_type = $20,
          screening_questions = $21,
          is_auto_screener_active = $22,
          is_urgent = $23,
          avatar_url = $24,
          logo_url = $25
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
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/feed/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(req.user.id) !== String(userId) && !req.user.is_admin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const userRes = await pool.query(
      `SELECT role, positions, workplace_types, location, industry FROM profiles WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.json([]);
    }

    const user = userRes.rows[0];
    const targetRole = user.role === "STAFF" ? "CLINIC" : "STAFF";

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
        AND ($4::text IS NULL OR location = $4::text)
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
      user.location,
      userId,
      user.industry || null,
    ]);

    res.json(feed.rows.map(mapFeedRow));
  } catch (err) {
    console.error("FEED ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/swipe", authenticateToken, async (req, res) => {
  const { swiper_id, swiped_id, type } = req.body;
  if (String(req.user.id) !== String(swiper_id)) {
    return res.status(403).json({ error: "Identity mismatch" });
  }
  if (!["LIKE", "PASS"].includes(type)) {
    return res.status(400).json({ error: "Invalid swipe type" });
  }

  try {
    await pool.query(
      `
        INSERT INTO swipes (swiper_id, swiped_id, type)
        VALUES ($1, $2, $3)
        ON CONFLICT (swiper_id, swiped_id)
        DO UPDATE SET type = EXCLUDED.type
      `,
      [swiper_id, swiped_id, type]
    );

    if (type === "LIKE") {
      const matchCheck = await pool.query(
        `SELECT id FROM swipes WHERE swiper_id = $1 AND swiped_id = $2 AND type = 'LIKE'`,
        [swiped_id, swiper_id]
      );

      if (matchCheck.rows.length > 0) {
        const matchRes = await pool.query(
          `
            INSERT INTO matches (user_one_id, user_two_id)
            VALUES (LEAST($1, $2), GREATEST($1, $2))
            ON CONFLICT DO NOTHING
            RETURNING id
          `,
          [swiper_id, swiped_id]
        );

        let matchId = matchRes.rows[0]?.id;
        if (!matchId) {
          const existingMatch = await pool.query(
            `SELECT id FROM matches WHERE LEAST(user_one_id, user_two_id) = LEAST($1, $2) AND GREATEST(user_one_id, user_two_id) = GREATEST($1, $2)`,
            [swiper_id, swiped_id]
          );
          matchId = existingMatch.rows[0]?.id;
        }

        if (matchId) {
          const profiles = await pool.query(
            `SELECT id, role, is_auto_screener_active, screening_questions FROM profiles WHERE id IN ($1, $2)`,
            [swiper_id, swiped_id]
          );

          const clinic = profiles.rows.find((profile) => profile.role === "CLINIC" && profile.is_auto_screener_active === true);
          if (clinic && Array.isArray(clinic.screening_questions) && clinic.screening_questions.length > 0) {
            const questionsList = clinic.screening_questions.map((question) => `• ${question}`).join("\n");
            const botMessage = `היי, שמחים על ההתאמה!\nכדי להתקדם, נשמח שתענה/י על מספר שאלות קצרות:\n\n${questionsList}`;

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
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/matches/:userId", authenticateToken, async (req, res) => {
  if (String(req.user.id) !== String(req.params.userId) && !req.user.is_admin) {
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
        p.logo_url
      FROM matches m
      JOIN profiles p ON (p.id = m.user_one_id OR p.id = m.user_two_id)
      WHERE (m.user_one_id = $1 OR m.user_two_id = $1)
        AND p.id != $1
      ORDER BY m.created_at DESC
    `;

    const result = await pool.query(query, [req.params.userId]);
    const mapped = result.rows.map((row) => ({
      ...row,
      position: row.role === "CLINIC" ? row.required_position || row.position : row.position,
      image_url: row.role === "CLINIC" ? row.logo_url || row.avatar_url : row.avatar_url || row.logo_url,
    }));
    res.json(mapped);
  } catch (err) {
    console.error("MATCHES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/matches/:userId/:matchId", authenticateToken, async (req, res) => {
  if (String(req.user.id) !== String(req.params.userId) && !req.user.is_admin) {
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
      [req.params.userId, req.params.matchId]
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
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/matches/:matchId/close", authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT id FROM matches WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)`,
      [req.params.matchId, String(req.user.id)]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query(`UPDATE matches SET is_closed = true WHERE id = $1`, [req.params.matchId]);
    res.json({ success: true });
  } catch (err) {
    console.error("CLOSE MATCH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/messages/:matchId", authenticateToken, async (req, res) => {
  try {
    const membership = await pool.query(
      `SELECT id FROM matches WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)`,
      [req.params.matchId, String(req.user.id)]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "Not part of this match" });
    }

    const result = await pool.query(
      `SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC`,
      [req.params.matchId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/messages", authenticateToken, async (req, res) => {
  if (String(req.user.id) !== String(req.body.sender_id)) {
    return res.status(403).json({ error: "Identity mismatch" });
  }

  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (!content || content.length > 2000) {
    return res.status(400).json({ error: "Message must be between 1 and 2000 characters" });
  }

  try {
    const matchCheck = await pool.query(
      `SELECT id FROM matches WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)`,
      [req.body.match_id, req.body.sender_id]
    );
    if (matchCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not part of this match" });
    }

    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [req.body.match_id, req.body.sender_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/toggle-block", authenticateToken, verifyAdminRole, async (req, res) => {
  try {
    await pool.query("UPDATE profiles SET is_blocked = $1 WHERE id = $2", [req.body.blockStatus, req.body.userIdToBlock]);
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN TOGGLE BLOCK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ClinicMatch Backend Running on port ${PORT}`));

