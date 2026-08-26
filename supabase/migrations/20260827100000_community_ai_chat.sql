create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  sender_type text not null check (sender_type in ('user','ai','system')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages(room_id, created_at);

insert into public.chat_rooms (slug, name, description)
values ('community', 'Community Chat', 'Optional user community chat with an AI assistant.')
on conflict (slug) do nothing;

alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_rooms_select_active on public.chat_rooms;
create policy chat_rooms_select_active
on public.chat_rooms for select to authenticated
using (is_active = true);

drop policy if exists chat_members_select_own on public.chat_room_members;
create policy chat_members_select_own
on public.chat_room_members for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists chat_members_insert_own on public.chat_room_members;
create policy chat_members_insert_own
on public.chat_room_members for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists chat_members_delete_own on public.chat_room_members;
create policy chat_members_delete_own
on public.chat_room_members for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists chat_messages_select_member on public.chat_messages;
create policy chat_messages_select_member
on public.chat_messages for select to authenticated
using (exists (
  select 1 from public.chat_room_members m
  where m.room_id = chat_messages.room_id
    and m.user_id = (select auth.uid())
));

drop policy if exists chat_messages_insert_own on public.chat_messages;
create policy chat_messages_insert_own
on public.chat_messages for insert to authenticated
with check (
  user_id = (select auth.uid())
  and sender_type = 'user'
  and exists (
    select 1 from public.chat_room_members m
    where m.room_id = chat_messages.room_id
      and m.user_id = (select auth.uid())
  )
);

-- Realtime is used only after the user explicitly joins the room.
alter table public.chat_messages replica identity full;
