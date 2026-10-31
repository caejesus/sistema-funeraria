-- ============================================================================
-- Notificações push — rodar no SQL Editor DEPOIS de publicar a função
-- "notificar-saidas". Pode rodar mais de uma vez sem problema.
-- ============================================================================

-- Celulares/navegadores inscritos para receber notificações
create table if not exists public.push_inscricoes (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null default '',
  auth        text not null default '',
  usuario     text not null default '',
  perfil      text not null default '',
  user_agent  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.push_inscricoes enable row level security;
drop policy if exists push_inscricoes_rw on public.push_inscricoes;
create policy push_inscricoes_rw on public.push_inscricoes
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.push_inscricoes to anon, authenticated;

-- Controle do que já foi notificado em cada saída
alter table public.frota_saidas add column if not exists push_novo_enviado  boolean not null default false;
alter table public.frota_saidas add column if not exists push_aviso_enviado boolean not null default false;

-- Saídas que já existiam não disparam aviso de "novo serviço"
update public.frota_saidas set push_novo_enviado = true where created_at < now() - interval '5 minutes';

-- Agendador: chama a função a cada minuto
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'notificar-saidas') then
    perform cron.unschedule('notificar-saidas');
  end if;
end $$;

select cron.schedule(
  'notificar-saidas',
  '* * * * *',
  $cron$
    select net.http_post(
      url     := 'https://glkswswhqqizcefxtrqj.supabase.co/functions/v1/notificar-saidas',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := '{}'::jsonb
    );
  $cron$
);

notify pgrst, 'reload schema';
