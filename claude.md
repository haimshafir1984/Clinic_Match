# CLAUDE.md — מיפוי פרויקט ClinicMatch
**עודכן:** 2026-03-02 | **סטטוס:** 🔴 NOT PRODUCTION-READY – יש לטפל בבעיות קריטיות לפני השקה

---

## TL;DR למפתח חדש
**מה זה:** פלטפורמת Tinder לתחום הרפואה — מרפאות ועובדים מחליקים כרטיסים, match = צ'אט.
**Stack:** React+TS (Vite) בפרונטאנד, Express+PostgreSQL בבאקנד, JWT auth (ללא סיסמה!), AI עם GPT-4o-mini.
**איפה לשנות תחומים/תפקידים:** `frontend/src/constants/domains.ts`
**API Base URL:** `https://clinic-match.onrender.com/api` (hardcoded ב-`frontend/src/lib/api.ts`)

---

# ClinicMatch – Architecture Review & Production Readiness Audit
**Reviewed:** 2026-03-02 | **Reviewer:** Senior Product Architect + Mobile UX Expert + Fullstack Reviewer
**Status:** 🔴 NOT PRODUCTION-READY – Critical issues must be resolved first

---

## חלק 1 – סקירה טכנית מלאה

---

### 1. מבנה תיקיות

```
clinic_match/
├── backend/
│   ├── server.js          # שרת Express בודד (monolith)
│   └── package.json       # express, pg, cors, jsonwebtoken, openai, dotenv
│
└── frontend/
    ├── src/
    │   ├── App.tsx                    # Router + Guards + Providers
    │   ├── pages/                     # דפי אפליקציה (Login, Register, Swipe, Matches, Chat, ChatList, Profile, Insights, Admin)
    │   ├── components/
    │   │   ├── auth/                  # AuthGuard, ProfileGuard
    │   │   ├── chat/                  # ChatInput, ChatMessages, AIChatAssistant
    │   │   ├── layout/                # AppLayout, BottomNav, TopHeader
    │   │   ├── matches/               # MatchCard
    │   │   ├── profile/               # ProfileForm, ProfileView, BoostProfileSection, MagicWriteModal, RecruitmentSettings
    │   │   ├── registration/          # DomainSelector, RoleMultiSelector
    │   │   ├── swipe/                 # SwipeCard, SwipeActions, EmptyState, MatchCelebration, NaturalLanguageSearch
    │   │   └── ui/                    # shadcn/ui components (~40 components)
    │   ├── contexts/
    │   │   └── AuthContext.tsx        # Auth state management
    │   ├── hooks/                     # useChatMessages, useMatchDetails, useMatches, useProfile, useSwipeProfiles
    │   ├── integrations/supabase/     # ⚠️ Supabase client ו-types – לא בשימוש פעיל
    │   ├── lib/
    │   │   ├── api.ts                 # כל ה-API calls לבאקנד
    │   │   ├── adminApi.ts            # Admin API calls
    │   │   └── profileCompletion.ts   # חישוב השלמת פרופיל
    │   ├── types/
    │   │   ├── index.ts               # Types ראשיים
    │   │   └── admin.ts               # Types לאדמין
    │   └── constants/
    │       └── domains.ts             # רשימת תחומי עיסוק
    ├── supabase/
    │   └── migrations/                # Migration אחד בלבד (RLS policies)
    └── package.json                   # React, Vite, TanStack Query, Framer Motion, shadcn/ui, Tailwind
```

---

### 2. טכנולוגיות בשימוש

| שכבה | טכנולוגיה | גרסה / הערה |
|---|---|---|
| Frontend Framework | React + TypeScript | Vite build |
| UI Library | shadcn/ui + Tailwind CSS | RTL support |
| State Management | TanStack Query (React Query) | caching, retry |
| Animation | Framer Motion | swipe gestures |
| Routing | React Router v6 | guards implemented |
| Backend | Node.js + Express | single file monolith |
| Database (Backend) | PostgreSQL | via `pg` pool |
| Database (Supabase) | Supabase (PostgreSQL) | ⚠️ schema שונה, לא בשימוש בפועל |
| Auth | JWT (jsonwebtoken) | email-only, NO password |
| AI | OpenAI GPT-4o-mini | bio generation + screening questions |
| Deployment | Render.com (backend) | free tier = cold starts |
| PWA | Vite PWA Plugin | manifest + icons קיימים |

