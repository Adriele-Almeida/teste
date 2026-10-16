-- Tabelas exclusivas do aplicativo. Aplicar em projeto novo, uma vez.
create table public.ac_files(name text primary key,sha256 text not null,bytes bigint not null,records integer not null);
create table public.ac_records(id text primary key,file_name text references public.ac_files(name),ordinal integer not null,title text not null,created_at timestamptz,model text,roles text[],search_text text not null,raw jsonb not null);
create index ac_records_file on public.ac_records(file_name,ordinal);
create index ac_records_date on public.ac_records(created_at desc);
create table public.ac_auth(id integer primary key check(id=1),salt text,password_hash text,setup_hash text);
create table public.ac_sessions(token_hash text primary key,expires_at timestamptz not null);
create table public.ac_state(record_id text primary key references public.ac_records(id),favorite boolean not null default false,folder text not null default '',position integer not null default 0,updated_at timestamptz not null default now());
create table public.ac_attempts(ip_hash text primary key,attempts integer not null default 0,window_start timestamptz not null default now());
alter table public.ac_files enable row level security;
alter table public.ac_records enable row level security;
alter table public.ac_auth enable row level security;
alter table public.ac_sessions enable row level security;
alter table public.ac_state enable row level security;
alter table public.ac_attempts enable row level security;
revoke all on public.ac_files,public.ac_records,public.ac_auth,public.ac_sessions,public.ac_state,public.ac_attempts from anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('ac-originals','ac-originals',false,52428800);
-- Provisionar setup_hash com SHA-256 de um token aleatório privado, fora do código.
