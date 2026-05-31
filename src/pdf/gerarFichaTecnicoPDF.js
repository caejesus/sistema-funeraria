import jsPDF from "jspdf";
import { drawCell } from "./pdfHelpers";

export function gerarFichaTecnicoPdf({ form, services, numero, openPdfPreview }) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.22);

  const left = 5;
  const W = 200;
  const ROW_H = 5.9;
  let y = 5;

  // ─── CABEÇALHO ─────────────────────────────────────────────────────────────
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text("FUNERÁRIA SÃO FRANCISCO DE ASSIS", 105, y + 5, { align: "center" });
  y += 7;

  doc.setFontSize(11);
  doc.text("FICHA TÉCNICA — PREPARO DO CORPO", 105, y + 5, { align: "center" });
  y += 8;

  doc.setLineWidth(0.5);
  doc.line(left, y, 205, y);
  doc.setLineWidth(0.22);
  y += 5;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function titulo(txt) {
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.text(txt, left, y + 3.5);
    y += 5.5;
  }

  function separador() {
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(left, y, 205, y);
    doc.setLineWidth(0.22);
    y += 4;
  }

  function cel(x, w, texto, bold = false) {
    drawCell(doc, x, y, w, ROW_H, texto, { fontSize: 9, bold });
  }

  const c3 = Math.floor(W / 3); // ~66mm per third

  // ─── BLOCO 1 — IDENTIFICAÇÃO ──────────────────────────────────────────────
  titulo("IDENTIFICAÇÃO");

  cel(left,       55,  `Nº ATENDIMENTO: ${numero || ""}`, true);
  cel(left + 55,  145, `FALECIDO: ${form.falecido || ""}`, true);
  y += ROW_H;

  cel(left,           c3,         `SEXO: ${form.sexo || "—"}`);
  cel(left + c3,      c3,         `PESO: ${form.peso || "—"}`);
  cel(left + c3 * 2,  W - c3 * 2, `ALTURA: ${form.altura || "—"}`);
  y += ROW_H;

  separador();

  // ─── BLOCO 2 — CHEGADA E INÍCIO ──────────────────────────────────────────
  titulo("CHEGADA E INÍCIO");

  cel(left,       130, `CHEGOU NA CLÍNICA ÀS: ${form.chegouClinica || "—"}`);
  cel(left + 130,  70, `INÍCIO ÀS: ${form.inicioAs || "—"}`);
  y += ROW_H;

  separador();

  // ─── BLOCO 3 — DO CORPO ───────────────────────────────────────────────────
  titulo("DO CORPO");

  const condicoes = form.necropsia === "sim" ? "Necropsiado" : "Não necropsiado";
  cel(left,       100, `CONDIÇÕES: ${condicoes}`);
  cel(left + 100, 100, `CHEGOU VESTIDO: ${form.veioVestido === "sim" ? "Sim" : "Não"}`);
  y += ROW_H;

  if (form.veioVestido === "sim") {
    const roupaLabel = form.roupaDestino === "devolver" ? "Devolver" : "Descartar";
    cel(left,       100, `ROUPA: ${roupaLabel}`);
    cel(left + 100, 100, `ROUPA ENTREGUE PARA: ${form.roupaEntreguePara || "—"}`);
    y += ROW_H;
  }

  const joiasLabel = form.joias === "sim"
    ? `Sim${form.joiasQuais ? " — " + form.joiasQuais : ""}`
    : "Não";
  cel(left,       130, `JOIAS: ${joiasLabel}`);
  cel(left + 130,  70, `RETIRAR ESMALTE: ${form.retirarEsmalte === "sim" ? "Sim" : "Não"}`);
  y += ROW_H;

  separador();

  // ─── BLOCO 4 — DA ESTÉTICA ────────────────────────────────────────────────
  titulo("DA ESTÉTICA");

  cel(left,           c3,         `BARBEAR: ${form.barbear === "sim" ? "Sim" : "Não"}`);
  cel(left + c3,      c3,         `BIGODE: ${form.bigode === "sim" ? "Sim" : "Não"}`);
  cel(left + c3 * 2,  W - c3 * 2, `CAVANHAQUE: ${form.cavanhaque === "sim" ? "Sim" : "Não"}`);
  y += ROW_H;

  const maquiagemLabel = form.maquiagem === "sim"
    ? `Sim${form.maquiagemTipo ? " — " + form.maquiagemTipo : ""}`
    : "Não";
  const ornamentacaoLabel = form.ornamentacao === "sim"
    ? `Sim${form.tipoFlor ? " — " + form.tipoFlor : ""}`
    : "Não";
  cel(left,       100, `MAQUIAGEM: ${maquiagemLabel}`);
  cel(left + 100, 100, `ORNAMENTAÇÃO: ${ornamentacaoLabel}`);
  y += ROW_H;

  separador();

  // ─── BLOCO 5 — DA URNA ───────────────────────────────────────────────────
  titulo("DA URNA");

  const modeloLabel = form.modeloUrna
    ? `${form.modeloUrna}${form.refUrna ? " — REF: " + form.refUrna : ""}`
    : "—";
  cel(left,       130, `MODELO: ${modeloLabel}`);
  cel(left + 130,  70, `COR: ${form.corUrna || "—"}`);
  y += ROW_H;

  separador();

  // ─── BLOCO 6 — TANATOPRAXIA (conditional) ────────────────────────────────
  const temTanato = (services || []).some(
    (s) => s.name === "TANATOPRAXIA (CONSERVAÇÃO DO CORPO)" && s.checked
  );

  if (temTanato) {
    titulo("TANATOPRAXIA");
    cel(left, W, "TANATOPRAXIA: Sim", true);
    y += ROW_H;
    separador();
  }

  // ─── BLOCO 7 — OBSERVAÇÕES ───────────────────────────────────────────────
  titulo("OBSERVAÇÕES");

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  for (let i = 0; i < 3; i++) {
    doc.line(left, y + 6, 205, y + 6);
    y += 9;
  }

  separador();

  // ─── BLOCO 8 — ASSINATURA ────────────────────────────────────────────────
  titulo("ASSINATURA");

  const tecnicoNome = form.tecnico ? form.tecnico : "___________________________";
  cel(left, W, `TÉCNICO RESPONSÁVEL: ${tecnicoNome}`);
  y += ROW_H + 8;

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.line(left + 10, y, left + 110, y);
  y += 5;
  doc.text("ASSINATURA: ______________________________", left, y);

  y += 8;
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();
  doc.text(`DATA: ${dia} / ${mes} / ${ano}`, left, y);

  // ─── Preview ─────────────────────────────────────────────────────────────
  const filename = `ficha-tecnica-${(form.falecido || "preparo")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  openPdfPreview(doc, filename, "Ficha Técnica — Preparo do Corpo");
}
