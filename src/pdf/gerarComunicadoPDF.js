import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getCemiterioNome } from "../utils/format";

// ─────────────────────────────────────────────────────────────────────────────
// Comunicado de velório — folha A4 deitada para a porta da sala.
// Layout do modelo em Word: borda, logo do grupo, "SALA XX" em destaque,
// nome, início do velório, sepultamento, saída e cemitério.
// O QR Code leva ao convite online (/convite/<token>).
// ─────────────────────────────────────────────────────────────────────────────

const PAGINA_W = 297;
const CENTRO = PAGINA_W / 2;
const LARGURA_TEXTO = 222; // área central entre logo e QR

async function carregarImagemPadrao(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Imagem não encontrada: ${url}`);
  const blob = await resp.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function dataBR(iso) {
  if (!iso) return "";
  const [a, m, d] = String(iso).split("-");
  return a && m && d ? `${d}/${m}/${a}` : String(iso);
}

// Escreve centralizado, reduzindo a fonte até caber na largura
function centro(doc, texto, y, family, style, size, maxW = LARGURA_TEXTO, min = 14) {
  doc.setFont(family, style);
  let s = size;
  doc.setFontSize(s);
  while (s > min && doc.getTextWidth(texto) > maxW) {
    s -= 1;
    doc.setFontSize(s);
  }
  doc.text(texto, CENTRO, y, { align: "center" });
  return s;
}

// "RÓTULO: valor" centralizado, com partes em pesos diferentes
function centroMisto(doc, partes, y, size, maxW = LARGURA_TEXTO) {
  let s = size;
  const largura = () =>
    partes.reduce((acc, p) => {
      doc.setFont("helvetica", p.bold ? "bold" : "normal");
      doc.setFontSize(s);
      return acc + doc.getTextWidth(p.texto);
    }, 0);
  while (s > 14 && largura() > maxW) s -= 1;
  let x = CENTRO - largura() / 2;
  partes.forEach((p) => {
    doc.setFont("helvetica", p.bold ? "bold" : "normal");
    doc.setFontSize(s);
    doc.text(p.texto, x, y);
    x += doc.getTextWidth(p.texto);
  });
}

export function getConviteUrl(token, origin = typeof window !== "undefined" ? window.location.origin : "") {
  return `${origin}/convite/${token}`;
}

export async function gerarComunicadoPdf({ form, conviteUrl, openPdfPreview, carregarImagem = carregarImagemPadrao }) {
  const doc = new jsPDF("l", "mm", "a4");
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  // Borda
  doc.setLineWidth(0.5);
  doc.rect(4, 4, 288.4, 201.6);

  // Logo do grupo (canto superior esquerdo)
  try {
    const logo = await carregarImagem("/logogrupo.png");
    doc.addImage(logo, "PNG", 7, 6, 40, 40);
  } catch (e) {
    console.warn("Logo do grupo não carregada:", e);
  }

  // QR Code do convite (canto superior direito)
  if (conviteUrl) {
    const qr = await QRCode.toDataURL(conviteUrl, { errorCorrectionLevel: "M", margin: 0, width: 600 });
    doc.addImage(qr, "PNG", 252.5, 8, 35, 35);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Convite e mensagens", 270, 47.5, { align: "center" });
  }

  // Sala / local do velório
  let local = "";
  if (form.velorioTipo === "funeraria" || !form.velorioTipo) {
    local = String(form.velorioSala || "").toUpperCase();
  } else if (form.velorioTipo === "residencia") {
    local = "RESIDÊNCIA";
  } else if (form.velorioTipo === "igreja") {
    local = String(form.velorioNomeLocal || "IGREJA").toUpperCase();
  } else if (form.velorioTipo === "viagem") {
    local = "TRANSLADO";
  }
  centro(doc, local || "SALA", 30.0, "times", "bold", 75, 196, 36);

  // Nome do falecido
  centro(doc, String(form.falecido || "").toUpperCase(), 56.0, "helvetica", "bold", 34);

  // Início do velório
  const dataVelorio = dataBR(form.dataInicioVelorio || form.dataAtendimento);
  const horaVelorio = form.horarioVelorio || form.inicioAs || "";
  centroMisto(doc, [
    { texto: `INICIO: ${dataVelorio}${horaVelorio ? " – " : ""}` },
    { texto: horaVelorio, bold: true },
  ], 72.0, 30);

  // Sepultamento e saída
  centro(doc, `SEPULTAMENTO: ${dataBR(form.dataSaida)}`, 114.0, "helvetica", "bold", 30);
  centro(doc, `SAINDO ÀS: ${form.horaSaida || ""}`, 138.0, "helvetica", "bold", 30);

  // Cemitério
  centro(doc, "CEMITÉRIO", 173.5, "helvetica", "normal", 28);
  centro(doc, String(getCemiterioNome(form.cemiterio) || "").toUpperCase(), 189.0, "helvetica", "bold", 30);

  const filename = `comunicado-${(form.falecido || "velorio").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  openPdfPreview(doc, filename, "Pré-visualização do Comunicado");
}
