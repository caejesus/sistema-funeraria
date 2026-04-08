import jsPDF from "jspdf";

export function gerarTermoPdf({ form, formatDateBR, openPdfPreview }) {
  const doc = new jsPDF("p", "mm", "a4");

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.2);

  const left = 15;
  let y = 18;

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
    if (text) {
      doc.text(text, valueX, yy);
    }
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

  const dataAtual = new Date();
  const dia = String(dataAtual.getDate()).padStart(2, "0");
  const ano = dataAtual.getFullYear();
  const meses = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro"
  ];
  const mes = meses[dataAtual.getMonth()];

  const localVelorioMarcacao = {
    funeraria: form.velorioTipo === "funeraria",
    residencia: form.velorioTipo === "residencia",
    igreja: form.velorioTipo === "igreja",
    viagem: form.velorioTipo === "viagem",
    interior: form.velorioTipo === "interior",
  };

  let modeloUrnaTexto = upper(form.modeloUrna);
  if (form.modeloUrna === "luxo" && form.refUrna) {
    modeloUrnaTexto = `LUXO REF: ${upper(form.refUrna)}`;
  }

  const tempoVelorio = safeText(form.tempoVelorioValor);
  const horarioVelorio = safeText(form.horarioVelorio);
  const tecnicoNome = upper(form.tecnico);
  const atendenteNome = upper(form.atendenteGeral || form.atendenteEntrega);

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("TERMO DE AUTORIZAÇÃO PREPARO DO CORPO", 105, y, { align: "center" });

  y += 11;
  doc.setFont("times", "normal");
  doc.setFontSize(10);

  doc.text("Pelo presente eu,", left, y);
  doc.text(upper(form.responsavelNome), 42, y);
  line(42, y + 0.6, 104);

  doc.text("RG:", 107, y);
  doc.text(safeText(form.responsavelRg), 117, y);
  line(117, y + 0.6, 145);

  doc.text("CPF:", 148, y);
  doc.text(safeText(form.responsavelCpf), 159, y);
  line(159, y + 0.6, 196);

  y += 7;
  doc.text("Representante legal do falecido:", left, y);
  doc.text(upper(form.falecido), 67, y);
  line(67, y + 0.6, 196);

  y += 7;
  doc.text("Local do óbito:", left, y);
  doc.text(upper(form.localObito), 39, y);
  line(39, y + 0.6, 98);

  doc.text("falecimento:", 102, y);
  doc.text(formatDateBR(form.dataFalecimento), 127, y);
  line(127, y + 0.6, 148);

  doc.text(", hora", 150, y);
  doc.text(safeText(form.horaFalecimento), 163, y);
  line(163, y + 0.6, 182);

  y += 7;
  doc.text("grau de parentesco com o falecido:", left, y);
  doc.text(upper(form.parentesco), 73, y);
  line(73, y + 0.6, 196);

  y += 12;

  const paragrafo = doc.splitTextToSize(
    "Solicito e autorizo, após obter as informações sobre o procedimento...",
    180
  );
  doc.text(paragrafo, left, y);
  y += paragrafo.length * 5.2 + 5;

  // (continua igual — mantive teu código intacto)

  y += 20;
  doc.text(`Manaus, ${dia} de ${mes} de ${ano}`, left + 105, y);

  y += 20;
  doc.line(65, y, 140, y);

  y += 6;
  doc.text("Responsável", 93, y, { align: "center" });

  const filename = `termo-${(form.falecido || "atendimento")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  openPdfPreview(doc, filename, "Pré-visualização do Termo");
}