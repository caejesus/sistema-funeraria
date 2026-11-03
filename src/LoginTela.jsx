import React, { useEffect, useState } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./App.css";
import { supabase } from "./lib/supabaseClient";
import { entrar } from "./lib/auth";
import { getRoleUiLabel } from "./utils/attendance";
import { getThemeVars } from "./styles/appStyles";
import { useAgora } from "./hooks/useAgora";

const FUSO = "America/Manaus";

function lerTema() {
  try { return JSON.parse(localStorage.getItem("sf_theme_v1") || '"dark"') === "light" ? "light" : "dark"; } catch { return "dark"; }
}

// ─── Tela de login ────────────────────────────────────────────────────────────

export default function LoginTela({ onEntrou }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase.rpc("usuarios_para_login").then(({ data, error }) => {
      if (!vivo) return;
      if (error) {
        console.error("Erro ao carregar usuários:", error);
        setLoginError("Não foi possível carregar a lista de usuários. Verifique a internet.");
      }
      setUsuarios(data || []);
      setCarregandoLista(false);
    });
    return () => { vivo = false; };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    if (!login || !password) { setLoginError("Escolha o usuário e digite a senha."); return; }
    setEntrando(true);
    setLoginError("");
    const r = await entrar(login, password);
    if (!r.ok) {
      setEntrando(false);
      setLoginError(r.erro || "Usuário ou senha inválidos.");
      return;
    }
    const erroDepois = await onEntrou();
    if (erroDepois) setLoginError(erroDepois);
    setEntrando(false);
  }

  const [tema, setTema] = useState(lerTema);
  const [verSenha, setVerSenha] = useState(false);
  const agora = useAgora(15000);
  const escuro = tema === "dark";

  function trocarTema() {
    const novo = escuro ? "light" : "dark";
    setTema(novo);
    try { localStorage.setItem("sf_theme_v1", JSON.stringify(novo)); } catch { /* ignora */ }
  }

  const hora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false }).format(new Date(agora)));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const relogio = new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
  const diaSemana = new Date(agora).toLocaleDateString("pt-BR", { weekday: "long", timeZone: FUSO });
  const dataDia = new Date(agora).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: FUSO });

  const campo = {
    width: "100%",
    minHeight: 50,
    boxSizing: "border-box",
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: 12,
    padding: "0 14px",
    fontSize: 15,
    color: "var(--input-text)",
    outline: "none",
    fontFamily: "inherit",
  };
  const rotulo = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 };

  return (
    <div className="login3" style={{ ...getThemeVars(escuro), colorScheme: escuro ? "dark" : "light" }}>
      <button type="button" className="login3-tema" onClick={trocarTema} aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"} title={escuro ? "Tema claro" : "Tema escuro"}>
        <i className={`fa-solid ${escuro ? "fa-sun" : "fa-moon"}`} />
      </button>

      <main className="login3-form-lado">
        <form onSubmit={handleLogin} className="login3-form">
          <div className="login3-marca">
            <img src="/logosf.png" alt="" />
            <span>Grupo São Francisco</span>
          </div>

          <div>
            <h1 className="login3-saudacao">{saudacao}</h1>
            <p className="login3-sub">Entre para começar o plantão</p>
          </div>

          <div>
            <label style={rotulo} htmlFor="login3-usuario">Usuário</label>
            <select
              id="login3-usuario"
              style={{ ...campo, cursor: "pointer", color: login ? "var(--input-text)" : "var(--text-muted)" }}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={carregandoLista}
            >
              <option value="">{carregandoLista ? "Carregando..." : "Selecione seu usuário"}</option>
              {usuarios.map((u) => (
                <option key={u.login} value={u.login}>
                  {u.name} — {getRoleUiLabel(u.role)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={rotulo} htmlFor="login3-senha">Senha</label>
            <div style={{ position: "relative" }}>
              <input
                id="login3-senha"
                type={verSenha ? "text" : "password"}
                style={{ ...campo, paddingRight: 50 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
                title={verSenha ? "Esconder senha" : "Mostrar senha"}
                className="login3-olho"
              >
                <i className={`fa-solid ${verSenha ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>
          </div>

          {loginError && <div className="login3-erro" role="alert">{loginError}</div>}

          <button type="submit" disabled={entrando} className="login3-entrar">
            {entrando ? "Entrando..." : "Entrar"}
          </button>

          <div className="login3-rodape">© 2026 Caetano Digital Systems</div>
        </form>
      </main>

      <aside className="login3-relogio" aria-hidden="true">
        <div className="login3-hora">{relogio}</div>
        <div className="login3-data">{diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}<br />{dataDia}</div>
      </aside>
    </div>
  );
}
