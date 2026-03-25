import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./lib/supabaseClient.js";

const STAGES = [
  { key: "atendimento", label: "Atendimento" },
  { key: "remocao", label: "Remoção" },
  { key: "procedimentoClinico", label: "Procedimento Clínico" },
  { key: "ornamentacao", label: "Ornamentação" },
  { key: "entrega", label: "Entrega" },
  { key: "velorio", label: "Velório" },
  { key: "sepultamento", label: "Sepultamento" },
];

function getStatus(status) {
  if (status === "finalizado") {
    return {
      text: "Finalizado",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.14)",
      border: "rgba(34,197,94,0.35)",
    };
  }

  if (status === "em_andamento") {
    return {
      text: "Em andamento",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.14)",
      border: "rgba(245,158,11,0.35)",
    };
  }

  return {
    text: "Aguardando",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.25)",
  };
}

export default function AcompanhamentoPublico() {
  const { id } = useParams();
  const [atendimento, setAtendimento] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const { data, error } = await supabase
        .from("atendimentos")
        .select("*")
        .eq("record_id", id)
        .single();

      if (error) {
        console.error("Erro ao carregar acompanhamento público:", error);
        setAtendimento(null);
        setLoading(false);
        return;
      }

      setAtendimento(data?.dados || null);
      setLoading(false);
    }

    carregar();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loadingCard}>Carregando informações do atendimento...</div>
        </div>
      </div>
    );
  }

  if (!atendimento) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loadingCard}>
            Não foi possível localizar este acompanhamento.
          </div>
        </div>
      </div>
    );
  }

  const stages = atendimento.operationalStages || {};

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        <div style={styles.headerCard}>
          <div style={styles.smallTitle}>Acompanhamento do Serviço</div>
          <div style={styles.deceasedName}>
            {atendimento.falecido || "Falecido não informado"}
          </div>
          <div style={styles.helperText}>
            Atualizações do atendimento em tempo real para acompanhamento da família.
          </div>
        </div>

        <div style={styles.timelineWrap}>
          {STAGES.map((item) => {
            const stage = stages[item.key] || {};
            const status = getStatus(stage.status);

            return (
              <div key={item.key} style={styles.stageCard}>
                <div style={styles.stageTop}>
                  <div style={styles.stageTitle}>{item.label}</div>

                  <div
                    style={{
                      ...styles.statusBadge,
                      color: status.color,
                      background: status.bg,
                      borderColor: status.border,
                    }}
                  >
                    {status.text}
                  </div>
                </div>

                <div style={styles.stageTimes}>
                  <div style={styles.timeItem}>
                    <span style={styles.timeLabel}>Início</span>
                    <span style={styles.timeValue}>{stage.start || "—"}</span>
                  </div>

                  <div style={styles.timeItem}>
                    <span style={styles.timeLabel}>Fim</span>
                    <span style={styles.timeValue}>{stage.end || "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.footerText}>
          Estamos cuidando de cada detalhe com respeito e dedicação.
        </div>

        <div style={styles.actions}>
          <button
            style={styles.refreshButton}
            onClick={() => window.location.reload()}
          >
            Atualizar informações
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #071226 0%, #0b1730 100%)",
    color: "#e5e7eb",
    padding: "18px 14px 28px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: 680,
    margin: "0 auto",
  },
  loadingCard: {
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 18,
    padding: 20,
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
  },
  brandCard: {
    background: "#ffffff",
    borderRadius: 22,
    padding: "18px 16px",
    marginBottom: 16,
    textAlign: "center",
    boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
  },
  logo: {
    width: "100%",
    maxWidth: 430,
    height: "auto",
    display: "block",
    margin: "0 auto",
  },
  headerCard: {
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 22,
    padding: "20px 18px",
    marginBottom: 16,
    boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
    textAlign: "center",
  },
  smallTitle: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: "#93c5fd",
    marginBottom: 10,
  },
  deceasedName: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 10,
    color: "#f8fafc",
  },
  helperText: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 1.5,
  },
  timelineWrap: {
    display: "grid",
    gap: 12,
  },
  stageCard: {
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
  },
  stageTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#f8fafc",
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: 700,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 999,
    padding: "6px 10px",
  },
  stageTimes: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  timeItem: {
    background: "rgba(2,6,23,0.28)",
    border: "1px solid rgba(148,163,184,0.12)",
    borderRadius: 14,
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  timeLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#f8fafc",
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 1.5,
    marginTop: 22,
    marginBottom: 14,
  },
  actions: {
    textAlign: "center",
  },
  refreshButton: {
    background: "#1d4ed8",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "12px 18px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(29,78,216,0.28)",
  },
};
