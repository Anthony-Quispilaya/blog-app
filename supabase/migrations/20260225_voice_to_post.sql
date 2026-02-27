-- Voice-to-blog core schema

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_visibility') then
    create type public.post_visibility as enum ('public', 'private');
  end if;
end $$;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  raw_transcript text,
  audio_url text,
  visibility public.post_visibility not null default 'public',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_author_profile_fkey'
  ) then
    alter table public.posts
    add constraint posts_author_profile_fkey
    foreign key (author_id)
    references public.profiles(id)
    on delete cascade;
  end if;
end $$;

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- Profiles policies
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles
for select
using (true);

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- Posts policies
drop policy if exists "Public posts are readable by everyone" on public.posts;
create policy "Public posts are readable by everyone"
on public.posts
for select
using (
  (auth.role() = 'anon' and visibility = 'public')
  or (auth.role() = 'authenticated' and auth.uid() = author_id)
);

drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts"
on public.posts
for insert
with check (auth.uid() = author_id);

drop policy if exists "Users update own posts" on public.posts;
create policy "Users update own posts"
on public.posts
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts"
on public.posts
for delete
using (auth.uid() = author_id);

insert into storage.buckets (id, name, public)
values ('voice-audio', 'voice-audio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('transcripts', 'transcripts', false)
on conflict (id) do nothing;

drop policy if exists "Public read voice audio" on storage.objects;
create policy "Public read voice audio"
on storage.objects
for select
using (bucket_id = 'voice-audio');

drop policy if exists "Authenticated upload voice audio" on storage.objects;
create policy "Authenticated upload voice audio"
on storage.objects
for insert
with check (bucket_id = 'voice-audio' and auth.role() = 'authenticated');

drop policy if exists "Users read own transcripts" on storage.objects;
create policy "Users read own transcripts"
on storage.objects
for select
using (bucket_id = 'transcripts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users upload own transcripts" on storage.objects;
create policy "Users upload own transcripts"
on storage.objects
for insert
with check (
  bucket_id = 'transcripts'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);
