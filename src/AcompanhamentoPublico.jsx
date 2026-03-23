import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./lib/supabaseClient.js";

const STAGES = [
  { key: "atendimento", label: "Atendimento", icon: "📝" },
  { key: "remocao", label: "Remoção", icon: "🚗" },
  { key: "procedimentoClinico", label: "Procedimento Clínico", icon: "🩺" },
  { key: "ornamentacao", label: "Ornamentação", icon: "🌷" },
  { key: "entrega", label: "Entrega", icon: "📦" },
  { key: "velorio", label: "Velório", icon: "🕊️" },
  { key: "sepultamento", label: "Sepultamento", icon: "⚰️" },
];

function getStatus(status) {
  if (status === "finalizado") return { text: "Finalizado", color: "#22c55e" };
  if (status === "em_andamento") return { text: "Em andamento", color: "#f59e0b" };
  return { text: "Aguardando", color: "#94a3b8" };
}

export default function AcompanhamentoPublico() {
  const { id } = useParams();
  const [atendimento, setAtendimento] = useState(null);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("atendimentos")
        .select("*")
        .eq("record_id", id)
        .single();

      setAtendimento(data?.dados);
    }

    carregar();
  }, [id]);

  if (!atendimento) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  const stages = atendimento.operationalStages || {};

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Acompanhamento do Serviço</h2>

      {STAGES.map((item) => {
        const stage = stages[item.key] || {};
        const status = getStatus(stage.status);

        return (
          <div key={item.key} style={styles.row}>
            <div style={styles.rowTop}>
              <div style={styles.left}>
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
              </div>

              <div style={{ ...styles.status, color: status.color }}>
                {status.text}
              </div>
            </div>

            <div style={styles.rowBottom}>
              <span>Início: {stage.start || "—"}</span>
              <span>Fim: {stage.end || "—"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e5e7eb",
    padding: "16px",
    fontFamily: "Arial",
  },
  title: {
    marginBottom: 16,
  },
  row: {
    borderBottom: "1px solid #334155",
    padding: "10px 0",
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  left: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  status: {
    fontSize: 12,
    fontWeight: "bold",
  },
  rowBottom: {
    display: "flex",
    gap: 20,
    fontSize: 13,
    color: "#94a3b8",
  },
};