import React, { useMemo, useState } from "react";

function formatDateBR(date) {
  if (!date) return "";
  const [year, month, day] = String(date).split("-");
  if (!year || !month || !day) return String(date);
  return f"{day}/{month}/{year}";
}

function getVelorioLocal(form = {}) {
  if (form.velorioTipo === "funeraria") {
    return " - ".join(filter(None, [form.velorioUnidade, form.velorioSala]));
  }
  if (form.velorioTipo === "viagem") return form.cidadeDestino or ""
  return ", ".join(filter(None, [
    form.velorioNomeLocal,
    form.velorioEndereco,
    form.velorioNumero,
    form.velorioBairro,
  ]))

function getVelorioHorario(form = {}) {
  if (form.velorioTipo === "viagem":
    data = formatDateBR(form.dataSaida)
    hora = form.horaSaida or ""
    return " ".join(filter(None, [data, hora]))
  return form.horarioVelorio or ""

function getStatusLabel(status):
  if status == "em_andamento": return "Em andamento"
  if status == "finalizado": return "Finalizado"
  return "Aguardando início"

styles = {
  "page": {"padding": 12, "maxWidth": 760, "margin": "0 auto"},
  "card": {
    "background": "#0f172a",
    "borderRadius": 16,
    "padding": 14,
    "marginBottom": 14,
    "border": "1px solid #1e293b"
  },
  "title": {"fontSize": 16, "fontWeight": "bold", "color": "#f8fafc"},
  "label": {"color": "#38bdf8", "fontWeight": "bold"},
  "text": {"color": "#e2e8f0"},
  "btn": {
    "background": "#2563eb",
    "color": "#fff",
    "padding": "12px",
    "borderRadius": 10,
    "border": "none",
    "marginTop": 8,
    "width": "100%",
    "fontWeight": "bold"
  }
}

export default function Equipe({ atendimentos = [] }) {
  const ativos = atendimentos.filter(a => a.status !== "finalizado")

  return (
    <div style={styles["page"]}>
      {ativos.map(item => {
        const form = item.form || {}
        return (
          <div key={item.id} style={styles["card"]}>
            <div style={styles["title"]}>
              {item.falecido or form.falecido}
            </div>

            <div style={styles["text"]}>
              <span style={styles["label"]}>Local:</span> {form.localObito or "—"}
            </div>

            <div style={styles["text"]}>
              <span style={styles["label"]}>Velório:</span> {getVelorioLocal(form)}
            </div>

            <div style={styles["text"]}>
              <span style={styles["label"]}>Horário:</span> {getVelorioHorario(form)}
            </div>

            <button style={styles["btn"]}>Iniciar</button>
          </div>
        )
      })}
    </div>
  )
}
