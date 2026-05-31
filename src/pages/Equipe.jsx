import React, { useEffect, useMemo, useState } from "react";
import notificationSound from "../assets/notificacao.mp3";
import "./equipe.css";
import {
  servicoAtivo,
  tipoServico,
  getLocalVelorio,
  getTipoTransladoLabel,
  getServiceTypeLabel,
} from "../components/ServicosDoDia";

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

  if (["sim", "s", "yes", "true", "1", "checked"].includes(normalized)) return "sim";
  if (
    ["nao", "não", "n", "no", "false", "0", "cancelado", "nenhum"].includes(
      normalized
    )
  ) {
    return "nao";
  }

  return "";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasCheckedValue(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "sim" ||
    value === "checked" ||
    value?.checked === true ||
    value?.selecionado === true ||
    value?.ativo === true
  );
}

function getTanatoValue(form = {}, item = {}) {
  const direto =
    normalizeChoice(form.tanato) ||
    normalizeChoice(form.tanatopraxia) ||
    normalizeChoice(form.conservacao) ||
    normalizeChoice(form.procedimentoClinico);

  if (direto) return direto;

  const possibleSources = [
    form.servicos,
    form.itens,
    form.servicosSelecionados,
    form.servicosExtras,
    item.servicos,
    item.itens,
    item.dados?.servicos,
    item.dados?.itens,
    item.dados?.form?.servicos,
    item.dados?.form?.itens,
  ];

  for (const source of possibleSources) {
    if (Array.isArray(source)) {
      const encontrou = source.some((entry) => {
        const nome = normalizeText(
          entry?.nome || entry?.descricao || entry?.titulo || entry
        );
        return (
          nome.includes("tanatopraxia") || nome.includes("conservacao do corpo")
        );
      });

      if (encontrou) return "sim";
    }

    if (source && typeof source === "object") {
      const encontrou = Object.entries(source).some(([key, value]) => {
        const chave = normalizeText(key);
        return (
          (chave.includes("tanatopraxia") ||
            chave.includes("conservacao do corpo")) &&
          hasCheckedValue(value)
        );
      });

      if (encontrou) return "sim";
    }
  }

  return "";
}

function getOrnamentacaoValue(form = {}) {
  return normalizeChoice(form.ornamentacao);
}

