import React, { useState } from "react";

export function AlterarSenhaModal({ session, users, onClose, updateUser }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha]   = useState("");
  const [confirmar, setConfirmar]   = useState("");
  const [erro, setErro]             = useState("");
  const [sucesso, setSucesso]       = useState(false);
  const [salvando, setSalvando]     = useState(false);

  async function handleSalvar() {
    setErro("");
    const user = (users || []).find((u) => u.id === session?.id);
    if (!user || user.password !== senhaAtual) {
      setErro("Senha atual incorreta.");
      return;
    }
    if (!novaSenha) {
      setErro("A nova senha não pode ser vazia.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    const ok = await updateUser(session.id, { password: novaSenha });
    setSalvando(false);
    if (!ok) {
      setErro("Erro ao salvar. Tente novamente.");
      return;
    }
    setSucesso(true);
    setTimeout(onClose, 1500);
  }

  const inputStyle = {
    width: "100%",
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14,
    color: "var(--input-text)",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "var(--card-bg-soft)",
        borderRadius: 20,
        padding: 28,
        width: "100%",
        maxWidth: 380,
        border: "1px solid var(--border-soft)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
      }}>
        <h2 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
          Alterar senha
        </h2>

        {sucesso ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: 36, color: "#15803d", marginBottom: 12, display: "block" }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "#15803d" }}>Senha alterada com sucesso!</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Senha atual</label>
              <input
                type="password"
                style={inputStyle}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nova senha</label>
              <input
                type="password"
                style={inputStyle}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirmar nova senha</label>
              <input
                type="password"
                style={inputStyle}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSalvar()}
              />
            </div>

            {erro && (
              <div style={{ fontSize: 13, color: "#ef4444", background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
                {erro}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={{ flex: 1, background: "var(--brand-accent)", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, color: "#fff", cursor: salvando ? "not-allowed" : "pointer", opacity: salvando ? 0.7 : 1 }}
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                style={{ flex: 1, background: "none", border: "1px solid var(--border-soft)", borderRadius: 12, padding: "12px 0", fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
