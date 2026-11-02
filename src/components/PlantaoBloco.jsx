import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { normalizeRole } from "../utils/attendance";
import { EVENTO_PLANTAO } from "./NovoAvisoModal";

// Avisos e tarefas da passagem de plantão (todos os atendentes veem a mesma lista)

function quando(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Manaus" });
  const dia = (x) => x.toLocaleDateString("pt-BR", { timeZone: "America/Manaus" });
  if (dia(d) === dia(hoje)) return `hoje ${hora}`;
  if (dia(d) === dia(ontem)) return `ontem ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Manaus" })} ${hora}`;
}

const chipBase = {
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
};

function chip(ativo, cor = "var(--brand-accent)") {
  return {
    ...chipBase,
    border: `1px solid ${ativo ? cor : "var(--border-soft)"}`,
    background: ativo ? cor : "var(--card-bg)",
    color: ativo ? "#fff" : "var(--text-muted)",
  };
}

const iconeBtn = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 14,
  flexShrink: 0,
};

export function PlantaoBloco({ session, onAbrirAtendimento, onNovoAviso }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [verConcluidos, setVerConcluidos] = useState(false);
  const [meuAuthId, setMeuAuthId] = useState(session?.auth_id || "");

  const podeExcluirTudo = ["ADM", "SUPERVISOR"].includes(normalizeRole(session?.role));

  useEffect(() => {
    if (meuAuthId) return;
    supabase.auth.getSession().then(({ data }) => setMeuAuthId(data?.session?.user?.id || ""));
  }, [meuAuthId]);

  const carregar = useCallback(async () => {
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("plantao_itens")
      .select("*")
      .eq("arquivado", false)
      .or(`feito.eq.false,feito_em.gte.${desde}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) console.error("Erro ao carregar o plantão:", error);
    setItens(data || []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel("plantao-itens")
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_itens" }, () => carregar())
      .subscribe();
    const t = setInterval(carregar, 120000);
    window.addEventListener(EVENTO_PLANTAO, carregar);
    return () => { supabase.removeChannel(canal); clearInterval(t); window.removeEventListener(EVENTO_PLANTAO, carregar); };
  }, [carregar]);

  const pendentes = useMemo(
    () => itens
      .filter((i) => !i.feito)
      .sort((a, b) => (b.urgente - a.urgente) || (new Date(a.created_at) - new Date(b.created_at))),
    [itens]
  );
  const concluidos = useMemo(
    () => itens.filter((i) => i.feito).sort((a, b) => new Date(b.feito_em) - new Date(a.feito_em)),
    [itens]
  );

  async function atualizar(item, mudancas) {
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...mudancas } : i)));
    const { error } = await supabase.from("plantao_itens").update(mudancas).eq("id", item.id);
    if (error) { alert("Não foi possível salvar. Tente novamente."); console.error(error); }
    carregar();
  }

  function alternarFeito(item) {
    const agora = new Date().toISOString();
    atualizar(item, item.feito
      ? { feito: false, feito_por: "", feito_em: null }
      : { feito: true, feito_por: session?.name || "", feito_em: agora });
  }

  function arquivar(item) {
    atualizar(item, { arquivado: true, arquivado_por: session?.name || "", arquivado_em: new Date().toISOString() });
  }

  async function salvarEdicao() {
    const limpo = (editando?.texto || "").trim();
    if (!limpo) return;
    const item = itens.find((i) => i.id === editando.id);
    await atualizar(item, { texto: limpo.slice(0, 1000), urgente: editando.urgente, editado_por: session?.name || "", editado_em: new Date().toISOString() });
    setEditando(null);
  }

  async function excluir(item) {
    if (!window.confirm("Excluir este item? Isso não pode ser desfeito.")) return;
    const { error, count } = await supabase.from("plantao_itens").delete({ count: "exact" }).eq("id", item.id);
    if (error || count === 0) { alert("Você não tem permissão para excluir este item."); return; }
    setItens((prev) => prev.filter((i) => i.id !== item.id));
  }

  const podeExcluir = (item) => podeExcluirTudo || (meuAuthId && item.criado_auth === meuAuthId);

  // função (não componente) para o campo de edição não perder o foco ao digitar
  function renderLinha(item) {
    const emEdicao = editando?.id === item.id;
    const ehAviso = item.tipo === "aviso";
    return (
      <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid var(--border-soft)", opacity: item.feito ? 0.6 : 1 }}>
        {ehAviso ? (
          <i className="fa-solid fa-circle-info" style={{ fontSize: 18, color: "var(--brand-accent)", marginTop: 2, width: 22, textAlign: "center" }} aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={() => alternarFeito(item)}
            aria-label={item.feito ? "Marcar como não feito" : "Marcar como feito"}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, cursor: "pointer",
              border: `2px solid ${item.feito ? "#16a34a" : item.urgente ? "#dc2626" : "var(--input-border)"}`,
              background: item.feito ? "#16a34a" : "transparent", color: "#fff", fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}
          >
            {item.feito && <i className="fa-solid fa-check" />}
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {emEdicao ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={editando.texto}
                onChange={(e) => setEditando((x) => ({ ...x, texto: e.target.value }))}
                maxLength={1000}
                style={{ width: "100%", minHeight: 60, boxSizing: "border-box", borderRadius: 10, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--input-text)", padding: "8px 10px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={chip(editando.urgente, "#dc2626")} onClick={() => setEditando((x) => ({ ...x, urgente: !x.urgente }))}>
                  <i className="fa-solid fa-flag" />Urgente
                </button>
                <button type="button" style={chip(true)} onClick={salvarEdicao}>Salvar</button>
                <button type="button" style={chip(false)} onClick={() => setEditando(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14, color: "var(--text-main)", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word", textDecoration: item.feito ? "line-through" : "none" }}>
                {item.texto}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {item.urgente && !item.feito && (
                  <span style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626", borderRadius: 999, padding: "1px 8px", fontWeight: 700 }}>Urgente</span>
                )}
                {ehAviso && <span style={{ background: "var(--card-bg-alt)", borderRadius: 999, padding: "1px 8px" }}>Aviso</span>}
                {item.atendimento_id && (
                  <button
                    type="button"
                    onClick={() => onAbrirAtendimento?.(item.atendimento_id)}
                    style={{ background: "none", border: "none", padding: 0, color: "var(--brand-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}
                  >
                    <i className="fa-solid fa-link" style={{ marginRight: 4 }} />{item.atendimento_nome || "Atendimento"}
                  </button>
                )}
                <span>{item.criado_por || "—"}, {quando(item.created_at)}</span>
                {item.feito && <span>· feito por {item.feito_por || "—"}, {quando(item.feito_em)}</span>}
                {item.editado_em && !item.feito && <span>· editado por {item.editado_por}</span>}
              </div>
            </>
          )}
        </div>

        {!emEdicao && (
          <div style={{ display: "flex", gap: 2 }}>
            {!item.feito && (
              <button type="button" style={iconeBtn} title="Editar" aria-label="Editar" onClick={() => setEditando({ id: item.id, texto: item.texto, urgente: item.urgente })}>
                <i className="fa-solid fa-pen" />
              </button>
            )}
            {ehAviso && (
              <button type="button" style={iconeBtn} title="Arquivar" aria-label="Arquivar" onClick={() => arquivar(item)}>
                <i className="fa-solid fa-box-archive" />
              </button>
            )}
            {podeExcluir(item) && (
              <button type="button" style={{ ...iconeBtn, color: "#dc2626" }} title="Excluir" aria-label="Excluir" onClick={() => excluir(item)}>
                <i className="fa-solid fa-trash" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <section style={{ background: "var(--card-bg)", border: "1px solid rgba(234,160,20,0.45)", borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <i className="fa-solid fa-clipboard-list" style={{ fontSize: 18, color: "var(--brand-accent)" }} aria-hidden="true" />
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>Avisos e tarefas do plantão</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {pendentes.length ? `${pendentes.length} pendente${pendentes.length > 1 ? "s" : ""}` : "nada pendente"}
        </span>
      </div>


      {carregando && <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>Carregando...</div>}
      {!carregando && pendentes.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "10px 0", borderTop: "1px solid var(--border-soft)" }}>
          Nenhum aviso ou tarefa pendente.{onNovoAviso ? " Para criar, use \"Novo aviso\" no menu." : ""}
        </div>
      )}
      {pendentes.map((item) => renderLinha(item))}

      {concluidos.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10, marginTop: 2 }}>
          <button
            type="button"
            onClick={() => setVerConcluidos((v) => !v)}
            style={{ background: "none", border: "none", padding: 0, color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className={`fa-solid fa-chevron-${verConcluidos ? "up" : "down"}`} style={{ marginRight: 6 }} />
            Concluídos nas últimas 24h ({concluidos.length})
          </button>
          {verConcluidos && concluidos.map((item) => renderLinha(item))}
        </div>
      )}
    </section>
  );
}
