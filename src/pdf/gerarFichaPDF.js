import jsPDF from "jspdf";

export default function gerarFichaPDF({ form, services, totalValue, formatDateBR, formatMoney, openPdfPreview }) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.22);

  function drawCell(doc, x, y, w, h, text = "", opts = {}) {
    doc.rect(x, y, w, h);
    const fontSize = opts.fontSize || 8;
    doc.setFont("times", opts.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);

    const tx =
      opts.align === "center" ? x + w / 2 : x + (opts.paddingLeft ?? 1.3);
    const ty = y + h / 2 + (opts.offsetY ?? 1.25);

    if (text) {
      doc.text(String(text), tx, ty, {
        maxWidth: w - 2,
        align: opts.align === "center" ? "center" : "left",
      });
    }
  }

  const left = 5;
  let y = 5;

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("FUNERÁRIA SANTA RITA", 105, y + 5, { align: "center" });

  y += 26;

  drawCell(doc, left, y, 200, 5.9, `FALECIDO: ${form.falecido}`, { bold: true });
  y += 6;

  services.forEach((item) => {
    drawCell(doc, left, y, 150, 5, item.name);
    drawCell(doc, 155, y, 25, 5, item.qty || "");
    drawCell(doc, 180, y, 25, 5, item.value ? formatMoney(item.value) : "");
    y += 5;
  });

  drawCell(doc, left, y, 180, 6, "VALOR TOTAL:", { bold: true });
  drawCell(doc, 180, y, 25, 6, formatMoney(totalValue), { bold: true });

  const filename = `ficha-${(form.falecido || "atendimento")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  openPdfPreview(doc, filename, "Ficha");
}