import React, { useEffect, useState } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./App.css";
import { supabase } from "./lib/supabaseClient";
import { entrar } from "./lib/auth";
import { getRoleUiLabel } from "./utils/attendance";

// ─── Login shared panel ───────────────────────────────────────────────────────

const LOGIN_FEATURES = [
  {
    icon: "fa-solid fa-user-tie",
    title: "Atendimento mais prático e digital",
    sub: "Registre e gerencie serviços com agilidade",
  },
  {
    icon: "fa-solid fa-mobile-screen",
    title: "Acompanhamento do serviço em tempo real",
    sub: "Família e equipe sempre informados",
  },
  {
    icon: "fa-solid fa-shield-halved",
    title: "Gestão e controle com facilidade",
    sub: "Relatórios, etapas e equipe em um só lugar",
  },
];

function LoginLeftPanel() {
  return (
    <div className="login-left">
      {/* Placeholder do grupo */}
      <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "20px 32px", display: "inline-block", textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          GRUPO
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>
          SÃO FRANCISCO
        </div>
      </div>

      {/* Título */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center", marginBottom: "2rem" }}>
        Sistema de Atendimento Funeral
      </div>

      {/* Linha decorativa */}
      <div style={{ width: 40, height: 2, background: "rgba(255,255,255,0.4)", margin: "0 auto 2.5rem", borderRadius: 2 }} />

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: 320 }}>
        {LOGIN_FEATURES.map(({ icon, title, sub }) => (
          <div key={title} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={icon} style={{ fontSize: 20, color: "#ffffff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500, lineHeight: 1.3 }}>{title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Frase rodapé */}
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: "3rem", maxWidth: 280 }}>
        Cuidando com respeito e dedicação em todos os momentos
      </div>
    </div>
  );
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

  const fieldStyle = { width: "100%", background: "#f8fbfb", border: "1px solid #d9e4e2", borderRadius: 12, padding: "13px 16px", fontSize: 14, color: "#333333", outline: "none", boxSizing: "border-box", cursor: "pointer" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 };

  return (
    <div className="login-screen">
      <LoginLeftPanel />
      <div className="login-right">
        <div style={{ maxWidth: 340, width: "100%", background: "#ffffff", border: "1px solid #e5ecea", borderRadius: 20, padding: "2rem", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#333333", margin: "0 0 6px" }}>Acesso interno</h1>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Entre com suas credenciais</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>USUÁRIO</label>
              <select
                style={{ ...fieldStyle, color: login ? "#333333" : "#94a3b8" }}
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
            <div style={{ marginBottom: loginError ? 16 : 24 }}>
              <label style={labelStyle}>SENHA</label>
              <input
                type="password"
                style={fieldStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div style={{ marginBottom: 16, fontSize: 13, color: "#dc2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 10, padding: "10px 14px" }}>
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={entrando}
              style={{ width: "100%", background: "#26b1c4", border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", marginTop: 8, opacity: entrando ? 0.7 : 1 }}
            >
              {entrando ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <div style={{ marginTop: "1.5rem", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            © 2026 Caetano Digital Systems
          </div>
        </div>
      </div>
    </div>
  );
}
