# CLAUDE.md ג€” ׳׳™׳₪׳•׳™ ׳₪׳¨׳•׳™׳§׳˜ ClinicMatch
**׳¢׳•׳“׳›׳:** 2026-03-02 | **׳¡׳˜׳˜׳•׳¡:** נ”´ NOT PRODUCTION-READY ג€“ ׳™׳© ׳׳˜׳₪׳ ׳‘׳‘׳¢׳™׳•׳× ׳§׳¨׳™׳˜׳™׳•׳× ׳׳₪׳ ׳™ ׳”׳©׳§׳”

---

## TL;DR ׳׳׳₪׳×׳— ׳—׳“׳©
**׳׳” ׳–׳”:** ׳₪׳׳˜׳₪׳•׳¨׳׳× Tinder ׳׳×׳—׳•׳ ׳”׳¨׳₪׳•׳׳” ג€” ׳׳¨׳₪׳׳•׳× ׳•׳¢׳•׳‘׳“׳™׳ ׳׳—׳׳™׳§׳™׳ ׳›׳¨׳˜׳™׳¡׳™׳, match = ׳¦'׳׳˜.
**Stack:** React+TS (Vite) ׳‘׳₪׳¨׳•׳ ׳˜׳׳ ׳“, Express+PostgreSQL ׳‘׳‘׳׳§׳ ׳“, JWT auth (׳׳׳ ׳¡׳™׳¡׳׳”!), AI ׳¢׳ GPT-4o-mini.
**׳׳™׳₪׳” ׳׳©׳ ׳•׳× ׳×׳—׳•׳׳™׳/׳×׳₪׳§׳™׳“׳™׳:** `frontend/src/constants/domains.ts`
**API Base URL:** `https://clinic-match.onrender.com/api` (hardcoded ׳‘-`frontend/src/lib/api.ts`)

---

# ClinicMatch ג€“ Architecture Review & Production Readiness Audit
**Reviewed:** 2026-03-02 | **Reviewer:** Senior Product Architect + Mobile UX Expert + Fullstack Reviewer
**Status:** נ”´ NOT PRODUCTION-READY ג€“ Critical issues must be resolved first

---

## ׳—׳׳§ 1 ג€“ ׳¡׳§׳™׳¨׳” ׳˜׳›׳ ׳™׳× ׳׳׳׳”

---

### 1. ׳׳‘׳ ׳” ׳×׳™׳§׳™׳•׳×

```
clinic_match/
ג”ג”€ג”€ backend/
ג”‚   ג”ג”€ג”€ server.js          # ׳©׳¨׳× Express ׳‘׳•׳“׳“ (monolith)
ג”‚   ג””ג”€ג”€ package.json       # express, pg, cors, jsonwebtoken, openai, dotenv
ג”‚
ג””ג”€ג”€ frontend/
    ג”ג”€ג”€ src/
    ג”‚   ג”ג”€ג”€ App.tsx                    # Router + Guards + Providers
    ג”‚   ג”ג”€ג”€ pages/                     # ׳“׳₪׳™ ׳׳₪׳׳™׳§׳¦׳™׳” (Login, Register, Swipe, Matches, Chat, ChatList, Profile, Insights, Admin)
    ג”‚   ג”ג”€ג”€ components/
    ג”‚   ג”‚   ג”ג”€ג”€ auth/                  # AuthGuard, ProfileGuard
    ג”‚   ג”‚   ג”ג”€ג”€ chat/                  # ChatInput, ChatMessages, AIChatAssistant
    ג”‚   ג”‚   ג”ג”€ג”€ layout/                # AppLayout, BottomNav, TopHeader
    ג”‚   ג”‚   ג”ג”€ג”€ matches/               # MatchCard
    ג”‚   ג”‚   ג”ג”€ג”€ profile/               # ProfileForm, ProfileView, BoostProfileSection, MagicWriteModal, RecruitmentSettings
    ג”‚   ג”‚   ג”ג”€ג”€ registration/          # DomainSelector, RoleMultiSelector
    ג”‚   ג”‚   ג”ג”€ג”€ swipe/                 # SwipeCard, SwipeActions, EmptyState, MatchCelebration, NaturalLanguageSearch
    ג”‚   ג”‚   ג””ג”€ג”€ ui/                    # shadcn/ui components (~40 components)
    ג”‚   ג”ג”€ג”€ contexts/
    ג”‚   ג”‚   ג””ג”€ג”€ AuthContext.tsx        # Auth state management
    ג”‚   ג”ג”€ג”€ hooks/                     # useChatMessages, useMatchDetails, useMatches, useProfile, useSwipeProfiles
    ג”‚   ג”ג”€ג”€ integrations/supabase/     # ג ן¸ Supabase client ׳•-types ג€“ ׳׳ ׳‘׳©׳™׳׳•׳© ׳₪׳¢׳™׳
    ג”‚   ג”ג”€ג”€ lib/
    ג”‚   ג”‚   ג”ג”€ג”€ api.ts                 # ׳›׳ ׳”-API calls ׳׳‘׳׳§׳ ׳“
    ג”‚   ג”‚   ג”ג”€ג”€ adminApi.ts            # Admin API calls
    ג”‚   ג”‚   ג””ג”€ג”€ profileCompletion.ts   # ׳—׳™׳©׳•׳‘ ׳”׳©׳׳׳× ׳₪׳¨׳•׳₪׳™׳
    ג”‚   ג”ג”€ג”€ types/
    ג”‚   ג”‚   ג”ג”€ג”€ index.ts               # Types ׳¨׳׳©׳™׳™׳
    ג”‚   ג”‚   ג””ג”€ג”€ admin.ts               # Types ׳׳׳“׳׳™׳
    ג”‚   ג””ג”€ג”€ constants/
    ג”‚       ג””ג”€ג”€ domains.ts             # ׳¨׳©׳™׳׳× ׳×׳—׳•׳׳™ ׳¢׳™׳¡׳•׳§
    ג”ג”€ג”€ supabase/
    ג”‚   ג””ג”€ג”€ migrations/                # Migration ׳׳—׳“ ׳‘׳׳‘׳“ (RLS policies)
    ג””ג”€ג”€ package.json                   # React, Vite, TanStack Query, Framer Motion, shadcn/ui, Tailwind
```

---

