import React, { useState } from "react";
import { styles } from "../styles/appStyles";
import { OPERATION_STAGES } from "../constants";
import {
  getOperationStatusLabel,
  isTransportStage,
  normalizeRole,
} from "../utils/attendance";

export function OperacionalTab({
  attendances,
  settings,
  session,
  updateOperationalStage,
  updateOperationalTransport,
  updateOperationalPerson,
}) {
  const [expandedOperations, setExpandedOperations] = useState({});

  function toggleOperationalCard(attendanceId) {
    setExpandedOperations((prev) => ({
      ...prev,
      [attendanceId]: !prev[attendanceId],
    }));
  }

  return (
    <section style={styles.moduleCard}>
      <div style={styles.moduleHeader}>
        <div>
          <h2 style={styles.moduleTitle}>Gestão de Etapas</h2>
          <p style={styles.moduleSub}>
            Controle o início e o fim de cada etapa do atendimento.
          </p>
        </div>
      </div>

      {attendances.length === 0 ? (
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Nenhum atendimento disponível</div>
          <div style={styles.modulePlaceholderText}>
            Apenas atendimentos aguardando início ou em andamento aparecem no painel operacional.
          </div>
        </div>
      ) : (
        <div style={styles.recordsList}>
          {attendances.map((item) => {
            const expanded = !!expandedOperations[item.id];
            return (
              <div key={item.id} style={styles.operationalCard}>
                <div style={styles.operationalHeader}>
                  <div style={styles.recordTop}>
                    <div>
                      <div style={styles.recordNumber}>{item.numero}</div>
                      <div style={styles.recordName}>{item.falecido || "Sem nome informado"}</div>
                      <div style={styles.recordMeta}>
                        {item.unidade ? `${item.unidade}` : "Unidade não informada"}
                        {item.sala ? ` • ${item.sala}` : ""}
                        {item.motorista ? ` • Motorista geral: ${item.motorista}` : ""}
                      </div>
                    </div>
                    <div style={styles.statusBadge}>{item.status}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      style={styles.outlineDarkBtn}
                      onClick={() => toggleOperationalCard(item.id)}
                    >
                      {expanded ? "Fechar" : "Abrir"}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div style={styles.operationGrid}>
                    {OPERATION_STAGES.map((stage) => {
                      const stageState = item.operationalStages?.[stage.key] || {
                        status: "nao_iniciado", start: "", end: "", driver: "", car: "",
                        attendant: "", technician: "", support: "",
                      };
                      const statusLabel = getOperationStatusLabel(stageState.status);
                      const statusStyle =
                        stageState.status === "finalizado"
                          ? styles.operationStatusDone
                          : stageState.status === "em_andamento"
                          ? styles.operationStatusRunning
                          : styles.operationStatusWaiting;

                      return (
                        <div key={stage.key} style={styles.operationRow}>
                          <div style={styles.operationMain}>
                            <div style={styles.operationName}>{stage.label}</div>
                            <div style={{ ...styles.operationStatusBase, ...statusStyle }}>
                              {statusLabel}
                            </div>
                          </div>

                          <div style={styles.operationTimes}>
                            <div><strong>Início:</strong> {stageState.start || "—"}</div>
                            <div><strong>Fim:</strong> {stageState.end || "—"}</div>
                          </div>

                          {stage.key === "atendimento" && (
                            <div style={styles.operationResponsibleGrid}>
                              <div style={styles.field}>
                                <label style={styles.label}>Atendente</label>
                                <select
                                  style={styles.input}
                                  value={stageState.attendant || ""}
                                  onChange={(e) =>
                                    updateOperationalPerson(item.id, stage.key, "attendant", e.target.value)
                                  }
                                >
                                  <option value="">Selecione</option>
                                  {(settings.attendants || []).map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {stage.key === "procedimentoClinico" && (
                            <div style={styles.operationResponsibleGrid}>
                              <div style={styles.field}>
                                <label style={styles.label}>Técnico</label>
                                <select
                                  style={styles.input}
                                  value={stageState.technician || ""}
                                  onChange={(e) =>
                                    updateOperationalPerson(item.id, stage.key, "technician", e.target.value)
                                  }
                                >
                                  <option value="">Selecione</option>
                                  {(settings.technicians || []).map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {stage.key === "ornamentacao" && (
                            <div style={styles.operationResponsibleGrid}>
                              <div style={styles.field}>
                                <label style={styles.label}>Apoio</label>
                                <select
                                  style={styles.input}
                                  value={stageState.support || ""}
                                  onChange={(e) =>
                                    updateOperationalPerson(item.id, stage.key, "support", e.target.value)
                                  }
                                >
                                  <option value="">Selecione</option>
                                  {(settings.supports || []).map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {isTransportStage(stage.key) && (
                            <div style={styles.operationTransportGrid}>
                              <div style={styles.field}>
                                <label style={styles.label}>Motorista</label>
                                <select
                                  style={styles.input}
                                  value={stageState.driver || ""}
                                  onChange={(e) =>
                                    updateOperationalTransport(item.id, stage.key, "driver", e.target.value)
                                  }
                                >
                                  <option value="">Selecione</option>
                                  {(settings.drivers || []).map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div style={styles.field}>
                                <label style={styles.label}>Carro</label>
                                <select
                                  style={styles.input}
                                  value={stageState.car || ""}
                                  onChange={(e) =>
                                    updateOperationalTransport(item.id, stage.key, "car", e.target.value)
                                  }
                                >
                                  <option value="">Selecione</option>
                                  {(settings.cars || []).map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {!isTransportStage(stage.key) &&
                            stage.key !== "atendimento" &&
                            stage.key !== "procedimentoClinico" &&
                            stage.key !== "ornamentacao" && <div />}

                          {(normalizeRole(session?.role) === "ADM" ||
                            normalizeRole(session?.role) === "ATENDENTE") && (
                            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                              <div style={styles.infoRow}>
                                <div style={styles.infoPill}>
                                  Iniciado por: {stageState.startedBy || "—"}
                                </div>
                                <div style={styles.infoPill}>
                                  Finalizado por: {stageState.finishedBy || "—"}
                                </div>
                              </div>
                            </div>
                          )}

                          <div style={styles.operationActions}>
                            <button
                              style={styles.outlineDarkBtn}
                              onClick={() => updateOperationalStage(item.id, stage.key, "start")}
                              disabled={stageState.status === "em_andamento"}
                            >
                              Iniciar
                            </button>
                            <button
                              style={styles.primaryBtn}
                              onClick={() => updateOperationalStage(item.id, stage.key, "finish")}
                              disabled={stageState.status === "finalizado"}
                            >
                              Finalizar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
