import React, { useEffect, useMemo, useState } from "react";
import notificationSound from "../assets/notificacao.mp3";
import "./equipe.css";

function formatDateBR(date) {
  if (!date) return "";
  const [year, month, day] = String(date).split("-");
  if (!year || !month || !day) return String(date);
  return `${day}/${month}/${year}`;
}

function normalizeChoice(value) {
  if (value === true) return "sim";
  if (value === false) return "nao";
  const normalized = String(value || "").trim().toLowerCase();

  if (["sim", "s", "yes", "true", "1"].includes(normalized)) return "sim";
  if (
    ["nao", "não", "n", "no", "false", "0", "cancelado", "nenhum"].includes(
      normalized
    )
  ) {
    return "nao";
  }

  return "";
}

function getTanatoValue(form = {}) {
  return (
    normalizeChoice(form.tanato) ||
    normalizeChoice(form.tanatopraxia) ||
    normalizeChoice(form.conservacao) ||
    normalizeChoice(form.procedimentoClinico)
  );
}

function getOrnamentacaoValue(form = {}) {
  return normalizeChoice(form.ornamentacao);
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
  return form.velorioTipo === "viagem" ? "Viagem / Entrega" : "Entrega";
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

function getStatusLabel(status) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "finalizado") return "Finalizado";
  if (status === "cancelado") return "Cancelado";
  return "Aguardando início";
}

function getStatusClass(status) {
  if (status === "em_andamento") return "running";
  if (status === "finalizado") return "done";
  if (status === "cancelado") return "cancelled";
  return "waiting";
}

function getEffectiveStageStatus(item, stageKey) {
  const form = item?.form || {};
  const stage = item?.operationalStages?.[stageKey] || {};
  const baseStatus = stage.status || "nao_iniciado";

  if (stageKey === "procedimentoClinico" && getTanatoValue(form) === "nao") {
    return "cancelado";
  }

  if (stageKey === "ornamentacao" && getOrnamentacaoValue(form) === "nao") {
    return "cancelado";
  }

  return baseStatus;
}

function getNextStepLabel(item) {
  const form = item?.form || {};
  const isViagem = form.velorioTipo === "viagem";

  const order = [
    ["remocao", "Remoção"],
    ["procedimentoClinico", "Procedimento"],
    ["ornamentacao", "Ornamentação"],
    ["entrega", isViagem ? "Viagem" : "Entrega"],
    ...(!isViagem ? [["sepultamento", "Sepultamento"]] : []),
  ];

  for (const [key, label] of order) {
    const status = getEffectiveStageStatus(item, key);
    if (!["finalizado", "cancelado"].includes(status)) return label;
  }

  return "Concluído";
}

