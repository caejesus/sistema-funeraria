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

alter table public.convite_mensagens enable row level security;
drop policy if exists convite_mensagens_rw on public.convite_mensagens;
create policy convite_mensagens_rw on public.convite_mensagens
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.convite_mensagens to anon, authenticated;

notify pgrst, 'reload schema';
