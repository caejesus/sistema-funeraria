-- ============================================================================
-- Passagem de plantão: avisos e tarefas que todos os atendentes veem no Início.
-- Qualquer pessoa logada cria, marca como feito e arquiva.
-- Excluir: só quem criou, o administrador e o supervisor.
-- Pode rodar mais de uma vez.
-- ============================================================================

create table if not exists public.plantao_itens (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  tipo             text not null default 'tarefa',   -- tarefa | aviso
  texto            text not null default '',
  urgente          boolean not null default false,
  atendimento_id   text not null default '',
  atendimento_nome text not null default '',
  criado_por       text not null default '',
  criado_auth      uuid default auth.uid(),
  feito            boolean not null default false,
  feito_por        text not null default '',
  feito_em         timestamptz,
  arquivado        boolean not null default false,
  arquivado_por    text not null default '',
  arquivado_em     timestamptz,
  editado_por      text not null default '',
  editado_em       timestamptz
);

alter table public.plantao_itens drop constraint if exists plantao_itens_valores;
alter table public.plantao_itens add constraint plantao_itens_valores
  check (tipo in ('tarefa', 'aviso') and char_length(texto) between 1 and 1000);

create index if not exists plantao_itens_criado_idx on public.plantao_itens (created_at desc);

-- Quem pode excluir: quem criou, ADM ou SUPERVISOR
create or replace function public.plantao_pode_excluir(p_criado_auth uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_criado_auth = auth.uid()
      or exists (
        select 1 from public.app_users u
        where u.auth_id = auth.uid() and upper(u.role) in ('ADM', 'SUPERVISOR')
      );
$$;
revoke all on function public.plantao_pode_excluir(uuid) from public, anon;
grant execute on function public.plantao_pode_excluir(uuid) to authenticated;

alter table public.plantao_itens enable row level security;
drop policy if exists plantao_ler on public.plantao_itens;
drop policy if exists plantao_criar on public.plantao_itens;
drop policy if exists plantao_mudar on public.plantao_itens;
drop policy if exists plantao_excluir on public.plantao_itens;
create policy plantao_ler on public.plantao_itens for select to authenticated using (true);
create policy plantao_criar on public.plantao_itens for insert to authenticated with check (criado_auth = auth.uid());
create policy plantao_mudar on public.plantao_itens for update to authenticated using (true) with check (true);
create policy plantao_excluir on public.plantao_itens for delete to authenticated using (public.plantao_pode_excluir(criado_auth));

-- Ninguém muda quem criou (senão daria pra "virar dono" e excluir)
create or replace function public.plantao_protege_autor()
returns trigger
language plpgsql
as $$
begin
  new.criado_auth := old.criado_auth;
  new.criado_por := old.criado_por;
  new.created_at := old.created_at;
  return new;
end;
$$;
drop trigger if exists plantao_protege_autor on public.plantao_itens;
create trigger plantao_protege_autor before update on public.plantao_itens
  for each row execute function public.plantao_protege_autor();

revoke all on public.plantao_itens from anon;
grant select, insert, update, delete on public.plantao_itens to authenticated;

-- Atualiza a lista na tela de todos na hora (realtime)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'plantao_itens'
  ) then
    alter publication supabase_realtime add table public.plantao_itens;
  end if;
end $$;
alter table public.plantao_itens replica identity full;

notify pgrst, 'reload schema';
