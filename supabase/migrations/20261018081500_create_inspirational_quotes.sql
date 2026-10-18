-- TimePulse 灵感名言与励志金句库 (inspirational_quotes)
-- 用于客户端今日灵感展示与动态轮播，支持云端动态扩充、离线缓存与多维分类
-- 允许匿名/已登录用户公开只读访问激活状态名言

create table if not exists public.inspirational_quotes (
  id          uuid        primary key default gen_random_uuid(),
  text        text        not null unique check (length(trim(text)) > 0),
  author      text        not null default '',
  source      text        default '',
  category    text        default 'inspiration',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.inspirational_quotes is 'TimePulse 灵感金句与哲思名言库，供主页/治愈页面动态轮播';
comment on column public.inspirational_quotes.text is '名言正文内容';
comment on column public.inspirational_quotes.author is '名言作者/名人名家';
comment on column public.inspirational_quotes.source is '作品/出处/书籍/演讲名（可选）';
comment on column public.inspirational_quotes.category is '分类标签：inspiration/life/growth/wisdom/poetry';
comment on column public.inspirational_quotes.is_active is '是否启用展示';

-- 开启并强制 Row Level Security (RLS)
alter table public.inspirational_quotes enable row level security;
alter table public.inspirational_quotes force row level security;

-- 任何人（未登录匿名用户 anon 与已登录用户 authenticated）均可读取有效名言
drop policy if exists "inspirational_quotes_select_active" on public.inspirational_quotes;
create policy "inspirational_quotes_select_active"
  on public.inspirational_quotes
  for select
  to anon, authenticated
  using (is_active = true);

-- 授权 Data API 查询权限
grant select on public.inspirational_quotes to anon, authenticated;

-- 部分索引：加速读取激活状态的金句
create index if not exists idx_inspirational_quotes_active
  on public.inspirational_quotes (is_active, created_at desc)
  where is_active = true;

create index if not exists idx_inspirational_quotes_category
  on public.inspirational_quotes (category)
  where is_active = true;
