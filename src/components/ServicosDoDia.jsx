import React, { useMemo } from "react";
import jsPDF from "jspdf";
import { drawCell } from "../pdf/pdfHelpers";
import { styles } from "../styles/appStyles";
import { SERVICE_TYPE_OPTIONS } from "../constants";
import { formatDateBR } from "../utils/format";

// ─── Helpers (exported for reuse in Equipe.jsx) ──────────────────────────────

export function servicoAtivo(services, nome) {
  return (services || []).some((s) => s.name === nome && s.checked);
}

export function tipoServico(item) {
  const s = item.services || [];
  if (servicoAtivo(s, "CREMAÇÃO")) return "cremacao";
  if (
    servicoAtivo(s, "TRANSLADO AÉREO") ||
    servicoAtivo(s, "TRANSLADO TERRESTRE") ||
    servicoAtivo(s, "TRANSLADO FLUVIAL")
  ) return "translado";
  return "sepultamento";
}

export function getTipoTransladoLabel(services) {
  if (servicoAtivo(services, "TRANSLADO AÉREO")) return "TRANSLADO AÉREO";
  if (servicoAtivo(services, "TRANSLADO TERRESTRE")) return "TRANSLADO TERRESTRE";
  if (servicoAtivo(services, "TRANSLADO FLUVIAL")) return "TRANSLADO FLUVIAL";
  return "TRANSLADO";
}

export function getLocalVelorio(form) {
  if (form.velorioTipo === "funeraria") {
    return [form.velorioUnidade, form.velorioSala].filter(Boolean).join(" — ");
  }
  if (form.velorioTipo === "viagem") return "TANATO";
  if (form.velorioTipo === "residencia") {
    return [form.velorioEndereco, form.velorioNumero, form.velorioBairro].filter(Boolean).join(", ");
  }
  if (form.velorioTipo === "igreja") {
    return [form.velorioNomeLocal, form.velorioEndereco].filter(Boolean).join(", ");
  }
  return "";
}

export function getServiceTypeLabel(tipoPlano) {
  return SERVICE_TYPE_OPTIONS.find((o) => o.value === tipoPlano)?.label || (tipoPlano || "").toUpperCase();
}