function StatusBadge({ status }) {
  return (
    <span className={`stage-status ${getStatusClass(status)}`}>
      {getStatusLabel(status)}
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
    return (
      <button type="button" className="stage-button done" disabled>
        Etapa concluída
      </button>
    );
  }

  if (status === "em_andamento") {
    return (
      <button
        type="button"
        className="stage-button"
        onClick={() => updateOperationalStage(itemId, stageKey, "finish")}
      >
        Finalizar {stageLabel.toLowerCase()}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="stage-button"
      onClick={() => updateOperationalStage(itemId, stageKey, "start")}
    >
      Iniciar {stageLabel.toLowerCase()}
    </button>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="summary-line">
      <span className="summary-label">{label}:</span>
      <span>{value || "—"}</span>
    </div>
  );
}

function StageCard({ title, status, children, actions }) {
  return (
    <div className={`stage-card ${getStatusClass(status)} ${status === "em_andamento" ? "is-active" : ""}`}>
      <div className="stage-card-top">
        <h4>{title}</h4>
        <StatusBadge status={status} />
      </div>
      <div className="stage-card-body">{children}</div>
      {actions ? <div className="stage-card-actions">{actions}</div> : null}
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
      <div className="equipe-page">
        <div className="equipe-shell">
          <div className="equipe-topbar">
            <div>
              <h2>Tela da equipe</h2>
              <p>
                {audioLiberado
                  ? "Alerta sonoro ativado"
                  : "Toque na tela para liberar o alerta sonoro"}
              </p>
            </div>
          </div>

          <div className="empty-state">Nenhuma ordem de serviço ativa.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="equipe-page">
      <div className="equipe-shell">
        <div className="equipe-topbar">
          <div>
            <h2>Tela da equipe</h2>
            <p>{audioLiberado ? "Alerta sonoro ativado" : "Toque na tela para liberar o alerta sonoro"}</p>
          </div>
        </div>

        <div className="cards-list">
          {ativos.map((item) => {
            const form = item.form || {};
            const isViagem = form.velorioTipo === "viagem";
            const isOpen = expandedId === item.id;
            const isNovo = idsRecentes.includes(item.id);

            const remocaoStatus = getEffectiveStageStatus(item, "remocao");
            const procedimentoStatus = getEffectiveStageStatus(item, "procedimentoClinico");
            const ornamentacaoStatus = getEffectiveStageStatus(item, "ornamentacao");
            const entregaStatus = getEffectiveStageStatus(item, "entrega");
            const sepultamentoStatus = getEffectiveStageStatus(item, "sepultamento");

            const remocaoMotorista = getDriverByStage(item, "remocao", "Remocao");
            const remocaoCarro = getCarByStage(item, "remocao", "carroRemocao");

            const entregaMotorista = getDriverByStage(item, "entrega", "Entrega");
            const entregaCarro = getCarByStage(item, "entrega", "carroEntrega");

            const sepultamentoMotorista = getDriverByStage(item, "sepultamento", "Sepultamento");
            const sepultamentoCarro = getCarByStage(item, "sepultamento", "carroSepultamento");

            const tecnico = getTechnician(item);
            const localPrincipal = form.localObito || item.localObito || "—";

            return (
              <div key={item.id} className={`os-card ${isNovo ? "is-new" : ""}`}>
                <button
                  type="button"
                  className="os-card-toggle"
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                >
                  <div className="os-card-head">
                    <div className="os-card-title-wrap">
                      <div className="os-number">{item.numero || "Ordem de serviço"}</div>
                      <div className="os-title">
                        {item.falecido || form.falecido || "Sem nome informado"}
                      </div>
                      {isNovo ? <span className="new-badge">Nova O.S.</span> : null}
                    </div>

                    <div className="os-meta">
                      <span className="os-status">{item.status || "Aguardando início"}</span>
                    </div>
                  </div>

                  <div className="os-summary">
                    <SummaryLine label="Local principal" value={localPrincipal} />
                    <SummaryLine label="Próxima etapa" value={getNextStepLabel(item)} />
                  </div>
                </button>

                <div className={`os-card-body ${isOpen ? "open" : ""}`}>
                  <div className="stages-grid">
                    <StageCard
                      title="Remoção"
                      status={remocaoStatus}
                      actions={
                        <StageButtons
                          itemId={item.id}
                          stageKey="remocao"
                          stageLabel="Remoção"
                          status={remocaoStatus}
                          updateOperationalStage={updateOperationalStage}
                        />
                      }
                    >
                      <div className="stage-info-row">
                        <span className="stage-info-label">Local:</span>
                        <span>{form.localObito || item.localObito || "—"}</span>
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">Motorista:</span>
                        <span>{remocaoMotorista || "—"}</span>
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">Carro:</span>
                        <span>{remocaoCarro || "—"}</span>
                      </div>
                    </StageCard>

                    <StageCard
                      title="Procedimento"
                      status={procedimentoStatus}
                      actions={
                        <StageButtons
                          itemId={item.id}
                          stageKey="procedimentoClinico"
                          stageLabel="Procedimento"
                          status={procedimentoStatus}
                          updateOperationalStage={updateOperationalStage}
                        />
                      }
                    >
                      <div className="stage-info-row">
                        <span className="stage-info-label">Tanatopraxia:</span>
                        <span>
                          {getTanatoValue(form) === "sim"
                            ? "Sim"
                            : getTanatoValue(form) === "nao"
                            ? "Não"
                            : "—"}
                        </span>
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">Técnico:</span>
                        <span>{tecnico || "—"}</span>
                      </div>
                    </StageCard>

                    <StageCard
                      title="Ornamentação"
                      status={ornamentacaoStatus}
                      actions={
                        <StageButtons
                          itemId={item.id}
                          stageKey="ornamentacao"
                          stageLabel="Ornamentação"
                          status={ornamentacaoStatus}
                          updateOperationalStage={updateOperationalStage}
                        />
                      }
                    >
                      <div className="stage-info-row">
                        <span className="stage-info-label">Ornamentação:</span>
                        <span>
                          {getOrnamentacaoValue(form) === "sim"
                            ? "Sim"
                            : getOrnamentacaoValue(form) === "nao"
                            ? "Não"
                            : "—"}
                        </span>
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">Tipo:</span>
                        <span>
                          {form.tipoFlor === "naturais"
                            ? "Natural"
                            : form.tipoFlor === "artificiais"
                            ? "Artificial"
                            : "—"}
                        </span>
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">Urna:</span>
                        <span>
                          {[form.modeloUrna, form.corUrna].filter(Boolean).join(" - ") || "—"}
                        </span>
                      </div>
                    </StageCard>

                    <StageCard
                      title={getVelorioTitulo(form)}
                      status={entregaStatus}
                      actions={
                        <StageButtons
                          itemId={item.id}
                          stageKey="entrega"
                          stageLabel={isViagem ? "Viagem" : "Entrega"}
                          status={entregaStatus}
                          updateOperationalStage={updateOperationalStage}
                        />
                      }
                    >
                      <div className="stage-info-row">
                        <span className="stage-info-label">{getVelorioLabelLocal(form)}:</span>
                        <span>{getVelorioLocal(form) || "—"}</span>
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">{getVelorioLabelHorario(form)}:</span>
                        <span>{getVelorioHorario(form) || "—"}</span>
                      </div>
                      {isViagem ? (
                        <div className="stage-info-row">
                          <span className="stage-info-label">Embarque:</span>
                          <span>{form.embarque || "—"}</span>
                        </div>
                      ) : null}
                      <div className="stage-info-row">
                        <span className="stage-info-label">Motorista:</span>
                        <span>{entregaMotorista || "—"}</span>
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">Carro:</span>
                        <span>{entregaCarro || "—"}</span>
                      </div>
                    </StageCard>

                    {!isViagem && (
                      <StageCard
                        title="Sepultamento"
                        status={sepultamentoStatus}
                        actions={
                          <StageButtons
                            itemId={item.id}
                            stageKey="sepultamento"
                            stageLabel="Sepultamento"
                            status={sepultamentoStatus}
                            updateOperationalStage={updateOperationalStage}
                          />
                        }
                      >
                        <div className="stage-info-row">
                          <span className="stage-info-label">Cemitério:</span>
                          <span>{form.cemiterio || item.cemiterio || "—"}</span>
                        </div>
                        <div className="stage-info-row">
                          <span className="stage-info-label">Saída:</span>
                          <span>{getSepultamentoHorario(form) || "—"}</span>
                        </div>
                        <div className="stage-info-row">
                          <span className="stage-info-label">Motorista:</span>
                          <span>{sepultamentoMotorista || "—"}</span>
                        </div>
                        <div className="stage-info-row">
                          <span className="stage-info-label">Carro:</span>
                          <span>{sepultamentoCarro || "—"}</span>
                        </div>
                      </StageCard>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
