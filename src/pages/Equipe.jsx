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

const styles = {
  page: {
    padding: 12,
    maxWidth: 760,
    margin: "0 auto",
  },
  empty: {
    padding: 18,
    border: "1px solid var(--border-soft, #334155)",
    borderRadius: 16,
    background: "var(--card-bg, #111827)",
  },
  osCard: {
    border: "1px solid var(--border-soft, #334155)",
    borderRadius: 16,
    background: "var(--card-bg, #111827)",
    boxShadow: "var(--shadow-main, 0 12px 28px rgba(0,0,0,0.28))",
    marginBottom: 14,
    overflow: "hidden",
  },
  osButton: {
    width: "100%",
    background: "transparent",
    border: "none",
    padding: 14,
    textAlign: "left",
    color: "var(--text-main, #e5e7eb)",
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
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
  osTitle: {
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1.2,
    wordBreak: "break-word",
  },
  osSummary: {
    marginTop: 10,
    display: "grid",
    gap: 6,
    fontSize: 14,
    lineHeight: 1.35,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--status-border, #334155)",
    background: "var(--status-bg, #0f172a)",
    color: "var(--status-text, #7dd3fc)",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
    height: "fit-content",
  },
  osFooter: {
    marginTop: 12,
    fontSize: 13,
    opacity: 0.9,
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
    border: "1px solid var(--border-soft, #334155)",
    borderRadius: 14,
    padding: 14,
    background: "var(--card-bg-soft, #0f172a)",
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 12,
  },
  row: {
    marginBottom: 8,
    lineHeight: 1.45,
    fontSize: 15,
    wordBreak: "break-word",
  },
  actions: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  btn: {
    borderRadius: 12,
    padding: "14px 16px",
    border: "1px solid var(--outline-border, #334155)",
    background: "var(--outline-bg, #1e293b)",
    color: "var(--outline-text, #e2e8f0)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    width: "100%",
  },
};

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
                <div><strong>Local principal:</strong> {localPrincipal}</div>
                <div><strong>Próxima etapa:</strong> {getNextStepLabel(item)}</div>
                <div><strong>Horário:</strong> {horarioPrincipal || "—"}</div>
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
                    <div style={styles.row}><strong>Local:</strong> {form.localObito || item.localObito || "—"}</div>
                    <div style={styles.row}><strong>Responsável:</strong> {form.responsavelNome || item.responsavelNome || "—"}</div>
                    <div style={styles.row}><strong>Contato:</strong> {form.responsavelCelular1 || form.responsavelCelular2 || "—"}</div>
                    <div style={styles.row}><strong>Religião:</strong> {form.religiao || "—"}</div>
                    <div style={styles.row}><strong>Motorista:</strong> {remocaoMotorista || "—"}</div>
                    <div style={styles.row}><strong>Carro:</strong> {remocaoCarro || "—"}</div>
                    <div style={styles.row}><strong>Apoio:</strong> {remocaoApoio || "—"}</div>
                    <div style={styles.row}><strong>Status:</strong> {getStatusLabel(remocao.status)}</div>
                  </div>

                  <div style={styles.block}>
                    <div style={styles.blockTitle}>{getVelorioTitulo(form)}</div>
                    <div style={styles.row}><strong>{getVelorioLabelLocal(form)}:</strong> {getVelorioLocal(form) || "—"}</div>
                    <div style={styles.row}><strong>{getVelorioLabelHorario(form)}:</strong> {getVelorioHorario(form) || "—"}</div>
                    {isViagem ? (
                      <div style={styles.row}><strong>Embarque:</strong> {form.embarque || "—"}</div>
                    ) : null}
                    <div style={styles.row}><strong>Modelo da urna:</strong> {form.modeloUrna || "—"}</div>
                    <div style={styles.row}><strong>Cor da urna:</strong> {form.corUrna || "—"}</div>
                    <div style={styles.row}>
                      <strong>Ornamentação:</strong> {form.ornamentacao === "sim" ? "Sim" : form.ornamentacao === "nao" ? "Não" : "—"}
                    </div>
                    <div style={styles.row}>
                      <strong>Tipo:</strong> {form.tipoFlor === "naturais" ? "Natural" : form.tipoFlor === "artificiais" ? "Artificial" : "—"}
                    </div>
                    <div style={styles.row}><strong>Motorista:</strong> {entregaMotorista || "—"}</div>
                    <div style={styles.row}><strong>Carro:</strong> {entregaCarro || "—"}</div>
                    <div style={styles.row}><strong>Apoio:</strong> {entregaApoio || "—"}</div>
                    <div style={styles.row}><strong>Status:</strong> {getStatusLabel(entrega.status)}</div>
                  </div>

                  {!isViagem && (
                    <div style={styles.block}>
                      <div style={styles.blockTitle}>Sepultamento</div>
                      <div style={styles.row}><strong>Local:</strong> {form.cemiterio || item.cemiterio || "—"}</div>
                      <div style={styles.row}><strong>Horário:</strong> {form.horarioSepultamento || form.horaSepultamento || "—"}</div>
                      <div style={styles.row}><strong>Motorista:</strong> {sepultamentoMotorista || "—"}</div>
                      <div style={styles.row}><strong>Carro:</strong> {sepultamentoCarro || "—"}</div>
                      <div style={styles.row}><strong>Apoio:</strong> {sepultamentoApoio || "—"}</div>
                      <div style={styles.row}><strong>Status:</strong> {getStatusLabel(sepultamento.status)}</div>
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
