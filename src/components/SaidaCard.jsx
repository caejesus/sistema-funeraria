import React from "react";
import {
  SAIDA_STATUS,
  getSaidaTipoLabel,
  getSaidaLocalLabel,
  getSaidaStatusVisivel,
  formatAgendamento,
  formatHora,
  formatDataHora,
  formatKm,
} from "../constants/saidas";

// Card de uma saída da frota — usado na aba do atendente e na tela do motorista

export function SaidaStatusBadge({ saida, agora }) {
  const key = getSaidaStatusVisivel(saida, agora);
  const cfg = SAIDA_STATUS[key] || SAIDA_STATUS.aguardando;
  let label = cfg.label;
  if (key === "em_andamento" && saida.iniciado_em) label = `Em andamento · desde ${formatHora(saida.iniciado_em)}`;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap",
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {label}
    </span>
  );
}

export function SaidaCard({ saida, agora, destaque = false, children }) {
  const statusVisivel = getSaidaStatusVisivel(saida, agora);
  const local = getSaidaLocalLabel(saida);
  const kmPercorrido =
    saida.km_retorno != null && saida.km_saida != null ? saida.km_retorno - saida.km_saida : null;
  const borda =
    statusVisivel === "atrasada" ? "2px solid #ef4444"
      : destaque ? "2px solid var(--brand-accent)"
      : "1px solid var(--border-soft)";

  return (
    <div style={{
      background: "var(--card-bg)", border: borda, borderRadius: 14, padding: 14,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--brand-accent)", letterSpacing: 0.6 }}>
          {getSaidaTipoLabel(saida.tipo)}
        </span>
        <SaidaStatusBadge saida={saida} agora={agora} />
      </div>

      {saida.falecido && (
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>{saida.falecido}</div>
      )}

      {saida.agendado_para && saida.status === "aguardando" && (
        <div style={{ fontSize: 13, fontWeight: 700, color: statusVisivel === "atrasada" ? "#b91c1c" : "var(--text-main)" }}>
          <i className="fa-regular fa-clock" style={{ marginRight: 6 }} />
          Agendado: {formatAgendamento(saida.agendado_para)}
        </div>
      )}

      {saida.tipo === "avulsa" && saida.descricao && (
        <div style={{ fontSize: 14, color: "var(--text-main)" }}>{saida.descricao}</div>
      )}
      {local && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Local: {local}</div>}
      {saida.destino && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Destino: {saida.destino}</div>}
      {saida.tipo !== "avulsa" && saida.descricao && (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Obs.: {saida.descricao}</div>
      )}

      {(saida.motorista || saida.carro) && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 13, color: "var(--text-soft)",
          background: "var(--card-bg-alt)", borderRadius: 10, padding: "8px 10px", marginTop: 2,
        }}>
          {saida.motorista && <span><strong>Motorista:</strong> {saida.motorista}</span>}
          {saida.carro && <span><strong>Carro:</strong> {saida.carro}</span>}
          {saida.km_saida != null && <span><strong>KM saída:</strong> {formatKm(saida.km_saida)}</span>}
          {saida.km_retorno != null && <span><strong>KM retorno:</strong> {formatKm(saida.km_retorno)}</span>}
          {kmPercorrido != null && <span><strong>Percorrido:</strong> {formatKm(kmPercorrido)} km</span>}
        </div>
      )}

      {saida.obs_retorno && (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Retorno: {saida.obs_retorno}</div>
      )}

      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        {saida.criado_por ? `Lançado por ${saida.criado_por} · ` : ""}{formatDataHora(saida.created_at)}
        {saida.concluido_em ? ` · concluída ${formatDataHora(saida.concluido_em)}` : ""}
      </div>

      {children}
    </div>
  );
}
