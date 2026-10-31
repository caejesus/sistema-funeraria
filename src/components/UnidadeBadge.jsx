import React from "react";
import { getUnidadeAtendimento } from "../constants/unidadesAtendimento";

// Selo colorido da unidade de atendimento
export function UnidadeBadge({ value, solido = false, size = 11 }) {
  const u = getUnidadeAtendimento(value);
  if (!u) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%",
      fontSize: size, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1.2,
      padding: "4px 10px", borderRadius: 999,
      background: solido ? u.cor : u.fundo,
      color: solido ? u.texto : u.textoFundo,
      border: `1px solid ${u.cor}`,
    }}>
      {!solido && <span style={{ width: 8, height: 8, borderRadius: "50%", background: u.cor, flexShrink: 0 }} />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.label}</span>
    </span>
  );
}
