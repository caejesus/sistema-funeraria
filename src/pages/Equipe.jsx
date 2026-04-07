
import React, { useEffect, useMemo, useState } from "react";
import notificationSound from "../assets/notificacao.mp3";

function formatDateBR(date) {
  if (!date) return "";
  const [year, month, day] = String(date).split("-");
  if (!year || !month || !day) return String(date);
  return `${day}/${month}/${year}`;
}

function getVelorioLocal(form = {}) {
  if (form.velorioTipo === "funeraria") {
    return [form.velorioUnidade, form.velorioSala].filter(Boolean).join(" - ");
  }

  if (form.velorioTipo === "viagem") {
    return form.cidadeDestino || "";
  }

  return [
    form.velorioNomeLocal,
    form.velorioEndereco,
    form.velorioNumero,
    form.velorioBairro,
  ]
    .filter(Boolean)
    .join(", ");
}

function getVelorioTitulo(form = {}) {
  return form.velorioTipo === "viagem" ? "Viagem / Entrega" : "Velório / Entrega";
}

function getVelorioLabelLocal(form = {}) {
  return form.velorioTipo === "viagem" ? "Destino" : "Local";
}

function getVelorioLabelHorario(form = {}) {
  return form.velorioTipo === "viagem" ? "Saída" : "Início";
}

function getVelorioHorario(form = {}) {
  if (form.velorioTipo === "viagem") {
    const data = formatDateBR(form.dataSaida);
    const hora = form.horaSaida || "";
    return [data, hora].filter(Boolean).join(" ");
  }

  return form.inicioAs || "";
}

function getSepultamentoHorario(form = {}) {
  const data = formatDateBR(form.dataSaida);
  const hora = form.horaSaida || "";
  return [data, hora].filter(Boolean).join(" ");
}

function getSupportByStage(record, stageKey) {
  const form = record?.form || {};
  const stage = record?.operationalStages?.[stageKey] || {};

  return (
    stage.support ||
    form[`apoio${stageKey.charAt(0).toUpperCase() + stageKey.slice(1)}`] ||
    form.apoio ||
    ""
  );
}

function getDriverByStage(record, stageKey, fallbackField) {
  const form = record?.form || {};
  const stage = record?.operationalStages?.[stageKey] || {};
  return stage.driver || form[fallbackField] || "";
}

function getCarByStage(record, stageKey, fallbackField) {
  const form = record?.form || {};
  const stage = record?.operationalStages?.[stageKey] || {};
  return stage.car || form[fallbackField] || "";
}

function getTechnician(record) {
  const form = record?.form || {};
  const stage = record?.operationalStages?.procedimentoClinico || {};
  return stage.technician || form.tecnico || "";
}

function getTanatoValue(form = {}) {
  const raw =
    form.tanato ??
    form.tanatopraxia ??
    form.conservacao ??
    form.procedimentoClinico ??
    "";

  const normalized = String(raw).trim().toLowerCase();

  if (["sim", "s", "yes", "true", "1"].includes(normalized)) return "Sim";
  if (["nao", "não", "n", "no", "false", "0"].includes(normalized)) return "Não";

  return "";
}

function getOrnamentacaoValue(form = {}) {
  const raw = form.ornamentacao ?? "";
  const normalized = String(raw).trim().toLowerCase();

  if (["sim", "s", "yes", "true", "1"].includes(normalized)) return "Sim";
  if (["nao", "não", "n", "no", "false", "0"].includes(normalized)) return "Não";

  return "";
}

function normalizeStageStatus(status) {
  if (status === "cancelado") return "cancelado";
  if (status === "em_andamento") return "em_andamento";
  if (status === "finalizado") return "finalizado";
  return "nao_iniciado";
}

function getStageDisplayStatus(status, options = {}) {
  const normalized = normalizeStageStatus(status);

  if (options.forceCancelled) return "cancelado";
  return normalized;
}

function getStatusLabel(status) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "finalizado") return "Finalizado";
  if (status === "cancelado") return "Cancelado";
  return "Aguardando início";
}

