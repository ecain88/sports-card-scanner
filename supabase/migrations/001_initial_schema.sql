-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Cards table
create table public.cards (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  player_name   text not null,
  year          text not null default '',
  brand         text not null default '',
  card_set      text not null default '',
  card_number   text not null default '',
  variation     text not null default '',
  sport         text not null default '',
  team          text not null default '',
  grade         text not null default 'Raw',
  search_query  text not null default '',
  image_url     text,
  avg_price     numeric(10,2) not null default 0,
  low_price     numeric(10,2) not null default 0,
  high_price    numeric(10,2) not null default 0,
  total_sales   integer not null default 0,
  sale_listings jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Row-level security: users can only see/edit their own cards
alter table public.cards enable row level security;

create policy "Users can view own cards"
  on public.cards for select
  using (auth.uid() = user_id);

create policy "Users can insert own cards"
  on public.cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cards"
  on public.cards for update
  using (auth.uid() = user_id);

create policy "Users can delete own cards"
  on public.cards for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_updated_at
  before update on public.cards
  for each row execute procedure public.handle_updated_at();

-- Storage bucket for card images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  5242880,  -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can read card images"
  on storage.objects for select
  using (bucket_id = 'card-images');

create policy "Authenticated users can upload card images"
  on storage.objects for insert
  with check (bucket_id = 'card-images' and auth.role() = 'authenticated');

create policy "Users can update own card images"
  on storage.objects for update
  using (bucket_id = 'card-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own card images"
  on storage.objects for delete
  using (bucket_id = 'card-images' and auth.uid()::text = (storage.foldername(name))[1]);
