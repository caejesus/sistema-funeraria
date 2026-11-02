-- ============================================================================
-- SEGURANÇA — FASE 2: FECHA O BANCO
-- Rodar SÓ depois que o site novo (login pelo Supabase Auth) estiver no ar
-- e o administrador já tiver entrado nele pelo menos uma vez.
--
-- Depois disto:
--  - quem não está logado só consegue: ver a lista de nomes da tela de login,
--    o acompanhamento e o convite (só os campos necessários, pelas funções),
--    deixar mensagem no convite e enviar a avaliação;
--  - as senhas antigas em texto puro são apagadas.
-- ============================================================================

-- 1) Tabelas internas: só para quem está logado ------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['app_settings', 'atendimentos', 'frota', 'ordens_servico', 'frota_saidas', 'push_inscricoes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_rw', t);
    execute format('drop policy if exists %I on public.%I', t || '_logado', t);
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_logado', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- 2) Colaboradores: logado só LÊ (sem a coluna de senha); criar/editar/excluir
--    é feito pela Edge Function "usuarios" (com a chave de serviço) ----------
alter table public.app_users enable row level security;
drop policy if exists app_users_rw on public.app_users;
drop policy if exists app_users_ler on public.app_users;
create policy app_users_ler on public.app_users for select to authenticated using (true);
revoke all on public.app_users from anon, authenticated;
grant select (id, name, login, role, funcoes, auth_id, created_at) on public.app_users to authenticated;

-- Apaga as senhas antigas de quem já tem acesso novo
update public.app_users set password = '' where auth_id is not null;

-- 3) Avaliações: a família só ENVIA; ler é só para logado ---------------------
alter table public.avaliacoes enable row level security;
drop policy if exists avaliacoes_rw on public.avaliacoes;
drop policy if exists avaliacoes_enviar on public.avaliacoes;
drop policy if exists avaliacoes_logado on public.avaliacoes;
create policy avaliacoes_enviar on public.avaliacoes for insert to anon, authenticated with check (true);
create policy avaliacoes_logado on public.avaliacoes for all to authenticated using (true) with check (true);
revoke all on public.avaliacoes from anon;
grant insert on public.avaliacoes to anon;

-- 4) Mensagens do convite: continua igual (qualquer um envia; ler só pela função
--    mensagens_do_convite com o código). Logado também pode ler direto.
drop policy if exists convite_mensagens_logado on public.convite_mensagens;
create policy convite_mensagens_logado on public.convite_mensagens for select to authenticated using (true);
grant select on public.convite_mensagens to authenticated;

-- 5) Fotos: qualquer um VÊ pelo link; enviar/trocar/apagar só logado ----------
drop policy if exists fotos_falecidos_ler on storage.objects;
drop policy if exists fotos_falecidos_enviar on storage.objects;
drop policy if exists fotos_falecidos_trocar on storage.objects;
drop policy if exists fotos_falecidos_apagar on storage.objects;
create policy fotos_falecidos_ler on storage.objects
  for select to authenticated using (bucket_id = 'fotos-falecidos');
create policy fotos_falecidos_enviar on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos-falecidos');
create policy fotos_falecidos_trocar on storage.objects
  for update to authenticated using (bucket_id = 'fotos-falecidos') with check (bucket_id = 'fotos-falecidos');
create policy fotos_falecidos_apagar on storage.objects
  for delete to authenticated using (bucket_id = 'fotos-falecidos');

notify pgrst, 'reload schema';