function getCemiterioOuTipo(item) {
  const form = item.form || {};
  const tipo = tipoServico(item);
  if (tipo === "cremacao") return "CREMAÇÃO";
  if (tipo === "translado") return getTipoTransladoLabel(item.services);
  return form.cemiterio || "—";
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateBRShort(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function ordenarServicos(lista) {
  return [
    ...lista.filter((i) => tipoServico(i) === "sepultamento"),
    ...lista.filter((i) => tipoServico(i) === "cremacao"),
    ...lista.filter((i) => tipoServico(i) === "translado"),
  ];
}

// ─── WhatsApp text ────────────────────────────────────────────────────────────

function gerarTextoWhatsApp(ordenados) {
  const hj = hoje();
  const lines = [`*SERVIÇOS DO DIA ${formatDateBRShort(hj)}*`, ""];

  ordenados.forEach((item) => {
    const form = item.form || {};
    const local = getLocalVelorio(form);
    const falecido = (form.falecido || "").toUpperCase();
    const cemOuTipo = getCemiterioOuTipo(item);
    const hora = form.horaSaida || "—";
    const motorista = form.motorista || "—";
    const temOnibus = servicoAtivo(item.services, "ÔNIBUS");

    if (local) lines.push(`📍 ${local}`);
    lines.push(`👤 ${falecido}`);
    lines.push(cemOuTipo);
    lines.push(`⏰ SAINDO ÀS ${hora}`);
    lines.push(`🚗 MOTORISTA: ${motorista}`);
    if (temOnibus) lines.push("🚌 TEM ÔNIBUS");
    lines.push("");
  });

  return lines.join("\n");
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

const BLOCK_HEIGHT = 6 * 5.9 + 8; // 6 rows + spacing + separator ≈ 43.4mm

function gerarPDFOficial(ordenados) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.22);

  const left = 5;
  let y = 5;

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text(`SERVIÇOS DO DIA — ${formatDateBR(hoje())}`, 105, y + 5, { align: "center" });
  y += 14;

  let seq = 1;

  for (const item of ordenados) {
    if (y + BLOCK_HEIGHT > 270) {
      doc.addPage();
      y = 5;
    }

    const form = item.form || {};
    const localVelorio = getLocalVelorio(form);
    const tipoLabel = getServiceTypeLabel(form.tipoPlano);
    const falecido = form.falecido || "";
    const dataObito = formatDateBR(form.dataFalecimento) || "";
    const localObito = form.localObito || "";
    const cemOuTipo = getCemiterioOuTipo(item);
    const obs = form.observacaoTermo || "";
    const hora = form.horaSaida || "";
    const motorista = form.motorista || "";

    // Row 1: LOCAL VELÓRIO | SERVIÇO
    drawCell(doc, left, y, 130, 5.9, `LOCAL VELÓRIO: ${localVelorio}`, { fontSize: 9 });
    drawCell(doc, 135, y, 70, 5.9, `SERVIÇO: ${tipoLabel}`, { fontSize: 9 });
    y += 5.9;

    // Row 2: FALECIDO | DATA DO ÓBITO
    drawCell(doc, left, y, 130, 5.9, `FALECIDO: ${falecido}`, { bold: true, fontSize: 11 });
    drawCell(doc, 135, y, 70, 5.9, `DATA DO ÓBITO: ${dataObito}`, { fontSize: 9 });
    y += 5.9;

    // Row 3: LOCAL DO ÓBITO | DOCUMENTO
    drawCell(doc, left, y, 130, 5.9, `LOCAL DO ÓBITO: ${localObito}`, { fontSize: 9 });
    drawCell(doc, 135, y, 70, 5.9, `DOCUMENTO:`, { fontSize: 9 });
    y += 5.9;

    // Row 4: CEMITÉRIO (full width)
    drawCell(doc, left, y, 200, 5.9, `CEMITÉRIO: ${cemOuTipo}`, { fontSize: 9 });
    y += 5.9;

    // Row 5: OBS with sequential number
    drawCell(doc, left, y, 200, 5.9, `OBS: ${seq}  ${obs}`, { fontSize: 9 });
    y += 5.9;

    // Row 6: SEPULTAMENTO | MOTORISTA
    drawCell(doc, left, y, 130, 5.9, `SEPULTAMENTO: SAINDO ÀS: ${hora}`, { bold: true, fontSize: 9 });
    drawCell(doc, 135, y, 70, 5.9, `MOTORISTA: ${motorista}`, { bold: true, fontSize: 9 });
    y += 5.9;

    // Separator
    y += 3;
    doc.setLineWidth(0.5);
    doc.line(left, y, 205, y);
    doc.setLineWidth(0.22);
    y += 5;

    seq++;
  }

  return doc;
}

// ─── Card component ───────────────────────────────────────────────────────────

const TIPO_BADGE = {
  sepultamento: { label: "SEPULTAMENTO", bg: "rgba(34,197,94,0.12)",  color: "#15803d" },
  cremacao:     { label: "CREMAÇÃO",     bg: "rgba(249,115,22,0.12)", color: "#c2410c" },
  translado:    { label: "TRANSLADO",    bg: "rgba(59,130,246,0.12)", color: "#1d4ed8" },
};

function ServicoCard({ item, numero }) {
  const form = item.form || {};
  const tipo = tipoServico(item);
  const badge = TIPO_BADGE[tipo];
  const localVelorio = getLocalVelorio(form);
  const cemOuTipo = getCemiterioOuTipo(item);
  const temOnibus = servicoAtivo(item.services, "ÔNIBUS");

  return (
    <div style={{ ...styles.card, borderLeft: "4px solid var(--brand-accent)", marginBottom: 0 }}>
      {/* Header row: badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ ...styles.infoPill, fontSize: 11, minWidth: "auto" }}>Nº {numero}</span>
          <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}22`, borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>
            {badge.label}
          </span>
          {temOnibus && (
            <span style={{ background: "rgba(139,92,246,0.12)", color: "#7c3aed", border: "1px solid rgba(139,92,246,0.22)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>
              <i className="fa-solid fa-bus" style={{ marginRight: 5 }} />ÔNIBUS
            </span>
          )}
        </div>
        <span style={{ ...styles.infoPill, fontSize: 11, minWidth: "auto" }}>{getServiceTypeLabel(form.tipoPlano)}</span>
      </div>

      {/* Main info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
        <div>
          <div style={{ ...styles.label, marginBottom: 3 }}>LOCAL VELÓRIO</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-main)" }}>{localVelorio || "—"}</div>
        </div>
        <div>
          <div style={{ ...styles.label, marginBottom: 3 }}>FALECIDO</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-main)", textTransform: "uppercase" }}>{form.falecido || "—"}</div>
        </div>
        <div>
          <div style={{ ...styles.label, marginBottom: 3 }}>LOCAL DO ÓBITO</div>
          <div style={{ fontSize: 13 }}>{form.localObito || "—"}</div>
        </div>
        <div>
          <div style={{ ...styles.label, marginBottom: 3 }}>CEMITÉRIO</div>
          <div style={{ fontSize: 13, fontWeight: tipo !== "sepultamento" ? 700 : 400 }}>{cemOuTipo}</div>
        </div>
        <div>
          <div style={{ ...styles.label, marginBottom: 3 }}>DATA DO ÓBITO</div>
          <div style={{ fontSize: 13 }}>{formatDateBR(form.dataFalecimento) || "—"}</div>
        </div>
        <div>
          <div style={{ ...styles.label, marginBottom: 3 }}>SAINDO ÀS</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--brand-accent)" }}>{form.horaSaida || "—"}</div>
        </div>
        <div>
          <div style={{ ...styles.label, marginBottom: 3 }}>MOTORISTA</div>
          <div style={{ fontSize: 13 }}>{form.motorista || "—"}</div>
        </div>
        {form.observacaoTermo ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ ...styles.label, marginBottom: 3 }}>OBS</div>
            <div style={{ fontSize: 13, color: "var(--text-soft)" }}>{form.observacaoTermo}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ServicosDoDia({ atendimentos }) {
  const hj = hoje();

  const servicosHoje = useMemo(() => {
    const filtrados = (atendimentos || []).filter(
      (item) => item?.form?.dataSaida === hj
    );
    return ordenarServicos(filtrados);
  }, [atendimentos, hj]);

  const contadores = useMemo(() => ({
    sepultamentos: servicosHoje.filter((i) => tipoServico(i) === "sepultamento").length,
    cremacoes:     servicosHoje.filter((i) => tipoServico(i) === "cremacao").length,
    translados:    servicosHoje.filter((i) => tipoServico(i) === "translado").length,
  }), [servicosHoje]);

  function copiarWhatsApp() {
    if (!servicosHoje.length) { alert("Nenhum serviço para copiar."); return; }
    const texto = gerarTextoWhatsApp(servicosHoje);
    navigator.clipboard
      .writeText(texto)
      .then(() => alert("Copiado!"))
      .catch(() => alert("Não foi possível copiar automaticamente."));
  }

  function gerarPDF() {
    if (!servicosHoje.length) { alert("Nenhum serviço para gerar PDF."); return; }
    const doc = gerarPDFOficial(servicosHoje);
    const dataStr = formatDateBRShort(hj).replace(/\//g, "-");
    doc.save(`servicos-dia-${dataStr}.pdf`);
  }

  return (
    <section style={styles.moduleCard}>
      <div style={styles.moduleHeader}>
        <div>
          <h2 style={styles.moduleTitle}>SERVIÇOS DO DIA</h2>
          <p style={styles.moduleSub}>{formatDateBR(hj)}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.outlineDarkBtn} onClick={copiarWhatsApp} disabled={!servicosHoje.length}>
            <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} />Copiar para WhatsApp
          </button>
          <button style={styles.primaryBtn} onClick={gerarPDF} disabled={!servicosHoje.length}>
            <i className="fa-solid fa-file-pdf" style={styles.buttonIcon} /> Gerar PDF Oficial
          </button>
        </div>
      </div>

      <div style={styles.infoRow}>
        <div style={styles.infoPill}>Total: {servicosHoje.length}</div>
        {contadores.sepultamentos > 0 && <div style={styles.infoPill}>Sepultamentos: {contadores.sepultamentos}</div>}
        {contadores.cremacoes > 0 && <div style={styles.infoPill}>Cremações: {contadores.cremacoes}</div>}
        {contadores.translados > 0 && <div style={styles.infoPill}>Translados: {contadores.translados}</div>}
      </div>

      {servicosHoje.length === 0 ? (
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Nenhum serviço registrado para hoje</div>
          <div style={styles.modulePlaceholderText}>
            Atendimentos com data de saída igual a hoje ({formatDateBR(hj)}) aparecerão aqui.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {servicosHoje.map((item, idx) => (
            <ServicoCard key={item.id} item={item} numero={idx + 1} />
          ))}
        </div>
      )}
    </section>
  );
}
