import jsPDF from "jspdf";
import { OPERATION_STAGES, SERVICE_TYPE_OPTIONS } from "../constants";
import { getCemiterioNome, formatMoney, formatDateBR, getHospitalNome } from "../utils/format";

// ─── Helpers locais ───────────────────────────────────────────────────────────

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

function simnao(v) {
  if (v === "sim") return "Sim";
  if (v === "nao" || v === "não") return "Não";
  return v || "—";
}

function getLocalVelorio(form) {
  if (form.velorioTipo === "funeraria")
    return [form.velorioUnidade, form.velorioSala].filter(Boolean).join(" — ");
  if (form.velorioTipo === "viagem") return form.cidadeDestino || "TRANSLADO";
  if (form.velorioTipo === "residencia")
    return [form.velorioEndereco, form.velorioNumero, form.velorioBairro].filter(Boolean).join(", ");
  if (form.velorioTipo === "igreja")
    return [form.velorioNomeLocal, form.velorioEndereco].filter(Boolean).join(", ");
  return "";
}

function tipoLabel(t) {
  return SERVICE_TYPE_OPTIONS.find(o => o.value === t)?.label || (t || "").toUpperCase();
}

function stageStatusText(s) {
  if (s === "finalizado")   return "Concluída";
  if (s === "em_andamento") return "Em andamento";
  return "Aguardando";
}
function stageStatusColor(s) {
  if (s === "finalizado")   return "#15803d";
  if (s === "em_andamento") return "#b45309";
  return "#94a3b8";
}

// ─── Primitivos de desenho ────────────────────────────────────────────────────

const BRAND = "#26b1c4";

