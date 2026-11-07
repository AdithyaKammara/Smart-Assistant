-- Phase 2 schema: per-user conversations, plus document chunks for RAG (phase 3).
-- Every table has row level security so users can only ever see their own data.

create extension if not exists vector;

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id text primary key, -- AI SDK UIMessage id
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  parts jsonb not null, -- UIMessage parts, stored as-is
  created_at timestamptz not null default now()
);

create index messages_thread_id_created_at_idx on public.messages (thread_id, created_at);
create index threads_user_id_updated_at_idx on public.threads (user_id, updated_at desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.document_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  embedding vector(1536) not null -- match your embedding model's dimensions
);

create index document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

create policy "own threads" on public.threads
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own messages" on public.messages
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own documents" on public.documents
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own chunks" on public.document_chunks
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Similarity search scoped to the calling user (RLS still applies: security invoker).
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (id bigint, document_id uuid, content text, similarity float)
language sql stable security invoker
set search_path = public
as $$
  select c.id, c.document_id, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
