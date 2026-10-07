create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

-- first user becomes admin
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  title text not null default 'WEBLOG''s',
  tagline text not null default 'community.hub @ 2026',
  bio text not null default 'Join our community. Pick a channel below and tap to connect.',
  avatar_url text,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admin update settings" on public.site_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.site_settings (id) values (1);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text not null,
  kind text not null default 'other',
  position int not null default 0,
  visible boolean not null default true,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.links to anon, authenticated;
grant insert, update, delete on public.links to authenticated;
grant all on public.links to service_role;
alter table public.links enable row level security;
create policy "public read visible" on public.links for select to anon, authenticated using (visible or public.has_role(auth.uid(),'admin'));
create policy "admin insert" on public.links for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update" on public.links for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete" on public.links for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.track_click(_link_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.links set clicks = clicks + 1 where id = _link_id and visible;
$$;
grant execute on function public.track_click(uuid) to anon, authenticated;

insert into public.links (title, description, url, kind, position) values
('WhatsApp Group','Chat with the community','https://chat.whatsapp.com/','whatsapp_group',1),
('WhatsApp Channel','Updates & announcements','https://whatsapp.com/channel/','whatsapp_channel',2),
('Telegram Group','Discuss & share','https://t.me/','telegram_group',3),
('Telegram Channel','News feed','https://t.me/','telegram_channel',4);