import jsPDF from "jspdf";

export function gerarFichaTecnicoPdf({ form, services, numero, openPdfPreview }) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.2);

  const left = 15;
  let y = 18;

  // ─── Helpers (mesmo padrão do gerarTermoPDF.js) ──────────────────────────

  function safeText(value) {
    return String(value || "");
  }

  function upper(value) {
    return safeText(value).toUpperCase();
  }

  function line(x1, yy, x2) {
    doc.line(x1, yy, x2, yy);
  }

  function writeLineValue(label, value, x, yy, xLineStart, xLineEnd, options = {}) {
    const valueX = options.valueX ?? xLineStart + 1.5;
    doc.text(label, x, yy);
    const text = safeText(value);
    if (text) doc.text(text, valueX, yy);
    line(xLineStart, yy + 0.6, xLineEnd);
  }

  function drawCheckbox(x, yy, checked) {
    const boxTop = yy - 3.1;
    doc.rect(x, boxTop, 3.3, 3.3);
    if (checked) {
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.text("X", x + 0.85, yy - 0.25);
      doc.setFont("times", "normal");
      doc.setFontSize(10);
    }
  }

  function checkboxOption(x, yy, checked, label) {
    drawCheckbox(x, yy, checked);
    doc.text(label, x + 5, yy);
  }

  function sep() {
    y += 3;
    doc.setLineWidth(0.3);
    line(left, y, 196);
    doc.setLineWidth(0.2);
    y += 5;
  }

  function sectionTitle(txt) {
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text(txt, left, y);
    y += 7;
    doc.setFont("times", "normal");
  }

  function formatValor(val) {
    if (!val) return "—";
    const n = Number(String(val).replace(/\./g, "").replace(",", "."));
    if (isNaN(n)) return String(val);
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ─── Data automática ─────────────────────────────────────────────────────

  const dataAtual = new Date();
  const dia = String(dataAtual.getDate()).padStart(2, "0");
  const ano = dataAtual.getFullYear();
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const mes = meses[dataAtual.getMonth()];

  // ─── CABEÇALHO ───────────────────────────────────────────────────────────

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("FICHA TÉCNICA — PREPARO DO CORPO", 105, y, { align: "center" });
  y += 8;

  doc.setFont("times", "normal");
  doc.setFontSize(10);

  doc.setLineWidth(0.5);
  line(left, y, 196);
  doc.setLineWidth(0.2);
  y += 8;

  // ─── IDENTIFICAÇÃO ───────────────────────────────────────────────────────

  // Nº Atendimento + Falecido (mesma linha)
  writeLineValue("Nº Atendimento:", safeText(numero), left, y, left + 37, 103);
  writeLineValue("Falecido:", upper(form.falecido), 106, y, 121, 196, { valueX: 122.5 });
  y += 7;

  // Sexo + Peso + Altura
  writeLineValue("Sexo:", upper(form.sexo), left, y, left + 13, 65);
  writeLineValue("Peso:", safeText(form.peso), 68, y, 79, 118);
  writeLineValue("Altura:", safeText(form.altura), 121, y, 132, 196);
  y += 7;

  // Chegou na clínica + Início
  writeLineValue("Chegou na clínica às:", safeText(form.chegouClinica), left, y, left + 48, 104);
  writeLineValue("Início às:", safeText(form.inicioAs), 107, y, 120, 196, { valueX: 121.5 });
  y += 4;

  sep();

  // ─── DO CORPO ────────────────────────────────────────────────────────────

  sectionTitle("DO CORPO");

  // Condições do corpo
  doc.text("· Condições do corpo:", left, y);
  checkboxOption(72, y, form.necropsia === "sim", "Necropsiado");
  checkboxOption(118, y, form.necropsia !== "sim", "Não Necropsiado");
  y += 7;

  // Veio vestido
  doc.text("· Falecido veio vestido:", left, y);
  checkboxOption(72, y, form.veioVestido === "sim", "Sim");
  checkboxOption(95, y, form.veioVestido !== "sim", "Não");
  y += 7;

  if (form.veioVestido === "sim") {
    doc.text("· Roupa:", left, y);
    checkboxOption(34, y, form.roupaDestino === "devolver", "Devolver");
    checkboxOption(72, y, form.roupaDestino === "descartar", "Descartar");
    y += 7;

    writeLineValue("· Roupa entregue para:", upper(form.roupaEntreguePara), left, y, 63, 196, { valueX: 64.5 });
    y += 7;
  }

  // Joias
  doc.text("· Joias:", left, y);
  checkboxOption(30, y, form.joias === "sim", "Sim");
  checkboxOption(48, y, form.joias !== "sim", "Não");
  writeLineValue("Quais:", safeText(form.joiasQuais), 66, y, 80, 196, { valueX: 81.5 });
  y += 7;

  // Retirar esmalte
  doc.text("· Retirar esmalte:", left, y);
  checkboxOption(55, y, form.retirarEsmalte === "sim", "Sim");
  checkboxOption(78, y, form.retirarEsmalte !== "sim", "Não");
  y += 4;

  sep();

  // ─── DA ESTÉTICA ─────────────────────────────────────────────────────────

  sectionTitle("DA ESTÉTICA");

  doc.text("· Barbear:", left, y);
  checkboxOption(38, y, form.barbear === "sim", "Sim");
  checkboxOption(61, y, form.barbear !== "sim", "Não");
  y += 7;

  doc.text("· Bigode:", left, y);
  checkboxOption(36, y, form.bigode === "sim", "Sim");
  checkboxOption(59, y, form.bigode !== "sim", "Não");
  y += 7;

  doc.text("· Cavanhaque:", left, y);
  checkboxOption(46, y, form.cavanhaque === "sim", "Sim");
  checkboxOption(69, y, form.cavanhaque !== "sim", "Não");
  y += 7;

  doc.text("· Maquiagem:", left, y);
  checkboxOption(44, y, form.maquiagem === "sim", "Sim");
  checkboxOption(67, y, form.maquiagem !== "sim", "Não");
  doc.text("—", 90, y);
  checkboxOption(96, y, form.maquiagemTipo === "leve",    "Leve");
  checkboxOption(118, y, form.maquiagemTipo === "natural", "Natural");
  checkboxOption(144, y, form.maquiagemTipo === "forte",   "Forte");
  y += 7;

  doc.text("· Ornamentação:", left, y);
  checkboxOption(52, y, form.ornamentacao === "sim", "Sim");
  checkboxOption(75, y, form.ornamentacao !== "sim", "Não");
  doc.text("—", 98, y);
  checkboxOption(104, y, form.tipoFlor === "naturais",    "Naturais");
  checkboxOption(138, y, form.tipoFlor === "artificiais", "Artificiais");
  y += 4;

  sep();

  // ─── DA URNA ─────────────────────────────────────────────────────────────

  sectionTitle("DA URNA");

  let modeloTexto = upper(form.modeloUrna);
  if (form.modeloUrna === "luxo" && form.refUrna) {
    modeloTexto = `LUXO — REF: ${upper(form.refUrna)}`;
  }
  writeLineValue("· Modelo:", modeloTexto, left, y, left + 22, 115, { valueX: left + 23.5 });
  writeLineValue("Cor:", upper(form.corUrna), 118, y, 128, 196, { valueX: 129.5 });
  y += 4;

  sep();

  // ─── TANATOPRAXIA (conditional) ──────────────────────────────────────────

  const tanatoService = (services || []).find(
    (s) => s.name === "TANATOPRAXIA (CONSERVAÇÃO DO CORPO)" && s.checked
  );

  if (tanatoService) {
    sectionTitle("TANATOPRAXIA");

    doc.text("· Tanatopraxia:", left, y);
    checkboxOption(52, y, true, "Sim");
    y += 7;

    writeLineValue(
      "· Valor:",
      tanatoService.value ? `R$ ${formatValor(tanatoService.value)}` : "—",
      left, y, left + 19, 100,
      { valueX: left + 20.5 }
    );
    y += 4;

    sep();
  }

  // ─── OBSERVAÇÕES ─────────────────────────────────────────────────────────

  sectionTitle("OBSERVAÇÕES");

  for (let i = 0; i < 3; i++) {
    line(left, y + 5, 196);
    y += 8;
  }

  sep();

  // ─── ASSINATURA ──────────────────────────────────────────────────────────

  sectionTitle("ASSINATURA");

  writeLineValue("· Técnico responsável:", upper(form.tecnico), left, y, left + 50, 196, { valueX: left + 51.5 });
  y += 15;

  doc.line(65, y, 140, y);
  y += 5;
  doc.text("Técnico", 102, y, { align: "center" });

  y += 10;
  doc.text(`Manaus, ${dia} de ${mes} de ${ano}`, 105, y, { align: "center" });

  // ─── Preview ─────────────────────────────────────────────────────────────

  const filename = `ficha-tecnica-${(form.falecido || "preparo")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  openPdfPreview(doc, filename, "Ficha Técnica — Preparo do Corpo");
}
