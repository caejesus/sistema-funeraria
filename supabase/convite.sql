-- ============================================================================
-- Convite online: mensagens de condolências deixadas pelos visitantes.
-- Rodar no SQL Editor. Pode rodar mais de uma vez sem problema.
-- ============================================================================

create table if not exists public.convite_mensagens (
  id              uuid primary key default gen_random_uuid(),
  atendimento_id  text not null,
  convite_token   text not null default '',
  nome            text not null default '',
  contato         text not null default '',
  relacao         text not null default '',
  mensagem        text not null default '',
  created_at      timestamptz not null default now()
);

alter table public.convite_mensagens add column if not exists contato text not null default '';
alter table public.convite_mensagens add column if not exists relacao text not null default '';

alter table public.convite_mensagens drop constraint if exists convite_mensagens_tamanho;
alter table public.convite_mensagens add constraint convite_mensagens_tamanho
  check (char_length(nome) <= 120 and char_length(contato) <= 60 and char_length(relacao) <= 60 and char_length(mensagem) <= 2000);

create index if not exists convite_mensagens_atendimento_idx on public.convite_mensagens (atendimento_id, created_at);

-- Acesso: qualquer um pode DEIXAR mensagem; LER só pela função abaixo, com o código de acesso.
alter table public.convite_mensagens enable row level security;
drop policy if exists convite_mensagens_rw on public.convite_mensagens;
drop policy if exists convite_mensagens_insert on public.convite_mensagens;
create policy convite_mensagens_insert on public.convite_mensagens
  for insert to anon, authenticated with check (true);
revoke all on public.convite_mensagens from anon, authenticated;
grant insert on public.convite_mensagens to anon, authenticated;

-- Leitura das mensagens com o código de acesso do falecido
create or replace function public.mensagens_do_convite(p_token text, p_codigo text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id text;
  v_falecido  text;
begin
  select a.record_id, coalesce(a.dados->>'falecido', a.dados->'form'->>'falecido', a.falecido)
    into v_record_id, v_falecido
  from public.atendimentos a
  where a.dados->'form'->>'conviteToken' = p_token
    and coalesce(a.dados->'form'->>'codigoMensagens', '') <> ''
    and a.dados->'form'->>'codigoMensagens' = p_codigo
  limit 1;

  if v_record_id is null then
    perform pg_sleep(1); -- atrasa tentativas de adivinhar o código
    return json_build_object('ok', false);
  end if;

  return json_build_object(
    'ok', true,
    'falecido', v_falecido,
    'mensagens', coalesce((
      select json_agg(json_build_object(
        'id', m.id, 'nome', m.nome, 'contato', m.contato, 'relacao', m.relacao,
        'mensagem', m.mensagem, 'created_at', m.created_at
      ) order by m.created_at)
      from public.convite_mensagens m
      where m.atendimento_id = v_record_id
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.mensagens_do_convite(text, text) from public;
grant execute on function public.mensagens_do_convite(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