---

### 3. זרימת משתמש עיקרית (User Flow)

```
[Login Page]
  ├── משתמש קיים → POST /api/auth/login (email בלבד) → JWT → localStorage → /swipe
  └── משתמש חדש → /register
        ├── Step 1: Role (CLINIC / STAFF)
        ├── Step 2: Domain (dental, optics, etc.)
        ├── Step 3: Positions (multi-select)
        └── Step 4: Details (name, email, city) → POST /api/profiles → JWT → /profile

[/swipe]
  └── GET /api/feed/:userId → כרטיסי פרופיל (20 ראשונים)
        ├── Swipe Right (Like) → POST /api/swipe → type:LIKE → בדיקת match → אם match → celebration overlay
        └── Swipe Left (Pass) → POST /api/swipe → type:PASS

[/matches]
  └── GET /api/matches/:userId → רשימת matches

[/chat/:matchId]
  └── GET /api/messages/:matchId (polling 5 שניות)
      POST /api/messages (שליחת הודעה)

[/profile]
  └── POST /api/profiles (upsert) + localStorage cache

[/insights]
  └── נתונים סינתטיים (מחושבים לוקאלית – אין API)

[/admin]
  └── POST /api/admin/stats + POST /api/admin/users + POST /api/admin/toggle-block
```

---

### 4. ניהול State

| מידע | איפה נשמר | בעיה |
|---|---|---|
| JWT Token | localStorage | ✅ תקין |
| current_user | localStorage | ⚠️ עלול להיות stale |
| current_profile | localStorage | 🔴 זהו ה-source of truth היחיד לפרופיל |
| Feed profiles | React Query (in-memory) | ✅ תקין |
| Matches | React Query (in-memory) | ✅ תקין |
| Messages | React Query (polling 5s) | ⚠️ polling כבד |

---

### 5. נקודות חולשה (Weaknesses)

1. **אין GET /api/profiles/:id** – הבאקנד אינו מחזיר פרופיל לפי ID; הפרונטאנד מסתמך על localStorage cache בלבד
2. **ללא סיסמה** – Auth מבוסס email בלבד; כל מי שיודע את האימייל יכול להתחבר
3. **JWT default secret** – `'my_super_secret_key_12345'` בקוד אם אין `.env`
4. **CORS פתוח לכל** – `app.use(cors())` ללא מגבלת origin
5. **Polling חזק** – Chat מבקש כל 5 שניות; אין WebSocket
6. **Render.com Free Tier** – cold start של 30-60 שניות אחרי חוסר פעילות
7. **Supabase integration לא בשימוש** – קוד מיותר וסכמה מבלבלת
8. **אין Rate Limiting** – ניתן לייצר swipes/messages ב-loop
9. **Insights page – נתונים מזויפים** – Views ו-Likes מחושבים עם `Math.random()` – שקרי

---

### 6. נקודות סיכון לפרודקשן 🔴

| # | סיכון | חומרה | השפעה |
|---|---|---|---|
| 1 | Email-only auth ללא סיסמה | קריטי | חשיפת כל משתמש |
| 2 | JWT_SECRET fallback בקוד | קריטי | זיוף tokens |
| 3 | is_blocked לא נבדק ב-login | גבוה | משתמשים חסומים יכולים להתחבר |
| 4 | sender_id לא מאומת בשליחת הודעה (messages endpoint) | גבוה | הזרקת הודעות במקום אחר |
| 5 | CORS open to all origins | גבוה | CSRF-like attacks |
| 6 | אין GET /profiles/:id | בינוני | cache stale = ממשק שבור |
| 7 | Insights מבוסס Math.random() | בינוני | חוסר אמינות, כעס משתמשים |
| 8 | Chat polling 5s ללא cleanup | בינוני | memory leak + עומס שרת |
| 9 | admin_stats view לא קיים | בינוני | crash של Admin page |
| 10 | אין index ב-swipes וב-messages | בינוני | slowdown עם scale |

