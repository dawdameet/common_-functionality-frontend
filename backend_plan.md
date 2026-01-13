# Common Backend Architecture (Supabase)

> **Philosophy**: The backend enforces the "Private by Default" principle via Row Level Security (RLS). Security is not an application layer concern; it is a database layer guarantee.

---

## 1. Authentication & Users

**Supabase Auth** handles identity.
Custom data lives in `public.profiles`.

### Table: `profiles`
*   `id` (uuid, PK): References `auth.users.id`
*   `full_name` (text)
*   `avatar_url` (text)
*   `role` (enum): `'moderator'`, `'general'`
*   `status` (text): e.g., "Deep Work", "Available"
*   `department` (text)
*   `created_at` (timestamptz)

#### Security (RLS)
*   **Read**: Public (Authenticated) — Everyone needs to see team members.
*   **Update**: Users can update their own profile.
*   **Role Management**: Only `service_role` or a specific admin function can promote users to `moderator`.

---

## 2. Core Surfaces Data Model

### A. Scribblepad (Private Thinking)

**Table: `scribbles`**
*   `id` (uuid, PK)
*   `owner_id` (uuid, FK `profiles.id`)
*   `content` (jsonb/text): Markdown content or structured blocks.
*   `created_at` (timestamptz)
*   `updated_at` (timestamptz)
*   `is_archived` (boolean)

#### Security (RLS)
*   **CRITICAL**: `owner_id = auth.uid()` for ALL operations (Select, Insert, Update, Delete).
*   **Constraint**: No one else, not even moderators, can read these rows.

---

### B. Shared Board (Curated Reality)

**Table: `board_items`**
*   `id` (uuid, PK)
*   `title` (text)
*   `content` (text)
*   `author_id` (uuid, FK `profiles.id`)
*   `status` (enum): `'pending'`, `'approved'`, `'archived'`
*   `position` (jsonb): `{x: number, y: number}` for whiteboard placement.
*   `type` (enum): `'idea'`, `'decision'`, `'constraint'`
*   `created_at` (timestamptz)

#### Security (RLS)
*   **Read**: Authenticated users can read items where `status = 'approved'` OR `author_id = auth.uid()` (to see own pending submissions).
*   **Insert**: Authenticated users can insert with `status = 'pending'`.
*   **Update**: 
    *   **Moderators**: Can update ANY item (approve, move, edit).
    *   **Authors**: Can update their own items IF `status = 'pending'`. Once approved, it's "Shared Reality" and locked? Or Author can still edit?
        *   *Decision*: Author can edit content. Moderator controls status/position.

---

### C. Execution Spine (Tasks)

**Table: `tasks`**
*   `id` (uuid, PK)
*   `title` (text)
*   `description` (text)
*   `status` (enum): `'todo'`, `'in_progress'`, `'done'`
*   `priority` (enum): `'low'`, `'medium'`, `'high'`
*   `assignee_id` (uuid, FK `profiles.id`) — The "Owner"
*   `creator_id` (uuid, FK `profiles.id`) — The "Moderator" (usually)
*   `origin_board_item_id` (uuid, FK `board_items.id`) — Traceability to decision.
*   `deadline` (date)
*   `attachment_url` (text)
*   `created_at` (timestamptz)

#### Security (RLS)
*   **Read**: Authenticated users can see all tasks (Transparency).
*   **Insert**: 
    *   **Moderators**: Can create tasks for ANYONE.
    *   **General**: Can create tasks for THEMSELVES (`assignee_id = auth.uid()`).
*   **Update**: 
    *   **Moderators**: Can update any task.
    *   **Assignees**: Can update `status` of their own tasks.

---

### D. Calendar

**Table: `calendar_events`**
*   `id` (uuid, PK)
*   `title` (text)
*   `start_time` (timestamptz)
*   `end_time` (timestamptz)
*   `type` (enum): `'meeting'`, `'deadline'`, `'reminder'`
*   `is_global` (boolean): Default `false`.
*   `owner_id` (uuid, FK `profiles.id`)

#### Security (RLS)
*   **Read**: 
    *   Show if `is_global = true`.
    *   Show if `owner_id = auth.uid()`.
*   **Insert**:
    *   **Moderators**: Can set `is_global = true`.
    *   **General**: Forced `is_global = false` (via Database Trigger or RLS check).
*   **Update/Delete**: 
    *   Moderators can manage Global events.
    *   Users manage their own events.

---

## 3. Realtime (Supabase)

Enable **Replication** on:
1.  `board_items`: To reflect whiteboard moves/additions instantly.
2.  `tasks`: For live status updates on the board widget.
3.  `calendar_events`: For live scheduling updates.

---

## 4. Storage

**Buckets**:
1.  `avatars`: Public.
2.  `attachments`: Restricted.
    *   Folder: `tasks/{task_id}/{file}`
    *   Policy: Read if you can read the task. Write if you can edit the task.

---

## 5. Edge Functions (Future Proofing)

*   `summarize-meeting`: (Halted for V1) - Would process transcripts.
*   `auto-archive`: Cron job to archive old `done` tasks.

## 6. Implementation Checklist

1.  [ ] Initialize Supabase project.
2.  [ ] Apply schema Migration (SQL).
3.  [ ] Enable RLS on all tables.
4.  [ ] Write Policies (Select/Insert/Update/Delete) for each table.
5.  [ ] Generate TypeScript types (`supabase gen types`).
6.  [ ] Replace mock `UserContext` with `SupabaseProvider`.