### 2. ׳˜׳›׳ ׳•׳׳•׳’׳™׳•׳× ׳‘׳©׳™׳׳•׳©

| ׳©׳›׳‘׳” | ׳˜׳›׳ ׳•׳׳•׳’׳™׳” | ׳’׳¨׳¡׳” / ׳”׳¢׳¨׳” |
|---|---|---|
| Frontend Framework | React + TypeScript | Vite build |
| UI Library | shadcn/ui + Tailwind CSS | RTL support |
| State Management | TanStack Query (React Query) | caching, retry |
| Animation | Framer Motion | swipe gestures |
| Routing | React Router v6 | guards implemented |
| Backend | Node.js + Express | single file monolith |
| Database (Backend) | PostgreSQL | via `pg` pool |
| Database (Supabase) | Supabase (PostgreSQL) | ג ן¸ schema ׳©׳•׳ ׳”, ׳׳ ׳‘׳©׳™׳׳•׳© ׳‘׳₪׳•׳¢׳ |
| Auth | JWT (jsonwebtoken) | email-only, NO password |
| AI | OpenAI GPT-4o-mini | bio generation + screening questions |
| Deployment | Render.com (backend) | free tier = cold starts |
| PWA | Vite PWA Plugin | manifest + icons ׳§׳™׳™׳׳™׳ |

---

### 3. ׳–׳¨׳™׳׳× ׳׳©׳×׳׳© ׳¢׳™׳§׳¨׳™׳× (User Flow)

```
[Login Page]
  ג”ג”€ג”€ ׳׳©׳×׳׳© ׳§׳™׳™׳ ג†’ POST /api/auth/login (email ׳‘׳׳‘׳“) ג†’ JWT ג†’ localStorage ג†’ /swipe
  ג””ג”€ג”€ ׳׳©׳×׳׳© ׳—׳“׳© ג†’ /register
        ג”ג”€ג”€ Step 1: Role (CLINIC / STAFF)
        ג”ג”€ג”€ Step 2: Domain (dental, optics, etc.)
        ג”ג”€ג”€ Step 3: Positions (multi-select)
        ג””ג”€ג”€ Step 4: Details (name, email, city) ג†’ POST /api/profiles ג†’ JWT ג†’ /profile

[/swipe]
  ג””ג”€ג”€ GET /api/feed/:userId ג†’ ׳›׳¨׳˜׳™׳¡׳™ ׳₪׳¨׳•׳₪׳™׳ (20 ׳¨׳׳©׳•׳ ׳™׳)
        ג”ג”€ג”€ Swipe Right (Like) ג†’ POST /api/swipe ג†’ type:LIKE ג†’ ׳‘׳“׳™׳§׳× match ג†’ ׳׳ match ג†’ celebration overlay
        ג””ג”€ג”€ Swipe Left (Pass) ג†’ POST /api/swipe ג†’ type:PASS

[/matches]
  ג””ג”€ג”€ GET /api/matches/:userId ג†’ ׳¨׳©׳™׳׳× matches

[/chat/:matchId]
  ג””ג”€ג”€ GET /api/messages/:matchId (polling 5 ׳©׳ ׳™׳•׳×)
      POST /api/messages (׳©׳׳™׳—׳× ׳”׳•׳“׳¢׳”)

[/profile]
  ג””ג”€ג”€ POST /api/profiles (upsert) + localStorage cache

[/insights]
  ג””ג”€ג”€ ׳ ׳×׳•׳ ׳™׳ ׳¡׳™׳ ׳×׳˜׳™׳™׳ (׳׳—׳•׳©׳‘׳™׳ ׳׳•׳§׳׳׳™׳× ג€“ ׳׳™׳ API)

[/admin]
  ג””ג”€ג”€ POST /api/admin/stats + POST /api/admin/users + POST /api/admin/toggle-block
```

---

### 4. ׳ ׳™׳”׳•׳ State

| ׳׳™׳“׳¢ | ׳׳™׳₪׳” ׳ ׳©׳׳¨ | ׳‘׳¢׳™׳” |
|---|---|---|
| JWT Token | localStorage | ג… ׳×׳§׳™׳ |
| current_user | localStorage | ג ן¸ ׳¢׳׳•׳ ׳׳”׳™׳•׳× stale |
| current_profile | localStorage | נ”´ ׳–׳”׳• ׳”-source of truth ׳”׳™׳—׳™׳“ ׳׳₪׳¨׳•׳₪׳™׳ |
| Feed profiles | React Query (in-memory) | ג… ׳×׳§׳™׳ |
| Matches | React Query (in-memory) | ג… ׳×׳§׳™׳ |
| Messages | React Query (polling 5s) | ג ן¸ polling ׳›׳‘׳“ |

---

### 5. ׳ ׳§׳•׳“׳•׳× ׳—׳•׳׳©׳” (Weaknesses)

1. **׳׳™׳ GET /api/profiles/:id** ג€“ ׳”׳‘׳׳§׳ ׳“ ׳׳™׳ ׳• ׳׳—׳–׳™׳¨ ׳₪׳¨׳•׳₪׳™׳ ׳׳₪׳™ ID; ׳”׳₪׳¨׳•׳ ׳˜׳׳ ׳“ ׳׳¡׳×׳׳ ׳¢׳ localStorage cache ׳‘׳׳‘׳“
2. **׳׳׳ ׳¡׳™׳¡׳׳”** ג€“ Auth ׳׳‘׳•׳¡׳¡ email ׳‘׳׳‘׳“; ׳›׳ ׳׳™ ׳©׳™׳•׳“׳¢ ׳׳× ׳”׳׳™׳׳™׳™׳ ׳™׳›׳•׳ ׳׳”׳×׳—׳‘׳¨
3. **JWT default secret** ג€“ `'my_super_secret_key_12345'` ׳‘׳§׳•׳“ ׳׳ ׳׳™׳ `.env`
4. **CORS ׳₪׳×׳•׳— ׳׳›׳** ג€“ `app.use(cors())` ׳׳׳ ׳׳’׳‘׳׳× origin
5. **Polling ׳—׳–׳§** ג€“ Chat ׳׳‘׳§׳© ׳›׳ 5 ׳©׳ ׳™׳•׳×; ׳׳™׳ WebSocket
6. **Render.com Free Tier** ג€“ cold start ׳©׳ 30-60 ׳©׳ ׳™׳•׳× ׳׳—׳¨׳™ ׳—׳•׳¡׳¨ ׳₪׳¢׳™׳׳•׳×
7. **Supabase integration ׳׳ ׳‘׳©׳™׳׳•׳©** ג€“ ׳§׳•׳“ ׳׳™׳•׳×׳¨ ׳•׳¡׳›׳׳” ׳׳‘׳׳‘׳׳×
8. **׳׳™׳ Rate Limiting** ג€“ ׳ ׳™׳×׳ ׳׳™׳™׳¦׳¨ swipes/messages ׳‘-loop
9. **Insights page ג€“ ׳ ׳×׳•׳ ׳™׳ ׳׳–׳•׳™׳₪׳™׳** ג€“ Views ׳•-Likes ׳׳—׳•׳©׳‘׳™׳ ׳¢׳ `Math.random()` ג€“ ׳©׳§׳¨׳™

