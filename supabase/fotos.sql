-- ============================================================================
-- Fotos dos falecidos (convite online, card e prévia do WhatsApp).
-- Cria a pasta pública "fotos-falecidos" no Storage. Pode rodar mais de uma vez.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-falecidos', 'fotos-falecidos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- O sistema usa a chave pública (anon), então ela pode enviar, trocar e apagar fotos nesta pasta.
drop policy if exists fotos_falecidos_ler on storage.objects;
drop policy if exists fotos_falecidos_enviar on storage.objects;
drop policy if exists fotos_falecidos_trocar on storage.objects;
drop policy if exists fotos_falecidos_apagar on storage.objects;

create policy fotos_falecidos_ler on storage.objects
  for select to anon, authenticated using (bucket_id = 'fotos-falecidos');
create policy fotos_falecidos_enviar on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'fotos-falecidos');
create policy fotos_falecidos_trocar on storage.objects
  for update to anon, authenticated using (bucket_id = 'fotos-falecidos') with check (bucket_id = 'fotos-falecidos');
create policy fotos_falecidos_apagar on storage.objects
  for delete to anon, authenticated using (bucket_id = 'fotos-falecidos');
