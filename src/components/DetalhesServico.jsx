import React from "react";
import { gerarFichaPdf } from "../pdf/gerarFichaPDF";
import { drawCell } from "../pdf/pdfHelpers";
import { formatDateBR, formatMoney, getCemiterioNome, getHospitalNome } from "../utils/format";
import { OPERATION_STAGES, SERVICE_TYPE_OPTIONS } from "../constants";
import { getLocalVelorio } from "./ServicosDoDia";

// ─── Masks (local, retrocompat) ───────────────────────────────────────────────

function maskCpf(v) {
  const n = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`;
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
}
function maskRg(v) {
  const n = String(v || "").replace(/\D/g, "").slice(0, 9);
  if (n.length <= 2) return n;
  if (n.length <= 5) return `${n.slice(0,2)}.${n.slice(2)}`;
  if (n.length <= 8) return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5)}`;
  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}-${n.slice(8)}`;
}
function maskCel(v) {
  const n = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 7) return `(${n.slice(0,2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
}

function calcularIdade(nasc, ref) {
  if (!nasc || !ref) return null;
  const anos = Math.floor((new Date(ref) - new Date(nasc)) / (365.25 * 24 * 60 * 60 * 1000));
  return isNaN(anos) || anos < 0 ? null : anos;
}

function tipoLabel(tipoPlano) {
  return SERVICE_TYPE_OPTIONS.find(o => o.value === tipoPlano)?.label || (tipoPlano || "").toUpperCase();
}

function simnao(v) {
  if (v === "sim") return "Sim";
  if (v === "nao" || v === "não") return "Não";
  return v;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

const BRAND = "var(--brand-accent)";

function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 3, height: 14, background: BRAND, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: BRAND, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {children}
      </span>
    </div>
  );
}

function Separator() {
  return <div style={{ borderTop: "1px solid #f0f4f3", margin: "24px 0" }} />;
}

function Grid({ cols = 3, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "14px 20px" }}>
      {children}
    </div>
  );
}