---

### 6. ׳ ׳§׳•׳“׳•׳× ׳¡׳™׳›׳•׳ ׳׳₪׳¨׳•׳“׳§׳©׳ נ”´

| # | ׳¡׳™׳›׳•׳ | ׳—׳•׳׳¨׳” | ׳”׳©׳₪׳¢׳” |
|---|---|---|---|
| 1 | Email-only auth ׳׳׳ ׳¡׳™׳¡׳׳” | ׳§׳¨׳™׳˜׳™ | ׳—׳©׳™׳₪׳× ׳›׳ ׳׳©׳×׳׳© |
| 2 | JWT_SECRET fallback ׳‘׳§׳•׳“ | ׳§׳¨׳™׳˜׳™ | ׳–׳™׳•׳£ tokens |
| 3 | is_blocked ׳׳ ׳ ׳‘׳“׳§ ׳‘-login | ׳’׳‘׳•׳” | ׳׳©׳×׳׳©׳™׳ ׳—׳¡׳•׳׳™׳ ׳™׳›׳•׳׳™׳ ׳׳”׳×׳—׳‘׳¨ |
| 4 | sender_id ׳׳ ׳׳׳•׳׳× ׳‘׳©׳׳™׳—׳× ׳”׳•׳“׳¢׳” (messages endpoint) | ׳’׳‘׳•׳” | ׳”׳–׳¨׳§׳× ׳”׳•׳“׳¢׳•׳× ׳‘׳׳§׳•׳ ׳׳—׳¨ |
| 5 | CORS open to all origins | ׳’׳‘׳•׳” | CSRF-like attacks |
| 6 | ׳׳™׳ GET /profiles/:id | ׳‘׳™׳ ׳•׳ ׳™ | cache stale = ׳׳׳©׳§ ׳©׳‘׳•׳¨ |
| 7 | Insights ׳׳‘׳•׳¡׳¡ Math.random() | ׳‘׳™׳ ׳•׳ ׳™ | ׳—׳•׳¡׳¨ ׳׳׳™׳ ׳•׳×, ׳›׳¢׳¡ ׳׳©׳×׳׳©׳™׳ |
| 8 | Chat polling 5s ׳׳׳ cleanup | ׳‘׳™׳ ׳•׳ ׳™ | memory leak + ׳¢׳•׳׳¡ ׳©׳¨׳× |
| 9 | admin_stats view ׳׳ ׳§׳™׳™׳ | ׳‘׳™׳ ׳•׳ ׳™ | crash ׳©׳ Admin page |
| 10 | ׳׳™׳ index ׳‘-swipes ׳•׳‘-messages | ׳‘׳™׳ ׳•׳ ׳™ | slowdown ׳¢׳ scale |

---

### 7. ׳×׳׳•׳™׳•׳× ׳§׳¨׳™׳˜׳™׳•׳×

```
Backend ג†’ PostgreSQL (Render DB) ג†’ ׳—׳•׳‘׳” ׳©׳”-DATABASE_URL ׳×׳”׳™׳” ׳×׳§׳™׳ ׳”
Backend ג†’ OpenAI API Key ג†’ ׳-Magic Bio ׳•׳-Screening Questions
Backend ג†’ JWT_SECRET ג†’ ׳—׳™׳™׳‘ ׳׳”׳™׳•׳× ׳‘-.env ׳‘׳׳‘׳“
Frontend ג†’ https://clinic-match.onrender.com/api ג†’ hardcoded URL
Frontend ג†’ Render.com free tier ג†’ cold starts
```

---

## ׳—׳׳§ 2 ג€“ Mobile UX Analysis

### ג… ׳˜׳•׳‘

- `h-dvh` ׳‘-Chat page ג€“ ׳׳˜׳₪׳ ׳ ׳›׳•׳ ׳‘-dynamic viewport (keyboard)
- `safe-bottom` class ׳‘-BottomNav ג€“ ׳׳›׳¡׳” iPhone home bar
- `max-w-md mx-auto` ג€“ ׳׳’׳‘׳™׳ ׳׳¨׳•׳—׳‘ ׳׳•׳‘׳™׳™׳ ׳׳§׳¡׳™׳׳׳™
- Framer Motion swipe gestures ג€“ gesture ׳׳“׳•׳™׳§ ׳•׳×׳’׳•׳‘׳×׳™
- BottomNav ׳‘׳’׳•׳‘׳” 64px (h-16) ג€“ ׳’׳‘׳•׳ ׳׳™׳ ׳™׳׳׳™ ׳׳׳–׳•׳¨ ׳׳’׳•׳“׳
- Badge indicator ׳¢׳ "׳©׳™׳—׳•׳×" ג€“ UX pattern ׳˜׳•׳‘
- AnimatePresence + motion transitions ג€“ onboarding ׳—׳׳§

### ג ן¸ ׳‘׳¢׳™׳•׳× Mobile UX

#### 1. SwipeCard ג€“ ׳׳–׳•׳¨ ׳×׳׳•׳ ׳” ׳§׳‘׳•׳¢ ׳‘-45% ׳’׳•׳‘׳”
```
// SwipeCard.tsx ׳©׳•׳¨׳” 154
<div className="relative" style={{ height: "45%" }}>
```
**׳‘׳¢׳™׳”:** ׳‘׳˜׳׳₪׳•׳ ׳™׳ ׳§׳˜׳ ׳™׳ (iPhone SE: 375ֳ—667px) ׳”׳›׳¨׳˜׳™׳¡ ׳׳¨׳’׳™׳© ׳¦׳₪׳•׳£ ׳׳“׳™. 45% = ~300px ׳׳×׳׳•׳ ׳” + ׳©׳׳¨ ׳׳×׳•׳›׳, ׳׳™׳ ׳’׳׳™׳©׳•׳×.
**׳”׳׳׳¦׳”:** `min-h-[220px] max-h-[45%]` ׳‘׳׳§׳•׳.