function getObservacaoValue(form = {}, item = {}) {
  return (
    form.observacaoTermo ||
    item.observacoes ||
    form.observacoes ||
    form.observacao ||
    form.obs ||
    item.dados?.observacoes ||
    item.dados?.form?.observacaoTermo ||
    ""
  );
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

  if (stageKey === "procedimentoClinico" && getTanatoValue(form, item) === "nao") {
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

function MapsButton({ address }) {
  if (!address || address === "—") return null;
  const query = encodeURIComponent(`${address}, Manaus, AM`);
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${query}`}
      target="_blank"
      rel="noopener noreferrer"
      className="maps-btn"
    >
      <i className="fa-solid fa-location-dot" style={{ marginRight: 6 }} /> Maps
    </a>
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
    <div
      className={`stage-card ${getStatusClass(status)} ${
        status === "em_andamento" ? "is-active" : ""
      }`}
    >
      <div className="stage-card-top">
        <h4>{title}</h4>
        <StatusBadge status={status} />
      </div>
      <div className="stage-card-body">{children}</div>
      {actions ? <div className="stage-card-actions">{actions}</div> : null}
    </div>
  );
}

const TIPO_SD_BADGE = {
  sepultamento: { label: "SEPULTAMENTO", bg: "rgba(34,197,94,0.14)",  color: "#15803d" },
  cremacao:     { label: "CREMAÇÃO",     bg: "rgba(249,115,22,0.14)", color: "#c2410c" },
  translado:    { label: "TRANSLADO",    bg: "rgba(59,130,246,0.14)", color: "#1d4ed8" },
};

function ServicosDoDiaEquipe({ servicos = [] }) {
  if (!servicos.length) return null;

  const sepultamentos = servicos.filter((i) => tipoServico(i) === "sepultamento");
  const cremacoes     = servicos.filter((i) => tipoServico(i) === "cremacao");
  const translados    = servicos.filter((i) => tipoServico(i) === "translado");
  const ordenados     = [...sepultamentos, ...cremacoes, ...translados];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--primary)", marginBottom: 10 }}>
        SERVIÇOS DO DIA ({servicos.length})
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {ordenados.map((item, idx) => {
          const form = item.form || {};
          const tipo = tipoServico(item);
          const badge = TIPO_SD_BADGE[tipo];
          const localVelorio = getLocalVelorio(form);
          const temOnibus = servicoAtivo(item.services, "ÔNIBUS");

          const cemOuTipo =
            tipo === "cremacao" ? "CREMAÇÃO" :
            tipo === "translado" ? getTipoTransladoLabel(item.services) :
            (form.cemiterio || "—");

          return (
            <div
              key={item.id}
              style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 14, boxShadow: "var(--shadow)" }}
            >
              {/* Type badges */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ background: badge.bg, color: badge.color, borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                  {badge.label}
                </span>
                {temOnibus && (
                  <span style={{ background: "rgba(139,92,246,0.14)", color: "#7c3aed", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 800 }}>
                    <i className="fa-solid fa-bus" style={{ marginRight: 5 }} /> ÔNIBUS
                  </span>
                )}
                {form.tipoPlano && (
                  <span style={{ background: "rgba(38,177,196,0.12)", color: "#16889a", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 800 }}>
                    {getServiceTypeLabel(form.tipoPlano)}
                  </span>
                )}
                <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "0.78rem", fontWeight: 700 }}>
                  {idx + 1}º
                </span>
              </div>

              {/* Local */}
              {localVelorio && (
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", marginBottom: 4 }}>
                  {localVelorio}
                </div>
              )}

              {/* Falecido */}
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)", textTransform: "uppercase", marginBottom: 8 }}>
                {form.falecido || "Sem nome informado"}
              </div>

              {/* Details */}
              <div style={{ display: "grid", gap: 3, fontSize: "0.88rem", color: "var(--muted)" }}>
                <div><strong style={{ color: "var(--text)" }}>Cemitério:</strong> {cemOuTipo}</div>
                {form.horaSaida && (
                  <div style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.92rem" }}>
                    <i className="fa-regular fa-clock" style={{ marginRight: 5 }} /> SAINDO ÀS {form.horaSaida}
                  </div>
                )}
                {form.motorista && (
                  <div><strong style={{ color: "var(--text)" }}>Motorista:</strong> {form.motorista}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OsAtivasSection({ ordens = [], atualizarStatus }) {
  if (!ordens.length) return null;

  const canUpdate = typeof atualizarStatus === "function";

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--primary)", marginBottom: 10 }}>
        Ordens de Serviço ativas ({ordens.length})
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {ordens.map((os) => {
          const cor = OS_STATUS_COLORS[os.status] || OS_STATUS_COLORS.cancelada;
          const urgente = os.prioridade === "urgente";
          const d = os.dados || {};
          const isSvo = (os.local_obito || "").toUpperCase() === "SVO";

          const clean = (v) => v && String(v).trim();
          const mapsAddress = isSvo
            ? [os.endereco, d.numero, d.complemento, "Manaus, AM"].filter(clean).join(", ")
            : [os.local_obito, "Manaus, AM"].filter(clean).join(", ");
          const hasLocation = isSvo ? !!clean(os.endereco) : !!clean(os.local_obito);
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress)}`;

          const telBruto = d.responsavel_telefone || "";
          const telLimpo = telBruto.replace(/\D/g, "");

          const localLabel = isSvo
            ? ["SVO", os.endereco, d.numero].filter(Boolean).join(" — ")
            : (os.local_obito || "");

          return (
            <div
              key={os.record_id}
              style={{
                background: "var(--card)",
                border: urgente ? "2px solid #f59e0b" : "1px solid var(--line)",
                borderRadius: 16,
                padding: 14,
                boxShadow: "var(--shadow)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>
                    {os.numero}
                    {urgente && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#b45309", background: "rgba(245,158,11,0.1)", borderRadius: 999, padding: "2px 8px" }}>
                        <i className="fa-solid fa-bolt" style={{ marginRight: 5 }} /> URGENTE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)" }}>
                    {os.falecido || "Sem nome informado"}
                  </div>
                </div>
                <span style={{ background: cor.bg, color: cor.color, borderRadius: 999, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {OS_STATUS_LABELS[os.status] || os.status}
                </span>
              </div>

              {/* Info */}
              <div style={{ display: "grid", gap: 4, fontSize: "0.88rem", color: "var(--muted)", marginBottom: 12 }}>
                {localLabel && (
                  <div><strong style={{ color: "var(--text)" }}>Local:</strong> {localLabel}</div>
                )}
                {os.motorista && (
                  <div>
                    <strong style={{ color: "var(--text)" }}>Motorista:</strong> {os.motorista}
                    {os.carro ? ` • ${os.carro}` : ""}
                  </div>
                )}
                {d.responsavel_nome && (
                  <div><strong style={{ color: "var(--text)" }}>Responsável:</strong> {d.responsavel_nome}</div>
                )}
              </div>

              {/* Buttons row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {/* Status action */}
                {canUpdate && os.status === "aguardando_remocao" && (
                  <button type="button" className="os-action-btn" onClick={() => atualizarStatus(os.record_id, "equipe_deslocando")}>
                    Iniciar deslocamento
                  </button>
                )}
                {canUpdate && os.status === "equipe_deslocando" && (
                  <button type="button" className="os-action-btn" onClick={() => atualizarStatus(os.record_id, "aguardando_local")}>
                    Aguardando no local
                  </button>
                )}
                {canUpdate && os.status === "aguardando_local" && (
                  <button type="button" className="os-action-btn" onClick={() => atualizarStatus(os.record_id, "em_remocao")}>
                    Iniciar remoção
                  </button>
                )}
                {canUpdate && os.status === "em_remocao" && (
                  <button type="button" className="os-action-btn" onClick={() => atualizarStatus(os.record_id, "finalizada")}>
                    Finalizar remoção
                  </button>
                )}

                {/* Maps */}
                {hasLocation && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="os-contact-btn">
                    <i className="fa-solid fa-location-dot" style={{ marginRight: 6 }} /> Abrir localização
                  </a>
                )}

                {/* Contact */}
                {telLimpo && (
                  <>
                    <a href={`tel:${telLimpo}`} className="os-contact-btn">
                      <i className="fa-solid fa-phone" style={{ marginRight: 6 }} /> Ligar
                    </a>
                    <a href={`https://wa.me/55${telLimpo}`} target="_blank" rel="noopener noreferrer" className="os-contact-btn">
                      <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} /> WhatsApp
                    </a>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const OS_STATUS_LABELS = {
  aguardando_remocao: "Aguardando remoção",
  equipe_deslocando:  "Equipe deslocando",
  aguardando_local:   "Aguardando no local",
  em_remocao:         "Em remoção",
  finalizada:         "Finalizada",
  cancelada:          "Cancelada",
};

const OS_STATUS_COLORS = {
  aguardando_remocao: { bg: "rgba(245,158,11,0.13)",  color: "#b45309" },
  equipe_deslocando:  { bg: "rgba(59,130,246,0.13)",  color: "#1d4ed8" },
  aguardando_local:   { bg: "rgba(139,92,246,0.13)",  color: "#7c3aed" },
  em_remocao:         { bg: "rgba(249,115,22,0.13)",  color: "#c2410c" },
  finalizada:         { bg: "rgba(34,197,94,0.13)",   color: "#15803d" },
  cancelada:          { bg: "rgba(148,163,184,0.13)", color: "#64748b" },
};

export default function Equipe({
  atendimentos = [],
  updateOperationalStage,
  ordensAtivas = [],
  atualizarStatusOs,
  servicosDoDia = [],
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
  const [abaAtiva, setAbaAtiva] = useState("operacional");

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

        <div className="equipe-tabs">
          <button
            type="button"
            className={`equipe-tab${abaAtiva === "operacional" ? " equipe-tab--active" : ""}`}
            onClick={() => setAbaAtiva("operacional")}
          >
            Operacional
          </button>
          <button
            type="button"
            className={`equipe-tab${abaAtiva === "servicos_dia" ? " equipe-tab--active" : ""}`}
            onClick={() => setAbaAtiva("servicos_dia")}
          >
            Serviços do Dia
          </button>
        </div>

        {abaAtiva === "operacional" && (
          <>
            <OsAtivasSection ordens={ordensAtivas} atualizarStatus={atualizarStatusOs} />
            {ativos.length === 0 && (
              <div className="empty-state">Nenhuma ordem de serviço ativa.</div>
            )}
            {ativos.length > 0 && (
            <div className="cards-list">
          {ativos.map((item) => {
            const form = item.form || {};
            const isViagem = form.velorioTipo === "viagem";
            const isOpen = expandedId === item.id;
            const isNovo = idsRecentes.includes(item.id);
            const observacao = getObservacaoValue(form, item);

            const remocaoStatus = getEffectiveStageStatus(item, "remocao");
            const procedimentoStatus = getEffectiveStageStatus(
              item,
              "procedimentoClinico"
            );
            const ornamentacaoStatus = getEffectiveStageStatus(item, "ornamentacao");
            const entregaStatus = getEffectiveStageStatus(item, "entrega");
            const sepultamentoStatus = getEffectiveStageStatus(
              item,
              "sepultamento"
            );

            const remocaoMotorista = getDriverByStage(item, "remocao", "Remocao");
            const remocaoCarro = getCarByStage(item, "remocao", "carroRemocao");

            const entregaMotorista = getDriverByStage(item, "entrega", "Entrega");
            const entregaCarro = getCarByStage(item, "entrega", "carroEntrega");

            const sepultamentoMotorista = getDriverByStage(
              item,
              "sepultamento",
              "Sepultamento"
            );
            const sepultamentoCarro = getCarByStage(
              item,
              "sepultamento",
              "carroSepultamento"
            );

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
                      <div className="os-number">
                        {item.numero || "Ordem de serviço"}
                      </div>
                      <div className="os-title">
                        {item.falecido || form.falecido || "Sem nome informado"}
                      </div>
                      {isNovo ? <span className="new-badge">Nova O.S.</span> : null}
                    </div>

                    <div className="os-meta">
                      <span className="os-status">
                        {item.status || "Aguardando início"}
                      </span>
                    </div>
                  </div>

                  <div className="os-summary">
                    <SummaryLine label="Local principal" value={localPrincipal} />
                    <SummaryLine label="Próxima etapa" value={getNextStepLabel(item)} />

                    {observacao ? (
                      <div className="os-observacao">
                        <span className="obs-label">Observação:</span>
                        <span className="obs-text">{observacao}</span>
                      </div>
                    ) : null}
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
                        <MapsButton address={form.localObito || item.localObito} />
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">Religião:</span>
                        <span>{form.religiao || item.religiao || "—"}</span>
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
                          {getTanatoValue(form, item) === "sim"
                            ? "Sim"
                            : getTanatoValue(form, item) === "nao"
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
                          {[form.modeloUrna, form.corUrna]
                            .filter(Boolean)
                            .join(" - ") || "—"}
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
                        <span className="stage-info-label">
                          {getVelorioLabelLocal(form)}:
                        </span>
                        <span>{getVelorioLocal(form) || "—"}</span>
                        <MapsButton address={getVelorioLocal(form)} />
                      </div>
                      <div className="stage-info-row">
                        <span className="stage-info-label">
                          {getVelorioLabelHorario(form)}:
                        </span>
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
                          <MapsButton address={form.cemiterio || item.cemiterio} />
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
            )}
          </>
        )}

        {abaAtiva === "servicos_dia" && (
          <ServicosDoDiaEquipe servicos={servicosDoDia} />
        )}
      </div>
    </div>
  );
}