---

### 7. תלויות קריטיות

```
Backend → PostgreSQL (Render DB) → חובה שה-DATABASE_URL תהיה תקינה
Backend → OpenAI API Key → ל-Magic Bio ול-Screening Questions
Backend → JWT_SECRET → חייב להיות ב-.env בלבד
Frontend → https://clinic-match.onrender.com/api → hardcoded URL
Frontend → Render.com free tier → cold starts
```

---

## חלק 2 – Mobile UX Analysis

### ✅ טוב

- `h-dvh` ב-Chat page – מטפל נכון ב-dynamic viewport (keyboard)
- `safe-bottom` class ב-BottomNav – מכסה iPhone home bar
- `max-w-md mx-auto` – מגביל לרוחב מובייל מקסימלי
- Framer Motion swipe gestures – gesture מדויק ותגובתי
- BottomNav בגובה 64px (h-16) – גבול מינימלי לאזור אגודל
- Badge indicator על "שיחות" – UX pattern טוב
- AnimatePresence + motion transitions – onboarding חלק

### ⚠️ בעיות Mobile UX

#### 1. SwipeCard – אזור תמונה קבוע ב-45% גובה
```
// SwipeCard.tsx שורה 154
<div className="relative" style={{ height: "45%" }}>
```
**בעיה:** בטלפונים קטנים (iPhone SE: 375×667px) הכרטיס מרגיש צפוף מדי. 45% = ~300px לתמונה + שאר לתוכן, אין גמישות.
**המלצה:** `min-h-[220px] max-h-[45%]` במקום.

#### 2. Swipe Threshold נמוך מדי (100px)
```
// SwipeCard.tsx שורה 80-84
if (info.offset.x > 100) onSwipeRight();
else if (info.offset.x < -100) onSwipeLeft();
```
**בעיה:** על מסכים רחבים (414px+) הסף 100px הוא 24% בלבד – גורם לswiping בשוגג.
**המלצה:** `window.innerWidth * 0.3` (30% מרוחב המסך).

#### 3. NaturalLanguageSearch מעמיס על מסך Swipe
**בעיה:** שורת חיפוש + כרטיס + כפתורי פעולה בדף אחד = עומס. על iPhone SE חלק מהכרטיס נגזז.
**המלצה:** הסתר את החיפוש ב-bottom sheet / filter icon.

#### 4. SwipeActions – כפתורי Pass/Like
**בעיה:** לא ראיתי גודל מינימלי מוגדר. לפי Apple HIG, כפתורי touch צריכים להיות לפחות 44×44px.
**המלצה:** `min-w-[56px] min-h-[56px]` לכפתורי הלב ו-X.

#### 5. Chat Input – Keyboard Push-up
**בעיה:** ChatInput ב-Chat.tsx יושב ב-`flex flex-col h-dvh` – תקין, אבל אם `AIChatAssistant` מחליף גובה, המסך עשוי להשתבש.
**המלצה:** `overflow-hidden` על ה-container הראשי + `flex-shrink-0` על ה-input.

#### 6. Register form – אין autocomplete מסודר
**בעיה:** שדה אימייל במסך register אינו מופיע בשלב ראשון; המשתמש מגיע לשלב 4 ורק אז מזין אימייל. אם הדפדפן מציע autocomplete, הוא עשוי לבצע autofill על שדות שגויים.
**המלצה:** הוסף `autoComplete="off"` לשדות שאינם אימייל.

#### 7. Admin Page – טבלת Table על מובייל
**בעיה:** `overflow-x-auto` על ה-Table תקין, אבל scroll אופקי על מובייל הוא חוויה גרועה.
**המלצה:** בנה Admin mobile-first עם cards במקום table.

#### 8. Text Hierarchy – Insights Page
**בעיה:** כותרות 2xl ו-text-sm ממשיכות לסירוגין ללא היררכיה ברורה. הצמד fontsize scale ל-design tokens.

