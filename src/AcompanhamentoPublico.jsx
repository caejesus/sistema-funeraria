import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { key: "atendimento",         label: "Atendimento" },
  { key: "remocao",             label: "Remoção" },
  { key: "procedimentoClinico", label: "Procedimento Clínico" },
  { key: "ornamentacao",        label: "Ornamentação" },
  { key: "entrega",             label: "Entrega" },
  { key: "velorio",             label: "Velório" },
  { key: "sepultamento",        label: "Sepultamento" },
];

const MENSAGENS = {
  atendimento:         { nao_iniciado: "Estamos organizando o início do atendimento.", em_andamento: "Nossa equipe já iniciou o atendimento.", finalizado: "Atendimento concluído com sucesso." },
  remocao:             { nao_iniciado: "Preparando a equipe para a remoção.", em_andamento: "Nossa equipe está em deslocamento.", finalizado: "Remoção realizada com todo cuidado." },
  procedimentoClinico: { nao_iniciado: "Procedimento será iniciado em breve.", em_andamento: "Procedimento sendo realizado com respeito.", finalizado: "Procedimento concluído." },
  ornamentacao:        { nao_iniciado: "Organizando a ornamentação.", em_andamento: "Preparando o ambiente com cuidado.", finalizado: "Ornamentação concluída." },
  entrega:             { nao_iniciado: "Preparando para entrega.", em_andamento: "Realizando a entrega.", finalizado: "Entrega realizada." },
  velorio:             { nao_iniciado: "Velório será iniciado em breve.", em_andamento: "Velório em andamento.", finalizado: "Velório encerrado." },
  sepultamento:        { nao_iniciado: "Sepultamento será realizado.", em_andamento: "Sepultamento em andamento.", finalizado: "Sepultamento concluído." },
};

// ─── Star rating ──────────────────────────────────────────────────────────────

function Estrelas({ value, hover, onChange, onHover, onHoverLeave }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1 }}
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={onHoverLeave}
          >
            <i className={filled ? "fa-solid fa-star" : "fa-regular fa-star"}
               style={{ fontSize: 28, color: filled ? "#f59e0b" : "#334155" }} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Evaluation form ──────────────────────────────────────────────────────────

