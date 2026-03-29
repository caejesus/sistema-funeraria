import React, { useMemo, useState } from "react";

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

  return form.horarioVelorio || "";
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

function getStatusLabel(status) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "finalizado") return "Finalizado";
  return "Aguardando início";
}

function getNextStepLabel(item) {
  const stages = item?.operationalStages || {};
  const form = item?.form || {};
  const isViagem = form.velorioTipo === "viagem";

  const order = [
    ["remocao", "Remoção"],
    ["entrega", isViagem ? "Viagem" : "Entrega"],
    ...(!isViagem ? [["sepultamento", "Sepultamento"]] : []),
  ];

  for (const [key, label] of order) {
    const status = stages[key]?.status || "nao_iniciado";
    if (status !== "finalizado") return label;
  }

  return "Concluído";
}

const colors = {
  pageBg: "#081226",
  cardBg: "#0b1830",
  blockBg: "#0d1b34",
  border: "#29415f",
  title: "#f8fafc",
  text: "#e5eefc",
  muted: "#c3d3ea",
  accent: "#7dd3fc",
  badgeBg: "#0b2244",
  badgeText: "#8fdcff",
  buttonBg: "#1d4ed8",
  buttonText: "#ffffff",
};

const styles = {
  page: {
    padding: 12,
    maxWidth: 820,
    margin: "0 auto",
    color: colors.text,
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
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 12,
    color: colors.title,
  },
  row: {
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
  actions: {
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
};

function InfoRow({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}: </span>
      <span>{value || "—"}</span>
    </div>
  );
}

export default function Equipe({
  atendimentos = [],
  updateOperationalStage,
}) {
  const ativos = useMemo(
    () =>
      atendimentos.filter(
        (item) => item.status === "Aguardando início" || item.status === "Em andamento"
      ),
    [atendimentos]
  );

  const [expandedId, setExpandedId] = useState(null);

  if (!ativos.length) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>Nenhuma ordem de serviço ativa.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {ativos.map((item) => {
        const form = item.form || {};
        const remocao = item.operationalStages?.remocao || {};
        const entrega = item.operationalStages?.entrega || {};
        const sepultamento = item.operationalStages?.sepultamento || {};
        const isViagem = form.velorioTipo === "viagem";
        const isOpen = expandedId === item.id;

        const remocaoMotorista = getDriverByStage(item, "remocao", "Remocao");
        const remocaoCarro = getCarByStage(item, "remocao", "carroRemocao");
        const remocaoApoio = getSupportByStage(item, "remocao");

        const entregaMotorista = getDriverByStage(item, "entrega", "Entrega");
        const entregaCarro = getCarByStage(item, "entrega", "carroEntrega");
        const entregaApoio = getSupportByStage(item, "entrega");

        const sepultamentoMotorista = getDriverByStage(item, "sepultamento", "Sepultamento");
        const sepultamentoCarro = getCarByStage(item, "sepultamento", "carroSepultamento");
        const sepultamentoApoio = getSupportByStage(item, "sepultamento");

        const localPrincipal = form.localObito || item.localObito || "—";
        const horarioPrincipal = isViagem
          ? getVelorioHorario(form)
          : getVelorioHorario(form) || form.horarioSepultamento || form.horaSepultamento || "—";

        return (
          <div key={item.id} style={styles.osCard}>
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
                  <div style={styles.block}>
                    <div style={styles.blockTitle}>Óbito / Remoção</div>
                    <InfoRow label="Local" value={form.localObito || item.localObito} />
                    <InfoRow label="Responsável" value={form.responsavelNome || item.responsavelNome} />
                    <InfoRow label="Contato" value={form.responsavelCelular1 || form.responsavelCelular2} />
                    <InfoRow label="Religião" value={form.religiao} />
                    <InfoRow label="Motorista" value={remocaoMotorista} />
                    <InfoRow label="Carro" value={remocaoCarro} />
                    <InfoRow label="Apoio" value={remocaoApoio} />
                    <InfoRow label="Status" value={getStatusLabel(remocao.status)} />
                  </div>

                  <div style={styles.block}>
                    <div style={styles.blockTitle}>{getVelorioTitulo(form)}</div>
                    <InfoRow label={getVelorioLabelLocal(form)} value={getVelorioLocal(form)} />
                    <InfoRow label={getVelorioLabelHorario(form)} value={getVelorioHorario(form)} />
                    {isViagem ? <InfoRow label="Embarque" value={form.embarque} /> : null}
                    <InfoRow label="Modelo da urna" value={form.modeloUrna} />
                    <InfoRow label="Cor da urna" value={form.corUrna} />
                    <InfoRow
                      label="Ornamentação"
                      value={form.ornamentacao === "sim" ? "Sim" : form.ornamentacao === "nao" ? "Não" : ""}
                    />
                    <InfoRow
                      label="Tipo"
                      value={form.tipoFlor === "naturais" ? "Natural" : form.tipoFlor === "artificiais" ? "Artificial" : ""}
                    />
                    <InfoRow label="Motorista" value={entregaMotorista} />
                    <InfoRow label="Carro" value={entregaCarro} />
                    <InfoRow label="Apoio" value={entregaApoio} />
                    <InfoRow label="Status" value={getStatusLabel(entrega.status)} />
                  </div>

                  {!isViagem && (
                    <div style={styles.block}>
                      <div style={styles.blockTitle}>Sepultamento</div>
                      <InfoRow label="Local" value={form.cemiterio || item.cemiterio} />
                      <InfoRow label="Horário" value={form.horarioSepultamento || form.horaSepultamento} />
                      <InfoRow label="Motorista" value={sepultamentoMotorista} />
                      <InfoRow label="Carro" value={sepultamentoCarro} />
                      <InfoRow label="Apoio" value={sepultamentoApoio} />
                      <InfoRow label="Status" value={getStatusLabel(sepultamento.status)} />
                    </div>
                  )}
                </div>

                {typeof updateOperationalStage === "function" ? (
                  <div style={styles.actions}>
                    {remocao.status !== "finalizado" && (
                      <>
                        <button
                          style={styles.btn}
                          onClick={() => updateOperationalStage(item.id, "remocao", "start")}
                        >
                          Iniciar remoção
                        </button>
                        <button
                          style={styles.btn}
                          onClick={() => updateOperationalStage(item.id, "remocao", "finish")}
                        >
                          Finalizar remoção
                        </button>
                      </>
                    )}

                    {entrega.status !== "finalizado" && (
                      <>
                        <button
                          style={styles.btn}
                          onClick={() => updateOperationalStage(item.id, "entrega", "start")}
                        >
                          Iniciar {isViagem ? "viagem" : "entrega"}
                        </button>
                        <button
                          style={styles.btn}
                          onClick={() => updateOperationalStage(item.id, "entrega", "finish")}
                        >
                          Finalizar {isViagem ? "viagem" : "entrega"}
                        </button>
                      </>
                    )}

                    {!isViagem && sepultamento.status !== "finalizado" && (
                      <>
                        <button
                          style={styles.btn}
                          onClick={() => updateOperationalStage(item.id, "sepultamento", "start")}
                        >
                          Iniciar sepultamento
                        </button>
                        <button
                          style={styles.btn}
                          onClick={() => updateOperationalStage(item.id, "sepultamento", "finish")}
                        >
                          Finalizar sepultamento
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