#### 9. Skeleton / Loading UX
**בעיה:** Swipe page מציג `Loader2` spinner ולא skeleton cards. Matches ו-ChatList לא ראיתי skeleton.
**המלצה:** השתמש ב-`<Skeleton />` (קיים ב-shadcn/ui) לכל list/card.

#### 10. RTL + LTR mixing
**בעיה:** שדה אימייל עם `dir="ltr"` בתוך form עם `dir="rtl"` עלול לגרום לבעיות עם cursor position על iOS.
**המלצה:** `inputMode="email"` + `dir="ltr"` + `className="text-left"`.

---

## חלק 3 – Bug Audit

### 🔴 קריטי

#### BUG-01: Insights – נתוני Views/Likes הם Math.random()
**קובץ:** `src/pages/Insights.tsx` שורות 100-110
```js
const baseViews = Math.floor(Math.random() * 50) + 20;  // 🔴 FAKE
const viewMultiplier = completion.percentage / 100;
return {
  views: Math.floor(baseViews * viewMultiplier),         // 🔴 FAKE
  likes: Math.floor((baseViews * viewMultiplier) * 0.3), // 🔴 FAKE
  responseRate: matchesCount > 0 ? Math.floor(Math.random() * 30) + 70 : 0, // 🔴 FAKE
};
```
**השפעה:** נתונים שקריים לחלוטין. משתנים בכל render. אסור לפרודקשן.

#### BUG-02: is_blocked לא נבדק ב-login
**קובץ:** `backend/server.js` שורות 90-105
```js
app.post('/api/auth/login', async (req, res) => {
  const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
  // ❌ אין בדיקה של result.rows[0].is_blocked
  const token = jwt.sign(...);
  res.json({ user, token });
});
```
**השפעה:** משתמש חסום מתחבר בלי בעיה.

#### BUG-03: Messages endpoint – sender_id לא מאומת כחלק מה-match
**קובץ:** `backend/server.js` שורות 303-313
```js
app.post('/api/messages', authenticateToken, async (req, res) => {
  if (String(req.user.id) !== String(req.body.sender_id)) return 403;
  // ❌ אין בדיקה שה-sender הוא חלק מה-match (user_one_id OR user_two_id)
  await pool.query('INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3)', ...);
});
```
**השפעה:** כל משתמש מאומת יכול לשלוח הודעות לכל match שלא שלו.

#### BUG-04: getMatchDetails – endpoint לא קיים בבאקנד
**קובץ:** `src/lib/api.ts` שורה 323
```js
const response = await apiCall<BackendMatch>(`/matches/${userId}/${matchId}`);
// ❌ Backend has no GET /matches/:userId/:matchId
```
**השפעה:** `useMatchDetails` תמיד מחזיר `null`. Chat page עלול לא להציג את שם הצד השני.

#### BUG-05: admin_stats view לא קיים
**קובץ:** `backend/server.js` שורה 323
```js
const result = await pool.query('SELECT * FROM admin_stats');
// ❌ admin_stats view/table לא קיים ב-schema
```
**השפעה:** Admin page crashes ב-stats fetch.

---

### 🟠 גבוה

#### BUG-06: Chat Polling – אין cleanup ב-unmount
**קובץ:** `src/hooks/useChatMessages.ts` שורה 16
```js
refetchInterval: 5000, // polling תמידי
```
**השפעה:** TanStack Query מנהל cleanup אוטומטית כשהקומפוננטה עוזבת, אבל אם המשתמש חוזר בין matches, יתפתחו N pollers מקביל. (**הערה:** TanStack Query טיפל בחלק מזה, אך יש לוודא שכל query key ייחודי.)
**תיקון:** ודא שה-queryKey מכיל את `matchId`.

#### BUG-07: JWT_SECRET fallback ב-code
**קובץ:** `backend/server.js` שורה 23
```js
const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_key_12345'; // 🔴
```
**השפעה:** אם `.env` לא הוגדר, כל מי שיודע את ה-default יכול לזייף tokens.

