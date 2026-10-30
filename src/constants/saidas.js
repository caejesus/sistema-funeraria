// ─── Saídas da frota ──────────────────────────────────────────────────────────

// Minutos de antecedência para o aviso de saída agendada
export const SAIDA_AVISO_MINUTOS = 30;

export const SAIDA_TIPOS = {
  buscar_flores:    { label: "BUSCAR FLORES",       falecido: false, local: false, destino: false },
  entrega_esquife:  { label: "ENTREGA DE ESQUIFE",  falecido: true,  local: true,  destino: true  },
  retirada_esquife: { label: "RETIRADA DE ESQUIFE", falecido: true,  local: true,  destino: false },
  translado:        { label: "TRANSLADO",           falecido: true,  local: false, destino: true  },
  avulsa:           { label: "SAÍDA AVULSA",        falecido: false, local: false, destino: false },
};

// Tipos que o atendente pode lançar (a saída avulsa é criada pelo motorista)
export const SAIDA_TIPOS_ATENDENTE = ["buscar_flores", "entrega_esquife", "retirada_esquife", "translado"];

export const SAIDA_LOCAL_TIPOS = ["PORTO", "AEROPORTO", "OUTRO"];

export const SAIDA_STATUS = {
  aguardando:   { label: "Aguardando motorista", color: "#b45309", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  em_andamento: { label: "Em andamento",         color: "#1d4ed8", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  concluida:    { label: "Concluída",            color: "#15803d", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)" },
  cancelada:    { label: "Cancelada",            color: "#64748b", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" },
  atrasada:     { label: "Atrasada",             color: "#b91c1c", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)" },
};

export function getSaidaTipoLabel(tipo) {
  return SAIDA_TIPOS[tipo]?.label || String(tipo || "").toUpperCase();
}

export function getSaidaLocalLabel(saida) {
  return [saida?.local_tipo, saida?.local_ident].filter(Boolean).join(" – ");
}

// Status visível: uma saída aguardando com horário já passado aparece como "atrasada"
export function getSaidaStatusVisivel(saida, agora = Date.now()) {
  if (saida?.status === "aguardando" && saida?.agendado_para && new Date(saida.agendado_para).getTime() < agora) {
    return "atrasada";
  }
  return saida?.status || "aguardando";
}

export function formatAgendamento(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoje.toDateString()) return `hoje ${hora}`;
  if (d.toDateString() === amanha.toDateString()) return `amanhã ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
}

export function formatHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDataHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatKm(n) {
  if (n === null || n === undefined || n === "") return "";
  return Number(n).toLocaleString("pt-BR");
}

// "84.230" / "84230" / "84,230" → 84230
export function parseKm(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}
