-- Run this in your Supabase SQL editor

-- Projects (session_id isolates per-visitor data)
create table if not exists sb_projects (
  id          bigint generated always as identity primary key,
  session_id  text not null,
  name        text not null,
  project_type text not null default 'essay',
  created_at  timestamptz default now()
);

-- Fragments
create table if not exists sb_fragments (
  id          bigint generated always as identity primary key,
  project_id  bigint references sb_projects(id) on delete cascade,
  text        text not null,
  url         text,
  pos_x       real not null default 100,
  pos_y       real not null default 100,
  created_at  timestamptz default now()
);

-- Connections
create table if not exists sb_connections (
  id          bigint generated always as identity primary key,
  project_id  bigint references sb_projects(id) on delete cascade,
  from_id     bigint references sb_fragments(id) on delete cascade,
  to_id       bigint references sb_fragments(id) on delete cascade,
  label       text not null,
  source      text not null default 'user',
  status      text not null default 'pending',
  created_at  timestamptz default now()
);

-- Outline ordering (joins to fragments for text/url)
create table if not exists sb_outline_order (
  id          bigint generated always as identity primary key,
  project_id  bigint references sb_projects(id) on delete cascade,
  fragment_id bigint references sb_fragments(id) on delete cascade,
  position    integer not null,
  unique(project_id, fragment_id)
);

-- Preferences (also session-scoped)
create table if not exists sb_preferences (
  id               bigint generated always as identity primary key,
  session_id       text not null,
  from_text        text not null,
  to_text          text not null,
  original_label   text not null,
  corrected_label  text,
  created_at       timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_sb_projects_session    on sb_projects(session_id);
create index if not exists idx_sb_fragments_project   on sb_fragments(project_id);
create index if not exists idx_sb_connections_project on sb_connections(project_id);
create index if not exists idx_sb_outline_project     on sb_outline_order(project_id);
create index if not exists idx_sb_preferences_session on sb_preferences(session_id);