function getNextStepLabel(item) {
  const stages = item?.operationalStages || {};
  const form = item?.form || {};
  const isViagem = form.velorioTipo === "viagem";
  const tanatoValue = getTanatoValue(form);
  const ornamentacaoValue = getOrnamentacaoValue(form);

  const order = [
    ["remocao", "Remoção", false],
    ["procedimentoClinico", "Procedimento", tanatoValue === "Não"],
    ["ornamentacao", "Ornamentação", ornamentacaoValue === "Não"],
    ["entrega", isViagem ? "Viagem" : "Entrega", false],
    ...(!isViagem ? [["sepultamento", "Sepultamento", false]] : []),
  ];

  for (const [key, label, skip] of order) {
    if (skip) continue;
    const status = normalizeStageStatus(stages[key]?.status);
    if (status !== "finalizado") return label;
  }

  return "Concluído";
}

const colors = {
  pageBg: "#08111f",
  cardBg: "#0b1830",
  blockBg: "#0d1b34",
  border: "#29415f",
  activeBorder: "#26b1c4",
  title: "#f8fafc",
  text: "#e5eefc",
  muted: "#c3d3ea",
  accent: "#7dd3fc",
  badgeBg: "#0b2244",
  badgeText: "#8fdcff",
  buttonBg: "#26b1c4",
  buttonText: "#ffffff",
  waitingBg: "#1f2937",
  waitingText: "#d1d5db",
  runningBg: "#5b3a00",
  runningText: "#fde68a",
  doneBg: "#123c2f",
  doneText: "#86efac",
  cancelledBg: "#3f1d1d",
  cancelledText: "#fca5a5",
  newCardBorder: "#38bdf8",
  newCardGlow: "rgba(56,189,248,0.18)",
  newTagBg: "#0ea5e9",
  newTagText: "#ffffff",
};

const styles = {
  page: {
    padding: 12,
    maxWidth: 860,
    margin: "0 auto",
    color: colors.text,
    minHeight: "100vh",
    background: colors.pageBg,
  },
  header: {
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  headerTitle: {
    color: colors.accent,
    fontWeight: 800,
    fontSize: 20,
  },
  headerHint: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: 700,
  },
  empty: {
    padding: 18,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    background: colors.cardBg,
    color: colors.text,
  },
  osCard: {
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    background: colors.cardBg,
    boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
    marginBottom: 14,
    overflow: "hidden",
  },
  osCardNew: {
    border: `1px solid ${colors.newCardBorder}`,
    boxShadow: `0 0 0 1px rgba(56,189,248,0.18), 0 12px 28px rgba(0,0,0,0.18), 0 0 24px ${colors.newCardGlow}`,
  },
  osButton: {
    width: "100%",
    background: "transparent",
    border: "none",
    padding: 14,
    textAlign: "left",
    color: colors.text,
    cursor: "pointer",
  },
  osTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  osTitleWrap: {
    minWidth: 0,
    flex: 1,
  },
  osNumber: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
    fontWeight: 600,
  },
  osTitle: {
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1.2,
    color: colors.title,
    wordBreak: "break-word",
  },
  newTag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: colors.newTagBg,
    color: colors.newTagText,
    fontSize: 12,
    fontWeight: 800,
    marginTop: 8,
    width: "fit-content",
  },
  osSummary: {
    marginTop: 10,
    display: "grid",
    gap: 6,
    fontSize: 15,
    lineHeight: 1.4,
    color: colors.text,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: colors.badgeBg,
    color: colors.badgeText,
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
    height: "fit-content",
  },
  osFooter: {
    marginTop: 12,
    fontSize: 13,
    color: colors.muted,
    fontWeight: 600,
  },
  details: {
    padding: "0 14px 14px",
  },
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "1fr",
  },
  block: {
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 14,
    background: colors.blockBg,
    transition: "all 0.2s ease",
  },
  blockActive: {
    border: `1px solid ${colors.activeBorder}`,
    boxShadow: "0 0 0 2px rgba(38,177,196,0.18)",
  },
  blockHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: colors.title,
  },
  row: {
    marginBottom: 9,
    lineHeight: 1.45,
    fontSize: 15,
    wordBreak: "break-word",
    color: colors.text,
  },
  inlineLine: {
    marginBottom: 9,
    lineHeight: 1.45,
    fontSize: 15,
    wordBreak: "break-word",
    color: colors.text,
  },
  label: {
    color: colors.accent,
    fontWeight: 800,
  },
  stageActions: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  btn: {
    borderRadius: 12,
    padding: "14px 16px",
    border: "none",
    background: colors.buttonBg,
    color: colors.buttonText,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 15,
    width: "100%",
  },
  btnDisabled: {
    borderRadius: 12,
    padding: "14px 16px",
    border: `1px solid ${colors.border}`,
    background: "#14243f",
    color: colors.muted,
    cursor: "default",
    fontWeight: 800,
    fontSize: 15,
    width: "100%",
  },
};

