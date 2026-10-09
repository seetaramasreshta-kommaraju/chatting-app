-- Drop existing triggers and functions first
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user cascade;

-- Drop existing tables to ensure a clean slate (BE CAREFUL with this in production!)
drop table if exists public.message_receipts cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversation_members cascade;
drop table if exists public.conversations cascade;
drop table if exists public.profiles cascade;

-- Drop existing types
drop type if exists message_type cascade;
drop type if exists member_role cascade;
drop type if exists conversation_type cascade;

-- Enable the necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  phone_number text unique,
  avatar_url text,
  status_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Conversations Table
create type conversation_type as enum ('direct', 'group');

create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  type conversation_type not null,
  name text,
  description text,
  avatar_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Conversation Members Table
create type member_role as enum ('member', 'admin');

create table public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role member_role default 'member'::member_role not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (conversation_id, user_id)
);

-- Messages Table
create type message_type as enum ('text', 'image', 'file');

create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  type message_type default 'text'::message_type not null,
  content text,
  attachment_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone
);

-- Message Receipts Table
create table public.message_receipts (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  primary key (message_id, user_id)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- Conversation Members Policies
create policy "Users can view members of their conversations." on public.conversation_members
  for select using (
    conversation_id in (
      select conversation_id from public.conversation_members where user_id = auth.uid()
    )
  );

create policy "Users can join direct conversations." on public.conversation_members
  for insert with check (
    user_id = auth.uid() or
    exists (
      select 1 from public.conversations c 
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

create policy "Admins can add members to groups." on public.conversation_members
  for insert with check (
    exists (
      select 1 from public.conversation_members 
      where conversation_id = conversation_members.conversation_id 
      and user_id = auth.uid() 
      and role = 'admin'
    )
  );

-- Conversations Policies
create policy "Users can view their conversations." on public.conversations
  for select using (
    id in (
      select conversation_id from public.conversation_members where user_id = auth.uid()
    )
  );
create policy "Users can create conversations." on public.conversations
  for insert with check (auth.uid() = created_by);

-- Messages Policies
create policy "Users can view messages in their conversations." on public.messages
  for select using (
    conversation_id in (
      select conversation_id from public.conversation_members where user_id = auth.uid()
    )
  );
create policy "Users can insert messages in their conversations." on public.messages
  for insert with check (
    conversation_id in (
      select conversation_id from public.conversation_members where user_id = auth.uid()
    ) and auth.uid() = sender_id
  );
create policy "Users can update their own messages." on public.messages
  for update using (auth.uid() = sender_id);

-- Message Receipts Policies
create policy "Users can view receipts for messages in their conversations." on public.message_receipts
  for select using (
    message_id in (
      select m.id from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id
      where cm.user_id = auth.uid()
    )
  );
create policy "Users can insert/update their own receipts." on public.message_receipts
  for all using (auth.uid() = user_id);

-- Create function to handle new user signups
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, phone_number, display_name)
  values (new.id, new.phone, 'User ' || substr(new.id::text, 1, 6));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a storage bucket for avatars and attachments (ignore if exists)
insert into storage.buckets (id, name, public) 
values ('chat_assets', 'chat_assets', true)
on conflict (id) do nothing;

-- Drop old policies if they exist before creating new ones
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Users can update their own objects" on storage.objects;
drop policy if exists "Users can delete their own objects" on storage.objects;

-- Storage policies
create policy "Public Access" on storage.objects for select using ( bucket_id = 'chat_assets' );
create policy "Authenticated users can upload" on storage.objects for insert with check ( bucket_id = 'chat_assets' and auth.role() = 'authenticated' );
create policy "Users can update their own objects" on storage.objects for update using ( bucket_id = 'chat_assets' and auth.uid() = owner );
create policy "Users can delete their own objects" on storage.objects for delete using ( bucket_id = 'chat_assets' and auth.uid() = owner );
