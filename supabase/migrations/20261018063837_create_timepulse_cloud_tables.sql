-- TimePulse 云端数据结构
-- 与本地存储层（IndexedDB / SQLite，见 src/services/db）保持同构：
--   timers / todo_items → (id, data JSON, sort_order, updated_at) 集合
--   app_state           → 通用键值状态（如当前活动计时器）
--   custom_backgrounds  → 自定义背景图（含 base64 图片数据）
-- 全部表以 (user_id, ...) 复合主键归属登录用户，RLS 保证每个用户只能读写自己的行。
-- 本迁移幂等（create ... if not exists / drop policy if exists），可安全重复执行。

-- ==================== timers ====================
create table if not exists public.timers (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  sort_order integer     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

comment on table public.timers is '专注计时器；payload 与本地存储同构，云端作为多端同步镜像';

alter table public.timers enable row level security;
alter table public.timers force row level security;

drop policy if exists "timers_owner_all" on public.timers;
create policy "timers_owner_all"
  on public.timers
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ==================== todo_items ====================
create table if not exists public.todo_items (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  sort_order integer     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

comment on table public.todo_items is '今日待办事项；payload 与本地存储同构，云端作为多端同步镜像';

alter table public.todo_items enable row level security;
alter table public.todo_items force row level security;

drop policy if exists "todo_items_owner_all" on public.todo_items;
create policy "todo_items_owner_all"
  on public.todo_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ==================== app_state ====================
create table if not exists public.app_state (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

comment on table public.app_state is '通用键值状态（如活动计时器 ID）；value 为结构化 JSON';

alter table public.app_state enable row level security;
alter table public.app_state force row level security;

drop policy if exists "app_state_owner_all" on public.app_state;
create policy "app_state_owner_all"
  on public.app_state
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ==================== custom_backgrounds ====================
create table if not exists public.custom_backgrounds (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          text        not null,
  type        text        not null default 'file' check (type in ('file', 'url')),
  url         text        not null default '',
  mime_type   text        not null default 'application/octet-stream',
  size        bigint      not null default 0,
  width       integer     not null default 0,
  height      integer     not null default 0,
  name        text,
  uploaded_at timestamptz not null default now(),
  blob_base64 text,
  primary key (user_id, id)
);

comment on table public.custom_backgrounds is '自定义背景图；图片数据暂以 base64 存储，后续可迁移至 Storage 存储桶';

alter table public.custom_backgrounds enable row level security;
alter table public.custom_backgrounds force row level security;

drop policy if exists "custom_backgrounds_owner_all" on public.custom_backgrounds;
create policy "custom_backgrounds_owner_all"
  on public.custom_backgrounds
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