#### 2. Swipe Threshold ׳ ׳׳•׳ ׳׳“׳™ (100px)
```
// SwipeCard.tsx ׳©׳•׳¨׳” 80-84
if (info.offset.x > 100) onSwipeRight();
else if (info.offset.x < -100) onSwipeLeft();
```
**׳‘׳¢׳™׳”:** ׳¢׳ ׳׳¡׳›׳™׳ ׳¨׳—׳‘׳™׳ (414px+) ׳”׳¡׳£ 100px ׳”׳•׳ 24% ׳‘׳׳‘׳“ ג€“ ׳’׳•׳¨׳ ׳swiping ׳‘׳©׳•׳’׳’.
**׳”׳׳׳¦׳”:** `window.innerWidth * 0.3` (30% ׳׳¨׳•׳—׳‘ ׳”׳׳¡׳).

#### 3. NaturalLanguageSearch ׳׳¢׳׳™׳¡ ׳¢׳ ׳׳¡׳ Swipe
**׳‘׳¢׳™׳”:** ׳©׳•׳¨׳× ׳—׳™׳₪׳•׳© + ׳›׳¨׳˜׳™׳¡ + ׳›׳₪׳×׳•׳¨׳™ ׳₪׳¢׳•׳׳” ׳‘׳“׳£ ׳׳—׳“ = ׳¢׳•׳׳¡. ׳¢׳ iPhone SE ׳—׳׳§ ׳׳”׳›׳¨׳˜׳™׳¡ ׳ ׳’׳–׳–.
**׳”׳׳׳¦׳”:** ׳”׳¡׳×׳¨ ׳׳× ׳”׳—׳™׳₪׳•׳© ׳‘-bottom sheet / filter icon.

#### 4. SwipeActions ג€“ ׳›׳₪׳×׳•׳¨׳™ Pass/Like
**׳‘׳¢׳™׳”:** ׳׳ ׳¨׳׳™׳×׳™ ׳’׳•׳“׳ ׳׳™׳ ׳™׳׳׳™ ׳׳•׳’׳“׳¨. ׳׳₪׳™ Apple HIG, ׳›׳₪׳×׳•׳¨׳™ touch ׳¦׳¨׳™׳›׳™׳ ׳׳”׳™׳•׳× ׳׳₪׳—׳•׳× 44ֳ—44px.
**׳”׳׳׳¦׳”:** `min-w-[56px] min-h-[56px]` ׳׳›׳₪׳×׳•׳¨׳™ ׳”׳׳‘ ׳•-X.

#### 5. Chat Input ג€“ Keyboard Push-up
**׳‘׳¢׳™׳”:** ChatInput ׳‘-Chat.tsx ׳™׳•׳©׳‘ ׳‘-`flex flex-col h-dvh` ג€“ ׳×׳§׳™׳, ׳׳‘׳ ׳׳ `AIChatAssistant` ׳׳—׳׳™׳£ ׳’׳•׳‘׳”, ׳”׳׳¡׳ ׳¢׳©׳•׳™ ׳׳”׳©׳×׳‘׳©.
**׳”׳׳׳¦׳”:** `overflow-hidden` ׳¢׳ ׳”-container ׳”׳¨׳׳©׳™ + `flex-shrink-0` ׳¢׳ ׳”-input.

#### 6. Register form ג€“ ׳׳™׳ autocomplete ׳׳¡׳•׳“׳¨
**׳‘׳¢׳™׳”:** ׳©׳“׳” ׳׳™׳׳™׳™׳ ׳‘׳׳¡׳ register ׳׳™׳ ׳• ׳׳•׳₪׳™׳¢ ׳‘׳©׳׳‘ ׳¨׳׳©׳•׳; ׳”׳׳©׳×׳׳© ׳׳’׳™׳¢ ׳׳©׳׳‘ 4 ׳•׳¨׳§ ׳׳– ׳׳–׳™׳ ׳׳™׳׳™׳™׳. ׳׳ ׳”׳“׳₪׳“׳₪׳ ׳׳¦׳™׳¢ autocomplete, ׳”׳•׳ ׳¢׳©׳•׳™ ׳׳‘׳¦׳¢ autofill ׳¢׳ ׳©׳“׳•׳× ׳©׳’׳•׳™׳™׳.
**׳”׳׳׳¦׳”:** ׳”׳•׳¡׳£ `autoComplete="off"` ׳׳©׳“׳•׳× ׳©׳׳™׳ ׳ ׳׳™׳׳™׳™׳.

#### 7. Admin Page ג€“ ׳˜׳‘׳׳× Table ׳¢׳ ׳׳•׳‘׳™׳™׳
**׳‘׳¢׳™׳”:** `overflow-x-auto` ׳¢׳ ׳”-Table ׳×׳§׳™׳, ׳׳‘׳ scroll ׳׳•׳₪׳§׳™ ׳¢׳ ׳׳•׳‘׳™׳™׳ ׳”׳•׳ ׳—׳•׳•׳™׳” ׳’׳¨׳•׳¢׳”.
**׳”׳׳׳¦׳”:** ׳‘׳ ׳” Admin mobile-first ׳¢׳ cards ׳‘׳׳§׳•׳ table.

#### 8. Text Hierarchy ג€“ Insights Page
**׳‘׳¢׳™׳”:** ׳›׳•׳×׳¨׳•׳× 2xl ׳•-text-sm ׳׳׳©׳™׳›׳•׳× ׳׳¡׳™׳¨׳•׳’׳™׳ ׳׳׳ ׳”׳™׳¨׳¨׳›׳™׳” ׳‘׳¨׳•׳¨׳”. ׳”׳¦׳׳“ fontsize scale ׳-design tokens.

