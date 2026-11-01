import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { linkMensagens, textoMensagensFamilia } from "../utils/convite";

// Mensagens do convite de um atendimento + link e código para enviar à família
export function MensagensConviteModal({ atendimento, onClose }) {
  const token = atendimento.form?.conviteToken || "";
  const codigo = atendimento.form?.codigoMensagens || "";
  const falecido = atendimento.falecido || atendimento.form?.falecido || "";
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase.rpc("mensagens_do_convite", { p_token: token, p_codigo: codigo }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) console.error("Erro ao carregar mensagens:", error);
      setMensagens(data?.mensagens || []);
      setCarregando(false);
    });
    return () => { vivo = false; };
  }, [token, codigo]);

  async function copiarParaFamilia() {
    try {
      await navigator.clipboard.writeText(textoMensagensFamilia({ falecido, token, codigo }));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert(textoMensagensFamilia({ falecido, token, codigo }));
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card-bg)", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-main)" }}>Mensagens do convite</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{falecido}</div>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "var(--text-muted)", cursor: "pointer", minWidth: 44, minHeight: 44 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Link + código para a família */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 10, background: "var(--card-bg-alt)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Para enviar à família</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Código de acesso</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: "var(--text-main)" }}>{codigo || "—"}</div>
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Link das mensagens</div>
              <div style={{ fontSize: 13, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{token ? linkMensagens(token) : "—"}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={copiarParaFamilia}
            disabled={!token || !codigo}
            style={{ minHeight: 44, border: "none", borderRadius: 12, background: "var(--brand-accent)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            <i className={copiado ? "fa-solid fa-check" : "fa-regular fa-copy"} style={{ marginRight: 8 }} />
            {copiado ? "Copiado! Cole no WhatsApp da família" : "Copiar link + código para a família"}
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {carregando && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</div>}
          {!carregando && mensagens.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Nenhuma mensagem ainda.</div>
          )}
          {mensagens.map((m) => (
            <div key={m.id} style={{ background: "var(--card-bg-alt)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 14, color: "var(--text-main)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.mensagem}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                — {m.nome}{m.relacao ? ` (${m.relacao})` : ""}{m.contato ? ` · ${m.contato}` : ""} ·{" "}
                {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
