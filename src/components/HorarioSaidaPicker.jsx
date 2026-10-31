import React, { useMemo, useState } from "react";
import {
  HORARIOS_MANHA,
  HORARIOS_TARDE,
  getHorariosOcupados,
  isHorarioPadrao,
  formatHorarioLabel,
} from "../constants/horariosSaida";

const OUTRO = "__outro__";

// Hora de saída: lista suspensa só com os horários livres do dia
// + "Outro horário" para digitar (não bloqueia, permite repetir horário).
export function HorarioSaidaPicker({ form, updateForm, atendimentos, editingId, styles }) {
  const manualInicial = !!form.horaSaidaManual || (!!form.horaSaida && !isHorarioPadrao(form.horaSaida));
  const [manual, setManual] = useState(manualInicial);

  const ocupados = useMemo(
    () => getHorariosOcupados(atendimentos, form.dataSaida, editingId),
    [atendimentos, form.dataSaida, editingId]
  );

  const livres = (lista) => lista.filter((h) => !ocupados[h] || h === form.horaSaida);
  const manha = livres(HORARIOS_MANHA);
  const tarde = livres(HORARIOS_TARDE);
  const totalOcupados = Object.keys(ocupados).length;

  // O horário atual ficou ocupado por outro atendimento (ex.: marcado ao mesmo tempo)
  const conflito = !manual && form.horaSaida && ocupados[form.horaSaida];

  function onSelect(e) {
    const v = e.target.value;
    if (v === OUTRO) {
      setManual(true);
      updateForm("horaSaidaManual", true);
      updateForm("horaSaida", "");
      return;
    }
    setManual(false);
    updateForm("horaSaidaManual", false);
    updateForm("horaSaida", v);
  }

  return (
    <div style={styles.field}>
      <label style={styles.label}>Hora/Saída</label>
      <select style={styles.input} value={manual ? OUTRO : form.horaSaida || ""} onChange={onSelect}>
        <option value="">Selecione</option>
        {manha.length > 0 && (
          <optgroup label="Manhã">
            {manha.map((h) => <option key={h} value={h}>{formatHorarioLabel(h)}</option>)}
          </optgroup>
        )}
        {tarde.length > 0 && (
          <optgroup label="Tarde">
            {tarde.map((h) => <option key={h} value={h}>{formatHorarioLabel(h)}</option>)}
          </optgroup>
        )}
        <option value={OUTRO}>Outro horário (digitar)</option>
      </select>

      {manual && (
        <input
          type="time"
          style={styles.input}
          value={form.horaSaida || ""}
          onChange={(e) => {
            updateForm("horaSaidaManual", true);
            updateForm("horaSaida", e.target.value);
          }}
        />
      )}

      {conflito ? (
        <span style={styles.errorText}>Este horário já foi marcado para {ocupados[form.horaSaida]}. Escolha outro.</span>
      ) : manual ? (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Horário digitado não bloqueia a agenda.</span>
      ) : form.dataSaida && totalOcupados > 0 ? (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {totalOcupados} horário(s) já ocupado(s) neste dia.
        </span>
      ) : null}
    </div>
  );
}
