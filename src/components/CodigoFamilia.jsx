import React, { useState } from "react";

// Código da família: fica lembrado neste celular (por link)
export function lerCodigoSalvo(token) {
  try { return localStorage.getItem(`familia_codigo_${token}`) || ""; } catch { return ""; }
}
export function salvarCodigo(token, codigo) {
  try { localStorage.setItem(`familia_codigo_${token}`, codigo); } catch { /* ignora */ }
}
export function esquecerCodigo(token) {
  try { localStorage.removeItem(`familia_codigo_${token}`); } catch { /* ignora */ }
}

// Tela que pede o código de 6 números (visual escuro das páginas da família)
export function CodigoFamilia({ titulo, botao, erro, verificando, onEnviar }) {
  const [codigo, setCodigo] = useState("");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #071226 0%, #0b1730 100%)", padding: "24px 16px 40px", boxSizing: "border-box", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: 16, marginBottom: 16, textAlign: "center" }}>
          <img src="/logogrupo.png" alt="Grupo São Francisco" style={{ maxWidth: 200, height: "auto", display: "block", margin: "0 auto" }} />
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (codigo.length === 6) onEnviar(codigo); }}
          style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 18, padding: 22, textAlign: "center" }}
        >
          <div style={{ fontSize: 19, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>{titulo}</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 18, lineHeight: 1.5 }}>
            Digite o código de acesso que a funerária enviou para a família.
          </div>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Código de acesso"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12, padding: "12px 14px", fontSize: 24, letterSpacing: 8, textAlign: "center", color: "#f8fafc", outline: "none", fontFamily: "inherit" }}
          />
          {erro && <div style={{ fontSize: 13, color: "#f87171", marginTop: 12 }}>{erro}</div>}
          <button
            type="submit"
            disabled={verificando || codigo.length < 6}
            style={{ width: "100%", marginTop: 16, minHeight: 48, background: "#26b1c4", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", opacity: verificando || codigo.length < 6 ? 0.6 : 1 }}
          >
            {verificando ? "Verificando..." : botao}
          </button>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 12 }}>O código fica lembrado neste celular.</div>
        </form>
      </div>
    </div>
  );
}
