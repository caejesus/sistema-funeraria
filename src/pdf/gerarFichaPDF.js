import jsPDF from "jspdf";
import { getCemiterioNome, formatPeso, formatAltura, getHospitalNome } from "../utils/format";

// ─────────────────────────────────────────────────────────────────────────────
// Ficha de Atendimento — mesmo layout da ficha em papel (modelo Word),
// medidas em milímetros tiradas do documento original (A4).
// Fonte: Times (= Times New Roman). Rótulos em negrito 11 pt.
// ─────────────────────────────────────────────────────────────────────────────

const CABECALHO = {
  titulo: "FUNERÁRIA SÃO FRANCISCO DE ASSIS",
  razao: "SUELY R. DO PRADO – EPP",
  cnpj: "CNPJ: 84.522.143/0001-53 – Insc. 04.105.072-0",
  fones: "Fones: (092) 3633-8095 / 3234-4499 / 3308-3966  CEP: 69065-000",
  endereco: "Avenida Carvalho Leal, N°1.000 – Cachoeirinha / Manaus – AM",
};

// Bordas e grades (x das linhas verticais)
const LINHA = 0.18;
const T1 = { x: 7.7, w: 195.0, cols: [7.7, 85.2, 150.2, 202.7] };                 // dados do atendimento
const T2 = { x: 7.2, w: 195.0, cols: [7.2, 14.7, 159.8, 177.4, 202.2] };          // serviços prestados
const T3 = { x: 7.7, w: 195.0, cols: [7.7, 77.2, 87.2, 132.2, 147.2, 154.7, 202.7] }; // responsável

const PAD_X = 1.9;

const TIPO_LABELS = {
  particular: "PARTICULAR",
  socio_especial: "SÓCIO ESPECIAL",
  socio_luxo: "SÓCIO LUXO",
  socio_premium: "SÓCIO PREMIUM",
  pm: "POLÍCIA MILITAR (DPS AM)",
  tokyo: "TOKYO MARINE",
  seguradora: "SEGURADORA",
  orgao_publico: "ÓRGÃO PÚBLICO",
  prefeitura_conveniada: "PREFEITURA CONVENIADA",
  casai: "CASAI (DSEI MANAUS)",
  autazes: "PREFEITURA DE AUTAZES",
};

function maskCpf(value) {
  const n = String(value || "").replace(/\D/g, "");
  if (n.length === 14) {
    return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
  }
  const c = n.slice(0, 11);
  if (c.length <= 3) return c;
  if (c.length <= 6) return c.slice(0, 3) + "." + c.slice(3);
  if (c.length <= 9) return c.slice(0, 3) + "." + c.slice(3, 6) + "." + c.slice(6);
  return c.slice(0, 3) + "." + c.slice(3, 6) + "." + c.slice(6, 9) + "-" + c.slice(9);
}

function maskRg(value) {
  const n = String(value || "").replace(/\D/g, "").slice(0, 9);
  if (n.length <= 2) return n;
  if (n.length <= 5) return n.slice(0, 2) + "." + n.slice(2);
  if (n.length <= 8) return n.slice(0, 2) + "." + n.slice(2, 5) + "." + n.slice(5);
  return n.slice(0, 2) + "." + n.slice(2, 5) + "." + n.slice(5, 8) + "-" + n.slice(8);
}

function maskCelular(value) {
  const n = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (!n) return "";
  if (n.length <= 2) return "(" + n;
  if (n.length <= 7) return "(" + n.slice(0, 2) + ") " + n.slice(2);
  if (n.length <= 10) return "(" + n.slice(0, 2) + ") " + n.slice(2, 6) + "-" + n.slice(6);
  return "(" + n.slice(0, 2) + ") " + n.slice(2, 7) + "-" + n.slice(7);
}

// ─── Desenho ──────────────────────────────────────────────────────────────────

function baseline(top, h) {
  return top + (h >= 5.5 ? 4.0 : 3.6);
}

// Ajusta o tamanho da fonte para o texto caber na largura
function fitSize(doc, text, maxW, size, min = 7) {
  let s = size;
  doc.setFontSize(s);
  while (s > min && doc.getTextWidth(text) > maxW) {
    s -= 0.5;
    doc.setFontSize(s);
  }
  return s;
}