#### 9. Skeleton / Loading UX
**׳‘׳¢׳™׳”:** Swipe page ׳׳¦׳™׳’ `Loader2` spinner ׳•׳׳ skeleton cards. Matches ׳•-ChatList ׳׳ ׳¨׳׳™׳×׳™ skeleton.
**׳”׳׳׳¦׳”:** ׳”׳©׳×׳׳© ׳‘-`<Skeleton />` (׳§׳™׳™׳ ׳‘-shadcn/ui) ׳׳›׳ list/card.

#### 10. RTL + LTR mixing
**׳‘׳¢׳™׳”:** ׳©׳“׳” ׳׳™׳׳™׳™׳ ׳¢׳ `dir="ltr"` ׳‘׳×׳•׳ form ׳¢׳ `dir="rtl"` ׳¢׳׳•׳ ׳׳’׳¨׳•׳ ׳׳‘׳¢׳™׳•׳× ׳¢׳ cursor position ׳¢׳ iOS.
**׳”׳׳׳¦׳”:** `inputMode="email"` + `dir="ltr"` + `className="text-left"`.

---

## ׳—׳׳§ 3 ג€“ Bug Audit

### נ”´ ׳§׳¨׳™׳˜׳™

#### BUG-01: Insights ג€“ ׳ ׳×׳•׳ ׳™ Views/Likes ׳”׳ Math.random()
**׳§׳•׳‘׳¥:** `src/pages/Insights.tsx` ׳©׳•׳¨׳•׳× 100-110
```js
const baseViews = Math.floor(Math.random() * 50) + 20;  // נ”´ FAKE
const viewMultiplier = completion.percentage / 100;
return {
  views: Math.floor(baseViews * viewMultiplier),         // נ”´ FAKE
  likes: Math.floor((baseViews * viewMultiplier) * 0.3), // נ”´ FAKE
  responseRate: matchesCount > 0 ? Math.floor(Math.random() * 30) + 70 : 0, // נ”´ FAKE
};
```
**׳”׳©׳₪׳¢׳”:** ׳ ׳×׳•׳ ׳™׳ ׳©׳§׳¨׳™׳™׳ ׳׳—׳׳•׳˜׳™׳. ׳׳©׳×׳ ׳™׳ ׳‘׳›׳ render. ׳׳¡׳•׳¨ ׳׳₪׳¨׳•׳“׳§׳©׳.

#### BUG-02: is_blocked ׳׳ ׳ ׳‘׳“׳§ ׳‘-login
**׳§׳•׳‘׳¥:** `backend/server.js` ׳©׳•׳¨׳•׳× 90-105
```js
app.post('/api/auth/login', async (req, res) => {
  const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
  // ג ׳׳™׳ ׳‘׳“׳™׳§׳” ׳©׳ result.rows[0].is_blocked
  const token = jwt.sign(...);
  res.json({ user, token });
});
```
**׳”׳©׳₪׳¢׳”:** ׳׳©׳×׳׳© ׳—׳¡׳•׳ ׳׳×׳—׳‘׳¨ ׳‘׳׳™ ׳‘׳¢׳™׳”.

#### BUG-03: Messages endpoint ג€“ sender_id ׳׳ ׳׳׳•׳׳× ׳›׳—׳׳§ ׳׳”-match
**׳§׳•׳‘׳¥:** `backend/server.js` ׳©׳•׳¨׳•׳× 303-313
```js
app.post('/api/messages', authenticateToken, async (req, res) => {
  if (String(req.user.id) !== String(req.body.sender_id)) return 403;
  // ג ׳׳™׳ ׳‘׳“׳™׳§׳” ׳©׳”-sender ׳”׳•׳ ׳—׳׳§ ׳׳”-match (user_one_id OR user_two_id)
  await pool.query('INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3)', ...);
});
```
**׳”׳©׳₪׳¢׳”:** ׳›׳ ׳׳©׳×׳׳© ׳׳׳•׳׳× ׳™׳›׳•׳ ׳׳©׳׳•׳— ׳”׳•׳“׳¢׳•׳× ׳׳›׳ match ׳©׳׳ ׳©׳׳•.

#### BUG-04: getMatchDetails ג€“ endpoint ׳׳ ׳§׳™׳™׳ ׳‘׳‘׳׳§׳ ׳“
**׳§׳•׳‘׳¥:** `src/lib/api.ts` ׳©׳•׳¨׳” 323
```js
const response = await apiCall<BackendMatch>(`/matches/${userId}/${matchId}`);
// ג Backend has no GET /matches/:userId/:matchId
```
**׳”׳©׳₪׳¢׳”:** `useMatchDetails` ׳×׳׳™׳“ ׳׳—׳–׳™׳¨ `null`. Chat page ׳¢׳׳•׳ ׳׳ ׳׳”׳¦׳™׳’ ׳׳× ׳©׳ ׳”׳¦׳“ ׳”׳©׳ ׳™.

#### BUG-05: admin_stats view ׳׳ ׳§׳™׳™׳
**׳§׳•׳‘׳¥:** `backend/server.js` ׳©׳•׳¨׳” 323
```js
const result = await pool.query('SELECT * FROM admin_stats');
// ג admin_stats view/table ׳׳ ׳§׳™׳™׳ ׳‘-schema
```
**׳”׳©׳₪׳¢׳”:** Admin page crashes ׳‘-stats fetch.

---

### נ  ׳’׳‘׳•׳”

#### BUG-06: Chat Polling ג€“ ׳׳™׳ cleanup ׳‘-unmount
**׳§׳•׳‘׳¥:** `src/hooks/useChatMessages.ts` ׳©׳•׳¨׳” 16
```js
refetchInterval: 5000, // polling ׳×׳׳™׳“׳™
```
**׳”׳©׳₪׳¢׳”:** TanStack Query ׳׳ ׳”׳ cleanup ׳׳•׳˜׳•׳׳˜׳™׳× ׳›׳©׳”׳§׳•׳׳₪׳•׳ ׳ ׳˜׳” ׳¢׳•׳–׳‘׳×, ׳׳‘׳ ׳׳ ׳”׳׳©׳×׳׳© ׳—׳•׳–׳¨ ׳‘׳™׳ matches, ׳™׳×׳₪׳×׳—׳• N pollers ׳׳§׳‘׳™׳. (**׳”׳¢׳¨׳”:** TanStack Query ׳˜׳™׳₪׳ ׳‘׳—׳׳§ ׳׳–׳”, ׳׳ ׳™׳© ׳׳•׳•׳“׳ ׳©׳›׳ query key ׳™׳™׳—׳•׳“׳™.)
**׳×׳™׳§׳•׳:** ׳•׳“׳ ׳©׳”-queryKey ׳׳›׳™׳ ׳׳× `matchId`.