#### BUG-08: updateProfileApi – email נלקח מ-localStorage
**קובץ:** `src/lib/api.ts` שורות 664-670
```js
const currentUserData = localStorage.getItem("current_user");
email = parsedUser.email; // email ממקור לא מאומת
```
**השפעה:** ניתן לשנות email ב-localStorage ולקרוא updateProfile עם email שונה.

#### BUG-09: CORS פתוח לכל origin
**קובץ:** `backend/server.js` שורה 9
```js
app.use(cors()); // ❌ כל origin מורשה
```

#### BUG-10: swipe ב-PASS – סיכוי ל-duplicate entry
**קובץ:** `backend/server.js` שורה 220
```js
await pool.query('INSERT INTO swipes (swiper_id, swiped_id, type) VALUES ($1, $2, $3)', ...);
// ❌ אין ON CONFLICT ב-swipes – double-swipe = duplicate row
```

---

### 🟡 בינוני

#### BUG-11: handleDragEnd – TypeScript bypass
**קובץ:** `src/components/swipe/SwipeCard.tsx` שורה 79
```js
const handleDragEnd = (_: any, info: PanInfo) => { // ❌ _: any
```

#### BUG-12: isProfileComplete – לוגיקה שגויה
**קובץ:** `src/lib/api.ts` שורה 372-374
```js
const hasPosition = role === "clinic" ? Boolean(requiredPosition) : Boolean(position);
// ❌ clinic לא חייבת requiredPosition, היא יכולה לפרסם positions[]
```

#### BUG-13: Insights stats מחושב ב-useMemo עם Math.random()
**קובץ:** `src/pages/Insights.tsx` שורה 162
```js
const stats = useMemo(() => calculateStats(profile, matches.length), [profile, matches.length]);
// useMemo לא מקבע Math.random() – כל פעם שה-dependency משתנה הנתונים משתנים
```

#### BUG-14: Admin page – type bypass
**קובץ:** `src/pages/Admin.tsx` שורה 51
```js
const isAdmin = (currentUser as any).is_admin === true || (currentUser as any).isAdmin === true;
// ❌ CurrentUser type לא כולל is_admin בצורה ברורה
```

#### BUG-15: אין validation על content ב-messages
**קובץ:** `backend/server.js` – POST /api/messages
```js
// ❌ אין בדיקת אורך content, XSS chars, null checks
```

---

## חלק 4 – DB Review

### DB הבאקנד (PostgreSQL דרך Render)

#### טבלאות שחסרות / Views שחסרים

| חסר | למה |
|---|---|
| `admin_stats` view | backend מבצע `SELECT * FROM admin_stats` |
| UNIQUE constraint על `swipes(swiper_id, swiped_id)` | מאפשר double-swipe |
| Index על `swipes(swiper_id, swiped_id)` | כל feed query סורק את כל ה-swipes |
| Index על `messages(match_id, created_at)` | כל chat load סורק את כל ה-messages |
| Index על `profiles(email)` | login מבצע lookup לפי email |
| Index על `profiles(role)` | feed query מסנן לפי role |
| `is_blocked` check ב-login query | משתמשים חסומים נכנסים |

#### שדות בעייתיים ב-profiles (Backend)

| שדה | בעיה | תיקון |
|---|---|---|
| `email` | UNIQUE קיים (ON CONFLICT), אבל האם NOT NULL? | `ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;` |
| `role` | האם ENUM? אם לא, ניתן להכניס ערכים שגויים | ADD CHECK constraint |
| `is_blocked` | אין DEFAULT FALSE מפורש | `ALTER TABLE profiles ALTER COLUMN is_blocked SET DEFAULT FALSE;` |
| `is_admin` | אין DEFAULT FALSE מפורש | `ALTER TABLE profiles ALTER COLUMN is_admin SET DEFAULT FALSE;` |
| `availability` | JSON ללא validation | שקול JSONB עם CHECK |

#### Schema mismatch קריטי
**שני databases שונים בשימוש:**
- **Backend PostgreSQL** – `profiles(id serial, email, role TEXT 'CLINIC'/'STAFF', location, availability JSONB, positions TEXT[], workplace_types TEXT[], ...)`
- **Supabase** – `profiles(id UUID, user_id UUID, role ENUM 'clinic'/'worker', city, availability_days TEXT[], salary_min, salary_max, ...)`

