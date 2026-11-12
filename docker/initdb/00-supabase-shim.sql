-- Giả lập phần tối thiểu của Supabase trên Postgres thường, CHỈ cho máy local và test.
--
-- Vì sao cần: migration của app (backend/migrations) viết cho Supabase nên tham chiếu auth.users,
-- auth.uid() và role authenticated. Supabase thật đã có sẵn những thứ này, Postgres thường thì không.
--
-- KHÔNG đưa file này vào backend/migrations và KHÔNG chạy trên Supabase thật: nó sẽ ghi đè hàm auth.uid()
-- của Supabase. docker-compose mount file này vào /docker-entrypoint-initdb.d (chạy một lần khi tạo volume),
-- test DB (K-02) nạp lại đúng file này.
--
-- Hành vi giống Supabase ở mức app cần: auth.uid() đọc claim `sub` từ request.jwt.claims,
-- mà backend đặt bằng set_config(..., true) trong từng transaction (CLAUDE.md quy tắc 1).

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- Bảng người dùng: chỉ các cột app dùng (profiles lấy tên và ảnh từ raw_user_meta_data).
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  banned_until       timestamptz,
  created_at         timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Giống Supabase: bảng tạo sau này trong public tự cấp quyền cho các role API (RLS mới là lớp chặn).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