function AvaliacaoForm({ atendimento, trackingId, onEnviado }) {
  const [notas,       setNotasState]      = useState([0, 0, 0, 0]);
  const [hovers,      setHoversState]     = useState([0, 0, 0, 0]);
  const [comentarios, setComentariosState] = useState(["", "", "", ""]);
  const [salvando,    setSalvando]        = useState(false);
  const [erro,        setErro]            = useState("");

  const form       = atendimento?.form || {};
  const atendente  = form.atendenteGeral || "";
  const temVelorio = form.velorioTipo === "funeraria";
  const motorista  = atendimento?.operationalStages?.remocao?.driver || form.Remocao || "";

  const perguntas = [
    { idx: 0, texto: `Como você avalia o atendimento${atendente ? ` feito por ${atendente}` : ""}?`, obrigatoria: true },
    temVelorio ? { idx: 1, texto: "Como você avalia a equipe que atuou durante o velório?", obrigatoria: false } : null,
    { idx: 2, texto: "Como você avalia a equipe que atuou na remoção?", obrigatoria: true },
    { idx: 3, texto: "Como você avalia o encerramento da despedida do seu ente querido?", obrigatoria: true },
  ].filter(Boolean);

  const obrigatoriasOk = perguntas.filter(p => p.obrigatoria).every(p => notas[p.idx] > 0);

  const setNota       = (idx, v) => setNotasState(prev => prev.map((n, i) => i === idx ? v : n));
  const setHover      = (idx, v) => setHoversState(prev => prev.map((h, i) => i === idx ? v : h));
  const setComentario = (idx, v) => setComentariosState(prev => prev.map((c, i) => i === idx ? v : c));

  async function handleEnviar() {
    if (!obrigatoriasOk) { setErro("Responda todas as perguntas obrigatórias."); return; }
    setSalvando(true);
    setErro("");

    const notasPreenchidas = perguntas.map(p => notas[p.idx]).filter(n => n > 0);
    const media = notasPreenchidas.length
      ? +(notasPreenchidas.reduce((a, b) => a + b, 0) / notasPreenchidas.length).toFixed(1)
      : 0;

    const { error } = await supabase.from("avaliacoes").insert([{
      atendimento_id:          trackingId,
      falecido:                atendimento?.falecido || "",
      atendente,
      motorista_remocao:       motorista,
      nota_atendimento:        notas[0] || null,
      nota_velorio:            temVelorio ? (notas[1] || null) : null,
      nota_remocao:            notas[2] || null,
      nota_encerramento:       notas[3] || null,
      comentario_atendimento:  comentarios[0] || null,
      comentario_velorio:      temVelorio ? (comentarios[1] || null) : null,
      comentario_remocao:      comentarios[2] || null,
      comentario_encerramento: comentarios[3] || null,
      media_geral:             media,
    }]);

    setSalvando(false);
    if (error) { setErro("Erro ao enviar. Tente novamente."); return; }
    onEnviado(media);
  }

  return (
    <div style={S.card}>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>Sua opinião importa</div>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Avalie nosso atendimento</div>

      {perguntas.map(({ idx, texto }, pos) => (
        <div key={idx} style={{ paddingBottom: 18, marginBottom: 18, borderBottom: pos < perguntas.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none" }}>
          <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 10, lineHeight: 1.5 }}>{texto}</div>
          <Estrelas
            value={notas[idx]}
            hover={hovers[idx]}
            onChange={(v) => setNota(idx, v)}
            onHover={(v) => setHover(idx, v)}
            onHoverLeave={() => setHover(idx, 0)}
          />
          <textarea
            style={{ width: "100%", marginTop: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#e2e8f0", resize: "none", height: 60, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            placeholder="Comentário opcional..."
            value={comentarios[idx]}
            onChange={(e) => setComentario(idx, e.target.value)}
          />
        </div>
      ))}

      {erro && <div style={{ fontSize: 13, color: "#f87171", marginBottom: 12 }}>{erro}</div>}

      <button
        type="button"
        style={{ width: "100%", background: obrigatoriasOk ? "#26b1c4" : "rgba(38,177,196,0.3)", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, color: "#fff", cursor: obrigatoriasOk ? "pointer" : "not-allowed", opacity: salvando ? 0.7 : 1 }}
        onClick={handleEnviar}
        disabled={!obrigatoriasOk || salvando}
      >
        {salvando ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AcompanhamentoPublico({ trackingId = "" }) {
  const [atendimento,    setAtendimento]    = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [jaAvaliou,      setJaAvaliou]      = useState(false);
  const [mediaExistente, setMediaExistente] = useState(null);
  const [avaliacaoMedia, setAvaliacaoMedia] = useState(null);
  const [enviado,        setEnviado]        = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!trackingId) { setLoading(false); return; }
    setLoading(true);

    Promise.all([
      supabase.from("atendimentos").select("*").eq("record_id", trackingId).single(),
      supabase.from("avaliacoes").select("id, media_geral").eq("atendimento_id", trackingId).single(),
    ]).then(([{ data }, { data: aval }]) => {
      setAtendimento(data?.dados || null);
      if (aval) { setJaAvaliou(true); setMediaExistente(aval.media_geral); }
      setLoading(false);
    });
  }, [trackingId]);

  // ── Realtime ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!trackingId) return;
    const channel = supabase
      .channel("public-tracking-" + trackingId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "atendimentos",
          filter: `record_id=eq.${trackingId}`,
        },
        (payload) => {
          console.log("Realtime update recebido:", payload);
          const novoDados = payload.new?.dados || null;
          if (novoDados) setAtendimento(novoDados);
        }
      )
      .subscribe((status) => {
        console.log("Status realtime acompanhamento:", status);
      });
    return () => supabase.removeChannel(channel);
  }, [trackingId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={{ ...S.card, textAlign: "center" }}>Carregando informações do atendimento...</div>
        </div>
      </div>
    );
  }

  if (!atendimento) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={{ ...S.card, textAlign: "center" }}>Não foi possível localizar este acompanhamento.</div>
        </div>
      </div>
    );
  }

  const stages      = atendimento.operationalStages || {};
  const totalEtapas = STAGES.length;
  const finalizadas = STAGES.filter(s => stages[s.key]?.status === "finalizado").length;
  const pct         = Math.round((finalizadas / totalEtapas) * 100);
  const concluido   = finalizadas === totalEtapas;

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* Logo */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 16, marginBottom: 16, textAlign: "center" }}>
          <img
            src="/logogrupo.png"
            alt="Grupo São Francisco"
            style={{ maxWidth: 200, height: "auto", display: "block", margin: "0 auto" }}
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
          />
          <div style={{ display: "none", fontSize: 15, fontWeight: 700, color: "#333" }}>GRUPO SÃO FRANCISCO</div>
        </div>

        {/* Header + progress */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#93c5fd", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
            Acompanhamento do Serviço
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
            {atendimento.falecido || "Falecido não informado"}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>
            Atualizações em tempo real para a família
          </div>
          <div style={{ fontSize: 11, color: "#26b1c4", marginBottom: 6 }}>
            {finalizadas} de {totalEtapas} etapas concluídas
          </div>
          <div style={{ height: 6, background: "rgba(148,163,184,0.1)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: 6, width: `${pct}%`, background: "linear-gradient(90deg, #26b1c4, #1d8ea0)", borderRadius: 999, transition: "width 0.5s ease" }} />
          </div>
        </div>

        {/* Timeline */}
        {!concluido ? (
          <div style={{ position: "relative", paddingLeft: 28 }}>
            <div style={{ position: "absolute", left: 11, top: 12, bottom: 12, width: 2, background: "rgba(148,163,184,0.1)" }} />

            {STAGES.map((item) => {
              const stage     = stages[item.key] || {};
              const s         = stage.status || "nao_iniciado";
              const isDone    = s === "finalizado";
              const isRunning = s === "em_andamento";

              const indicator = isDone ? (
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", left: -28, top: 14 }}>
                  <i className="fa-solid fa-check" style={{ fontSize: 11, color: "#fff" }} />
                </div>
              ) : isRunning ? (
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", left: -28, top: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                </div>
              ) : (
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(148,163,184,0.15)", border: "2px solid rgba(148,163,184,0.2)", position: "absolute", left: -28, top: 14 }} />
              );

              const cardBg     = isDone ? "rgba(34,197,94,0.06)"  : isRunning ? "rgba(245,158,11,0.08)"  : "rgba(15,23,42,0.5)";
              const cardBorder = isDone ? "rgba(34,197,94,0.2)"   : isRunning ? "rgba(245,158,11,0.3)"   : "rgba(148,163,184,0.1)";
              const badgeColor = isDone ? "#22c55e"               : isRunning ? "#f59e0b"                : "#94a3b8";
              const badgeBg    = isDone ? "rgba(34,197,94,0.14)"  : isRunning ? "rgba(245,158,11,0.14)"  : "rgba(148,163,184,0.1)";
              const badgeText  = isDone ? "Concluído"             : isRunning ? "Em andamento"           : "Aguardando";

              return (
                <div key={item.key} style={{ position: "relative", marginBottom: 10, opacity: s === "nao_iniciado" ? 0.6 : 1 }}>
                  {indicator}
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: (isDone || isRunning) ? 10 : 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#f8fafc" }}>{item.label}</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 999, padding: "4px 10px" }}>
                        {badgeText}
                      </span>
                    </div>
                    {(isDone || isRunning) && (
                      <>
                        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>Início</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{stage.start || "—"}</div>
                          </div>
                          {isDone && (
                            <div>
                              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>Fim</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{stage.end || "—"}</div>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#475569" }}>{MENSAGENS[item.key]?.[s] || ""}</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          <>
            {/* Conclusão card */}
            <div style={{ ...S.card, textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.14)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <i className="fa-solid fa-check" style={{ fontSize: 28, color: "#22c55e" }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>Atendimento concluído</div>
              <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                O Grupo São Francisco agradece pela confiança depositada em nossos serviços. Permaneceremos à disposição da família.
              </div>
            </div>

            {/* Avaliação */}
            {(jaAvaliou || enviado) ? (
              <div style={{ ...S.card, textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
                  Obrigado pela sua avaliação! ⭐
                </div>
                {(mediaExistente != null || avaliacaoMedia != null) && (
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>
                    Sua avaliação média: {(mediaExistente ?? avaliacaoMedia).toFixed(1)} / 5
                  </div>
                )}
              </div>
            ) : (
              <AvaliacaoForm
                atendimento={atendimento}
                trackingId={trackingId}
                onEnviado={(media) => { setEnviado(true); setAvaliacaoMedia(media); }}
              />
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#1e3a4a", marginTop: 20 }}>
          © 2026 Caetano Digital Systems
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #071226 0%, #0b1730 100%)",
    color: "#e5e7eb",
    padding: "20px 16px 28px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
  },
  card: {
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 18,
    padding: "20px 18px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
  },
};