**ה-Supabase integration לא מחובר לapp בפועל** – רק ה-types נוצרו. Backend הוא ה-source of truth.

---

## חלק 5 – Claude Code Prompt (חלק 2)

```
You are Claude Code operating on the ClinicMatch project.
Your task is to fix ONLY the specific issues listed below.
Do NOT touch any file or logic not explicitly mentioned.
Before each change, print a short explanation (1-2 lines).
Show only diffs. Do not rewrite entire files.

## Files you may edit:
- backend/server.js
- frontend/src/pages/Insights.tsx
- frontend/src/lib/api.ts
- frontend/src/hooks/useChatMessages.ts
- frontend/src/components/swipe/SwipeCard.tsx
- frontend/src/types/index.ts

## Fixes to implement (in order):

### FIX-1: backend/server.js – Block is_blocked users at login
Find the POST /api/auth/login handler.
After fetching the user from DB, add:
  if (user.is_blocked) return res.status(403).json({ error: "Account is suspended" });

### FIX-2: backend/server.js – Remove JWT_SECRET fallback
Change line:
  const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_key_12345';
To:
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) { console.error("FATAL: JWT_SECRET not set"); process.exit(1); }

### FIX-3: backend/server.js – Restrict CORS to allowed origin
Change:
  app.use(cors());
To:
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'https://your-frontend.vercel.app' }));

### FIX-4: backend/server.js – Validate sender is part of match before inserting message
In the POST /api/messages handler, after the identity check, add:
  const matchCheck = await pool.query(
    'SELECT id FROM matches WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)',
    [match_id, sender_id]
  );
  if (matchCheck.rows.length === 0) return res.status(403).json({ error: "Not part of this match" });

### FIX-5: backend/server.js – Prevent duplicate swipes
Change the INSERT into swipes to:
  INSERT INTO swipes (swiper_id, swiped_id, type) VALUES ($1, $2, $3)
  ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET type = EXCLUDED.type

### FIX-6: frontend/src/pages/Insights.tsx – Remove Math.random() fake stats
Replace the entire calculateStats function.
Replace views, likes, responseRate with static values derived only from real data:
  views: 0, // placeholder until real analytics API exists
  likes: 0, // placeholder
  matches: matchesCount,
  responseRate: 0, // placeholder
  profileScore: completion.percentage,
Add a banner in the Insights page: "נתוני צפיות ולייקים יתווספו בקרוב"

### FIX-7: frontend/src/components/swipe/SwipeCard.tsx – Fix drag threshold
Change:
  if (info.offset.x > 100) onSwipeRight();
  else if (info.offset.x < -100) onSwipeLeft();
To:
  const threshold = typeof window !== 'undefined' ? window.innerWidth * 0.28 : 100;
  if (info.offset.x > threshold) onSwipeRight();
  else if (info.offset.x < -threshold) onSwipeLeft();

### FIX-8: frontend/src/types/index.ts – Add isAdmin to CurrentUser type
Add to the CurrentUser interface:
  isAdmin: boolean;
(Remove the optional ? – it should always be present, default false)

## Do NOT:
- Do not change UI design, colors, or layout
- Do not touch any file not listed above
- Do not add new npm packages
- Do not rename functions
- Do not change the database schema (handled separately)
```

---

## חלק 6 – SQL Commands לפרודקשן (pgAdmin4 Safe)

> כל הפקודות הן Production Safe – ללא DELETE, ללא DROP DATA.

### 1. הוסף אינדקסים חסרים

```sql
-- Index על swipes לחיפוש מהיר ב-feed
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_swiped
  ON swipes (swiper_id, swiped_id);

-- Index על profiles לפי role (עבור feed query)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);

-- Index על profiles לפי email (עבור login query)
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles (email);

-- Index על messages לפי match_id ו-created_at (עבור chat)
CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON messages (match_id, created_at ASC);
```

### 2. הוסף UNIQUE constraint על swipes

