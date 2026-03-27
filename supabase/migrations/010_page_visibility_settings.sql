-- Page visibility settings (prod/dev per route)
create table if not exists sayfa_gorunurluk (
  id uuid primary key default gen_random_uuid(),
  page_key text unique not null,
  stage text not null check (stage in ('all', 'admin_only')),
  updated_at timestamptz not null default now()
);

-- Backward compatibility for old values
update sayfa_gorunurluk set stage = 'all' where stage = 'prod';
update sayfa_gorunurluk set stage = 'admin_only' where stage = 'dev';

create or replace function set_sayfa_gorunurluk_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sayfa_gorunurluk_updated_at on sayfa_gorunurluk;
create trigger trg_sayfa_gorunurluk_updated_at
before update on sayfa_gorunurluk
for each row execute function set_sayfa_gorunurluk_updated_at();

-- permissive policies (project currently uses equal-access model)
alter table sayfa_gorunurluk enable row level security;
drop policy if exists "sayfa_gorunurluk_select" on sayfa_gorunurluk;
drop policy if exists "sayfa_gorunurluk_ins" on sayfa_gorunurluk;
drop policy if exists "sayfa_gorunurluk_upd" on sayfa_gorunurluk;

create policy "sayfa_gorunurluk_select" on sayfa_gorunurluk
for select using (true);
create policy "sayfa_gorunurluk_ins" on sayfa_gorunurluk
for insert with check (true);
create policy "sayfa_gorunurluk_upd" on sayfa_gorunurluk
for update using (true) with check (true);
