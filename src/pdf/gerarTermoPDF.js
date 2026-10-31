import jsPDF from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
// Termo de Autorização de Preparo do Corpo — mesmo layout do modelo em Word.
// Medidas em milímetros (A4) tiradas do documento original.
// Cambria → Times · Calibri → Helvetica (fontes equivalentes do PDF).
// ─────────────────────────────────────────────────────────────────────────────

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];

const X_BULLET = 12.7;
const X_TEXTO = 19.1;

function txt(v) {
  return String(v ?? "").trim();
}
function up(v) {
  return txt(v).toUpperCase();
}

function maskCpf(value) {
  const n = String(value || "").replace(/\D/g, "");
  if (n.length === 14) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
  if (n.length !== 11) return txt(value);
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

export function gerarTermoPdf({ form, formatDateBR, openPdfPreview }) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.2);

  // ── helpers ────────────────────────────────────────────────────────────────
  const font = (family, style, size) => {
    doc.setFont(family, style);
    doc.setFontSize(size);
  };

  // Linha em branco com valor preenchido por cima (encolhe a fonte se não couber)
  function campoLinha(x1, x2, base, valor, opts = {}) {
    doc.line(x1, base + 0.7, x2, base + 0.7);
    const v = txt(valor);
    if (!v) return;
    const size = opts.size || 11;
    font(opts.family || "helvetica", opts.style || "normal", size);
    let s = size;
    while (s > 7 && doc.getTextWidth(v) > x2 - x1 - 1) {
      s -= 0.5;
      doc.setFontSize(s);
    }
    doc.text(v, opts.center ? (x1 + x2) / 2 : x1 + 0.8, base, opts.center ? { align: "center" } : undefined);
  }

  // "(  )" com X quando marcado — posições dos parênteses iguais às do modelo
  function marca(x, xFecha, base, marcado) {
    font("times", "normal", 12);
    doc.text("(", x, base);
    doc.text(")", xFecha, base);
    if (marcado) {
      font("times", "bold", 11);
      const abre = doc.getTextWidth("(");
      doc.text("X", (x + abre + xFecha) / 2, base - 0.1, { align: "center" });
      font("times", "normal", 12);
    }
  }

  function opcao(x, xFecha, base, marcado, rotulo, xRotulo) {
    marca(x, xFecha, base, marcado);
    font("times", "normal", 12);
    const minimo = xFecha + doc.getTextWidth(")") + 0.9;
    doc.text(rotulo, Math.max(xRotulo, minimo), base);
  }

  function bullet(base) {
    font("times", "normal", 12);
    doc.text("•", X_BULLET + 0.6, base);
  }

  function titulo(texto, base, x1, _x2, size = 12) {
    font("times", "bold", size);
    doc.text(texto, x1, base);
    doc.setLineWidth(0.25);
    doc.line(x1, base + 0.6, x1 + doc.getTextWidth(texto), base + 0.6);
    doc.setLineWidth(0.2);
  }

  // ── Título ─────────────────────────────────────────────────────────────────
  font("times", "bold", 16);
  doc.text("Termo De Autorização de Preparo Do Corpo", 105, 18.6, { align: "center" });

  // ── Identificação (Calibri 12 → Helvetica 11) ────────────────────────────
  font("helvetica", "normal", 11);
  let b = 29.0;
  doc.text("Pelo presente eu:", X_BULLET, b);
  campoLinha(42.9, 137.5, b, up(form.responsavelNome));
  font("helvetica", "normal", 11);
  doc.text("CPF:", 138.5, b);
  campoLinha(147.0, 197.2, b, maskCpf(form.responsavelCpf));

  b = 37.4;
  font("helvetica", "normal", 11);
  doc.text("Representante legal do falecido (a):", X_BULLET, b);
  campoLinha(74.8, 195.4, b, up(form.falecido));

  b = 45.8;
  font("helvetica", "normal", 11);
  doc.text("falecimento:", X_BULLET, b);
  campoLinha(35.3, 62.3, b, form.dataFalecimento ? formatDateBR(form.dataFalecimento) : "", { center: true });
  font("helvetica", "normal", 11);
  doc.text(", hora", 63.2, b);
  campoLinha(75.4, 90.5, b, txt(form.horaFalecimento), { center: true });
  font("helvetica", "normal", 11);
  const sendo = ", sendo o grau de parentesco com o falecido:";
  let sSize = 11;
  while (sSize > 8 && doc.getTextWidth(sendo) > 166.0 - 91.2) { sSize -= 0.25; doc.setFontSize(sSize); }
  doc.text(sendo, 91.2, b);
  campoLinha(166.5, 196.8, b, up(form.parentesco));

  // ── Parágrafo (Cambria 10 → Times 10), mesmas quebras do modelo ──────────
  font("times", "normal", 10);
  doc.text("Solicito e autorizo, após obter as informações sobre o procedimento, da realização de Tanatopráxia para conservar e manter a", X_BULLET, 55.9);
  let xp = X_BULLET;
  const l2a = "aparência normal do corpo do mesmo. Autorizo também ";
  doc.text(l2a, xp, 60.3);
  xp += doc.getTextWidth(l2a);
  font("times", "bold", 10);
  doc.text("o registro de imagens", xp, 60.3);
  xp += doc.getTextWidth("o registro de imagens ");
  font("times", "normal", 10);
  doc.text("do procedimento realizado em caráter sigiloso,", xp, 60.3);
  doc.text("com o único propósito de esclarecer quaisquer dúvidas que possam surgir quanto ao ato realizado.", X_BULLET, 64.7);

  // ── DO CORPO ───────────────────────────────────────────────────────────────
  titulo("DO CORPO", 74.0, 18.7, 36.6, 11);

  b = 82.2;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Condições:", X_TEXTO, b);
  opcao(66.4, 71.7, b, form.necropsia === "sim", "Necropsiado", 74.2);
  opcao(96.7, 102.1, b, form.necropsia === "nao", "Não Necropsiado.", 104.6);

  b = 89.5;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Chegou vestido:", X_TEXTO, b);
  opcao(65.7, 71.0, b, form.veioVestido === "sim", "Sim", 73.5);
  opcao(81.0, 86.3, b, form.veioVestido === "nao", "Não", 88.9);
  opcao(96.8, 102.1, b, form.roupaDestino === "devolver", "Devolver", 104.7);
  opcao(120.8, 126.2, b, form.roupaDestino === "descartar", "Descartar", 127.4);

  b = 96.9;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Retirar o esmalte da unha:", X_TEXTO, b);
  opcao(65.8, 71.1, b, form.retirarEsmalte === "sim", "Sim", 73.7);
  opcao(97.0, 102.3, b, form.retirarEsmalte === "nao", "Não", 104.8);

  // ── DA ESTÉTICA ────────────────────────────────────────────────────────────
  titulo("DA ESTÉTICA", 111.1, X_TEXTO, 43.9);

  b = 118.8;
  bullet(b);
  font("times", "bold", 12);
  doc.text("Barbear:", X_TEXTO, b);
  opcao(36.8, 41.2, b, form.barbear === "sim", "Sim", 43.7);
  opcao(52.1, 56.5, b, form.barbear === "nao", "Não", 59.1);
  doc.text("|", 66.9, b);
  font("times", "bold", 12);
  doc.text("Bigode:", 69.2, b);
  opcao(84.3, 88.7, b, form.bigode === "sim", "Sim", 91.3);
  opcao(98.7, 103.1, b, form.bigode === "nao", "Não", 105.7);
  doc.text("|", 113.6, b);
  font("times", "bold", 12);
  doc.text("Cavanhaque:", 115.9, b);
  opcao(141.4, 145.8, b, form.cavanhaque === "sim", "Sim", 148.3);
  opcao(156.7, 161.1, b, form.cavanhaque === "nao", "Não", 163.7);

  b = 126.1;
  bullet(b);
  font("times", "bold", 12);
  doc.text("Maquiagem:", X_TEXTO, b);
  opcao(44.5, 48.9, b, form.maquiagem === "sim", "Sim", 51.5);
  opcao(60.8, 65.2, b, form.maquiagem === "nao", "Não", 67.7);
  doc.text("|", 77.5, b);
  const comMaquiagem = form.maquiagem === "sim";
  opcao(82.5, 86.9, b, comMaquiagem && form.maquiagemTipo === "leve", "leve", 89.5);
  opcao(97.3, 101.7, b, comMaquiagem && form.maquiagemTipo === "natural", "natural", 104.2);
  opcao(118.0, 122.4, b, comMaquiagem && form.maquiagemTipo === "forte", "forte", 125.0);

  // ── ORNATO E ADORNO ────────────────────────────────────────────────────────
  titulo("ORNATO E ADORNO", 140.3, X_TEXTO, 56.3);

  b = 148.0;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Ornamentação com flores", X_TEXTO, b);
  opcao(64.2, 68.7, b, form.ornamentacao === "sim", "Sim", 71.2);
  opcao(78.7, 82.1, b, form.ornamentacao === "nao", "Não", 84.7);
  doc.text("|", 92.6, b);
  const comFlores = form.ornamentacao === "sim";
  opcao(94.8, 99.3, b, comFlores && form.tipoFlor === "naturais", "Naturais", 101.8);
  opcao(117.8, 121.3, b, comFlores && form.tipoFlor === "artificiais", "Artificiais", 123.9);

  b = 155.3;
  bullet(b);
  font("times", "normal", 12);
  doc.text("A roupa foi entregue para:", X_TEXTO, b);
  campoLinha(64.3, 97.3, b, up(form.roupaEntreguePara), { family: "times", size: 12 });

  // ── GERAL ──────────────────────────────────────────────────────────────────
  titulo("GERAL", 169.5, X_TEXTO, 31.7);

  b = 177.2;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Tempo previsto de velório:", X_TEXTO, b);
  doc.line(65.8, b + 0.6, 114.9, b + 0.6);
  font("times", "bold", 12);
  if (txt(form.tempoVelorioValor)) doc.text(txt(form.tempoVelorioValor), 71.2, b, { align: "center" });
  font("times", "normal", 12);
  doc.text("-", 76.7, b);
  opcao(79.0, 83.4, b, !!txt(form.tempoVelorioValor) && form.tempoVelorioUnidade !== "dias", "HORAS", 85.9);
  opcao(99.4, 103.8, b, !!txt(form.tempoVelorioValor) && form.tempoVelorioUnidade === "dias", "DIAS", 106.4);

  b = 184.5;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Local do velório:", X_TEXTO, b);
  opcao(48.2, 52.6, b, form.velorioTipo === "funeraria", "funerária,", 55.2);
  opcao(73.3, 77.7, b, form.velorioTipo === "residencia", "residência,", 80.3);
  opcao(99.8, 104.3, b, form.velorioTipo === "igreja", "igreja,", 106.8);
  opcao(118.3, 121.8, b, form.velorioTipo === "viagem" || form.velorioTipo === "interior", "interior", 123.0);

  b = 191.8;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Sala:", X_TEXTO, b);
  const sala = form.velorioTipo === "funeraria" ? up(form.velorioSala) : "";
  campoLinha(28.2, 68.5, b, sala, { family: "times", size: 12 });
  font("times", "normal", 12);
  doc.text("Horário:", 69.4, b);
  const horario = txt(form.horarioVelorio || form.inicioAs);
  campoLinha(84.1, 104.0, b, horario, { family: "times", size: 12, center: true });

  b = 199.1;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Religião:", X_TEXTO, b);
  campoLinha(34.1, 104.8, b, up(form.religiao), { family: "times", size: 12 });

  b = 206.4;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Técnico:", X_TEXTO, b);
  campoLinha(33.6, 104.2, b, up(form.tecnico), { family: "times", size: 12 });

  b = 213.7;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Atendente:", X_TEXTO, b);
  campoLinha(39.4, 103.8, b, up(form.atendenteGeral || form.atendenteEntrega), { family: "times", size: 12 });

  b = 221.2;
  bullet(b);
  font("times", "normal", 12);
  doc.text("Modelo de urna:", X_TEXTO, b);
  let modeloUrna = up(form.modeloUrna);
  if (form.modeloUrna === "luxo" && form.refUrna) modeloUrna = `LUXO ${up(form.refUrna)}`;
  campoLinha(47.5, 62.3, b, modeloUrna, { family: "times", size: 12 });
  font("times", "normal", 12);
  doc.text("Cor:", 63.2, b);
  campoLinha(70.3, 104.1, b, up(form.corUrna), { family: "times", size: 12 });

  // ── Data e assinatura ──────────────────────────────────────────────────────
  const hoje = new Date();
  b = 239.8;
  font("helvetica", "normal", 11);
  doc.text("Manaus,", 124.3, b);
  campoLinha(138.6, 149.6, b, String(hoje.getDate()).padStart(2, "0"), { center: true });
  font("helvetica", "normal", 11);
  doc.text("de", 150.0, b);
  campoLinha(154.0, 183.5, b, MESES[hoje.getMonth()], { center: true });
  font("helvetica", "normal", 11);
  doc.text(`de ${hoje.getFullYear()}`, 184.0, b);

  doc.setLineWidth(0.6);
  doc.line(47.6, 251.0, 162.5, 251.0);
  doc.setLineWidth(0.2);
  font("helvetica", "normal", 9.5);
  doc.text("autorização", 105, 256.0, { align: "center" });

  const filename = `termo-${(form.falecido || "atendimento").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  openPdfPreview(doc, filename, "Pré-visualização do Termo");
}