// Célula com rótulo em negrito + valor em seguida
function campo(doc, x, top, w, h, rotulo, valor, opts = {}) {
  doc.rect(x, top, w, h);
  const y = opts.baselineY ?? baseline(top, h);
  const tx = x + PAD_X;
  doc.setFont("times", "bold");
  doc.setFontSize(opts.rotuloSize || 11);
  if (rotulo) doc.text(rotulo, tx, y);
  const rw = rotulo ? doc.getTextWidth(rotulo) + 2.2 : 0;
  const texto = valor == null ? "" : String(valor);
  if (!texto) return;
  doc.setFont("times", opts.valorBold ? "bold" : "normal");
  const maxW = w - PAD_X * 2 - rw;
  fitSize(doc, texto, maxW, opts.valorSize || 11);
  doc.text(texto, tx + rw, y);
}

function textoCentro(doc, texto, x, w, y, font, style, size) {
  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.text(texto, x + w / 2, y, { align: "center" });
}

// ─── Geração ──────────────────────────────────────────────────────────────────

export function gerarFichaPdf({
  form,
  services,
  totalValue,
  formatDateBR,
  formatMoney,
  openPdfPreview,
  operationalStages = {},
}) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(LINHA);
  doc.setTextColor(0, 0, 0);

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  textoCentro(doc, CABECALHO.titulo, 0, 210, 18.3, "times", "bold", 16);
  textoCentro(doc, CABECALHO.razao, 0, 210, 22.9, "times", "bold", 11);
  textoCentro(doc, CABECALHO.cnpj, 0, 210, 27.4, "times", "normal", 11);
  textoCentro(doc, CABECALHO.fones, 0, 210, 31.9, "times", "normal", 11);
  textoCentro(doc, CABECALHO.endereco, 0, 210, 36.3, "times", "normal", 11);

  // ── Tabela 1: dados do atendimento ────────────────────────────────────────
  const [a0, a1, a2, a3] = T1.cols;
  const wEsq = a2 - a0;      // 2 primeiras colunas mescladas
  const wDir = a3 - a2;
  let y = 41.9;

  const localObito = String(form.localObito || "").toUpperCase().startsWith("SVO")
    ? "SVO"
    : getHospitalNome(form.localObito);
  const tipoServico = TIPO_LABELS[form.tipoPlano] || (form.tipoPlano ? String(form.tipoPlano).toUpperCase() : "");
  const tipoComPlano = ["socio_especial", "socio_luxo", "socio_premium"].includes(form.tipoPlano)
    ? [tipoServico, form.codigo ? `CÓD ${form.codigo}` : "", form.dependente ? `DEP ${form.dependente}` : ""].filter(Boolean).join(" · ")
    : tipoServico;

  campo(doc, a0, y, wEsq, 6, "FALECIDO:", form.falecido, { valorBold: true, valorSize: 12 });
  campo(doc, a2, y, wDir, 6, "NASC.:", form.dataNascimento ? formatDateBR(form.dataNascimento) : "");
  y += 6;
  campo(doc, a0, y, wEsq, 6, "LOCAL DO ÓBITO:", localObito);
  campo(doc, a2, y, wDir, 6, "SEPULT:", form.dataSaida ? formatDateBR(form.dataSaida) : "");
  y += 6;
  campo(doc, a0, y, wEsq, 6, "CEMITÉRIO:", getCemiterioNome(form.cemiterio));
  campo(doc, a2, y, wDir, 6, "SAINDO ÀS:", form.horaSaida || "");
  y += 6;
  campo(doc, a0, y, a1 - a0, 6, "DATA DE ATENDIMENTO:", form.dataAtendimento ? formatDateBR(form.dataAtendimento) : "");
  campo(doc, a1, y, a2 - a1, 6, "HORA:", form.horaAtendimento || "");
  campo(doc, a2, y, wDir, 6, "NO CEMITÉRIO ÀS:", "");
  y += 6;
  campo(doc, a0, y, a1 - a0, 4.5, "SERVIÇO:", tipoComPlano);
  campo(doc, a1, y, a2 - a1, 4.5, "CHEGOU NA CLÍNICA:", form.chegouClinica || "");
  campo(doc, a2, y, wDir, 4.5, "DOC DECEM:", "");
  y += 4.5;
  campo(doc, a0, y, a1 - a0, 5, "ALTURA:", formatAltura(form.altura));
  campo(doc, a1, y, a2 - a1, 5, "PESO:", formatPeso(form.peso));
  campo(doc, a2, y, wDir, 5, "TAXA:", "");
  y += 5; // 75.4

  // ── Serviços prestados ────────────────────────────────────────────────────
  textoCentro(doc, "SERVIÇOS PRESTADOS", 0, 210, 80.1, "times", "bold", 14);

  const [s0, s1, s2, s3, s4] = T2.cols;
  y = 81.6;
  doc.rect(s0, y, s2 - s0, 5);
  doc.rect(s2, y, s3 - s2, 5);
  doc.rect(s3, y, s4 - s3, 5);
  textoCentro(doc, "QTD.", s2, s3 - s2, y + 3.6, "helvetica", "bold", 9.5);
  textoCentro(doc, "VALOR", s3, s4 - s3, y + 3.6, "helvetica", "bold", 9.5);
  y += 5;

  const lista = services || [];
  lista.forEach((item, idx) => {
    const ultimo = idx === lista.length - 1;
    const h = ultimo ? 5 : 4;
    const by = baseline(y, h);

    doc.rect(s0, y, s1 - s0, h);
    doc.rect(s1, y, s2 - s1, h);
    doc.rect(s2, y, s3 - s2, h);
    doc.rect(s3, y, s4 - s3, h);

    if (item.checked) textoCentro(doc, "X", s0, s1 - s0, by + 0.2, "times", "bold", 12);

    const nome = ultimo && item.name === "OUTRAS DESPESAS" ? "OUTROS:" : item.name;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(nome, s1 + PAD_X, by);

    // Complementos na mesma linha
    let extra = "";
    if (item.name === "URNA") {
      doc.text("COR:", 87.5, by);
      const corX = 87.5 + doc.getTextWidth("COR:") + 1.4;
      if (form.corUrna) {
        doc.setFont("times", "normal");
        fitSize(doc, String(form.corUrna), s2 - corX - PAD_X, 11);
        doc.text(String(form.corUrna), corX, by);
      }
    } else if (item.note) {
      extra = item.name === "COROA DE FLORES" ? `FRASE: ${item.note}` : item.note;
    }
    if (extra) {
      const ex = s1 + PAD_X + doc.getTextWidth(nome + "  ");
      doc.setFont("times", "normal");
      fitSize(doc, extra, s2 - ex - PAD_X, 10, 6);
      doc.text(extra, ex, by);
    }

    if (item.qty) textoCentro(doc, String(item.qty), s2, s3 - s2, by, "times", "normal", 11);
    if (item.value) textoCentro(doc, formatMoney(item.value), s3, s4 - s3, by, "times", "normal", 11);

    y += h;
  });

  // Total
  doc.rect(s0, y, s2 - s0, 7);
  doc.rect(s2, y, s3 - s2, 7);
  doc.rect(s3, y, s4 - s3, 7);
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text("TOTAL:", s2 + PAD_X - 0.5, y + 4.0);
  textoCentro(doc, formatMoney(totalValue) || "", s3, s4 - s3, y + 4.6, "times", "bold", 11);
  y += 7;

  // ── Dados do responsável ──────────────────────────────────────────────────
  textoCentro(doc, "DADOS DO RESPONSÁVEL", 0, 210, y + 4.2, "times", "bold", 12);
  y += 5.3;

  const [r0, r1, r2, r3, r4, r5, r6] = T3.cols;
  const largura = r6 - r0;

  const endereco = [
    form.responsavelEndereco,
    form.responsavelNumero ? `, ${form.responsavelNumero}` : "",
    form.responsavelComplemento ? ` - ${form.responsavelComplemento}` : "",
  ].join("");

  campo(doc, r0, y, r5 - r0, 6, "NOME:", form.responsavelNome);
  campo(doc, r5, y, r6 - r5, 6, "RG:", maskRg(form.responsavelRg));
  y += 6;
  campo(doc, r0, y, largura, 6, "CPF / CNPJ:", maskCpf(form.responsavelCpf));
  y += 6;
  campo(doc, r0, y, r5 - r0, 6, "ENDEREÇO:", endereco);
  campo(doc, r5, y, r6 - r5, 6, "CEP:", form.responsavelCep || "");
  y += 6;
  campo(doc, r0, y, largura, 6, "BAIRRO:", form.responsavelBairro || "");
  y += 6;
  campo(doc, r0, y, r2 - r0, 6, "GRAU DE PARENTESCO:", form.parentesco || "");
  campo(doc, r2, y, r4 - r2, 6, "CEL:", maskCelular(form.responsavelCelular1));
  campo(doc, r4, y, r6 - r4, 6, "CEL:", maskCelular(form.responsavelCelular2));
  y += 6;
  campo(doc, r0, y, largura, 6, "EMAIL:", form.responsavelEmail || "");
  y += 6;
  campo(doc, r0, y, largura, 4.6, "AUT. DESPESAS ACIMA:", "");
  y += 4.6;

  // Local do velório (célula alta, texto pode quebrar)
  const velorioTexto =
    form.velorioTipo === "funeraria"
      ? [form.velorioUnidade, form.velorioSala].filter(Boolean).join(" - ")
      : form.velorioTipo === "viagem"
      ? ["VIAGEM", form.cidadeDestino, form.embarque].filter(Boolean).join(" - ")
      : [form.velorioNomeLocal, form.velorioEndereco, form.velorioNumero, form.velorioBairro].filter(Boolean).join(", ");
  doc.rect(r0, y, largura, 13.7);
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("LOCAL DO VELÓRIO:", r0 + PAD_X, y + 3.6);
  if (velorioTexto) {
    const rw = doc.getTextWidth("LOCAL DO VELÓRIO:") + 2.2;
    doc.setFont("times", "normal");
    const linhas = doc.splitTextToSize(velorioTexto, largura - PAD_X * 2 - rw);
    doc.text(linhas.slice(0, 3), r0 + PAD_X + rw, y + 3.6, { lineHeightFactor: 1.15 });
  }
  y += 13.7;

  // Equipe (2 linhas; SEPULTAMENTO ocupa as duas)
  const motoristaCarro = (stage, motoristaForm, carroForm) => {
    const m = operationalStages?.[stage]?.driver || motoristaForm || "";
    const c = operationalStages?.[stage]?.car || carroForm || "";
    return [m, c ? `(${c})` : ""].filter(Boolean).join(" ");
  };
  const equipeOpts = { rotuloSize: 9.5, valorSize: 9 };
  const h1 = 5.0;
  const h2 = 5.9;
  doc.setFont("helvetica", "bold");
  campoEquipe(doc, r0, y, r1 - r0, h1, "ATENDENTE:", form.atendenteGeral || "", equipeOpts);
  campoEquipe(doc, r1, y, r3 - r1, h1, "REMOÇÃO:", motoristaCarro("remocao", form.Remocao, form.carroRemocao), equipeOpts);
  campoEquipe(doc, r3, y, r6 - r3, h1 + h2, "SEPULTAMENTO:", motoristaCarro("sepultamento", form.Sepultamento, form.carroSepultamento), { ...equipeOpts, topo: true });
  campoEquipe(doc, r0, y + h1, r1 - r0, h2, "ATENDENTE:", "", equipeOpts);
  campoEquipe(doc, r1, y + h1, r3 - r1, h2, "ENTREGA:", motoristaCarro("entrega", form.Entrega, form.carroEntrega), equipeOpts);

  const filename = `ficha-${(form.falecido || "atendimento").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  openPdfPreview(doc, filename, "Pré-visualização da Ficha");
}

// Células da equipe usam fonte sem serifa, como na ficha original (Calibri)
function campoEquipe(doc, x, top, w, h, rotulo, valor, opts) {
  doc.rect(x, top, w, h);
  const y = opts.topo ? top + 3.6 : top + Math.min(3.7, h - 1.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(opts.rotuloSize);
  doc.text(rotulo, x + PAD_X, y);
  if (!valor) return;
  const rw = doc.getTextWidth(rotulo) + 1.2;
  doc.setFont("helvetica", "normal");
  fitSize(doc, valor, w - PAD_X * 2 - rw, opts.valorSize, 6);
  doc.text(valor, x + PAD_X + rw, y);
}
