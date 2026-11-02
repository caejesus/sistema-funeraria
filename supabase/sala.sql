-- ============================================================================
-- Tablets na porta das salas de velório (/sala/<unidade>/<sala>?k=<chave>)
--  - mostra o velório que está na sala (ou a tela de sala livre);
--  - recebe mensagens para a família (quando o convite foi autorizado);
--  - recebe pedidos de informação ("Interessados").
-- Pode rodar mais de uma vez.
-- ============================================================================

-- Pedidos de informação (tablet da sala, e no futuro outros lugares)
create table if not exists public.interessados (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  nome         text not null default '',
  contato      text not null default '',
  assunto      text not null default '',
  unidade      text not null default '',
  sala         text not null default '',
  origem       text not null default 'tablet',
  atendido     boolean not null default false,
  atendido_por text not null default '',
  atendido_em  timestamptz
);
alter table public.interessados drop constraint if exists interessados_tamanho;
alter table public.interessados add constraint interessados_tamanho
  check (char_length(nome) <= 120 and char_length(contato) <= 60 and char_length(assunto) <= 120);
create index if not exists interessados_criado_idx on public.interessados (created_at desc);

alter table public.interessados enable row level security;
drop policy if exists interessados_logado on public.interessados;
create policy interessados_logado on public.interessados for all to authenticated using (true) with check (true);
revoke all on public.interessados from anon;
grant select, insert, update, delete on public.interessados to authenticated;

-- Chave dos tablets (só o administrador vê, nas Configurações)
insert into public.app_settings (key, items)
values ('tablet_chave', jsonb_build_array(substr(md5(random()::text || clock_timestamp()::text), 1, 16)))
on conflict (key) do nothing;

create or replace function public.tablet_chave_ok(p_chave text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select length(coalesce(p_chave, '')) >= 12
     and exists (select 1 from public.app_settings where key = 'tablet_chave' and items->>0 = p_chave);
$$;
revoke all on function public.tablet_chave_ok(text) from public, anon, authenticated;

-- Velório que está na sala agora (uso interno).
-- Ocupada: velório na funerária, não concluído, criado nos últimos 5 dias e
-- ainda antes de 15 minutos depois da saída (ou sem data de saída).
create or replace function public.sala_atendimento_atual(p_unidade text, p_sala text)
returns public.atendimentos
language sql
security definer
set search_path = public
stable
as $$
  select a.*
  from public.atendimentos a
  where coalesce(nullif(a.dados->'form'->>'velorioTipo', ''), 'funeraria') = 'funeraria'
    and a.dados->'form'->>'velorioUnidade' = p_unidade
    and a.dados->'form'->>'velorioSala' = p_sala
    and coalesce(a.status, '') <> 'Concluído'
    and coalesce(a.dados->>'status', '') <> 'Concluído'
    and coalesce(a.created_at, now()) > now() - interval '5 days'
    and (
      coalesce(a.dados->'form'->>'dataSaida', '') !~ '^\d{4}-\d{2}-\d{2}$'
      or (
        (a.dados->'form'->>'dataSaida')::date
        + coalesce(nullif(substring(coalesce(a.dados->'form'->>'horaSaida', '') from '^\d{2}:\d{2}'), ''), '23:59')::time
        + interval '15 minutes'
      ) >= (now() at time zone 'America/Manaus')
    )
  order by a.created_at desc
  limit 1;
$$;
revoke all on function public.sala_atendimento_atual(text, text) from public, anon, authenticated;

-- O que o tablet mostra
create or replace function public.sala_publica(p_chave text, p_unidade text, p_sala text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.atendimentos;
begin
  if not public.tablet_chave_ok(p_chave) then
    perform pg_sleep(1);
    return json_build_object('ok', false);
  end if;
  a := public.sala_atendimento_atual(p_unidade, p_sala);
  if a.record_id is null then
    return json_build_object('ok', true, 'ocupada', false);
  end if;
  return json_build_object(
    'ok', true,
    'ocupada', true,
    'falecido', coalesce(a.dados->>'falecido', a.dados->'form'->>'falecido', a.falecido),
    'aceitaMensagens', coalesce(a.dados->'form'->>'conviteToken', '') <> '',
    'form', public.jsonb_somente(a.dados->'form', array[
      'fotoUrl', 'dataNascimento', 'dataFalecimento', 'mensagemFamilia',
      'dataInicioVelorio', 'horarioVelorio', 'inicioAs', 'dataSaida', 'horaSaida', 'cemiterio'
    ])
  );
end;
$$;
revoke all on function public.sala_publica(text, text, text) from public;
grant execute on function public.sala_publica(text, text, text) to anon, authenticated;

-- Mensagem deixada no tablet (vai para as mensagens do convite da família)
create or replace function public.sala_mensagem(
  p_chave text, p_unidade text, p_sala text,
  p_nome text, p_contato text, p_relacao text, p_mensagem text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.atendimentos;
begin
  if not public.tablet_chave_ok(p_chave) then
    perform pg_sleep(1);
    return json_build_object('ok', false, 'erro', 'Tablet não autorizado.');
  end if;
  a := public.sala_atendimento_atual(p_unidade, p_sala);
  if a.record_id is null or coalesce(a.dados->'form'->>'conviteToken', '') = '' then
    return json_build_object('ok', false, 'erro', 'Não é possível deixar mensagem nesta sala agora.');
  end if;
  if length(trim(coalesce(p_nome, ''))) = 0 or length(trim(coalesce(p_contato, ''))) = 0 or length(trim(coalesce(p_mensagem, ''))) = 0 then
    return json_build_object('ok', false, 'erro', 'Preencha nome, contato e mensagem.');
  end if;
  insert into public.convite_mensagens (atendimento_id, convite_token, nome, contato, relacao, mensagem)
  values (
    a.record_id, a.dados->'form'->>'conviteToken',
    left(trim(p_nome), 120), left(trim(p_contato), 60), left(trim(coalesce(p_relacao, '')), 60), left(trim(p_mensagem), 2000)
  );
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.sala_mensagem(text, text, text, text, text, text, text) from public;
grant execute on function public.sala_mensagem(text, text, text, text, text, text, text) to anon, authenticated;

-- Pedido de informação deixado no tablet
create or replace function public.sala_interesse(
  p_chave text, p_unidade text, p_sala text,
  p_nome text, p_contato text, p_assunto text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.tablet_chave_ok(p_chave) then
    perform pg_sleep(1);
    return json_build_object('ok', false, 'erro', 'Tablet não autorizado.');
  end if;
  if length(trim(coalesce(p_nome, ''))) = 0 or length(regexp_replace(coalesce(p_contato, ''), '\D', '', 'g')) < 10 then
    return json_build_object('ok', false, 'erro', 'Preencha seu nome e um WhatsApp com DDD.');
  end if;
  insert into public.interessados (nome, contato, assunto, unidade, sala, origem)
  values (left(trim(p_nome), 120), left(trim(p_contato), 60), left(trim(coalesce(p_assunto, '')), 120),
          left(coalesce(p_unidade, ''), 80), left(coalesce(p_sala, ''), 80), 'tablet');
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.sala_interesse(text, text, text, text, text, text) from public;
grant execute on function public.sala_interesse(text, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
