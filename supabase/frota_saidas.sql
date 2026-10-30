-- ============================================================================
-- Saídas da frota (serviços avulsos dos motoristas)
-- Rodar no SQL Editor do Supabase. Pode rodar mais de uma vez sem problema.
-- ============================================================================

create table if not exists public.frota_saidas (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null,
                 -- buscar_flores | entrega_esquife | retirada_esquife | translado | avulsa
  status         text not null default 'aguardando',
                 -- aguardando | em_andamento | concluida | cancelada
  falecido       text not null default '',
  local_tipo     text not null default '',   -- PORTO | AEROPORTO | OUTRO
  local_ident    text not null default '',   -- nome do barco / lancha / voo
  destino        text not null default '',
  descricao      text not null default '',   -- motivo (saída avulsa) ou observação
  agendado_para  timestamptz,                -- null = "agora"
  criado_por     text not null default '',
  motorista      text not null default '',
  carro          text not null default '',
  km_saida       integer,
  km_retorno     integer,
  obs_retorno    text not null default '',
  iniciado_em    timestamptz,
  concluido_em   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint frota_saidas_km_ok check (km_retorno is null or km_saida is null or km_retorno >= km_saida)
);

create index if not exists frota_saidas_status_idx    on public.frota_saidas (status);
create index if not exists frota_saidas_carro_idx     on public.frota_saidas (carro);
create index if not exists frota_saidas_created_idx   on public.frota_saidas (created_at desc);
create index if not exists frota_saidas_agendado_idx  on public.frota_saidas (agendado_para);

-- Mesmo padrão de acesso das outras tabelas do sistema (login próprio via app_users)
alter table public.frota_saidas enable row level security;
drop policy if exists frota_saidas_rw on public.frota_saidas;
create policy frota_saidas_rw on public.frota_saidas
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.frota_saidas to anon, authenticated;

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'frota_saidas'
  ) then
    alter publication supabase_realtime add table public.frota_saidas;
  end if;
end $$;

-- Lista de destinos sugeridos (cresce sozinha conforme novos destinos são digitados)
insert into public.app_settings (key, items)
values ('destinos', '["AUTAZES","CAREIRO","CAREIRO DA VÁRZEA","MANACAPURU","IRANDUBA","ITACOATIARA","MANAQUIRI","PRESIDENTE FIGUEIREDO","RIO PRETO DA EVA","PARINTINS","TEFÉ","COARI"]'::jsonb)
on conflict (key) do nothing;
