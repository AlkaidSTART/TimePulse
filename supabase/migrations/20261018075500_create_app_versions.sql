-- TimePulse 版本管理与更新检测表
-- 用于存储各发布版本信息，客户端通过查询该表检查最新版本，并提醒用户升级。
-- 下载地址默认或配置为 GitHub Releases: https://github.com/AlkaidSTART/TimePulse/releases

create table if not exists public.app_versions (
  id             uuid        primary key default gen_random_uuid(),
  version        text        not null unique,
  title          text        not null default '',
  release_notes  text        default '',
  download_url   text        not null default 'https://github.com/AlkaidSTART/TimePulse/releases',
  is_latest      boolean     not null default true,
  min_version    text,
  force_update   boolean     not null default false,
  published_at   timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

comment on table public.app_versions is 'TimePulse 发布版本信息库，用于客户端自检与更新提醒';

-- 开启并强制 Row Level Security
alter table public.app_versions enable row level security;
alter table public.app_versions force row level security;

-- 任何人（未登录匿名用户 anon 与已登录用户 authenticated）均可读取版本信息
drop policy if exists "app_versions_select_all" on public.app_versions;
create policy "app_versions_select_all"
  on public.app_versions
  for select
  to anon, authenticated
  using (true);

-- 索引以保证高频查询性能
create index if not exists idx_app_versions_published_at
  on public.app_versions (published_at desc);

create index if not exists idx_app_versions_is_latest
  on public.app_versions (is_latest)
  where is_latest = true;

-- 将当前版本（0.7.0）落库
insert into public.app_versions (
  version,
  title,
  release_notes,
  download_url,
  is_latest,
  published_at
)
values (
  '0.7.0',
  'TimePulse 0.7.0',
  '全新版本发布：支持云端多端同步、账号体系升级、体验与性能优化。',
  'https://github.com/AlkaidSTART/TimePulse/releases',
  true,
  now()
)
on conflict (version) do update set
  title = excluded.title,
  release_notes = excluded.release_notes,
  download_url = excluded.download_url,
  is_latest = excluded.is_latest,
  published_at = excluded.published_at;