#### BUG-07: JWT_SECRET fallback ׳‘-code
**׳§׳•׳‘׳¥:** `backend/server.js` ׳©׳•׳¨׳” 23
```js
const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_key_12345'; // נ”´
```
**׳”׳©׳₪׳¢׳”:** ׳׳ `.env` ׳׳ ׳”׳•׳’׳“׳¨, ׳›׳ ׳׳™ ׳©׳™׳•׳“׳¢ ׳׳× ׳”-default ׳™׳›׳•׳ ׳׳–׳™׳™׳£ tokens.

#### BUG-08: updateProfileApi ג€“ email ׳ ׳׳§׳— ׳-localStorage
**׳§׳•׳‘׳¥:** `src/lib/api.ts` ׳©׳•׳¨׳•׳× 664-670
```js
const currentUserData = localStorage.getItem("current_user");
email = parsedUser.email; // email ׳׳׳§׳•׳¨ ׳׳ ׳׳׳•׳׳×
```
**׳”׳©׳₪׳¢׳”:** ׳ ׳™׳×׳ ׳׳©׳ ׳•׳× email ׳‘-localStorage ׳•׳׳§׳¨׳•׳ updateProfile ׳¢׳ email ׳©׳•׳ ׳”.

#### BUG-09: CORS ׳₪׳×׳•׳— ׳׳›׳ origin
**׳§׳•׳‘׳¥:** `backend/server.js` ׳©׳•׳¨׳” 9
```js
app.use(cors()); // ג ׳›׳ origin ׳׳•׳¨׳©׳”
```

#### BUG-10: swipe ׳‘-PASS ג€“ ׳¡׳™׳›׳•׳™ ׳-duplicate entry
**׳§׳•׳‘׳¥:** `backend/server.js` ׳©׳•׳¨׳” 220
```js
await pool.query('INSERT INTO swipes (swiper_id, swiped_id, type) VALUES ($1, $2, $3)', ...);
// ג ׳׳™׳ ON CONFLICT ׳‘-swipes ג€“ double-swipe = duplicate row
```

---

### נ¡ ׳‘׳™׳ ׳•׳ ׳™

#### BUG-11: handleDragEnd ג€“ TypeScript bypass
**׳§׳•׳‘׳¥:** `src/components/swipe/SwipeCard.tsx` ׳©׳•׳¨׳” 79
```js
const handleDragEnd = (_: any, info: PanInfo) => { // ג _: any
```

#### BUG-12: isProfileComplete ג€“ ׳׳•׳’׳™׳§׳” ׳©׳’׳•׳™׳”
**׳§׳•׳‘׳¥:** `src/lib/api.ts` ׳©׳•׳¨׳” 372-374
```js
const hasPosition = role === "clinic" ? Boolean(requiredPosition) : Boolean(position);
// ג clinic ׳׳ ׳—׳™׳™׳‘׳× requiredPosition, ׳”׳™׳ ׳™׳›׳•׳׳” ׳׳₪׳¨׳¡׳ positions[]
```

#### BUG-13: Insights stats ׳׳—׳•׳©׳‘ ׳‘-useMemo ׳¢׳ Math.random()
**׳§׳•׳‘׳¥:** `src/pages/Insights.tsx` ׳©׳•׳¨׳” 162
```js
const stats = useMemo(() => calculateStats(profile, matches.length), [profile, matches.length]);
// useMemo ׳׳ ׳׳§׳‘׳¢ Math.random() ג€“ ׳›׳ ׳₪׳¢׳ ׳©׳”-dependency ׳׳©׳×׳ ׳” ׳”׳ ׳×׳•׳ ׳™׳ ׳׳©׳×׳ ׳™׳
```

#### BUG-14: Admin page ג€“ type bypass
**׳§׳•׳‘׳¥:** `src/pages/Admin.tsx` ׳©׳•׳¨׳” 51
```js
const isAdmin = (currentUser as any).is_admin === true || (currentUser as any).isAdmin === true;
// ג CurrentUser type ׳׳ ׳›׳•׳׳ is_admin ׳‘׳¦׳•׳¨׳” ׳‘׳¨׳•׳¨׳”
```

#### BUG-15: ׳׳™׳ validation ׳¢׳ content ׳‘-messages
**׳§׳•׳‘׳¥:** `backend/server.js` ג€“ POST /api/messages
```js
// ג ׳׳™׳ ׳‘׳“׳™׳§׳× ׳׳•׳¨׳ content, XSS chars, null checks
```

---

## ׳—׳׳§ 4 ג€“ DB Review

### DB ׳”׳‘׳׳§׳ ׳“ (PostgreSQL ׳“׳¨׳ Render)

#### ׳˜׳‘׳׳׳•׳× ׳©׳—׳¡׳¨׳•׳× / Views ׳©׳—׳¡׳¨׳™׳

| ׳—׳¡׳¨ | ׳׳׳” |
|---|---|
| `admin_stats` view | backend ׳׳‘׳¦׳¢ `SELECT * FROM admin_stats` |
| UNIQUE constraint ׳¢׳ `swipes(swiper_id, swiped_id)` | ׳׳׳₪׳©׳¨ double-swipe |
| Index ׳¢׳ `swipes(swiper_id, swiped_id)` | ׳›׳ feed query ׳¡׳•׳¨׳§ ׳׳× ׳›׳ ׳”-swipes |
| Index ׳¢׳ `messages(match_id, created_at)` | ׳›׳ chat load ׳¡׳•׳¨׳§ ׳׳× ׳›׳ ׳”-messages |
| Index ׳¢׳ `profiles(email)` | login ׳׳‘׳¦׳¢ lookup ׳׳₪׳™ email |
| Index ׳¢׳ `profiles(role)` | feed query ׳׳¡׳ ׳ ׳׳₪׳™ role |
| `is_blocked` check ׳‘-login query | ׳׳©׳×׳׳©׳™׳ ׳—׳¡׳•׳׳™׳ ׳ ׳›׳ ׳¡׳™׳ |

#### ׳©׳“׳•׳× ׳‘׳¢׳™׳™׳×׳™׳™׳ ׳‘-profiles (Backend)

