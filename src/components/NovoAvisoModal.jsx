import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Janela "Novo aviso" (aberta pelo menu lateral). Cria uma tarefa ou um aviso para o plantão.
export const EVENTO_PLANTAO = "plantao-atualizado";

function opcao(ativo, cor = "var(--brand-accent)") {
  return {
    flex: "1 1 0",
    minHeight: 44,
    borderRadius: 12,
    border: `1px solid ${ativo ? cor : "var(--border-soft)"}`,
    background: ativo ? cor : "var(--card-bg)",
    color: ativo ? "#fff" : "var(--text-main)",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "inherit",
  };
}

export function NovoAvisoModal({ session, atendimentosAtivos = [], onClose }) {
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("tarefa");
  const [urgente, setUrgente] = useState(false);
  const [atendimentoId, setAtendimentoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e) {
    e.preventDefault();
    const limpo = texto.trim();
    if (!limpo) { setErro(tipo === "aviso" ? "Escreva o aviso." : "Escreva a tarefa."); return; }
    setSalvando(true);
    setErro("");
    const atendimento = atendimentosAtivos.find((a) => String(a.id) === String(atendimentoId));
    const { error } = await supabase.from("plantao_itens").insert([{
      tipo,
      texto: limpo.slice(0, 1000),
      urgente,
      atendimento_id: atendimento ? String(atendimento.id) : "",
      atendimento_nome: atendimento ? atendimento.nome : "",
      criado_por: session?.name || "",
    }]);
    setSalvando(false);
    if (error) { console.error(error); setErro("Não foi possível salvar. Tente novamente."); return; }
    window.dispatchEvent(new Event(EVENTO_PLANTAO));
    onClose(true);
  }

  const campo = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid var(--input-border)",
    background: "var(--input-bg)",
    color: "var(--input-text)",
    padding: "10px 12px",
    fontSize: 15,
    fontFamily: "inherit",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(false); }}
    >
      <form
        onSubmit={salvar}
        style={{ background: "var(--card-bg)", borderRadius: 18, width: "100%", maxWidth: 520, padding: 20, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa-solid fa-bullhorn" style={{ color: "var(--brand-accent)", fontSize: 18 }} aria-hidden="true" />
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)" }}>Novo aviso para o plantão</div>
          <button type="button" aria-label="Fechar" onClick={() => onClose(false)} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 20, color: "var(--text-muted)", cursor: "pointer", width: 40, height: 40 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={opcao(tipo === "tarefa")} onClick={() => setTipo("tarefa")}>
            <i className="fa-regular fa-square-check" />Tarefa
          </button>
          <button type="button" style={opcao(tipo === "aviso")} onClick={() => setTipo("aviso")}>
            <i className="fa-solid fa-circle-info" />Aviso
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6 }}>
          {tipo === "tarefa" ? "Tarefa: alguém precisa fazer e marcar como feito." : "Aviso: só um recado para todos saberem. Arquive quando não valer mais."}
        </div>

        <textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
          placeholder={tipo === "aviso" ? "Ex.: Ar-condicionado da Sala Lírio com barulho. Técnico vem quarta." : "Ex.: Ligar para a família do José confirmando o horário da missa."}
          style={{ ...campo, minHeight: 110, resize: "vertical" }}
        />

        {atendimentosAtivos.length > 0 && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
            Ligar a um atendimento (opcional)
            <select value={atendimentoId} onChange={(e) => setAtendimentoId(e.target.value)} style={campo}>
              <option value="">Nenhum</option>
              {atendimentosAtivos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </label>
        )}

        <button type="button" style={{ ...opcao(urgente, "#dc2626"), flex: "none" }} onClick={() => setUrgente((u) => !u)}>
          <i className="fa-solid fa-flag" />{urgente ? "Marcado como urgente" : "Marcar como urgente"}
        </button>

        {erro && <div style={{ fontSize: 13, color: "#dc2626" }}>{erro}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => onClose(false)} style={{ ...opcao(false), flex: 1 }}>Cancelar</button>
          <button type="submit" disabled={salvando} style={{ ...opcao(true), flex: 1, opacity: salvando ? 0.7 : 1 }}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
