// ─── Horários de saída pré-definidos ──────────────────────────────────────────
// Cada horário só pode ser usado por um atendimento por dia.
// "Outro horário" (digitado) não bloqueia ninguém: serve para casos em que
// mais de um veículo sai no mesmo horário.

export const HORARIOS_MANHA = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30"];
export const HORARIOS_TARDE = ["12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"];
export const HORARIOS_SAIDA = [...HORARIOS_MANHA, ...HORARIOS_TARDE];

export function isHorarioPadrao(hora) {
  return HORARIOS_SAIDA.includes(hora);
}

// Mapa "HH:MM" → nome do falecido, com os horários padrão já ocupados naquela data
export function getHorariosOcupados(atendimentos, dataSaida, ignorarId) {
  const ocupados = {};
  if (!dataSaida) return ocupados;
  (atendimentos || []).forEach((item) => {
    if (!item || String(item.id) === String(ignorarId)) return;
    const f = item.form || {};
    if (f.dataSaida !== dataSaida) return;
    if (f.horaSaidaManual) return;
    if (!isHorarioPadrao(f.horaSaida)) return;
    ocupados[f.horaSaida] = f.falecido || item.falecido || "Outro atendimento";
  });
  return ocupados;
}

export function formatHorarioLabel(hora) {
  if (!hora) return "";
  const [h, m] = hora.split(":");
  return m === "00" ? `${h}h` : `${h}:${m}`;
}

// ─── Salas de velório ─────────────────────────────────────────────────────────
// Uma sala fica ocupada enquanto houver atendimento ativo nela: não concluído
// e com a data de saída hoje ou no futuro (ou ainda sem data de saída).

function hojeISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Mapa "Unidade" → { "Sala": nome do falecido }
export function getSalasOcupadas(atendimentos, ignorarId) {
  const hoje = hojeISO();
  const mapa = {};
  (atendimentos || []).forEach((item) => {
    if (!item || String(item.id) === String(ignorarId)) return;
    if (item.status === "Concluído") return;
    const f = item.form || {};
    if (f.velorioTipo && f.velorioTipo !== "funeraria") return;
    if (!f.velorioUnidade || !f.velorioSala) return;
    if (f.dataSaida && f.dataSaida < hoje) return;
    mapa[f.velorioUnidade] = mapa[f.velorioUnidade] || {};
    mapa[f.velorioUnidade][f.velorioSala] = f.falecido || item.falecido || "Outro atendimento";
  });
  return mapa;
}