| ׳©׳“׳” | ׳‘׳¢׳™׳” | ׳×׳™׳§׳•׳ |
|---|---|---|
| `email` | UNIQUE ׳§׳™׳™׳ (ON CONFLICT), ׳׳‘׳ ׳”׳׳ NOT NULL? | `ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;` |
| `role` | ׳”׳׳ ENUM? ׳׳ ׳׳, ׳ ׳™׳×׳ ׳׳”׳›׳ ׳™׳¡ ׳¢׳¨׳›׳™׳ ׳©׳’׳•׳™׳™׳ | ADD CHECK constraint |
| `is_blocked` | ׳׳™׳ DEFAULT FALSE ׳׳₪׳•׳¨׳© | `ALTER TABLE profiles ALTER COLUMN is_blocked SET DEFAULT FALSE;` |
| `is_admin` | ׳׳™׳ DEFAULT FALSE ׳׳₪׳•׳¨׳© | `ALTER TABLE profiles ALTER COLUMN is_admin SET DEFAULT FALSE;` |
| `availability` | JSON ׳׳׳ validation | ׳©׳§׳•׳ JSONB ׳¢׳ CHECK |

#### Schema mismatch ׳§׳¨׳™׳˜׳™
**׳©׳ ׳™ databases ׳©׳•׳ ׳™׳ ׳‘׳©׳™׳׳•׳©:**
- **Backend PostgreSQL** ג€“ `profiles(id serial, email, role TEXT 'CLINIC'/'STAFF', location, availability JSONB, positions TEXT[], workplace_types TEXT[], ...)`
- **Supabase** ג€“ `profiles(id UUID, user_id UUID, role ENUM 'clinic'/'worker', city, availability_days TEXT[], salary_min, salary_max, ...)`

**׳”-Supabase integration ׳׳ ׳׳—׳•׳‘׳¨ ׳app ׳‘׳₪׳•׳¢׳** ג€“ ׳¨׳§ ׳”-types ׳ ׳•׳¦׳¨׳•. Backend ׳”׳•׳ ׳”-source of truth.

---

## ׳—׳׳§ 5 ג€“ Claude Code Prompt (׳—׳׳§ 2)

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

### FIX-1: backend/server.js ג€“ Block is_blocked users at login
Find the POST /api/auth/login handler.
After fetching the user from DB, add:
  if (user.is_blocked) return res.status(403).json({ error: "Account is suspended" });

### FIX-2: backend/server.js ג€“ Remove JWT_SECRET fallback
Change line:
  const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_key_12345';
To:
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) { console.error("FATAL: JWT_SECRET not set"); process.exit(1); }

### FIX-3: backend/server.js ג€“ Restrict CORS to allowed origin
Change:
  app.use(cors());
To:
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'https://your-frontend.vercel.app' }));

### FIX-4: backend/server.js ג€“ Validate sender is part of match before inserting message
In the POST /api/messages handler, after the identity check, add:
  const matchCheck = await pool.query(
    'SELECT id FROM matches WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)',
    [match_id, sender_id]
  );
  if (matchCheck.rows.length === 0) return res.status(403).json({ error: "Not part of this match" });

### FIX-5: backend/server.js ג€“ Prevent duplicate swipes
Change the INSERT into swipes to:
  INSERT INTO swipes (swiper_id, swiped_id, type) VALUES ($1, $2, $3)
  ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET type = EXCLUDED.type

### FIX-6: frontend/src/pages/Insights.tsx ג€“ Remove Math.random() fake stats
Replace the entire calculateStats function.
Replace views, likes, responseRate with static values derived only from real data:
  views: 0, // placeholder until real analytics API exists
  likes: 0, // placeholder
  matches: matchesCount,
  responseRate: 0, // placeholder
  profileScore: completion.percentage,
Add a banner in the Insights page: "׳ ׳×׳•׳ ׳™ ׳¦׳₪׳™׳•׳× ׳•׳׳™׳™׳§׳™׳ ׳™׳×׳•׳•׳¡׳₪׳• ׳‘׳§׳¨׳•׳‘"

### FIX-7: frontend/src/components/swipe/SwipeCard.tsx ג€“ Fix drag threshold
Change:
  if (info.offset.x > 100) onSwipeRight();
  else if (info.offset.x < -100) onSwipeLeft();
To:
  const threshold = typeof window !== 'undefined' ? window.innerWidth * 0.28 : 100;
  if (info.offset.x > threshold) onSwipeRight();
  else if (info.offset.x < -threshold) onSwipeLeft();

### FIX-8: frontend/src/types/index.ts ג€“ Add isAdmin to CurrentUser type
Add to the CurrentUser interface:
  isAdmin: boolean;
(Remove the optional ? ג€“ it should always be present, default false)

## Do NOT:
- Do not change UI design, colors, or layout
- Do not touch any file not listed above
- Do not add new npm packages
- Do not rename functions
- Do not change the database schema (handled separately)
```

---

## ׳—׳׳§ 6 ג€“ SQL Commands ׳׳₪׳¨׳•׳“׳§׳©׳ (pgAdmin4 Safe)

> ׳›׳ ׳”׳₪׳§׳•׳“׳•׳× ׳”׳ Production Safe ג€“ ׳׳׳ DELETE, ׳׳׳ DROP DATA.

### 1. ׳”׳•׳¡׳£ ׳׳™׳ ׳“׳§׳¡׳™׳ ׳—׳¡׳¨׳™׳

```sql
-- Index ׳¢׳ swipes ׳׳—׳™׳₪׳•׳© ׳׳”׳™׳¨ ׳‘-feed
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_swiped
  ON swipes (swiper_id, swiped_id);

-- Index ׳¢׳ profiles ׳׳₪׳™ role (׳¢׳‘׳•׳¨ feed query)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);

-- Index ׳¢׳ profiles ׳׳₪׳™ email (׳¢׳‘׳•׳¨ login query)
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles (email);

-- Index ׳¢׳ messages ׳׳₪׳™ match_id ׳•-created_at (׳¢׳‘׳•׳¨ chat)
CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON messages (match_id, created_at ASC);
```

### 2. ׳”׳•׳¡׳£ UNIQUE constraint ׳¢׳ swipes

```sql
-- ׳׳ ׳¢ double-swipe (׳—׳•׳‘׳” ׳׳₪׳ ׳™ FIX-5 ׳‘׳‘׳׳§׳ ׳“)
ALTER TABLE swipes
  ADD CONSTRAINT unique_swipe_pair UNIQUE (swiper_id, swiped_id);
