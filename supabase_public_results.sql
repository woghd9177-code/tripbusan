-- 익명 결과 공개용 (Supabase SQL Editor에 붙여넣고 Run)
-- 이름을 뺀 응답 내용만 무작위 순서로 돌려줘서, 누가 어떤 답을 했는지 알 수 없습니다.
create or replace function public.get_public_results()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(answers - 'name' order by random()), '[]'::jsonb) from responses;
$$;
grant execute on function public.get_public_results() to anon;