```sql
-- מנע double-swipe (חובה לפני FIX-5 בבאקנד)
ALTER TABLE swipes
  ADD CONSTRAINT unique_swipe_pair UNIQUE (swiper_id, swiped_id);
```

### 3. הוסף NOT NULL ו-DEFAULT לשדות קריטיים

```sql
-- ודא is_blocked תמיד FALSE כברירת מחדל
ALTER TABLE profiles
  ALTER COLUMN is_blocked SET DEFAULT FALSE,
  ALTER COLUMN is_blocked SET NOT NULL;

-- ודא is_admin תמיד FALSE כברירת מחדל
ALTER TABLE profiles
  ALTER COLUMN is_admin SET DEFAULT FALSE,
  ALTER COLUMN is_admin SET NOT NULL;

-- ודא email הוא NOT NULL
ALTER TABLE profiles
  ALTER COLUMN email SET NOT NULL;

-- ודא role הוא NOT NULL
ALTER TABLE profiles
  ALTER COLUMN role SET NOT NULL;
```

### 4. הוסף CHECK constraint על role

```sql
-- מנע ערכי role שגויים
ALTER TABLE profiles
  ADD CONSTRAINT check_profile_role
  CHECK (role IN ('CLINIC', 'STAFF'));
```

### 5. הוסף UNIQUE constraint על matches

```sql
-- מנע match כפול בין אותם שני משתמשים
ALTER TABLE matches
  ADD CONSTRAINT unique_match_pair
  UNIQUE (
    LEAST(user_one_id::text, user_two_id::text),
    GREATEST(user_one_id::text, user_two_id::text)
  );
```

> **הערה:** אם `user_one_id`/`user_two_id` הם INTEGER, הסר את `::text`.

### 6. צור admin_stats view

```sql
-- View עבור Admin panel stats
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  COUNT(*)                                      AS total_users,
  COUNT(*) FILTER (WHERE role = 'CLINIC')       AS total_clinics,
  COUNT(*) FILTER (WHERE role = 'STAFF')        AS total_workers,
  (SELECT COUNT(*) FROM matches WHERE is_closed = false) AS active_matches
FROM profiles;
```

### 7. הוסף content validation על messages

```sql
-- מגבל אורך הודעה ל-2000 תווים
ALTER TABLE messages
  ADD CONSTRAINT check_message_length
  CHECK (char_length(content) BETWEEN 1 AND 2000);
```

### 8. הוסף Foreign Keys חסרים (אם עדיין אין)

```sql
-- ודא FK ממatches ל-profiles (אם עדיין אין)
-- הפעל רק אם ה-constraint לא קיים

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_matches_user_one'
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT fk_matches_user_one
      FOREIGN KEY (user_one_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_matches_user_two'
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT fk_matches_user_two
      FOREIGN KEY (user_two_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_messages_match'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT fk_messages_match
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
  END IF;
END $$;
```

---

## סיכום עדיפויות לפני פרודקשן

### 🔴 חובה (בלוקר לפרודקשן)
1. FIX-1: חסום is_blocked ב-login
2. FIX-2: הסר JWT_SECRET fallback
3. FIX-4: ודא sender הוא חלק מה-match
4. SQL #4: CHECK constraint על role
5. הוסף GET /api/profiles/:id endpoint לבאקנד

### 🟠 גבוה (תוך שבוע)
6. FIX-3: הגבל CORS
7. FIX-5 + SQL #2: מנע double-swipe
8. SQL #6: צור admin_stats view
9. SQL #1: הוסף אינדקסים
10. FIX-6: הסר Math.random() מ-Insights

### 🟡 בינוני (תוך חודש)
11. FIX-7: תקן swipe threshold
12. שדרג Chat מ-polling ל-WebSocket
13. הוסף rate limiting (express-rate-limit)
14. הוסף GET /api/profiles/:id endpoint
15. Admin page – Mobile-first redesign

---

*מסמך זה נוצר אוטומטית על ידי ניתוח מלא של קוד הפרויקט. יש לעדכן אותו לאחר כל sprint.*
