import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Lista as mensagens deixadas no convite online de um atendimento
export function MensagensConviteModal({ atendimento, onClose }) {
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    supabase
      .from("convite_mensagens")
      .select("id, nome, contato, relacao, mensagem, created_at")
      .eq("atendimento_id", String(atendimento.id))
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) console.error("Erro ao carregar mensagens:", error);
        setMensagens(data || []);
        setCarregando(false);
      });
    return () => { vivo = false; };
  }, [atendimento.id]);

  const link = atendimento.form?.conviteToken ? `${window.location.origin}/convite/${atendimento.form.conviteToken}` : "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card-bg)", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-main)" }}>Mensagens do convite</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{atendimento.falecido || atendimento.form?.falecido}</div>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "var(--text-muted)", cursor: "pointer", minWidth: 44, minHeight: 44 }}>
            <i className="fa-solid fa-xmark" />
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
                — {m.nome}{m.relacao ? ` (${m.relacao})` : ""}{m.contato ? ` · ${m.contato}` : ""} · {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>

        {link && (
          <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--border-soft)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-soft)", color: "var(--text-main)", textDecoration: "none", fontSize: 13 }}>
              <i className="fa-solid fa-arrow-up-right-from-square" />Abrir convite
            </a>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(link); alert("Link do convite copiado!"); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-soft)", background: "none", color: "var(--text-main)", fontSize: 13, cursor: "pointer" }}
            >
              <i className="fa-solid fa-link" />Copiar link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