function InfoRow({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}: </span>
      <span>{value || "—"}</span>
    </div>
  );
}

function InlineInfo({ value }) {
  return <div style={styles.inlineLine}>{value || "—"}</div>;
}

function StatusBadge({ status }) {
  const normalized = status || "nao_iniciado";

  let bg = colors.waitingBg;
  let text = colors.waitingText;

  if (normalized === "em_andamento") {
    bg = colors.runningBg;
    text = colors.runningText;
  }

  if (normalized === "finalizado") {
    bg = colors.doneBg;
    text = colors.doneText;
  }

  if (normalized === "cancelado") {
    bg = colors.cancelledBg;
    text = colors.cancelledText;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: bg,
        color: text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {getStatusLabel(normalized)}
    </span>
  );
}

function StageButtons({
  itemId,
  stageKey,
  stageLabel,
  status,
  updateOperationalStage,
}) {
  if (typeof updateOperationalStage !== "function") return null;

  if (status === "cancelado") return null;

  if (status === "finalizado") {
    return <button style={styles.btnDisabled}>Etapa concluída</button>;
  }

  return (
    <div style={styles.stageActions}>
      {status !== "em_andamento" && (
        <button
          type="button"
          style={styles.btn}
          onClick={() => updateOperationalStage(itemId, stageKey, "start")}
        >
          Iniciar {stageLabel.toLowerCase()}
        </button>
      )}

      {status === "em_andamento" && (
        <button
          type="button"
          style={styles.btn}
          onClick={() => updateOperationalStage(itemId, stageKey, "finish")}
        >
          Finalizar {stageLabel.toLowerCase()}
        </button>
      )}
    </div>
  );
}