function Field({ label, value, span, children }) {
  const content = children || value;
  if (!content && content !== 0) return null;
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
        {content}
      </div>
    </div>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STAGE_STATUS_COLORS = {
  finalizado:   "#15803d",
  em_andamento: "#b45309",
  nao_iniciado: "#94a3b8",
};

const STATUS_BADGE_CFG = {
  "Concluído":         { bg: "rgba(34,197,94,0.1)",   color: "#15803d", border: "rgba(34,197,94,0.25)"   },
  "Em andamento":      { bg: "rgba(249,115,22,0.1)",  color: "#c2410c", border: "rgba(249,115,22,0.25)"  },
  "Em progresso":      { bg: "rgba(59,130,246,0.1)",  color: "#1d4ed8", border: "rgba(59,130,246,0.25)"  },
  "Aguardando início": { bg: "rgba(245,158,11,0.1)",  color: "#b45309", border: "rgba(245,158,11,0.28)"  },
};
const STATUS_DEFAULT = { bg: "rgba(148,163,184,0.1)", color: "#64748b", border: "rgba(148,163,184,0.25)" };

function StatusBadge({ status }) {
  const cfg = STATUS_BADGE_CFG[status] || STATUS_DEFAULT;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

// ─── Service chip text ────────────────────────────────────────────────────────

function buildServiceChip(s, form) {
  let chip = s.name;
  if (s.name === "URNA") {
    const extras = [form.modeloUrna, form.corUrna].filter(Boolean).join(" · ");
    if (extras) chip += ` (${extras})`;
  } else {
    if (s.qty) chip += ` × ${s.qty}`;
    if (s.value) chip += ` (R$ ${formatMoney(s.value)})`;
  }
  return chip;
}

// ─── Stage info text ──────────────────────────────────────────────────────────

const TRANSPORT_KEYS = new Set(["remocao", "entrega", "sepultamento"]);

function stageResposavel(key, st) {
  if (TRANSPORT_KEYS.has(key)) {
    return [st.driver && `Motorista: ${st.driver}`, st.car && `Carro: ${st.car}`].filter(Boolean).join(" · ");
  }
  if (key === "atendimento") return st.attendant ? `Atendente: ${st.attendant}` : "";
  if (key === "procedimentoClinico") return st.technician ? `Técnico: ${st.technician}` : "";
  if (key === "ornamentacao") return st.support ? `Apoio: ${st.support}` : "";
  return "";
}

function stageStatusLabel(s) {
  if (s === "finalizado")   return "Concluída";
  if (s === "em_andamento") return "Em andamento";
  return "Aguardando";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DetalhesServico({ atendimento, onVoltar, openPdfPreview }) {
  const form     = atendimento?.form || {};
  const services = atendimento?.services || [];
  const stages   = atendimento?.operationalStages || {};

  const isSocio = ["socio_especial", "socio_luxo", "socio_premium"].includes(form.tipoPlano);

  const idadeFalecimento = calcularIdade(form.dataNascimento, form.dataFalecimento);
  const servicosAtivos   = services.filter(s => s.checked);

  function handleGerarPdf() {
    gerarFichaPdf({
      form,
      services,
      totalValue: atendimento?.totalValue || 0,
      drawCell,
      formatDateBR,
      formatMoney,
      openPdfPreview,
      operationalStages: stages,
    });
  }

  // ── Velório ──────────────────────────────────────────────────────────────────

  const localVelorio = getLocalVelorio(form);
  const enderecVelorio = (form.velorioTipo === "residencia" || form.velorioTipo === "igreja")
    ? [form.velorioEndereco, form.velorioNumero, form.velorioComplemento, form.velorioBairro].filter(Boolean).join(", ")
    : "";

  // ── Serviços — texto corrido ─────────────────────────────────────────────────

  const servicosTexto = servicosAtivos.map(s => buildServiceChip(s, form));

  // ── Termo — texto corrido ────────────────────────────────────────────────────

  const termoPartes = [
    form.necropsia === "sim" ? "Necropsiado" : form.necropsia === "nao" ? "Não necropsiado" : null,
    form.veioVestido
      ? `Chegou vestido: ${simnao(form.veioVestido)}${form.veioVestido === "sim" ? (form.roupaDestino ? ` — ${form.roupaDestino}` : "") + (form.roupaEntreguePara ? ` · Entregue para: ${form.roupaEntreguePara}` : "") : ""}`
      : null,
    form.retirarEsmalte ? `Retirar esmalte: ${simnao(form.retirarEsmalte)}` : null,
    form.barbear        ? `Barbear: ${simnao(form.barbear)}` : null,
    form.bigode         ? `Bigode: ${simnao(form.bigode)}` : null,
    form.cavanhaque     ? `Cavanhaque: ${simnao(form.cavanhaque)}` : null,
    form.maquiagem
      ? `Maquiagem: ${simnao(form.maquiagem)}${form.maquiagem === "sim" && form.maquiagemTipo ? ` — ${form.maquiagemTipo}` : ""}`
      : null,
    form.ornamentacao
      ? `Ornamentação: ${simnao(form.ornamentacao)}${form.ornamentacao === "sim" && form.tipoFlor ? ` — ${form.tipoFlor}` : ""}`
      : null,
    form.joias
      ? `Joias: ${simnao(form.joias)}${form.joias === "sim" && form.joiasQuais ? ` — ${form.joiasQuais}` : ""}`
      : null,
    form.modeloUrna
      ? `Urna: ${form.modeloUrna}${form.modeloUrna === "luxo" && form.refUrna ? ` REF: ${form.refUrna}` : ""}${form.corUrna ? ` — ${form.corUrna}` : ""}`
      : null,
    form.tecnico ? `Técnico: ${form.tecnico}` : null,
    form.observacaoTermo ? `Obs: ${form.observacaoTermo}` : null,
  ].filter(Boolean);

  // ── Etapas — texto corrido ───────────────────────────────────────────────────

  const etapasPartes = OPERATION_STAGES.map(({ key, label }) => {
    const st     = stages[key] || {};
    const status = st.status || "nao_iniciado";
    const color  = STAGE_STATUS_COLORS[status];
    const resp   = stageResposavel(key, st);

    let detail = "";
    if (status === "finalizado" || status === "em_andamento") {
      const tempos = [st.start && `início: ${st.start}`, st.end && `fim: ${st.end}`].filter(Boolean).join(" → ");
      detail = [tempos, resp].filter(Boolean).join(" · ");
    }

    return { label, status, color, statusLabel: stageStatusLabel(status), detail };
  });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "0 0 32px" }}>

      {/* ── Barra de ações ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={onVoltar}
          style={{ background: "none", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "var(--text-main)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fa-solid fa-arrow-left" />Voltar
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <StatusBadge status={atendimento?.status || "—"} />
          <button
            type="button"
            onClick={handleGerarPdf}
            style={{ background: BRAND, border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-file-pdf" />Gerar PDF
          </button>
        </div>
      </div>

      {/* ── Ficha (sempre branca) ────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 18, padding: "32px 36px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `2px solid ${BRAND}` }}>
          <div style={{ fontSize: 11, color: BRAND, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
            {atendimento?.numero || "—"}
            {atendimento?.dataAtendimento ? ` · ${formatDateBR(atendimento.dataAtendimento)}` : ""}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#111827", marginBottom: 10, lineHeight: 1.2 }}>
            {form.falecido || "Falecido não informado"}
          </div>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            {[
              atendimento?.atendente && `Atendido por ${atendimento.atendente}`,
              tipoLabel(form.tipoPlano),
              isSocio && form.codigo && `Cód. ${form.codigo}`,
              isSocio && form.dependente && `Dep. ${form.dependente}`,
            ].filter(Boolean).join(" · ")}
          </div>
        </div>

        {/* ── 1. Dados do falecido ─────────────────────────────────────────── */}
        <SectionTitle>Dados do falecido</SectionTitle>
        <Grid cols={3}>
          <Field label="Sexo"       value={form.sexo} />
          <Field label="Nascimento" value={form.dataNascimento
            ? `${formatDateBR(form.dataNascimento)}${idadeFalecimento != null ? ` (${idadeFalecimento} anos)` : ""}`
            : undefined} />
          <Field label="Peso / Altura"
            value={[form.peso, form.altura].filter(Boolean).join(" / ") || undefined} />
          <Field label="Falecimento"
            value={[formatDateBR(form.dataFalecimento), form.horaFalecimento].filter(Boolean).join(" às ") || undefined} />
          <Field label="Local do óbito" value={getHospitalNome(form.localObito) || undefined} />
          <Field label="Religião"       value={form.religiao} />
        </Grid>

        <Separator />

        {/* ── 2. Velório e sepultamento ────────────────────────────────────── */}
        <SectionTitle>Velório e sepultamento</SectionTitle>
        <Grid cols={3}>
          <Field label="Local do velório"  value={localVelorio || undefined} />
          {enderecVelorio && <Field label="Endereço" value={enderecVelorio} span={2} />}
          <Field label="Início do velório" value={form.horarioVelorio} />
          <Field label="Tempo"
            value={form.tempoVelorioValor
              ? `${form.tempoVelorioValor} ${form.tempoVelorioUnidade || ""}`.trim()
              : undefined} />
          <Field label="Cemitério"
            value={form.cemiterio ? getCemiterioNome(form.cemiterio) : undefined} />
          <Field label="Data / Hora de saída"
            value={[formatDateBR(form.dataSaida), form.horaSaida].filter(Boolean).join(" às ") || undefined} />
        </Grid>

        <Separator />

        {/* ── 3. Responsável ───────────────────────────────────────────────── */}
        <SectionTitle>Responsável</SectionTitle>
        <Grid cols={3}>
          <Field label="Nome"       value={form.responsavelNome}  span={2} />
          <Field label="Parentesco" value={form.parentesco} />
          <Field label="CPF"        value={form.responsavelCpf  ? maskCpf(form.responsavelCpf)  : undefined} />
          <Field label="RG"         value={form.responsavelRg   ? maskRg(form.responsavelRg)    : undefined} />
          <Field label="Celular"    value={form.responsavelCelular1 ? maskCel(form.responsavelCelular1) : undefined} />
          <Field label="Endereço" span={3}
            value={[
              form.responsavelEndereco,
              form.responsavelNumero && `, ${form.responsavelNumero}`,
              form.responsavelComplemento && ` — ${form.responsavelComplemento}`,
              form.responsavelBairro && ` — ${form.responsavelBairro}`,
              form.responsavelCep && ` · CEP ${form.responsavelCep}`,
            ].filter(Boolean).join("") || undefined} />
        </Grid>

        <Separator />

        {/* ── 4. Serviços contratados ──────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Serviços contratados</SectionTitle>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
            Total: R$ {formatMoney(atendimento?.totalValue || 0)}
          </div>
        </div>

        {servicosAtivos.length === 0 ? (
          <p style={{ fontSize: 14, color: "#94a3b8" }}>Nenhum serviço contratado.</p>
        ) : (
          <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.9, margin: 0 }}>
            {servicosTexto.map((chip, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: "#d1d5db", margin: "0 6px" }}>·</span>}
                {chip}
              </span>
            ))}
          </p>
        )}

        <Separator />

        {/* ── 5. Termo de autorização ──────────────────────────────────────── */}
        <SectionTitle>Termo de autorização</SectionTitle>
        {termoPartes.length === 0 ? (
          <p style={{ fontSize: 14, color: "#94a3b8" }}>Sem dados de autorização.</p>
        ) : (
          <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.9, margin: 0 }}>
            {termoPartes.map((parte, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: "#d1d5db", margin: "0 6px" }}>·</span>}
                {parte.startsWith("Técnico:") ? (
                  <>Técnico: <strong>{parte.replace("Técnico: ", "")}</strong></>
                ) : parte}
              </span>
            ))}
          </p>
        )}

        <Separator />

        {/* ── 6. Etapas operacionais ───────────────────────────────────────── */}
        <SectionTitle>Etapas operacionais</SectionTitle>
        <p style={{ fontSize: 14, color: "#111827", lineHeight: 2.2, margin: 0 }}>
          {etapasPartes.map(({ label, statusLabel, color, detail }, i) => (
            <span key={i}>
              {i > 0 && <span style={{ color: "#d1d5db", margin: "0 8px" }}>·</span>}
              <span style={{ fontWeight: 600 }}>{label}</span>{" "}
              <span style={{ color, fontWeight: 600 }}>{statusLabel}</span>
              {detail && <span style={{ color: "#94a3b8", fontSize: 12 }}> ({detail})</span>}
            </span>
          ))}
        </p>

      </div>
    </div>
  );
}
