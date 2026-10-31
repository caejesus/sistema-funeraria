import React, { useMemo, useState } from "react";
import {
  HORARIOS_MANHA,
  HORARIOS_TARDE,
  getHorariosOcupados,
  isHorarioPadrao,
  formatHorarioLabel,
} from "../constants/horariosSaida";

// Escolha do horário de saída: botões com horários fixos (um por atendimento por dia)
// e "Outro horário" para digitar livremente (não bloqueia, permite repetir horário).
export function HorarioSaidaPicker({ form, updateForm, atendimentos, editingId, styles }) {
  const manualAtivo = !!form.horaSaidaManual || (!!form.horaSaida && !isHorarioPadrao(form.horaSaida));
  const [mostrarManual, setMostrarManual] = useState(manualAtivo);

  const ocupados = useMemo(
    () => getHorariosOcupados(atendimentos, form.dataSaida, editingId),
    [atendimentos, form.dataSaida, editingId]
  );

  function escolher(hora) {
    updateForm("horaSaida", hora);
    updateForm("horaSaidaManual", false);
    setMostrarManual(false);
  }

  function abrirManual() {
    setMostrarManual(true);
    updateForm("horaSaidaManual", true);
    if (isHorarioPadrao(form.horaSaida) && !form.horaSaidaManual) updateForm("horaSaida", "");
  }

  const renderGrupo = (titulo, horarios) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {titulo}
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: 8 }}>
        {horarios.map((hora) => {
          const dono = ocupados[hora];
          const selecionado = !form.horaSaidaManual && form.horaSaida === hora;
          const bloqueado = !!dono && !selecionado;
          return (
            <button
              key={hora}
              type="button"
              disabled={bloqueado}
              onClick={() => escolher(hora)}
              title={bloqueado ? `Ocupado: ${dono}` : `Saída às ${formatHorarioLabel(hora)}`}
              style={{
                minHeight: 52, borderRadius: 12, padding: "6px 4px", cursor: bloqueado ? "not-allowed" : "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                border: selecionado ? "2px solid var(--brand-accent)" : "1px solid var(--input-border)",
                background: selecionado ? "var(--brand-accent)" : bloqueado ? "var(--card-bg-alt)" : "var(--input-bg)",
                color: selecionado ? "#fff" : bloqueado ? "var(--text-muted)" : "var(--text-main)",
                opacity: bloqueado ? 0.75 : 1,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, textDecoration: bloqueado ? "line-through" : "none" }}>
                {formatHorarioLabel(hora)}
              </span>
              {bloqueado && (
                <span style={{ fontSize: 9, fontWeight: 600, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px" }}>
                  {dono}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ ...styles.fieldWide, gridColumn: "1 / -1" }}>
      <label style={styles.label}>Hora/Saída</label>
      {!form.dataSaida && (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Escolha a data de saída para ver os horários livres.</span>
      )}

      {renderGrupo("Manhã", HORARIOS_MANHA)}
      {renderGrupo("Tarde", HORARIOS_TARDE)}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
        {!mostrarManual ? (
          <button
            type="button"
            onClick={abrirManual}
            style={{ background: "none", border: "1px dashed var(--input-border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "var(--brand-accent)", cursor: "pointer" }}
          >
            <i className="fa-regular fa-clock" style={{ marginRight: 6 }} />Outro horário
          </button>
        ) : (
          <>
            <input
              type="time"
              style={{ ...styles.input, maxWidth: 160, borderColor: form.horaSaidaManual ? "var(--brand-accent)" : undefined }}
              value={form.horaSaidaManual ? form.horaSaida || "" : ""}
              onChange={(e) => {
                updateForm("horaSaidaManual", true);
                updateForm("horaSaida", e.target.value);
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)", flex: "1 1 220px" }}>
              Horário digitado não bloqueia a agenda — use quando mais de um veículo sai no mesmo horário.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