export default function Equipe({
  atendimentos = [],
  updateOperationalStage,
}) {
  const ativos = useMemo(() => {
    const lista = Array.isArray(atendimentos) ? atendimentos.filter(Boolean) : [];

    return lista.filter(
      (item) =>
        item &&
        ["Aguardando início", "Em andamento", "Em progresso"].includes(item.status)
    );
  }, [atendimentos]);

  const [expandedId, setExpandedId] = useState(null);
  const [idsVistos, setIdsVistos] = useState([]);
  const [idsRecentes, setIdsRecentes] = useState([]);
  const [audioLiberado, setAudioLiberado] = useState(false);

  useEffect(() => {
    const liberarAudio = () => setAudioLiberado(true);

    window.addEventListener("pointerdown", liberarAudio, { once: true });
    window.addEventListener("keydown", liberarAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", liberarAudio);
      window.removeEventListener("keydown", liberarAudio);
    };
  }, []);

  useEffect(() => {
    if (!ativos.length) return;

    const novos = ativos.filter((item) => !idsVistos.includes(item.id));
    if (!novos.length) return;

    const novosIds = novos.map((item) => item.id);

    setIdsVistos((prev) => [...prev, ...novosIds]);
    setIdsRecentes((prev) => [...new Set([...prev, ...novosIds])]);

    if (audioLiberado) {
      try {
        const audio = new Audio(notificationSound);
        audio.play().catch(() => {});
      } catch (error) {
        console.log("Som bloqueado pelo navegador");
      }
    }

    const timer = window.setTimeout(() => {
      setIdsRecentes((prev) => prev.filter((id) => !novosIds.includes(id)));
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [ativos, idsVistos, audioLiberado]);

  if (!ativos.length) {
    return (
      <div style={styles.page}>
        <style>{`@keyframes pulse-alert { 0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.28); } 70% { box-shadow: 0 0 0 12px rgba(56,189,248,0); } 100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); } }`}</style>
        <div style={styles.header}>
          <div style={styles.headerTitle}>Tela da equipe</div>
          <div style={styles.headerHint}>
            {audioLiberado ? "Alerta sonoro ativado" : "Clique na tela para liberar o alerta sonoro"}
          </div>
        </div>
        <div style={styles.empty}>Nenhuma ordem de serviço ativa.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`@keyframes pulse-alert { 0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.28); } 70% { box-shadow: 0 0 0 12px rgba(56,189,248,0); } 100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); } }`}</style>

      <div style={styles.header}>
        <div style={styles.headerTitle}>Tela da equipe</div>
        <div style={styles.headerHint}>
          {audioLiberado ? "Alerta sonoro ativado" : "Clique na tela para liberar o alerta sonoro"}
        </div>
      </div>

      {ativos.map((item) => {
        const form = item.form || {};
        const remocao = item.operationalStages?.remocao || {};
        const procedimento = item.operationalStages?.procedimentoClinico || {};
        const ornamentacao = item.operationalStages?.ornamentacao || {};
        const entrega = item.operationalStages?.entrega || {};
        const sepultamento = item.operationalStages?.sepultamento || {};
        const isViagem = form.velorioTipo === "viagem";
        const isOpen = expandedId === item.id;
        const isNovo = idsRecentes.includes(item.id);

        const tanatoValue = getTanatoValue(form);
        const ornamentacaoValue = getOrnamentacaoValue(form);

        const procedimentoStatus = getStageDisplayStatus(procedimento.status, {
          forceCancelled: tanatoValue === "Não",
        });

        const ornamentacaoStatus = getStageDisplayStatus(ornamentacao.status, {
          forceCancelled: ornamentacaoValue === "Não",
        });

        const remocaoMotorista = getDriverByStage(item, "remocao", "Remocao");
        const remocaoCarro = getCarByStage(item, "remocao", "carroRemocao");

        const entregaMotorista = getDriverByStage(item, "entrega", "Entrega");
        const entregaCarro = getCarByStage(item, "entrega", "carroEntrega");

        const sepultamentoMotorista = getDriverByStage(item, "sepultamento", "Sepultamento");
        const tecnico = getTechnician(item);

        const localPrincipal = form.localObito || item.localObito || "—";
        const horarioPrincipal = isViagem
          ? getVelorioHorario(form)
          : getVelorioHorario(form) || getSepultamentoHorario(form) || "—";

        return (
          <div
            key={item.id}
            style={{
              ...styles.osCard,
              ...(isNovo ? styles.osCardNew : {}),
              ...(isNovo ? { animation: "pulse-alert 1.2s ease-in-out infinite" } : {}),
            }}
          >
            <button
              type="button"
              style={styles.osButton}
              onClick={() => setExpandedId(isOpen ? null : item.id)}
            >
              <div style={styles.osTop}>
                <div style={styles.osTitleWrap}>
                  <div style={styles.osNumber}>{item.numero || "Ordem de serviço"}</div>
                  <div style={styles.osTitle}>
                    {item.falecido || form.falecido || "Sem nome informado"}
                  </div>
                  {isNovo ? <div style={styles.newTag}>NOVA O.S.</div> : null}
                </div>

                <div style={styles.badge}>{item.status || "Aguardando início"}</div>
              </div>

              <div style={styles.osSummary}>
                <div><span style={styles.label}>Local principal: </span>{localPrincipal}</div>
                <div><span style={styles.label}>Próxima etapa: </span>{getNextStepLabel(item)}</div>
                <div><span style={styles.label}>Horário: </span>{horarioPrincipal || "—"}</div>
              </div>

              <div style={styles.osFooter}>
                {isOpen ? "Toque para recolher" : "Toque para abrir a ordem de serviço"}
              </div>
            </button>

            {isOpen && (
              <div style={styles.details}>
                <div style={styles.grid}>
                  <div
                    style={{
                      ...styles.block,
                      ...(remocao.status === "em_andamento" ? styles.blockActive : {}),
                    }}
                  >
                    <div style={styles.blockHeader}>
                      <div style={styles.blockTitle}>Remoção</div>
                      <StatusBadge status={normalizeStageStatus(remocao.status)} />
                    </div>

                    <InfoRow label="Local do óbito" value={form.localObito || item.localObito} />
                    <InlineInfo value={[remocaoMotorista, remocaoCarro].filter(Boolean).join(" - ")} />

                    <StageButtons
                      itemId={item.id}
                      stageKey="remocao"
                      stageLabel="Remoção"
                      status={normalizeStageStatus(remocao.status)}
                      updateOperationalStage={updateOperationalStage}
                    />
                  </div>

                  <div
                    style={{
                      ...styles.block,
                      ...(procedimentoStatus === "em_andamento" ? styles.blockActive : {}),
                    }}
                  >
                    <div style={styles.blockHeader}>
                      <div style={styles.blockTitle}>Procedimento</div>
                      <StatusBadge status={procedimentoStatus} />
                    </div>

                    <InfoRow label="Tanatopraxia" value={tanatoValue} />
                    <InfoRow label="Técnico" value={tecnico} />

                    <StageButtons
                      itemId={item.id}
                      stageKey="procedimentoClinico"
                      stageLabel="Procedimento"
                      status={procedimentoStatus}
                      updateOperationalStage={updateOperationalStage}
                    />
                  </div>

                  <div
                    style={{
                      ...styles.block,
                      ...(ornamentacaoStatus === "em_andamento" ? styles.blockActive : {}),
                    }}
                  >
                    <div style={styles.blockHeader}>
                      <div style={styles.blockTitle}>Ornamentação</div>
                      <StatusBadge status={ornamentacaoStatus} />
                    </div>

                    <InfoRow label="Ornamentação" value={ornamentacaoValue} />
                    <InfoRow
                      label="Tipo"
                      value={
                        form.tipoFlor === "naturais"
                          ? "Natural"
                          : form.tipoFlor === "artificiais"
                            ? "Artificial"
                            : ""
                      }
                    />
                    <InfoRow
                      label="Urna"
                      value={[form.modeloUrna, form.corUrna].filter(Boolean).join(" - ")}
                    />

                    <StageButtons
                      itemId={item.id}
                      stageKey="ornamentacao"
                      stageLabel="Ornamentação"
                      status={ornamentacaoStatus}
                      updateOperationalStage={updateOperationalStage}
                    />
                  </div>

                  <div
                    style={{
                      ...styles.block,
                      ...(entrega.status === "em_andamento" ? styles.blockActive : {}),
                    }}
                  >
                    <div style={styles.blockHeader}>
                      <div style={styles.blockTitle}>{isViagem ? "Entrega / Viagem" : "Entrega"}</div>
                      <StatusBadge status={normalizeStageStatus(entrega.status)} />
                    </div>

                    <InfoRow label={getVelorioLabelLocal(form)} value={getVelorioLocal(form)} />
                    <InfoRow label={getVelorioLabelHorario(form)} value={getVelorioHorario(form)} />
                    {isViagem ? <InfoRow label="Embarque" value={form.embarque} /> : null}
                    <InlineInfo value={[entregaMotorista, entregaCarro].filter(Boolean).join(" - ")} />

                    <StageButtons
                      itemId={item.id}
                      stageKey="entrega"
                      stageLabel={isViagem ? "Viagem" : "Entrega"}
                      status={normalizeStageStatus(entrega.status)}
                      updateOperationalStage={updateOperationalStage}
                    />
                  </div>

                  {!isViagem && (
                    <div
                      style={{
                        ...styles.block,
                        ...(sepultamento.status === "em_andamento" ? styles.blockActive : {}),
                      }}
                    >
                      <div style={styles.blockHeader}>
                        <div style={styles.blockTitle}>Sepultamento</div>
                        <StatusBadge status={normalizeStageStatus(sepultamento.status)} />
                      </div>

                      <InfoRow label="Cemitério" value={form.cemiterio || item.cemiterio} />
                      <InfoRow label="Hora de saída" value={getSepultamentoHorario(form)} />
                      {sepultamentoMotorista ? (
                        <InfoRow label="Motorista" value={sepultamentoMotorista} />
                      ) : null}

                      <StageButtons
                        itemId={item.id}
                        stageKey="sepultamento"
                        stageLabel="Sepultamento"
                        status={normalizeStageStatus(sepultamento.status)}
                        updateOperationalStage={updateOperationalStage}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
