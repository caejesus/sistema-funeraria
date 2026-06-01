import React, { useEffect, useMemo, useState } from "react";
import notificationSound from "../assets/notificacao.mp3";
import { formatDateBR, getCemiterioNome, getCemiterioEndereco } from "../utils/format";
import { OPERATION_STAGES } from "../constants";
import {
  servicoAtivo,
  tipoServico,
  getLocalVelorio,
  getTipoTransladoLabel,
  getServiceTypeLabel,
} from "../components/ServicosDoDia";

// ─── Stage/status helpers ─────────────────────────────────────────────────────

function normalizeChoice(value) {
  if (value === true) return "sim";
  if (value === false) return "nao";
  const n = String(value || "").trim().toLowerCase();
  if (["sim", "s", "yes", "true", "1", "checked"].includes(n)) return "sim";
  if (["nao", "não", "n", "no", "false", "0", "cancelado", "nenhum"].includes(n)) return "nao";
  return "";
}

function normalizeText(v) {
  return String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function hasCheckedValue(v) {
  return v === true || v === 1 || v === "1" || v === "true" || v === "sim" || v === "checked" ||
    v?.checked === true || v?.selecionado === true || v?.ativo === true;
}

function getTanatoValue(form = {}, item = {}) {
  const direto =
    normalizeChoice(form.tanato) ||
    normalizeChoice(form.tanatopraxia) ||
    normalizeChoice(form.conservacao) ||
    normalizeChoice(form.procedimentoClinico);
  if (direto) return direto;
  const sources = [
    form.servicos, form.itens, form.servicosSelecionados, form.servicosExtras,
    item.servicos, item.itens, item.dados?.servicos, item.dados?.itens,
    item.dados?.form?.servicos, item.dados?.form?.itens,
  ];
  for (const src of sources) {
    if (Array.isArray(src)) {
      if (src.some((e) => { const n = normalizeText(e?.nome || e?.descricao || e?.titulo || e); return n.includes("tanatopraxia") || n.includes("conservacao do corpo"); })) return "sim";
    }
    if (src && typeof src === "object") {
      if (Object.entries(src).some(([k, v]) => { const c = normalizeText(k); return (c.includes("tanatopraxia") || c.includes("conservacao do corpo")) && hasCheckedValue(v); })) return "sim";
    }
  }
  return "";
}

function getEffectiveStageStatus(item, stageKey) {
  const form = item?.form || {};
  const base = item?.operationalStages?.[stageKey]?.status || "nao_iniciado";
  if (stageKey === "procedimentoClinico" && getTanatoValue(form, item) === "nao") return "cancelado";
  if (stageKey === "ornamentacao" && normalizeChoice(form.ornamentacao) === "nao") return "cancelado";
  return base;
}

const TRANSPORT_KEYS = new Set(["remocao", "entrega", "sepultamento"]);

// ─── OS config ────────────────────────────────────────────────────────────────

const OS_CFG = {
  aguardando_remocao: { label: "Aguardando remoção", color: "#b45309", border: "rgba(245,158,11,0.35)", bg: "rgba(245,158,11,0.07)" },
  equipe_deslocando:  { label: "Equipe deslocando",  color: "#1d4ed8", border: "rgba(59,130,246,0.35)",  bg: "rgba(59,130,246,0.07)" },
  aguardando_local:   { label: "Aguardando no local",color: "#7c3aed", border: "rgba(139,92,246,0.35)",  bg: "rgba(139,92,246,0.07)" },
  em_remocao:         { label: "Em remoção",         color: "#c2410c", border: "rgba(249,115,22,0.35)",  bg: "rgba(249,115,22,0.07)" },
  finalizada:         { label: "Finalizada",         color: "#15803d", border: "rgba(34,197,94,0.35)",   bg: "rgba(34,197,94,0.07)" },
  cancelada:          { label: "Cancelada",          color: "#64748b", border: "rgba(148,163,184,0.3)",  bg: "rgba(148,163,184,0.05)" },
};

const OS_NEXT = {
  aguardando_remocao: { label: "Iniciar deslocamento", next: "equipe_deslocando" },
  equipe_deslocando:  { label: "Aguardando no local",  next: "aguardando_local"  },
  aguardando_local:   { label: "Iniciar remoção",      next: "em_remocao"        },
  em_remocao:         { label: "Finalizar remoção",    next: "finalizada"        },
};

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_CFG = {
  finalizado:   { label: "Finalizada",   color: "#15803d",             border: "rgba(34,197,94,0.25)",   bg: "rgba(34,197,94,0.06)"   },
  em_andamento: { label: "Em andamento", color: "var(--brand-accent)", border: "var(--brand-accent)",    bg: "rgba(38,177,196,0.06)"  },
  cancelado:    { label: "Cancelada",    color: "#64748b",             border: "rgba(148,163,184,0.18)", bg: "transparent"            },
  nao_iniciado: { label: "Aguardando",   color: "#94a3b8",             border: "var(--border-soft)",     bg: "transparent"            },
};

// ─── Inline style helpers ─────────────────────────────────────────────────────

const card = (extra) => ({
  background: "var(--card-bg)",
  border: "1px solid var(--border-soft)",
  borderRadius: 14,
  padding: 14,
  ...extra,
});

const primaryBtn = (extra) => ({
  width: "100%",
  background: "var(--brand-accent)",
  border: "none",
  borderRadius: 10,
  padding: "10px 0",
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  cursor: "pointer",
  ...extra,
});

const outlineBtn = (color, extra) => ({
  background: "none",
  border: `1px solid ${color || "var(--border-soft)"}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  color: color || "var(--text-main)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  ...extra,
});

const sectionTitle = {
  fontSize: 10,
  color: "var(--brand-accent)",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontWeight: 700,
  marginBottom: 10,
};

// ─── OS card ──────────────────────────────────────────────────────────────────

function OsCard({ os, atualizarStatus }) {
  const cfg = OS_CFG[os.status] || OS_CFG.cancelada;
  const action = OS_NEXT[os.status];
  const d = os.dados || {};
  const isSvo = (os.local_obito || "").toUpperCase() === "SVO";
  const localLabel = isSvo
    ? ["SVO", os.endereco, d.numero].filter(Boolean).join(" — ")
    : (os.local_obito || "");
  const mapsQuery = encodeURIComponent([localLabel, "Manaus, AM"].filter(Boolean).join(", "));
  const telLimpo = (d.responsavel_telefone || "").replace(/\D/g, "");
  const urgente = os.prioridade === "urgente";

  return (
    <div style={{
      background: "var(--card-bg)",
      border: `1px solid ${cfg.border}`,
      borderLeft: `3px solid ${cfg.border}`,
      borderRadius: 14,
      padding: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: cfg.color, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 3 }}>
            {os.numero}
            {urgente && <span style={{ marginLeft: 6, background: "rgba(245,158,11,0.12)", borderRadius: 999, padding: "1px 7px" }}>
              <i className="fa-solid fa-bolt" style={{ marginRight: 3 }} />URGENTE
            </span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
            {os.falecido || "Sem nome informado"}
          </div>
        </div>
        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
          {cfg.label}
        </span>
      </div>

      {/* Local */}
      {localLabel && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
          <i className="fa-solid fa-map-pin" style={{ fontSize: 10, flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{localLabel}</span>
        </div>
      )}

      {/* Motorista */}
      {os.motorista && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
          {os.motorista}{os.carro ? ` · ${os.carro}` : ""}
        </div>
      )}
      {!os.motorista && <div style={{ marginBottom: 10 }} />}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {action && typeof atualizarStatus === "function" && (
          <button type="button" style={{ ...primaryBtn(), flex: 1, width: "auto" }}
            onClick={() => atualizarStatus(os.record_id, action.next)}>
            {action.label}
          </button>
        )}
        {localLabel && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank" rel="noopener noreferrer"
            style={outlineBtn("var(--border-soft)")}>
            <i className="fa-solid fa-map" />
          </a>
        )}
        {telLimpo && (
          <>
            <a href={`https://wa.me/55${telLimpo}`} target="_blank" rel="noopener noreferrer"
              style={outlineBtn("rgba(34,197,94,0.5)", { color: "#15803d" })}>
              <i className="fa-brands fa-whatsapp" />
            </a>
            <a href={`tel:${telLimpo}`}
              style={outlineBtn("var(--border-soft)")}>
              <i className="fa-solid fa-phone" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stage content per key ────────────────────────────────────────────────────

function getStageContent(key, form, item) {
  const infos = [];
  const links = [];
  const maps = (query, lbl) => ({
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    icon: "fa-solid fa-location-dot", label: lbl, color: "var(--brand-accent)", newTab: true,
  });

  if (key === "remocao") {
    if (form.localObito) infos.push({ label: "LOCAL DO ÓBITO", value: form.localObito });
    if (form.religiao)   infos.push({ label: "RELIGIÃO",       value: form.religiao });
    if (form.sexo)       infos.push({ label: "SEXO",           value: form.sexo });
    if (form.peso)       infos.push({ label: "PESO",           value: form.peso });
    if (form.altura)     infos.push({ label: "ALTURA",         value: form.altura });
    const contato = [form.responsavelNome, form.responsavelCelular1].filter(Boolean).join(" · ");
    if (contato)         infos.push({ label: "CONTATO",        value: contato });

    if (form.localObito)
      links.push(maps(`${form.localObito}, Manaus, AM`, "Local do óbito"));

    const tel = (form.responsavelCelular1 || "").replace(/\D/g, "");
    if (tel) {
      links.push({ href: `tel:${tel}`,                    icon: "fa-solid fa-phone",      label: "Ligar",     color: "#22c55e" });
      links.push({ href: `https://wa.me/55${tel}`,        icon: "fa-brands fa-whatsapp",  label: "WhatsApp",  color: "#22c55e", newTab: true });
    }
  }

  if (key === "procedimentoClinico") {
    const temTanato = (item.services || []).some((s) => s.name === "TANATOPRAXIA (CONSERVAÇÃO DO CORPO)" && s.checked);
    if (temTanato) infos.push({ label: "TANATOPRAXIA", value: "Sim" });
    if (form.sexo)   infos.push({ label: "SEXO",    value: form.sexo });
    if (form.peso)   infos.push({ label: "PESO",    value: form.peso });
    if (form.altura) infos.push({ label: "ALTURA",  value: form.altura });
    if (form.maquiagem) {
      const v = form.maquiagem === "sim"
        ? `Sim${form.maquiagemTipo ? " — " + form.maquiagemTipo : ""}`
        : "Não";
      infos.push({ label: "MAQUIAGEM", value: v });
    }
    if (form.barbear) infos.push({ label: "BARBEAR", value: form.barbear === "sim" ? "Sim" : "Não" });
  }

  if (key === "ornamentacao") {
    if (form.ornamentacao) {
      const v = form.ornamentacao === "sim"
        ? `Sim${form.tipoFlor ? " — " + form.tipoFlor : ""}`
        : "Não";
      infos.push({ label: "ORNAMENTAÇÃO", value: v });
    }
    const urna = [form.modeloUrna, form.corUrna].filter(Boolean).join(" — ");
    if (urna)          infos.push({ label: "URNA",     value: urna });
    if (form.religiao) infos.push({ label: "RELIGIÃO", value: form.religiao });
  }

  if (key === "entrega") {
    let localLabel = "";
    let mapsQuery  = "";
    if (form.velorioTipo === "funeraria") {
      localLabel = [form.velorioUnidade, form.velorioSala].filter(Boolean).join(" — ");
      mapsQuery  = `Funerária São Francisco, ${form.velorioUnidade}, Manaus, AM`;
    } else if (form.velorioTipo === "viagem") {
      localLabel = ["Translado", form.cidadeDestino, form.embarque ? `Embarque: ${form.embarque}` : ""].filter(Boolean).join(" — ");
      mapsQuery  = form.cidadeDestino || "";
    } else {
      localLabel = [form.velorioEndereco, form.velorioNumero, form.velorioBairro].filter(Boolean).join(", ");
      mapsQuery  = [form.velorioEndereco, form.velorioNumero, form.velorioBairro, "Manaus AM"].filter(Boolean).join(" ");
    }
    if (localLabel) infos.push({ label: "LOCAL", value: localLabel });
    if (form.horarioVelorio)     infos.push({ label: "INÍCIO DO VELÓRIO", value: form.horarioVelorio });
    if (form.tempoVelorioValor)  infos.push({ label: "TEMPO DE VELÓRIO",  value: `${form.tempoVelorioValor} ${form.tempoVelorioUnidade || ""}`.trim() });
    if (mapsQuery) links.push(maps(mapsQuery, "Ver local"));
  }

  if (key === "sepultamento") {
    const nome = getCemiterioNome(form.cemiterio);
    const addr = getCemiterioEndereco(form.cemiterio);
    if (nome)            infos.push({ label: "CEMITÉRIO",        value: nome });
    if (form.horaSaida)  infos.push({ label: "HORÁRIO DE SAÍDA", value: form.horaSaida });
    if (nome || addr)
      links.push(maps(addr ? `${addr}, Manaus, AM` : `${nome}, Manaus, AM`, "Ver cemitério"));
  }

  return { infos, links };
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ item, stage, updateOperationalStage }) {
  const { key, label } = stage;
  const status   = getEffectiveStageStatus(item, key);
  const st       = item?.operationalStages?.[key] || {};
  const cfg      = STAGE_CFG[status] || STAGE_CFG.nao_iniciado;
  const isTransport = TRANSPORT_KEYS.has(key);
  const form     = item?.form || {};
  const { infos, links } = getStageContent(key, form, item);

  const actionLinkStyle = (color) => ({
    border: `1px solid ${color}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    color,
    display: "flex",
    alignItems: "center",
    gap: 4,
    textDecoration: "none",
    background: "none",
  });

  return (
    <div style={{ border: `1px solid ${cfg.border}`, borderRadius: 12, padding: 12, marginBottom: 8, background: cfg.bg }}>
      {/* Stage header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: status === "cancelado" ? 0 : 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: status === "cancelado" || status === "nao_iniciado" ? "var(--text-muted)" : "var(--text-main)" }}>
          {label}
        </span>
        <span style={{
          background: status === "finalizado" ? "rgba(34,197,94,0.12)" : status === "em_andamento" ? "rgba(38,177,196,0.12)" : "rgba(148,163,184,0.1)",
          color: cfg.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700,
        }}>
          {cfg.label}
        </span>
      </div>

      {status !== "cancelado" && (
        <>
          {/* Timing */}
          {(st.start || st.end) && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              {st.start && `Início: ${st.start}`}{st.start && st.end && " · "}{st.end && `Fim: ${st.end}`}
            </div>
          )}

          {/* Finalizado / iniciado por */}
          {status === "finalizado" && st.finishedBy && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              Finalizado por: {st.finishedBy}
            </div>
          )}
          {status === "em_andamento" && st.startedBy && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Por: {st.startedBy}
            </div>
          )}

          {/* Transport read-only */}
          {isTransport && (st.driver || st.car) && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              {st.driver && `Motorista: ${st.driver}`}{st.driver && st.car && " · "}{st.car && `Carro: ${st.car}`}
            </div>
          )}

          {/* Person (non-transport) */}
          {!isTransport && (() => {
            const person = st.attendant || st.technician || st.support || "";
            return person ? <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Responsável: {person}</div> : null;
          })()}

          {/* Stage-specific infos */}
          {infos.length > 0 && (
            <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
              {infos.map(({ label: lbl, value }) => (
                <div key={lbl}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{lbl}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)" }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Stage-specific action links */}
          {links.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {links.map(({ href, icon, label: lbl, color, newTab }, i) => (
                <a key={i} href={href}
                  target={newTab ? "_blank" : undefined}
                  rel={newTab ? "noopener noreferrer" : undefined}
                  style={actionLinkStyle(color)}>
                  <i className={icon} style={{ fontSize: 11 }} />
                  {lbl}
                </a>
              ))}
            </div>
          )}

          {/* Action button (iniciar / finalizar) */}
          {status !== "finalizado" && typeof updateOperationalStage === "function" && (
            <button type="button"
              style={status === "em_andamento"
                ? primaryBtn({ marginTop: 10 })
                : outlineBtn("var(--brand-accent)", { width: "100%", marginTop: 10, color: "var(--brand-accent)", justifyContent: "center" })
              }
              onClick={() => updateOperationalStage(item.id, key, status === "em_andamento" ? "finish" : "start")}>
              {status === "em_andamento" ? `Finalizar ${label.toLowerCase()}` : `Iniciar ${label.toLowerCase()}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Atendimento card (collapsed / expanded) ──────────────────────────────────

function AtendimentoCard({ item, isExpanded, onToggle, updateOperationalStage, isNovo }) {
  const form = item.form || {};
  const localObito = form.localObito || item.localObito || "";
  const localVelorio = getLocalVelorio(form) || "";

  if (isExpanded) {
    return (
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-soft)", borderRadius: 14, overflow: "hidden" }}>
        {/* Expanded header */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={onToggle}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px 8px 4px 0", display: "flex", alignItems: "center" }}>
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.falecido || form.falecido || "Sem nome informado"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{item.numero}</div>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{item.status}</span>
        </div>

        {/* Stages list */}
        <div style={{ padding: 12 }}>
          {OPERATION_STAGES.map((stage) => (
            <StageCard key={stage.key} item={item} stage={stage} updateOperationalStage={updateOperationalStage} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...card(),
      borderColor: isNovo ? "var(--brand-accent)" : "var(--border-soft)",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: "var(--brand-accent)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
            {item.numero || "—"}
            {isNovo && <span style={{ background: "var(--brand-accent)", color: "#fff", borderRadius: 999, padding: "1px 7px", fontSize: 9 }}>NOVA</span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
            {item.falecido || form.falecido || "Sem nome informado"}
          </div>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{item.status}</span>
      </div>

      {/* Local info */}
      {(localObito || localVelorio) && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <i className="fa-solid fa-map-pin" style={{ fontSize: 10, flexShrink: 0 }} />
          {localObito && <span>{localObito}</span>}
          {localObito && localVelorio && <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }} />}
          {localVelorio && <span>{localVelorio}</span>}
        </div>
      )}

      <button type="button" onClick={onToggle}
        style={outlineBtn("var(--brand-accent)", { width: "100%", color: "var(--brand-accent)", justifyContent: "center" })}>
        Ver etapas
      </button>
    </div>
  );
}

// ─── Serviços do dia section ──────────────────────────────────────────────────

const TIPO_BADGE = {
  sepultamento: { label: "SEPULTAMENTO", bg: "rgba(34,197,94,0.1)",   color: "#15803d" },
  cremacao:     { label: "CREMAÇÃO",     bg: "rgba(249,115,22,0.1)",  color: "#c2410c" },
  translado:    { label: "TRANSLADO",    bg: "rgba(59,130,246,0.1)",  color: "#1d4ed8" },
};

function ServicoCard({ item }) {
  const form = item.form || {};
  const tipo = tipoServico(item);
  const badge = TIPO_BADGE[tipo];
  const localVelorio = getLocalVelorio(form);
  const cemOuTipo =
    tipo === "cremacao" ? "CREMAÇÃO" :
    tipo === "translado" ? getTipoTransladoLabel(item.services) :
    (getCemiterioNome(form.cemiterio) || "—");
  const temOnibus = servicoAtivo(item.services, "ÔNIBUS");

  return (
    <div style={card()}>
      {/* Badges row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ background: badge.bg, color: badge.color, borderRadius: 999, padding: "3px 10px", fontSize: 10, fontWeight: 700 }}>
          {badge.label}
        </span>
        {temOnibus && (
          <span style={{ background: "rgba(139,92,246,0.1)", color: "#7c3aed", borderRadius: 999, padding: "3px 10px", fontSize: 10, fontWeight: 700 }}>
            <i className="fa-solid fa-bus" style={{ marginRight: 4 }} />ÔNIBUS
          </span>
        )}
        {form.tipoPlano && (
          <span style={{ background: "rgba(38,177,196,0.08)", color: "var(--brand-accent)", borderRadius: 999, padding: "3px 10px", fontSize: 10, fontWeight: 700 }}>
            {getServiceTypeLabel(form.tipoPlano)}
          </span>
        )}
      </div>

      {/* Local velório */}
      {localVelorio && (
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-main)", marginBottom: 3 }}>
          {localVelorio}
        </div>
      )}

      {/* Falecido */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-soft)", textTransform: "uppercase", marginBottom: 6 }}>
        {form.falecido || "—"}
      </div>

      {/* Cemitério / tipo */}
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: form.horaSaida ? 3 : 0 }}>
        {cemOuTipo}
      </div>

      {/* Saindo às */}
      {form.horaSaida && (
        <div style={{ fontSize: 12, color: "var(--brand-accent)", fontWeight: 700, marginBottom: 3 }}>
          SAINDO ÀS {form.horaSaida}
        </div>
      )}

      {/* Motorista */}
      {form.motorista && (
        <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
          MOTORISTA: {form.motorista}
        </div>
      )}
    </div>
  );
}

function ServicosDoDiaAba({ servicos }) {
  if (!servicos.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-main)", marginBottom: 6 }}>Nenhum serviço para hoje</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Atendimentos com saída hoje aparecerão aqui.</div>
      </div>
    );
  }

  const sepulta = servicos.filter((i) => tipoServico(i) === "sepultamento");
  const crema   = servicos.filter((i) => tipoServico(i) === "cremacao");
  const trans   = servicos.filter((i) => tipoServico(i) === "translado");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sepulta.map((i) => <ServicoCard key={i.id} item={i} />)}

      {crema.length > 0 && (
        <>
          <div style={{ ...sectionTitle, marginTop: 8 }}>Cremações · {crema.length}</div>
          {crema.map((i) => <ServicoCard key={i.id} item={i} />)}
        </>
      )}

      {trans.length > 0 && (
        <>
          <div style={{ ...sectionTitle, marginTop: 8 }}>Translados · {trans.length}</div>
          {trans.map((i) => <ServicoCard key={i.id} item={i} />)}
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Equipe({
  atendimentos = [],
  updateOperationalStage,
  ordensAtivas = [],
  atualizarStatusOs,
  servicosDoDia = [],
}) {
  const [abaAtiva, setAbaAtiva]     = useState("operacional");
  const [expandedId, setExpandedId] = useState(null);
  const [audioLiberado, setAudioLiberado] = useState(false);
  const [idsVistos, setIdsVistos]   = useState([]);
  const [idsRecentes, setIdsRecentes] = useState([]);

  const ativos = useMemo(
    () => atendimentos.filter((i) => i && ["Aguardando início", "Em andamento", "Em progresso"].includes(i.status)),
    [atendimentos]
  );

  const osAtivas = useMemo(
    () => ordensAtivas.filter((o) => !["finalizada", "cancelada"].includes(o.status)),
    [ordensAtivas]
  );

  // Audio unlock
  useEffect(() => {
    const unlock = () => setAudioLiberado(true);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // New-item notification
  useEffect(() => {
    if (!ativos.length) return;
    const novos = ativos.filter((i) => !idsVistos.includes(i.id));
    if (!novos.length) return;
    const novosIds = novos.map((i) => i.id);
    setIdsVistos((prev) => [...prev, ...novosIds]);
    setIdsRecentes((prev) => [...new Set([...prev, ...novosIds])]);
    if (audioLiberado) {
      try { new Audio(notificationSound).play().catch(() => {}); } catch {}
    }
    const t = setTimeout(() => setIdsRecentes((prev) => prev.filter((id) => !novosIds.includes(id))), 10000);
    return () => clearTimeout(t);
  }, [ativos, idsVistos, audioLiberado]);

  const Tab = ({ label, aba }) => (
    <button type="button" onClick={() => setAbaAtiva(aba)} style={{
      background: "none", border: "none",
      borderBottom: abaAtiva === aba ? "2px solid var(--brand-accent)" : "2px solid transparent",
      padding: "12px 16px", fontSize: 13,
      fontWeight: abaAtiva === aba ? 600 : 400,
      color: abaAtiva === aba ? "var(--brand-accent)" : "var(--text-muted)",
      cursor: "pointer", whiteSpace: "nowrap",
      transition: "color 0.15s, border-color 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ padding: 12, background: "var(--page-bg)", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--text-main)" }}>Tela da equipe</h2>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
          {audioLiberado ? "Alerta sonoro ativado" : "Toque na tela para liberar o alerta sonoro"}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-soft)", marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        <Tab label="Operacional"     aba="operacional"  />
        <Tab label="Serviços do Dia" aba="servicos_dia" />
      </div>

      {/* ── ABA OPERACIONAL ──────────────────────────────────────────────── */}
      {abaAtiva === "operacional" && (
        <div>
          {/* OS Ativas */}
          {osAtivas.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={sectionTitle}>OS Ativas · {osAtivas.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {osAtivas.map((os) => (
                  <OsCard key={os.record_id} os={os} atualizarStatus={atualizarStatusOs} />
                ))}
              </div>
            </div>
          )}

          {/* Atendimentos em andamento */}
          {ativos.length > 0 && (
            <div>
              <div style={sectionTitle}>Em andamento · {ativos.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ativos.map((item) => (
                  <AtendimentoCard
                    key={item.id}
                    item={item}
                    isExpanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    updateOperationalStage={updateOperationalStage}
                    isNovo={idsRecentes.includes(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {osAtivas.length === 0 && ativos.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-main)", marginBottom: 6 }}>Nenhuma operação ativa</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>OS e atendimentos em andamento aparecerão aqui.</div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA SERVIÇOS DO DIA ──────────────────────────────────────────── */}
      {abaAtiva === "servicos_dia" && (
        <ServicosDoDiaAba servicos={servicosDoDia} />
      )}
    </div>
  );
}
