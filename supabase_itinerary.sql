-- 여행일정 저장소 (Supabase SQL Editor에 통째로 붙여넣고 Run)
-- 비밀번호는 기존 결과 페이지 비밀번호를 그대로 씁니다. 따로 바꿀 곳 없음.

create table if not exists public.itinerary (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.itinerary enable row level security;

-- 비밀번호 확인: 기존 list_responses 함수의 비밀번호 검사를 재사용
create or replace function public.check_admin(p_key text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.list_responses(p_key) limit 1;
  return true;
exception when others then
  return false;
end $$;

create or replace function public.get_itinerary()
returns jsonb language sql security definer set search_path = public as $$
  select data from itinerary where id = 'main';
$$;

create or replace function public.save_itinerary(p_key text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.check_admin(p_key) then raise exception 'unauthorized'; end if;
  insert into itinerary(id, data, updated_at) values ('main', p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end $$;

grant execute on function public.check_admin(text)          to anon;
grant execute on function public.get_itinerary()            to anon;
grant execute on function public.save_itinerary(text, jsonb) to anon;
