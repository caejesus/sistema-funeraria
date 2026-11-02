import { supabase } from "./supabaseClient";

// Login pelo Supabase Auth.
// Cada colaborador (tabela app_users) tem uma conta de login com e-mail interno.
// A senha digitada ganha um prefixo fixo antes de ir para o Auth (mesma regra da
// Edge Function "usuarios"), assim senhas curtas antigas continuam valendo.

export const COLUNAS_USUARIO = "id, name, login, role, funcoes, auth_id, created_at";
export const senhaAuth = (senha) => `sf#${senha}`;

const CHAVES_LOCAIS_ANTIGAS = ["sf_users_v3", "sf_session_v3", "sf_attendances_v1"];

export function limparDadosLocais() {
  CHAVES_LOCAIS_ANTIGAS.forEach((chave) => {
    try { localStorage.removeItem(chave); } catch { /* ignora */ }
  });
}

// Chama a Edge Function de usuários. Sempre devolve { ok, erro?, ... }
export async function chamarUsuarios(corpo) {
  const { data, error } = await supabase.functions.invoke("usuarios", { body: corpo });
  if (error) {
    console.error("Erro na função usuarios:", error);
    return { ok: false, erro: "Não foi possível falar com o servidor. Verifique a internet." };
  }
  return data || { ok: false, erro: "Resposta vazia do servidor." };
}

export async function entrar(login, senha) {
  const r = await chamarUsuarios({ acao: "entrar", login, senha });
  if (!r.ok) return r;
  const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: senhaAuth(senha) });
  if (error) return { ok: false, erro: "Usuário ou senha inválidos." };
  return { ok: true };
}

// Colaborador ligado à sessão atual (ou null)
export async function colaboradorLogado() {
  const { data } = await supabase.auth.getSession();
  const sessao = data?.session;
  if (!sessao) return null;
  const { data: colaborador, error } = await supabase
    .from("app_users")
    .select(COLUNAS_USUARIO)
    .eq("auth_id", sessao.user.id)
    .maybeSingle();
  if (error) console.error("Erro ao carregar colaborador:", error);
  return colaborador || null;
}

export async function sair() {
  limparDadosLocais();
  await supabase.auth.signOut();
}

export async function trocarMinhaSenha(senhaAtual, novaSenha) {
  const { data } = await supabase.auth.getSession();
  const email = data?.session?.user?.email;
  if (!email) return { ok: false, erro: "Sua sessão expirou. Entre novamente." };
  const conferir = await supabase.auth.signInWithPassword({ email, password: senhaAuth(senhaAtual) });
  if (conferir.error) return { ok: false, erro: "Senha atual incorreta." };
  const { error } = await supabase.auth.updateUser({ password: senhaAuth(novaSenha) });
  if (error) return { ok: false, erro: "Erro ao salvar. Tente novamente." };
  return { ok: true };
}