```

### 3. ׳”׳•׳¡׳£ NOT NULL ׳•-DEFAULT ׳׳©׳“׳•׳× ׳§׳¨׳™׳˜׳™׳™׳

```sql
-- ׳•׳“׳ is_blocked ׳×׳׳™׳“ FALSE ׳›׳‘׳¨׳™׳¨׳× ׳׳—׳“׳
ALTER TABLE profiles
  ALTER COLUMN is_blocked SET DEFAULT FALSE,
  ALTER COLUMN is_blocked SET NOT NULL;

-- ׳•׳“׳ is_admin ׳×׳׳™׳“ FALSE ׳›׳‘׳¨׳™׳¨׳× ׳׳—׳“׳
ALTER TABLE profiles
  ALTER COLUMN is_admin SET DEFAULT FALSE,
  ALTER COLUMN is_admin SET NOT NULL;

-- ׳•׳“׳ email ׳”׳•׳ NOT NULL
ALTER TABLE profiles
  ALTER COLUMN email SET NOT NULL;

-- ׳•׳“׳ role ׳”׳•׳ NOT NULL
ALTER TABLE profiles
  ALTER COLUMN role SET NOT NULL;
```

### 4. ׳”׳•׳¡׳£ CHECK constraint ׳¢׳ role

```sql
-- ׳׳ ׳¢ ׳¢׳¨׳›׳™ role ׳©׳’׳•׳™׳™׳
ALTER TABLE profiles
  ADD CONSTRAINT check_profile_role
  CHECK (role IN ('CLINIC', 'STAFF'));
```

### 5. ׳”׳•׳¡׳£ UNIQUE constraint ׳¢׳ matches

```sql
-- ׳׳ ׳¢ match ׳›׳₪׳•׳ ׳‘׳™׳ ׳׳•׳×׳ ׳©׳ ׳™ ׳׳©׳×׳׳©׳™׳
ALTER TABLE matches
  ADD CONSTRAINT unique_match_pair
  UNIQUE (
    LEAST(user_one_id::text, user_two_id::text),
    GREATEST(user_one_id::text, user_two_id::text)
  );
```

> **׳”׳¢׳¨׳”:** ׳׳ `user_one_id`/`user_two_id` ׳”׳ INTEGER, ׳”׳¡׳¨ ׳׳× `::text`.

### 6. ׳¦׳•׳¨ admin_stats view

```sql
-- View ׳¢׳‘׳•׳¨ Admin panel stats
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  COUNT(*)                                      AS total_users,
  COUNT(*) FILTER (WHERE role = 'CLINIC')       AS total_clinics,
  COUNT(*) FILTER (WHERE role = 'STAFF')        AS total_workers,
  (SELECT COUNT(*) FROM matches WHERE is_closed = false) AS active_matches
FROM profiles;
```

### 7. ׳”׳•׳¡׳£ content validation ׳¢׳ messages

```sql
-- ׳׳’׳‘׳ ׳׳•׳¨׳ ׳”׳•׳“׳¢׳” ׳-2000 ׳×׳•׳•׳™׳
ALTER TABLE messages
  ADD CONSTRAINT check_message_length
  CHECK (char_length(content) BETWEEN 1 AND 2000);
```

### 8. ׳”׳•׳¡׳£ Foreign Keys ׳—׳¡׳¨׳™׳ (׳׳ ׳¢׳“׳™׳™׳ ׳׳™׳)

```sql
-- ׳•׳“׳ FK ׳׳atches ׳-profiles (׳׳ ׳¢׳“׳™׳™׳ ׳׳™׳)
-- ׳”׳₪׳¢׳ ׳¨׳§ ׳׳ ׳”-constraint ׳׳ ׳§׳™׳™׳

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

## ׳¡׳™׳›׳•׳ ׳¢׳“׳™׳₪׳•׳™׳•׳× ׳׳₪׳ ׳™ ׳₪׳¨׳•׳“׳§׳©׳

### נ”´ ׳—׳•׳‘׳” (׳‘׳׳•׳§׳¨ ׳׳₪׳¨׳•׳“׳§׳©׳)
1. FIX-1: ׳—׳¡׳•׳ is_blocked ׳‘-login
2. FIX-2: ׳”׳¡׳¨ JWT_SECRET fallback
3. FIX-4: ׳•׳“׳ sender ׳”׳•׳ ׳—׳׳§ ׳׳”-match
4. SQL #4: CHECK constraint ׳¢׳ role
5. ׳”׳•׳¡׳£ GET /api/profiles/:id endpoint ׳׳‘׳׳§׳ ׳“

### נ  ׳’׳‘׳•׳” (׳×׳•׳ ׳©׳‘׳•׳¢)
6. FIX-3: ׳”׳’׳‘׳ CORS
7. FIX-5 + SQL #2: ׳׳ ׳¢ double-swipe
8. SQL #6: ׳¦׳•׳¨ admin_stats view
9. SQL #1: ׳”׳•׳¡׳£ ׳׳™׳ ׳“׳§׳¡׳™׳
10. FIX-6: ׳”׳¡׳¨ Math.random() ׳-Insights

### נ¡ ׳‘׳™׳ ׳•׳ ׳™ (׳×׳•׳ ׳—׳•׳“׳©)
11. FIX-7: ׳×׳§׳ swipe threshold
12. ׳©׳“׳¨׳’ Chat ׳-polling ׳-WebSocket
13. ׳”׳•׳¡׳£ rate limiting (express-rate-limit)
14. ׳”׳•׳¡׳£ GET /api/profiles/:id endpoint
15. Admin page ג€“ Mobile-first redesign

---

*׳׳¡׳׳ ׳–׳” ׳ ׳•׳¦׳¨ ׳׳•׳˜׳•׳׳˜׳™׳× ׳¢׳ ׳™׳“׳™ ׳ ׳™׳×׳•׳— ׳׳׳ ׳©׳ ׳§׳•׳“ ׳”׳₪׳¨׳•׳™׳§׳˜. ׳™׳© ׳׳¢׳“׳›׳ ׳׳•׳×׳• ׳׳׳—׳¨ ׳›׳ sprint.*

