// Edge Function: usuarios
// Login e gestão de colaboradores com o Supabase Auth.
//   entrar  → devolve o e-mail interno do colaborador (e cria a conta de login no 1º acesso,
//             conferindo a senha antiga; ela é apagada da tabela na fase 2)
//   criar / alterar / excluir → só para ADM logado
// Publicar com "Verify JWT" DESLIGADO (a tela de login chama sem estar logada).
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente.

import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COLUNAS = "id, name, login, role, funcoes, auth_id, created_at";

// Mesmas regras do site (src/lib/auth.js)
const emailDe = (id: string) => `u${String(id).toLowerCase().replace(/[^a-z0-9]/g, "")}@usuarios.sistema-funeraria.app`;
const senhaAuth = (senha: string) => `sf#${senha}`;

function normalizeRole(role = "") {
  const r = String(role || "").toUpperCase().trim();
  if (r === "OPERADOR") return "ATENDENTE";
  if (r === "EQUIPE") return "MOTORISTA";
  return r || "ATENDENTE";
}

function resposta(corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { headers: { ...CORS, "Content-Type": "application/json" } });
}
const erro = (mensagem: string) => resposta({ ok: false, erro: mensagem });

async function esperar(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

// Quem está chamando (pelo token de login), com o cadastro de colaborador
async function quemChama(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: colaborador } = await admin.from("app_users").select(COLUNAS).eq("auth_id", data.user.id).maybeSingle();
  return colaborador;
}

async function acharContaPorEmail(email: string) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const achou = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (achou) return achou;
    if (data.users.length < 200) return null;
  }
  return null;
}

// Cria (ou reaproveita) a conta de login e liga ao colaborador
async function criarConta(colaborador: { id: string }, senha: string) {
  const email = emailDe(colaborador.id);
  let authId = "";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senhaAuth(senha),
    email_confirm: true,
    user_metadata: { app_user_id: colaborador.id },
  });
  if (data?.user) {
    authId = data.user.id;
  } else {
    const existente = await acharContaPorEmail(email);
    if (!existente) throw new Error(error?.message || "Não foi possível criar o acesso.");
    await admin.auth.admin.updateUserById(existente.id, { password: senhaAuth(senha) });
    authId = existente.id;
  }
  // A senha antiga só é apagada na FASE 2 (seguranca_2.sql), para dar pra voltar atrás se precisar.
  const { error: erroLigar } = await admin.from("app_users").update({ auth_id: authId }).eq("id", colaborador.id);
  if (erroLigar) throw new Error(erroLigar.message);
  return email;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro("Método não permitido.");

  let corpo: Record<string, any> = {};
  try {
    corpo = await req.json();
  } catch {
    return erro("Pedido inválido.");
  }
  const acao = String(corpo.acao || "");

  try {
    // ── Login ────────────────────────────────────────────────────────────────
    if (acao === "entrar") {
      const login = String(corpo.login || "").trim();
      const senha = String(corpo.senha || "");
      if (!login || !senha) return erro("Informe usuário e senha.");

      const { data: colaborador } = await admin.from("app_users").select("id, auth_id, password").eq("login", login).maybeSingle();
      if (!colaborador) {
        await esperar(800);
        return erro("Usuário ou senha inválidos.");
      }
      if (colaborador.auth_id) return resposta({ ok: true, email: emailDe(colaborador.id) });

      // 1º acesso depois da mudança: confere a senha antiga e cria a conta de login
      if (!colaborador.password || colaborador.password !== senha) {
        await esperar(800);
        return erro("Usuário ou senha inválidos.");
      }
      const email = await criarConta(colaborador, senha);
      return resposta({ ok: true, email });
    }

    // ── Daqui pra baixo, só ADM ─────────────────────────────────────────────
    const chamador = await quemChama(req);
    if (!chamador) return erro("Faça login novamente.");
    if (normalizeRole(chamador.role) !== "ADM") return erro("Só o administrador pode fazer isso.");

    if (acao === "criar") {
      const name = String(corpo.name || "").trim();
      const login = String(corpo.login || "").trim();
      const senha = String(corpo.senha || "");
      if (!name || !login || !senha) return erro("Preencha nome, login e senha.");
      if (senha.length < 4) return erro("A senha precisa ter pelo menos 4 caracteres.");
      const { data: jaExiste } = await admin.from("app_users").select("id").eq("login", login).maybeSingle();
      if (jaExiste) return erro("Esse login já existe.");

      const novo = {
        id: String(Date.now()),
        name,
        login,
        password: "",
        role: normalizeRole(corpo.role),
        funcoes: Array.isArray(corpo.funcoes) ? corpo.funcoes : [],
      };
      const { error } = await admin.from("app_users").insert([novo]);
      if (error) return erro(error.message);
      try {
        await criarConta(novo, senha);
      } catch (e) {
        await admin.from("app_users").delete().eq("id", novo.id);
        return erro(String((e as Error).message || e));
      }
      const { data: salvo } = await admin.from("app_users").select(COLUNAS).eq("id", novo.id).single();
      return resposta({ ok: true, usuario: salvo });
    }

    if (acao === "alterar") {
      const id = String(corpo.id || "");
      const { data: atual } = await admin.from("app_users").select("id, auth_id, login").eq("id", id).maybeSingle();
      if (!atual) return erro("Colaborador não encontrado.");

      const mudancas: Record<string, unknown> = {};
      if (corpo.name !== undefined) mudancas.name = String(corpo.name).trim();
      if (corpo.role !== undefined) mudancas.role = normalizeRole(corpo.role);
      if (corpo.funcoes !== undefined) mudancas.funcoes = Array.isArray(corpo.funcoes) ? corpo.funcoes : [];
      if (Object.keys(mudancas).length) {
        const { error } = await admin.from("app_users").update(mudancas).eq("id", id);
        if (error) return erro(error.message);
      }

      const senha = String(corpo.senha || "");
      if (senha) {
        if (senha.length < 4) return erro("A senha precisa ter pelo menos 4 caracteres.");
        if (atual.auth_id) {
          const { error } = await admin.auth.admin.updateUserById(atual.auth_id, { password: senhaAuth(senha) });
          if (error) return erro(error.message);
          await admin.from("app_users").update({ password: "" }).eq("id", id);
        } else {
          await criarConta(atual, senha);
        }
      }
      const { data: salvo } = await admin.from("app_users").select(COLUNAS).eq("id", id).single();
      return resposta({ ok: true, usuario: salvo });
    }

    if (acao === "excluir") {
      const id = String(corpo.id || "");
      const { data: atual } = await admin.from("app_users").select("id, auth_id, login").eq("id", id).maybeSingle();
      if (!atual) return erro("Colaborador não encontrado.");
      if (atual.login === "admin") return erro("O admin padrão não pode ser removido.");
      if (atual.auth_id && atual.auth_id === chamador.auth_id) return erro("Você não pode remover o seu próprio acesso.");
      if (atual.auth_id) await admin.auth.admin.deleteUser(atual.auth_id);
      const { error } = await admin.from("app_users").delete().eq("id", id);
      if (error) return erro(error.message);
      return resposta({ ok: true });
    }

    return erro("Ação desconhecida.");
  } catch (e) {
    console.error(e);
    return erro("Erro no servidor. Tente novamente.");
  }
});
