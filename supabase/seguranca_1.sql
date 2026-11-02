-- ============================================================================
-- SEGURANÇA — FASE 1 (não fecha nada ainda; o sistema atual continua funcionando)
-- Prepara o login pelo Supabase Auth e as funções que as páginas públicas usam.
-- Pode rodar mais de uma vez.
-- ============================================================================

-- Ligação de cada colaborador com a conta de login (Supabase Auth)
alter table public.app_users add column if not exists auth_id uuid unique;

-- Lista da tela de login (sem senha)
create or replace function public.usuarios_para_login()
returns table (login text, name text, role text)
language sql
security definer
set search_path = public
stable
as $$
  select u.login, u.name, u.role from public.app_users u order by u.name;
$$;
revoke all on function public.usuarios_para_login() from public;
grant execute on function public.usuarios_para_login() to anon, authenticated;

-- Copia só alguns campos de um jsonb
create or replace function public.jsonb_somente(dados jsonb, campos text[])
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from jsonb_each(coalesce(dados, '{}'::jsonb)) e
  where e.key = any(campos);
$$;

-- Página pública de acompanhamento da família (/acompanhamento/<id>)
create or replace function public.acompanhamento_publico(p_id text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'falecido', coalesce(a.dados->>'falecido', a.dados->'form'->>'falecido', a.falecido),
    'form', public.jsonb_somente(a.dados->'form', array['atendenteGeral', 'velorioTipo', 'tipoPlano', 'Remocao']),
    'operationalStages', coalesce(a.dados->'operationalStages', '{}'::jsonb),
    'avaliacao', (
      select json_build_object('id', v.id, 'media_geral', v.media_geral)
      from public.avaliacoes v
      where v.atendimento_id = a.record_id
      limit 1
    )
  )
  from public.atendimentos a
  where a.record_id = p_id
  limit 1;
$$;
revoke all on function public.acompanhamento_publico(text) from public;
grant execute on function public.acompanhamento_publico(text) to anon, authenticated;

-- Convite online (/convite/<token>) e prévia do WhatsApp
create or replace function public.convite_publico(p_token text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'record_id', a.record_id,
    'dados', json_build_object(
      'falecido', coalesce(a.dados->>'falecido', a.dados->'form'->>'falecido', a.falecido),
      'form', public.jsonb_somente(a.dados->'form', array[
        'falecido', 'fotoUrl', 'dataNascimento', 'dataFalecimento', 'mensagemFamilia', 'unidadeAtendimento',
        'velorioTipo', 'velorioUnidade', 'velorioSala', 'velorioEndereco', 'velorioNumero', 'velorioBairro',
        'velorioNomeLocal', 'cidadeDestino', 'dataInicioVelorio', 'dataAtendimento', 'horarioVelorio', 'inicioAs',
        'cemiterio', 'dataSaida', 'horaSaida', 'conviteToken'
      ])
    ),
    'cemiterioEndereco', (
      select split_part(item, '|', 2)
      from public.app_settings s, jsonb_array_elements_text(s.items) item
      where s.key = 'cemeteries'
        and split_part(item, '|', 1) = a.dados->'form'->>'cemiterio'
      limit 1
    )
  )
  from public.atendimentos a
  where length(coalesce(p_token, '')) >= 6
    and a.dados->'form'->>'conviteToken' = p_token
  limit 1;
$$;
revoke all on function public.convite_publico(text) from public;
grant execute on function public.convite_publico(text) to anon, authenticated;

notify pgrst, 'reload schema';