function drawSectionTitle(doc, x, y, title) {
  doc.setFillColor(BRAND);
  doc.rect(x, y, 1.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(BRAND);
  doc.text(title.toUpperCase(), x + 3, y + 3.8);
  return y + 8;
}

function drawField(doc, x, y, label, value, maxW) {
  const val = String(value ?? "—");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor("#94a3b8");
  doc.text(String(label).toUpperCase(), x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor("#222222");
  const lines = doc.splitTextToSize(val, (maxW || 60) - 2);
  doc.text(lines[0] || val.slice(0, 35), x, y + 4);
}

function drawSep(doc, x, y, w) {
  doc.setDrawColor("#f0f4f3");
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
}

// ─── Texto corrido com cor inline ─────────────────────────────────────────────

function renderInlineText(doc, segments, startX, startY, maxX, lineH) {
  let cx = startX, cy = startY;
  for (const { text, color, bold } of segments) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color || "#333333");
    const words = text.split(/(\s+)/);
    for (const word of words) {
      if (!word) continue;
      const w = doc.getTextWidth(word);
      if (cx + w > maxX && word.trim().length > 0) {
        cx = startX; cy += lineH;
      }
      doc.text(word, cx, cy);
      cx += w;
    }
  }
  return cy + lineH;
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function gerarDetalhePDF({ atendimento, form, services, openPdfPreview }) {
  const doc  = new jsPDF("p", "mm", "a4");
  const L    = 12;   // margem esquerda
  const W    = 186;  // largura útil
  const C    = 62;   // 1 coluna (W / 3)
  const RX   = L + W; // x máximo (borda direita)
  const LHEIGHT = 5.5; // line-height em texto corrido

  const stages       = atendimento?.operationalStages || {};
  const isSocio      = ["socio_especial", "socio_luxo", "socio_premium"].includes(form?.tipoPlano);
  const servicosAtivos = (services || []).filter(s => s.checked);
  const atendente    = atendimento?.atendente || form?.atendenteGeral || "";

  let y = 12;

  // ── CABEÇALHO ───────────────────────────────────────────────────────────────

  // Número + data
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(BRAND);
  const numData = [atendimento?.numero, atendimento?.dataAtendimento ? formatDateBR(atendimento.dataAtendimento) : ""].filter(Boolean).join(" · ");
  doc.text(numData || "—", L, y + 4);

  // Nome
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#111111");
  const nomeFalecido = doc.splitTextToSize(form?.falecido || "Falecido não informado", W);
  doc.text(nomeFalecido[0], L, y + 5);

  // Subtítulo atendente + tipo
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#64748b");
  const subtitulo = [
    atendente && `Atendido por ${atendente}`,
    tipoLabel(form?.tipoPlano),
    isSocio && form?.codigo && `Cód. ${form.codigo}`,
    isSocio && form?.dependente && `Dep. ${form.dependente}`,
  ].filter(Boolean).join(" · ");
  doc.text(doc.splitTextToSize(subtitulo, W)[0] || "", L, y + 4);

  // Linha brand-accent
  y += 8;
  doc.setDrawColor(BRAND);
  doc.setLineWidth(0.5);
  doc.line(L, y, L + W, y);

  y += 4;

  // ── DADOS DO FALECIDO ────────────────────────────────────────────────────────

  drawSep(doc, L, y, W); y += 3;
  y = drawSectionTitle(doc, L, y, "Dados do Falecido");

  const idadeFal = (() => {
    if (!form?.dataNascimento || !form?.dataFalecimento) return null;
    const a = Math.floor((new Date(form.dataFalecimento) - new Date(form.dataNascimento)) / (365.25 * 24 * 3600 * 1000));
    return isNaN(a) || a < 0 ? null : a;
  })();
  const nascText = form?.dataNascimento
    ? `${formatDateBR(form.dataNascimento)}${idadeFal != null ? ` (${idadeFal} anos)` : ""}`
    : "—";

  drawField(doc, L,       y, "Sexo",         form?.sexo,                                C);
  drawField(doc, L + C,   y, "Nascimento",   nascText,                                   C);
  drawField(doc, L + C*2, y, "Peso / Altura", [form?.peso, form?.altura].filter(Boolean).join(" / ") || "—", C);
  y += 11;

  const falText = [formatDateBR(form?.dataFalecimento), form?.horaFalecimento].filter(Boolean).join(" às ");
  drawField(doc, L,       y, "Falecimento",  falText || "—",                             C);
  drawField(doc, L + C,   y, "Local do Óbito", getHospitalNome(form?.localObito) || "—", C);
  drawField(doc, L + C*2, y, "Religião",     form?.religiao || "—",                      C);
  y += 11;

  // ── VELÓRIO E SEPULTAMENTO ───────────────────────────────────────────────────

  drawSep(doc, L, y, W); y += 3;
  y = drawSectionTitle(doc, L, y, "Velório e Sepultamento");

  const localVel = getLocalVelorio(form || {}) || "—";
  const tempoVel = form?.tempoVelorioValor ? `${form.tempoVelorioValor} ${form.tempoVelorioUnidade || ""}`.trim() : "—";
  const saidaText = [formatDateBR(form?.dataSaida), form?.horaSaida].filter(Boolean).join(" às ");

  drawField(doc, L,       y, "Local do velório",  localVel,                                C);
  drawField(doc, L + C,   y, "Tempo",             tempoVel,                                C);
  drawField(doc, L + C*2, y, "Cemitério",         getCemiterioNome(form?.cemiterio) || "—", C);
  y += 11;

  drawField(doc, L,       y, "Início do velório", form?.horarioVelorio || "—",             C);
  drawField(doc, L + C,   y, "Data / Hora saída", saidaText || "—",                        C);
  y += 11;

  // ── RESPONSÁVEL ──────────────────────────────────────────────────────────────

  drawSep(doc, L, y, W); y += 3;
  y = drawSectionTitle(doc, L, y, "Responsável");

  drawField(doc, L,         y, "Nome",       form?.responsavelNome || "—",         C * 2);
  drawField(doc, L + C * 2, y, "Parentesco", form?.parentesco || "—",              C);
  y += 11;

  drawField(doc, L,       y, "CPF",    form?.responsavelCpf  ? maskCpf(form.responsavelCpf)  : "—", C);
  drawField(doc, L + C,   y, "RG",     form?.responsavelRg   ? maskRg(form.responsavelRg)    : "—", C);
  drawField(doc, L + C*2, y, "Celular", form?.responsavelCelular1 ? maskCel(form.responsavelCelular1) : "—", C);
  y += 11;

  const enderecoResp = [
    form?.responsavelEndereco,
    form?.responsavelNumero && `, ${form.responsavelNumero}`,
    form?.responsavelComplemento && ` — ${form.responsavelComplemento}`,
    form?.responsavelBairro && ` — ${form.responsavelBairro}`,
    form?.responsavelCep && ` · CEP ${form.responsavelCep}`,
  ].filter(Boolean).join("") || "—";

  drawField(doc, L, y, "Endereço", enderecoResp, W);
  y += 11;

  // ── SERVIÇOS CONTRATADOS ─────────────────────────────────────────────────────

  drawSep(doc, L, y, W); y += 3;
  const servY = y;
  y = drawSectionTitle(doc, L, y, "Serviços Contratados");

  // Total alinhado à direita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor("#111111");
  const totalStr = `Total: R$ ${formatMoney(atendimento?.totalValue || 0)}`;
  doc.text(totalStr, L + W - doc.getTextWidth(totalStr), servY + 5);

  // Texto corrido dos serviços
  const servTexto = servicosAtivos.map(s => {
    if (s.name === "URNA") {
      const extras = [form?.modeloUrna, form?.corUrna].filter(Boolean).join(" · ");
      return extras ? `URNA (${extras})` : "URNA";
    }
    let chip = s.name;
    if (s.qty) chip += ` × ${s.qty}`;
    if (s.value) chip += ` (R$ ${formatMoney(s.value)})`;
    return chip;
  }).join("  ·  ");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#333333");
  const servLines = doc.splitTextToSize(servTexto || "Nenhum serviço.", W);
  const maxServLines = 6;
  servLines.slice(0, maxServLines).forEach((line, i) => {
    doc.text(line, L, y + i * LHEIGHT);
  });
  y += Math.max(servLines.slice(0, maxServLines).length * LHEIGHT, LHEIGHT) + 2;

  // ── TERMO DE AUTORIZAÇÃO ─────────────────────────────────────────────────────

  drawSep(doc, L, y, W); y += 3;
  y = drawSectionTitle(doc, L, y, "Termo de Autorização");

  const termoPartes = [
    form?.necropsia === "sim" ? "Necropsiado" : "Não necropsiado",
    form?.veioVestido && `Chegou vestido: ${simnao(form.veioVestido)}${form.veioVestido === "sim" && form.roupaDestino ? ` — ${form.roupaDestino}` : ""}${form.veioVestido === "sim" && form.roupaEntreguePara ? ` · Entregue para: ${form.roupaEntreguePara}` : ""}`,
    form?.retirarEsmalte && `Retirar esmalte: ${simnao(form.retirarEsmalte)}`,
    form?.barbear        && `Barbear: ${simnao(form.barbear)}`,
    form?.bigode         && `Bigode: ${simnao(form.bigode)}`,
    form?.cavanhaque     && `Cavanhaque: ${simnao(form.cavanhaque)}`,
    form?.maquiagem      && `Maquiagem: ${simnao(form.maquiagem)}${form.maquiagem === "sim" && form.maquiagemTipo ? ` — ${form.maquiagemTipo}` : ""}`,
    form?.ornamentacao   && `Ornamentação: ${simnao(form.ornamentacao)}${form.ornamentacao === "sim" && form.tipoFlor ? ` — ${form.tipoFlor}` : ""}`,
    form?.joias          && `Joias: ${simnao(form.joias)}${form.joias === "sim" && form.joiasQuais ? ` — ${form.joiasQuais}` : ""}`,
    form?.modeloUrna     && `Urna: ${form.modeloUrna}${form.modeloUrna === "luxo" && form.refUrna ? ` REF: ${form.refUrna}` : ""}${form.corUrna ? ` — ${form.corUrna}` : ""}`,
    form?.tecnico        && `Técnico: ${form.tecnico}`,
    form?.observacaoTermo && `Obs: ${form.observacaoTermo}`,
  ].filter(Boolean).join("  ·  ");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#333333");
  const termoLines = doc.splitTextToSize(termoPartes || "—", W);
  const maxTermoLines = 5;
  termoLines.slice(0, maxTermoLines).forEach((line, i) => {
    doc.text(line, L, y + i * LHEIGHT);
  });
  y += Math.max(termoLines.slice(0, maxTermoLines).length * LHEIGHT, LHEIGHT) + 2;

  // ── ETAPAS OPERACIONAIS ───────────────────────────────────────────────────────

  drawSep(doc, L, y, W); y += 3;
  y = drawSectionTitle(doc, L, y, "Etapas Operacionais");

  // Construir segmentos coloridos para texto corrido
  const stageSegments = [];
  OPERATION_STAGES.forEach((stage, idx) => {
    const st     = stages[stage.key] || {};
    const status = st.status || "nao_iniciado";
    const resp   = (() => {
      const parts = [];
      if (st.start) parts.push(`início: ${st.start}`);
      if (st.end)   parts.push(`fim: ${st.end}`);
      if (st.driver) parts.push(st.driver);
      if (st.car)    parts.push(st.car);
      if (st.attendant)  parts.push(st.attendant);
      if (st.technician) parts.push(st.technician);
      if (st.support)    parts.push(st.support);
      return parts.join(" · ");
    })();

    if (idx > 0) stageSegments.push({ text: "  ·  ", color: "#cbd5e1" });
    stageSegments.push({ text: `${stage.label} — `, color: "#333333" });
    stageSegments.push({ text: stageStatusText(status), color: stageStatusColor(status) });
    if (resp) stageSegments.push({ text: ` (${resp})`, color: "#94a3b8" });
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  renderInlineText(doc, stageSegments, L, y, RX, LHEIGHT);

  // ── RODAPÉ ───────────────────────────────────────────────────────────────────

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor("#94a3b8");
  doc.text("© 2026 Caetano Digital Systems", L + W / 2, pageH - 7, { align: "center" });

  const filename = `detalhes-${(atendimento?.falecido || "servico").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  openPdfPreview(doc, filename, "Detalhes do Serviço");
}
