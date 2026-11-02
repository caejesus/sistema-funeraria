-- ============================================================================
-- Links da família protegidos por código:
--   /acompanhamento/<familiaToken>  e  /avaliacao/<familiaToken>
-- O código é o mesmo das mensagens (form.codigoMensagens, 6 números).
-- O token é aleatório (form.familiaToken), não dá pra adivinhar.
-- Pode rodar mais de uma vez.
-- ============================================================================

-- O acompanhamento antigo (pelo número do atendimento, sem código) deixa de existir
drop function if exists public.acompanhamento_publico(text);

-- Acha o atendimento pelo token + código (uso interno das funções abaixo)
create or replace function public.familia_atendimento(p_token text, p_codigo text)
returns public.atendimentos
language sql
security definer
set search_path = public
stable
as $$
  select a.*
  from public.atendimentos a
  where length(coalesce(p_token, '')) >= 8
    and length(coalesce(p_codigo, '')) = 6
    and a.dados->'form'->>'familiaToken' = p_token
    and a.dados->'form'->>'codigoMensagens' = p_codigo
  limit 1;
$$;
revoke all on function public.familia_atendimento(text, text) from public, anon, authenticated;

-- Etapas do atendimento (página de acompanhamento)
create or replace function public.acompanhamento_publico(p_token text, p_codigo text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.atendimentos;
begin
  a := public.familia_atendimento(p_token, p_codigo);
  if a.record_id is null then
    perform pg_sleep(1); -- atrasa quem tenta adivinhar o código
    return json_build_object('ok', false);
  end if;
  return json_build_object(
    'ok', true,
    'falecido', coalesce(a.dados->>'falecido', a.dados->'form'->>'falecido', a.falecido),
    'form', public.jsonb_somente(a.dados->'form', array['velorioTipo', 'tipoPlano']),
    'operationalStages', coalesce(a.dados->'operationalStages', '{}'::jsonb)
  );
end;
$$;
revoke all on function public.acompanhamento_publico(text, text) from public;
grant execute on function public.acompanhamento_publico(text, text) to anon, authenticated;

-- Dados da página de avaliação
create or replace function public.avaliacao_publica(p_token text, p_codigo text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.atendimentos;
  v public.avaliacoes;
begin
  a := public.familia_atendimento(p_token, p_codigo);
  if a.record_id is null then
    perform pg_sleep(1);
    return json_build_object('ok', false);
  end if;
  select * into v from public.avaliacoes where atendimento_id = a.record_id limit 1;
  return json_build_object(
    'ok', true,
    'falecido', coalesce(a.dados->>'falecido', a.dados->'form'->>'falecido', a.falecido),
    'form', public.jsonb_somente(a.dados->'form', array['atendenteGeral', 'velorioTipo', 'tipoPlano', 'Remocao']),
    'operationalStages', json_build_object('remocao', json_build_object('driver', a.dados->'operationalStages'->'remocao'->>'driver')),
    'avaliacao', case when v.id is null then null else json_build_object('media_geral', v.media_geral) end
  );
end;
$$;
revoke all on function public.avaliacao_publica(text, text) from public;
grant execute on function public.avaliacao_publica(text, text) to anon, authenticated;

-- Envia a avaliação (uma por atendimento). Nome do falecido, atendente e
-- motorista vêm do próprio atendimento, não do celular de quem avalia.
create or replace function public.enviar_avaliacao(p_token text, p_codigo text, p_dados jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.atendimentos;
  nota_ok constant int[] := array[1, 2, 3, 4, 5];
  n1 int := nullif(p_dados->>'nota_atendimento', '')::int;
  n2 int := nullif(p_dados->>'nota_velorio', '')::int;
  n3 int := nullif(p_dados->>'nota_remocao', '')::int;
  n4 int := nullif(p_dados->>'nota_encerramento', '')::int;
  media numeric;
begin
  a := public.familia_atendimento(p_token, p_codigo);
  if a.record_id is null then
    perform pg_sleep(1);
    return json_build_object('ok', false, 'erro', 'Código de acesso incorreto.');
  end if;
  if exists (select 1 from public.avaliacoes where atendimento_id = a.record_id) then
    return json_build_object('ok', false, 'erro', 'Este atendimento já foi avaliado. Obrigado!');
  end if;
  if n1 is null or not (n1 = any(nota_ok)) or n3 is null or not (n3 = any(nota_ok)) or n4 is null or not (n4 = any(nota_ok))
     or (n2 is not null and not (n2 = any(nota_ok))) then
    return json_build_object('ok', false, 'erro', 'Responda todas as perguntas obrigatórias.');
  end if;
  media := round((n1 + n3 + n4 + coalesce(n2, 0))::numeric / (3 + case when n2 is null then 0 else 1 end), 1);

  insert into public.avaliacoes (
    atendimento_id, falecido, atendente, motorista_remocao,
    nota_atendimento, nota_velorio, nota_remocao, nota_encerramento,
    comentario_atendimento, comentario_velorio, comentario_remocao, comentario_encerramento,
    media_geral, conhecia_grupo, primeira_vez, experiencia_primeira_vez
  ) values (
    a.record_id,
    coalesce(a.dados->>'falecido', a.dados->'form'->>'falecido', a.falecido, ''),
    nullif(a.dados->'form'->>'atendenteGeral', ''),
    nullif(coalesce(a.dados->'operationalStages'->'remocao'->>'driver', a.dados->'form'->>'Remocao'), ''),
    n1, n2, n3, n4,
    left(nullif(p_dados->>'comentario_atendimento', ''), 2000),
    left(nullif(p_dados->>'comentario_velorio', ''), 2000),
    left(nullif(p_dados->>'comentario_remocao', ''), 2000),
    left(nullif(p_dados->>'comentario_encerramento', ''), 2000),
    media,
    case when p_dados->>'conhecia_grupo' in ('ja_conhecia', 'anuncios', 'indicacao') then p_dados->>'conhecia_grupo' end,
    case when p_dados->>'primeira_vez' in ('true', 'false') then (p_dados->>'primeira_vez')::boolean end,
    left(nullif(p_dados->>'experiencia_primeira_vez', ''), 2000)
  );
  return json_build_object('ok', true, 'media', media);
exception
  when unique_violation then
    return json_build_object('ok', false, 'erro', 'Este atendimento já foi avaliado. Obrigado!');
  when others then
    return json_build_object('ok', false, 'erro', 'Não foi possível enviar. Tente novamente.');
end;
$$;
revoke all on function public.enviar_avaliacao(text, text, jsonb) from public;
grant execute on function public.enviar_avaliacao(text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
